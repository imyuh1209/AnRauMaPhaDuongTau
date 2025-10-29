// server/src/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ensureDatabaseAndSchema } from './setup-db.js';

// Ưu tiên các giá trị trong .env, ghi đè biến môi trường hiện có
dotenv.config({ override: true });

async function main() {
  // 1) Khởi tạo DB + schema khi start (DEV)
  try {
    await ensureDatabaseAndSchema();
  } catch (e) {
    console.error('❌ Không thể khởi tạo DB/schema:', e?.message || e);
    process.exit(1);
  }

  // 2) Khởi động API
  const app = express();

  // CORS: chấp nhận 1 hoặc nhiều origins (phân tách bằng dấu phẩy)
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : '*';

  console.log('🌐 CORS origin:', corsOrigins);

  app.use(
    cors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false, // bật true nếu bạn cần cookie
    })
  );
  app.options('*', cors()); // preflight

  app.use(express.json({ limit: '2mb' }));

  // Health check
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // 3) Import routes SAU khi DB sẵn sàng
  const { default: farmsRouter }        = await import('./routes/farms.js');
  const { default: actualsRouter }      = await import('./routes/actuals.js');
  const { default: reportsRouter }      = await import('./routes/reports.js');
  const { default: plansRouter }        = await import('./routes/plans.js');
  const { default: plotsRouter }        = await import('./routes/plots.js');
  const { default: rubberTypesRouter }  = await import('./routes/rubber-types.js');
  const { default: conversionsRouter }  = await import('./routes/conversions.js');
  const { default: authRouter }         = await import('./routes/auth.js');

  // 4) Mount routes
  app.use('/api/farms', farmsRouter);
  app.use('/api/actuals', actualsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/plots', plotsRouter);
  app.use('/api/rubber-types', rubberTypesRouter);
  app.use('/api/conversions', conversionsRouter);
  app.use('/api/auth', authRouter);

  // 404 JSON
  app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

  // Error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('💥 Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  const PORT = Number.parseInt(process.env.PORT || '3000', 10);
  const server = app.listen(PORT, () => console.log(`🚀 API chạy tại http://localhost:${PORT}`));
  server.on('close', () => console.log('🛑 HTTP server closed'));
}

process.on('exit', (code) => {
  console.log('👋 process.exit with code:', code);
});
process.on('uncaughtException', (err) => {
  console.error('💥 uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 unhandledRejection:', reason);
});

main();
