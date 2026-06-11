<a href="https://github.com/mulkymalikuldhrs/nanggroe-iot">
  <img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=0:0a1a0a,50:0d2a0d,100:103a10&height=200&section=header&text=Nanggroe%20IoT&fontSize=42&fontColor=22c55e&animation=fadeIn&fontAlignY=30&desc=Modular%20IoT%20%26%20Robotics%20Platform&descSize=16&descColor=a3e635&descAlignY=50" />
</a>

<div align="center">

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&size=20&duration=3000&pause=1000&color=22c55e&center=true&vCenter=true&width=700&lines=Modular+IoT+%2B+Robotics+Platform;Real-Time+Hardware+Control+%26+Monitoring;TypeScript-Powered+Device+Orchestration;WebSocket-Driven+Live+Data+Streaming)](https://git.io/typing-svg)

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://github.com/mulkymalikuldhrs/nanggroe-iot)
[![IoT](https://img.shields.io/badge/IoT-Platform-22c55e?style=for-the-badge&logo=iot&logoColor=white)](https://github.com/mulkymalikuldhrs/nanggroe-iot)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-ffa500?style=for-the-badge&logo=websocket&logoColor=white)](https://github.com/mulkymalikuldhrs/nanggroe-iot)
[![Version](https://img.shields.io/badge/Version-1.0.0-22c55e?style=for-the-badge&logo=semver&logoColor=white)](https://github.com/mulkymalikuldhrs/nanggroe-iot)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](LICENSE)

<br/>

[![GitHub Stars](https://img.shields.io/github/stars/mulkymalikuldhrs/nanggroe-iot?style=for-the-badge&logo=github&color=gold)](https://github.com/mulkymalikuldhrs/nanggroe-iot/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/mulkymalikuldhrs/nanggroe-iot?style=for-the-badge&logo=github&color=blue)](https://github.com/mulkymalikuldhrs/nanggroe-iot/fork)
[![GitHub Issues](https://img.shields.io/github/issues/mulkymalikulhrs/nanggroe-iot?style=for-the-badge&logo=github&color=red)](https://github.com/mulkymalikuldhrs/nanggroe-iot/issues)

</div>

---

## Overview

Nanggroe IoT is a modular IoT and robotics platform with real-time hardware control and monitoring. Built with TypeScript, it provides a unified dashboard for managing IoT devices, streaming sensor data, and controlling hardware components through a responsive web interface. The platform leverages WebSocket connections for bi-directional, low-latency communication between devices and the control plane, enabling instant command dispatch and live telemetry visualization.

Whether you're orchestrating a fleet of sensors, controlling robotic actuators, or building a smart-environment dashboard — Nanggroe IoT provides the modular foundation to connect, monitor, and command your hardware with precision.

## Features

- **Device Management** — Register, configure, and monitor IoT devices from a central dashboard with auto-discovery support
- **Real-Time Control** — Send commands to hardware components via WebSocket connections with sub-second latency and guaranteed delivery acknowledgment
- **Sensor Dashboard** — Visualize sensor data with real-time charts, configurable alert thresholds, and historical trend analysis
- **Modular Architecture** — Plugin-based system that allows you to add new device drivers, protocols, and UI widgets without touching the core
- **Robotics Integration** — Control servo motors, actuators, and robotic arms with precision command scheduling and state feedback loops
- **Alert & Automation Engine** — Define rule-based triggers that automatically respond to sensor threshold breaches with configurable actions

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Nanggroe IoT Platform                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Web Client  │    │  Mobile App  │    │   CLI Tool   │      │
│  │  (Dashboard)  │    │  (Remote)    │    │  (Terminal)  │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                   │
│                    ┌────────▼────────┐                          │
│                    │   API Gateway   │                          │
│                    │  (REST + WS)    │                          │
│                    └────────┬────────┘                          │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐               │
│         │                   │                   │               │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐        │
│  │   Device     │  │    Sensor    │  │  Automation  │        │
│  │  Manager     │  │   Pipeline   │  │   Engine     │        │
│  │              │  │              │  │              │        │
│  │ • Register   │  │ • Ingest     │  │ • Rules      │        │
│  │ • Config     │  │ • Transform  │  │ • Triggers   │        │
│  │ • Monitor    │  │ • Store      │  │ • Actions    │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                │
│         └──────────────────┼──────────────────┘                │
│                            │                                    │
│                   ┌────────▼────────┐                          │
│                   │  Protocol Layer │                          │
│                   │                 │                          │
│                   │ • MQTT  • CoAP  │                          │
│                   │ • HTTP  • WS    │                          │
│                   │ • Serial • BLE  │                          │
│                   └────────┬────────┘                          │
│                            │                                    │
│              ┌─────────────┼─────────────┐                     │
│              │             │             │                     │
│       ┌──────▼──┐   ┌────▼────┐   ┌────▼────┐               │
│       │ Sensor  │   │ Actuator│   │ Robot   │               │
│       │ Nodes   │   │ Modules │   │ Arms    │               │
│       └─────────┘   └─────────┘   └─────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture & Data Flow Visualizations

### IoT Hub Architecture — Multi-Protocol Device Layer

```mermaid
graph TB
    subgraph Clients["Client Layer"]
        Web["Web Dashboard<br/>Next.js 16"]
        Android["Android App<br/>Capacitor"]
        Desktop["Desktop App<br/>Tauri"]
    end

    subgraph Gateway["API Gateway"]
        REST["REST API<br/>HTTP Endpoints"]
        WS_GW["WebSocket Gateway<br/>Socket.io"]
        Auth["Auth & Session<br/>JWT Tokens"]
    end

    subgraph Core["Core Services"]
        Device_Mgr["Device Manager<br/>Register / Config"]
        Sensor_Pipe["Sensor Pipeline<br/>Ingest / Transform"]
        Auto_Engine["Automation Engine<br/>Rules / Triggers"]
        Notif["Notification Service<br/>Alerts / Events"]
    end

    subgraph Protocol["Protocol Layer"]
        MQTT_Broker["MQTT Broker<br/>Pub/Sub"]
        CoAP_Server["CoAP Server<br/>Observe/Notify"]
        HTTP_Endpoint["HTTP Endpoints<br/>REST Polling"]
        Serial_Port["Serial Port<br/>UART / RS232"]
        BLE_Gateway["BLE Gateway<br/>GATT Services"]
    end

    subgraph Devices["Device Layer"]
        Sensors["Sensor Nodes<br/>Temp / Humidity / Motion"]
        Actuators["Actuator Modules<br/>Relays / Motors"]
        Robots["Robot Controllers<br/>Arms / Drones"]
        Microcontrollers["MCU Boards<br/>ESP32 / Arduino"]
    end

    Clients --> Gateway
    REST --> Core
    WS_GW --> Core
    Auth --> Core
    Core --> Protocol
    Protocol --> Devices

    style Clients fill:#0d2137,stroke:#22d3ee,color:#e0f2fe
    style Gateway fill:#1a1a2e,stroke:#8b5cf6,color:#e9d5ff
    style Core fill:#064e3b,stroke:#10b981,color:#d1fae5
    style Protocol fill:#4a1d0a,stroke:#f59e0b,color:#fef3c7
    style Devices fill:#1c1917,stroke:#78716c,color:#fef3c7
```

### Device Communication Flow

```mermaid
flowchart LR
    subgraph Device["IoT Device"]
        Sensor_Read["Sensor Reading<br/>Analog/Digital"]
        MCU_Process["MCU Processing<br/>Filter / Aggregate"]
        Pack["Protocol Pack<br/>MQTT / CoAP / HTTP"]
    end

    subgraph Ingest["Protocol Gateway"]
        MQTT_In["MQTT Ingest<br/>Topic Subscribe"]
        CoAP_In["CoAP Ingest<br/>Observe Register"]
        HTTP_In["HTTP Ingest<br/>POST Polling"]
        Serial_In["Serial Ingest<br/>Stream Parse"]
        BLE_In["BLE Ingest<br/>GATT Read"]
    end

    subgraph Hub["Nanggroe IoT Hub"]
        Router["Message Router<br/>Protocol Normalizer"]
        Transform["Data Transform<br/>Unit Conversion"]
        Validate["Schema Validate<br/>Type Checking"]
        Store["Time-Series Store<br/>Historical Data"]
        Emit["Event Emitter<br/>Socket.io Broadcast"]
    end

    subgraph Dashboard["Dashboard"]
        Live_Chart["Live Charts<br/>Real-Time Plot"]
        Alert_Check["Alert Check<br/>Threshold Monitor"]
        History["History View<br/>Trend Analysis"]
    end

    Sensor_Read --> MCU_Process --> Pack
    Pack -->|"MQTT"| MQTT_In
    Pack -->|"CoAP"| CoAP_In
    Pack -->|"HTTP"| HTTP_In
    Pack -->|"Serial"| Serial_In
    Pack -->|"BLE"| BLE_In
    MQTT_In --> Router
    CoAP_In --> Router
    HTTP_In --> Router
    Serial_In --> Router
    BLE_In --> Router
    Router --> Transform --> Validate --> Store --> Emit
    Emit --> Live_Chart
    Emit --> Alert_Check
    Store --> History

    style Device fill:#1e293b,stroke:#64748b,color:#e2e8f0
    style Ingest fill:#0f172a,stroke:#f59e0b,color:#fef3c7
    style Hub fill:#064e3b,stroke:#10b981,color:#d1fae5
    style Dashboard fill:#1a1a2e,stroke:#8b5cf6,color:#e9d5ff
```

### Automation Engine — Trigger / Condition / Action Pipeline

```mermaid
flowchart TD
    subgraph Triggers["Trigger Sources"]
        Thresh["Threshold Trigger<br/>Sensor > Limit"]
        Schedule["Schedule Trigger<br/>Cron / Interval"]
        Event["Event Trigger<br/>Device Online/Offline"]
        Manual["Manual Trigger<br/>User Action"]
    end

    subgraph Conditions["Condition Evaluator"]
        Logic_AND["AND Logic<br/>All Must Match"]
        Logic_OR["OR Logic<br/>Any Must Match"]
        Time_Cond["Time Window<br/>Active Hours"]
        Value_Comp["Value Compare<br/>GT / LT / EQ"]
    end

    subgraph Actions["Action Executors"]
        Send_Cmd["Send Command<br/>Device Control"]
        Push_Notif["Push Notification<br/>Alert User"]
        Log_Event["Log Event<br/>Audit Trail"]
        Webhook["Call Webhook<br/>External API"]
        Chain["Chain Trigger<br/>Cascade Rules"]
    end

    Thresh --> Logic_AND
    Schedule --> Logic_OR
    Event --> Logic_AND
    Manual --> Logic_OR
    Logic_AND --> Time_Cond
    Logic_OR --> Value_Comp
    Time_Cond --> Send_Cmd
    Value_Comp --> Push_Notif
    Time_Cond --> Log_Event
    Value_Comp --> Webhook
    Send_Cmd --> Chain
    Push_Notif --> Chain

    style Triggers fill:#1e3a5f,stroke:#3b82f6,color:#dbeafe
    style Conditions fill:#4a1d0a,stroke:#f59e0b,color:#fef3c7
    style Actions fill:#064e3b,stroke:#10b981,color:#d1fae5
```

### Multi-Platform Client Architecture

```mermaid
graph TB
    subgraph Shared["Shared Codebase"]
        TS["TypeScript Core<br/>Business Logic"]
        Components["UI Components<br/>React Components"]
        API_Client["API Client<br/>HTTP + WebSocket"]
        State["State Management<br/>Device Tree Store"]
    end

    subgraph Web["Web — Next.js 16"]
        SSR["SSR / SSG<br/>Server Rendering"]
        Web_Runtime["Browser Runtime<br/>Service Worker"]
    end

    subgraph Mobile["Mobile — Capacitor"]
        Android_Runtime["Android Runtime<br/>WebView Native"]
        Native_Plugins["Native Plugins<br/>BLE / Serial"]
        Push_Mobile["Push Notifications<br/>FCM"]
    end

    subgraph Desktop["Desktop — Tauri"]
        Rust_Backend["Rust Backend<br/>System Access"]
        Serial_Native["Native Serial<br/>Direct UART"]
        Sys_Tray["System Tray<br/>Background Mode"]
    end

    TS --> SSR
    TS --> Web_Runtime
    TS --> Android_Runtime
    TS --> Native_Plugins
    TS --> Rust_Backend
    TS --> Serial_Native
    Components --> SSR
    Components --> Web_Runtime
    Components --> Android_Runtime
    API_Client --> Web_Runtime
    API_Client --> Android_Runtime
    API_Client --> Rust_Backend
    State --> Web_Runtime
    State --> Android_Runtime
    State --> Rust_Backend
    Native_Plugins --> Push_Mobile

    style Shared fill:#0f172a,stroke:#8b5cf6,color:#e9d5ff
    style Web fill:#0d2137,stroke:#22d3ee,color:#e0f2fe
    style Mobile fill:#064e3b,stroke:#10b981,color:#d1fae5
    style Desktop fill:#1c1917,stroke:#f59e0b,color:#fef3c7
```

### Sensor Data Pipeline

```mermaid
flowchart LR
    subgraph Source["Data Source"]
        Raw_Sensor["Raw Sensor<br/>Analog Reading"]
        Device_Meta["Device Metadata<br/>ID / Type / Location"]
    end

    subgraph Ingestion["Ingestion Layer"]
        Collector["Data Collector<br/>Protocol Adapter"]
        Buffer["Ring Buffer<br/>Batch Window"]
        Parser["Message Parser<br/>Schema Decode"]
    end

    subgraph Processing["Processing Layer"]
        Normalize["Normalize<br/>Unit Conversion"]
        Filter["Filter<br/>Outlier Removal"]
        Aggregate["Aggregate<br/>Mean / Max / Min"]
        Enrich["Enrich<br/>Add Timestamps"]
    end

    subgraph Storage["Storage"]
        TimeDB["Time-Series DB<br/>Historical Store"]
        Cache["Redis Cache<br/>Latest Values"]
    end

    subgraph Viz["Visualization"]
        Realtime["Real-Time Charts<br/>Live Streaming"]
        Timeline["Timeline View<br/>Historical Zoom"]
        Export["Export<br/>CSV / JSON"]
    end

    Raw_Sensor --> Collector
    Device_Meta --> Collector
    Collector --> Buffer --> Parser
    Parser --> Normalize --> Filter --> Aggregate --> Enrich
    Enrich --> TimeDB
    Enrich --> Cache
    Cache --> Realtime
    TimeDB --> Timeline
    TimeDB --> Export

    style Source fill:#1e293b,stroke:#64748b,color:#e2e8f0
    style Ingestion fill:#1e3a5f,stroke:#3b82f6,color:#dbeafe
    style Processing fill:#0f172a,stroke:#8b5cf6,color:#e9d5ff
    style Storage fill:#4a1d0a,stroke:#f59e0b,color:#fef3c7
    style Viz fill:#064e3b,stroke:#10b981,color:#d1fae5
```

> **Maturity Note**: Nanggroe IoT is under active development. The multi-protocol gateway (MQTT, HTTP, WebSocket) is the most mature layer. CoAP, Serial, and BLE integrations are in progress. The automation engine supports basic trigger/action rules — advanced condition chaining is on the roadmap. The Capacitor (Android) and Tauri (Desktop) builds are functional but may lack some features available in the web dashboard.

---

## Quick Start

```bash
# Clone the repository

<!-- AUTO-PACKAGE-BADGES:START -->
<!-- Auto-generated package badges -->

![npm version](https://img.shields.io/npm/v/nanggroe-iot?style=flat-square&logo=npm&color=blue) ![npm downloads](https://img.shields.io/npm/dw/nanggroe-iot?style=flat-square&color=brightgreen) ![npm license](https://img.shields.io/npm/l/nanggroe-iot?style=flat-square) [![Deployed](https://img.shields.io/badge/deployed-2.0.0-blue?style=flat-square)](https://www.npmjs.com/package/nanggroe-iot)

<!-- AUTO-PACKAGE-BADGES:END -->
git clone https://github.com/mulkymalikuldhrs/nanggroe-iot.git
cd nanggroe-iot

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:3000`. Connect your IoT devices using the provided client libraries or the WebSocket API.

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. Create a **feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. Open a **Pull Request**

Please ensure your code passes all linting checks (`npm run lint`) and tests (`npm test`) before submitting.

## Disclaimer

**For Education and Research Purpose Only**

This project is provided strictly for educational and research purposes. The authors and contributors assume **no responsibility or liability** for any damages, losses, or risks arising from the use of this software. **We do not bear any responsibility or risk** for how this software is used. Improper handling of hardware components through this platform may result in physical damage or injury — always follow proper safety protocols when working with electrical and robotic systems.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

Copyright © 2024-2026 Mulky Malikul Dhaher. All rights reserved.

---

## Author

**Mulky Malikul Dhaher**
- GitHub: [mulkymalikuldhrs](https://github.com/mulkymalikuldhrs)
- Email: mulkymalikudhr@mail.com

<a href="https://github.com/mulkymalikuldhrs/nanggroe-iot">
  <img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=100:103a10,50:0d2a0d,0:0a1a0a&height=100&section=footer" />
</a>
