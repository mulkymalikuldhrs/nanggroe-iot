# Worklog — Task 13-17: CI/CD, Docker, and Environment Validation

## Summary
Added CI/CD pipeline, Docker configuration, environment validation, and rate limiting to the Nanggroe IoT project.

## Files Created

1. **`.github/workflows/ci.yml`** — Replaced existing CI pipeline with structured 3-job workflow:
   - `lint-and-typecheck`: Lint + TypeScript check
   - `build`: Generate Prisma + build Next.js (depends on lint-and-typecheck)
   - `e2e-tests`: Playwright E2E tests with test database (depends on build)

2. **`Dockerfile`** — Multi-stage production build:
   - Stage 1 (deps): Install dependencies with bun, generate Prisma client
   - Stage 2 (builder): Build Next.js with standalone output
   - Stage 3 (runner): Slim node:20-alpine production image, non-root user, exposes port 3000

3. **`docker-compose.yml`** — Single service with:
   - Port 3000 mapping
   - DATABASE_URL and NODE_ENV environment
   - Persistent volumes for `iot-data` (db) and `iot-uploads`
   - `unless-stopped` restart policy

4. **`.dockerignore`** — Excludes node_modules, .next, db/, .git, skills/, examples/, download/, upload/, agent-ctx/

5. **`src/lib/env.ts`** — Zod-based environment validation:
   - DATABASE_URL (required), NODE_ENV, PORT
   - NANGGROE_API_KEY, ZAI_API_KEY, TELEGRAM_BOT_TOKEN (optional)
   - SERIAL_PORT, SERIAL_BAUD_RATE, MCP_PORT, EXTENSION_WS_PORT
   - HARDWARE_BRIDGE_MODE (simulation|real)
   - Helper functions: `getEnv()`, `isProduction()`, `isDevelopment()`

6. **`src/lib/rate-limit.ts`** — In-memory rate limiter:
   - IP + pathname based rate limiting
   - Configurable window (ms) and max requests
   - Automatic cleanup of expired entries every 60s
   - Returns 429 with Retry-After header when exceeded

## Files Modified (Rate Limiting Added)

7. **`src/app/api/agents/chat/route.ts`** — POST: 20 req/min
8. **`src/app/api/llm/chat/route.ts`** — POST: 20 req/min
9. **`src/app/api/mcp/route.ts`** — GET: 30 req/min, POST: 30 req/min
10. **`src/app/api/hardware/route.ts`** — GET: 60 req/min, POST: 60 req/min, PUT: 60 req/min
11. **`src/app/api/missions/route.ts`** — GET: 60 req/min, POST: 60 req/min, PUT: 60 req/min
12. **`src/app/api/telemetry/route.ts`** — GET: 120 req/min, POST: 120 req/min
13. **`src/app/api/system/route.ts`** — GET: 30 req/min, POST: 30 req/min

## Verification
- TypeScript check (`npx tsc --noEmit`): **0 errors** in src/
- Dev server: Running normally, API routes responding correctly
- Lint: Only pre-existing errors (unrelated to this task)
