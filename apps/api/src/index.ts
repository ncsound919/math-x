import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { chatRouter }       from './routes/chat';
import { codegenRouter }    from './routes/codegen';
import { planRouter }       from './routes/plan';
import { verifyRouter }     from './routes/verify';
import { literatureRouter } from './routes/literature';
import { ocrRouter }        from './routes/ocr';
import { bioRouter }        from './routes/bio';
import { hypothesisRouter } from './routes/hypothesis';
import { analogiesRouter }  from './routes/analogies';
import domainRouter         from './routes/domain';
import { modelsRouter }     from './routes/models';

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
  max: 120,
  message: { error: 'Too many requests — slow down the query rate.' },
});
app.use('/api', limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/chat',       chatRouter);
app.use('/api/codegen',    codegenRouter);
app.use('/api/plan',       planRouter);
app.use('/api/verify',     verifyRouter);
app.use('/api/literature', literatureRouter);
app.use('/api/domain',     domainRouter);
app.use('/api/ocr',        ocrRouter);
app.use('/api/bio',        bioRouter);
app.use('/api/hypothesis', hypothesisRouter);
app.use('/api/analogies',  analogiesRouter);
app.use('/api/models',     modelsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '0.4.0' });
});

app.listen(PORT, () => {
  console.log(`Math X API v0.4 running on port ${PORT}`);
});

export default app;
