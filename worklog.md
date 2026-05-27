# Worklog — Task ID: 22-23-25

## OpenAPI/Swagger, Sentry Error Monitoring, and SEO

**Date:** 2025-07-31
**Author:** Z.ai Code Agent

---

### Summary

Added three major features to the Nanggroe IoT platform:

1. **OpenAPI/Swagger API Documentation** — Full OpenAPI 3.0.3 spec served at `/api/docs` with a Swagger UI page
2. **Sentry-style Error Monitoring** — Custom `ErrorReporter` class that queues and flushes errors to the Alert DB model
3. **SEO** — Dynamic `sitemap.xml`, `robots.txt`, and `manifest.json` via Next.js convention files

---

### Files Created

| File | Description |
|------|-------------|
| `src/app/api/docs/route.ts` | OpenAPI 3.0.3 spec as JSON, covering all 35+ API endpoints with schemas |
| `src/app/api/docs/page.tsx` | Swagger UI page loading external swagger-ui-dist with spec URL pointing to `/api/docs` |
| `src/lib/sentry.ts` | `ErrorReporter` class with queue-based error capture, 30s flush interval, DB persistence to Alert model |
| `src/app/global-error.tsx` | Root-level error boundary that reports to `/api/system` and displays a styled error page |
| `src/app/sitemap.ts` | Dynamic sitemap.xml generation via Next.js MetadataRoute |
| `src/app/robots.ts` | Dynamic robots.txt — allows `/`, disallows `/api/` |
| `src/app/manifest.ts` | PWA manifest with Nanggroe IoT branding (teal theme, dark background) |

---

### Key Decisions

- **OpenAPI Spec**: Chose dynamic generation in `route.ts` so the spec can be extended programmatically. All endpoints from the existing API routes are documented with operation IDs, tags, request bodies, and response schemas. Schemas include: `HardwareDevice`, `Mission`, `TelemetryReading`, `Alert`, `AgentMessage`, `PowerSource`, and their input variants.
- **Sentry Integration**: Used `ReturnType<typeof setInterval>` instead of `NodeJS.Timer` for better TypeScript compatibility. The `ErrorReporter` singleton pattern allows import from any server-side module via `getErrorReporter()`. Errors are stored as Alert records in the database with appropriate severity mapping.
- **Global Error Page**: Uses inline styles (required for `global-error.tsx` since it renders outside the root layout). Reports errors client-side via fetch to `/api/system`.
- **Swagger UI**: Added `eslint-disable` for `@next/next/no-sync-scripts` since Swagger UI requires synchronous script loading to initialize properly.
- **robots.txt**: The dynamic `src/app/robots.ts` takes precedence over the static `public/robots.txt`. The dynamic version properly disallows `/api/` to prevent search engines from indexing API endpoints.

---

### Verification

- **TypeScript**: `npx tsc --noEmit` — 0 errors in non-test source files (all `src/` errors are pre-existing in `__tests__` directories)
- **ESLint**: All new files pass lint with 0 errors/warnings
- **Dev Server**: Running successfully, all existing routes continue to function

---

### Task IDs

- **22**: OpenAPI/Swagger API Documentation ✅
- **23**: Sentry Error Monitoring ✅
- **25**: SEO (sitemap.xml, robots.txt, manifest.json) ✅
