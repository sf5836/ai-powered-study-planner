# FocusIQ

FocusIQ is an AI-powered smart study planner built with React, TypeScript, Tailwind CSS, Zustand, and Chart.js.
It combines planning, live study sessions, analytics, and configurable focus workflows in one app.

## Prerequisites

- Node.js 18+
- npm 9+

## Quick Start

```bash
git clone <your-repo-url>
cd Ai Powered study planner/frontend
npm install
npm run dev
```

Open the local URL shown by Vite (usually http://localhost:5173).

## Project Structure

The main frontend source lives in `frontend/src`:

- `src/main.tsx`: React bootstrap, router mount, app-level error boundary
- `src/App.tsx`: route map, protected layout, lazy-loaded pages
- `src/pages/`: top-level screens
  - `Dashboard.tsx`
  - `Planner.tsx`
  - `Session.tsx`
  - `Reports.tsx`
  - `Settings.tsx`
  - `auth/Login.tsx`
  - `auth/Signup.tsx`
- `src/components/`: reusable UI modules by domain
  - `dashboard/`
  - `planner/`
  - `session/`
  - `reports/`
  - `layout/`
  - `ui/`
- `src/stores/`: Zustand stores
  - `sessionStore.ts`
  - `sessionsStore.ts`
  - `plannerStore.ts`
  - `userStore.ts`
- `src/store/authStore.ts`: auth state slice
- `src/hooks/`: reusable logic hooks (`useWebcam`, `useAlertEngine`, timers)
- `src/services/mockAIService.ts`: mock AI event emitter for live session simulation
- `src/data/mockData.ts`: seed subjects, topics, planner sessions, and session records
- `src/types/index.ts`: shared TypeScript contracts

## Swapping in Real AI

FocusIQ is already wired around event streams, so integration is straightforward.

1. Replace internals of `src/services/mockAIService.ts` with `socket.io-client` (or your preferred WebSocket client).
2. Keep emitting/handling the same event names used by the app:
   - `focusUpdate`
   - `emotionUpdate`
   - `gestureUpdate`
3. Ensure your server emits payloads matching current expected shapes.

No component/store API changes are required if event names and payload contracts stay consistent.

## Adding Real Auth

1. Replace fake submit handlers in:
   - `src/pages/auth/Login.tsx`
   - `src/pages/auth/Signup.tsx`
2. Call your auth endpoint with `fetch()`.
3. Store JWT in `localStorage`.
4. Add an API helper (e.g. `src/services/api.ts`) that automatically sends:
   - `Authorization: Bearer <token>`

Then wire protected endpoints through that helper.

## Adding PDF Export

1. Install dependencies:

```bash
npm install jspdf html2canvas
```

2. Wrap report content in a React `ref`.
3. On export:
   - render the ref with `html2canvas`
   - feed the image into `jsPDF.addImage`
   - save as `.pdf`

This can be integrated into the Reports table/action bar without changing analytics logic.

## Environment Variables

Create `frontend/.env` (or `.env.local`) with:

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=ws://localhost:3001
```

Use `import.meta.env.VITE_API_URL` and `import.meta.env.VITE_SOCKET_URL` in your API/socket modules.
