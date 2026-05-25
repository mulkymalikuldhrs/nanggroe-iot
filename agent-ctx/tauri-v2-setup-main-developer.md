# Task: Set Up Tauri v2 for Nanggroe OS AI Desktop Apps

## Summary

Successfully initialized and configured Tauri v2 for the Nanggroe OS AI project to build Linux and Windows desktop applications.

## Files Created/Updated

### 1. Tauri Configuration
- **`src-tauri/tauri.conf.json`** — Complete Tauri v2 config with:
  - Product name: "Nanggroe OS AI"
  - Identifier: `com.nanggroe.os-ai`
  - Window: 1440x900 (min 1024x700), centered, resizable
  - Title: "Nanggroe OS AI — Autonomous Robotics Platform"
  - Shell plugin enabled (open URLs in default browser)
  - Linux: DEB depends (libwebkit2gtk-4.1-dev, libgtk-3-dev), AppImage config
  - Windows: WebView2 download bootstrapper
  - withGlobalTauri: true (Tauri APIs available globally)

### 2. Rust Backend
- **`src-tauri/Cargo.toml`** — Package config with:
  - Name: `nanggroe-os-ai`
  - Version: 1.0.0
  - Author: Mulky Malikul Dhaher <mulkymalikuldhaher@email.com>
  - Dependencies: tauri v2, tauri-plugin-shell, tauri-plugin-log, serde, serde_json, log
  - Features: custom-protocol (for production builds)

- **`src-tauri/src/main.rs`** — Entry point with Windows subsystem attribute
- **`src-tauri/src/lib.rs`** — App logic with shell plugin + log plugin (debug mode)
- **`src-tauri/build.rs`** — Tauri build script

### 3. Capabilities
- **`src-tauri/capabilities/default.json`** — Permissions for core:default and shell:allow-open

### 4. Icons
- **`src-tauri/icons/icon.png`** — AI-generated 1024x1024 source icon
- All platform icons generated via `npx tauri icon`:
  - 32x32.png, 128x128.png, 128x128@2x.png, 64x64.png
  - icon.ico (Windows), icon.icns (macOS)
  - Square30x30Logo.png through Square310x310Logo.png
  - StoreLogo.png
  - iOS and Android icons

### 5. Package Scripts
- **`package.json`** — Added Tauri scripts:
  - `tauri:dev` — Start dev mode with native window
  - `tauri:build` — Build for current platform
  - `tauri:build:linux` — Build DEB + AppImage
  - `tauri:build:windows` — Build MSI + NSIS

### 6. Documentation
- **`README.md`** — Root README with comprehensive desktop app build section

## Build Commands

```bash
# Development
bun run tauri:dev

# Production builds
bun run tauri:build:linux    # DEB + AppImage
bun run tauri:build:windows  # MSI + NSIS
bun run tauri:build          # Current platform
```

## Prerequisites for Building

### Linux
```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Windows
- Visual Studio Build Tools (C++ workload)
- Rust via https://rustup.rs/

## Notes
- The project already had `@tauri-apps/api` (v2.11.0) and `@tauri-apps/cli` (v2.11.2) in dependencies
- Tauri v2 uses lib.rs pattern with mobile_entry_point attribute
- Shell plugin allows opening URLs in the default browser from the app
- Log plugin is configured for debug builds only (Info level, targets: LogDir, Stdout, Webview)
