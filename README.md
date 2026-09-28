# REVY Company Platform — Breakfast Management System

A production-ready, full-stack internal **Breakfast Management System** built with **React**, **Node.js + Express**, and **MongoDB**.

Designed as an enterprise platform module sharing a unified MongoDB database, RBAC authorization matrix, user accounts, timezone engine (Asia/Kolkata), and audit trail framework.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, React Router v6, Lucide Icons, Axios, Vite
- **Backend**: Node.js, Express.js, Mongoose, JWT, BcryptJS, Helmet, CORS
- **Database**: MongoDB (Shared platform collections + Breakfast module collections)
- **API Documentation**: OpenAPI / Swagger UI (`/api/docs`)
- **Testing & Tooling**: Jest, Supertest

---

## 📋 Production Security & Authentication Rules

1. **Username + Password Login**:
   - Authentication uses **Username** (normalized lowercase) and **Password**.
   - Employee ID is used purely as an internal corporate identifier, NOT for login credentials.
   - Database enforces a unique index on `employees.username`.

2. **Seeded Account Initial Passwords**:
   - Initial accounts receive a predictable default password pattern: `<USER_NAME> + 123` (e.g. `Vasudev123`, `Faiz123`, `Rajneesh123`, `Jyoti123`, `Finance123`).
   - All passwords are immediately hashed with `bcryptjs` (salt factor 10) before MongoDB insertion.
   - Plaintext passwords are **NEVER** stored or logged anywhere.

3. **First-Login Password Enforcement (`forcePasswordChange`)**:
   - Seeded initial accounts and accounts reset by IT Admin are flagged with `forcePasswordChange: true`.
   - On first successful login, the application prompts the user with a mandatory password change screen before granting access.
   - Once updated, `forcePasswordChange` becomes `false`.

4. **Role Selection (Top-Right Header)**:
   - Placed in top-right corner of application header: `[ Notifications ] [ Role: Active Role Selector ▼ ] [ User Profile ▼ ]`.
   - Appears only when a user holds multiple active roles. Single-role users see their active role badge.
   - Switching roles updates session context, recalculates navigation, and sends `X-Role-Used` header without logging out the user or permanently altering assigned roles.

5. **Production Error Handling & Logging**:
   - Error messages returned to clients are production-safe (`"Unable to process the request."`). Internal stack traces and DB details are never exposed to clients.
   - Backend logs operational events, login success/failure, authorization blocks, and financial ledger adjustments while strictly excluding passwords, tokens, or JWT secrets.

---

## 🗄️ Production Fresh Seed & Financial Ledger Rules

- **Clean Seed State**:
  - `breakfast_money_transactions`: **0 records**
  - `breakfast_daily_entries`: **0 records**
  - `breakfast_additional_orders`: **0 records**
  - `breakfast_orders`: **0 records**
- **Fresh Ledger Balances**:
  - `TOTAL RECEIVED` = **₹0**
  - `TOTAL SPENT` = **₹0**
  - `CURRENT BALANCE` = **₹0**
- **Maximum Current Balance Configuration**:
  - Default operating cash threshold: **₹2,500** (Controlled by Finance Manager).
  - Current Balance is calculated from real ledger transactions: `Verified Money Received - Valid Expenses + Valid Adjustments/Reversals`.

---

## 📅 Calendar & Working Day Rules

1. **Sundays**: Automatically marked as non-working days. No employee leave submission required.
2. **Public Holidays**: Configured via Public Holidays collection. Automatically marked as non-working days.
3. **Month-Wise Working Days Calculation**:
   - Formula: `Calendar Days - Sundays - Public Holidays = Applicable Working/Breakfast Days`
   - Calculated independently for every month/year selection.

---

## 🚀 Quick Start & Installation

### 1. Environment Configuration

Create `.env` in `backend/.env` (refer to `.env.example`):

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://127.0.0.1:27017/company_platform
JWT_SECRET=super_secret_jwt_key_breakfast_2026_xyz
JWT_EXPIRES_IN=24h
CLIENT_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

