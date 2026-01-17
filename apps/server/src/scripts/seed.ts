import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Question from '../models/Question.js';
import DailyTask from '../models/DailyTask.js';
import Achievement from '../models/Achievement.js';
import Item from '../models/Item.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/adventurer-learning';

// Seed Data
const categoriesData = [
  // 數學分類
  {
    subject: 'math',
    name: '基礎運算',
    description: '加減乘除基本運算',
    order: 1,
    mapConfig: { mapName: '數學森林', backgroundColor: '#4CAF50' },
  },
  {
    subject: 'math',
    name: '分數與小數',
    description: '分數和小數的運算',
    order: 2,
    mapConfig: { mapName: '分數山谷', backgroundColor: '#2196F3' },
  },
  {
    subject: 'math',
    name: '幾何圖形',
    description: '圖形辨識與面積計算',
    order: 3,
    mapConfig: { mapName: '幾何城堡', backgroundColor: '#9C27B0' },
  },
  // 國語分類
  {
    subject: 'chinese',
    name: '字詞辨識',
    description: '生字、詞語學習',
    order: 1,
    mapConfig: { mapName: '文字叢林', backgroundColor: '#FF5722' },
  },
  {
    subject: 'chinese',
    name: '成語故事',
    description: '成語的意義與用法',
    order: 2,
    mapConfig: { mapName: '成語古堡', backgroundColor: '#795548' },
  },
  {
    subject: 'chinese',
    name: '閱讀理解',
    description: '短文閱讀與理解',
    order: 3,
    mapConfig: { mapName: '智慧圖書館', backgroundColor: '#607D8B' },
  },
];

// Daily Tasks Data
const dailyTasksData = [
  // Easy tasks
  {
    code: 'DAILY_Q3',
    name: '初次挑戰',
    description: '今日完成 3 道題目',
    icon: '📝',
    taskType: 'questions_answered',
    targetValue: 3,
    expReward: 15,
    goldReward: 5,
    difficulty: 'easy',
    order: 1,
  },
  {
    code: 'DAILY_CORRECT_3',
    name: '小試身手',
    description: '今日答對 3 道題目',
    icon: '✅',
    taskType: 'correct_answers',
    targetValue: 3,
    expReward: 20,
    goldReward: 8,
    difficulty: 'easy',
    order: 2,
  },
  // Medium tasks
  {
    code: 'DAILY_Q5',
    name: '勤奮學習',
    description: '今日完成 5 道題目',
    icon: '📚',
    taskType: 'questions_answered',
    targetValue: 5,
    expReward: 25,
    goldReward: 10,
    difficulty: 'medium',
    order: 3,
  },
  {
    code: 'DAILY_CORRECT_5',
    name: '答題高手',
    description: '今日答對 5 道題目',
    icon: '🌟',
    taskType: 'correct_answers',
    targetValue: 5,
    expReward: 30,
    goldReward: 12,
    difficulty: 'medium',
    order: 4,
  },
  {
    code: 'DAILY_STREAK_3',
    name: '連勝開始',
    description: '今日連續答對 3 題',
    icon: '🔥',
    taskType: 'correct_streak',
    targetValue: 3,
    expReward: 25,
    goldReward: 10,
    difficulty: 'medium',
    order: 5,
  },
  // Hard tasks
  {
    code: 'DAILY_Q10',
    name: '學習達人',
    description: '今日完成 10 道題目',
    icon: '🎯',
    taskType: 'questions_answered',
    targetValue: 10,
    expReward: 50,
    goldReward: 20,
    difficulty: 'hard',
    order: 6,
  },
  {
    code: 'DAILY_CORRECT_10',
    name: '學霸',
    description: '今日答對 10 道題目',
    icon: '💯',
    taskType: 'correct_answers',
    targetValue: 10,
    expReward: 60,
    goldReward: 25,
    difficulty: 'hard',
    order: 7,
  },
  {
    code: 'DAILY_STREAK_5',
    name: '火力全開',
    description: '今日連續答對 5 題',
    icon: '💥',
    taskType: 'correct_streak',
    targetValue: 5,
    expReward: 50,
    goldReward: 20,
    difficulty: 'hard',
    order: 8,
  },
];

