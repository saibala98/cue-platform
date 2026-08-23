import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import { AppDataSource } from './src/database/data-source';
import { errorHandler } from './src/middleware/errorHandler';
import authRoutes from './src/routes/auth.routes';
import lobRoutes from './src/routes/lob.routes';
import moduleAdminRoutes from './src/routes/moduleAdmin.routes';
import modulesRoutes from './src/routes/modules.routes';
import mentorsRoutes from './src/routes/mentors.routes';
import leaderRoutes from './src/routes/leader.routes';
import leaderDashboardRoutes from './src/routes/leaderDashboard.routes';
import complianceRoutes from './src/routes/compliance.routes';
import documentsRoutes from './src/routes/documents.routes';
import aiRoutes from './src/routes/ai.routes';
import knowledgeMapRoutes from './src/routes/knowledgeMap.routes';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

// exposedHeaders is required for the browser to let client JS read
// Content-Disposition on CSV/file download responses — without it, every
// export endpoint's server-computed filename is silently discarded and the
// frontend falls back to a generic default.
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173', credentials: true, exposedHeaders: ['Content-Disposition'] }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/lob', lobRoutes);
// More specific mount must come before /api/modules, or modulesRoutes'
// GET /:id would swallow /api/modules/admin/* (Express matches by mount
// order, not specificity).
app.use('/api/modules/admin', moduleAdminRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/mentors', mentorsRoutes);
// More specific mount before /api/leader, same reasoning as /api/modules/admin above.
app.use('/api/leader/dashboard', leaderDashboardRoutes);
app.use('/api/leader', leaderRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/knowledge-map', knowledgeMapRoutes);

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));
app.use(errorHandler);

AppDataSource.initialize()
  .then(() => {
    console.log('[db] connected (postgres)');
    app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[db] failed to connect:', err);
    process.exit(1);
  });
