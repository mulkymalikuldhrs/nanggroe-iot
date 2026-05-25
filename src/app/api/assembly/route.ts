// ============================================================
// NANGGROE OS AI - Hardware Assembly Tutorial & Error Warning API
// GET  /api/assembly — Returns step-by-step assembly instructions
// POST /api/assembly — Report a hardware error and get troubleshooting advice
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

interface AssemblyStep {
  step: number
  title: string
  description: string
  tools: string[]
  parts: string[]
  warnings: string[]
  wiring?: {
    description: string
    connections: string[]
  }
  commonErrors: Array<{
    error: string
    cause: string
    solution: string
  }>
}

const ASSEMBLY_STEPS: AssemblyStep[] = [
  {
    step: 1,
    title: 'Frame Assembly',
    description: 'Assemble the tricopter frame with motor mounts. The Nanggroe OS AI uses a tricopter configuration with a yaw servo on the tail motor. Ensure all frame arms are securely fastened and the center plate is level. The frame should be balanced with equal arm lengths (typically 450mm wheelbase).',
    tools: ['Hex driver set (1.5mm, 2mm, 2.5mm)', 'Phillips screwdriver', 'Loctite 243 (thread lock)', 'Caliper or ruler'],
    parts: ['Tricopter frame kit (450mm)', 'Motor mount brackets (3x)', 'Arm tubes (3x)', 'Center plate (top + bottom)', 'Screw set (M3x8, M3x12)', 'Rubber vibration dampeners (4x)'],
    warnings: [
      'Apply Loctite to ALL motor mount screws — vibration will loosen untreated screws',
      'Do NOT overtighten carbon fiber components — they can crack under excessive force',
      'Ensure frame arms are perfectly aligned before tightening center plate bolts',
    ],
    commonErrors: [
      {
        error: 'Frame vibration during flight',
        cause: 'Loose arm mounting bolts or cracked frame member',
        solution: 'Disassemble, check for hairline cracks, apply Loctite to all bolts, reassemble with proper torque (0.5 Nm for M3)',
      },
      {
        error: 'Tricopter veers to one side',
        cause: 'Asymmetric arm length or misaligned motor mounts',
        solution: 'Measure all arm lengths precisely with caliper. Ensure motor mounts are at exactly 120° apart. Adjust and re-tighten.',
      },
    ],
  },
  {
    step: 2,
    title: 'Electronics Installation',
    description: 'Mount the Pixhawk 4 flight controller and Raspberry Pi 4B companion computer onto the center plate. The Pixhawk should be oriented with the arrow pointing toward the front of the drone. Use vibration dampening foam between the Pixhawk and the frame. The Raspberry Pi mounts below or beside the Pixhawk with standoff spacers.',
    tools: ['Double-sided foam tape', 'Standoff spacers (M2.5, 10mm)', 'Cable ties', 'Wire strippers'],
    parts: ['Pixhawk 4 flight controller', 'Raspberry Pi 4B (4GB)', 'Vibration dampening foam pad', 'M2.5 standoffs (4x)', 'MicroSD card (32GB, Class 10)'],
    warnings: [
      'Pixhawk orientation is CRITICAL — the arrow must point forward (nose direction)',
      'Mount Pixhawk as close to the center of gravity as possible',
      'Use vibration dampening foam — hard mounting will cause IMU noise',
      'Raspberry Pi must have adequate ventilation — it generates significant heat',
    ],
    wiring: {
      description: 'Pixhawk ↔ Raspberry Pi serial connection for MAVLink communication',
      connections: [
        'Pixhawk TELEM 2 (UART) → Raspberry Pi GPIO 14/15 (TXD/RXD)',
        'Pixhawk TELEM 2 TX  → Raspberry Pi GPIO 15 (RXD)',
        'Pixhawk TELEM 2 RX  ← Raspberry Pi GPIO 14 (TXD)',
        'Pixhawk TELEM 2 GND → Raspberry Pi GND (Pin 6)',
        'Baud rate: 57600 (default) or 921600 (fast)',
      ],
    },
    commonErrors: [
      {
        error: 'No MAVLink connection between Pi and Pixhawk',
        cause: 'TX/RX lines swapped or incorrect baud rate',
        solution: 'Verify TX→RX and RX←TX cross-connection. Check baud rate matches on both sides: /dev/ttyAMA0 on Pi and SERIAL2_PROTOCOL on ArduPilot.',
      },
      {
        error: 'Pixhawk IMU showing high noise or drift',
        cause: 'Insufficient vibration isolation or mounting too close to motors',
        solution: 'Add thicker dampening foam. Verify IMU vibration levels via MAVLink INS message. Target < 3m/s² vibration.',
      },
    ],
  },
  {
    step: 3,
    title: 'Motor & ESC Wiring',
    description: 'Install the 3x SunnySky V2216 (KV900) brushless motors and 3x BLHeli_S 30A ESCs. For a tricopter, the front-left motor spins CW, front-right spins CCW, and the rear motor has a yaw servo mechanism. Wire each ESC to its corresponding motor following the correct phase sequence. Connect ESC signal wires to the Pixhawk main output channels.',
    tools: ['Soldering iron (60W+)', 'Heat shrink tubing (assorted)', 'Multimeter', 'ESC programming card (optional)'],
    parts: ['SunnySky V2216 KV900 motors (3x)', 'BLHeli_S 30A ESCs (3x)', 'Bullet connectors (3.5mm, 12 pairs)', 'Silicone wire (14 AWG)', 'Yaw servo (BMS-210 for tail)', 'Propellers (11x4.7 — 2 CW + 1 CCW)'],
    warnings: [
      'ALWAYS remove propellers before testing motor direction',
      'Verify motor rotation direction BEFORE installing propellers',
      'ESC BEC output must match servo voltage requirements (5V typical)',
      'Ensure bullet connectors are fully seated and insulated with heat shrink',
      'Double-check all solder joints — cold solder joints cause mid-flight failures',
    ],
    wiring: {
      description: 'Motor ↔ ESC ↔ Pixhawk wiring diagram',
      connections: [
        'Motor 1 (Front-Left CW)  → ESC 1 → Pixhawk MAIN 1 (Signal + GND)',
        'Motor 2 (Front-Right CCW) → ESC 2 → Pixhawk MAIN 2 (Signal + GND)',
        'Motor 3 (Rear + Yaw)     → ESC 3 → Pixhawk MAIN 3 (Signal + GND)',
        'Tail Yaw Servo           → Pixhawk MAIN 4 (Signal + 5V + GND)',
        'ESC BEC 5V output        → Pixhawk SERVO rail (common 5V bus)',
        'Battery → Power Distribution Board → All ESCs (14 AWG)',
        'ESC calibration: Full throttle → Power on → Wait beep → Low throttle → Wait confirmation',
      ],
    },
    commonErrors: [
      {
        error: 'Motor spins in wrong direction',
        cause: 'Phase wires (A/B/C) may need swapping for that motor',
        solution: 'Swap any two of the three motor-ESC phase wires. Do NOT change ESC signal — fix it physically. Re-test without propellers.',
      },
      {
        error: 'ESC not calibrating or beeping continuously',
        cause: 'Throttle range not properly calibrated or signal wire issue',
        solution: 'Power off. Connect ESC signal wire directly to receiver ch3. Full throttle → power on → wait for double beep → low throttle → wait for confirmation beep. Then reconnect to Pixhawk.',
      },
      {
        error: 'Yaw drift during hover',
        cause: 'Tail servo not centered or yaw mechanism binding',
        solution: 'Set yaw servo to 1500μs center position. Verify tail motor tilts freely ±30°. Adjust servo horn to mechanical center.',
      },
    ],
  },
  {
    step: 4,
    title: 'GPS Module Installation',
    description: 'Mount the u-blox NEO-M8N GPS module on a mast or elevated platform above the drone to minimize electromagnetic interference from the flight controller and power systems. The GPS module connects via UART to the Pixhawk GPS port. The compass (magnetometer) integrated in the GPS module must be oriented correctly.',
    tools: ['GPS mast or standoffs (30mm+)', 'Cable ties', 'Multimeter'],
    parts: ['u-blox NEO-M8N GPS+Compass module', 'GPS mast (6cm minimum)', '6-pin JST GH cable (Pixhawk GPS port)'],
    warnings: [
      'GPS must be mounted ABOVE all other electronics — EMI from ESCs and motors degrades GPS signal',
      'Keep GPS at least 5cm away from power wires and the Raspberry Pi',
      'The compass arrow on the GPS module MUST point forward (same as Pixhawk)',
      'Do not mount GPS near carbon fiber edges — they can cause multipath interference',
    ],
    wiring: {
      description: 'GPS module → Pixhawk GPS1 port',
      connections: [
        'GPS VCC (5V) → Pixhawk GPS port Pin 1 (VCC)',
        'GPS TX  → Pixhawk GPS port Pin 2 (RX)',
        'GPS RX  ← Pixhawk GPS port Pin 3 (TX)',
        'GPS GND → Pixhawk GPS port Pin 4 (GND)',
        'Compass SDA → Pixhawk GPS port Pin 5 (I2C SDA)',
        'Compass SCL → Pixhawk GPS port Pin 6 (I2C SCL)',
        'Baud rate: 9600 (default, auto-detected by ArduPilot)',
      ],
    },
    commonErrors: [
      {
        error: 'GPS not getting satellite fix',
        cause: 'Poor antenna placement or indoor testing',
        solution: 'Move outdoors with clear sky view. Wait 2-3 minutes for cold start. Check GPS LED — should blink when fix acquired. Verify UART wiring with multimeter continuity test.',
      },
      {
        error: 'Compass showing incorrect heading',
        cause: 'Compass not calibrated or interference from nearby metal/power lines',
        solution: 'Perform compass calibration via Mission Planner (Onboard Calibration). Ensure GPS mast is secure and module is level. Run compassmot to compensate for motor interference.',
      },
    ],
  },
  {
    step: 5,
    title: 'Camera Installation',
    description: 'Mount the Raspberry Pi Camera V2 (IMX219 sensor, 8MP) facing downward for aerial mapping. The camera connects to the Raspberry Pi CSI-2 port via the flat ribbon cable. Secure the camera module in a protective housing and mount it on the underside of the frame, centered for optimal mapping coverage.',
    tools: ['Small Phillips screwdriver', 'Camera mounting bracket (3D printed)', 'Double-sided tape'],
    parts: ['Raspberry Pi Camera V2 (IMX219)', 'CSI-2 flat ribbon cable (30cm)', 'Camera mount/bracket', 'UV/IR filter (optional for NDVI)'],
    warnings: [
      'CSI-2 ribbon cable is FRAGILE — do not crease or bend sharply',
      'Cable contacts must face the correct direction (toward the PCB on Pi side)',
      'Secure ribbon cable with tape to prevent vibration disconnection',
      'Camera lens is exposed — handle with care, avoid touching the lens surface',
    ],
    wiring: {
      description: 'Raspberry Pi Camera V2 → Raspberry Pi 4B CSI port',
      connections: [
        'Camera CSI-2 connector → Raspberry Pi CSI-2 port (DISP1/CM1)',
        'Ribbon cable: blue tape side faces away from Pi USB ports',
        'Camera power: provided through CSI-2 bus (no separate power needed)',
        'Enable camera: sudo raspi-config → Interface Options → Camera → Enable',
      ],
    },
    commonErrors: [
      {
        error: 'Camera not detected by Raspberry Pi',
        cause: 'Ribbon cable inserted incorrectly or not fully seated',
        solution: 'Power off Pi. Fully remove and reseat ribbon cable. Blue tape side faces away from USB ports on Pi. Ensure connector latch is fully closed. Run "libcamera-hello" to test.',
      },
      {
        error: 'Blurred or distorted images',
        cause: 'Focus ring moved during installation or lens contamination',
        solution: 'Clean lens with microfiber cloth. Adjust focus ring on camera module (rotate gently). For mapping, set focus to infinity (~3m+). Test with "libcamera-still -o test.jpg".',
      },
    ],
  },
  {
    step: 6,
    title: 'Sensor Installation (I2C Bus)',
    description: 'Connect the BME280 (environmental sensor) and MPU6050 (IMU backup) to the Raspberry Pi I2C bus. These sensors provide supplementary environmental data (temperature, humidity, pressure) and backup attitude reference for the Nanggroe OS AI system. Both sensors share the I2C-1 bus with different addresses.',
    tools: ['Breadboard or protoboard', 'Jumper wires (female-to-female)', 'Soldering iron (if using protoboard)'],
    parts: ['BME280 breakout board (addr 0x76)', 'MPU6050 breakout board (addr 0x68)', '4.7kΩ pull-up resistors (2x for I2C)', 'Jumper wires (6x)'],
    warnings: [
      'NEVER connect 5V to sensor VCC if sensor is 3.3V only — check your breakout board specs',
      'Both I2C devices must have DIFFERENT addresses on the same bus',
      'Keep I2C wires short (under 20cm) to avoid signal integrity issues',
      'Add pull-up resistors (4.7kΩ) on SDA and SCL lines to 3.3V if not on breakout boards',
    ],
    wiring: {
      description: 'I2C sensor bus connections → Raspberry Pi GPIO',
      connections: [
        'BME280 VCC → RPi Pin 1 (3.3V)',
        'BME280 GND → RPi Pin 6 (GND)',
        'BME280 SDA → RPi Pin 3 (GPIO 2 / SDA1)',
        'BME280 SCL → RPi Pin 5 (GPIO 3 / SCL1)',
        'MPU6050 VCC → RPi Pin 1 (3.3V) — shared bus',
        'MPU6050 GND → RPi Pin 6 (GND) — shared bus',
        'MPU6050 SDA → RPi Pin 3 (SDA1) — shared bus',
        'MPU6050 SCL → RPi Pin 5 (SCL1) — shared bus',
        'Enable I2C: sudo raspi-config → Interface Options → I2C → Enable',
        'Verify: "i2cdetect -y 1" should show devices at 0x68 and 0x76',
      ],
    },
    commonErrors: [
      {
        error: 'i2cdetect shows no devices',
        cause: 'I2C not enabled, bad wiring, or wrong voltage',
        solution: 'Enable I2C via raspi-config. Verify wiring with multimeter. Check VCC is 3.3V. Try each sensor individually. Check for short circuits between SDA/SCL.',
      },
      {
        error: 'BME280 reading impossible values (temp > 100°C)',
        cause: 'Wrong I2C address (0x77 vs 0x76) or sensor reset incomplete',
        solution: 'Check your breakout board address jumper. Try i2cdetect to confirm address. Power cycle the sensor. Some clones use 0x77.',
      },
    ],
  },
  {
    step: 7,
    title: 'Radio / Telemetry Installation',
    description: 'Install the SiK 433MHz telemetry radio for ground station communication. One radio connects to the Pixhawk (air side) and the other connects to the ground station (ground side). The radio provides MAVLink telemetry up to 1km range. This is essential for real-time monitoring and mission control during Aceh Utara operations.',
    tools: ['USB cable (micro-USB for ground radio)', 'JST GH cable (for air radio)'],
    parts: ['SiK 433MHz Telemetry Radio Kit (air + ground pair)', 'Antenna (433MHz, 2x)', 'Micro-USB cable'],
    warnings: [
      '433MHz requires a license in some regions — verify Aceh Utara local regulations',
      'NEVER power on the radio without the antenna connected — this can damage the transmitter',
      'Keep radio antennas away from GPS antenna and compass to prevent interference',
      'Use the SAME firmware version on both air and ground radios',
    ],
    wiring: {
      description: 'Air Radio → Pixhawk TELEM 1 port',
      connections: [
        'Air Radio VCC (5V) → Pixhawk TELEM 1 VCC',
        'Air Radio TX  → Pixhawk TELEM 1 RX',
        'Air Radio RX  ← Pixhawk TELEM 1 TX',
        'Air Radio GND → Pixhawk TELEM 1 GND',
        'Ground Radio → Ground Station USB port (appears as /dev/ttyACM0)',
        'Default air speed: 64 kbps (configurable via Mission Planner)',
        'Default baud: 57600',
      ],
    },
    commonErrors: [
      {
        error: 'No telemetry link between ground and air',
        cause: 'Radios on different channels or NetID, or TX/RX swapped',
        solution: 'Verify both radios have same NETID (default: 25). Check TX→RX cross-connection. Confirm same firmware version. Test with Mission Planner radio setup tool.',
      },
      {
        error: 'Telemetry range much shorter than expected',
        cause: 'Antenna orientation, interference, or wrong air speed setting',
        solution: 'Orient antennas vertically for best polarization match. Lower air speed for better range (e.g., 32 kbps). Move away from 433MHz interference sources.',
      },
    ],
  },
  {
    step: 8,
    title: 'Battery Installation',
    description: 'Install the 4S LiPo 4000mAh battery with voltage monitoring. The battery connects to the Power Distribution Board (PDB) which feeds all ESCs and the Pixhawk via its power module. The Pixhawk power module provides voltage and current sensing for the battery monitoring system. Secure the battery with a Velcro strap for easy removal and charging.',
    tools: ['Velcro strap (200mm)', 'Battery voltage checker', 'LiPo safe bag (for charging)'],
    parts: ['4S LiPo 4000mAh (14.8V nominal, 16.8V fully charged)', 'XT60 connector (on PDB)', 'Pixhawk Power Module (voltage/current sensor)', 'Velcro strap', 'Battery pad/anti-slip mat'],
    warnings: [
      'NEVER discharge LiPo below 3.3V per cell (13.2V total for 4S) — permanent damage risk',
      'NEVER charge LiPo unattended or outside a LiPo safe bag',
      'Check battery for puffing, damage, or swelling before each flight — DISCARD damaged cells',
      'Battery must be securely fastened — a loose battery shifts the center of gravity',
      'Balance charge ONLY — use a quality balance charger (e.g., iMax B6)',
      'Store LiPo at 3.8V per cell (15.2V for 4S) for long-term storage',
    ],
    wiring: {
      description: 'Battery → Power Module → PDB → ESCs',
      connections: [
        'Battery XT60 → Power Module XT60 input',
        'Power Module output → PDB main power bus',
        'Power Module 6-pin cable → Pixhawk PM port (voltage + current sensing)',
        'PDB → ESC 1 power (14 AWG)',
        'PDB → ESC 2 power (14 AWG)',
        'PDB → ESC 3 power (14 AWG)',
        'PDB 5V BEC → Pixhawk servo rail (backup power)',
        'Voltage alarm set: 14.0V (warning), 13.2V (critical RTH)',
      ],
    },
    commonErrors: [
      {
        error: 'Battery voltage reading incorrect on OSD/telemetry',
        cause: 'Power Module voltage calibration off or wrong cell count configured',
        solution: 'Calibrate voltage in Mission Planner: compare with multimeter reading at battery terminals. Set battery parameters: BATT_CELL_COUNT=4, verify BATT_AMP_PERVOLT.',
      },
      {
        error: 'Voltage sag causing brownouts under load',
        cause: 'Battery C-rating too low or degraded cells',
        solution: 'Use battery with 25C+ discharge rating (4000mAh × 25C = 100A max). Check individual cell voltages — replace if cell imbalance > 0.1V.',
      },
    ],
  },
  {
    step: 9,
    title: 'Pre-Flight Checks',
    description: 'Complete the mandatory pre-flight checklist before any flight operation. This ensures all systems are functioning correctly and the drone is safe to operate. Follow this checklist EVERY TIME before takeoff — there are no exceptions for the Aceh Utara operations.',
    tools: ['Pre-flight checklist (printed)', 'Multimeter', 'Propeller balancer'],
    parts: ['None — all hardware should be installed at this stage'],
    warnings: [
      'NEVER skip pre-flight checks — even a 5-minute skip can lead to a crash',
      'If ANY check fails, do NOT fly — resolve the issue first',
      'Check weather conditions — do not fly in winds > 8 m/s or rain',
      'Verify flight zone clearance with local authorities in Aceh Utara',
      'Always have an emergency landing zone identified',
    ],
    commonErrors: [
      {
        error: 'Arming denied by Pixhawk',
        cause: 'Pre-arm checks failing — usually compass, GPS, or voltage issues',
        solution: 'Connect Mission Planner and read the pre-arm failure message. Common fixes: compass calibration, GPS fix wait, battery voltage above minimum. Resolve ALL pre-arm failures before attempting to arm.',
      },
      {
        error: 'Drone drifts during initial hover test',
        cause: 'Uncalibrated compass, accelerometer, or unbalanced props',
        solution: 'Re-calibrate compass and accelerometer. Balance propellers. Verify CG (center of gravity) is at frame center. Do initial hover test in stabilized mode at 1-2m altitude.',
      },
    ],
  },
  {
    step: 10,
    title: 'Software Configuration',
    description: 'Configure the ArduPilot firmware on Pixhawk and install Nanggroe OS AI software on the Raspberry Pi. This includes MAVLink router setup, agent configuration, and camera capture service. The software stack enables autonomous mapping missions with AI-powered planning and safety monitoring.',
    tools: ['Computer with Mission Planner or QGC', 'Internet connection for apt/pip', 'MicroSD card reader'],
    parts: ['ArduPilot Copter 4.5.7 firmware', 'Raspberry Pi OS 64-bit (Bookworm)', 'Nanggroe OS AI software package'],
    warnings: [
      'Back up existing Pixhawk configuration before firmware updates',
      'Do NOT power off Pixhawk during firmware flashing — it can brick the controller',
      'Test all configuration changes on the bench before field deployment',
      'Ensure Raspberry Pi is running the correct Python version (3.11+)',
    ],
    commonErrors: [
      {
        error: 'MAVLink router not connecting to Pixhawk',
        cause: 'Serial port configuration mismatch or permission issue',
        solution: 'Verify /dev/ttyAMA0 exists and pi user has dialout group: "sudo usermod -aG dialout pi". Check mavlink-routerd config for correct baud rate (57600). Restart service: "sudo systemctl restart mavlink-routerd".',
      },
      {
        error: 'Camera capture service fails to start',
        cause: 'libcamera not available or camera not enabled',
        solution: 'Run "sudo raspi-config → Interface → Camera → Enable". Install libcamera: "sudo apt install libcamera-apps". Test with "libcamera-hello". Verify CSI cable connection.',
      },
      {
        error: 'Hermes or PicoClaw agent crashes on startup',
        cause: 'Python dependency missing or configuration error',
        solution: 'Check agent logs in /var/log/nanggroe/. Verify all pip packages installed: "pip install -r requirements.txt". Check agent config in /etc/nanggroe/agents.yaml for syntax errors.',
      },
    ],
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')

    // Try to fetch assembly steps from RobotTemplate DB
    let steps: AssemblyStep[] = ASSEMBLY_STEPS
    let droneModel = 'Nanggroe OS AI Tricopter'
    let source = 'fallback'

    try {
      const { db } = await import('@/lib/db')

      if (templateId) {
        // Fetch specific template
        const template = await db.robotTemplate.findUnique({
          where: { id: templateId },
        })
        if (template?.assemblyGuide) {
          const parsed = JSON.parse(template.assemblyGuide)
          if (Array.isArray(parsed) && parsed.length > 0) {
            steps = parsed as AssemblyStep[]
            droneModel = template.name
            source = 'database'
          }
        }
      } else {
        // Fetch the official Nanggroe OS AI template or the first available
        const template = await db.robotTemplate.findFirst({
          where: {
            OR: [
              { isOfficial: true },
              { name: { contains: 'Nanggroe' } },
            ],
          },
          orderBy: { isOfficial: 'desc' },
        })
        if (template?.assemblyGuide) {
          const parsed = JSON.parse(template.assemblyGuide)
          if (Array.isArray(parsed) && parsed.length > 0) {
            steps = parsed as AssemblyStep[]
            droneModel = template.name
            source = 'database'
          }
        }
      }
    } catch (dbError) {
      console.warn('[Assembly API] Could not fetch from DB, using fallback steps:', dbError)
    }

    return NextResponse.json({
      success: true,
      data: {
        steps,
        totalSteps: steps.length,
        droneModel,
        region: 'Aceh Utara',
        source,
      },
    })
  } catch (error) {
    console.error('[Assembly API] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve assembly instructions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { errorDescription } = body as { errorDescription?: string }

    if (!errorDescription || errorDescription.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'errorDescription is required' },
        { status: 400 }
      )
    }

    // Use ZAI SDK to generate troubleshooting advice
    let advice: string
    try {
      const zai = await ZAI.create()
      const response = await Promise.race([
        zai.chat.completions.create({
          model: 'default',
          messages: [
            {
              role: 'system',
              content: `You are a senior drone hardware diagnostic engineer for Nanggroe OS AI, an autonomous tricopter drone system for aerial mapping in Aceh Utara, Indonesia. The drone uses: Pixhawk 4 flight controller, Raspberry Pi 4B companion computer, 3x SunnySky V2216 KV900 motors with BLHeli_S 30A ESCs, u-blox NEO-M8N GPS, RPi Camera V2, BME280 and MPU6050 sensors on I2C, SiK 433MHz telemetry radio, and 4S LiPo 4000mAh battery. Running ArduPilot Copter 4.5.7 and Nanggroe OS AI software.

Provide structured troubleshooting advice with clear steps. Be specific about pin numbers, addresses, voltages, and commands. Format your response as:
1. **Diagnosis** — what likely caused the error
2. **Immediate Action** — what to do right now to prevent damage
3. **Step-by-Step Fix** — detailed resolution steps
4. **Verification** — how to confirm the fix worked
5. **Prevention** — how to avoid this in the future`,
            },
            {
              role: 'user',
              content: `I'm experiencing this hardware error with my Nanggroe OS AI tricopter drone: ${errorDescription}`,
            },
          ],
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 25000)),
      ])

      advice = response?.choices?.[0]?.message?.content || generateFallbackAdvice(errorDescription)
    } catch {
      advice = generateFallbackAdvice(errorDescription)
    }

    return NextResponse.json({
      success: true,
      data: {
        errorDescription,
        troubleshooting: advice,
        timestamp: new Date().toISOString(),
        relatedSteps: findRelatedSteps(errorDescription),
      },
    })
  } catch (error) {
    console.error('[Assembly API] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate troubleshooting advice' },
      { status: 500 }
    )
  }
}

