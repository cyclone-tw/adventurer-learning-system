import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import { config } from './config/index.js';
import connectDB from './config/database.js';
import { configurePassport } from './config/passport.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      ...config.corsOrigin.split(',').map(s => s.trim()),
    ],
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport middleware
configurePassport();
app.use(passport.initialize());

// API Routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: '冒險者學習系統 API',
      version: '1.0.0',
      docs: '/api/v1/health',
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    app.listen(config.port, () => {
      console.log(`Server is running on http://localhost:${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
