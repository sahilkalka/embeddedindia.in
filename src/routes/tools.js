// src/routes/tools.js
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');

// Helper to track tool usage
async function incrementToolStat(toolName) {
  try {
    await prisma.calculatorStat.upsert({
      where: { id: toolName }, // If id is matching or find by toolName
      update: { executionCount: { increment: 1 } },
      create: { toolName, executionCount: 1 }
    });
  } catch (e) {
    // If id mismatch, find first
    try {
      const stat = await prisma.calculatorStat.findFirst({ where: { toolName } });
      if (stat) {
        await prisma.calculatorStat.update({ where: { id: stat.id }, data: { executionCount: { increment: 1 } } });
      } else {
        await prisma.calculatorStat.create({ data: { toolName, executionCount: 1 } });
      }
    } catch (err) {}
  }
}

// Main Tools Directory
router.get('/', (req, res) => {
  res.locals.seo.title = 'Interactive Embedded Engineering Calculators & Design Tools | Embedded India';
  res.locals.seo.description = 'Free online engineering calculators for hardware & firmware designers: IPC-2221 PCB trace width, 555 timer, LED resistor, UART baud rate error, and SMD codes.';
  res.render('pages/tools/index');
});

// 1. PCB Trace Width Calculator
router.get('/pcb-trace', (req, res) => {
  incrementToolStat('pcb-trace');
  res.locals.seo.title = 'IPC-2221 PCB Trace Width Calculator | Embedded India';
  res.locals.seo.description = 'Calculate required PCB trace width, cross-sectional area, resistance, and voltage drop according to IPC-2221 standards for internal and external layers.';
  res.locals.seo.structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'IPC-2221 PCB Trace Width Calculator',
    applicationCategory: 'EngineeringCalculator',
    operatingSystem: 'Any'
  };
  res.render('pages/tools/pcb-trace');
});

// 2. 555 Timer Calculator
router.get('/555-timer', (req, res) => {
  incrementToolStat('555-timer');
  res.locals.seo.title = '555 Timer Calculator (Astable & Monostable Modes) | Embedded India';
  res.locals.seo.description = 'Calculate 555 timer output frequency, duty cycle, high/low times with interactive circuit diagram and live waveform rendering.';
  res.locals.seo.structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '555 Timer Circuit Calculator',
    applicationCategory: 'EngineeringCalculator'
  };
  res.render('pages/tools/555-timer');
});

// 3. LED Resistor & Ohm's Law
router.get('/led-resistor', (req, res) => {
  incrementToolStat('led-resistor');
  res.locals.seo.title = 'LED Series Resistor & Ohm\'s Law Calculator | Embedded India';
  res.locals.seo.description = 'Calculate exact and standard E12/E24 series resistor values, power dissipation, and safety wattage ratings for any LED circuit.';
  res.render('pages/tools/led-resistor');
});

// 4. UART Baud Rate & Timer Register Calculator
router.get('/uart-baud', (req, res) => {
  incrementToolStat('uart-baud');
  res.locals.seo.title = 'UART Baud Rate & Clock Error Calculator | Embedded India';
  res.locals.seo.description = 'Compute microcontroller timer reload registers, actual baud rate, and framing error percentage across STM32, AVR, and 8051 architectures.';
  res.render('pages/tools/uart-baud');
});

// 5. SMD Code Decoder
router.get('/smd-code', (req, res) => {
  incrementToolStat('smd-code');
  res.locals.seo.title = 'SMD Resistor & Capacitor Code Decoder | Embedded India';
  res.locals.seo.description = 'Decode 3-digit, 4-digit, and EIA-96 precision SMD resistor marking codes instantly with tolerance and resistance specifications.';
  res.render('pages/tools/smd-code');
});

// 6. IoT Battery Life Calculator
router.get('/battery-life', (req, res) => {
  incrementToolStat('battery-life');
  res.locals.seo.title = 'IoT Device Battery Life & Power Budget Calculator | Embedded India';
  res.locals.seo.description = 'Calculate battery operating life for connected IoT nodes based on active/sleep current draw, duty cycles, and self-discharge rates.';
  res.render('pages/tools/battery-life');
});

// 7. Trace Impedance Calculator
router.get('/trace-impedance', (req, res) => {
  incrementToolStat('trace-impedance');
  res.locals.seo.title = 'Microstrip PCB Trace Impedance Calculator | Embedded India';
  res.locals.seo.description = 'Calculate characteristic impedance (Zo) for high-speed microstrip traces on FR-4 substrates based on dielectric thickness and trace width.';
  res.render('pages/tools/trace-impedance');
});

// 8. MCU Pinout Guide
router.get('/mcu-pinout', (req, res) => {
  incrementToolStat('mcu-pinout');
  res.locals.seo.title = 'Interactive Microcontroller Pinout Reference (ESP32, STM32, RP2040) | Embedded India';
  res.locals.seo.description = 'Quick interactive pinout cheat sheets for popular embedded microcontrollers: ESP32-WROOM-32, STM32F103 Blue Pill, and Raspberry Pi Pico.';
  res.render('pages/tools/mcu-pinout');
});

module.exports = router;
