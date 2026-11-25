# SkillSprout: LearnLoop Hack

Prerequisite-validated academic roadmap builder, DAG engine, and **Advisor Audit** system for engineering students.

## Architecture Overview

SkillSprout uses a **3-tier modular architecture**:

1. **Presentation Layer (`public/`, `frontend.html`, `login.html`)**:
   - Modular ES modules separating state management (`public/js/state/store.js`), API client (`public/js/services/apiClient.js`), XSS-safe DOM builders (`public/js/utils/sanitize.js`), and UI views (`roadmapView.js`, `catalogView.js`, `graphView.js`, `advisorAuditView.js`, `peersView.js`).
   - Topologically-layered interactive SVG DAG with directional arrowheads, hover dependency tracing, and cycle highlighting.
   - Recoverable offline/corrupted-state banner with snapshot rollback.
2. **Domain & Application Layer (`src/domain/graphEngine.js`, `src/services/`, `src/validators/`, `src/middleware/`)**:
   - Universal DAG engine shared by backend, frontend, and tests: Kahn's topological sort, DFS cycle path reconstruction, transitive prerequisite resolution, critical path calculation, and **Advisor Audit** rules.
   - Strict Zod schema validation (`src/validators/schemas.js`), Helmet CSP/security headers, rate limiting, and structured JSON error handling.
3. **Persistence Layer (`src/db/database.js`, `src/repositories/`)**:
   - SQLite relational database (`node:sqlite`, WAL mode, foreign keys, transactions) with B-tree indexes (`idx_courses_diff`, `idx_courses_sem`, `idx_courses_credits`, `idx_prereq_course`, `idx_enrollments_user`) and server-side pagination (`GET /api/courses?page=&limit=`).

## How to Run

```bash
npm install
npm start
```

Open `http://localhost:5000` (or `http://localhost:5000/login.html`).

## Running Automated Tests

```bash
npm test
```

Runs Jest unit tests (DAG engine, cycle detection, Advisor Audit, Zod schemas) and Supertest API integration tests against an isolated in-memory SQLite database.

## Key API Endpoints

- `GET /api/health` — Database & service health status
- `GET /api/courses?page=1&limit=12&search=&diff=&credits=` — Server-paginated, indexed catalog search
- `GET /api/courses/all` — Full catalog for client DAG rendering
- `POST /api/courses` — Add custom course (validates acyclicity before persisting)
- `POST /api/enroll`, `POST /api/complete`, `POST /api/unenroll` — Prerequisite-validated state mutations
- `POST /api/audit` — Run Advisor Audit and record audit log
- `POST /api/graph/validate` — Test proposed edges for circular dependencies
- `POST /api/auth/register`, `POST /api/auth/login` — Scrypt-hashed authentication
