import { Response, NextFunction } from 'express';
import * as XLSX from 'xlsx';
import Question from '../models/Question.js';
import Category from '../models/Category.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

// Template columns definition
const TEMPLATE_COLUMNS = [
  { key: 'subject', header: '學科 (必填)', example: 'math', description: 'math, chinese, english, science, social' },
  { key: 'category', header: '分類名稱 (必填)', example: '基礎運算', description: '必須是已存在的分類名稱' },
  { key: 'difficulty', header: '難度 (必填)', example: 'easy', description: 'easy, medium, hard' },
  { key: 'type', header: '題型 (必填)', example: 'single_choice', description: 'single_choice, multiple_choice, fill_blank, true_false' },
  { key: 'question', header: '題目內容 (必填)', example: '5 + 3 = ?', description: '題目的文字內容' },
  { key: 'option_a', header: '選項A (選擇題必填)', example: '6', description: '選項 A 的內容' },
  { key: 'option_b', header: '選項B (選擇題必填)', example: '7', description: '選項 B 的內容' },
  { key: 'option_c', header: '選項C', example: '8', description: '選項 C 的內容（可選）' },
  { key: 'option_d', header: '選項D', example: '9', description: '選項 D 的內容（可選）' },
  { key: 'answer', header: '正確答案 (必填)', example: 'C', description: '正確答案，如 A, B, C, D 或多個用逗號分隔' },
  { key: 'explanation', header: '解析', example: '5 + 3 = 8，答案是 C', description: '答案解析（可選）' },
  { key: 'tags', header: '標籤', example: '加法,基礎', description: '多個標籤用逗號分隔（可選）' },
  { key: 'base_exp', header: '基礎經驗值', example: '10', description: '答對獲得的經驗值（預設依難度）' },
  { key: 'base_gold', header: '基礎金幣', example: '5', description: '答對獲得的金幣（預設依難度）' },
  { key: 'monster_name', header: '怪物名稱', example: '數學精靈', description: '冒險敘事的怪物名稱（可選）' },
  { key: 'monster_desc', header: '怪物描述', example: '一隻數學精靈擋住了你的去路！', description: '冒險敘事描述（可選）' },
];

// Default rewards by difficulty
const DEFAULT_REWARDS = {
  easy: { exp: 10, gold: 5 },
  medium: { exp: 20, gold: 10 },
  hard: { exp: 30, gold: 15 },
};

