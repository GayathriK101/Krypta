# 🔐 Krypta

<div align="center">

**A production-grade secret management platform for modern development teams**

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square)]()

</div>

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔍 About

Krypta is a full-stack, production-grade secret management platform built to solve one of the most persistent problems in software development: teams storing sensitive credentials — API keys, database passwords, OAuth tokens — in `.env` files committed to version control, shared via Slack, or pasted into spreadsheets. Krypta provides a centralized, encrypted, access-controlled vault for all environment secrets, with a complete audit trail of every access event.

Unlike basic environment variable tools, Krypta implements **application-layer AES-256-GCM encryption**, meaning secrets are encrypted before they ever touch the database. Even with direct database access, an attacker cannot read a single secret without the master encryption key. Combined with granular Role-Based Access Control and an immutable audit trail, Krypta brings enterprise-grade secret hygiene to teams of any size.

Krypta sits in the same category as **HashiCorp Vault**, **AWS Secrets Manager**, and **Doppler** — but is fully self-hosted, open-source, and built from the ground up as a learning-to-production engineering project. Unlike Vault (complex infrastructure, steep learning curve) or AWS Secrets Manager (vendor lock-in, per-secret pricing), Krypta is a single deployable stack that runs anywhere PostgreSQL runs, with no external dependencies.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔒 **AES-256-GCM Encryption** | Every secret value is encrypted at the application layer before database writes. Each encryption uses a cryptographically random 12-byte nonce — making ciphertext unique even for identical values. The 16-byte GCM authentication tag detects any tampering. |
| 🏢 **Multi-Tenant Workspaces** | Full workspace isolation — each team gets an isolated environment. Users only see workspaces they are explicit members of. Enforced at the SQL query level, not the UI level. |
| 👥 **Granular RBAC** | Three roles — **Admin**, **Developer**, **Intern** — each with distinct permission boundaries. Permissions are enforced at the **API middleware level** via FastAPI dependency injection, not just hidden in the UI. A direct API call from an intern still gets a 403. |
| 📋 **Immutable Audit Trails** | Every action — creates, updates, views, and blocked access attempts — is permanently recorded. No DELETE or UPDATE path exists for audit logs. Search by user or secret key, filter by action type, export to CSV. |
| 🔢 **Secret Versioning** | Updating a secret increments its version counter (v1 → v2 → v3). The version number and last-modified-by user are tracked on every row. |
| 🌍 **Environment Separation** | Secrets are scoped to `development`, `testing`, or `production`. Interns are restricted to `development` only — at the database query level. Admins and developers have full access. |
| 💻 **In-Browser CLI Terminal** | A fully functional terminal emulator running in the browser. Supports `secrets`, `get`, `set`, `delete`, `whoami`, `help`, and `clear` commands with `--env` flags. RBAC and encryption apply to every CLI command through the real API. Features command history (arrow keys) and delete confirmation prompts. |
| 👁️ **Smart Value Masking** | Secret values are displayed as `••••••••` by default. Clicking the eye icon calls a dedicated `/reveal` endpoint (which writes a `SECRET_VIEW` audit log entry), shows the value, and auto-hides it after **30 seconds**. |
| 👤 **Members Management** | Admins can add team members by email, assign roles, promote/demote roles, and remove members. Self-removal and self-demotion are blocked to prevent accidental admin lockout. |
| 📡 **Live Audit Feed** | A real-time activity strip at the bottom of every secrets page showing the 5 most recent audit events, color-coded by type (green for writes, red for blocked attempts). Auto-refreshes every 30 seconds. |

---

## 🛠 Tech Stack

### Backend

