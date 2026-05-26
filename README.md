<div align="center">

# Nanggroe IoT

### Modular IoT & Robotics Platform

**Sistem Operasi Robotika Otonom Modular — Dari Aceh Untuk Dunia**

[![Version](https://img.shields.io/badge/version-1.0.0-teal.svg)](https://github.com/mulkymalikuldhaher/nanggroe-iot)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![Tauri](https://img.shields.io/badge/Tauri-v2-orange.svg)](https://tauri.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://typescriptlang.org)
[![Capacitor](https://img.shields.io/badge/Capacitor-6-purple.svg)](https://capacitorjs.com)

[Report Bug](https://github.com/mulkymalikuldhaher/nanggroe-iot/issues) · [Request Feature](https://github.com/mulkymalikuldhaher/nanggroe-iot/issues) · [Security](SECURITY.md)

</div>

---

## Overview

Nanggroe IoT is a modular autonomous robotics operating system designed to build, control, and manage many types of robots — drones, rovers, boats, amphibious vehicles, robotic arms, and custom Arduino projects — with integrated AI. Built with modern web technologies, runs on Raspberry Pi, supports full offline operation, and packages as native desktop (Linux/Windows) and mobile (Android) apps.

### Key Highlights

- **Multi-Robot Support** — 9 built-in templates for drones, rovers, boats, arms, blimps, and custom projects
- **AI-Powered** — Local and cloud LLM integration, multi-agent system, self-learning, face tracking
- **Hardware Auto-Detect** — Serial, I2C, SPI, GPIO scanning with automatic driver loading
- **Offline-First** — Local LLM, SQLite database, memory sync queue for disconnected operation
- **Cross-Platform** — Web dashboard, Linux desktop (DEB/AppImage), Windows (MSI/NSIS), Android (APK)
- **Real-Time** — Server-Sent Events telemetry streaming, WebSocket extension bridge
- **Production-Ready** — Zero TypeScript errors, comprehensive API, 18 Prisma models

---

## Features

### Robot Platform

| Feature | Description |
|---------|-------------|
| Robot Builder | Step-by-step project creation from templates with assembly guides |
| 9 Templates | Tricopter, Quadcopter, Rover, Boat, Amphibious, Arm, Blimp, Hexacopter, Custom |
| Hardware Auto-Detect | USB VID/PID scanning, serial port enumeration, I2C/SPI bus probing |
| Firmware Flasher | Upload firmware to Arduino/Pixhawk with verification |
| Calibration | Compass, accelerometer, gyro, ESC, radio calibration flows |
| Assembly Guide | Step-by-step instructions with progress tracking |

### AI & Intelligence

| Feature | Description |
|---------|-------------|
| LLM Engine | Cloud + local models (TinyLlama, Phi-2, Llama-3.2, Gemma-2, Qwen2.5) |
| Multi-Agent | Hermes (cloud orchestration) + PicoClaw (local edge agent) |
| Self-Learning | Pattern detection, auto-tuning, knowledge transfer between projects |
| AI Memory | Persistent memory with confidence scores and sync queue |
| AI Testing | Automated test generation and coverage analysis |
| Face Tracking | Detection, recognition database, servo tracking control |

### Navigation & Mission

| Feature | Description |
|---------|-------------|
| Mission Planner | Waypoint creation, area polygons, overlap/speed/altitude config |
| GPS Tracking | Real-time position tracking via serial GPS |
| Autopilot | Autonomous waypoint navigation with geofence |
| RTH | Return-To-Home with configurable failsafe |
| Field Mapping | Automated area survey with photo capture planning |
| Delivery Routes | Point-to-point delivery with obstacle avoidance |

### Communications

| Feature | Description |
|---------|-------------|
| Telegram Bot | Hermes agent integration for remote control |
| Voice/TTS | Speech input and text-to-speech output |
| Beep Alerts | Configurable alert patterns via buzzer |
| GSM Module | Cellular connectivity for remote areas |
| Extension Bridge | WebSocket for VSCode, Cursor, Neovim, JetBrains |

### Power & Infrastructure

| Feature | Description |
|---------|-------------|
| Battery Monitor | Voltage, current, temperature tracking with alerts |
| Solar Panel | Charge monitoring and power optimization |
| System Doctor | Health checks, diagnostics, and auto-repair |
| MCP Protocol | JSON-RPC 2.0 for external tool integration |
| Boot Flow | Startup sequence manager with dependency ordering |
| Sync Queue | Offline-first data sync with retry logic |

---

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | 16 |
| Desktop | Tauri | v2 |
| Mobile | Capacitor | 6 |
| Language | TypeScript | 5 (strict) |
| Backend | Rust | 2021 edition |
| Styling | Tailwind CSS + shadcn/ui | 4 |
| Database | Prisma ORM (SQLite) | 6 |
| State | Zustand + TanStack Query | 5 / 5 |
| AI SDK | z-ai-web-dev-sdk | latest |
| Serial | serialport | 13 |

---

## Quick Start

### Prerequisites

- **Bun** >= 1.0 ([install](https://bun.sh))
- **Node.js** >= 18 (for compatibility)
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/mulkymalikuldhaher/nanggroe-iot.git
cd nanggroe-iot

# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Initialize database
bun run db:push
bun run db:generate

# Start development server
bun run dev

# Open in browser at http://localhost:3000
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Next.js development server on port 3000 |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint checks |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run database migrations |
| `bun run db:reset` | Reset database with seed data |
| `bun run tauri:dev` | Start Tauri desktop dev mode |
| `bun run tauri:build` | Build desktop app for current platform |
| `bun run tauri:build:linux` | Build Linux DEB + AppImage |
| `bun run tauri:build:windows` | Build Windows MSI + NSIS |
| `bun run android:sync` | Sync web assets to Android project |
| `bun run android:open` | Open Android project in Android Studio |
| `bun run android:build` | Build web + sync to Android |

---

## Desktop App (Tauri v2)

Build Nanggroe IoT as a native desktop application for **Linux** and **Windows**.

### Linux Prerequisites (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev \
  libgtk-3-dev libayatana-appindicator3-dev \
  librsvg2-dev libssl-dev libclang-dev \
  build-essential pkg-config

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Windows Prerequisites

```bash
# Install Visual Studio Build Tools (C++ workload)
# Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/

# Install Rust
winget install Rustlang.Rustup
```

### Build Commands

```bash
# Development (hot-reload)
bun run tauri:dev

# Linux packages (DEB + AppImage)
bun run tauri:build:linux

# Windows installers (MSI + NSIS)
bun run tauri:build:windows
```

### Build Output

| Platform | Output Path |
|----------|------------|
| Linux DEB | `src-tauri/target/release/bundle/deb/nanggroe-iot_1.0.0_amd64.deb` |
| Linux AppImage | `src-tauri/target/release/bundle/appimage/nanggroe-iot_1.0.0_amd64.AppImage` |
| Windows MSI | `src-tauri/target/release/bundle/msi/Nanggroe IoT_1.0.0_x64_en-US.msi` |
| Windows EXE | `src-tauri/target/release/bundle/nsis/Nanggroe IoT_1.0.0_x64-setup.exe` |

### Tauri Configuration

| Setting | Value |
|---------|-------|
| Product Name | Nanggroe IoT |
| Identifier | com.nanggroe.iot |
| Window Size | 1440×900 (min: 1024×700) |
| Window Title | Nanggroe IoT — IoT & Robotics Platform |

---

## Android App (Capacitor)

Build Nanggroe IoT as an Android application.

### Prerequisites

- **Android Studio** with SDK 33+
- **Java Development Kit** (JDK 17)

### Setup & Build

```bash
# Sync web assets to Android project
bun run android:sync

# Open in Android Studio for build/run
bun run android:open

# Or build and run on connected device
bun run android:run
```

### Capacitor Configuration

| Setting | Value |
|---------|-------|
| App ID | com.nanggroe.iot |
| App Name | Nanggroe IoT |
| Web Dir | out |
| Splash Duration | 2000ms |
| Status Bar | Dark |

---

## Project Architecture

```
nanggroe-iot/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/                    # 40+ API endpoints
│   │   │   ├── agents/             # AI agent chat & management
│   │   │   ├── ai-memory/          # AI memory CRUD
│   │   │   ├── alerts/             # Alert system
│   │   │   ├── assembly/           # Robot assembly steps
│   │   │   ├── auto-detect/        # Hardware auto-detection
│   │   │   ├── bootflow/           # Boot sequence manager
│   │   │   ├── calibration/        # Sensor calibration
│   │   │   ├── comms/              # Communications (Telegram, voice, beep, GSM)
│   │   │   ├── doctor/             # System health diagnostics
│   │   │   ├── drivers/            # Hardware driver management
│   │   │   ├── extension/          # IDE extension bridge
│   │   │   ├── face-tracking/      # Face detection & tracking
│   │   │   ├── flash/              # Firmware flashing
│   │   │   ├── hardware/           # Hardware device CRUD
│   │   │   ├── hardware-bridge/    # Hardware bus abstraction
│   │   │   ├── llm/                # LLM chat completions
│   │   │   ├── mcp/                # MCP protocol transport
│   │   │   ├── missions/           # Mission planning & execution
│   │   │   ├── navigation/         # GPS & autopilot routes
│   │   │   ├── power/              # Power source management
│   │   │   ├── projects/           # Robot project CRUD
│   │   │   ├── robot-templates/    # Template library
│   │   │   ├── self-learn/         # Self-learning engine
│   │   │   ├── stream/             # SSE telemetry & alerts
│   │   │   ├── system/             # System configuration
│   │   │   ├── telemetry/          # Telemetry readings
│   │   │   └── testing/            # AI-powered testing
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Main dashboard page
│   │   └── globals.css             # Global styles
│   ├── components/                 # 23 React components
│   │   ├── ui/                     # 40+ shadcn/ui components
│   │   ├── Dashboard.tsx           # Main dashboard with tab navigation
│   │   ├── OverviewTab.tsx         # System overview
│   │   ├── RobotBuilderTab.tsx     # Robot project builder
│   │   ├── AgentsTab.tsx           # AI agent management
│   │   ├── MissionsTab.tsx         # Mission planning
│   │   ├── NavigationTab.tsx       # GPS & autopilot
│   │   ├── HardwareTab.tsx         # Hardware devices
│   │   ├── DriversTab.tsx          # Driver management
│   │   ├── FlashTab.tsx            # Firmware flasher
│   │   ├── CalibrationTab.tsx      # Sensor calibration
│   │   ├── TelemetryTab.tsx        # Real-time data
│   │   ├── CommsTab.tsx            # Communications
│   │   ├── PowerTab.tsx            # Power management
│   │   ├── McpTab.tsx              # MCP protocol
│   │   ├── ExtensionTab.tsx        # IDE extension
│   │   ├── DoctorTab.tsx           # System diagnostics
│   │   ├── AssemblyTab.tsx         # Assembly guide
│   │   ├── SelfLearnTab.tsx        # Self-learning
│   │   ├── FaceTrackingTab.tsx     # Face tracking
│   │   ├── TestingTab.tsx          # AI testing
│   │   ├── LogsTab.tsx             # System logs
│   │   ├── BootFlowPanel.tsx       # Boot flow
│   │   └── MobileLayout.tsx        # Mobile responsive layout
│   ├── lib/                        # 22 service modules
│   │   ├── agents.ts               # Multi-agent orchestration
│   │   ├── ai-memory.ts            # AI memory with sync
│   │   ├── beep-alerts.ts          # Buzzer alert patterns
│   │   ├── communication.ts        # Telegram, voice, GSM
│   │   ├── constants.ts            # Platform constants
│   │   ├── db.ts                   # Prisma client singleton
│   │   ├── drivers.ts              # Hardware driver registry
│   │   ├── extension.ts            # IDE extension bridge
│   │   ├── face-tracking.ts        # Face detection engine
│   │   ├── flash.ts                # Firmware flasher
│   │   ├── gsm-module.ts           # GSM connectivity
│   │   ├── hardware-bridge.ts      # Serial/I2C/SPI/GPIO bridge
│   │   ├── llm.ts                  # LLM engine (multi-model)
│   │   ├── mcp.ts                  # MCP JSON-RPC protocol
│   │   ├── navigation.ts           # GPS, autopilot, RTH
│   │   ├── power.ts                # Battery, solar, power mgmt
│   │   ├── robot-templates.ts      # 9 robot templates
│   │   ├── self-learn.ts           # Self-learning engine
│   │   ├── sensor-config.ts        # Sensor configuration
│   │   ├── simulator.ts            # Hardware simulation
│   │   ├── telemetry.ts            # Telemetry aggregation
│   │   ├── testing.ts              # AI-powered testing
│   │   ├── types.ts                # TypeScript type definitions
│   │   └── utils.ts                # Utility functions
│   └── hooks/                      # Custom React hooks
│       ├── use-toast.ts            # Toast notifications
│       ├── use-mobile.ts           # Mobile detection
│       ├── usePlatform.ts          # Platform detection (web/Tauri/Capacitor)
│       └── use-sse.ts              # Server-Sent Events hook
├── prisma/
│   ├── schema.prisma               # 18 database models
│   └── seed.ts                     # Sample data seeder
├── src-tauri/                      # Tauri v2 desktop app
│   ├── src/
│   │   ├── main.rs                 # Rust entry point
│   │   └── lib.rs                  # Tauri app builder
│   ├── Cargo.toml                  # Rust dependencies
│   ├── tauri.conf.json             # Tauri configuration
│   ├── capabilities/default.json   # Permission grants
│   └── icons/                      # Platform icons (Linux/Windows/macOS)
├── android/                        # Capacitor Android project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/com/nanggroe/iot/MainActivity.java
│   │   │   └── res/               # Icons, splash screens, layouts
│   │   └── build.gradle
│   ├── build.gradle
│   └── settings.gradle
├── examples/
│   └── websocket/                  # WebSocket examples
├── .github/                        # GitHub templates & CI
│   ├── ISSUE_TEMPLATE/             # Bug, feature, hardware templates
│   ├── workflows/ci.yml            # CI pipeline
│   ├── dependabot.yml              # Dependency updates
│   ├── FUNDING.yml                 # Sponsorship
│   └── PULL_REQUEST_TEMPLATE.md    # PR template
├── .env.example                    # Environment template
├── .gitignore                      # Comprehensive ignore rules
├── AUTHORS.md                      # Contributor credits
├── CHANGELOG.md                    # Version history
├── CONTRIBUTING.md                 # Contribution guidelines
├── LICENSE                         # MIT License
├── SECURITY.md                     # Security policy
├── capacitor.config.ts             # Capacitor configuration
├── next.config.ts                  # Next.js configuration
├── package.json                    # Project manifest
├── tailwind.config.ts              # Tailwind configuration
└── tsconfig.json                   # TypeScript configuration
```

---

## Database Schema

18 Prisma models covering the full robotics platform:

| Model | Purpose |
|-------|---------|
| SystemConfig | Key-value system settings |
| HardwareDevice | Connected hardware with status tracking |
| HardwareProfile | HAL adapter configurations per device |
| TelemetryReading | Time-series sensor/metric data |
| Mission | Mission plans with waypoints and parameters |
| MissionLog | Mission execution logs |
| AgentMessage | Hermes/PicoClaw agent communication |
| Session | User sessions with mode tracking |
| Calibration | Calibration records and results |
| SyncQueue | Offline-first data sync queue |
| Alert | Notifications and safety alerts |
| RobotTemplate | 9 built-in robot project templates |
| RobotProject | User-created robot projects |
| CommunicationChannel | Telegram, voice, GSM channels |
| NavigationPlan | GPS tracks and autopilot routes |
| PowerSource | Battery, solar, power monitoring |
| AiMemory | Persistent AI memory with confidence |
| VoiceLog | Speech transcription logs |
| FaceProfile | Face recognition database |
| HardwareBusState | Hardware bus status monitoring |
| ExtensionConnection | IDE extension connections |
| LearningRecord | Self-learning pattern records |

---

## Robot Templates

| Template | Category | Description |
|----------|----------|-------------|
| Tricopter Drone | drone | 3-motor UAV for aerial mapping |
| Quadcopter | drone | 4-motor UAV for photography & survey |
| Hexacopter | drone | 6-motor heavy-lift UAV |
| Rover | rover | 4-wheel ground vehicle |
| Boat / USV | boat | Unmanned surface vessel |
| Amphibious | amphibious | Land + water hybrid vehicle |
| Robotic Arm | arm | Multi-DOF manipulator |
| Blimp / Airship | drone | Lighter-than-air vehicle |
| Custom | custom | Blank template for any Arduino project |

---

## API Reference

All endpoints are under `/api/`. Here is a summary of available routes:

### Core System
- `GET /api` — Health check
- `GET/POST /api/system` — System configuration
- `GET /api/doctor` — System diagnostics
- `GET/POST /api/bootflow` — Boot sequence management

### Robots & Projects
- `GET/POST /api/robot-templates` — List/create templates
- `GET/PUT/DELETE /api/robot-templates/[id]` — Template CRUD
- `GET/POST /api/projects` — List/create robot projects
- `GET/PUT/DELETE /api/projects/[id]` — Project CRUD

### Hardware
- `GET/POST /api/hardware` — List/register devices
- `GET/POST /api/hardware-bridge` — Hardware bus operations
- `GET/POST /api/drivers` — Driver management
- `GET/POST /api/auto-detect` — Hardware auto-detection
- `GET/POST /api/flash` — Firmware flashing

### AI & Agents
- `GET/POST /api/agents` — Agent management
- `POST /api/agents/chat` — Agent chat
- `POST /api/llm/chat` — LLM completions
- `GET/POST /api/ai-memory` — AI memory CRUD
- `GET/POST /api/self-learn` — Self-learning engine
- `GET/POST /api/face-tracking` — Face tracking operations
- `GET/POST /api/testing` — AI-powered testing

### Missions & Navigation
- `GET/POST /api/missions` — Mission planning
- `GET/PUT/DELETE /api/missions/[id]` — Mission CRUD
- `GET/POST /api/navigation` — Navigation plans
- `GET/PUT/DELETE /api/navigation/[id]` — Navigation CRUD

### Communications
- `GET/POST /api/comms` — Communication channels
- `GET/PUT/DELETE /api/comms/[id]` — Channel CRUD
- `POST /api/comms/telegram` — Telegram bot
- `POST /api/comms/voice` — Voice/TTS
- `POST /api/comms/beep` — Beep alerts

### Telemetry & Monitoring
- `GET/POST /api/telemetry` — Telemetry readings
- `GET/POST /api/power` — Power source monitoring
- `GET/POST /api/alerts` — Alert management
- `GET/POST /api/calibration` — Calibration records

### Streaming (SSE)
- `GET /api/stream/telemetry` — Real-time telemetry stream
- `GET /api/stream/alerts` — Real-time alert stream
- `GET /api/stream/testing` — Testing progress stream

### Integrations
- `GET/POST /api/mcp` — MCP protocol
- `POST /api/mcp/transport` — MCP JSON-RPC transport
- `GET/POST /api/extension` — IDE extension bridge
- `GET/POST /api/assembly` — Assembly step management

---

## Environment Variables

See [.env.example](.env.example) for a complete list with descriptions.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `file:./db/nanggroe-iot.db` | SQLite database path |
| `ZAI_API_KEY` | No | — | Z-AI SDK key for cloud LLM |
| `TELEGRAM_BOT_TOKEN` | No | — | Telegram bot token for Hermes |
| `SERIAL_PORT` | No | `/dev/ttyUSB0` | Default serial port |
| `SERIAL_BAUD_RATE` | No | `115200` | Serial baud rate |
| `PORT` | No | `3000` | Server port |
| `MCP_PORT` | No | `8080` | MCP protocol port |
| `EXTENSION_WS_PORT` | No | `8081` | Extension WebSocket port |

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run `bun run lint` and fix any issues
5. Commit with conventional commits: `feat(scope): description`
6. Push and open a Pull Request

---

## Security

For security vulnerabilities, please **do not** open public issues. See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

**Contact**: mulkymalikuldhaher@email.com

---

## Author

**Mulky Malikul Dhaher**

- Email: mulkymalikuldhaher@email.com
- GitHub: [@mulkymalikuldhaher](https://github.com/mulkymalikuldhaher)

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Mulky Malikul Dhaher

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

**Built with ❤️ in Aceh, Indonesia**

*From Aceh For The World — Dari Aceh Untuk Dunia*

</div>
