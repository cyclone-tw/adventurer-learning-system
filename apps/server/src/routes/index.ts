import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import questionsRouter from './questions.js';
import categoriesRouter from './categories.js';
import uploadRouter from './upload.js';
import adminRouter from './admin.js';
import attemptsRouter from './attempts.js';
import subjectsRouter from './subjects.js';
import academicYearsRouter from './academicYears.js';
import unitsRouter from './units.js';
import studentsRouter from './students.js';
import shopRouter from './shop.js';
import inventoryRouter from './inventory.js';
import itemsRouter from './items.js';
import classesRouter from './classes.js';
import leaderboardRouter from './leaderboard.js';
import achievementsRouter from './achievements.js';
import reportsRouter from './reports.js';
import avatarRouter from './avatar.js';
import stagesRouter from './stages.js';
import dailyTasksRouter from './dailyTasks.js';
import announcementsRouter from './announcements.js';
import gameMapsRouter from './gameMaps.js';
import paperDollRouter from './paperDoll.js';

const router = Router();

// Health check
router.use('/health', healthRouter);

// Authentication
router.use('/auth', authRouter);

// Questions (CRUD + import/export)
router.use('/questions', questionsRouter);

// Categories (legacy - keeping for backward compatibility)
router.use('/categories', categoriesRouter);

// Subjects (科目)
router.use('/subjects', subjectsRouter);

// Academic Years (學年度)
router.use('/academic-years', academicYearsRouter);

// Units (單元)
router.use('/units', unitsRouter);

// Upload (media files)
router.use('/upload', uploadRouter);

// Admin (user management)
router.use('/admin', adminRouter);

// Student attempts (quiz answering)
router.use('/attempts', attemptsRouter);

// Student management (for teachers)
router.use('/students', studentsRouter);

// Shop (purchase items)
router.use('/shop', shopRouter);

// Inventory (player's items)
router.use('/inventory', inventoryRouter);

// Items (admin management)
router.use('/items', itemsRouter);

// Classes (班級管理)
router.use('/classes', classesRouter);

// Leaderboard (排行榜)
router.use('/leaderboard', leaderboardRouter);

// Achievements (成就系統)
router.use('/achievements', achievementsRouter);

// Reports (報表中心)
router.use('/reports', reportsRouter);

// Avatar (角色裝扮)
router.use('/avatar', avatarRouter);

// Stages (關卡系統)
router.use('/stages', stagesRouter);

// Daily Tasks (每日任務)
router.use('/daily-tasks', dailyTasksRouter);

// Announcements (公告/活動)
router.use('/announcements', announcementsRouter);

// Game Maps (地圖探索系統)
router.use('/game-maps', gameMapsRouter);

// Paper Doll (紙娃娃角色系統)
router.use('/paper-doll', paperDollRouter);

export default router;
