import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config/env';

// Import Routes
import authRoutes from './routes/authRoutes';
import recruitmentRoutes from './routes/recruitmentRoutes';
import employeeRoutes from './routes/employeeRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import taskRoutes from './routes/taskRoutes';
import leaveRoutes from './routes/leaveRoutes';
import payrollRoutes from './routes/payrollRoutes';
import settingsRoutes from './routes/settingsRoutes';
import reportRoutes from './routes/reportRoutes';
import fileRoutes from './routes/fileRoutes';
import auditRoutes from './routes/auditRoutes';

const app: Express = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Allows PWA scripts and embedded images
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
const allowedOrigins = [
  config.appUrl,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com') || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in dev, or locked to domain
    }
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/audit', auditRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Mastered Skill Academy HR API'
  });
});

import fs from 'fs';

// Serve frontend build in production
const candidatePaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, './public'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'server/public'),
  path.resolve(process.cwd(), 'dist')
];

let clientDistPath = candidatePaths[0];
for (const p of candidatePaths) {
  if (fs.existsSync(path.join(p, 'index.html'))) {
    clientDistPath = p;
    break;
  }
}

app.use(express.static(clientDistPath));

app.get('*', (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('MSA HR Server is running. Client build not found (run `npm run build:client` first).');
    }
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error Handler]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

export default app;
