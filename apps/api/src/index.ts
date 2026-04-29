import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { chatRouter } from './routes/chat';
import { codegenRouter } from './routes/codegen';
import { planRouter } from './routes/plan';
import { verifyRouter } from './routes/verify';
import domainRouter from './routes/domain';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

app.use(helmet());
app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests — slow down the query rate.' },
});
app.use('/api', limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/codegen', codegenRouter);
app.use('/api/plan', planRouter);
app.use('/api/verify', verifyRouter);
app.use('/api/domain', domainRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0' });
});

app.listen(PORT, () => {
  console.log(`Math X API v2 running on port ${PORT}`);
});

export default app;
