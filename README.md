# Netflix (local clone)

This repository contains a Vite + React frontend and a small Express backend seeded with demo data (videos in `public/videos`).

Quick steps to push to GitHub and enable GitHub Pages for the frontend:

1. Create a new **empty** repository on GitHub (for example `your-username/netflix-clone`).
2. In your local project root, run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<REPO_NAME>.git
git push -u origin main
```

3. The included GitHub Actions workflow (on push to `main`) will build the frontend and deploy the `dist/` output to GitHub Pages automatically.

Notes:
- The backend (server/) must be hosted separately (Render, Heroku, Railway, etc.). This repository includes a `server` folder with an Express API.
- If you deploy the frontend to GitHub Pages under a repository path (not a custom domain), update `base` in `vite.config.js` to `'/<REPO_NAME>/'` before building.
- For production you should add secrets (MongoDB URI, JWT secret) and **not** expose them in the repo.

If you want, I can:
- Create a GitHub Actions workflow to build and publish a Docker image for the backend (requires registry credentials).
- Prepare a Render/Heroku deploy guide.
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
