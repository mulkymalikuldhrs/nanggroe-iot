# 🤖 Nanggroe OS AI

**Sistem Operasi Robotika Otonom Modular — Dari Aceh Untuk Dunia**

[![Version](https://img.shields.io/badge/version-2.0.0-teal.svg)](https://github.com/nanggroe-os/nanggroe-os-ai)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748.svg)](https://prisma.io)

Nanggroe OS AI adalah sistem operasi robotika otonom modular yang dirancang untuk membangun, mengendalikan, dan mengelola robot amfibi (drone tricopter, rover, USV) dengan kecerdasan buatan terintegrasi. Dibangun sepenuhnya dengan teknologi web modern, berjalan di Raspberry Pi, dan mendukung operasi offline penuh.

---

## 📋 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Tech Stack](#-tech-stack)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Instalasi](#-instalasi)
- [Konfigurasi](#-konfigurasi)
- [Panduan Penggunaan](#-panduan-penggunaan)
- [Template Robot](#-template-robot)
- [Kanal Komunikasi](#-kanal-komunikasi)
- [Navigasi](#-navigasi)
- [Manajemen Daya](#-manajemen-daya)
- [AI Memory & Sync](#-ai-memory--sync)
- [Local LLM](#-local-llm)
- [MCP Protocol](#-mcp-protocol)
- [API Reference](#-api-reference)
- [Kompatibilitas Hardware](#-kompatibilitas-hardware)
- [Panduan Flash Firmware](#-panduan-flash-firmware)
- [Pedoman Keselamatan](#-pedoman-keselamatan)
- [Berkontribusi](#-berkontribusi)
- [Lisensi](#-lisensi)

---

## ✨ Fitur Utama

### Dashboard 18 Tab

| # | Tab | Ikon | Deskripsi |
|---|-----|------|-----------|
| 1 | **Overview** | 📊 | Dashboard utama dengan status sistem, telemetry real-time, dan mode operasi |
| 2 | **Telemetry** | 📡 | Data sensor real-time (baterai, GPS, altitude, suhu, dll) dengan grafik |
| 3 | **Missions** | 🗺️ | Manajemen misi (mapping, survey, delivery, patrol, inspection, agriculture) |
| 4 | **Hardware** | 💻 | Deteksi dan manajemen perangkat keras (USB, I²C, SPI, UART) |
| 5 | **AI Agents** | 🤖 | Hermes (strategis) & PicoClaw (taktis) — multi-agent AI system |
| 6 | **MCP Tools** | 🧩 | Model Context Protocol — 6 tools terintegrasi + transport HTTP+SSE |
| 7 | **Calibration** | 🔧 | Kalibrasi compass, accelerometer, gyro, ESC, radio |
| 8 | **Logs** | 📜 | System logs, mission logs, agent messages |
| 9 | **Doctor** | ❤️ | Diagnostik sistem — 9 pemeriksaan kesehatan otomatis |
| 10 | **Assembly** | 🛠️ | Tutorial perakitan langkah-demi-langkah dengan AI troubleshooting |
| 11 | **Drivers** | 💾 | Device Driver Abstraction Layer — 7 driver (Pixhawk, RPi, GPS, Camera, I²C, Radio, Battery) |
| 12 | **Flash** | ⬆️ | Firmware flashing & code deployment — ArduPilot, companion, ESC |
| 13 | **Testing** | 🧪 | AI-powered testing — generate, execute, verify test cases |
| 14 | **Extension** | 🔌 | VSCode/IDE Extension Bridge — snippets, hover docs, API key auth |
| 15 | **Robot Builder** | 🚀 | Template robot, scan hardware, buat project, auto-configure |
| 16 | **Communications** | 💬 | Telegram, Voice/TTS, Android, Beep alerts, GSM, Radio |
| 17 | **Navigation** | 🧭 | GPS tracking, autopilot, RTH, field mapping, delivery |
| 18 | **Power** | 🔋 | Manajemen baterai, solar panel, mode darurat |

### Kemampuan Lainnya

- **SSE Real-Time Streaming** — Telemetry & alert diperbarui otomatis
- **Multi-Agent AI** — Hermes (strategis) + PicoClaw (taktis/safety)
- **Local LLM** — TinyLlama, Phi-2, Llama 3.2, Gemma 2, Qwen 2.5
- **MCP Protocol** — JSON-RPC 2.0, 11 tools, 6 resources, HTTP+SSE transport
- **Offline-First** — Berjalan penuh tanpa internet
- **Cloud Sync** — Sinkronisasi data saat online (AiMemory, telemetry, logs)
- **Voice Control** — Speech-to-text & text-to-speech
- **Telegram Bot** — Kontrol robot via Telegram
- **Android Control** — Aplikasi Android untuk kontrol remote
- **Beep Alerts** — Pola bunyi berbeda untuk setiap situasi (startup, warning, critical, RTH)
- **GSM Module** — Komunikasi darurat via SMS/call
- **GPS Navigation** — Tracking, autopilot, return-to-home
- **Field Mapping** — Pemetaan area dengan overlap configurable
- **Delivery System** — Pengiriman otomatis ke waypoint
- **Face Tracking** — Deteksi & tracking wajah via kamera
- **Amphibious Mode** — Terbang, mengapung, berjalan di darat
- **Solar Emergency** — Charging darurat via solar panel
- **Firmware Flash** — ArduPilot, BLHeli_S, SiK Radio, Nanggroe OS
- **AI Testing** — Generate & execute test cases secara otomatis

---

## 🛠 Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Bahasa** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **Database** | Prisma ORM (SQLite) |
| **State** | Zustand (client) + TanStack Query (server) |
| **Charts** | Recharts |
| **Animasi** | Framer Motion |
| **AI SDK** | z-ai-web-dev-sdk |
| **Icons** | Lucide React |
| **Real-Time** | Server-Sent Events (SSE) |
| **Forms** | React Hook Form + Zod |
| **Auth** | NextAuth.js v4 |
| **Runtime** | Bun |

---

## 🏗 Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                    NANGGROE OS AI v2.0.0                     │
│                  Sistem Operasi Robotika Otonom              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │    API       │  │   Services   │      │
│  │  Next.js 16  │  │  REST + SSE  │  │  TypeScript  │      │
│  │  React 19    │  │  38 Routes   │  │  12 Modules  │      │
│  │  shadcn/ui   │  │              │  │              │      │
│  │  18 Tabs     │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └────────────────┼──────────────────┘              │
│                          │                                 │
│  ┌───────────────────────┴───────────────────────────┐     │
│  │                 Prisma ORM (SQLite)                │     │
│  │  17 Models: SystemConfig, HardwareDevice,          │     │
│  │  HardwareProfile, TelemetryReading, Mission,       │     │
│  │  MissionLog, AgentMessage, Session, Calibration,   │     │
│  │  SyncQueue, Alert, RobotTemplate, RobotProject,    │     │
│  │  CommunicationChannel, NavigationPlan, PowerSource,│     │
│  │  AiMemory, VoiceLog                                │     │
│  └───────────────────────┬───────────────────────────┘     │
│                          │                                 │
│  ┌───────────────────────┴───────────────────────────┐     │
│  │            Hardware Abstraction Layer              │     │
│  │  7 Drivers: Pixhawk, RPi, GPS, Camera, I²C,      │     │
│  │  Radio, Battery                                    │     │
│  └───────────────────────┬───────────────────────────┘     │
│                          │                                 │
│  ┌───────────────────────┴───────────────────────────┐     │
│  │              Physical Hardware                     │     │
│  │  Pixhawk 4 │ RPi 4B │ GPS NEO-M8N │ Camera V2    │     │
│  │  BME280 │ MPU6050 │ SiK Radio │ LiPo 4S │ ESC    │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AI & Communication Layer               │   │
│  │                                                     │   │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │ Hermes  │  │ PicoClaw │  │   Local LLM      │   │   │
│  │  │Strategis│  │ Taktis   │  │ TinyLlama/Phi-2  │   │   │
│  │  └─────────┘  └──────────┘  └──────────────────┘   │   │
│  │                                                     │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  MCP Protocol (JSON-RPC 2.0)                 │   │   │
│  │  │  11 Tools │ 6 Resources │ HTTP+SSE Transport │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │   │
│  │  │Tele- │ │Voice │ │Andro-│ │Beep  │ │ GSM  │    │   │
│  │  │gram  │ │ /TTS │ │id    │ │Alert │ │Module│    │   │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Navigation & Power                     │   │
│  │  GPS │ Autopilot │ RTH │ Field Mapping │ Delivery  │   │
│  │  Battery │ Solar │ GSM Power │ Emergency Mode       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Instalasi

### Prasyarat

- **Node.js** >= 18 atau **Bun** >= 1.0
- **Git**
- **Raspberry Pi 4B/5** (untuk deployment) atau komputer untuk development
- **Pixhawk 4** atau compatible flight controller (untuk operasional)

### Langkah Instalasi

```bash
# 1. Clone repository
git clone https://github.com/nanggroe-os/nanggroe-os-ai.git
cd nanggroe-os-ai

# 2. Install dependencies
bun install

# 3. Setup environment variables
cp .env.example .env
# Edit .env sesuai konfigurasi Anda

# 4. Inisialisasi database
bun run db:push

# 5. Generate Prisma Client
bun run db:generate

# 6. Jalankan development server
bun run dev

# 7. Buka browser
# Akses http://localhost:3000
```

### Instalasi di Raspberry Pi

```bash
# 1. Flash Raspberry Pi OS 64-bit ke MicroSD
# 2. Enable SSH, UART, I2C, Camera via raspi-config
sudo raspi-config
# Interface Options → I2C → Enable
# Interface Options → Serial Port → Disable login shell, Enable hardware
# Interface Options → Camera → Enable

# 3. Install Bun
curl -fsSL https://bun.sh/install | bash

# 4. Clone dan install (sama seperti di atas)
git clone https://github.com/nanggroe-os/nanggroe-os-ai.git
cd nanggroe-os-ai
bun install
bun run db:push
bun run db:generate

# 5. Jalankan sebagai service (production)
bun run build
bun run start

# 6. Opsional: Setup systemd service
sudo nano /etc/systemd/system/nanggroe-os.service
```

Contoh systemd service:

```ini
[Unit]
Description=Nanggroe OS AI
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/nanggroe-os-ai
ExecStart=/home/pi/.bun/bin/bun run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## ⚙️ Konfigurasi

### Environment Variables

Buat file `.env` di root project:

```env
# Database
DATABASE_URL="file:./db/nanggroe.db"

# NextAuth (opsional)
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Telegram Bot (opsional)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

# GSM Module (opsional)
GSM_SERIAL_PORT="/dev/ttyUSB2"
GSM_BAUD_RATE="115200"

# Cloud Sync (opsional)
SYNC_ENDPOINT=""
SYNC_API_KEY=""

# LLM (opsional - untuk cloud AI)
LLM_API_KEY=""
LLM_MODEL="default"
```

### Konfigurasi Sistem

Konfigurasi sistem disimpan di database (`SystemConfig`) dan dapat diubah melalui API:

| Key | Default | Kategori | Deskripsi |
|-----|---------|----------|-----------|
| `system.name` | NANGGROE OS AI | general | Nama sistem |
| `system.version` | 2.0.0 | general | Versi sistem |
| `system.mode` | discovery | general | Mode operasi |
| `system.region` | Aceh Utara | general | Region operasi |
| `system.home_lat` | 4.9125 | general | Latitude home |
| `system.home_lng` | 97.1347 | general | Longitude home |
| `hardware.auto_detect` | true | hardware | Auto-detect hardware |
| `hardware.scan_interval` | 30 | hardware | Interval scan (detik) |
| `agent.hermes.enabled` | true | agent | Agent Hermes aktif |
| `agent.hermes.model` | default | agent | Model AI Hermes |
| `agent.picoclaw.enabled` | true | agent | Agent PicoClaw aktif |
| `agent.picoclaw.check_interval` | 1 | agent | Interval pengecekan (detik) |
| `mission.max_altitude` | 120 | mission | Altitude maksimum (meter) |
| `mission.default_speed` | 5 | mission | Kecepatan default (m/s) |
| `mission.rth_enabled` | true | mission | Return-to-Home aktif |
| `network.offline_mode` | true | network | Mode offline |
| `network.sync_endpoint` | | network | Endpoint cloud sync |

### Mode Operasi

| Mode | Deskripsi |
|------|-----------|
| `discovery` | Mode penemuan — scanning hardware, konfigurasi awal |
| `planning` | Mode perencanaan — desain misi, route optimization |
| `build` | Mode pembangunan — assembly, kalibrasi, testing |
| `debug` | Mode debugging — troubleshooting, log analysis |
| `optimize` | Mode optimasi — tuning parameter, performance |

---

## 📖 Panduan Penggunaan

### Dashboard Overview

Tab **Overview** menampilkan ringkasan status sistem:
- **Mode operasi** saat ini (discovery/planning/build/debug/optimize)
- **Status baterai** — voltage, percentage, estimasi waktu
- **GPS position** — latitude, longitude, altitude, satelit
- **Signal strength** — kekuatan sinyal radio
- **Telemetry real-time** — pembaruan otomatis via SSE setiap 2 detik
- **Alerts** — notifikasi terbaru dari PicoClaw

### AI Agents

Sistem menggunakan dua agent AI yang bekerja bersama:

**Hermes (Strategic Agent)**
- Merancang misi dan rute
- Mengoptimasi parameter penerbangan
- Membuat keputusan tingkat tinggi
- Berkomunikasi via natural language

**PicoClaw (Tactical Agent)**
- Memantau telemetry real-time
- Mengecek ambang batas keselamatan
- Mengeksekusi failsafe (RTH, land, disarm)
- Mengirim alert dan rekomendasi

### Misi

Tipe misi yang didukung:
- **Aerial Mapping** — Pemetaan udara dengan overlap configurable
- **Land Survey** — Survei daratan
- **Delivery** — Pengiriman otomatis ke waypoint
- **Patrol** — Patroli area dengan rute berulang
- **Inspection** — Inspeksi infrastruktur
- **Precision Agriculture** — Pertanian presisi

### System Doctor

9 pemeriksaan diagnostik otomatis:
1. **Database** — Koneksi dan integritas database
2. **Hardware** — Status perangkat keras terdeteksi
3. **Agents** — Status Hermes & PicoClaw
4. **Telemetry** — Ketersediaan data sensor
5. **Battery** — Level dan kesehatan baterai
6. **Signal** — Kekuatan sinyal radio
7. **Calibration** — Status kalibrasi perangkat
8. **Alerts** — Alert aktif dan tidak terbaca
9. **Missions** — Status misi berjalan

---

## 🤖 Template Robot

### Drone Tricopter 3-Baling (Arduino)

**🚁 Amfibi | Intermediate | ~16 jam**

Tricopter drone amfibi dengan 3 baling-baling. Mampu terbang, mengapung di air, dan berjalan di darat.

**Hardware yang Dibutuhkan:**
| Perangkat | Nama | Protocol | Wajib |
|-----------|------|----------|-------|
| Flight Controller | Pixhawk 4 / Arduino Mega 2560 | UART | ✅ |
| Companion Computer | Raspberry Pi 4B | USB | ✅ |
| GPS | u-blox NEO-M8N | UART | ✅ |
| Camera | Raspberry Pi Camera V2 / USB Camera | USB | ✅ |
| Motor | SunnySky V2216 x3 | ESC | ✅ |
| ESC | ESC 30A BLHeli_S x3 | PWM | ✅ |
| Servo | Servo MG996R (yaw tail) | PWM | ✅ |
| Battery | 4S LiPo 4000mAh | ADC | ✅ |
| Radio | SiK Telemetry Radio 433MHz | UART | ✅ |
| Sensor | BME280 | I²C | ✅ |
| Sensor | MPU6050 | I²C | ✅ |
| Sensor | HC-SR04 Ultrasonic | GPIO | Opsional |

**Firmware:**
- Pixhawk: ArduPilot 4.5.7 Tricopter
- Companion: Nanggroe OS 1.2.0
- ESC: BLHeli_S 16.7
- Radio: SiK 2.0

**Kemampuan:**
Face Tracking, Autopilot, RTH, Obstacle Avoidance, Payload Delivery, Field Mapping, Aerial Photography, Amphibious Float, Land Drive, GPS Navigation, Voice Control, Telegram Control, Android Control, AI Assisted, Solar Emergency, GSM Connectivity, Local LLM, Offline Memory, Beep Alerts

**Langkah Assembly (10 langkah):**
1. Siapkan Frame Tricopter (~2 jam)
2. Pasang Motor & ESC (~1.5 jam)
3. Pasang Flight Controller (~1.5 jam)
4. Pasang Companion Computer (~1 jam)
5. Pasang Sensor & GPS (~1 jam)
6. Pasang Sistem Daya (~1 jam)
7. Pasang Sistem Amfibi (~1.5 jam)
8. Pasang Payload & Fitur Tambahan (~1 jam)
9. Flash Firmware (~1 jam)
10. Kalibrasi & Test (~2 jam)

### Rover Darat 4 Roda

**🚗 Rover | Beginner | ~10 jam**

Rover 4 roda untuk survei darat, patroli, dan pengiriman.

**Hardware:** Pixhawk 4, RPi 4B, GPS NEO-M8N, USB Camera, DC Motor + Encoder x4, Sabertooth Motor Driver, 3S LiPo 5000mAh, HC-SR04 x3

**Kemampuan:** GPS Navigation, Obstacle Avoidance, Patrol, Delivery, Field Mapping, Android Control, AI Assisted, Beep Alerts

### Kapal Amfibi USV

**🚤 Boat | Intermediate | ~14 jam**

Kapal permukaan tanpa awak untuk survei sungai dan pemetaan pesisir.

**Hardware:** Pixhawk 4, RPi 4B, GPS NEO-M8N, Brushless Motor x2, ESC 40A x2, 4S LiPo 6000mAh, DS18B20

**Kemampuan:** GPS Navigation, Water Survey, Coastal Mapping, Amphibious Float, Solar Charging, GSM Connectivity, AI Assisted

---

## 💬 Kanal Komunikasi

### Telegram Bot

Kontrol robot via Telegram messenger:

```bash
# Setup
1. Buat bot via @BotFather
2. Dapatkan token
3. Masukkan token ke konfigurasi CommunicationChannel
4. Aktifkan kanal
5. Kirim perintah ke bot: /status, /arm, /disarm, /rth, /land, /mission
```

**Perintah yang didukung:**
- `/status` — Status sistem saat ini
- `/arm` — Arm motor
- `/disarm` — Disarm motor
- `/rth` — Return to Home
- `/land` — Landing
- `/mission start [id]` — Mulai misi
- `/mission stop` — Hentikan misi
- `/telemetry` — Data telemetry terbaru
- `/photo` — Ambil foto
- `/help` — Daftar perintah

### Voice / TTS

Kontrol robot via suara:

- **Input:** Speech-to-text untuk perintah suara
- **Output:** Text-to-speech untuk respons dan alert
- **Bahasa:** Bahasa Indonesia (id) dan English (en)
- **Agent:** Hermes dan PicoClaw dapat merespons via suara

### Android Control

Aplikasi Android untuk kontrol remote:

- Kontrol joystick real-time
- Monitoring telemetry
- View kamera live
- Manajemen misi
- Notifikasi alert

### Beep Alerts

Pola bunyi berbeda untuk setiap situasi:

| Pola | Nama | Frekuensi | Deskripsi |
|------|------|-----------|-----------|
| `[100,50,100,50,200]` | Startup | 2000 Hz | Sistem menyala |
| `[200,100,200]` | Warning | 1500 Hz | Peringatan |
| `[500,200,500,200,500]` | Critical | 3000 Hz | Bahaya kritis |
| `[100,50,100,50,400]` | Success | 2500 Hz | Operasi berhasil |
| `[300,300,300]` | Land | 1000 Hz | Landing |
| `[200,100,200,100,200,100,400]` | RTH | 1800 Hz | Return to Home |
| `[100,50,200]` | Arm | 2200 Hz | Motor armed |
| `[200,50,100]` | Disarm | 1200 Hz | Motor disarmed |

### GSM Module

Komunikasi darurat via SMS/call:

- Kirim SMS alert saat kehilangan koneksi radio
- Terima perintah via SMS
- Emergency call ke operator
- Gunakan SIM800L atau module GSM compatible

---

## 🧭 Navigasi

### GPS Tracking

- Tracking posisi real-time via u-blox NEO-M8N
- Multi-constellation: GPS, GLONASS, Galileo, BeiDou
- Akurasi ~2.5m (open sky)
- Data: latitude, longitude, altitude, heading, speed, satelit

### Autopilot

Mode autopilot yang didukung:

| Mode | Deskripsi |
|------|-----------|
| **Stabilize** | Stabilisasi manual dengan level |
| **Altitude Hold** | Mempertahankan altitude, kontrol manual |
| **Loiter** | GPS hold — posisi & altitude tetap |
| **Auto** | Ikuti waypoint misi |
| **RTL** | Return to Launch — kembali ke home |
| **Land** | Landing otomatis di posisi saat ini |

### Return to Home (RTH)

Fitur keselamatan otomatis:
- Trigger saat sinyal radio hilang
- Trigger saat baterai rendah (configurable threshold)
- Trigger saat GPS lock hilang
- Trigger manual via API/TUI/Telegram
- Rute: naik ke safe altitude → terbang ke home → landing

### Field Mapping

Pemetaan area dengan parameter configurable:
- **Overlap Front:** 75% (default, adjustable)
- **Overlap Side:** 65% (default, adjustable)
- **GSD (Ground Sampling Distance):** Dihitung otomatis berdasarkan altitude dan kamera
- **Area:** Polygon area untuk mapping
- **Output:** Estimasi jumlah foto, waktu, area cakupan

### Delivery

Sistem pengiriman otomatis:
- Definisikan waypoint pengiriman
- Payload drop mechanism via servo
- Konfirmasi delivery via sensor/camera
- Rute optimasi oleh Hermes

---

## 🔋 Manajemen Daya

### Battery

Monitoring baterai real-time:
- **Voltage:** Monitoring per-cell dan total
- **Current:** Arus penggunaan saat ini
- **Capacity:** Kapasitas tersisa (mAh)
- **Percentage:** Persentase tersisa
- **Temperature:** Suhu baterai
- **Estimasi:** Waktu tersisa berdasarkan konsumsi

**Threshold keselamatan (PicoClaw):**
| Metrik | Warning | Critical |
|--------|---------|----------|
| Battery Voltage | < 13.2V | < 12.6V |
| Current Draw | > 25A | > 30A |

### Solar Panel

Charging darurat via solar panel:
- **Panel:** 5W compact solar panel
- **Charge Controller:** MPPT/PWM charge controller
- **Mode:** Emergency charging saat baterai rendah
- **Monitoring:** Voltage dan current dari solar panel

### Emergency Mode

Saat baterai mendekati level critical:
1. PicoClaw mengirim alert **WARNING**
2. Hermes mempersiapkan RTH
3. Non-essential systems dimatikan
4. Solar emergency charging diaktifkan (jika tersedia)
5. Pada level **CRITICAL** → RTH otomatis dijalankan

---

## 🧠 AI Memory & Sync

### AI Memory

Sistem memori AI yang menyimpan dan mengingat konteks:

**Kategori:**
| Kategori | Deskripsi |
|----------|-----------|
| Conversation | Riwayat percakapan dengan agent |
| Decision | Keputusan yang dibuat oleh AI |
| Learning | Pembelajaran dari pengalaman |
| Pattern | Pola yang dikenali |
| Preference | Preferensi operator |

**Fitur:**
- `remember(key, value, category)` — Simpan memori
- `recall(key)` — Ambil memori
- `search(query)` — Cari memori berdasarkan kata kunci
- `forget(key)` — Hapus memori
- Confidence score (0-1) untuk setiap memori
- Access count tracking
- Context-aware retrieval

### Cloud Sync

Sinkronisasi data saat online:
- **Sync Queue:** Perubahan di-antri saat offline
- **Entity Types:** mission, telemetry, log, calibration, config
- **Actions:** create, update, delete
- **Retry:** Auto-retry dengan backoff
- **Conflict Resolution:** Last-write-wins

---

## 🦙 Local LLM

Menjalankan model AI langsung di Raspberry Pi tanpa internet:

| Model | Ukuran | RAM | Deskripsi | Kompatibel |
|-------|--------|-----|-----------|------------|
| **TinyLlama 1.1B** | 700MB | 2GB | Model kecil, respons cepat | Pi 4B, Pi 5 |
| **Phi-2 2.7B** | 1.8GB | 4GB | Keseimbangan kecepatan & kualitas | Pi 5, Jetson |
| **Llama-3.2-1B** | 800MB | 2GB | Meta Llama 3.2, multilingual | Pi 4B, Pi 5 |
| **Gemma-2-2B** | 1.4GB | 3GB | Google Gemma 2, efisien edge | Pi 4B, Pi 5 |
| **Qwen2.5-1.5B** | 1.0GB | 2.5GB | Multi-bahasa, termasuk Indonesia | Pi 4B, Pi 5 |

**Rekomendasi:**
- **Pi 4B (4GB):** TinyLlama 1.1B atau Llama-3.2-1B
- **Pi 5 (8GB):** Phi-2 2.7B atau Qwen2.5-1.5B
- **Jetson Nano:** Phi-2 2.7B (GPU acceleration)

**Cara penggunaan:**
```bash
# Install llama.cpp di Raspberry Pi
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp && make

# Download model
wget https://huggingface.co/TheBloke/TinyLlama-1.1B-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf

# Jalankan server
./server -m tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf --host 0.0.0.0 --port 8080

# Nanggroe OS akan otomatis terhubung ke localhost:8080
```

---

## 🔗 MCP Protocol

Model Context Protocol (MCP) — standar komunikasi antara AI dan tools:

### Spesifikasi
- **Versi:** 2024-11-05
- **Transport:** HTTP + SSE (Server-Sent Events)
- **Format:** JSON-RPC 2.0
- **Session:** UUID-based session management

### Tools Tersedia

| Tool | Deskripsi |
|------|-----------|
| `mavlink_command` | Kirim perintah MAVLink ke flight controller |
| `telemetry_query` | Query data telemetry dari database |
| `mission_generate` | Generate misi dari natural language prompt |
| `hardware_diagnostic` | Diagnosa perangkat keras |
| `calibration_control` | Kontrol proses kalibrasi |
| `safety_assessment` | Evaluasi keselamatan operasi |

### Resources

| Resource | Deskripsi |
|----------|-----------|
| `system://status` | Status sistem saat ini |
| `telemetry://latest` | Data telemetry terbaru |
| `mission://active` | Misi aktif |
| `hardware://devices` | Daftar perangkat terdeteksi |
| `calibration://status` | Status kalibrasi |
| `safety://report` | Laporan keselamatan |

### Endpoint Transport
```
GET  /api/mcp/transport          — SSE connection untuk MCP messages
POST /api/mcp/transport          — Kirim JSON-RPC message
```

---

## 📡 API Reference

### System

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/system` | Status sistem |
| GET | `/api/route` | Health check |
| GET | `/api/bootflow` | Boot flow status |

### Telemetry

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/telemetry` | Data telemetry |
| GET | `/api/stream/telemetry` | SSE telemetry stream (2s) |

### Missions

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/missions` | Daftar misi |
| POST | `/api/missions` | Buat misi baru |
| GET | `/api/missions/[id]` | Detail misi |
| PUT | `/api/missions/[id]` | Update misi |
| DELETE | `/api/missions/[id]` | Hapus misi |

### Hardware

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/hardware` | Daftar perangkat |
| POST | `/api/hardware` | Scan hardware |

### Agents

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/agents` | Daftar agent & messages |
| POST | `/api/agents/chat` | Chat dengan agent |

### LLM

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/llm/chat` | Chat dengan LLM (stream/non-stream) |

### MCP

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/mcp` | Daftar MCP tools |
| POST | `/api/mcp` | Eksekusi MCP tool |
| GET | `/api/mcp/transport` | MCP SSE transport |
| POST | `/api/mcp/transport` | MCP JSON-RPC message |

### Robot Templates

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/robot-templates` | Daftar template robot |
| GET | `/api/robot-templates/[id]` | Detail template |

### Projects

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/projects` | Daftar project |
| POST | `/api/projects` | Buat project baru |
| GET | `/api/projects/[id]` | Detail project |
| DELETE | `/api/projects/[id]` | Hapus project |

### Auto-Detect

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auto-detect` | Scan & auto-configure hardware |

### Communication

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/comms` | Daftar kanal komunikasi |
| GET | `/api/comms/[id]` | Detail kanal |
| PUT | `/api/comms/[id]` | Update kanal |
| POST | `/api/comms/telegram` | Proses perintah Telegram |
| POST | `/api/comms/voice` | Proses input suara |
| POST | `/api/comms/beep` | Kirim beep pattern |

### Navigation

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/navigation` | Daftar rencana navigasi |
| POST | `/api/navigation` | Buat rencana navigasi |
| GET | `/api/navigation/[id]` | Detail rencana |
| PUT | `/api/navigation/[id]` | Update rencana |
| DELETE | `/api/navigation/[id]` | Hapus rencana |

### Power

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/power` | Status daya |
| PUT | `/api/power` | Update pembacaan daya |

### AI Memory

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/ai-memory` | Query memori AI |
| POST | `/api/ai-memory` | Simpan memori |
| DELETE | `/api/ai-memory` | Hapus memori |

### Alerts

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/alerts` | Daftar alert |
| GET | `/api/stream/alerts` | SSE alert stream (5s) |

### Calibration

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/calibration` | Status kalibrasi |
| POST | `/api/calibration` | Mulai kalibrasi |

### Doctor

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/doctor` | Jalankan diagnostik sistem |

### Assembly

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/assembly` | Panduan assembly |
| POST | `/api/assembly` | AI troubleshooting |

### Drivers

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/drivers` | Daftar driver |
| POST | `/api/drivers` | Install driver |
| PUT | `/api/drivers` | Update driver |
| DELETE | `/api/drivers` | Uninstall driver |

### Flash

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/flash` | Status firmware |
| POST | `/api/flash` | Flash firmware |
| PUT | `/api/flash` | Deploy code |

### Testing

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/testing` | Status testing |
| POST | `/api/testing` | Generate test |
| PUT | `/api/testing` | Execute test |
| DELETE | `/api/testing` | Hapus test |
| GET | `/api/stream/testing` | SSE testing stream |

### Extension

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/extension` | Daftar extension |
| POST | `/api/extension` | Register extension |
| PUT | `/api/extension` | Update extension |
| DELETE | `/api/extension` | Hapus extension |

---

## 🔧 Kompatibilitas Hardware

### Flight Controller

| Perangkat | Protocol | Status | Catatan |
|-----------|----------|--------|---------|
| Pixhawk 4 | UART/USB | ✅ Didukung | FC utama, ArduPilot |
| Pixhawk 6C | UART/USB | ✅ Didukung | Alternatif modern |
| Cube Orange | UART/USB | ✅ Didukung | Industrial grade |
| Arduino Mega 2560 | UART/USB | ⚠️ Terbatas | Untuk tricopter sederhana |

### Companion Computer

| Perangkat | Protocol | Status | Catatan |
|-----------|----------|--------|---------|
| Raspberry Pi 4B | USB/UART | ✅ Didukung | Rekomendasi utama |
| Raspberry Pi 5 | USB/UART | ✅ Didukung | Performa lebih tinggi |
| Jetson Nano | USB/UART | ✅ Didukung | GPU acceleration |

### GPS

| Perangkat | Protocol | Status | Catatan |
|-----------|----------|--------|---------|
| u-blox NEO-M8N | UART | ✅ Didukung | GPS utama |
| u-blox NEO-M9N | UART | ✅ Didukung | Akurasi lebih tinggi |
| u-blox M10 | UART | ✅ Didukung | Generasi terbaru |

### Sensor

| Perangkat | Protocol | Address | Fungsi |
|-----------|----------|---------|--------|
| BME280 | I²C | 0x76 | Suhu, kelembaban, tekanan |
| MPU6050 | I²C | 0x68 | Accelerometer, gyroscope |
| HC-SR04 | GPIO | — | Ultrasonic distance |
| DS18B20 | GPIO | — | Water temperature |
| TF-Luna | UART/I²C | — | LiDAR distance |

### Radio & Komunikasi

| Perangkat | Protocol | Status | Catatan |
|-----------|----------|--------|---------|
| SiK Telemetry Radio 433MHz | UART | ✅ Didukung | Radio utama |
| SIM800L GSM | UART | ✅ Didukung | Komunikasi darurat |
| ESP32-CAM | WiFi | ⚠️ Terbatas | Camera + WiFi |

### Motor & ESC

| Perangkat | Protocol | Status | Catatan |
|-----------|----------|--------|---------|
| SunnySky V2216 (KV900) | ESC/PWM | ✅ Didukung | Motor tricopter |
| T-Motor MN2214 | ESC/PWM | ✅ Didukung | Alternatif |
| EMax RS2205 | ESC/PWM | ✅ Didukung | Alternatif |
| BLHeli_S 30A ESC | PWM/DShot | ✅ Didukung | ESC utama |
| Sabertooth 2x32A | UART | ✅ Didukung | Motor driver rover |

### Daya

| Perangkat | Kapasitas | Status | Catatan |
|-----------|-----------|--------|---------|
| 4S LiPo 4000mAh | 14.8V | ✅ Didukung | Baterai drone |
| 4S LiPo 6000mAh | 14.8V | ✅ Didukung | Baterai extended |
| 3S LiPo 5000mAh | 11.1V | ✅ Didukung | Baterai rover |
| Solar Panel 5W | 5V USB | ✅ Didukung | Charging darurat |

---

## ⬆️ Panduan Flash Firmware

### ArduPilot ke Pixhawk

```bash
# Via Mission Planner (GUI)
1. Hubungkan Pixhawk via USB
2. Buka Mission Planner / QGroundControl
3. Setup → Install Firmware
4. Pilih "Tricopter" / "Rover" / "Boat"
5. Tunggu proses selesai

# Via Command Line (headless)
1. Download firmware dari ardupilot.org
2. Gunakan uploader:
   python3 -m uploader --port /dev/ttyACM0 arducopter.px4
3. Tunggu konfirmasi "Upload complete"
```

### Nanggroe OS ke Raspberry Pi

```bash
# 1. Download image
wget https://releases.nanggroe.os/nanggroe-os-1.2.0.img.gz

# 2. Flash ke MicroSD
gunzip -c nanggroe-os-1.2.0.img.gz | sudo dd of=/dev/sdX bs=4M status=progress

# 3. Konfigurasi (opsional)
# Mount boot partition, edit nanggroe.conf

# 4. Boot Raspberry Pi dari MicroSD
# Nanggroe OS akan auto-start pada port 3000
```

### BLHeli_S ke ESC

```bash
# Via BLHeli Suite
1. Hubungkan ESC via USB linker atau one-wire
2. Buka BLHeli Suite
3. Pilih ESC target
4. Flash firmware BLHeli_S 16.7
5. Konfigurasi parameter (bidirectional DShot, etc)

# Via Passthrough (dari Pixhawk)
1. Hubungkan Pixhawk via USB
2. Buka BLHeli Suite
3. Pilih "BLHeli Passthrough"
4. Flash semua ESC sekaligus
```

### SiK ke Radio Telemetry

```bash
# Via Mission Planner
1. Hubungkan satu radio via USB (ground)
2. Buka Mission Planner
3. Setup → Optional Hardware → SiK Radio
4. Klik "Upload Firmware"
5. Tunggu selesai, lalu konfigurasi parameter
```

### Panduan Flash dari Dashboard

Tab **Flash** di dashboard menyediakan:
- **Firmware Flash:** ArduPilot, Nanggroe OS, BLHeli_S, SiK
- **Code Deploy:** Deploy kode Python/TypeScript ke companion computer
- **Progress Tracking:** 8-step flash process dengan status real-time
- **Verification:** Otomatis verifikasi setelah flash

---

## ⚠️ Pedoman Keselamatan

### Aturan Utama

> **⚠️ SELALU LEPAS PROPELLER saat melakukan test motor!**
>
> **⚠️ PERIKSA POLARITAS SEBELUM POWER ON!**
>
> **⚠️ JANGAN PERNAH terbang di atas orang atau kendaraan!**

### Pre-Flight Checklist

- [ ] Baterai terisi penuh (> 14.0V untuk 4S)
- [ ] GPS lock (minimal 7 satelit, HDOP < 2.0)
- [ ] Compass terkalibrasi
- [ ] Accelerometer terkalibrasi
- [ ] Radio link aktif dan kuat (> -70 dBm)
- [ ] RTH terkonfigurasi (home position benar)
- [ ] Geofence aktif
- [ ] Cuaca baik (angin < 10 m/s, tidak hujan)
- [ ] Area terbang aman (bebas orang, bangunan, dan zona larangan)
- [ ] Emergency stop accessible

### Threshold Keselamatan (PicoClaw)

| Metrik | Warning | Critical | Aksi |
|--------|---------|----------|------|
| Battery Voltage | < 13.2V | < 12.6V | Warning → RTH → Emergency Land |
| Signal Strength | < -70 dBm | < -80 dBm | Warning → RTH |
| Altitude | > 110m | > 120m | Warning → Descend |
| Temperature | > 40°C | > 50°C | Warning → Reduce load |
| Current Draw | > 25A | > 30A | Warning → Reduce throttle |
| Speed | > 12 m/s | > 15 m/s | Warning → Reduce speed |

### Emergency Procedures

**Loss of Radio Link:**
1. PicoClaw mendeteksi signal < -80 dBm
2. RTH otomatis diaktifkan setelah 5 detik
3. Robot kembali ke home position
4. Landing otomatis di home

**Low Battery:**
1. PicoClaw mendeteksi voltage < 13.2V → Warning alert
2. Hermes menyiapkan RTH
3. Voltage < 12.6V → RTH otomatis
4. Non-essential systems dimatikan
5. Emergency landing jika perlu

**GPS Loss:**
1. PicoClaw mendeteksi GPS lock hilang
2. Mode berubah ke Altitude Hold (stabil di tempat)
3. Alert dikirim ke operator
4. Jika GPS kembali dalam 30s → lanjut misi
5. Jika tidak → RTH menggunakan last known position

### Zona Operasi

- **Max Altitude:** 120 meter (sesuai regulasi Indonesia)
- **Max Range:** 1 km (radio SiK) atau sesuai regulasi
- **Geofence:** Wajib diaktifkan untuk semua misi
- **No-Fly Zone:** Selalu patuhi zona larangan terbang

---

## 🤝 Berkontribusi

Kami menyambut kontribusi dari siapa saja! Berikut cara berkontribusi:

### Cara Berkontribusi

1. **Fork** repository ini
2. **Buat branch** fitur baru: `git checkout -b fitur/nama-fitur`
3. **Commit** perubahan: `git commit -m 'Tambah fitur X'`
4. **Push** ke branch: `git push origin fitur/nama-fitur`
5. **Buat Pull Request**

### Panduan Kode

- Gunakan **TypeScript** untuk semua kode
- Ikuti konvensi **ESLint** yang sudah dikonfigurasi
- Tulis kode yang bersih dan terdokumentasi
- Gunakan komponen **shadcn/ui** yang sudah ada
- Jangan gunakan data mock/simulasi
- Pastikan `bun run lint` lulus tanpa error

### Struktur Project

```
nanggroe-os-ai/
├── prisma/
│   └── schema.prisma          # Database schema (17 models)
├── src/
│   ├── app/
│   │   ├── api/               # 38 API routes
│   │   │   ├── agents/        # AI agents
│   │   │   ├── ai-memory/     # AI memory
│   │   │   ├── alerts/        # Alerts
│   │   │   ├── assembly/      # Assembly guide
│   │   │   ├── auto-detect/   # Hardware auto-detect
│   │   │   ├── bootflow/      # Boot flow
│   │   │   ├── calibration/   # Calibration
│   │   │   ├── comms/         # Communication channels
│   │   │   ├── doctor/        # System diagnostics
│   │   │   ├── drivers/       # Device drivers
│   │   │   ├── extension/     # IDE extension
│   │   │   ├── flash/         # Firmware flash
│   │   │   ├── hardware/      # Hardware management
│   │   │   ├── llm/           # LLM chat
│   │   │   ├── mcp/           # MCP protocol
│   │   │   ├── missions/      # Mission management
│   │   │   ├── navigation/    # Navigation plans
│   │   │   ├── power/         # Power management
│   │   │   ├── projects/      # Robot projects
│   │   │   ├── robot-templates/ # Robot templates
│   │   │   ├── stream/        # SSE streams
│   │   │   ├── system/        # System config
│   │   │   ├── telemetry/     # Telemetry data
│   │   │   └── testing/       # AI testing
│   │   └── page.tsx           # Main page
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── Dashboard.tsx      # Main dashboard (18 tabs)
│   │   ├── OverviewTab.tsx    # Overview dashboard
│   │   ├── TelemetryTab.tsx   # Telemetry monitoring
│   │   ├── MissionsTab.tsx    # Mission management
│   │   ├── HardwareTab.tsx    # Hardware management
│   │   ├── AgentsTab.tsx      # AI agents
│   │   ├── McpTab.tsx         # MCP tools
│   │   ├── CalibrationTab.tsx # Calibration
│   │   ├── LogsTab.tsx        # System logs
│   │   ├── DoctorTab.tsx      # System doctor
│   │   ├── AssemblyTab.tsx    # Assembly guide
│   │   ├── DriversTab.tsx     # Device drivers
│   │   ├── FlashTab.tsx       # Firmware flash
│   │   ├── TestingTab.tsx     # AI testing
│   │   ├── ExtensionTab.tsx   # IDE extension
│   │   ├── RobotBuilderTab.tsx # Robot builder
│   │   ├── CommsTab.tsx       # Communications
│   │   ├── NavigationTab.tsx  # Navigation
│   │   └── PowerTab.tsx       # Power management
│   ├── hooks/
│   │   └── use-sse.ts         # SSE hook with auto-reconnect
│   └── lib/
│       ├── agents.ts          # Agent system (Hermes, PicoClaw)
│       ├── ai-memory.ts       # AI memory service
│       ├── communication.ts   # Communication service
│       ├── constants.ts       # System constants
│       ├── db.ts              # Prisma client
│       ├── drivers.ts         # Device driver layer
│       ├── extension.ts       # Extension bridge
│       ├── flash.ts           # Firmware flash service
│       ├── llm.ts             # Multi-model LLM service
│       ├── mcp.ts             # MCP protocol server
│       ├── navigation.ts      # Navigation service
│       ├── power.ts           # Power management service
│       ├── robot-templates.ts # Robot template service
│       ├── seed.ts            # Database seeder
│       ├── telemetry.ts       # Telemetry engine
│       ├── testing.ts         # AI testing service
│       ├── types.ts           # TypeScript type definitions
│       └── utils.ts           # Utility functions
├── db/
│   └── nanggroe.db            # SQLite database
└── package.json
```

### Report Bug

Jika menemukan bug, silakan buat issue dengan format:

```
**Deskripsi Bug:**
[Jelaskan bug]

**Langkah Reproduksi:**
1. ...
2. ...

**Expected Behavior:**
[Yang seharusnya terjadi]

**Actual Behavior:**
[Yang terjadi]

**Environment:**
- OS: [Raspberry Pi OS / Ubuntu / ...]
- Node/Bun version: [versi]
- Nanggroe OS version: [versi]
```

---

## 📄 Lisensi

```
MIT License

Copyright (c) 2024-2025 Nanggroe OS AI

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

## 🏝️ Tentang Nanggroe OS

Nanggroe OS AI dikembangkan di **Aceh Utara, Aceh, Indonesia** sebagai platform robotika otonom yang terjangkau dan modular. Tujuan utama project ini adalah memberdayakan komunitas lokal dengan teknologi robotika yang dapat diakses dan dimodifikasi.

**Home Position:** 4.9125°N, 97.1347°E

**Region:** Aceh Utara — Aceh — Indonesia 🇮🇩

---

*Dibangun dengan ❤️ dari Aceh untuk dunia*
