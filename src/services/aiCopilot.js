// src/services/aiCopilot.js
const prisma = require('./db');
const aiGenerator = require('./aiGenerator');

/**
 * Embedded India AI Engineering Copilot
 * Provides real-time guidance on MCU selection, PCB design rules, RTOS architecture,
 * and project scoping, with both live LLM inference and a rich offline technical knowledge base.
 */
class AICopilotService {

  /**
   * Technical rule base for instant, deterministic engineering responses
   */
  getOfflineResponse(query) {
    const q = (query || '').toLowerCase();

    // 1. MCU / Processor selection
    if (q.includes('mcu') || q.includes('microcontroller') || q.includes('esp32') || q.includes('stm32') || q.includes('processor') || q.includes('silicon')) {
      return {
        reply: `### Recommended Microcontroller Selection Strategy:

1. **Ultra-Low Power & Coin-Cell IoT**: 
   - **Nordic nRF52840 / nRF5340**: Ideal for BLE 5.3 and Zigbee/Thread. Deep-sleep current down to ~1.5µA with RTC.
   - **STM32L4 / STM32U5**: Cortex-M33 with hardware crypto and LPBAM (Low Power Background Autonomous Mode).

2. **Connected IoT & Wi-Fi/Edge Nodes**:
   - **ESP32-S3 (Dual-core 240MHz)**: Integrated 2.4GHz Wi-Fi + BLE 5, vector instructions for TinyML audio/wake-word, USB OTG, and 8MB PSRAM support.
   - **Raspberry Pi RP2040**: Dual Cortex-M0+ with programmable PIO state machines for custom protocols.

3. **Mission-Critical & Automotive CAN-FD**:
   - **STM32F4 / STM32G4 / NXP S32K**: High math throughput, dual CAN-FD, hardware FPU, and AEC-Q100 automotive qualification.

4. **Linux Edge Gateways & Vision**:
   - **STM32MP157 / NXP i.MX 8M Nano**: Dual Cortex-A7 for embedded Linux (Yocto/Debian) plus Cortex-M4 for real-time motor/sensor control.

*Embedded India provides turnkey MCU evaluation, BSP driver development, and pin multiplexing verification for your architecture.*`,
        suggestedActions: [
          { text: "Explore Firmware Services", url: "/services/embedded-software-firmware-development" },
          { text: "MCU Pinout Tool", url: "/tools/mcu-pinout" },
          { text: "Request MCU Architecture Review", url: "/contact?service=Firmware/BSP" }
        ]
      };
    }

    // 2. PCB trace width / IPC-2221
    if (q.includes('pcb') || q.includes('trace') || q.includes('current') || q.includes('ipc') || q.includes('layer') || q.includes('impedance')) {
      return {
        reply: `### PCB Routing & Trace Geometry Guidelines:

1. **Current Capacity (IPC-2221 Standard)**:
   - For standard 1 oz/ft² (35µm) copper with a **10°C thermal rise**:
     - **1 Amp**: Minimum ~12 mils (0.30 mm) for external layers; ~30 mils for internal layers.
     - **2.5 Amps**: ~40 mils (1.02 mm) external; ~105 mils internal.
     - **5 Amps**: ~110 mils (2.80 mm) external. For high current, use 2 oz copper or unmasked solder-filled polygon pours.

2. **Controlled Impedance**:
   - Single-ended RF / Clock traces: **50Ω &plusmn;10%**.
   - USB 2.0 Differential: **90Ω &plusmn;10%**.
   - Ethernet / CAN-FD Differential: **100Ω &plusmn;10%** and **120Ω &plusmn;10%**.

3. **High-Speed Routing Best Practices**:
   - Keep solid, uninterrupted reference ground planes underneath signal layers to prevent return current loop inductance.
   - Place decoupling capacitors (0.1µF + 10µF) immediately adjacent to IC power pins with short direct vias to ground.

*Need custom stackup calculations? Use our interactive tools or let our engineering team layout your multi-layer board.*`,
        suggestedActions: [
          { text: "IPC-2221 Trace Calculator", url: "/tools/pcb-trace" },
          { text: "Microstrip Impedance Tool", url: "/tools/trace-impedance" },
          { text: "Hardware Design Services", url: "/services/hardware-design-engineering" }
        ]
      };
    }

    // 3. RTOS / FreeRTOS / Zephyr
    if (q.includes('rtos') || q.includes('freertos') || q.includes('zephyr') || q.includes('mutex') || q.includes('firmware') || q.includes('bsp')) {
      return {
        reply: `### Deterministic RTOS Architecture Patterns:

1. **Task Prioritization**:
   - Assign the highest priorities to hard real-time sensor sampling, motor control loops, and CAN message handlers.
   - Keep ISRs (Interrupt Service Routines) ultra-short: clear interrupt flags, queue raw data to a ring buffer or notify a worker task via \`vTaskNotifyGiveFromISR()\`.

2. **Concurrency & Deadlock Prevention**:
   - Always use priority inheritance mutexes (\`xSemaphoreCreateMutex()\`) rather than binary semaphores when sharing hardware buses (I2C/SPI) to avoid priority inversion.
   - Enforce a strict locking hierarchy if multiple mutexes must be acquired simultaneously.

3. **Memory Safety**:
   - Use FreeRTOS Heap_4 or Heap_5 with coalescing, or allocate tasks with static memory (\`xTaskCreateStatic()\`) for DO-178C or ISO 26262 safety certification.

*Embedded India builds deterministic, zero-memory-leak firmware in bare-metal C/C++, FreeRTOS, and Zephyr.*`,
        suggestedActions: [
          { text: "Firmware Development Services", url: "/services/embedded-software-firmware-development" },
          { text: "UART Baud Error Tool", url: "/tools/uart-baud" },
          { text: "Schedule Architecture Discussion", url: "/contact?service=Firmware/BSP" }
        ]
      };
    }

    // 4. LoRa / Wireless / Battery Life
    if (q.includes('lora') || q.includes('wireless') || q.includes('battery') || q.includes('ble') || q.includes('cellular') || q.includes('iot')) {
      return {
        reply: `### Ultra-Low Power IoT & Wireless Design:

1. **Duty Cycle Optimization**:
   - Radio transmission is the primary energy drain (30mA - 120mA). Sleep modes consume < 2µA.
   - Transmitting once every 15 minutes allows a standard 2400mAh LiSOCl2 battery to last **5 to 7+ years**.

2. **Protocol Selection Trade-offs**:
   - **LoRaWAN (868/915 MHz)**: Up to 15km range line-of-sight; ideal for low-payload sensor telemetry (water meters, soil probes, asset trackers).
   - **BLE 5.3 Coded PHY**: Long-range Bluetooth (~100m - 400m) with mobile phone interoperability.
   - **4G LTE Cat-M1 / NB-IoT**: Direct cloud connectivity without gateways, suitable for moving vehicles and smart grid meters.

3. **Power Rail Cleanliness**:
   - Use low-quiescent LDOs (IQ < 1µA) or ultra-efficient buck converters with automatic PFM/PWM transitions.`,
        suggestedActions: [
          { text: "Battery Life Estimator", url: "/tools/battery-life" },
          { text: "IoT Edge Solutions", url: "/services/iot-edge-computing-solutions" },
          { text: "Explore LoRa Case Study", url: "/projects/industrial-lorawan-edge-gateway" }
        ]
      };
    }

    // Default Guidance
    return {
      reply: `### Hello from Embedded India Engineering!

I can help scope your embedded electronics project or answer technical hardware/firmware questions:
- **Silicon Architecture**: MCU selection (STM32, ESP32, nRF52, RP2040, NXP i.MX).
- **Hardware Layout**: Multi-layer PCB stackups, IPC-2221 trace ampacity, impedance matching, and DFM rules.
- **Embedded Software**: Deterministic FreeRTOS/Zephyr drivers, secure cryptographic bootloaders, and FOTA pipelines.
- **System Verification**: Automated HIL test rigs, automotive CAN-FD compliance, and CE/FCC/ARAI certifications.

How can we assist your engineering requirements today?`,
      suggestedActions: [
        { text: "Calculate Project Timeline", url: "/#estimator" },
        { text: "View Case Studies", url: "/projects" },
        { text: "Request Turnkey Engineering Quote", url: "/contact" }
      ]
    };
  }

