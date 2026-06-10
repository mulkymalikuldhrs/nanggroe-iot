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

## Quick Start

```bash
# Clone the repository
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