| Technology | Purpose | Why chosen over alternatives |
|---|---|---|
| **Python 3.11** | Primary backend language | Battle-tested crypto libraries (`cryptography`, `passlib`), readable syntax, mature ecosystem |
| **FastAPI** | Web framework & REST API | Auto-generates Swagger docs, native Pydantic validation, dependency injection for clean RBAC, async-first vs Django's WSGI blocking model |
| **PostgreSQL 17** | Primary relational database | Full ACID compliance, native UUID and enum types, foreign key integrity — MongoDB's schemaless nature is a liability for strict relational secret data |
| **SQLAlchemy 2.0** | ORM & query builder | Automatic SQL injection prevention, database-agnostic, relationship navigation without manual JOINs, mature connection pooling |
| **Alembic** | Database migration manager | Versioned schema changes with rollback support — prevents schema drift between dev and production environments |
| **JWT (python-jose)** | Stateless authentication | No server-side session storage needed — tokens are self-contained and verifiable. Horizontally scalable by design vs cookie sessions |
| **bcrypt (passlib)** | Password hashing | Intentionally slow, built-in salt, cost factor adjustable as hardware improves — MD5/SHA256 are too fast for password storage |
| **AES-256-GCM** | Secret value encryption | 256-bit key (vs AES-128), GCM mode provides authenticated encryption — detects tampering unlike CBC/ECB. RSA is too slow for bulk data |
| **Pydantic v2** | Data validation & serialization | Zero-boilerplate validation with type hints, automatic OpenAPI schema generation, alias mapping between DB column names and API field names |

### Frontend

| Technology | Purpose | Why chosen over alternatives |
|---|---|---|
| **Next.js 14** | React framework | File-based routing, built-in layouts, TypeScript-first, no React Router configuration — dashboard/layout.tsx wraps all dashboard pages automatically |
| **React 19** | UI component model | Industry standard, hooks-based state management, component reusability |
| **Tailwind CSS** | Utility-first styling | No CSS naming conventions needed, consistent spacing/color system, zero unused CSS in production, self-documenting class names |
| **shadcn/ui** | UI component library | Unstyled-first, fully customizable to Krypta's dark theme, no runtime CSS-in-JS overhead |
| **Zustand** | Global auth state management | Zero boilerplate vs Redux's actions/reducers/providers. Works outside React components (in api.ts). Context API causes unnecessary re-renders |
| **Axios** | HTTP client | Request interceptors allow single-point JWT injection for all API calls. Throws on HTTP errors (unlike `fetch()`), automatic JSON parsing |
| **React Hot Toast** | Notifications | Lightweight, themeable to dark UI, simple API, no provider setup required |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────┐
│            FRONTEND LAYER               │
│    Next.js 14 + React + Tailwind        │
│                                         │
│  Dashboard  AuditLog  Members  CLI      │
└─────────────────┬───────────────────────┘
                  │ HTTPS REST API
                  │ JWT Bearer Token
┌─────────────────▼───────────────────────┐
│            BACKEND LAYER                │
│           Python + FastAPI              │
│                                         │
│  Auth Guard → RBAC Check → Handler      │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │     AES-256-GCM Crypto Layer      │  │
│  │  encrypt_value() ↔ decrypt_value()│  │
│  └───────────────────────────────────┘  │
└─────────────────┬───────────────────────┘
                  │ SQLAlchemy ORM
┌─────────────────▼───────────────────────┐
│           DATABASE LAYER                │
│             PostgreSQL                  │
│                                         │
│  users  workspaces  workspace_members   │
│  secrets  audit_logs                    │
└─────────────────────────────────────────┘
```

**Request lifecycle:** Every authenticated request flows through FastAPI's dependency injection chain — `OAuth2PasswordBearer` extracts the JWT → `get_current_user()` verifies and decodes it → `require_role()` or `get_user_role()` checks workspace membership and role — before any handler logic runs. Encryption/decryption wraps every secret read and write at the `crypto.py` layer.

---

## 🚀 Getting Started

### Prerequisites

- [Python 3.11+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 17](https://www.postgresql.org/download/)
- [Git](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/GayathriK101/krypta.git
cd krypta
```

### 2. Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Create a Python 3.11 virtual environment
py -3.11 -m venv venv

# Activate the virtual environment (Windows PowerShell)
venv\Scripts\Activate.ps1

# Install all dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env
```

Open `.env` and fill in your values:

```ini
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/krypta

# JWT signing secret — use a long random string in production
SECRET_KEY=your-super-secret-key-minimum-32-chars

# JWT signing algorithm (do not change)
ALGORITHM=HS256

# JWT token lifetime in minutes
ACCESS_TOKEN_EXPIRE_MINUTES=60

