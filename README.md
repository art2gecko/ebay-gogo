# eBay-GoGo

Desktop eBay monitoring and search tool built with Electron, React, and TypeScript. Inspired by uBuyFirst — track eBay listings in real time, get instant notifications, and act fast with keyboard shortcuts.

## Stack

- **Electron** + **electron-vite** (main / preload / renderer)
- **React 18** with **TypeScript**
- **AG Grid Community** for data tables
- **Tailwind CSS** + shadcn/ui-style components
- **SQLite** (better-sqlite3) for local persistence
- **Zustand** for state management
- **Zod** for schema validation

## Features

- **Search** — One-shot eBay searches with filters (price, condition, format, shipping, seller feedback)
- **Monitors** — Create recurring searches that poll eBay at configurable intervals
- **Notifications** — Desktop + sound alerts when new listings appear
- **Keyboard-first** — Hotkeys: `B` (buy), `O` (make offer), `C` (copy link), `I` (ignore seller), `E` (exclude keyword)
- **History** — Browse all seen listings with date-range and monitor filters, CSV export
- **Mock Mode** — Works without eBay API credentials using realistic generated data
- **4-Pane Layout** — Results grid + bottom monitors grid + details pane + images pane, all resizable

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

This launches the Electron app with hot-reload for the renderer process.

### Build

```bash
npm run build      # compile
npm run pack       # package (unpacked)
npm run dist       # create distributable
```

### Type Checking

```bash
npm run typecheck
```

## Configuration

### eBay API Credentials

Go to **Settings** tab in the app and enter your eBay Developer credentials:

- App ID
- Cert ID
- Dev ID
- OAuth Token (optional)

Credentials are stored locally with encryption via electron-store. Leave blank to use **mock mode** which generates realistic test data.

### Environment Variables

Copy `.env.example` to `.env` and fill in your values (optional — you can also configure via the Settings tab):

```
EBAY_APP_ID=
EBAY_CERT_ID=
EBAY_DEV_ID=
EBAY_OAUTH_TOKEN=
```

## Project Structure

```
src/
├── main/                  # Electron main process
│   ├── index.ts           # App entry, window creation
│   ├── store.ts           # Encrypted settings (electron-store)
│   ├── db/
│   │   ├── database.ts    # SQLite CRUD operations
│   │   └── migrations.ts  # Schema setup
│   ├── ebay/
│   │   ├── client.ts      # eBay Finding API client
│   │   └── mock.ts        # Mock data generator
│   ├── engine/
│   │   └── engine.ts      # Monitor scheduling engine
│   └── ipc/
│       └── handlers.ts    # Typed IPC handlers
├── preload/
│   └── index.ts           # Context bridge (invoke, on, openExternal)
├── renderer/
│   ├── App.tsx             # Root component, tab routing
│   ├── main.tsx            # React entry
│   ├── hooks/useIpc.ts     # Typed IPC hooks
│   ├── lib/utils.ts        # Utilities (cn, formatPrice, timeAgo)
│   ├── stores/             # Zustand stores (app, search, monitor)
│   ├── styles/globals.css  # Tailwind base + AG Grid dark theme
│   └── components/
│       ├── ui/             # Button, Input, Select, Toggle, Badge, Dialog
│       ├── layout/         # TopBar, NavTabs
│       ├── search/         # SearchLayout, FilterSidebar, ResultsGrid,
│       │                   #   DetailsPane, ImagesPane, EmptyState
│       ├── monitors/       # MonitorsTab, MonitorsBottomTable, MonitorModal
│       ├── history/        # HistoryTab
│       └── settings/       # SettingsTab
└── shared/
    ├── types.ts            # Core interfaces
    ├── schemas.ts          # Zod schemas
    └── ipc-channels.ts     # Typed IPC channel definitions
```

## License

MIT
