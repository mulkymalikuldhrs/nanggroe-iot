# Changelog

All notable changes to **Nanggroe IoT** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2025-01-01

### Added

#### Core Platform
- Next.js 16 App Router dashboard with 21 tab modules
- Prisma ORM with SQLite — 18 database models
- 40+ API routes covering all platform subsystems
- 22 lib service modules with real implementations
- Zustand client state management + TanStack Query server state
- Responsive mobile layout with Capacitor Android support
- Tauri v2 desktop app packaging (Linux DEB/AppImage, Windows MSI/NSIS)
- Comprehensive .gitignore for all platforms

#### Hardware & Drivers
- Hardware Bridge service — Serial, I2C, SPI, GPIO, ADC abstraction
- Auto-detect hardware via USB VID/PID scanning
- Driver management API with install/scan/load capabilities
- HardwareBusState model for bus monitoring
- Support for Arduino, Pixhawk, Raspberry Pi, and custom boards

#### AI & Agents
- LLM Engine — z-ai-web-dev-sdk integration (TinyLlama, Phi-2, Llama-3.2, Gemma-2, Qwen2.5)
- Multi-agent system — Hermes (cloud) and PicoClaw (local) agents
- AI Memory with sync queue for offline-first operation
- Self-Learning module — pattern detection, auto-tune, knowledge transfer
- AI-powered testing service with coverage analysis
- Agent chat API with conversation history

#### Robotics Features
- 9 robot templates (Tricopter, Quadcopter, Rover, Boat, Amphibious, Arm, Blimp, Hexacopter, Custom)
- Robot Builder with step-by-step assembly guides
- Mission planning with waypoints, area polygons, and overlap settings
- Navigation — GPS tracking, autopilot, RTH (Return-To-Home), field mapping
- Face Tracking — detection, tracking, face database, servo control
- Calibration — compass, accelerometer, gyro, ESC, radio
- Telemetry — real-time data streaming via SSE

#### Communications
- Telegram Bot integration (Hermes agent)
- Voice/TTS support
- Beep alert patterns
- GSM module connectivity
- WebSocket extension bridge for VSCode/Cursor/Neovim/JetBrains

#### Power & Infrastructure
- Power management — battery, solar panel, GSM monitoring
- System Doctor — health check, diagnostics, repair
- Firmware flasher with verification
- MCP Protocol — JSON-RPC 2.0 implementation
- Boot flow manager

#### Developer Experience
- Full TypeScript strict mode — zero compilation errors
- shadcn/ui component library with 40+ components
- ESLint configuration
- Prisma seed script with sample data
- Comprehensive API documentation

#### Documentation
- README.md with full setup, architecture, and API reference
- CONTRIBUTING.md with guidelines and code style
- SECURITY.md with vulnerability reporting process
- AUTHORS.md with contributor credits
- MIT License
- .env.example with all configuration options
- .github/ issue templates, PR template, and CI workflow

### Technical Details
- **Framework**: Next.js 16 (App Router) + React 19
- **Desktop**: Tauri v2 (Rust backend)
- **Mobile**: Capacitor (Android)
- **Language**: TypeScript 5 (strict) + Rust
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM (SQLite)
- **State**: Zustand (client) + TanStack Query (server)
- **AI SDK**: z-ai-web-dev-sdk

[1.0.0]: https://github.com/mulkymalikuldhaher/nanggroe-iot/releases/tag/v1.0.0