// Validate subject
const VALID_SUBJECTS = ['chinese', 'math', 'english', 'science', 'social'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
const VALID_TYPES = ['single_choice', 'multiple_choice', 'fill_blank', 'true_false'];

interface ImportRow {
  subject: string;
  category: string;
  difficulty: string;
  type: string;
  question: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  answer: string;
  explanation?: string;
  tags?: string;
  base_exp?: number;
  base_gold?: number;
  monster_name?: string;
  monster_desc?: string;
}

interface ImportResult {
  row: number;
  success: boolean;
  error?: string;
  question?: string;
}

// GET /questions/template - Download import template
export const downloadTemplate = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create template sheet with headers and example data
    const headers = TEMPLATE_COLUMNS.map((c) => c.header);
    const examples = TEMPLATE_COLUMNS.map((c) => c.example);
    const descriptions = TEMPLATE_COLUMNS.map((c) => c.description);

    // Add sample data rows
    const sampleData = [
      ['math', '基礎運算', 'easy', 'single_choice', '5 + 3 = ?', '6', '7', '8', '9', 'C', '5 + 3 = 8，答案是 C', '加法,基礎', '10', '5', '數學精靈', '數學精靈想考考你！'],
      ['math', '基礎運算', 'medium', 'single_choice', '12 × 5 = ?', '50', '55', '60', '65', 'C', '12 × 5 = 60', '乘法', '20', '10', '', ''],
      ['chinese', '成語故事', 'medium', 'single_choice', '「守株待兔」告訴我們什麼道理？', '要有耐心', '不能只靠運氣', '要保護動物', '要多種樹', 'B', '不能只想著靠運氣，要自己努力', '成語', '20', '10', '', ''],
    ];

    const sheetData = [
      headers,
      examples,
      ...sampleData,
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths
    worksheet['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 20 }));

    // Add sheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, '題目匯入範本');

    // Create instructions sheet
    const instructionsData = [
      ['題目匯入說明'],
      [''],
      ['欄位說明：'],
      ...TEMPLATE_COLUMNS.map((c) => [c.header, c.description]),
      [''],
      ['注意事項：'],
      ['1. 第一行是欄位標題，第二行是範例，請從第三行開始填寫您的題目'],
      ['2. 學科、分類、難度、題型、題目內容、正確答案 是必填欄位'],
      ['3. 分類名稱必須是系統中已存在的分類'],
      ['4. 選擇題至少需要填寫選項A和選項B'],
      ['5. 多選題的答案用逗號分隔，如：A,C'],
      ['6. 標籤用逗號分隔，如：加法,基礎,國小'],
      ['7. 支援 .xlsx 和 .csv 格式'],
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 30 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, '說明');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=questions_import_template.xlsx');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// POST /questions/import - Import questions from Excel/CSV
export const importQuestions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    if (!req.file) {
      throw AppError.badRequest('請上傳檔案', ErrorCodes.VALIDATION_ERROR);
    }

    // Parse file with UTF-8 encoding support
    const workbook = XLSX.read(req.file.buffer, {
      type: 'buffer',
      codepage: 65001, // UTF-8
      raw: false,
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(worksheet, { header: 1, raw: false });

    if (data.length < 2) {
      throw AppError.badRequest('檔案中沒有資料', ErrorCodes.VALIDATION_ERROR);
    }

    // Get all categories for lookup
    const categories = await Category.find({ isActive: true });
    const categoryMap = new Map<string, { id: string; subject: string }>();
    categories.forEach((cat) => {
      categoryMap.set(`${cat.subject}-${cat.name}`, { id: cat._id.toString(), subject: cat.subject });
    });

    // Process rows (skip header row)
    const results: ImportResult[] = [];
    const questionsToCreate: any[] = [];

    // Parse header row to map columns
    const headerRow = data[0].map(cell => cell !== undefined && cell !== null ? String(cell) : '');
    const columnMap: Record<string, number> = {};
    TEMPLATE_COLUMNS.forEach((col) => {
      const idx = headerRow.findIndex((h) =>
        h && (h.includes(col.key) || h.toLowerCase().includes(col.key.replace('_', ' ')))
      );
      if (idx === -1) {
        // Try to match by header text
        const headerIdx = headerRow.findIndex((h) => h === col.header);
        if (headerIdx !== -1) {
          columnMap[col.key] = headerIdx;
        }
      } else {
        columnMap[col.key] = idx;
      }
    });

    // If header mapping failed, use default positions
    if (Object.keys(columnMap).length === 0) {
      TEMPLATE_COLUMNS.forEach((col, idx) => {
        columnMap[col.key] = idx;
      });
    }

    // Process data rows (start from row 2, index 1)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1; // Human-readable row number

      // Skip empty rows
      if (!row || row.length === 0 || !row.some((cell) => cell !== undefined && cell !== '')) {
        continue;
      }

      // Extract values using column map
      const getValue = (key: string): string => {
        const idx = columnMap[key];
        if (idx === undefined) return '';
        const val = row[idx];
        return val !== undefined && val !== null ? String(val).trim() : '';
      };

      const subject = getValue('subject').toLowerCase();
      const category = getValue('category');
      const difficulty = getValue('difficulty').toLowerCase();
      const type = getValue('type').toLowerCase();
      const question = getValue('question');
      const optionA = getValue('option_a');
      const optionB = getValue('option_b');
      const optionC = getValue('option_c');
      const optionD = getValue('option_d');
      const answer = getValue('answer').toUpperCase();
      const explanation = getValue('explanation');
      const tags = getValue('tags');
      const baseExp = getValue('base_exp');
      const baseGold = getValue('base_gold');
      const monsterName = getValue('monster_name');
      const monsterDesc = getValue('monster_desc');

      // Validate required fields
      const errors: string[] = [];

      if (!VALID_SUBJECTS.includes(subject)) {
        errors.push(`無效的學科: ${subject || '(空)'}`);
      }

      if (!category) {
        errors.push('分類名稱為必填');
      }

      if (!VALID_DIFFICULTIES.includes(difficulty)) {
        errors.push(`無效的難度: ${difficulty || '(空)'}`);
      }

      if (!VALID_TYPES.includes(type)) {
        errors.push(`無效的題型: ${type || '(空)'}`);
      }

      if (!question) {
        errors.push('題目內容為必填');
      }

      if (!answer) {
        errors.push('正確答案為必填');
      }

      // Validate category exists
      const categoryKey = `${subject}-${category}`;
      const categoryInfo = categoryMap.get(categoryKey);
      if (category && subject && !categoryInfo) {
        errors.push(`分類不存在: ${category} (學科: ${subject})`);
      }

      // Validate options for choice questions
      if (['single_choice', 'multiple_choice', 'true_false'].includes(type)) {
        if (!optionA || !optionB) {
          errors.push('選擇題至少需要選項A和選項B');
        }
      }

      if (errors.length > 0) {
        results.push({
          row: rowNum,
          success: false,
          error: errors.join('; '),
          question: question.substring(0, 50) || '(空)',
        });
        continue;
      }

      // Build options array
      const options = [];
      if (optionA) options.push({ id: 'A', text: optionA });
      if (optionB) options.push({ id: 'B', text: optionB });
      if (optionC) options.push({ id: 'C', text: optionC });
      if (optionD) options.push({ id: 'D', text: optionD });

      // Parse answer (support multiple choice)
      const correctAnswer = answer.includes(',')
        ? answer.split(',').map((a) => a.trim())
        : answer;

      // Get default rewards
      const rewards = DEFAULT_REWARDS[difficulty as keyof typeof DEFAULT_REWARDS];

      // Build question object
      const questionData = {
        subject,
        categoryId: categoryInfo!.id,
        difficulty,
        type,
        content: {
          text: question,
          ...(monsterDesc && {
            adventureContext: {
              description: monsterDesc,
              ...(monsterName && { monsterName }),
            },
          }),
        },
        options: options.length > 0 ? options : undefined,
        answer: {
          correct: correctAnswer,
          ...(explanation && { explanation }),
        },
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        baseExp: baseExp ? parseInt(baseExp, 10) : rewards.exp,
        baseGold: baseGold ? parseInt(baseGold, 10) : rewards.gold,
        createdBy: req.auth.userId,
      };

      questionsToCreate.push({ data: questionData, rowNum, questionText: question });
    }

    // Bulk create questions
    for (const item of questionsToCreate) {
      try {
        await Question.create(item.data);
        results.push({
          row: item.rowNum,
          success: true,
          question: item.questionText.substring(0, 50),
        });
      } catch (error: any) {
        results.push({
          row: item.rowNum,
          success: false,
          error: error.message || '建立失敗',
          question: item.questionText.substring(0, 50),
        });
      }
    }

    // Summary
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    sendSuccess(res, {
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
      },
      results,
    });
  } catch (error) {
    next(error);
  }
};
