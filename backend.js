const path = require('node:path');
const express = require('express');
const { createDatabase } = require('./src/db/database');
const { CourseRepository } = require('./src/repositories/courseRepository');
const { EnrollmentRepository } = require('./src/repositories/enrollmentRepository');
const { AuthRepository } = require('./src/repositories/authRepository');
const { RoadmapService } = require('./src/services/roadmapService');
const { AuditService } = require('./src/services/auditService');
const { createApiRouter } = require('./src/routes/api');
const { securityHeaders, createRateLimiter } = require('./src/middleware/security');
const { errorHandler } = require('./src/middleware/errorHandler');

/**
 * Create and configure the Express application with an isolated DB handle.
 */
function createApp(options = {}) {
  const db = createDatabase(options.dbPath);
  const courseRepo = new CourseRepository(db);
  const enrollmentRepo = new EnrollmentRepository(db);
  const authRepo = new AuthRepository(db);
  const roadmapService = new RoadmapService(courseRepo, enrollmentRepo);
  const auditService = new AuditService(courseRepo, enrollmentRepo);

  const app = express();

  app.disable('x-powered-by');
  app.use(securityHeaders());
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', createRateLimiter({ maxRequests: options.maxRequests || 300 }));

  // Serve shared DAG engine at /js/graphEngine.js so frontend and backend share one source of truth
  app.get('/js/graphEngine.js', (_req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'domain', 'graphEngine.js'));
  });

  // Serve modular frontend assets and root HTML entry points
  app.use('/public', express.static(path.join(__dirname, 'public')));
  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'frontend.html'));
  });
  app.get('/frontend.html', (_req, res) => {
    res.sendFile(path.join(__dirname, 'frontend.html'));
  });
  app.get('/login.html', (_req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
  });

  // API routes
  app.use('/api', createApiRouter({
    courseRepo,
    enrollmentRepo,
    authRepo,
    roadmapService,
    auditService
  }));

  // 404 handler for unknown API endpoints
  app.use('/api', (_req, res) => {
    res.status(404).json({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'API endpoint not found.' }
    });
  });

  app.use(errorHandler);

  return { app, db };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 5000;
  const { app, db } = createApp();
  const server = app.listen(port, () => {
    console.log(`SkillSprout API & App running at http://localhost:${port}`);
  });

  const shutdown = () => {
    server.close(() => {
      try {
        db.close();
      } catch (_err) {
        // Ignore close errors during shutdown
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { createApp };
