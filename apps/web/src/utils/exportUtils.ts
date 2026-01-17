import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { DashboardStats, QuestionAnalysis, SUBJECT_NAMES, DIFFICULTY_NAMES, TYPE_NAMES } from '../services/reports';
import { StudentDetail } from '../services/students';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

// Helper function to format date
const formatDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-');
};

// Helper function to format datetime
const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-TW');
};

// ==================== PDF Export ====================

// Load Chinese font for PDF (using base64 encoded font)
const loadChineseFont = async (doc: jsPDF): Promise<void> => {
  // For Chinese support, we use the default font with UTF-8 encoding
  // jsPDF has limited native Chinese support, so we'll use simple characters
  // For full Chinese support, you would need to embed a Chinese font
  doc.setFont('helvetica');
};

/**
 * Export Dashboard Stats to PDF
 */
export const exportDashboardToPDF = async (data: DashboardStats): Promise<void> => {
  const doc = new jsPDF();
  await loadChineseFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.text('Learning Report - Dashboard Overview', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${formatDate()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Overview Stats
  doc.setFontSize(14);
  doc.text('Overview Statistics', 14, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: [
      ['Total Classes', data.overview.totalClasses.toString()],
      ['Total Students', data.overview.totalStudents.toString()],
      ['Total Questions', data.overview.totalQuestions.toString()],
      ['Total Attempts', data.overview.totalAttempts.toString()],
      ['Correct Rate', `${data.overview.correctRate}%`],
      ['Today Attempts', data.overview.todayAttempts.toString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Weekly Trend
  if (data.weeklyTrend.length > 0) {
    doc.setFontSize(14);
    doc.text('Weekly Trend (Last 7 Days)', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Attempts', 'Correct', 'Correct Rate']],
      body: data.weeklyTrend.map((day) => [
        day.date,
        day.attempts.toString(),
        day.correct.toString(),
        `${day.correctRate}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });

    yPos = doc.lastAutoTable.finalY + 15;
  }

  // Classes List
  if (data.classes.length > 0) {
    doc.setFontSize(14);
    doc.text('Classes', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Class Name', 'Student Count']],
      body: data.classes.map((c) => [c.name, c.studentCount.toString()]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });
  }

  // Save
  doc.save(`dashboard-report-${formatDate()}.pdf`);
};

/**
 * Export Question Analysis to PDF
 */
export const exportQuestionAnalysisToPDF = async (data: QuestionAnalysis): Promise<void> => {
  const doc = new jsPDF();
  await loadChineseFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.text('Question Analysis Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(10);
  doc.text(`Generated: ${formatDate()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Summary
  doc.setFontSize(14);
  doc.text('Summary', 14, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: [
      ['Total Questions', data.summary.totalQuestions.toString()],
      ['Total Attempts', data.summary.totalAttempts.toString()],
      ['Average Correct Rate', `${data.summary.avgCorrectRate}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // By Difficulty
  if (data.byDifficulty.length > 0) {
    doc.setFontSize(14);
    doc.text('Analysis by Difficulty', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Difficulty', 'Attempts', 'Correct', 'Correct Rate']],
      body: data.byDifficulty.map((item) => [
        DIFFICULTY_NAMES[item.difficulty] || item.difficulty,
        item.attempts.toString(),
        item.correct.toString(),
        `${item.correctRate}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });

    yPos = doc.lastAutoTable.finalY + 15;
  }

  // By Type
  if (data.byType.length > 0) {
    doc.setFontSize(14);
    doc.text('Analysis by Question Type', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Type', 'Attempts', 'Correct', 'Correct Rate']],
      body: data.byType.map((item) => [
        TYPE_NAMES[item.type] || item.type,
        item.attempts.toString(),
        item.correct.toString(),
        `${item.correctRate}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });

    yPos = doc.lastAutoTable.finalY + 15;
  }

  // Hard Questions
  if (data.hardQuestions.length > 0) {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Difficult Questions (Correct Rate < 40%)', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Question', 'Subject', 'Attempts', 'Correct Rate']],
      body: data.hardQuestions.map((q) => [
        q.content.substring(0, 50) + (q.content.length > 50 ? '...' : ''),
        SUBJECT_NAMES[q.subject] || q.subject,
        q.attempts.toString(),
        `${q.correctRate}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] },
      columnStyles: { 0: { cellWidth: 80 } },
    });
  }

  doc.save(`question-analysis-${formatDate()}.pdf`);
};

/**
 * Export Student Detail to PDF
 */
export const exportStudentDetailToPDF = async (data: StudentDetail): Promise<void> => {
  const doc = new jsPDF();
  await loadChineseFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.text(`Student Report: ${data.student.displayName}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(10);
  doc.text(`Generated: ${formatDate()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Student Info
  doc.setFontSize(14);
  doc.text('Student Information', 14, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Field', 'Value']],
    body: [
      ['Name', data.student.displayName],
      ['Email', data.student.email],
      ['Level', `Lv.${data.student.level}`],
      ['Experience', data.student.exp.toString()],
      ['Gold', data.student.gold.toString()],
      ['Joined', formatDateTime(data.student.createdAt)],
      ['Last Login', formatDateTime(data.student.lastLoginAt)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Learning Stats
  doc.setFontSize(14);
  doc.text('Learning Statistics', 14, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: [
      ['Total Attempts', data.stats.overview.totalAttempts.toString()],
      ['Correct Attempts', data.stats.overview.correctAttempts.toString()],
      ['Correct Rate', `${data.stats.overview.correctRate}%`],
      ['Total EXP Earned', data.stats.overview.totalExp.toString()],
      ['Total Gold Earned', data.stats.overview.totalGold.toString()],
      ['Avg Time per Question', `${data.stats.overview.avgTimeSeconds}s`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // By Subject
  if (data.stats.bySubject.length > 0) {
    doc.setFontSize(14);
    doc.text('Performance by Subject', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Subject', 'Attempts', 'Correct', 'Correct Rate', 'EXP']],
      body: data.stats.bySubject.map((item) => [
        item.subjectName,
        item.attempts.toString(),
        item.correct.toString(),
        `${item.correctRate}%`,
        item.totalExp.toString(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });

    yPos = doc.lastAutoTable.finalY + 15;
  }

  // By Difficulty
  if (data.stats.byDifficulty.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Performance by Difficulty', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Difficulty', 'Attempts', 'Correct', 'Correct Rate', 'Avg Time']],
      body: data.stats.byDifficulty.map((item) => [
        DIFFICULTY_NAMES[item.difficulty] || item.difficulty,
        item.attempts.toString(),
        item.correct.toString(),
        `${item.correctRate}%`,
        `${item.avgTime}s`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });

    yPos = doc.lastAutoTable.finalY + 15;
  }

  // Weak Units
  if (data.stats.weakUnits.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Areas for Improvement (Correct Rate < 60%)', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Unit', 'Grade', 'Attempts', 'Correct Rate']],
      body: data.stats.weakUnits.map((item) => [
        item.unitName,
        `${item.grade} - ${item.semester}`,
        item.attempts.toString(),
        `${item.correctRate}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] },
    });
  }

  doc.save(`student-report-${data.student.displayName}-${formatDate()}.pdf`);
};

// ==================== Excel Export ====================

/**
 * Export Dashboard Stats to Excel
 */
export const exportDashboardToExcel = (data: DashboardStats): void => {
  const workbook = XLSX.utils.book_new();

  // Overview Sheet
  const overviewData = [
    ['Dashboard Overview Report'],
    [`Generated: ${formatDate()}`],
    [],
    ['Metric', 'Value'],
    ['Total Classes', data.overview.totalClasses],
    ['Total Students', data.overview.totalStudents],
    ['Total Questions', data.overview.totalQuestions],
    ['Total Attempts', data.overview.totalAttempts],
    ['Correct Rate (%)', data.overview.correctRate],
    ['Today Attempts', data.overview.todayAttempts],
  ];
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

  // Weekly Trend Sheet
  if (data.weeklyTrend.length > 0) {
    const trendData = [
      ['Weekly Trend'],
      [],
      ['Date', 'Attempts', 'Correct', 'Correct Rate (%)'],
      ...data.weeklyTrend.map((day) => [day.date, day.attempts, day.correct, day.correctRate]),
    ];
    const trendSheet = XLSX.utils.aoa_to_sheet(trendData);
    XLSX.utils.book_append_sheet(workbook, trendSheet, 'Weekly Trend');
  }

  // Classes Sheet
  if (data.classes.length > 0) {
    const classesData = [
      ['Classes'],
      [],
      ['Class Name', 'Student Count'],
      ...data.classes.map((c) => [c.name, c.studentCount]),
    ];
    const classesSheet = XLSX.utils.aoa_to_sheet(classesData);
    XLSX.utils.book_append_sheet(workbook, classesSheet, 'Classes');
  }

  // Save
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `dashboard-report-${formatDate()}.xlsx`);
};

/**
 * Export Question Analysis to Excel
 */
export const exportQuestionAnalysisToExcel = (data: QuestionAnalysis): void => {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Question Analysis Report'],
    [`Generated: ${formatDate()}`],
    [],
    ['Metric', 'Value'],
    ['Total Questions', data.summary.totalQuestions],
    ['Total Attempts', data.summary.totalAttempts],
    ['Average Correct Rate (%)', data.summary.avgCorrectRate],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // By Difficulty Sheet
  if (data.byDifficulty.length > 0) {
    const difficultyData = [
      ['Analysis by Difficulty'],
      [],
      ['Difficulty', 'Attempts', 'Correct', 'Correct Rate (%)'],
      ...data.byDifficulty.map((item) => [
        DIFFICULTY_NAMES[item.difficulty] || item.difficulty,
        item.attempts,
        item.correct,
        item.correctRate,
      ]),
    ];
    const difficultySheet = XLSX.utils.aoa_to_sheet(difficultyData);
    XLSX.utils.book_append_sheet(workbook, difficultySheet, 'By Difficulty');
  }

  // By Type Sheet
  if (data.byType.length > 0) {
    const typeData = [
      ['Analysis by Question Type'],
      [],
      ['Type', 'Attempts', 'Correct', 'Correct Rate (%)'],
      ...data.byType.map((item) => [
        TYPE_NAMES[item.type] || item.type,
        item.attempts,
        item.correct,
        item.correctRate,
      ]),
    ];
    const typeSheet = XLSX.utils.aoa_to_sheet(typeData);
    XLSX.utils.book_append_sheet(workbook, typeSheet, 'By Type');
  }

  // Hard Questions Sheet
  if (data.hardQuestions.length > 0) {
    const hardData = [
      ['Difficult Questions (Correct Rate < 40%)'],
      [],
      ['Question', 'Subject', 'Difficulty', 'Type', 'Attempts', 'Correct Rate (%)', 'Avg Time (s)'],
      ...data.hardQuestions.map((q) => [
        q.content,
        SUBJECT_NAMES[q.subject] || q.subject,
        DIFFICULTY_NAMES[q.difficulty] || q.difficulty,
        TYPE_NAMES[q.type] || q.type,
        q.attempts,
        q.correctRate,
        q.avgTime,
      ]),
    ];
    const hardSheet = XLSX.utils.aoa_to_sheet(hardData);
    XLSX.utils.book_append_sheet(workbook, hardSheet, 'Hard Questions');
  }

  // Easy Questions Sheet
  if (data.easyQuestions.length > 0) {
    const easyData = [
      ['Easy Questions (Correct Rate > 80%)'],
      [],
      ['Question', 'Subject', 'Difficulty', 'Type', 'Attempts', 'Correct Rate (%)', 'Avg Time (s)'],
      ...data.easyQuestions.map((q) => [
        q.content,
        SUBJECT_NAMES[q.subject] || q.subject,
        DIFFICULTY_NAMES[q.difficulty] || q.difficulty,
        TYPE_NAMES[q.type] || q.type,
        q.attempts,
        q.correctRate,
        q.avgTime,
      ]),
    ];
    const easySheet = XLSX.utils.aoa_to_sheet(easyData);
    XLSX.utils.book_append_sheet(workbook, easySheet, 'Easy Questions');
  }

  // Save
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `question-analysis-${formatDate()}.xlsx`);
};

/**
 * Export Student Detail to Excel
 */
export const exportStudentDetailToExcel = (data: StudentDetail): void => {
  const workbook = XLSX.utils.book_new();

  // Student Info Sheet
  const infoData = [
    [`Student Report: ${data.student.displayName}`],
    [`Generated: ${formatDate()}`],
    [],
    ['Student Information'],
    ['Field', 'Value'],
    ['Name', data.student.displayName],
    ['Email', data.student.email],
    ['Level', data.student.level],
    ['Experience', data.student.exp],
    ['Exp to Next Level', data.student.expToNextLevel],
    ['Gold', data.student.gold],
    ['Joined', formatDateTime(data.student.createdAt)],
    ['Last Login', formatDateTime(data.student.lastLoginAt)],
  ];
  const infoSheet = XLSX.utils.aoa_to_sheet(infoData);
  XLSX.utils.book_append_sheet(workbook, infoSheet, 'Student Info');

  // Learning Stats Sheet
  const statsData = [
    ['Learning Statistics'],
    [],
    ['Metric', 'Value'],
    ['Total Attempts', data.stats.overview.totalAttempts],
    ['Correct Attempts', data.stats.overview.correctAttempts],
    ['Correct Rate (%)', data.stats.overview.correctRate],
    ['Total EXP Earned', data.stats.overview.totalExp],
    ['Total Gold Earned', data.stats.overview.totalGold],
    ['Avg Time per Question (s)', data.stats.overview.avgTimeSeconds],
    ['First Attempt', formatDateTime(data.stats.overview.firstAttemptAt)],
    ['Last Attempt', formatDateTime(data.stats.overview.lastAttemptAt)],
  ];
  const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
  XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics');

  // By Subject Sheet
  if (data.stats.bySubject.length > 0) {
    const subjectData = [
      ['Performance by Subject'],
      [],
      ['Subject', 'Attempts', 'Correct', 'Correct Rate (%)', 'Total EXP'],
      ...data.stats.bySubject.map((item) => [
        item.subjectName,
        item.attempts,
        item.correct,
        item.correctRate,
        item.totalExp,
      ]),
    ];
    const subjectSheet = XLSX.utils.aoa_to_sheet(subjectData);
    XLSX.utils.book_append_sheet(workbook, subjectSheet, 'By Subject');
  }

  // By Difficulty Sheet
  if (data.stats.byDifficulty.length > 0) {
    const difficultyData = [
      ['Performance by Difficulty'],
      [],
      ['Difficulty', 'Attempts', 'Correct', 'Correct Rate (%)', 'Avg Time (s)'],
      ...data.stats.byDifficulty.map((item) => [
        DIFFICULTY_NAMES[item.difficulty] || item.difficulty,
        item.attempts,
        item.correct,
        item.correctRate,
        item.avgTime,
      ]),
    ];
    const difficultySheet = XLSX.utils.aoa_to_sheet(difficultyData);
    XLSX.utils.book_append_sheet(workbook, difficultySheet, 'By Difficulty');
  }

  // By Unit Sheet
  if (data.stats.byUnit.length > 0) {
    const unitData = [
      ['Performance by Unit'],
      [],
      ['Unit', 'Academic Year', 'Grade', 'Semester', 'Attempts', 'Correct', 'Correct Rate (%)'],
      ...data.stats.byUnit.map((item) => [
        item.unitName,
        item.academicYear,
        item.grade,
        item.semester,
        item.attempts,
        item.correct,
        item.correctRate,
      ]),
    ];
    const unitSheet = XLSX.utils.aoa_to_sheet(unitData);
    XLSX.utils.book_append_sheet(workbook, unitSheet, 'By Unit');
  }

  // Weak Units Sheet
  if (data.stats.weakUnits.length > 0) {
    const weakData = [
      ['Areas for Improvement (Correct Rate < 60%)'],
      [],
      ['Unit', 'Academic Year', 'Grade', 'Semester', 'Attempts', 'Correct', 'Correct Rate (%)'],
      ...data.stats.weakUnits.map((item) => [
        item.unitName,
        item.academicYear,
        item.grade,
        item.semester,
        item.attempts,
        item.correct,
        item.correctRate,
      ]),
    ];
    const weakSheet = XLSX.utils.aoa_to_sheet(weakData);
    XLSX.utils.book_append_sheet(workbook, weakSheet, 'Weak Units');
  }

  // Recent Activity Sheet
  if (data.stats.recentActivity.length > 0) {
    const activityData = [
      ['Recent Activity (Last 30 Days)'],
      [],
      ['Date', 'Attempts', 'Correct', 'EXP Earned'],
      ...data.stats.recentActivity.map((item) => [
        item._id,
        item.attempts,
        item.correct,
        item.exp,
      ]),
    ];
    const activitySheet = XLSX.utils.aoa_to_sheet(activityData);
    XLSX.utils.book_append_sheet(workbook, activitySheet, 'Recent Activity');
  }

  // Save
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `student-report-${data.student.displayName}-${formatDate()}.xlsx`);
};