# AES-256-GCM master encryption key (32 bytes, base64-encoded)
# Generate with the command below:
MASTER_ENCRYPTION_KEY=your-generated-key-here
```

**Generate a secure `MASTER_ENCRYPTION_KEY`:**

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

> ⚠️ **Critical:** Never commit `.env` to version control. The `MASTER_ENCRYPTION_KEY` is the single point of trust for all encrypted secrets — losing it makes all stored secrets permanently unrecoverable.

### 4. Database Setup

Ensure PostgreSQL is running, then create the database:

```sql
CREATE DATABASE krypta;
```

Run Alembic migrations to create all tables:

```bash
python -m alembic upgrade head
```

### 5. Start the Backend Server

```bash
python -m uvicorn app.main:app --reload
```

The API will be live at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### 6. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be live at `http://localhost:3000`.

---

## 📖 Usage

### First-Time Setup Flow

```
1. Open http://localhost:3000/register
   → Create your admin account

2. Log in → You land on the Workspaces dashboard

3. Click "New Workspace"
   → You are automatically added as Admin

4. Click your workspace → Members → Add Member
   → Enter a teammate's email and assign their role

5. Navigate to Secrets tab
   → Select environment (development / testing / production)
   → Click "Add Secret" to store your first credential
```

### Role-Based Access At A Glance

| Capability | Admin | Developer | Intern |
|---|---|---|---|
| View development secrets | ✅ | ✅ | ✅ |
| View testing secrets | ✅ | ✅ | ❌ |
| View production secrets | ✅ | ✅ | ❌ |
| Create / update secrets | ✅ | ✅ | ❌ |
| Reveal secret values | ✅ | ✅ | ✅ (dev only) |
| Add / manage members | ✅ | ❌ | ❌ |
| View full audit log | ✅ | ❌ | ❌ |
| Delete secrets | ✅ | ❌ | ❌ |
| Export audit log CSV | ✅ | ❌ | ❌ |

### In-Browser CLI Terminal

Navigate to any workspace → **CLI** tab in the sidebar. Type `help` to see all commands.

```bash
# List all commands and flags
help

# Show your identity and current workspace
whoami

# List all secrets in an environment
secrets --env development
secrets --env production

# Reveal a specific secret value (writes SECRET_VIEW audit log)
get STRIPE_API_KEY --env production
get DATABASE_URL --env development

# Create or update a secret
set NEW_API_KEY "your-value-here" --env development
set DATABASE_URL "postgresql://..." --env production

# Delete a secret (admin only, requires confirmation)
delete OLD_KEY --env development

# Clear the terminal output
clear
```

> 💡 If `--env` is omitted, commands default to `development`. RBAC rules apply to every CLI command — interns cannot `get` or `set` production secrets even via the terminal.

---

## 📡 API Documentation

