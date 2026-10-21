// scripts/seed-sqlite.js
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, '../prisma/dev.db');
const db = new Database(dbPath);

async function seed() {
  console.log('Seeding SQLite database directly...');

  // 1. Admin user
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@embeddedindia.in';
  const rawPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'AdminEmbedded@2026!';
  const passwordHash = await bcrypt.hash(rawPassword, 10);
  const now = new Date().toISOString();

  const existingUser = db.prepare('SELECT id FROM User WHERE email = ?').get(adminEmail);
  if (!existingUser) {
    db.prepare(`
      INSERT INTO User (id, username, email, passwordHash, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), 'admin', adminEmail, passwordHash, 'admin', now, now);
    console.log('[SEED] Admin user created');
  } else {
    db.prepare('UPDATE User SET passwordHash = ?, updatedAt = ? WHERE id = ?').run(passwordHash, now, existingUser.id);
    console.log('[SEED] Admin user password updated');
  }

  // 2. Default Site Settings
  const initialSettings = [
    { key: 'site_name', value: 'Embedded India' },
    { key: 'site_tagline', value: 'Think Big. We Do!' },
    { key: 'contact_email', value: 'info@embeddedindia.in' },
    { key: 'contact_phone', value: '+91 98765 43210' },
    { key: 'contact_address', value: 'Bangalore / Hyderabad / Pune, India' },
    { key: 'maintenance_mode', value: 'false' },
    { key: 'enable_adsense', value: 'false' },
    { key: 'adsense_pub_id', value: '' },
    { key: 'meta_pixel_id', value: '' },
    { key: 'lead_magnet_title', value: 'The 2026 Embedded Hardware & Firmware Design Checklist' },
    { key: 'lead_magnet_file', value: '/downloads/embedded-design-checklist.pdf' },
    { key: 'promo_banner_active', value: 'true' },
    { key: 'promo_banner_title', value: 'Accelerate Your Next IoT or High-Speed PCB Project' },
    { key: 'promo_banner_text', value: 'From concept and schematics to turnkey production and firmware BSP. Partner with India’s leading embedded engineering team.' },
    { key: 'promo_banner_cta', value: 'Book an Engineering Feasibility Call' },
    { key: 'promo_banner_url', value: '/contact?service=Hardware%20Design' },
    { key: 'hero_title', value: 'Think Big.' },
    { key: 'hero_subtitle', value: 'We Engineer:' },
    { key: 'hero_description', value: 'From early napkin architecture and high-speed PCB layouts to deterministic RTOS firmware, HIL automated testing, and volume SMT manufacturing.' }
  ];

  const upsertSetting = db.prepare(`
    INSERT INTO Setting (id, key, value, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `);

  for (const s of initialSettings) {
    upsertSetting.run(crypto.randomUUID(), s.key, s.value, now, now);
  }
  console.log('[SEED] Settings initialized');

  // 3. Official Technical Blog Articles
  const posts = [
    {
      title: 'Bridging the Divide: How to Align Hardware and Firmware Teams',
      slug: 'bridging-the-divide',
      category: 'Guides',
      tags: 'firmware,hardware,co-design,agile',
      summary: 'Embedded projects frequently suffer delays because hardware and software teams work in silos. Discover proven co-design workflows to eliminate finger-pointing.',
      readingTime: 4,
      author: 'Embedded India Engineering Team',
      status: 'published',
      publishedAt: '2025-11-16T18:00:29.000Z',
      contentMarkdown: `## The Silo Problem in Embedded Development

Embedded systems projects frequently encounter costly rework and slipped deadlines because hardware engineers and firmware developers work in separate silos. Software developers often wait until final prototypes arrive before testing drivers, while hardware engineers may design boards with pin assignments that make DMA or interrupt multiplexing impossible.

### 1. Joint System Requirements & Partitioning
From Day 1, both teams must collaborate on the **System Requirements Specification (SRS)**:
- Which mathematical operations should be handled in hardware (DSP/FPGA/HW Crypto) versus firmware?
- Power budgets during sleep, standby, and peak radio transmission.
- Shared memory boundaries and bus bandwidth limits.

\`\`\`c
// Example: Hardware abstraction layer (HAL) interface definition
typedef struct {
    uint32_t baudrate;
    uint8_t data_bits;
    uint8_t stop_bits;
    bool enable_dma;
} uart_config_t;

int uart_init_peripheral(const uart_config_t* cfg);
\`\`\`

### 2. Early Firmware Emulation & Virtual Prototyping
Don't wait for copper. Use QEMU, Renode, or breadboard dev kits with identical MCU cores to write peripheral drivers before prototype fabrication.

### 3. Clear Test Points and Debug Headers
Ensure hardware teams route dedicated SWD/JTAG headers, logic analyzer test points, and UART console pins with 2.54mm or 1.27mm pitch headers.

> "A $0.10 test pad during PCB layout saves $10,000 in firmware debug labor."`,
      contentHtml: `<p>Embedded systems projects frequently encounter costly rework and slipped deadlines because hardware engineers and firmware developers work in separate silos...</p>`
    },
    {
      title: 'Hardware-in-the-Loop (HIL) Testing: Why It\'s Crucial for Mission-Critical Systems',
      slug: 'hardware-in-the-loop-hil',
      category: 'Embedded Electronics',
      tags: 'testing,HIL,automotive,verification,QA',
      summary: 'Why physical testing alone is insufficient. How HIL simulation isolates corner cases in automotive ECUs, battery management systems, and medical devices.',
      readingTime: 5,
      author: 'Embedded India Engineering Team',
      status: 'published',
      publishedAt: '2025-11-16T17:58:51.000Z',
      contentMarkdown: `## What is Hardware-in-the-Loop (HIL) Testing?

Hardware-in-the-Loop (HIL) testing connects your real electronic control unit (ECU) or embedded controller to a simulated mathematical model of the physical environment (motors, sensors, actuators, battery cells, and grid interfaces).

### Why Pure Software Simulation Is Never Enough
Software unit tests cannot account for:
1. Exact clock drift, jitter, and timer interrupt latency.
2. Analog sensor noise, voltage dips, and grounding offsets.
3. Bus contention and arbitration collisions on CAN-FD or RS-485.

\`\`\`python
# Automated Python HIL test harness example
import can
import time

def test_overcurrent_protection():
    bus = can.interface.Bus(channel='can0', bustype='socketcan')
    # Inject fault: current spike
    fault_msg = can.Message(arbitration_id=0x120, data=[0xFF, 0x05, 0x00, 0x00], is_extended_id=False)
    bus.send(fault_msg)
    
    # Assert ECU trips relay within 15ms
    response = bus.recv(timeout=0.015)
    assert response is not None and response.data[0] == 0x00, "ECU failed to trigger safe shutdown"
\`\`\`

### Key Benefits of HIL
- **Non-Destructive Fault Injection:** Test overvoltage, short circuits, and reverse polarity without exploding physical components.
- **24/7 Automated Regression:** Run thousands of automated drive cycles or thermal stress profiles overnight.`,
      contentHtml: `<p>Hardware-in-the-Loop (HIL) testing connects your real electronic control unit...</p>`
    },
    {
      title: 'Managing Component Obsolescence in Industrial PCB Designs',
      slug: 'pcb-obsolescence',
      category: 'Troubleshooting',
      tags: 'PCB,supply-chain,obsolescence,BOM,redesign',
      summary: 'Strategies to protect long-lifecycle industrial products from sudden component end-of-life (EOL) announcements and chip shortages.',
      readingTime: 4,
      author: 'Embedded India Engineering Team',
      status: 'published',
      publishedAt: '2025-11-16T17:56:01.000Z',
      contentMarkdown: `## The Reality of 10+ Year Industrial Lifecycles

Unlike consumer smartphones that refresh annually, industrial controllers, smart energy meters, and automotive modules are expected to stay in active production for 7 to 15 years.

### Strategic BOM Architecture
1. **Multi-Footprint Layouts:** Place dual footprints (e.g., SOIC-8 alongside TSSOP-8, or 0603 alongside 0402) on passive and op-amp positions.
2. **Standard Pin-Compatible Regulators:** Favor industry-standard buck converter and LDO pinouts (like SOT-223 / SOT-23-5 configurations with common pinouts).
3. **Cross-Platform Firmware HAL:** Keep your application code decoupled from manufacturer-specific registers through a modular Hardware Abstraction Layer.

\`\`\`c
// Abstracting flash memory driver across Winbond, Micron, and Macronix SPI NOR chips
int flash_read_jedec_id(uint8_t *manufacturer_id, uint16_t *device_id);
int flash_sector_erase(uint32_t address);
\`\`\`

### Continuous Lifecycle Monitoring
Integrate API tools with component aggregators to receive automated PCN (Product Change Notification) and EOL alerts 6-12 months before last-time-buy windows close.`,
      contentHtml: `<p>Unlike consumer smartphones that refresh annually, industrial controllers...</p>`
    },
    {
      title: 'Securing the Embedded Boot Chain: From Silicon to Application',
      slug: 'securing-the-boot-chain',
      category: 'Embedded Electronics',
      tags: 'security,cryptography,secure-boot,trustzone,OTA',
      summary: 'How to implement hardware root-of-trust, cryptographic signature verification, and anti-rollback protection in connected IoT microcontrollers.',
      readingTime: 6,
      author: 'Embedded India Engineering Team',
      status: 'published',
      publishedAt: '2025-11-16T17:53:36.000Z',
      contentMarkdown: `## Why IoT Security Fails at the Perimeter

Physical and wireless access to connected devices makes firmware tampering a premier attack vector. If an attacker can flash custom firmware or extract cryptographic keys from flash, your entire device fleet is compromised.

### The Steps of a Secure Boot Sequence
1. **Silicon ROM (Root of Trust):** Hard-wired, immutable ROM code verifies the second-stage bootloader's digital signature using an RSA or ECC public key burned into eFuse.
2. **Second-Stage Bootloader:** Validates application partitions, checks the monotonic anti-rollback counter, and configures Memory Protection Units (MPU).
3. **Encrypted Firmware Execution:** Decrypts application code on-the-fly using AES-XTS or AES-CTR hardware acceleration.

\`\`\`bash
# Verifying an image signature with OpenSSL before flashing
openssl dgst -sha256 -verify ec_public_key.pem -signature firmware.sig firmware.bin
\`\`\`

### Protecting Sensitive Credentials
Never hardcode API keys or Wi-Fi passwords in raw flash. Use Secure Elements (ATECC608B, OPTIGA Trust M) or MCU internal Hardware Unique Keys (HUK).`,
      contentHtml: `<p>Physical and wireless access to connected devices makes firmware tampering...</p>`
    },
    {
      title: 'The Edge Advantage: Implementing Edge AI on Microcontrollers (TinyML)',
      slug: 'the-edge-advantage',
      category: 'Industry Info',
      tags: 'TinyML,EdgeAI,machine-learning,sensor-fusion,low-power',
      summary: 'Deploying neural networks on Cortex-M4 and Cortex-M7 cores with under 256KB of RAM for anomaly detection and audio keyword spotting.',
      readingTime: 5,
      author: 'Embedded India Engineering Team',
      status: 'published',
      publishedAt: '2025-11-16T17:48:02.000Z',
      contentMarkdown: `## Why Move Inference from Cloud to Edge?

Transmitting continuous raw vibration or acoustic telemetry over cellular or satellite is prohibitively expensive and drains batteries. Edge AI runs inference locally on the microcontroller in sub-millisecond intervals.

### The Quantization Pipeline (Float32 to Int8)
By converting 32-bit floating point weights into 8-bit integers (INT8), memory consumption drops by 75% and execution speed skyrockets using CMSIS-NN SIMD instructions.

\`\`\`c
// CMSIS-NN Int8 Depthwise Convolution Kernel
arm_status arm_depthwise_conv_s8(
    const cmsis_nn_context *ctx,
    const cmsis_nn_dw_conv_params *dw_conv_params,
    const cmsis_nn_per_channel_quant_params *quant_params,
    const cmsis_nn_dims *input_dims,
    const q7_t *input_data,
    const cmsis_nn_dims *filter_dims,
    const q7_t *filter_data,
    const cmsis_nn_dims *output_dims,
    q7_t *output_data
);
\`\`\`

### Practical Industrial Applications
- **Predictive Motor Maintenance:** Accelerometer FFT analysis detecting bearing micro-fractures.
- **Leak Detection:** Acoustic vibration classification on water and gas pipelines.`,
      contentHtml: `<p>Transmitting continuous raw vibration or acoustic telemetry...</p>`
    },
    {
      title: 'Beyond the Basics: High-Speed Digital PCB Layout Guidelines',
      slug: 'beyond-the-basics',
      category: 'Guides',
      tags: 'PCB,high-speed,impedance,DDR,differential-pairs',
      summary: 'Controlling controlled impedance, return paths, via stubs, and skew matching on USB 2.0/3.0, Ethernet, and DDR memory routing.',
      readingTime: 6,
      author: 'Embedded India Engineering Team',
      status: 'published',
      publishedAt: '2025-11-16T17:45:10.000Z',
      contentMarkdown: `## High-Speed Is About Physics, Not Just Frequency

In digital PCB design, it is not the clock frequency that dictates high-speed physics, but the signal **rise and fall time (tr)**. A 10MHz square wave with a 500ps edge transition contains harmonic frequencies well into the GHz range.

### Essential Rules for Clean High-Speed Signals
1. **Continuous Reference Planes:** Never route high-speed differential pairs (USB, HDMI, Ethernet) across plane splits. Any discontinuity causes high EMI and signal reflections.
2. **Length & Skew Matching:** Match the physical trace lengths of differential signals within 0.1mm (5 mils) to maintain phase alignment.
3. **Eliminate Via Stubs:** For frequencies exceeding 3GHz, use back-drilling or blind/buried microvias to prevent resonant stub reflections.

\`\`\`text
Microstrip Impedance formula:
Zo = (87 / sqrt(Er + 1.41)) * ln((5.98 * h) / (0.8 * w + t))
\`\`\`

Use our interactive [PCB Trace Width & Impedance Calculator](/tools/pcb-trace) to calculate exact trace geometry for standard FR-4 substrates!`,
      contentHtml: `<p>In digital PCB design, it is not the clock frequency that dictates...</p>`
    }
  ];

  const upsertPost = db.prepare(`
    INSERT INTO Post (id, title, slug, category, tags, summary, contentMarkdown, contentHtml, author, status, readingTime, publishedAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      category = excluded.category,
      tags = excluded.tags,
      summary = excluded.summary,
      contentMarkdown = excluded.contentMarkdown,
      contentHtml = excluded.contentHtml,
      updatedAt = excluded.updatedAt
  `);

  for (const post of posts) {
    upsertPost.run(
      crypto.randomUUID(),
      post.title,
      post.slug,
      post.category,
      post.tags,
      post.summary,
      post.contentMarkdown,
      post.contentHtml,
      post.author,
      post.status,
      post.readingTime,
      post.publishedAt,
      now,
      now
    );
  }
  console.log('[SEED] Blog articles initialized');

  // 4. Calculator stats
  const tools = ['pcb-trace', '555-timer', 'led-resistor', 'uart-baud', 'smd-code', 'battery-life', 'trace-impedance'];
  const insertStat = db.prepare(`
    INSERT OR IGNORE INTO CalculatorStat (id, toolName, executionCount, updatedAt)
    VALUES (?, ?, ?, ?)
  `);
  for (const tool of tools) {
    insertStat.run(crypto.randomUUID(), tool, Math.floor(Math.random() * 50) + 10, now);
  }

  console.log('[SEED] Direct SQLite seed complete!');
}

seed().catch(console.error);
