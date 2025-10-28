# EGS Dashboard

Internal dashboard for managing automated outreach, Supabase contact data, and monitoring tooling for the EGS operations team.

## Getting Started

Prerequisites:

- Node.js 20+ and npm

Install dependencies and start the dev server:

```sh
git clone <REPO_URL>
cd <REPO_DIR>
npm install
npm run dev
```

## Available Scripts

- `npm run dev` – Start the Vite development server.
- `npm run build` – Build the production bundle.
- `npm run preview` – Preview the production build locally.
- `npm run lint` – Run ESLint across the project.

## Tech Stack

- Vite + React + TypeScript
- shadcn/ui and Radix primitives
- Tailwind CSS
- Supabase
- TanStack Query

## Deployment

Build the project with `npm run build` and deploy the output in `dist/` to your hosting provider of choice (e.g., Vercel, Netlify, or static hosting within the EGS infrastructure).
