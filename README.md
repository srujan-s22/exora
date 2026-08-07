# Exora — Exhibition Management Platform

**Exora** is a comprehensive, production-grade Exhibition Management Platform designed for high-throughput venue operations. Built with Next.js (App Router), TypeScript, MongoDB Atlas, and Tailwind CSS, it orchestrates exhibition entry ticketing, attraction/ride ticketing, real-time camera-based QR scanning, point-of-sale (POS) counter transactions, financial reconciliation, and fraud monitoring.

---

## 🚀 Key Features

### 🎟️ Ticketing & Point-of-Sale (POS)
- **Entry & Ride Ticket Sales**: Streamlined POS interfaces tailored for counter operators to issue single or bundled tickets.
- **HMAC-Signed QR Generation**: Secure, tamper-proof QR codes generated with HMAC signatures for instant camera validation.
- **Bulk Batch Printing**: Automated generation of pre-printed physical ticket batches with unique QR serials.
- **Thermal Print Formatting**: Custom thermal printer layouts supporting configurable receipt dimensions and compact paper output.

### 🚪 Gate Entry & Ride Scanning
- **In-Browser Camera Scanning**: High-speed QR scanning using webcam/device camera via `html5-qrcode`.
- **Atomic Usage Tracking**: Prevents race conditions and double-redemption through atomic MongoDB updates.
- **Scan Lockouts & Cooldowns**: Built-in duplicate scan prevention to eliminate accidental double-scans at busy gates.
- **Operational Alerts**: Friendly visual & audio feedback for valid, expired, already used, or cancelled tickets.

### 🛡️ Security, Roles & Permissions
- **HTTP-Only JWT Session Flow**: Server-validated session handling with encrypted cookies.
- **Role-Based Access Control (RBAC)**: Support for 5 main operational roles:
  - `super_admin`: Full system control and permission delegation.
  - `admin`: Facility management, report generation, pricing & system configuration.
  - `counter`: Point-of-sale operations (granular permission-controlled).
  - `gate`: Venue entry QR validation at main turnstiles/gates.
  - `ride`: Attraction ticket scanning at specific rides.
- **Granular Counter Permissions**: Permission flags (e.g., `canSellEntryTickets`, `canCancelEntryTickets`, `canSellRideTickets`, `canReprintRideTickets`).
- **Structured Audit Trail**: Automatic logging of administrative actions, ticket cancellations, permission modifications, and user sign-ins.

### 📊 Analytics & Fraud Monitoring
- **Real-Time Dashboards**: Revenue, footfall count, peak hour distribution, and ride utilization charts powered by Recharts.
- **Fraud Anomaly Detection**: Automated monitoring to flag suspicious transaction patterns, staff anomalies, and repeat scan attempts.
- **Financial Reconciliation**: Cash vs. digital payment balancing tools for daily operator drawer closeouts.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js (App Router, Server Actions, API Routes) |
| **Language** | TypeScript (Strict mode) |
| **Database & ORM** | MongoDB Atlas with Mongoose ORM |
| **Styling & UI** | Tailwind CSS, Framer Motion, Lucide React Icons |
| **Authentication & AuthZ** | Custom JWT in HTTP-Only Cookies, Zod Validation |
| **QR & Scanning** | `qrcode` (Generation) & `html5-qrcode` (Camera Scanning) |
| **Analytics & Visualization** | Recharts Data Visualization Library |
| **Performance Insights** | `@vercel/speed-insights` |

---

## 📁 Repository Structure

```
Exora/
├── public/                 # Static assets, logos, and icons
├── scripts/                # Maintenance, seeding, and user management scripts
│   ├── create-admin.ts     # CLI script to create admin users
│   ├── create-user.ts      # CLI script to onboard staff users
│   ├── reset-password.ts   # Emergency terminal password reset tool
│   └── seed.ts             # Master database seeder
└── src/
    ├── app/                # Next.js App Router (Pages & API routes)
    │   ├── (auth)/         # Login, setup, and unauthorized routes
    │   ├── (dashboard)/    # Role-based portals (admin, counter, gate, ride)
    │   └── api/            # REST API endpoints for all modules
    ├── components/         # React UI Components
    │   ├── layout/         # Navigation bars, sidebars, headers, wrappers
    │   ├── providers/      # React context providers (Auth, Theme, Toast)
    │   ├── shared/         # Shared domain components (QR Scanner, Ticket Cards)
    │   └── ui/             # Reusable UI primitives (Button, Modal, Table, etc.)
    ├── hooks/              # Custom React hooks
    ├── lib/                # Core business logic & database layer
    │   ├── config/         # Environment variables, role matrices, navigation
    │   ├── db/             # Mongoose connection & collection models
    │   ├── middleware/     # Auth, RBAC, Rate-limiting, Audit logging middleware
    │   ├── services/       # Domain service layer (Ticket, Sale, Ride, Staff, etc.)
    │   ├── utils/          # Cryptographic, date, QR, and formatting utilities
    │   └── validators/     # Zod input validation schemas
    └── types/              # TypeScript interface definitions
```

---

## ⚙️ Getting Started

### Prerequisites
- **Node.js**: v20.0.0 or higher
- **Package Manager**: `npm` (v10+)
- **Database**: MongoDB Atlas cluster or local MongoDB v6+ instance

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-org/exora.git
cd Exora
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the root directory based on `.env.example`:

```env
# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/exora?retryWrites=true&w=majority

# Security Secrets
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
QR_HMAC_SECRET=your_super_secret_qr_hmac_key_min_32_chars
BOOTSTRAP_SECRET=your_initial_setup_secret_key
TOTP_ENCRYPTION_KEY=your_32_byte_hex_totp_encryption_key_min_64_hex_chars

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Database Seeding & Setup
Run the bootstrap seeder to set up initial roles, exhibition data, sample rides, and default admin credentials:

```bash
npx tsx scripts/seed.ts
```

Alternatively, to create a specific administrative user directly:
```bash
npx tsx scripts/create-admin.ts
```

### 4. Running Development Server
Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the portal.

---

## 📜 Available Scripts

- `npm run dev` — Starts the Next.js development server with Webpack compilation.
- `npm run build` — Compiles and builds the production application bundle.
- `npm run start` — Starts the Next.js production server.
- `npm run lint` — Runs ESLint across the codebase to ensure code quality.

---

## 🔒 Production Safety & Security Guidelines

Exora is designed for live production deployments:
1. **Never Hardcode Secrets**: Keep secrets strictly in environment variables.
2. **Server-Enforced Authorization**: Frontend permission checks are for UI visibility only; all API routes enforce server-side validation via `withAuth`, `withRole`, and `withPermission` middleware.
3. **Atomic Inventory Control**: Ticket redemptions use Mongoose atomic operations (`$inc`, `$push`) to avoid race conditions.
4. **HTTPS Required**: Camera access for QR scanning in production requires an HTTPS connection.

---

## 📄 License

This project is proprietary and confidential. All rights reserved.