// Achievements Data
const achievementsData = [
  // Learning achievements
  {
    code: 'FIRST_QUESTION',
    name: '初次挑戰',
    description: '回答第一道題目',
    icon: '🎯',
    category: 'learning',
    rarity: 'common',
    requirementType: 'questions_answered',
    requirementValue: 1,
    expReward: 10,
    goldReward: 5,
    order: 1,
  },
  {
    code: 'QUESTION_10',
    name: '小試身手',
    description: '累計回答 10 道題目',
    icon: '📝',
    category: 'learning',
    rarity: 'common',
    requirementType: 'questions_answered',
    requirementValue: 10,
    expReward: 30,
    goldReward: 15,
    order: 2,
  },
  {
    code: 'QUESTION_50',
    name: '勤奮學者',
    description: '累計回答 50 道題目',
    icon: '📚',
    category: 'learning',
    rarity: 'rare',
    requirementType: 'questions_answered',
    requirementValue: 50,
    expReward: 100,
    goldReward: 50,
    order: 3,
  },
  {
    code: 'QUESTION_100',
    name: '學習達人',
    description: '累計回答 100 道題目',
    icon: '🎓',
    category: 'learning',
    rarity: 'epic',
    requirementType: 'questions_answered',
    requirementValue: 100,
    expReward: 200,
    goldReward: 100,
    order: 4,
  },
  {
    code: 'QUESTION_500',
    name: '知識巨人',
    description: '累計回答 500 道題目',
    icon: '🏛️',
    category: 'learning',
    rarity: 'legendary',
    requirementType: 'questions_answered',
    requirementValue: 500,
    expReward: 500,
    goldReward: 250,
    order: 5,
  },
  {
    code: 'CORRECT_10',
    name: '正確起步',
    description: '累計答對 10 道題目',
    icon: '✅',
    category: 'learning',
    rarity: 'common',
    requirementType: 'correct_answers',
    requirementValue: 10,
    expReward: 30,
    goldReward: 15,
    order: 10,
  },
  {
    code: 'CORRECT_50',
    name: '答題高手',
    description: '累計答對 50 道題目',
    icon: '🌟',
    category: 'learning',
    rarity: 'rare',
    requirementType: 'correct_answers',
    requirementValue: 50,
    expReward: 100,
    goldReward: 50,
    order: 11,
  },
  {
    code: 'CORRECT_100',
    name: '學霸',
    description: '累計答對 100 道題目',
    icon: '💯',
    category: 'learning',
    rarity: 'epic',
    requirementType: 'correct_answers',
    requirementValue: 100,
    expReward: 200,
    goldReward: 100,
    order: 12,
  },
  {
    code: 'STREAK_5',
    name: '連勝開始',
    description: '連續答對 5 題',
    icon: '🔥',
    category: 'learning',
    rarity: 'common',
    requirementType: 'correct_streak',
    requirementValue: 5,
    expReward: 25,
    goldReward: 10,
    order: 20,
  },
  {
    code: 'STREAK_10',
    name: '火力全開',
    description: '連續答對 10 題',
    icon: '🔥',
    category: 'learning',
    rarity: 'rare',
    requirementType: 'correct_streak',
    requirementValue: 10,
    expReward: 75,
    goldReward: 30,
    order: 21,
  },
  {
    code: 'STREAK_20',
    name: '完美連擊',
    description: '連續答對 20 題',
    icon: '💥',
    category: 'learning',
    rarity: 'epic',
    requirementType: 'correct_streak',
    requirementValue: 20,
    expReward: 150,
    goldReward: 75,
    order: 22,
  },
  // Adventure achievements
  {
    code: 'LEVEL_5',
    name: '冒險者',
    description: '達到等級 5',
    icon: '⚔️',
    category: 'adventure',
    rarity: 'common',
    requirementType: 'level_reached',
    requirementValue: 5,
    expReward: 50,
    goldReward: 25,
    order: 1,
  },
  {
    code: 'LEVEL_10',
    name: '資深冒險者',
    description: '達到等級 10',
    icon: '🗡️',
    category: 'adventure',
    rarity: 'rare',
    requirementType: 'level_reached',
    requirementValue: 10,
    expReward: 100,
    goldReward: 50,
    order: 2,
  },
  {
    code: 'LEVEL_20',
    name: '傳奇勇者',
    description: '達到等級 20',
    icon: '👑',
    category: 'adventure',
    rarity: 'epic',
    requirementType: 'level_reached',
    requirementValue: 20,
    expReward: 200,
    goldReward: 100,
    order: 3,
  },
  {
    code: 'GOLD_100',
    name: '存錢罐',
    description: '累計獲得 100 金幣',
    icon: '💰',
    category: 'adventure',
    rarity: 'common',
    requirementType: 'gold_earned',
    requirementValue: 100,
    expReward: 20,
    goldReward: 10,
    order: 10,
  },
  {
    code: 'GOLD_500',
    name: '小富翁',
    description: '累計獲得 500 金幣',
    icon: '💎',
    category: 'adventure',
    rarity: 'rare',
    requirementType: 'gold_earned',
    requirementValue: 500,
    expReward: 50,
    goldReward: 25,
    order: 11,
  },
  {
    code: 'GOLD_1000',
    name: '財富大亨',
    description: '累計獲得 1000 金幣',
    icon: '🏆',
    category: 'adventure',
    rarity: 'epic',
    requirementType: 'gold_earned',
    requirementValue: 1000,
    expReward: 100,
    goldReward: 50,
    order: 12,
  },
  {
    code: 'SHOPPER_1',
    name: '初次購物',
    description: '購買第一個道具',
    icon: '🛒',
    category: 'adventure',
    rarity: 'common',
    requirementType: 'items_purchased',
    requirementValue: 1,
    expReward: 15,
    goldReward: 0,
    order: 20,
  },
  {
    code: 'SHOPPER_10',
    name: '購物達人',
    description: '購買 10 個道具',
    icon: '🛍️',
    category: 'adventure',
    rarity: 'rare',
    requirementType: 'items_purchased',
    requirementValue: 10,
    expReward: 50,
    goldReward: 20,
    order: 21,
  },
  // Special achievements
  {
    code: 'DAILY_10',
    name: '今日之星',
    description: '單日完成 10 道題目',
    icon: '⭐',
    category: 'special',
    rarity: 'rare',
    requirementType: 'daily_questions',
    requirementValue: 10,
    expReward: 50,
    goldReward: 25,
    order: 1,
  },
  {
    code: 'DAILY_20',
    name: '學習狂人',
    description: '單日完成 20 道題目',
    icon: '🌟',
    category: 'special',
    rarity: 'epic',
    requirementType: 'daily_questions',
    requirementValue: 20,
    expReward: 100,
    goldReward: 50,
    order: 2,
  },
];

