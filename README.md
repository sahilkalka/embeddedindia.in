# Embedded India - Web Portal & Engineering Hub

A complete, production-ready full-stack Node.js web application cloning and expanding [https://embeddedindia.in/](https://embeddedindia.in/) (strictly focused on the main domain). It replicates the official design, layout, typography (Roboto & Roboto Slab), and color palette (Emerald Green `#007f5f`, Leaf Green `#55a630`, Dark Slate `#192c27`) while enhancing the platform with interactive engineering calculators, an automated technical blog engine with code syntax highlighting, double opt-in lead magnets, automated SEO & sitemaps, and a comprehensive authenticated admin management dashboard.

---

## Key Features & Architecture

```
                    ┌───────────────────────────────────────────────┐
                    │               Client Browser                  │
                    │   (Responsive, Dark/Light Mode, Tailwind)     │
                    └──────┬───────────────┬───────────────┬────────┘
                           │               │               │
                     Public Pages      /tools (Eng)    /admin CMS
                           │               │               │
    ┌──────────────────────▼───────────────▼───────────────▼────────┐
    │                    Node.js + Express.js Core                  │
    │  - Helmet & CORS Security       - Rate Limiting (express-lim) │
    │  - Session / JWT Auth           - Dynamic Sitemap & Robots    │
    │  - EJS View Engine + Tailwind   - Dynamic OG Social Images    │
    └──────────────┬───────────────────────────────┬────────────────┘
                   │                               │
       ┌───────────▼───────────┐       ┌───────────▼───────────┐
       │   Prisma ORM Database │       │ Background Cron Tasks │
       │  (Users, Posts, Leads,│       │  - Auto-Publish Blog  │
       │   Inquiries, Settings)│       │  - Weekly News Digest │
       └───────────────────────┘       └───────────────────────┘
```

### 1. 100% Asset Localization (Zero External Dependencies)
All SVGs (`download-2.svg` through `download-9-1.svg`, `mission1.svg` through `mission3.svg`, `contact-us.svg`), animations (`arrow.gif`, `puzzle.gif`, `coins.gif`), and the brand logo are downloaded directly from `embeddedindia.in` and served locally from `/public/assets/images/`.

### 2. Global Light & Dark Theme Toggle
Seamless dark and light theme toggle respecting system preferences (`prefers-color-scheme`) by default and persisting user preference in `localStorage`. Customized high-tech dark mode palette (`#0d1715`, `#182c27`, `#27443d`) with subtle circuit board grid textures.

### 3. Contact Us Page & 3-Layer Anti-Spam Protection
- **Layer 1: Hidden Honeypot Input:** Traps automated bot crawlers filling `website_url_trap` without alarming legitimate users.
- **Layer 2: Server-Side Rate Limiter:** IP-based throttling limiting form submissions to 5 requests per 15 minutes.
- **Layer 3: Automated Admin Notifications:** Dispatches branded alert emails directly to `info@embeddedindia.in` with full inquiry specifications.

### 4. Dynamic Technical Blog Engine
- Focuses on Embedded Electronics, Guides, Troubleshooting, and Industry Info.
- Markdown rendering with syntax highlighting (`highlight.js`) for **C/C++, Python, Rust, Verilog, and Assembly**.
- Filter by category, tags, and full-text keyword search.
- Pre-populated with official articles from Embedded India (*Bridging the Divide*, *Hardware-in-the-Loop HIL*, *PCB Obsolescence*, *Securing the Boot Chain*, *The Edge Advantage*, *High-Speed PCB Layout Guidelines*).
- Native mid-article promotional banners with UTM parameter tracking.

### 5. Interactive Engineering Calculators (`/tools`)
Client-side interactive calculators with immediate mathematical computation and dynamic diagrams:
1. **IPC-2221 PCB Trace Width Calculator:** Calculates required width (mils & mm), resistance, voltage drop, and power loss for internal and external copper layers across copper weights (0.5 oz, 1 oz, 2 oz, 3 oz). Features an SVG cross-sectional profile.
2. **555 Timer Circuit Calculator:** Astable and Monostable modes; calculates frequency ($f$), duty cycle ($D$), $T_{\text{high}}$, and $T_{\text{low}}$ times with live animated square waveform rendering and NE555 DIP-8 pinout diagram.
3. **LED Series Resistor & Ohm's Law Calculator:** Calculates exact resistance, selects closest commercial E12/E24 resistor values, and recommends safety wattage ratings (1/8W, 1/4W, 1/2W, 1W) with 2x derating.
4. **UART Baud Rate & Clock Error Calculator:** Computes MCU reload registers (STM32 BRR, AVR UBRR, 8051 TH1) and determines framing error percentage with color-coded safety classifications.
5. **SMD Resistor Code Decoder:** Decodes 3-digit, 4-digit, and EIA-96 precision surface-mount resistor codes into ohms, tolerance, and multipliers.
6. **IoT Battery Life Estimator:** Computes operating lifetime in days and years for wireless nodes based on sleep current, active transmit spikes, and duty cycles.
7. **Microstrip Impedance (Zo) Calculator:** Calculates characteristic 50-ohm and 90-ohm transmission line geometries for high-speed digital and RF traces.
8. **Interactive MCU Pinout Guide:** Reference cheat sheets for ESP32, STM32 Blue Pill, and Raspberry Pi Pico RP2040.
- Each calculator features a native CTA banner: *"Need custom PCB or Firmware Design? Request an Engineering Consultation"*.

### 6. Newsletter & Double Opt-in Lead Magnet
- Lead capture boxes placed across the footer, blog sidebar, and calculator results: *"Subscribe for Daily Embedded Tips & Free PCB Design Checklist"*.
- Secure double opt-in verification token workflow.
- Automatically generates and delivers the branded PDF lead magnet (*The 2026 Embedded Hardware & Firmware Design Checklist*) hosted locally at `/public/downloads/embedded-design-checklist.pdf`.
- Weekly newsletter digest cron job compiling newly published technical articles every Monday at 9:00 AM IST with a one-click unsubscribe mechanism.

### 7. Automated SEO, Sitemaps & Dynamic OG Images
- **Dynamic XML Sitemap (`/sitemap.xml`):** Programmatically generated with `<lastmod>`, `<changefreq>`, and `<priority>` for all static pages, tools, and blog articles. Cached with invalidation.
- **Dynamic `robots.txt` (`/robots.txt`):** Allows public crawler indexing while disallowing `/admin/`, `/api/`, and `/auth/`.
- **Dynamic OpenGraph Images (`/api/og`):** Auto-generates branded 1200x630 social sharing preview SVG cards containing the article title and brand badge.
- **Schema.org Structured Data:** Injects `Organization` schema on the homepage, `Article` schema on blog posts, and `WebApplication` schema on calculator pages.

### 8. Comprehensive Admin Management Dashboard (`/admin`)
- Protected by secure session/JWT authentication and bcrypt password hashing.
- **Analytics & KPIs:** Real-time metrics for total page views, inquiry volume, active subscribers, and popular calculator runs.
- **Inquiry Manager:** Filter inquiries by status (*New, In Progress, Resolved*), view messages, reply via email, or delete entries.
- **Subscriber & Lead Management:** View all subscribers, export email list to CSV, and track delivery of the lead magnet PDF.
- **Blog CMS:** Create, edit, and schedule articles with live SEO score analyzer (checking title length, meta summary, subheadings, and code snippets) and an AI Technical Draft outline generator.
- **Site Configuration:** Configure company contact information, Google AdSense keys, Meta pixels, and native internal promotional banner copy directly from the dashboard.

---

## Quick Start & Installation

### Prerequisites
- Node.js >= 18.x (tested on v24)
- npm >= 9.x

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd embeddedindia.in
npm install
```

### 2. Initialize Database & Seed Content
```bash
npm run db:init
```
*This synchronizes the Prisma schema with SQLite (`dev.db`), seeds the default admin user, creates the 6 official Embedded India technical articles, initializes default site settings, and generates the lead magnet PDF.*

### 3. Localize Static Assets
```bash
npm run localize-assets
```
*Downloads all SVGs, logos, animations, and icons from `https://embeddedindia.in/` into `/public/assets/images/`.*

### 4. Build Styles & Start Server
```bash
# Compile Tailwind CSS
npm run build:css

# Start Application
npm start
```

Open your browser at:
- **Public Website:** `http://localhost:3000`
- **Engineering Tools:** `http://localhost:3000/tools`
- **Technical Blog:** `http://localhost:3000/blogs`
- **Admin Dashboard:** `http://localhost:3000/admin`
- **Dynamic XML Sitemap:** `http://localhost:3000/sitemap.xml`

---

## Default Admin Credentials

| Parameter | Value |
|---|---|
| **Admin Login URL** | `http://localhost:3000/admin/login` |
| **Email** | `admin@embeddedindia.in` |
| **Default Password** | `AdminEmbedded@2026!` |

*(Configurable via `.env` file)*

---

## Automated Tests

Run the comprehensive Jest test suite:
```bash
npm test
```
The test suite validates:
- Public pages and branding replication
- Engineering calculators HTTP endpoints
- Technical blog slug routing and code highlighting
- XML Sitemap and Robots.txt compliance
- Anti-spam honeypot trapping and inquiry storage
- Newsletter double opt-in registration
- Admin login, bcrypt verification, and session authentication