### 2. Database Seeding

Run the production seed script:

```bash
cd backend
npm run seed
```

Initial Production Accounts Created:
- **Vasudev Kava (`vasudev`)**: `IT_ADMIN`, `BREAKFAST_ADMIN`, `EMPLOYEE`
- **Faiz Saiyad (`faiz`)**: `BREAKFAST_ADMIN`, `EMPLOYEE`
- **Rajneesh Prasad (`rajneesh`)**: `CEO`, `EMPLOYEE`
- **Jyoti Dutta (`jyoti`)**: `EMPLOYEE`
- **Hritika (`hritika`)**: `EMPLOYEE`
- **Nisha (`nisha`)**: `EMPLOYEE`
- **Himani (`himani`)**: `EMPLOYEE`
- **Shahil (`shahil`)**: `EMPLOYEE`
- **Finance Manager (`finance.manager`)**: `FINANCE_MANAGER`, `EMPLOYEE`

> Note: Initial passwords follow `<FIRST_NAME> + 123` (e.g. `Vasudev123`, `Faiz123`). Password change is forced upon first login.

### 3. Build & Run

```bash
# Frontend build test
cd frontend
npm run build

# Backend start
cd ../backend
npm start
```

- **Frontend Application**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **OpenAPI / Swagger Docs**: `http://localhost:5000/api/docs`

---

## 🔐 Roles & Permission Matrix Summary

| Role | Purpose | Key Permissions | Employee CRUD Access |
| :--- | :--- | :--- | :--- |
| **IT_ADMIN** | System infrastructure, users, audit, settings | Full access (`*`) | **YES** |
| **CEO** | Executive analytics & management | `breakfast.dashboard.view`, `breakfast.report`, `breakfast.employee.*` | **YES** |
| **BREAKFAST_ADMIN** | Operational daily entries, additional orders, money ledger | `breakfast.view`, `breakfast.manage`, `breakfast.money.*`, `breakfast.employee.read` | **NO** (Read-Only) |
| **FINANCE_MANAGER** | Finance fund approvals, money provisions, financial reporting | `finance.breakfast_fund.*`, `breakfast.money.view`, `breakfast.money.report` | **NO** |
| **EMPLOYEE** | Personal daily breakfast form | `breakfast.view_own`, `breakfast.submit`, `breakfast.history_own` | **NO** |

---

## ✅ Production Acceptance Criteria Completed

- [x] Login page has zero test user cards, demo credentials, or hardcoded passwords
- [x] Username + Password login enforcement (Employee ID not used for login)
- [x] Show/hide password control on login page
- [x] Role selector in top-right header for multi-role users (`[ Notifications ] [ Role: ... ▼ ] [ Profile ▼ ]`)
- [x] Initial passwords follow `<USER_NAME> + 123` hashed with bcrypt
- [x] `forcePasswordChange: true` flow implemented for first-time logins
- [x] Debugging code, `console.log` dev dumps, and temporary test routes removed
- [x] Production error handling (safe API JSON output, hidden stack traces)
- [x] Fresh DB starts with 0 financial transactions (Balance = ₹0, Received = ₹0, Spent = ₹0)
- [x] Maximum Current Balance threshold configured at ₹2,500
- [x] Breakfast Money summary cards displaying ONLY: Current Balance, Total Received, Total Spent
- [x] Unified All Orders page (`/admin/orders`) combining Daily Entry and Additional Orders
- [x] Sunday and Public Holiday automatic non-working day calendar logic
- [x] Month-wise working days calculation formula (`Calendar Days - Sundays - Public Holidays`)
- [x] Breakfast Admin role strictly restricted from Employee CRUD, Audit Logs, and System Settings
- [x] Production `.env.example` created and `.env` added to `.gitignore`
- [x] Production build (`npm run build`) passing cleanly