// Shop Items Data
const itemsData = [
  // Consumables - Boost Items
  {
    name: '經驗雙倍藥水',
    description: '使用後 30 分鐘內獲得的經驗值加倍',
    type: 'consumable',
    rarity: 'common',
    icon: '🧪',
    price: 50,
    effects: [{ type: 'exp_boost', value: 2, duration: 30 }],
    maxStack: 10,
    order: 1,
  },
  {
    name: '金幣雙倍藥水',
    description: '使用後 30 分鐘內獲得的金幣加倍',
    type: 'consumable',
    rarity: 'common',
    icon: '💰',
    price: 50,
    effects: [{ type: 'gold_boost', value: 2, duration: 30 }],
    maxStack: 10,
    order: 2,
  },
  {
    name: '超級經驗藥水',
    description: '使用後 60 分鐘內經驗值 x3！',
    type: 'consumable',
    rarity: 'rare',
    icon: '⚗️',
    price: 150,
    effects: [{ type: 'exp_boost', value: 3, duration: 60 }],
    maxStack: 5,
    order: 3,
  },
  {
    name: '超級金幣藥水',
    description: '使用後 60 分鐘內金幣 x3！',
    type: 'consumable',
    rarity: 'rare',
    icon: '💎',
    price: 150,
    effects: [{ type: 'gold_boost', value: 3, duration: 60 }],
    maxStack: 5,
    order: 4,
  },
  {
    name: '智慧提示卡',
    description: '答題時可以獲得提示',
    type: 'consumable',
    rarity: 'common',
    icon: '💡',
    price: 30,
    effects: [{ type: 'hint', value: 1 }],
    maxStack: 20,
    order: 5,
  },
  {
    name: '跳過卡',
    description: '跳過一道困難的題目',
    type: 'consumable',
    rarity: 'rare',
    icon: '⏭️',
    price: 80,
    effects: [{ type: 'skip', value: 1 }],
    maxStack: 5,
    order: 6,
  },
  {
    name: '護盾藥水',
    description: '30 分鐘內答錯不會扣除連勝',
    type: 'consumable',
    rarity: 'rare',
    icon: '🛡️',
    price: 100,
    effects: [{ type: 'shield', value: 1, duration: 30 }],
    maxStack: 5,
    order: 7,
  },
  {
    name: '終極冒險包',
    description: '同時獲得經驗加倍和金幣加倍 60 分鐘！',
    type: 'consumable',
    rarity: 'epic',
    icon: '🎁',
    price: 250,
    effects: [
      { type: 'exp_boost', value: 2, duration: 60 },
      { type: 'gold_boost', value: 2, duration: 60 },
    ],
    maxStack: 3,
    order: 8,
  },
  // Cosmetics - Titles
  {
    name: '初心冒險者',
    description: '顯示「初心冒險者」稱號',
    type: 'cosmetic',
    rarity: 'common',
    slot: 'title',
    icon: '🏷️',
    price: 100,
    maxStack: 1,
    order: 20,
  },
  {
    name: '學習達人',
    description: '顯示「學習達人」稱號',
    type: 'cosmetic',
    rarity: 'rare',
    slot: 'title',
    icon: '📖',
    price: 300,
    maxStack: 1,
    order: 21,
  },
  {
    name: '知識王者',
    description: '顯示「知識王者」稱號',
    type: 'cosmetic',
    rarity: 'epic',
    slot: 'title',
    icon: '👑',
    price: 800,
    maxStack: 1,
    order: 22,
  },
  {
    name: '傳說勇者',
    description: '顯示「傳說勇者」稱號',
    type: 'cosmetic',
    rarity: 'legendary',
    slot: 'title',
    icon: '⚔️',
    price: 2000,
    maxStack: 1,
    order: 23,
  },
  // Cosmetics - Avatar Frames
  {
    name: '木質相框',
    description: '簡單的木質頭像框',
    type: 'cosmetic',
    rarity: 'common',
    slot: 'head',
    icon: '🪵',
    price: 80,
    maxStack: 1,
    order: 30,
  },
  {
    name: '銀色相框',
    description: '閃亮的銀色頭像框',
    type: 'cosmetic',
    rarity: 'rare',
    slot: 'head',
    icon: '🥈',
    price: 250,
    maxStack: 1,
    order: 31,
  },
  {
    name: '金色相框',
    description: '尊貴的金色頭像框',
    type: 'cosmetic',
    rarity: 'epic',
    slot: 'head',
    icon: '🥇',
    price: 600,
    maxStack: 1,
    order: 32,
  },
  {
    name: '星光相框',
    description: '閃耀星光的傳說頭像框',
    type: 'cosmetic',
    rarity: 'legendary',
    slot: 'head',
    icon: '✨',
    price: 1500,
    maxStack: 1,
    order: 33,
  },
  // Cosmetics - Backgrounds
  {
    name: '森林背景',
    description: '綠意盎然的森林主題背景',
    type: 'cosmetic',
    rarity: 'common',
    slot: 'background',
    icon: '🌲',
    price: 120,
    maxStack: 1,
    order: 40,
  },
  {
    name: '星空背景',
    description: '浪漫的星空主題背景',
    type: 'cosmetic',
    rarity: 'rare',
    slot: 'background',
    icon: '🌌',
    price: 350,
    maxStack: 1,
    order: 41,
  },
  {
    name: '城堡背景',
    description: '壯麗的城堡主題背景',
    type: 'cosmetic',
    rarity: 'epic',
    slot: 'background',
    icon: '🏰',
    price: 700,
    maxStack: 1,
    order: 42,
  },
  {
    name: '龍之背景',
    description: '傳說中的龍族主題背景',
    type: 'cosmetic',
    rarity: 'legendary',
    slot: 'background',
    icon: '🐉',
    price: 1800,
    maxStack: 1,
    order: 43,
  },
];

