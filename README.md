# Dentist application

React and Express application for patient profiles, appointment requests and approvals, user administration, and database inspection. PostgreSQL stores application data; Clerk handles authentication.

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

Follow the handbook's environment, PostgreSQL, and Clerk setup instructions first. Then use two terminals:

```powershell
npm --prefix server install
npm --prefix server run dev
```

```powershell
npm --prefix client install
npm --prefix client run dev
```

The frontend normally runs at `http://localhost:5173`; the backend defaults to `http://localhost:4000`.
