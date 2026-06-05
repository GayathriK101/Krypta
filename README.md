<!-- This file provides an overview of Krypta and exact commands to set up, configure, and run the backend. -->
# Krypta

Tired of leaking .env files? Krypta is a multi-tenant secret manager built with a zero-trust architecture. It secures team configurations using application-layer encryption ($AES\text{-}256\text{-}GCM$), granular RBAC workspace isolation, and an immutable audit log to stop credential exposure.

This repository contains the backend codebase for **Phase 1: Working Backend Foundation**.

---

## Technical Stack
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy 2.0
- **Database Migrations**: Alembic
- **Security**: JWT Authentication, Bcrypt password hashing

---

## Getting Started

### 1. Clone & Navigate to Backend
Make sure you are in the `backend` directory:
```bash
cd backend
```

### 2. Create and Activate Virtual Environment
Use Python 3.11 to create and activate the virtual environment:
```powershell
# Create the virtual environment
py -3.11 -m venv venv

# Activate on Windows (PowerShell)
.\venv\Scripts\Activate.ps1
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Database Setup
Ensure PostgreSQL is running locally on port `5432`.
Create the `krypta` database in your PostgreSQL instance:
```sql
CREATE DATABASE krypta;
```

### 5. Configuration (.env)
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Edit the `.env` file to configure your local PostgreSQL credentials:
```ini
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/krypta
SECRET_KEY=supersecretkeychangeinproduction1234567890!
ALGORITHM=HS256
```

### 6. Run Migrations
Run the Alembic migrations to construct the database schema:
```bash
python -m alembic upgrade head
```

### 7. Run the Application Server
Start the local FastAPI development server:
```bash
python -m uvicorn app.main:app --reload
```
The server will start on `http://127.0.0.1:8000`.

---

## Verification & API Endpoints

Once the server is running, navigate to `http://127.0.0.1:8000/docs` in your browser to access the interactive Swagger UI.

### Core Endpoints

1. **User Authentication**:
   - `POST /api/v1/auth/register` - Registers a new user.
   - `POST /api/v1/auth/login` - Authenticates user credentials and returns a JWT token.

2. **Workspaces**:
   - `POST /api/v1/workspaces` - Creates a new workspace and automatically adds the creator as the `admin` member.
   - `GET /api/v1/workspaces` - Lists all workspaces the authenticated user belongs to.

3. **Secrets**:
   - `POST /api/v1/workspaces/{workspace_id}/secrets` - Creates or updates a secret key-value pair in a specific workspace, increments the version number, and creates an audit log entry.
   - `GET /api/v1/workspaces/{workspace_id}/secrets` - Retrieves active secrets inside a workspace (verifies workspace membership).
