# Educational assessment platform (teacher & student)

Full-stack MVP: **Next.js (React)** frontend, **Express** REST API, **MongoDB** database. Roles: **teacher** and **student** only (admin can be added later).

## What’s included

- **Teachers:** classes with join codes, question bank (multiple choice + tags), build assessments, publish, view submissions and per-question analytics.
- **Students:** join classes with a code, take published assessments online, instant scoring, per-question feedback.

## Prerequisites

- Node.js 18+
- MongoDB running locally or a connection string (Atlas).

## Setup

### 1. MongoDB

Ensure MongoDB is reachable at `mongodb://127.0.0.1:27017` or set your URI below.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set MONGODB_URI and JWT_SECRET
npm install
npm run dev
```

API listens on **http://localhost:4000**.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev
```

App: **http://localhost:3000**.

## Typical flow

1. Register as **teacher** → create a **class** → copy **join code**.
2. Register as **student** (different account) → **Join class** with that code.
3. Teacher adds **questions**, creates an **assessment** for that class, toggles **Published**.
4. Student opens **Assessments** → **Start** → submit → **Review** results.
5. Teacher opens **Results & analytics** on the assessment.

## Project layout

- `backend/` — Express app (`/api/auth`, `/api/teacher/*`, `/api/student/*`).
- `frontend/` — Next.js App Router, JWT in `localStorage`, role-guarded routes.
# assessment
