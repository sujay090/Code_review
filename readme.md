# Code Review — Node.js Advanced

A backend service for automated repository code reviews using Prisma + PostgreSQL. It ingests repository/webhook events, runs review jobs, stores findings and metadata, and exposes results for notifications and integrations.

Key features
- Manage users, repositories and webhook integrations
- Persist reviews, issues and status lifecycles (pending → processing → completed)
- Structured issue types/severities for automated analysis
- Notification model for email/websocket dispatch
- Prisma schema in prisma/schema.prisma for data model

Tech stack
- Node.js (server)
- Prisma ORM + PostgreSQL
- TypeScript (recommended)
- Webhook and background job processing
- Optional AI/analysis components (summaries, scoring)

Repository layout (high level)
- prisma/ — Prisma schema & migrations
- src/ — application source
- src/generated/prisma — Prisma client (generated)
- tests/ — unit/integration tests

Getting started (local)
Prerequisites
- Node 18+ and npm/yarn/pnpm
- PostgreSQL instance
- Environment variables (example)
  - DATABASE_URL=postgresql://user:pass@host:port/dbname
  - GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET (if GitHub integration)
  - JWT_SECRET or similar auth secrets

Install & prepare
1. Install deps:
   npm install
2. Set env vars (export or use .env)
3. Run Prisma migrate & generate:
   npx prisma migrate dev --name init
   npx prisma generate
4. Start dev server:
   npm run dev

Testing
- Run unit tests:
  npm test

Development notes
- Update prisma/schema.prisma for schema changes, then run prisma migrate and generate.
- Generated Prisma client is output to src/generated/prisma (see generator config).

Contributing
- Fork, create a feature branch, add tests, open a PR with a clear description.

License
- Add your preferred license (e.g., MIT) to LICENSE file.

Contact
- Project maintainer: update repository metadata or package.json with contact details.