  /**
   * Process a message from user, routing to LLM if configured, else offline technical engine
   */
  async processQuery({ message, conversationHistory = [] }) {
    const userText = (message || '').trim();
    if (!userText) {
      return this.getOfflineResponse('');
    }

    const config = await aiGenerator.getAiConfig();
    const apiKey = (config.apiKey || '').trim();
    const hasLiveApi = apiKey && !['demo', 'demo-key', 'test', 'mock'].includes(apiKey.toLowerCase()) && process.env.NODE_ENV !== 'test';

    if (!hasLiveApi && config.provider !== 'custom') {
      return this.getOfflineResponse(userText);
    }

    try {
      const systemPrompt = `You are the Lead Embedded Systems Architect and Copilot for Embedded India (embeddedindia.in).
Embedded India is India's premier engineering design lab specializing in:
- Turnkey electronic product development (napkin concept to mass SMT production).
- High-speed multi-layer PCB layout (IPC-2221, HDI microvias, controlled impedance).
- Deterministic RTOS firmware (FreeRTOS, Zephyr, bare-metal C/C++, secure dual-bank FOTA).
- IoT & Edge computing nodes (LoRaWAN, BLE 5.3, 4G LTE, TinyML).
- Automotive embedded systems (CAN-FD, LIN, ISO 26262, SAE J1939, HIL automated testing).

Rules:
1. Provide accurate, highly technical, and practical embedded engineering answers.
2. Recommend specific ICs, passives, and architecture patterns with exact values when relevant.
3. Keep answers structured with clear markdown bullet points and code/math blocks.
4. Conclude with how Embedded India can engineer this solution for the client.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-4),
        { role: 'user', content: userText }
      ];

      let replyText = '';
      if (config.provider === 'gemini') {
        replyText = await aiGenerator._callGemini(config, `${systemPrompt}\n\nUser Question:\n${userText}`);
      } else {
        replyText = await aiGenerator._callOpenAiCompatible(config, messages);
      }

      return {
        reply: replyText.trim(),
        suggestedActions: [
          { text: "Request Technical Consultation", url: "/contact" },
          { text: "Explore Engineering Tools", url: "/tools" },
          { text: "Inspect Projects Portfolio", url: "/projects" }
        ]
      };
    } catch (err) {
      console.warn('[COPILOT AI NOTICE] Falling back to offline engineering rulebase:', err.message);
      return this.getOfflineResponse(userText);
    }
  }
}

module.exports = new AICopilotService();

