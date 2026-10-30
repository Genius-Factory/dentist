# Dentist application

React and Express application for patient profiles, appointment requests and approvals, user administration, and database inspection. PostgreSQL stores application data; Clerk handles authentication.

## Services page

The public services catalogue is available at `/services`. It includes eight responsive service cards, category filtering, accessible service-detail dialogs, and links into the appointment flow. The hero image is a project asset at `client/src/assets/services/dental-services-hero.png`.

![Services page hero artwork](client/src/assets/services/dental-services-hero.png)

## Documentation

Open [the application handbook](docs/index.html) in your browser for the complete setup, user guide, roles, API reference, database schema, operations, and known limitations.

Generate and open the standalone HTML from the repository root (Node.js 18+, no extra dependencies):

```powershell
node scripts/generate-docs.cjs --open
```

To rebuild while editing:

```powershell
node scripts/generate-docs.cjs --watch
```

Edit [docs/application.md](docs/application.md), then regenerate. Watch mode rebuilds the file; refresh your browser to see changes. The HTML includes search, navigation, copyable commands, light/dark mode, and printing to PDF.

## Run locally

Follow the handbook's environment, PostgreSQL, and Clerk setup instructions first. Install dependencies from the repository root:

```powershell
npm install
npm --prefix server install
npm --prefix client install
npm --prefix server run migrate:billing
```

Start both the server and client with one command from the repository root:

```powershell
npm run local
```

Press `Ctrl+C` to stop both processes.

The frontend normally runs at `http://localhost:5173`; the backend defaults to `http://localhost:4000`.

The billing migration is additive and safe to repeat on existing databases. See [revenue and payment tracking](docs/billing.md) for staff workflows, reporting definitions, API details, and integration tests.
