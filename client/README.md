# 🦷 DentalCare  — Mini Dental Management System

A full‑stack dental practice management system with appointment scheduling, patient records, role‑based access control, and a modern React UI.

> **Live Demo:** *none (local development only)*

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Set Up the Database](#2-set-up-the-database)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Install Dependencies & Run](#4-install-dependencies--run)
- [Seeding the Database](#seeding-the-database)
- [User Roles & Permissions](#user-roles--permissions)
- [API Endpoints](#api-endpoints)
- [Quick‑Start Demo Additions](#quick‑start-demo-additions)
- [Project Structure](#project-structure)

---

## Features

### Core
- **Patient Management** – Create, edit, and view patient profiles (contact info, medical history, dental records).
- **Appointment Scheduling** – Calendar view for dentists to book, reschedule, or cancel appointments.
- **Treatment Plans** – Define procedures, assign prices, and track status (planned, in‑progress, completed).
- **Billing & Invoicing** – Generate invoices for completed treatments, with simple pricing tiers.
- **Authentication & SSO** – Powered by [Clerk](https://clerk.com) with Google/GitHub SSO, email/password, and session management.
- **Role‑Based Access Control** – Three roles (`admin`, `dentist`, `receptionist`) with granular permissions.

### AI‑Powered (optional)
- **AI Treatment Summaries** – Generate concise treatment notes using OpenAI GPT‑4o‑mini.
- **AI Appointment Suggestions** – Recommend optimal appointment slots based on dentist availability and patient preferences.

---

## Tech Stack

| Layer        | Technology |
|--------------|------------|
| **Frontend** | React 18, React Router v7, Tailwind CSS, Vite, Lucide Icons |
| **Backend**  | Node.js, Express, Helmet, CORS |
| **Database** | PostgreSQL (with full‑text search indexes) |
| **Auth**     | Clerk (SSO with Google/GitHub, role‑based access via `publicMetadata`) |
| **AI**       | OpenAI GPT‑4o‑mini (optional for summaries and suggestions) |
| **Other**    | Axios, react‑hot‑toast |

---

## Architecture

```
┌─────────────┐       ┌──────────────┐       ┌────────────┐
│   React SPA │──────▶│  Express API │──────▶│ PostgreSQL │
│  (Vite)     │ Clerk │  (Node.js)   │  pg   │            │
│  Port 5173  │ JWT   │  Port 4000   │       │            │
└─────────────┘       └──────┬───────┘       └────────────┘
                             │
                    ┌────────┴────────┐
                    │   OpenAI API    │
                    └─────────────────┘
```

- The **client** authenticates via Clerk and sends a JWT Bearer token with every API request.
- The **server** verifies the token using `@clerk/express`, syncs the user to the local DB, and checks role permissions.
- **AI features** call OpenAI’s API server‑side, keeping the API key secure.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14 (local or hosted, e.g. Neon, Supabase, Railway)
- **Clerk account** – free tier works
- **OpenAI API key** – optional for AI features

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/dental-care-system.git
cd dental-care-system
```

### 2. Set Up the Database

Create a PostgreSQL database and run the schema:

```bash
psql -U postgres -c "CREATE DATABASE dental_db;"
psql -U postgres -d dental_db -f server/db/schema.sql
```

Or paste the contents of `server/db/schema.sql` into your hosted provider’s SQL editor.

### 3. Configure Environment Variables

**Server** – create `server/.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/dental_db
CLERK_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXX
CLIENT_URL=http://localhost:5173
OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXX
PORT=4000
```

**Client** – create `client/.env`:

```env
VITE_API_URL=http://localhost:4000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXX
```

### 4. Install Dependencies & Run

```bash
# Terminal 1 – Server
cd server
npm install
npm run dev

# Terminal 2 – Client
cd client
npm install
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## Seeding the Database

A seed script creates a few demo patients, dentists, and appointment slots:

```bash
cd server
node db/seed-demo.js
```

---

## User Roles & Permissions

| Action                              | `receptionist` | `dentist` | `admin` |
|-------------------------------------|----------------:|----------:|--------:|
| View patient list & details          | ✅              | ✅        | ✅      |
| Create / edit patient records        | ✅              | ✅        | ✅      |
| Schedule / modify appointments       | ✅              | ✅        | ✅      |
| View own appointment calendar        | ❌              | ✅        | ✅      |
| Manage treatment plans                | ❌              | ✅        | ✅      |
| Generate invoices                    | ❌              | ✅        | ✅      |
| Manage users & roles                | ❌              | ❌        | ✅      |

Roles are stored in Clerk’s `publicMetadata` and synced to the local `users` table.

---

## API Endpoints

### Patients
| Method | Endpoint                | Auth          | Description |
|--------|------------------------|---------------|-------------|
| `GET`  | `/api/patients`        | Receptionist/| List patients |
| `POST` | `/api/patients`        | Receptionist/| Create patient |
| `GET`  | `/api/patients/:id`   | Receptionist/| Get patient details |
| `PUT`  | `/api/patients/:id`   | Receptionist/| Update patient |
| `DELETE`| `/api/patients/:id`   | Admin         | Delete patient |

### Appointments
| Method | Endpoint                     | Auth          | Description |
|--------|-----------------------------|---------------|-------------|
| `GET`  | `/api/appointments`         | Receptionist/| List appointments |
| `POST` | `/api/appointments`         | Receptionist/| Book appointment |
| `PUT`  | `/api/appointments/:id`    | Receptionist/| Reschedule / cancel |
| `GET`  | `/api/appointments/:id`    | Receptionist/| Get appointment details |

### Treatments
| Method | Endpoint                | Auth          | Description |
|--------|------------------------|---------------|-------------|
| `POST` | `/api/treatments`       | Dentist       | Create treatment record |
| `GET`  | `/api/treatments/:id`  | Dentist       | Get treatment details |
| `PUT`  | `/api/treatments/:id`  | Dentist       | Update treatment |
| `DELETE`| `/api/treatments/:id` | Dentist       | Delete treatment |

### Billing
| Method | Endpoint                | Auth          | Description |
|--------|------------------------|---------------|-------------|
| `POST` | `/api/billing/invoice` | Dentist       | Generate invoice for a treatment |
| `GET`  | `/api/billing/:id`     | Receptionist/| View invoice |

### AI (optional)
| Method | Endpoint                | Auth          | Description |
|--------|------------------------|---------------|-------------|
| `POST` | `/api/ai/treatment-summary` | Dentist | Generate AI summary of a treatment |
| `POST` | `/api/ai/appointment-suggest`| Receptionist | Get AI‑suggested appointment slots |

---

## Quick‑Start Demo Additions

The recent changes introduced a minimal **Home page** and a **health‑check** endpoint to verify that the backend can talk to the PostgreSQL database. These additions make it easy to confirm that the whole stack is wired correctly before exploring the full dental‑practice features.

### Home Page (`/`)

* A new page **HomePage.jsx** displays a friendly greeting and a **"Check DB connection"** button.
* Clicking the button calls the server endpoint `GET /healthz` and shows the JSON response, confirming that the server can reach the database.
* The page also shows the signed‑in user’s email (when logged in) via Clerk.

### Sign‑In / Sign‑Up

* **Sign‑In** is available at `/sign-in` using Clerk’s `SignIn` component (already present).
* A brand‑new **Sign‑Up** page (`/sign-up`) was added with Clerk’s `SignUp` component.
* The navigation bar now includes a **Home** link and Sign‑In/Sign‑Out buttons that work with Clerk.

### Health‑Check Endpoint (`GET /healthz`)

* Implemented in `server/index.js`.
* Returns `{ "status": "ok", "db": true }` when a simple `SELECT 1` query succeeds.
* Useful for automated smoke tests or manual verification via the Home page button.

### How to Test

1. **Set environment variables** – copy `client/.env.example` to `client/.env.local` and fill in your Clerk publishable key and the API URL (`http://localhost:4000`).
2. **Start the server** (`npm run start` in `server`).
3. **Start the client** (`npm run dev` in `client`).
4. Open `http://localhost:5173` – you should see the Home page.
5. Click **Check DB connection** – you should see a JSON response confirming the DB is reachable.
6. Use the **Sign In** button to log in, or navigate to `/sign-up` to create a new account.

These additions provide a lightweight way to verify that the core plumbing (frontend → backend → database) works before diving into the full dental‑practice management features.

---

## Project Structure

```
DentalCareOS/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── components/         # UI components (Navbar, Calendar, etc.)
│   │   ├── contexts/           # Global contexts (Auth, Cart, etc.)
│   │   ├── hooks/              # Custom hooks (useApi, useAppointments)
│   │   ├── lib/                # API client, pricing tiers, constants
│   │   ├── pages/              # Pages: Home, SignIn, SignUp, Patients, Appointments, Billing
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/                     # Express backend
│   ├── db/
│   │   ├── index.js            # PostgreSQL pool
│   │   ├── schema.sql          # Database schema (patients, appointments, treatments)
│   │   └── seed-demo.js        # Seed script for demo data
│   ├── middleware/
│   │   └── auth.js             # Clerk auth, role checks, user sync
│   ├── routes/
│   │   ├── patients.js         # CRUD for patient records
│   │   ├── appointments.js     # Scheduling endpoints
│   │   ├── treatments.js        # Treatment plan CRUD
│   │   ├── billing.js          # Invoice generation
│   │   └── ai.js               # Optional AI endpoints
│   ├── index.js                # Express app entry point (includes /healthz)
│   └── package.json
├── .gitignore
└── README.md
```

---

## License

This project is provided as a learning example. Feel free to adapt it for your own dental practice or as a reference for building similar SaaS applications.