function findRelatedSteps(errorDescription: string): number[] {
  const lower = errorDescription.toLowerCase()
  const relatedSteps: number[] = []

  const keywords: Record<number, string[]> = {
    1: ['frame', 'vibration', 'arm', 'loose', 'bent', 'crack'],
    2: ['pixhawk', 'raspberry pi', 'mavlink', 'serial', 'imu', 'electronic'],
    3: ['motor', 'esc', 'propeller', 'yaw', 'servo', 'throttle', 'spin', 'rotation'],
    4: ['gps', 'satellite', 'compass', 'magnetometer', 'fix', 'coordinate'],
    5: ['camera', 'image', 'photo', 'csi', 'ribbon', 'lens', 'capture'],
    6: ['i2c', 'bme280', 'mpu6050', 'sensor', 'temperature', 'humidity', 'pressure', 'accelerometer'],
    7: ['radio', 'telemetry', '433', 'sik', 'link', 'range', 'communication'],
    8: ['battery', 'lipo', 'voltage', 'power', 'charge', 'discharge', 'current'],
    9: ['preflight', 'pre-flight', 'arming', 'arm', 'check', 'drift', 'calibration'],
    10: ['software', 'firmware', 'ardupilot', 'python', 'config', 'mavlink-router', 'agent'],
  }

  for (const [step, words] of Object.entries(keywords)) {
    if (words.some(w => lower.includes(w))) {
      relatedSteps.push(parseInt(step))
    }
  }

  return relatedSteps.length > 0 ? relatedSteps : [1, 2, 3]
}

