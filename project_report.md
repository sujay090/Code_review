# 🚀 AI-Powered Code Review — Project Architecture Report

> **Project Name:** Code Review AI
> **GitHub:** [sujay090/Code_review](https://github.com/sujay090/Code_review)
> **Type:** Backend REST API (Node.js)
> **Purpose:** Automatically reviews code quality on every Git push using Google Gemini AI, and notifies developers via email with actionable feedback.

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Folder Structure](#4-folder-structure)
5. [Database Schema (Prisma + PostgreSQL)](#5-database-schema)
6. [Authentication Flow (GitHub OAuth 2.0)](#6-authentication-flow)
7. [Core Application Flows](#7-core-application-flows)
8. [Layer-by-Layer Breakdown](#8-layer-by-layer-breakdown)
9. [Background Job Processing (BullMQ)](#9-background-job-processing)
10. [AI Review Pipeline (Gemini)](#10-ai-review-pipeline)
11. [Email Notification System](#11-email-notification-system)
12. [Security Practices](#12-security-practices)
13. [API Endpoints Reference](#13-api-endpoints-reference)
14. [Environment Variables](#14-environment-variables)
15. [Docker & Deployment](#15-docker--deployment)
16. [Interview Talking Points](#16-interview-talking-points)

---

## 1. Project Overview

This project is an **AI-powered automated code review system**. When a developer pushes code to a connected GitHub repository, the system:

1. **Receives a webhook** from GitHub
2. **Fetches the commit diff** from the GitHub API
3. **Sends the diff to Google Gemini AI** for analysis
4. **Stores the review results** (score, summary, issues) in PostgreSQL
5. **Sends an email notification** to the developer with the results
6. **Generates weekly digest reports** summarizing code quality trends

The entire review pipeline runs **asynchronously** using BullMQ job queues backed by Redis, ensuring the webhook response is instant and the heavy processing happens in the background.

---

## 2. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **Runtime** | Node.js + TypeScript | Type safety, modern async/await, ESM modules |
| **Framework** | Express 5 | Minimal, battle-tested HTTP framework |
| **Database** | PostgreSQL | Relational data with complex relationships |
| **ORM** | Prisma (with `@prisma/adapter-pg`) | Type-safe database queries, migrations, schema-first design |
| **Cache / Sessions** | Redis | Session storage (TTL-based), BullMQ job queue backend |
| **Job Queue** | BullMQ | Reliable background processing with retries, backoff, concurrency |
| **AI Engine** | Google Gemini 2.0 Flash | Structured JSON output for code analysis |
| **Email** | Nodemailer | SMTP in production, Ethereal for dev/testing |
| **Auth** | GitHub OAuth 2.0 | Secure third-party authentication |
| **Security** | Helmet, CORS, HMAC-SHA256, signed cookies | Defense-in-depth |
| **Containerization** | Docker + Docker Compose | Reproducible environments |

---

## 3. High-Level Architecture

```mermaid
graph TB
    subgraph "External Services"
        GH["GitHub"]
        GEMINI["Google Gemini AI"]
        SMTP["SMTP Server"]
    end

    subgraph "Client"
        BROWSER["Browser / Frontend"]
    end

    subgraph "Application Server (Express)"
        ROUTES["Routes Layer"]
        MW["Auth Middleware"]
        CTRL["Controllers Layer"]
        SVC["Services Layer"]
    end

    subgraph "Data Layer"
        PG["PostgreSQL"]
        REDIS["Redis"]
    end

    subgraph "Background Workers (BullMQ)"
        RQ["Review Queue"]
        RW["Review Worker ×3"]
        EQ["Email Queue"]
        EW["Email Worker ×5"]
        RPQ["Report Queue"]
        RPW["Report Worker ×2"]
    end

    BROWSER -->|"HTTP Requests"| ROUTES
    GH -->|"Webhook POST"| ROUTES
    ROUTES --> MW --> CTRL --> SVC
    SVC -->|"Read/Write"| PG
    SVC -->|"Sessions"| REDIS
    SVC -->|"Fetch diff"| GH
    SVC -->|"Code analysis"| GEMINI

    CTRL -->|"Add job"| RQ
    RQ -->|"Process"| RW
    RW -->|"Uses"| SVC
    RW -->|"Add job"| EQ
    EQ -->|"Process"| EW
    EW -->|"Send email"| SMTP
    RPQ -->|"Cron: Monday 9am"| RPW
    RPW -->|"Send digest"| SMTP

    RQ -.->|"Backed by"| REDIS
    EQ -.->|"Backed by"| REDIS
    RPQ -.->|"Backed by"| REDIS
```

### How the pieces connect:
- The **Express server** handles HTTP requests and webhook events
- **Controllers** validate input and orchestrate service calls
- **Services** contain pure business logic (no HTTP concerns)
- **BullMQ queues** decouple heavy work from the request/response cycle
- **Workers** run in the same process but process jobs concurrently in the background
- **Redis** serves dual duty: session store + job queue backend

---

## 4. Folder Structure

```
Code_review/
├── prisma/
│   ├── schema.prisma          # Database models & enums
│   └── migrations/            # SQL migration files
├── src/
│   ├── index.ts               # App entry point — wires everything together
│   ├── db/
│   │   ├── DB.ts              # Prisma client singleton (PostgreSQL)
│   │   └── redis.ts           # Redis client (sessions)
│   ├── generated/
│   │   └── prisma/            # Auto-generated Prisma client types
│   ├── middlewares/
│   │   └── validateUser.ts    # Auth middleware (session → user)
│   ├── routes/
│   │   ├── auth.route.ts      # /api/auth/*
│   │   ├── github.route.ts    # /api/github/*
│   │   ├── repository.route.ts # /api/repositories/*
│   │   ├── review.route.ts    # /api/reviews/*
│   │   └── webhook.route.ts   # /api/webhooks/*
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── github.controller.ts
│   │   ├── repository.controller.ts
│   │   ├── review.controller.ts
│   │   └── webhook.controller.ts
│   ├── services/
│   │   ├── auth.service.ts        # GitHub OAuth + sessions
│   │   ├── github.service.ts      # GitHub API (repos, diffs, commits)
│   │   ├── repository.service.ts  # Connect repos + register webhooks
│   │   ├── review.service.ts      # AI review pipeline orchestrator
│   │   ├── ai.service.ts          # Gemini API integration
│   │   ├── webhook.service.ts     # Webhook registration + HMAC verification
│   │   └── email.service.ts       # Nodemailer email sending
│   ├── queues/
│   │   ├── review.queue.ts    # BullMQ queue for code reviews
│   │   ├── email.queue.ts     # BullMQ queue for email notifications
│   │   └── report.queue.ts   # BullMQ queue for weekly digests
│   └── workers/
│       ├── review.worker.ts   # Processes review jobs (concurrency: 3)
│       ├── email.worker.ts    # Sends notification emails (concurrency: 5)
│       └── report.worker.ts   # Generates weekly digests (concurrency: 2)
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Redis + app services
├── package.json
└── tsconfig.json
```

### Design Principle: **Layered Architecture**

```
Request → Route → Middleware → Controller → Service → Database
                                    ↓
                              Queue → Worker → Service → External API
```

Each layer has a **single responsibility**:
- **Routes**: Map URLs to controller functions, apply middleware
- **Middleware**: Cross-cutting concerns (authentication)
- **Controllers**: HTTP logic (parse request, validate input, send response)
- **Services**: Business logic (no knowledge of HTTP)
- **Queues/Workers**: Async job processing

---

## 5. Database Schema

```mermaid
erDiagram
    User ||--o{ Repository : "owns"
    User ||--o{ Notification : "receives"
    Repository ||--o{ Review : "has"
    Review ||--o{ Issue : "contains"

    User {
        string id PK "cuid()"
        string githubId UK
        string username
        string email
        string avatarUrl
        string accessToken
        string refreshToken
        datetime createdAt
        datetime updatedAt
    }

    Repository {
        string id PK "cuid()"
        string githubRepoId UK
        string githubWebhookId "nullable"
        string name
        string fullName
        string defaultBranch "nullable"
        boolean isActive "default: true"
        string userId FK
        datetime createdAt
        datetime updatedAt
    }

    Review {
        string id PK "cuid()"
        string commitId
        string branch
        ReviewStatus status "PENDING → PROCESSING → COMPLETED/FAILED"
        string aiSummary "nullable"
        int score "nullable, 0-100"
        string repositoryId FK
        datetime startedAt "nullable"
        datetime completedAt "nullable"
        datetime createdAt
    }

    Issue {
        string id PK "cuid()"
        IssueType type "BUG/SECURITY/PERFORMANCE/CODE_SMELL"
        Severity severity "LOW/MEDIUM/HIGH/CRITICAL"
        string title
        string description
        string filePath "nullable"
        int lineNumber "nullable"
        string reviewId FK
        datetime createdAt
    }

    Notification {
        string id PK "cuid()"
        NotificationType type "EMAIL/WEBSOCKET"
        NotificationStatus status "PENDING/SENT/FAILED"
        string userId FK
        datetime createdAt
    }
```

### Key Design Decisions:

| Decision | Reasoning |
|---|---|
| `cuid()` for primary keys | URL-safe, sortable, non-sequential (prevents enumeration attacks) |
| `githubRepoId` is unique | Prevents duplicate repositories even if re-connected |
| `Review.status` enum | State machine: PENDING → PROCESSING → COMPLETED/FAILED |
| Issues are separate from Reviews | One review can find multiple issues across multiple files |
| `score` is nullable | Only populated after AI completes analysis |
| `Notification` model | Audit trail for all sent notifications |
| Prisma adapter pattern | Uses `@prisma/adapter-pg` for direct PostgreSQL driver connection |

---

## 6. Authentication Flow

The app uses **GitHub OAuth 2.0** with **CSRF protection** via a state parameter stored in signed cookies.

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Express Server
    participant G as GitHub OAuth
    participant R as Redis
    participant D as PostgreSQL

    Note over B,G: Step 1: Initiate Login
    B->>S: GET /api/auth/github
    S->>S: Generate random state (32 bytes hex)
    S->>B: Set signed cookie (github_oauth_state=state)
    S->>B: 302 Redirect → github.com/login/oauth/authorize

    Note over B,G: Step 2: User authorizes on GitHub
    B->>G: User clicks "Authorize"
    G->>B: 302 Redirect → /api/auth/github/callback?code=XXX&state=YYY

    Note over B,D: Step 3: Exchange code for token
    B->>S: GET /api/auth/github/callback?code=XXX&state=YYY
    S->>S: Verify state matches signed cookie (CSRF protection)
    S->>G: POST /login/oauth/access_token (code + client_secret)
    G->>S: { access_token: "gho_..." }
    S->>G: GET /user (with Bearer token)
    G->>S: { id, login, email, avatar_url }
    S->>G: GET /user/emails (fallback if email is null)

    Note over S,D: Step 4: Create/update user & session
    S->>D: UPSERT User (by githubId)
    S->>R: SET session:<sessionId> = userId (TTL: 7 days)
    S->>B: Set signed cookie (code_review_session=sessionId)
    S->>B: 302 Redirect → /dashboard
```

### Security measures in the auth flow:

| Measure | Implementation |
|---|---|
| **CSRF protection** | Random `state` parameter compared with signed cookie |
| **Signed cookies** | `cookie-parser` with `COOKIE_SECRET` prevents tampering |
| **HttpOnly cookies** | Session cookie cannot be accessed by JavaScript |
| **Secure flag** | Enabled in production (HTTPS only) |
| **SameSite: Lax** | Prevents CSRF attacks from third-party sites |
| **Server-side sessions** | Session data stored in Redis, only session ID in cookie |
| **7-day TTL** | Sessions automatically expire |

### How the Auth Middleware Works

Every protected route passes through [validateUser.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/middlewares/validateUser.ts):

```
Request with cookie → Extract signed session cookie
  → Redis: GET session:<sessionId>
    → Found: Fetch user from PostgreSQL → Attach to req.user → Continue
    → Not found: Clear cookie → Return 401
```

The middleware strips sensitive fields (`accessToken`, `refreshToken`) from the user object before attaching it to the request — the controller never sees tokens.

---

## 7. Core Application Flows

### Flow 1: Connecting a Repository (Manual)

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant GH as GitHub API
    participant DB as PostgreSQL

    C->>S: POST /api/repositories {githubRepoId, name, fullName, defaultBranch}
    S->>S: Auth middleware (verify session)
    S->>DB: UPSERT Repository
    S->>GH: POST /repos/{owner}/{repo}/hooks (register webhook)
    GH->>S: { id: webhookId }
    S->>DB: UPDATE Repository SET githubWebhookId = webhookId
    S->>C: 201 { repository }
```

### Flow 2: Automatic Code Review (Webhook-triggered)

This is the **main flow** — the heart of the application:

```mermaid
sequenceDiagram
    participant GH as GitHub
    participant WH as Webhook Controller
    participant DB as PostgreSQL
    participant RQ as Review Queue (Redis)
    participant RW as Review Worker
    participant GS as GitHub Service
    participant AI as Gemini AI
    participant EQ as Email Queue
    participant EW as Email Worker
    participant SMTP as Email Server

    Note over GH,SMTP: Phase 1: Receive Webhook (< 100ms)
    GH->>WH: POST /api/webhooks/github (push event)
    WH->>WH: Verify HMAC-SHA256 signature
    WH->>WH: Parse payload (commitId, branch, repoId)
    WH->>DB: Find Repository by githubRepoId
    WH->>DB: CREATE Review (status: PENDING)
    WH->>RQ: enqueueReview(reviewId)
    WH->>GH: 202 { "message": "Review queued" }

    Note over RQ,AI: Phase 2: Process Review (async, ~5-15s)
    RQ->>RW: Job: { reviewId }
    RW->>DB: GET Review + Repository
    RW->>DB: UPDATE Review SET status = PROCESSING
    RW->>DB: GET User (for accessToken)
    RW->>GS: getCommitDiff(token, repoFullName, commitSha)
    GS->>GH: GET /repos/{repo}/commits/{sha} (Accept: diff)
    GH->>GS: Raw diff text
    RW->>AI: reviewCode(diff, repoFullName)
    AI->>RW: { summary, score, issues[] }
    RW->>DB: CREATE Issues (batch insert)
    RW->>DB: UPDATE Review SET status=COMPLETED, score, summary

    Note over EQ,SMTP: Phase 3: Send Notification (async)
    RW->>EQ: enqueueReviewEmail(reviewId)
    EQ->>EW: Job: { reviewId }
    EW->>DB: GET Review + Repository + User
    EW->>SMTP: Send HTML email (score, issues, summary)
    EW->>DB: CREATE Notification (type: EMAIL, status: SENT)
```

### Flow 3: Manual Review Trigger

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant GH as GitHub API
    participant DB as PostgreSQL
    participant Q as Review Queue

    C->>S: POST /api/reviews { repositoryId }
    S->>S: Auth middleware
    S->>DB: Verify repository belongs to user
    S->>GH: GET /repos/{repo}/commits/{branch} (latest commit)
    S->>DB: Check if review already exists for this commit
    alt Already reviewed
        S->>C: 409 Conflict { reviewId }
    else New commit
        S->>DB: CREATE Review (status: PENDING)
        S->>Q: enqueueReview(reviewId)
        S->>C: 202 { reviewId, commitId }
    end
```

### Flow 4: Weekly Digest (Cron-based)

```mermaid
sequenceDiagram
    participant CRON as BullMQ Cron
    participant RPW as Report Worker
    participant DB as PostgreSQL
    participant SMTP as Email

    Note over CRON,SMTP: Every Monday at 9:00 AM
    CRON->>RPW: Job: trigger-all-digests
    RPW->>DB: Find all users with active repos
    loop For each user
        RPW->>RPW: Enqueue "weekly-digest" job
    end

    RPW->>DB: GET reviews from last 7 days
    RPW->>RPW: Calculate stats (totalReviews, avgScore, totalIssues)
    RPW->>RPW: Group by repository
    RPW->>SMTP: Send weekly digest HTML email
```

---

## 8. Layer-by-Layer Breakdown

### 8.1 Entry Point — [index.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/index.ts)

This is where everything comes together:

```
1. Initialize Express app
2. Apply global middleware (cookieParser, cors, helmet)
3. Mount webhook route BEFORE express.json() (needs raw body for HMAC)
4. Mount all other API routes
5. Import workers (starts BullMQ consumers)
6. Register graceful shutdown handlers (SIGINT, SIGTERM)
7. Start HTTP server
```

> [!IMPORTANT]
> The webhook route is mounted **before** `express.json()` because it needs the **raw request body** (Buffer) for HMAC signature verification. This is a critical ordering decision.

### 8.2 Routes Layer

Routes only define **URL → Controller** mappings and apply middleware:

| Route File | Base Path | Auth Required | Endpoints |
|---|---|---|---|
| [auth.route.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/routes/auth.route.ts) | `/api/auth` | Partial | `GET /github`, `GET /github/callback`, `GET /me` ✅, `POST /logout` ✅ |
| [github.route.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/routes/github.route.ts) | `/api/github` | Yes | `GET /repos` ✅ |
| [repository.route.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/routes/repository.route.ts) | `/api/repositories` | Yes | `GET /` ✅, `POST /` ✅ |
| [review.route.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/routes/review.route.ts) | `/api/reviews` | Yes | `GET /` ✅, `GET /:id` ✅, `POST /` ✅ |
| [webhook.route.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/routes/webhook.route.ts) | `/api/webhooks` | No (uses HMAC) | `POST /github` |

### 8.3 Controllers Layer

Controllers handle **HTTP-specific logic**: parsing request data, validation, calling services, and formatting responses. They never contain business logic.

**Pattern used in every controller:**
```typescript
export const handler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1. Check authentication
        // 2. Validate & extract input
        // 3. Call service(s)
        // 4. Send response
    } catch (error) {
        next(error);  // Forward to global error handler
    }
};
```

### 8.4 Services Layer

Services contain **pure business logic** with no knowledge of Express/HTTP:

| Service | Responsibility | Key Methods |
|---|---|---|
| [auth.service.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/services/auth.service.ts) | GitHub OAuth flow + session management | `exchangeCodeForToken()`, `findOrCreateUser()`, `createSession()`, `getCurrentUser()` |
| [github.service.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/services/github.service.ts) | GitHub REST API client | `getUserRepositories()`, `getCommitDiff()`, `getLatestCommit()` |
| [repository.service.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/services/repository.service.ts) | Repository CRUD + webhook setup | `connectRepository()`, `getUserRepositories()` |
| [review.service.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/services/review.service.ts) | Review pipeline orchestrator | `processReview()`, `getReviewsByRepository()`, `getReviewById()` |
| [ai.service.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/services/ai.service.ts) | Gemini AI integration | `reviewCode()` |
| [webhook.service.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/services/webhook.service.ts) | Webhook registration + signature verification | `registerWebhook()`, `removeWebhook()`, `verifySignature()` |
| [email.service.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/services/email.service.ts) | Email sending via Nodemailer | `sendReviewNotification()`, `sendWeeklyDigest()` |

### 8.5 Data Layer

| File | Purpose |
|---|---|
| [DB.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/db/DB.ts) | Singleton Prisma client with PostgreSQL adapter, health check |
| [redis.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/db/redis.ts) | Redis client for session storage (using `redis` package) |

> [!NOTE]
> The queues use a **separate** Redis connection via `ioredis` (required by BullMQ), while sessions use the `redis` package. This is intentional — BullMQ needs `maxRetriesPerRequest: null` which is an ioredis-specific option.

---

## 9. Background Job Processing

### Architecture

```mermaid
graph LR
    subgraph "Queues (Redis-backed)"
        RQ["review-processing"]
        EQ["email-notifications"]
        RPQ["report-generation"]
    end

    subgraph "Workers"
        RW["Review Worker<br/>Concurrency: 3<br/>Retries: 3<br/>Backoff: exponential 5s"]
        EW["Email Worker<br/>Concurrency: 5<br/>Retries: 3<br/>Backoff: exponential 10s"]
        RPW["Report Worker<br/>Concurrency: 2<br/>Retries: 2<br/>Backoff: fixed 30s"]
    end

    RQ --> RW
    EQ --> EW
    RPQ --> RPW
```

### Queue Configuration

| Queue | Worker Concurrency | Retries | Backoff Strategy | Retention |
|---|---|---|---|---|
| `review-processing` | 3 parallel | 3 attempts | Exponential: 5s → 10s → 20s | Keep last 100 completed, 50 failed |
| `email-notifications` | 5 parallel | 3 attempts | Exponential: 10s → 20s → 40s | Keep last 200 completed, 50 failed |
| `report-generation` | 2 parallel | 2 attempts | Fixed: 30s | Keep last 50 completed, 20 failed |

### Why BullMQ?

| Feature | Benefit |
|---|---|
| **Retries with backoff** | If Gemini API is temporarily down, jobs retry automatically |
| **Concurrency control** | Prevents overwhelming external APIs |
| **Job deduplication** | `jobId: review-${reviewId}` prevents duplicate processing |
| **Job retention** | Keep history for debugging without filling Redis |
| **Repeatable jobs** | Weekly digest cron schedule via `repeat.pattern` |

### Job Chaining Pattern

The system uses a **producer-consumer chain**:

```
Webhook Controller → [Review Queue] → Review Worker → [Email Queue] → Email Worker
                                                                          ↓
                                                                      Email sent
```

This is a form of **event-driven architecture** where completing one job triggers the next.

---

## 10. AI Review Pipeline

The AI review pipeline in [ai.service.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/services/ai.service.ts) is the core differentiator:

### How it works:

```
Git Diff → Truncate (30K chars max) → Gemini 2.0 Flash API → Structured JSON → Store in DB
```

### Key Implementation Details:

1. **Structured Output Schema**: A JSON schema is sent to Gemini that **forces** the response into a predictable shape:
   ```json
   { "summary": "...", "score": 0-100, "issues": [{ "type", "severity", "title", "description", "filePath", "lineNumber" }] }
   ```

2. **System Prompt**: The AI is instructed to look for 4 categories:
   - 🐛 **Bugs** — Logic errors, null/undefined issues, race conditions
   - 🔒 **Security** — Injection vulnerabilities, exposed secrets
   - ⚡ **Performance** — Memory leaks, N+1 queries, unnecessary loops
   - 🧹 **Code Smells** — Poor naming, duplicated code, missing error handling

3. **Temperature: 0.3** — Low temperature for consistent, focused analysis (not creative writing)

4. **Diff Truncation**: Diffs larger than 30,000 characters are truncated to stay within token limits

5. **Score Clamping**: The AI score is clamped to 0–100 range as a safety measure

### AI Analysis Categories

| Type | What it catches | Severity Range |
|---|---|---|
| `BUG` | Logic errors, off-by-one, null references | MEDIUM → CRITICAL |
| `SECURITY` | SQL injection, XSS, exposed secrets, insecure patterns | HIGH → CRITICAL |
| `PERFORMANCE` | N+1 queries, memory leaks, inefficient algorithms | LOW → HIGH |
| `CODE_SMELL` | Poor naming, magic numbers, duplicated code, complexity | LOW → MEDIUM |

---

## 11. Email Notification System

### Two types of emails:

#### 1. Review Completion Email
- Triggered automatically when a review finishes
- Contains: quality score (color-coded), commit info, issue count, AI summary, link to full review
- Beautiful HTML template with gradient header, score badge, and CTA button

#### 2. Weekly Digest Email
- Triggered by cron: **Every Monday at 9:00 AM**
- Contains: total reviews, average score, total issues, per-repository breakdown
- Only sent to users who had reviews that week

### Transporter Strategy:
- **Production**: Uses real SMTP credentials (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`)
- **Development**: Auto-creates an [Ethereal](https://ethereal.email) test account — emails are captured and viewable via a preview URL

---

## 12. Security Practices

| Practice | Where | How |
|---|---|---|
| **Webhook HMAC-SHA256 verification** | [webhook.service.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/services/webhook.service.ts) | `createHmac('sha256', secret)` + `timingSafeEqual()` to prevent timing attacks |
| **Signed cookies** | [auth.controller.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/controllers/auth.controller.ts) | `cookie-parser` with `COOKIE_SECRET` — prevents cookie tampering |
| **OAuth state parameter** | [auth.controller.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/controllers/auth.controller.ts) | Random 32-byte hex, stored in signed cookie, validated on callback — prevents CSRF |
| **HttpOnly + Secure cookies** | All cookie operations | Cannot be read by JavaScript; HTTPS-only in production |
| **Helmet.js** | [index.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/index.ts) | Sets security headers (CSP, X-Frame-Options, etc.) |
| **CORS** | [index.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/index.ts) | Whitelisted origins only, credentials enabled |
| **Token stripping** | [validateUser.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/middlewares/validateUser.ts) | `accessToken` and `refreshToken` stripped from `req.user` |
| **Input validation** | All controllers | Type checks on every request body/query parameter |
| **Resource authorization** | [review.controller.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/controllers/review.controller.ts) | Verifies repository belongs to current user before returning data |
| **Raw body for webhooks** | [index.ts](file:///Users/maxff/Desktop/Desktop/my_projects/nodejs_advanced/Code_review/src/index.ts) | `express.raw()` mounted before `express.json()` on webhook route |

---

## 13. API Endpoints Reference

### Authentication
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/auth/github` | ❌ | Redirect to GitHub OAuth |
| `GET` | `/api/auth/github/callback` | ❌ | OAuth callback handler |
| `GET` | `/api/auth/me` | ✅ | Get current user profile |
| `POST` | `/api/auth/logout` | ✅ | Destroy session |

### GitHub
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/github/repos?page=1&limit=10` | ✅ | List user's GitHub repositories |

### Repositories
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/repositories` | ✅ | List connected repositories |
| `POST` | `/api/repositories` | ✅ | Connect a repository + register webhook |

### Reviews
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/reviews?repositoryId=xxx` | ✅ | List reviews for a repository |
| `GET` | `/api/reviews/:id` | ✅ | Get review details with issues |
| `POST` | `/api/reviews` | ✅ | Manually trigger a review |

### Webhooks
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/webhooks/github` | HMAC | Receive GitHub push events |

### Health
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | ❌ | Database health check |

---

## 14. Environment Variables

| Variable | Purpose | Example |
|---|---|---|
| `PORT` | Server port | `4020` |
| `NODE_ENV` | Environment | `development` / `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/codereview` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `COOKIE_SECRET` | Secret for signing cookies | (random 64-char string) |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `CLIENT_URL` | Frontend URL for redirects | `http://localhost:5173` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID | `Ov23li...` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App secret | `gho_...` |
| `GITHUB_CALLBACK_URL` | OAuth redirect URI | `http://localhost:4020/api/auth/github/callback` |
| `GITHUB_WEBHOOK_SECRET` | Shared secret for webhook HMAC | (random string) |
| `WEBHOOK_BASE_URL` | Public URL for webhook endpoint | `https://your-domain.com` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `SMTP_HOST` | Email server host (optional) | `smtp.gmail.com` |
| `SMTP_PORT` | Email server port (optional) | `587` |
| `SMTP_USER` | Email username (optional) | `you@gmail.com` |
| `SMTP_PASS` | Email password (optional) | `app-password` |
| `SMTP_FROM` | Sender address (optional) | `"Code Review AI" <noreply@codereview.ai>` |

---

## 15. Docker & Deployment

### Multi-stage Dockerfile

```
Stage 1 (builder): Install all deps → Compile TypeScript → Produce dist/
Stage 2 (runtime): Install production deps only → Copy dist/ → Run
```

This produces a **smaller production image** without dev dependencies and TypeScript source.

### Docker Compose

```yaml
services:
  redis:       # Redis 7 Alpine — for sessions + BullMQ
  app:         # The application
```

---

## 16. Interview Talking Points

### 🎯 "What does this project do?"

> "It's an AI-powered code review system. When a developer pushes code to GitHub, our server receives a webhook, fetches the commit diff, sends it to Google Gemini AI for analysis, stores the results in PostgreSQL, and notifies the developer via email with a quality score and actionable issues."

### 🎯 "Why did you use BullMQ for background processing?"

> "The webhook from GitHub expects a fast response. We can't make GitHub wait 10-15 seconds while the AI analyzes the code. So we respond with 202 Accepted immediately and process the review asynchronously. BullMQ gives us automatic retries with exponential backoff (if the Gemini API is down), concurrency control (3 parallel reviews), job deduplication, and dead letter queues for failed jobs."

### 🎯 "How do you ensure the webhook is actually from GitHub?"

> "Every webhook payload is signed with HMAC-SHA256 using a shared secret. We verify the signature using `crypto.createHmac()` and `timingSafeEqual()` — the timing-safe comparison prevents attackers from using timing analysis to guess the signature byte by byte."

### 🎯 "Why is the webhook route mounted before express.json()?"

> "The HMAC signature is computed over the raw request body (byte-for-byte). If `express.json()` parses it first, the raw bytes are lost and we can't verify the signature. So we use `express.raw()` specifically on the webhook route to get the body as a Buffer."

### 🎯 "How does the authentication work?"

> "We use GitHub OAuth 2.0 with a state parameter for CSRF protection. The state is a random 32-byte hex string stored in a signed HttpOnly cookie. After the user authorizes on GitHub, we exchange the code for an access token, upsert the user in PostgreSQL, create a session in Redis with a 7-day TTL, and store the session ID in a signed HttpOnly cookie."

### 🎯 "Why Redis for sessions instead of JWTs?"

> "Server-side sessions in Redis give us instant session revocation — when a user logs out, we delete the session from Redis and it's immediately invalidated. With JWTs, you can't revoke them until they expire. Redis also lets us store minimal data in the cookie (just a random ID) while keeping the session data server-side."

### 🎯 "How does the Gemini AI integration work?"

> "We use Gemini 2.0 Flash with structured JSON output. Instead of asking the AI to return free-form text that we'd have to parse, we send a JSON schema that forces the response into a predictable shape: summary, score (0-100), and an array of issues with type, severity, title, description, file path, and line number. This eliminates parsing errors entirely."

### 🎯 "What's the review status state machine?"

> ```
> PENDING → PROCESSING → COMPLETED (happy path)
>       ↘                ↗
>        → PROCESSING → FAILED (error path)
> ```
> "A review starts as PENDING when created, moves to PROCESSING when the worker picks it up, and ends as COMPLETED or FAILED. The worker also skips reviews that aren't PENDING (idempotency guard), so even if a duplicate job fires, it won't reprocess."

### 🎯 "How does the layered architecture help?"

> "Each layer has exactly one job. Routes map URLs. Middleware handles cross-cutting concerns like auth. Controllers handle HTTP (parsing, validation, response formatting). Services contain pure business logic with no knowledge of Express. This means I can test services independently, swap the HTTP framework without touching business logic, and every developer knows exactly where to find specific code."

### 🎯 "What happens if the Gemini API is temporarily down?"

> "The BullMQ review queue is configured with 3 retry attempts and exponential backoff (5s, 10s, 20s). If all retries fail, the review is marked as FAILED in the database, and the job moves to the failed jobs list where we can inspect or replay it. The system is self-healing — it doesn't need manual intervention for transient failures."

### 🎯 "How do you handle the weekly digest?"

> "The report worker registers a BullMQ repeatable job with a cron pattern `0 9 * * 1` (Monday 9 AM). When it fires, it queries all users with active repos, then enqueues individual digest jobs for each user. Each digest job calculates stats (total reviews, avg score, issues) from the last 7 days, groups them by repository, and sends a beautifully formatted HTML email."

### 🎯 "What design patterns are you using?"

> - **Singleton** — Database connection (`DbConnection.getConn()`) and Redis client
> - **Service Layer** — Business logic separated from HTTP layer
> - **Repository Pattern** — Prisma abstracts database operations
> - **Producer-Consumer** — Webhook produces review jobs, worker consumes them
> - **Job Chaining** — Review worker produces email jobs after completion
> - **Strategy Pattern** — Email service switches between SMTP and Ethereal based on environment
> - **Middleware Pattern** — Express middleware for authentication
> - **State Machine** — Review status transitions (PENDING → PROCESSING → COMPLETED/FAILED)

---

> [!TIP]
> **When explaining in an interview**, walk through the **webhook flow** end-to-end. It demonstrates your understanding of: webhooks, security (HMAC), async processing (BullMQ), external API integration (GitHub + Gemini), database design (Prisma), and notification systems (email). It touches every layer of the stack in a single coherent story.
