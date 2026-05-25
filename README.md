# Nanggroe OS AI — Autonomous Robotics Platform

**Sistem Operasi Robotika Otonom Modular — Dari Aceh Untuk Dunia**

[![Version](https://img.shields.io/badge/version-1.0.0-teal.svg)](https://github.com/nanggroe-os/nanggroe-os-ai)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![Tauri](https://img.shields.io/badge/Tauri-v2-orange.svg)](https://tauri.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://typescriptlang.org)

Nanggroe OS AI is a modular autonomous robotics operating system designed to build, control, and manage amphibious robots (tricopter drones, rovers, USVs) with integrated AI. Built with modern web technologies, runs on Raspberry Pi, and supports full offline operation.

---

## Quick Start (Web)

```bash
# Install dependencies
bun install

# Setup database
bun run db:push

# Start development server
bun run dev

# Open in browser at http://localhost:3000
```

---

## Desktop App (Tauri v2)

Nanggroe OS AI can be built as a native desktop application for **Linux** and **Windows** using [Tauri v2](https://tauri.app). The desktop app wraps the Next.js web interface in a native webview window, providing full system access and native OS integration.

### Prerequisites

#### Linux (Debian/Ubuntu)

```bash
# Install Tauri system dependencies
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libssl-dev \
  libclang-dev \
  build-essential \
  pkg-config

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

#### Windows

```bash
# Install Visual Studio Build Tools (C++ workload)
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/

# Install Rust
# Download from: https://rustup.rs/
# Or via winget:
winget install Rustlang.Rustup
```

#### Common

```bash
# Node.js >= 18 or Bun >= 1.0
# The project already includes @tauri-apps/cli and @tauri-apps/api
```

### Development Mode

Run the desktop app in development mode with hot-reload:

```bash
# Start Tauri dev (starts Next.js dev server + native window)
bun run tauri:dev
```

This will:
1. Start the Next.js dev server on port 3000
2. Open a native desktop window loading `http://localhost:3000`
3. Enable hot-reload for both frontend and Rust backend changes

### Build for Production

#### Linux (DEB + AppImage)

```bash
# Build DEB package and AppImage
bun run tauri:build:linux

# Output locations:
# src-tauri/target/release/bundle/deb/nanggroe-os-ai_1.0.0_amd64.deb
# src-tauri/target/release/bundle/appimage/nanggroe-os-ai_1.0.0_amd64.AppImage
```

#### Windows (MSI + NSIS)

```bash
# Build MSI and NSIS installers
bun run tauri:build:windows

# Output locations:
# src-tauri/target/release/bundle/msi/Nanggroe OS AI_1.0.0_x64_en-US.msi
# src-tauri/target/release/bundle/nsis/Nanggroe OS AI_1.0.0_x64-setup.exe
```

#### All Platforms

```bash
# Build for current platform (all bundle targets)
bun run tauri:build
```

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `tauri:dev` | `tauri dev` | Start dev mode with native window |
| `tauri:build` | `tauri build` | Build for current platform |
| `tauri:build:linux` | `tauri build --target deb appimage` | Build Linux packages |
| `tauri:build:windows` | `tauri build --target msi nsis` | Build Windows installers |

### Tauri Configuration

The Tauri configuration is located at `src-tauri/tauri.conf.json`:

| Setting | Value |
|---------|-------|
| **Product Name** | Nanggroe OS AI |
| **Identifier** | com.nanggroe.os-ai |
| **Window Title** | Nanggroe OS AI — Autonomous Robotics Platform |
| **Window Size** | 1440x900 (min: 1024x700) |
| **Dev URL** | http://localhost:3000 |
| **Frontend Dist** | .next/standalone |
| **Shell Plugin** | Enabled (open URLs in default browser) |
| **CSP** | Disabled (null) |

### Project Structure

```
src-tauri/
├── Cargo.toml              # Rust package config (author: Mulky Malikul Dhaher)
├── build.rs                # Tauri build script
├── tauri.conf.json         # Tauri configuration
├── capabilities/
│   └── default.json        # Permission capabilities (core + shell)
├── icons/
│   ├── icon.png            # Source icon (1024x1024)
│   ├── icon.ico            # Windows icon
│   ├── icon.icns           # macOS icon
│   ├── 32x32.png           # 32x32 icon
│   ├── 128x128.png         # 128x128 icon
│   ├── 128x128@2x.png      # 256x256 (HiDPI) icon
│   └── ...                 # Additional platform-specific icons
└── src/
    ├── main.rs             # Entry point (Windows subsystem)
    └── lib.rs              # App logic (Tauri builder, plugins)
```

### Extending the Desktop App

To add Tauri commands (Rust functions callable from JavaScript):

1. **Define a command** in `src-tauri/src/lib.rs`:
```rust
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Nanggroe OS AI.", name)
}
```

2. **Register the command** in the Tauri builder:
```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![greet])
    // ... rest of builder
```

3. **Call from JavaScript**:
```typescript
import { invoke } from '@tauri-apps/api/core';

const greeting = await invoke('greet', { name: 'Operator' });
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `libwebkit2gtk-4.1-dev` not found | Run `sudo apt install libwebkit2gtk-4.1-dev` on Linux |
| Rust not found | Install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Build fails on Windows | Ensure Visual Studio Build Tools with C++ workload is installed |
| Blank window in dev | Make sure Next.js dev server is running on port 3000 |
| Icons missing | Run `npx tauri icon src-tauri/icons/icon.png -o src-tauri/icons` |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Desktop** | Tauri v2 (Rust) |
| **Language** | TypeScript 5 + Rust |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **Database** | Prisma ORM (SQLite) |
| **State** | Zustand (client) + TanStack Query (server) |
| **AI SDK** | z-ai-web-dev-sdk |

---

## Author

**Mulky Malikul Dhaher** — mulkymalikuldhaher@email.com

## License

MIT License
