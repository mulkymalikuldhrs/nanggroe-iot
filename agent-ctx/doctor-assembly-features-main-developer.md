# Task: Doctor & Assembly Features for Nanggroe OS AI

## Task ID: doctor-assembly-features
## Agent: main-developer
## Date: 2026-05-25

## Summary
Created two major features for the Nanggroe OS AI project:

### Feature 1: System Doctor / Health Check
- **API Route**: `src/app/api/doctor/route.ts` — GET /api/doctor runs full system diagnostics
  - Checks database connectivity with latency measurement
  - Checks hardware device statuses (total, active, error counts, issues list)
  - Checks agent statuses (Hermes/PicoClaw online from DB config)
  - Checks telemetry freshness (last reading timestamp, age calculation)
  - Checks battery voltage levels with percentage calculation
  - Checks signal strength with quality thresholds
  - Checks calibration status (pending, completed, failed)
  - Checks for unresolved critical/warning alerts
  - Checks mission health (stuck missions detection)
  - Returns structured HealthReport with overall status (healthy/degraded/critical)
  - Generates actionable recommendations based on check results

- **UI Component**: `src/components/DoctorTab.tsx`
  - Professional health check dashboard with dark theme
  - Overall status card with large colored indicator
  - 9 check category cards with status badges, expandable details
  - Status badges: green (healthy), amber (degraded), red (critical)
  - "Run Diagnostics" button with loading state
  - Auto-refresh toggle (10-second interval)
  - Recommendations list with numbered items
  - Uses lucide-react icons: Heart, Database, Cpu, Bot, Activity, Battery, Signal, Wrench, AlertTriangle, Map

### Feature 2: Hardware Assembly Tutorial & Error Warning
- **API Route**: `src/app/api/assembly/route.ts`
  - GET /api/assembly — Returns 10-step assembly guide for the Nanggroe OS AI tricopter
  - POST /api/assembly — Reports hardware errors and gets troubleshooting advice
  - Uses ZAI SDK for AI-powered diagnostics with 25s timeout + fallback advice
  - Fallback advice system based on keyword matching when ZAI is unavailable
  - Related step detection based on error description keywords

- **UI Component**: `src/components/AssemblyTab.tsx`
  - Two-panel layout: left (assembly steps), right (diagnostics + reference)
  - 10 expandable step cards with completion tracking
  - Each step shows: description, tools, parts, wiring instructions, safety warnings, common errors
  - Wiring instructions with numbered connection lists
  - Color-coded warnings: amber for caution, red for danger
  - Progress bar showing assembly completion percentage
  - Error diagnostics textarea with "Diagnose" button
  - Troubleshooting results with clickable related step badges
  - Quick Pin Reference card for common connections

### Dashboard Integration
- Updated `src/components/Dashboard.tsx`:
  - Added "Doctor" tab with Heart icon
  - Added "Assembly" tab with Wrench icon
  - Imported and wired DoctorTab and AssemblyTab components

## Files Created/Modified
1. `src/app/api/doctor/route.ts` (new)
2. `src/app/api/assembly/route.ts` (new)
3. `src/components/DoctorTab.tsx` (new)
4. `src/components/AssemblyTab.tsx` (new)
5. `src/components/Dashboard.tsx` (modified)

## Lint Status
- 0 errors, 2 warnings (pre-existing in telemetry route)

## API Test Results
- GET /api/doctor ✅ (returns full health report with real DB data)
- GET /api/assembly ✅ (returns 10 assembly steps)
- POST /api/assembly ✅ (returns AI troubleshooting + fallback)