// Get questions data (will be called after categories are created)
const getQuestionsData = (
  categories: Record<string, mongoose.Types.ObjectId>,
  teacherId: mongoose.Types.ObjectId
) => [
  // 數學 - 基礎運算
  {
    subject: 'math',
    categoryId: categories['math-基礎運算'],
    tags: ['加法', '基礎'],
    difficulty: 'easy',
    baseExp: 10,
    baseGold: 5,
    type: 'single_choice',
    content: {
      text: '5 + 3 = ?',
      adventureContext: {
        description: '一隻數學小精靈擋住了你的去路，牠想考考你的算術能力！',
        monsterName: '數學小精靈',
      },
    },
    options: [
      { id: 'A', text: '6' },
      { id: 'B', text: '7' },
      { id: 'C', text: '8' },
      { id: 'D', text: '9' },
    ],
    answer: { correct: 'C', explanation: '5 + 3 = 8，答案是 C。' },
    createdBy: teacherId,
  },
  {
    subject: 'math',
    categoryId: categories['math-基礎運算'],
    tags: ['減法', '基礎'],
    difficulty: 'easy',
    baseExp: 10,
    baseGold: 5,
    type: 'single_choice',
    content: {
      text: '12 - 7 = ?',
      adventureContext: {
        description: '森林裡的貓頭鷹問你一個問題！',
        monsterName: '智慧貓頭鷹',
      },
    },
    options: [
      { id: 'A', text: '4' },
      { id: 'B', text: '5' },
      { id: 'C', text: '6' },
      { id: 'D', text: '7' },
    ],
    answer: { correct: 'B', explanation: '12 - 7 = 5，答案是 B。' },
    createdBy: teacherId,
  },
  {
    subject: 'math',
    categoryId: categories['math-基礎運算'],
    tags: ['乘法', '基礎'],
    difficulty: 'medium',
    baseExp: 20,
    baseGold: 10,
    type: 'single_choice',
    content: {
      text: '6 × 7 = ?',
      adventureContext: {
        description: '一隻聰明的狐狸想測試你的乘法能力！',
        monsterName: '狡猾狐狸',
      },
    },
    options: [
      { id: 'A', text: '36' },
      { id: 'B', text: '42' },
      { id: 'C', text: '48' },
      { id: 'D', text: '49' },
    ],
    answer: { correct: 'B', explanation: '6 × 7 = 42，答案是 B。' },
    createdBy: teacherId,
  },
  {
    subject: 'math',
    categoryId: categories['math-基礎運算'],
    tags: ['除法', '中等'],
    difficulty: 'medium',
    baseExp: 20,
    baseGold: 10,
    type: 'single_choice',
    content: {
      text: '56 ÷ 8 = ?',
      adventureContext: {
        description: '數學巨人攔住了你的去路！',
        monsterName: '數學巨人',
      },
    },
    options: [
      { id: 'A', text: '6' },
      { id: 'B', text: '7' },
      { id: 'C', text: '8' },
      { id: 'D', text: '9' },
    ],
    answer: { correct: 'B', explanation: '56 ÷ 8 = 7，答案是 B。' },
    createdBy: teacherId,
  },
  {
    subject: 'math',
    categoryId: categories['math-基礎運算'],
    tags: ['應用題', '困難'],
    difficulty: 'hard',
    baseExp: 30,
    baseGold: 15,
    type: 'single_choice',
    content: {
      text: '小明有 24 顆糖果，他想平均分給 6 個朋友，每個朋友可以分到幾顆？',
      adventureContext: {
        description: '終極數學魔王出現了！打敗他需要你的智慧！',
        monsterName: '數學魔王',
      },
    },
    options: [
      { id: 'A', text: '3 顆' },
      { id: 'B', text: '4 顆' },
      { id: 'C', text: '5 顆' },
      { id: 'D', text: '6 顆' },
    ],
    answer: { correct: 'B', explanation: '24 ÷ 6 = 4，每個朋友可以分到 4 顆糖果。' },
    createdBy: teacherId,
  },
  // 國語 - 字詞辨識
  {
    subject: 'chinese',
    categoryId: categories['chinese-字詞辨識'],
    tags: ['生字', '基礎'],
    difficulty: 'easy',
    baseExp: 10,
    baseGold: 5,
    type: 'single_choice',
    content: {
      text: '「陽光普照」中的「普」是什麼意思？',
      adventureContext: {
        description: '文字精靈想考考你對漢字的認識！',
        monsterName: '文字精靈',
      },
    },
    options: [
      { id: 'A', text: '很少' },
      { id: 'B', text: '普通' },
      { id: 'C', text: '廣泛、全面' },
      { id: 'D', text: '突然' },
    ],
    answer: { correct: 'C', explanation: '「普」在這裡是「廣泛、全面」的意思，陽光普照就是陽光照射到每個地方。' },
    createdBy: teacherId,
  },
  {
    subject: 'chinese',
    categoryId: categories['chinese-成語故事'],
    tags: ['成語', '中等'],
    difficulty: 'medium',
    baseExp: 20,
    baseGold: 10,
    type: 'single_choice',
    content: {
      text: '「守株待兔」這個成語告訴我們什麼道理？',
      adventureContext: {
        description: '成語大師要考驗你對成語的理解！',
        monsterName: '成語大師',
      },
    },
    options: [
      { id: 'A', text: '要有耐心等待' },
      { id: 'B', text: '不能只靠運氣，要努力' },
      { id: 'C', text: '要保護小動物' },
      { id: 'D', text: '種樹很重要' },
    ],
    answer: { correct: 'B', explanation: '守株待兔告訴我們不能只想著靠運氣，要靠自己的努力才能成功。' },
    createdBy: teacherId,
  },
  {
    subject: 'chinese',
    categoryId: categories['chinese-成語故事'],
    tags: ['成語', '困難'],
    difficulty: 'hard',
    baseExp: 30,
    baseGold: 15,
    type: 'single_choice',
    content: {
      text: '下列哪個成語形容做事非常認真？',
      adventureContext: {
        description: '成語魔導師發出了最終挑戰！',
        monsterName: '成語魔導師',
      },
    },
    options: [
      { id: 'A', text: '三心二意' },
      { id: 'B', text: '馬馬虎虎' },
      { id: 'C', text: '一絲不苟' },
      { id: 'D', text: '得過且過' },
    ],
    answer: { correct: 'C', explanation: '「一絲不苟」形容做事認真細緻，連一點小地方都不馬虎。' },
    createdBy: teacherId,
  },
];

