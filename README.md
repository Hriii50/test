# MIZAN AI

Arabic-first personal finance app for recording transactions, managing budgets and savings goals, and reviewing financial activity.

## Deploy to Vercel

1. Import this repository into Vercel.
2. Set the project **Root Directory** to `artifacts/mizan-ai`.
3. Use the detected **Next.js** framework preset and build command.
4. Enable access to files outside the root directory so the app can use shared workspace packages from `lib/`.
5. Add `MONGODB_URI` and `SESSION_SECRET` to the Vercel project environment. Optionally add `MONGODB_DATABASE` (defaults to `mizan_ai`).

The Next.js app serves both the interface and the `/api/*` endpoints from one deployment. MongoDB data and authentication stay on the server; do not put database credentials in frontend code or commit them to this repository.

## Local development

- `pnpm --filter @workspace/mizan-ai run dev` — run the Next.js app and API routes.
- `pnpm --filter @workspace/api-server run dev` — run the Replit compatibility API at `/legacy-api`.
- `pnpm run typecheck` — typecheck workspace packages.
- `pnpm --filter @workspace/mizan-ai run build` — create the Next.js production build.
