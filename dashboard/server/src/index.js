import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { portfolioRouter } from './routes/portfolio.js';
import { actionsRouter } from './routes/actions.js';
import { signalsRouter } from './routes/signals.js';
import { requireAuth } from './auth/middleware.js';
import { startSyncScheduler } from './sync-scheduler.js';

const app = express();
const port = Number(process.env.PORT || 4175);
const origin = process.env.CORS_ORIGIN || 'http://127.0.0.1:4174';
const syncIntervalMinutes = Number(process.env.SYNC_INTERVAL_MINUTES || 60);

app.use(cors({ origin, credentials: false }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/actions', requireAuth, actionsRouter);
app.use('/api/signals', requireAuth, signalsRouter);
app.use('/api', requireAuth, portfolioRouter);

// Future: a server-side-only Ollama/DeepSeek summary endpoint mounts here
// (e.g. `app.use('/api/ai', requireAuth, aiRouter)`) — per Ken's requirement
// (memory/project_kapphelper-dashboard-requirements.md) it must never be
// called directly from the browser with a key exposed client-side, and it
// should only ever read from the already-published Project/Activity/Action
// tables above, same as the rest of this API. Not implemented yet.

app.listen(port, () => {
  console.log(`KAppHelper API listening on http://127.0.0.1:${port} (CORS origin: ${origin})`);
  if (process.env.SYNC_DISABLED === 'true') {
    console.log('[sync] scheduler disabled (SYNC_DISABLED=true)');
  } else {
    startSyncScheduler({ intervalMinutes: syncIntervalMinutes });
  }
});