async function seed() {
  try {
    console.log('🌱 開始種子資料建立...');

    // Connect to MongoDB
    await mongoose.connect(MONGO_URL);
    console.log('📦 MongoDB 連線成功');

    // Create or find a teacher for seeding questions
    let teacher = await User.findOne({ email: 'seed-teacher@example.com' });
    if (!teacher) {
      teacher = await User.create({
        email: 'seed-teacher@example.com',
        passwordHash: 'seedpassword123',
        displayName: '系統教師',
        role: 'teacher',
      });
      console.log('👨‍🏫 建立系統教師帳號');
    }

    // Clear existing seed data (optional - comment out if you want to keep existing data)
    // await Category.deleteMany({});
    // await Question.deleteMany({});
    // console.log('🗑️ 清除舊資料');

    // Create categories
    const categoryMap: Record<string, mongoose.Types.ObjectId> = {};
    for (const catData of categoriesData) {
      const existingCat = await Category.findOne({
        subject: catData.subject,
        name: catData.name,
      });

      if (existingCat) {
        categoryMap[`${catData.subject}-${catData.name}`] = existingCat._id;
        console.log(`📁 分類已存在: ${catData.name}`);
      } else {
        const category = await Category.create(catData);
        categoryMap[`${catData.subject}-${catData.name}`] = category._id;
        console.log(`✅ 建立分類: ${catData.name}`);
      }
    }

    // Create questions
    const questionsData = getQuestionsData(categoryMap, teacher._id);
    let createdCount = 0;
    let skippedCount = 0;

    for (const qData of questionsData) {
      // Check if question already exists (by content text)
      const existingQ = await Question.findOne({
        'content.text': qData.content.text,
      });

      if (existingQ) {
        skippedCount++;
      } else {
        await Question.create(qData);
        createdCount++;
      }
    }

    console.log(`\n📊 種子資料建立完成！`);
    console.log(`   - 分類: ${Object.keys(categoryMap).length} 個`);
    console.log(`   - 題目: ${createdCount} 個新建, ${skippedCount} 個已存在`);

    // Seed Daily Tasks
    console.log('\n🎯 建立每日任務...');
    let dailyTaskCreated = 0;
    let dailyTaskSkipped = 0;

    for (const taskData of dailyTasksData) {
      const existingTask = await DailyTask.findOne({ code: taskData.code });
      if (existingTask) {
        dailyTaskSkipped++;
      } else {
        await DailyTask.create(taskData);
        dailyTaskCreated++;
      }
    }
    console.log(`   - 每日任務: ${dailyTaskCreated} 個新建, ${dailyTaskSkipped} 個已存在`);

    // Seed Achievements
    console.log('\n🏆 建立成就...');
    let achievementCreated = 0;
    let achievementSkipped = 0;

    for (const achData of achievementsData) {
      const existingAch = await Achievement.findOne({ code: achData.code });
      if (existingAch) {
        achievementSkipped++;
      } else {
        await Achievement.create(achData);
        achievementCreated++;
      }
    }
    console.log(`   - 成就: ${achievementCreated} 個新建, ${achievementSkipped} 個已存在`);

    // Seed Shop Items
    console.log('\n🛒 建立商店商品...');
    let itemCreated = 0;
    let itemSkipped = 0;

    for (const itemData of itemsData) {
      const existingItem = await Item.findOne({ name: itemData.name });
      if (existingItem) {
        itemSkipped++;
      } else {
        await Item.create(itemData);
        itemCreated++;
      }
    }
    console.log(`   - 商品: ${itemCreated} 個新建, ${itemSkipped} 個已存在`);

    // Summary
    const totalCategories = await Category.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const totalDailyTasks = await DailyTask.countDocuments();
    const totalAchievements = await Achievement.countDocuments();
    const totalItems = await Item.countDocuments();
    console.log(`\n📈 資料庫總計:`);
    console.log(`   - 分類總數: ${totalCategories}`);
    console.log(`   - 題目總數: ${totalQuestions}`);
    console.log(`   - 每日任務: ${totalDailyTasks}`);
    console.log(`   - 成就總數: ${totalAchievements}`);
    console.log(`   - 商品總數: ${totalItems}`);

  } catch (error) {
    console.error('❌ 種子資料建立失敗:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 資料庫連線已關閉');
  }
}

// Run seed
seed();
