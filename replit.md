# MIZAN AI

MIZAN AI is an Arabic-first personal finance platform for tracking transactions, budgets, savings goals, and recorded bills using each user's own data.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/mizan-ai run dev` — run the Next.js app (UI and `/api/*` routes)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required Replit Secrets: `MONGODB_URI`, `SESSION_SECRET`
- Optional environment variable: `MONGODB_DATABASE` (defaults to `mizan_ai`)

## Vercel deployment

- Import the repository and set **Root Directory** to `artifacts/mizan-ai`.
- Use the detected Next.js preset and default `next build` command.
- Add `MONGODB_URI` and `SESSION_SECRET` in Vercel's environment settings; optionally set `MONGODB_DATABASE`.
- The frontend and API are served by one Next.js deployment. The Express artifact remains only as a Replit compatibility adapter at `/legacy-api`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web and API: Next.js App Router / React
- Replit compatibility API: Express 5, backed by the same shared request handler
- DB: MongoDB Atlas using the official MongoDB Node.js driver
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: Next.js and esbuild for the compatibility API

## Where things live

- `artifacts/mizan-ai/` — Arabic-first Next.js app; UI pages and `/api/*` handlers
- `lib/mizan-api/` — shared authenticated finance API, MongoDB access, and signed HTTP-only sessions
- `artifacts/api-server/` — Express adapter used by the Replit compatibility route
- `lib/api-spec/openapi.yaml` — source of truth for API contracts and generated clients

## Architecture decisions

- Financial totals and advice use each signed-in user's stored transactions; no sample balances are included.
- The advisor uses transparent deterministic rules and does not require a paid AI service.
- Authentication uses bcryptjs and a signed token in an HTTP-only cookie because the requirements explicitly request password-based accounts.

## Product

- Landing page, registration, login, dashboard, transactions, budgets, savings goals, financial advisor, bills/payments, and profile.
- Arabic RTL interface with KWD currency formatting.

## User preferences

- Keep the app Arabic-first with RTL support and Kuwaiti dinar formatting.
- Do not use invented amounts in financial calculations.

## Gotchas

- Configure both `MONGODB_URI` and `SESSION_SECRET` in Replit Secrets before using account or finance endpoints.
- Backend route changes must remain consistent with `lib/api-spec/openapi.yaml`; regenerate clients after spec edits.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