function generateFallbackAdvice(errorDescription: string): string {
  const lower = errorDescription.toLowerCase()

  // Fallback advice based on keyword matching when ZAI SDK is unavailable
  if (lower.includes('gps') || lower.includes('satellite') || lower.includes('fix')) {
    return `**Diagnosis**: GPS module may not be acquiring satellite lock. This is common with the u-blox NEO-M8N.

**Immediate Action**: Do NOT attempt to fly without GPS fix. The drone requires GPS for position hold and return-to-home.

**Step-by-Step Fix**:
1. Move the drone outdoors with clear sky view (no buildings/trees overhead)
2. Wait 2-3 minutes for a cold start satellite acquisition
3. Check GPS LED indicator — it should blink when fix is acquired
4. Verify UART wiring: GPS TX → Pixhawk GPS RX, GPS RX → Pixhawk GPS TX
5. Check baud rate matches: default 9600 for NEO-M8N
6. Run "i2cdetect -y 1" to verify compass on I2C bus
7. If still no fix, try a different GPS module — NEO-M8N modules can be DOA

**Verification**: GPS LED blinks steadily (indicating 3D fix). Mission Planner shows HDOP < 2.0 and 8+ satellites.

**Prevention**: Always power on GPS 2 minutes before flight. Keep GPS mast clear of obstructions.`
  }

  if (lower.includes('motor') || lower.includes('esc') || lower.includes('spin') || lower.includes('propeller')) {
    return `**Diagnosis**: Motor or ESC issue detected. Common causes include wiring errors, incorrect phase sequence, or ESC calibration problems.

**Immediate Action**: REMOVE ALL PROPELLERS before any motor testing. This prevents injury and damage.

**Step-by-Step Fix**:
1. Verify motor-ESC phase connections (3 bullet connectors per motor)
2. Test motor direction without propellers — use Mission Planner motor test
3. If motor spins wrong direction, swap any two phase wires (A/B/C)
4. Calibrate ESCs: Full throttle → Power on → Wait beep → Low throttle → Wait confirmation
5. Check ESC signal wires connect to correct Pixhawk MAIN outputs (1, 2, 3)
6. Verify BLHeli_S firmware is version 16.7 or later

**Verification**: All three motors spin in correct directions (Front-Left: CW, Front-Right: CCW, Rear: CW with yaw servo). No unusual sounds.

**Prevention**: Always mark phase wire pairs. Perform ESC calibration whenever changing batteries or firmware.`
  }

  if (lower.includes('battery') || lower.includes('power') || lower.includes('voltage') || lower.includes('lipo')) {
    return `**Diagnosis**: Battery or power system issue. 4S LiPo requires careful voltage monitoring.

**Immediate Action**: Check battery voltage with a multimeter. If below 13.2V (3.3V/cell), DO NOT FLY — recharge immediately.

**Step-by-Step Fix**:
1. Measure battery voltage at XT60 connector with multimeter
2. Verify Pixhawk Power Module is reading correctly (compare with multimeter)
3. Calibrate voltage in Mission Planner if readings differ
4. Check individual cell voltages with battery checker — cells should be within 0.1V of each other
5. Inspect battery for physical damage, puffing, or swelling
6. Verify all power connections are secure (battery → PDB → ESCs)

**Verification**: Battery reads 14.8V+ (4S nominal). Power Module voltage matches multimeter within 0.1V. No cell imbalance.

**Prevention**: Balance charge always. Store at 15.2V (3.8V/cell). Replace batteries showing puffing or cell imbalance > 0.2V.`
  }

  return `**Diagnosis**: The reported error requires further investigation. Based on the Nanggroe OS AI tricopter system, this could involve multiple subsystems.

**Immediate Action**: Ensure drone is powered off and in a safe state. Do not attempt flight until the issue is resolved.

**Step-by-Step Fix**:
1. Review the assembly guide steps for the relevant subsystem
2. Check all physical connections — loose wires are the #1 cause of drone issues
3. Verify power is reaching all components (Pixhawk, RPi, sensors)
4. Check system logs via Mission Planner or SSH for error messages
5. Test each subsystem individually before integrating
6. Run hardware scan from the Nanggroe OS AI dashboard

**Verification**: All hardware devices show "active" status. No critical alerts in the system.

**Prevention**: Perform pre-flight checks before every flight. Keep a maintenance log. Run system diagnostics regularly from the Doctor tab.`
}