Full interactive documentation with request/response schemas is available at [`http://localhost:8000/docs`](http://localhost:8000/docs) (Swagger UI) and [`http://localhost:8000/redoc`](http://localhost:8000/redoc) (ReDoc) when the server is running.

### Key Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new user account | ❌ |
| `POST` | `/api/v1/auth/login` | Login and receive a JWT access token | ❌ |
| `GET` | `/api/v1/workspaces` | List all workspaces the current user belongs to | ✅ |
| `POST` | `/api/v1/workspaces` | Create a new workspace (creator auto-assigned as Admin) | ✅ |
| `GET` | `/api/v1/workspaces/{id}/secrets` | List active secrets (filtered by role and environment) | ✅ |
| `POST` | `/api/v1/workspaces/{id}/secrets` | Create or update a secret (Admin/Developer only) | ✅ |
| `GET` | `/api/v1/workspaces/{id}/secrets/{secret_id}/reveal` | Reveal a decrypted secret value (writes audit log) | ✅ |
| `POST` | `/api/v1/workspaces/{id}/members` | Add a user to the workspace by email (Admin only) | ✅ |
| `PATCH` | `/api/v1/workspaces/{id}/members/{user_id}` | Update a member's role (Admin only) | ✅ |
| `DELETE` | `/api/v1/workspaces/{id}/members/{user_id}` | Remove a member from the workspace (Admin only) | ✅ |
| `GET` | `/api/v1/workspaces/{id}/audit-logs` | Full audit log with user details (Admin only) | ✅ |
| `GET` | `/api/v1/workspaces/{id}/audit-logs/recent` | Last 5 audit events without user details (all members) | ✅ |

All authenticated endpoints require the header:
```
Authorization: Bearer <access_token>
```

---

## 🔒 Security

### Encryption

- All secret values are encrypted using **AES-256-GCM** before any database write
- A cryptographically secure **random 12-byte nonce** is generated for every single encryption call — identical plaintext produces different ciphertext each time
- The **16-byte GCM authentication tag** is stored alongside the ciphertext — any tampering with the stored bytes causes decryption to fail with an integrity error
- The **master encryption key** exists only in the server environment (`.env`) — it is never stored in the database or transmitted to the client
- Format stored: `base64( nonce[12 bytes] + ciphertext[N bytes] + auth_tag[16 bytes] )`

### Authentication

- Passwords are hashed using **bcrypt** with cost factor 12 — computationally expensive by design, making brute-force attacks impractical
- Login issues a signed **JWT** with a 60-minute expiry containing only the user's email as the subject claim
- The server is **completely stateless** — no sessions, no server-side token storage. Any server instance can verify any token independently
- Changing the `SECRET_KEY` environment variable instantly invalidates all existing tokens

### Authorization

- RBAC is enforced at the **API middleware level** via FastAPI's dependency injection — `Depends(require_role(["admin"]))` is declared in the route signature, not the handler body
- UI-level restrictions (hidden buttons, missing nav items) are **cosmetic only** — the API is the source of truth
- Intern environment access restriction is hard-coded in the `check_environment_access()` function and applied in every relevant endpoint and CLI command handler
- Workspace isolation is enforced by a SQL JOIN on `workspace_members` — there is no endpoint that returns data across workspace boundaries

### Audit Logging

- The `audit_logs` table is **append-only** at the application level — no `DELETE` or `UPDATE` endpoint exists for it in the entire codebase
- All timestamps are **server-side** — clients cannot influence when events are recorded
- Blocked access attempts are logged with action `BLOCKED_ACCESS` before the 403 is returned — you always know when someone tried to access something they shouldn't
- `SECRET_VIEW` is only written when a user explicitly clicks reveal (calls `/reveal`), not on page load — making the audit log intentional and precise

---

## 📁 Project Structure

```
krypta/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app init, CORS config, router registration
│   │   ├── database.py          # SQLAlchemy engine, session factory, get_db dependency
│   │   ├── models.py            # ORM models: User, Workspace, WorkspaceMember, Secret, AuditLog
│   │   ├── schemas.py           # Pydantic validation schemas for all request/response bodies
│   │   ├── auth.py              # bcrypt hashing, JWT creation/verification, get_current_user
│   │   ├── crypto.py            # AES-256-GCM encrypt_value() and decrypt_value()
│   │   ├── rbac.py              # get_user_role(), require_role() factory, check_environment_access()
│   │   └── routers/
│   │       ├── users.py         # POST /auth/register, POST /auth/login
│   │       ├── workspaces.py    # Workspace CRUD, member management, audit log endpoints
│   │       └── secrets.py       # Secret create/update/list/reveal, write_audit_log() helper
│   ├── alembic/
│   │   ├── env.py               # Alembic migration environment, imports models for autogenerate
│   │   └── versions/            # Versioned migration scripts (auto-generated)
│   ├── .env.example             # Environment variable template
│   ├── alembic.ini              # Alembic configuration file
│   └── requirements.txt         # All Python dependencies with pinned versions
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx           # Root layout: fonts, global styles, Toaster notification system
│   │   ├── page.tsx             # Root redirect to /dashboard
│   │   ├── globals.css          # Global CSS, Tailwind base, custom tokens
│   │   ├── login/
│   │   │   └── page.tsx         # Login form: JWT fetch, role resolution, Zustand auth init
│   │   ├── register/
│   │   │   └── page.tsx         # Registration form with email/password validation
│   │   └── dashboard/
│   │       ├── layout.tsx       # Dashboard shell: auth guard, Sidebar layout wrapper
│   │       ├── page.tsx         # Workspace list with live secret/member count cards
│   │       └── workspace/[id]/
│   │           ├── page.tsx     # Secrets dashboard: env tabs, secrets table, audit strip
│   │           ├── audit/
│   │           │   └── page.tsx # Full audit log: search, filter, CSV export (Admin only)
│   │           ├── members/
│   │           │   └── page.tsx # Member list: add, role update, remove (Admin only)
│   │           └── cli/
│   │               └── page.tsx # In-browser terminal emulator with RBAC-enforced commands
│   ├── components/
│   │   ├── sidebar.tsx          # Fixed navigation: workspace list, role badge, logout
│   │   ├── secret-row.tsx       # Table row: value masking, eye-reveal with 30s auto-hide, copy
│   │   ├── audit-log-strip.tsx  # Bottom live feed: 5 recent events, 30s auto-refresh
│   │   ├── audit-log-table.tsx  # Full audit log table with color-coded action badges
│   │   ├── add-secret-modal.tsx # Modal form to create a new secret
│   │   ├── add-member-modal.tsx # Modal form to add a member by email + role
│   │   ├── members-table.tsx    # Member list table with inline role update and remove
│   │   └── environment-tabs.tsx # Dev / Testing / Production tab selector
│   ├── lib/
│   │   ├── api.ts               # Axios instance with JWT interceptor, all API call functions
│   │   └── store.ts             # Zustand auth store: token, email, role + localStorage sync
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces for all API data models
│   └── next.config.ts           # Next.js configuration
│
└── README.md
```

---

## 🗄 Database Schema

### Tables

#### `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, default `uuid4` | Unique user identifier |
| `email` | `VARCHAR` | UNIQUE, NOT NULL, INDEX | Login credential |
| `password_hash` | `VARCHAR` | NOT NULL | bcrypt hash — never plain text |
| `created_at` | `TIMESTAMP` | NOT NULL, default now | Account creation time |

#### `workspaces`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, default `uuid4` | Unique workspace identifier |
| `name` | `VARCHAR` | NOT NULL | Human-readable workspace name |
| `created_by` | `UUID` | FK → users.id, CASCADE | Workspace owner reference |
| `created_at` | `TIMESTAMP` | NOT NULL, default now | Creation timestamp |

#### `workspace_members`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, default `uuid4` | Unique membership identifier |
| `workspace_id` | `UUID` | FK → workspaces.id, CASCADE | Target workspace |
| `user_id` | `UUID` | FK → users.id, CASCADE | Member user |
| `role` | `ENUM` | NOT NULL | `admin` \| `developer` \| `intern` |
| `created_at` | `TIMESTAMP` | nullable | When the user joined the workspace |

#### `secrets`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, default `uuid4` | Unique secret identifier |
| `workspace_id` | `UUID` | FK → workspaces.id, CASCADE | Owning workspace |
| `environment` | `ENUM` | NOT NULL | `development` \| `testing` \| `production` |
| `secret_key` | `VARCHAR` | NOT NULL | e.g. `DATABASE_URL`, `STRIPE_API_KEY` |
| `secret_value_encrypted` | `VARCHAR` | NOT NULL | AES-256-GCM ciphertext (base64) |
| `version` | `INTEGER` | NOT NULL, default 1 | Increments on each update |
| `is_active` | `BOOLEAN` | NOT NULL, default true | Soft-delete flag |
| `updated_by` | `UUID` | FK → users.id, SET NULL | Last modifier |
| `updated_at` | `TIMESTAMP` | NOT NULL, auto-update | Last modification time |

#### `audit_logs`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, default `uuid4` | Unique log entry identifier |
| `workspace_id` | `UUID` | FK → workspaces.id, CASCADE | Workspace context |
| `user_id` | `UUID` | FK → users.id, SET NULL, nullable | Actor (null for system events) |
| `action` | `VARCHAR` | NOT NULL | `SECRET_CREATE` \| `SECRET_UPDATE` \| `SECRET_VIEW` \| `BLOCKED_ACCESS` |
| `target_key` | `VARCHAR` | NOT NULL | Secret key that was acted upon |
| `timestamp` | `TIMESTAMP` | NOT NULL, default now | Server-side event time |

> **No UPDATE or DELETE paths exist for `audit_logs`.** The table is append-only by application design.

### Entity Relationships

```
┌─────────────┐       ┌──────────────────────┐       ┌─────────────┐
│    USERS    │       │  WORKSPACE_MEMBERS   │       │ WORKSPACES  │
│─────────────│ 1   N │──────────────────────│ N   1 │─────────────│
│ id (PK)     │───────│ id (PK)              │───────│ id (PK)     │
│ email       │       │ workspace_id (FK)    │       │ name        │
│ password_   │       │ user_id (FK)         │       │ created_by  │──┐
│   hash      │       │ role (enum)          │       │ created_at  │  │
│ created_at  │       │ created_at           │       └──────┬──────┘  │
└──────┬──────┘       └──────────────────────┘              │         │
       │                                                     │ 1       │
       │ 1                                              N ┌──▼──────┐  │
       └──────────────────────────────────────────────────│ SECRETS │  │
                                                          │─────────│  │
       ┌──────────────────────────────────────────────────│ id (PK) │  │
       │                                             1    │workspace│  │
       │ N                                               │  _id FK │  │
┌──────▼──────┐                                          │environ- │  │
│ AUDIT_LOGS  │                                          │  ment   │  │
│─────────────│                                          │secret_  │  │
│ id (PK)     │                                          │  key    │  │
│ workspace_id│                                          │secret_  │  │
│   (FK)      │                                          │  value_ │  │
│ user_id (FK)│                                          │  enc    │  │
│ action      │                                          │version  │  │
│ target_key  │                                          │is_active│  │
│ timestamp   │                                          │updated_ │  │
│  ← READ     │                                          │  by (FK)│──┘
│  ONLY       │                                          └─────────┘
└─────────────┘
```

**Why UUIDs instead of integer IDs?**
Integer IDs are sequential and guessable — an attacker can enumerate all workspace IDs: `1, 2, 3, ...`. UUIDs (`a7f3c91b-4d2e-...`) have ~5 × 10³⁶ possible values, making enumeration computationally infeasible. This is especially important for workspace and secret IDs that appear in URLs.

---

## 🗺 Roadmap

### ✅ Completed

- [x] Multi-tenant workspaces with isolation
- [x] AES-256-GCM application-layer encryption
- [x] JWT authentication + bcrypt password hashing
- [x] Granular RBAC (Admin / Developer / Intern)
- [x] Immutable audit trails with server-side timestamps
- [x] Secret versioning (v1 → v2 → v3)
- [x] Environment separation (development / testing / production)
- [x] Dark mode professional UI
- [x] In-browser CLI terminal with RBAC enforcement
- [x] Members management (add, update role, remove)
- [x] Live audit feed with 30-second refresh
- [x] Full audit log with search, filter, and CSV export
- [x] Smart value masking with 30-second auto-hide

### 🔮 Planned

- [ ] Secret expiry dates with rotation alerts
- [ ] Email notifications on BLOCKED_ACCESS events
- [ ] Two-factor authentication (TOTP)
- [ ] Secret sharing via time-limited, single-use links
- [ ] Docker + Docker Compose deployment package
- [ ] Fine-grained developer permissions (per-secret ACL)
- [ ] Programmatic SDK for CI/CD pipeline injection
- [ ] Secret version history with rollback to any previous value
- [ ] Refresh token rotation for persistent sessions
- [ ] KMS envelope encryption (AWS KMS / GCP KMS integration)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create a branch** using the naming convention:
   - `feature/your-feature-name` — for new features
   - `fix/issue-description` — for bug fixes
   - `docs/what-you-updated` — for documentation changes
3. **Commit** your changes with a clear, descriptive message
4. **Push** to your fork
5. **Open a Pull Request** against the `main` branch with a description of what you changed and why

Please ensure:
- All new endpoints have Pydantic request/response schemas
- Security-sensitive changes (auth, crypto, RBAC) include a brief justification in the PR
- Any new API endpoints are documented in this README

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<div align="center">

Built with 🔐 by **Gayathri K**

[![GitHub](https://img.shields.io/badge/GitHub-GayathriK101-181717?style=flat-square&logo=github)](https://github.com/GayathriK101)

</div>
