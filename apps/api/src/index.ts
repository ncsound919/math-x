import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { chatRouter } from './routes/chat';
import { codegenRouter } from './routes/codegen';
import { planRouter } from './routes/plan';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests — slow down the query rate.' },
});
app.use('/api', limiter);

// Body parsing — 50mb for base64 file payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/codegen', codegenRouter);
app.use('/api/plan', planRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'online', system: 'MATH X Intelligence Core', version: '0.1.0' });
});

app.listen(PORT, () => {
  console.log(`\n◈ MATH X Intelligence Core online`);
  console.log(`  → API: http://localhost:${PORT}`);
  console.log(`  → Health: http://localhost:${PORT}/health\n`);
});
