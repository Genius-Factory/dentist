# Dentist frontend

The complete application documentation is maintained at the repository root:

- [Application handbook (HTML)](../docs/index.html)
- [Editable documentation source](../docs/application.md)
- [Project README](../README.md)

From the repository root, generate and open the handbook:

```powershell
node scripts/generate-docs.cjs --open
```

This frontend uses React, Vite, Tailwind, React Router, and Clerk. After completing the environment and database setup in the handbook, run `npm install` and `npm run dev` from this directory. Use `npm run build` for the production build and `npm run lint` for linting.
