# FFeud App

A T3 Turbo monorepo with Next.js web app and Expo mobile app.

## Quick Start

### Run the Web App (Next.js)

```bash
pnpm run dev-studio
```

This starts the Next.js development server at [http://localhost:3000](http://localhost:3000).

### Run on Physical Device (Expo/iOS)

```bash
pnpm run dev-device
```

This builds and installs the Expo development client on your connected iOS device.

> **Note:** Make sure your device is connected via USB and trusted. For Android devices, use `pnpm -F @acme/expo android` instead.

## Project Structure

```
apps/
├── expo/          # React Native mobile app (Expo SDK 54)
├── nextjs/        # Next.js 15 web app
└── tanstack-start/ # TanStack Start (alternative web app)

packages/
├── api/           # tRPC router definitions
├── auth/          # Authentication (better-auth)
├── db/            # Database (Drizzle ORM)
├── ui/            # Shared UI components (shadcn/ui)
└── validators/    # Shared validation schemas
```

## Other Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all apps in development mode |
| `pnpm build` | Build all apps |
| `pnpm lint` | Run linting |
| `pnpm typecheck` | Run TypeScript type checking |
