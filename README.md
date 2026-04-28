# NUST Postgraduate System — Mobile App

React Native (Expo Managed) mobile client for the NUST Postgraduate System.  
Connects to the Laravel 11 backend via Sanctum Bearer token authentication.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | React Native (Expo Managed) | SDK 53 | Cross-platform mobile app |
| Language | JavaScript (JSX) | ES2022 | App logic and UI |
| Navigation | React Navigation (Native Stack) | v7 | Screen routing |
| HTTP Client | Axios | v1.15 | API calls to Laravel backend |
| State Management | Zustand | v5 | Global auth and app state |
| Secure Storage | expo-secure-store | v15 | Storing Bearer tokens securely |
| File Handling | expo-document-picker | latest | Thesis/report file uploads |
| File System | expo-file-system | latest | Reading/writing local files |
| Linting | ESLint | v9 | Code quality enforcement |
| CI/CD | GitHub Actions + EAS Build | latest | Automated builds and testing |
| Build Service | Expo EAS | latest | Cloud APK/IPA builds |

---

## Backend Integration

The mobile app is a **consumer** of the NUST Postgraduate System REST API built with Laravel 11.

| Detail | Value |
|--------|-------|
| Auth method | Sanctum Bearer Token |
| Base URL | `/api/v1/` |
| Data format | JSON |
| Token storage | `expo-secure-store` (encrypted on device) |

All API calls are routed through `src/services/api/client.js` — never call fetch or axios directly in screen files.

---

## Project Modules (Mobile)

| Module | Description |
|--------|-------------|
| Auth | Login, logout, session restore |
| Student | Application submission and tracking |
| Supervisor | Student oversight and approvals |
| Internal Evaluator | Checklist review and sign-off |
| External Evaluator | Thesis download, grading, honorarium claim |

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.19.4+ | https://nodejs.org |
| Git | any | https://git-scm.com |
| Expo Go app | latest | App Store / Play Store |

---

## Getting Started (New Team Member)

### 1. Accept the GitHub invite

Check your email for a GitHub collaboration invite and accept it, then clone:

```bash
git clone https://github.com/YOUR-USERNAME/nust-postgraduate-mobile.git
cd nust-postgraduate-mobile
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up your local environment

```bash
cp .env.development .env.local
```

Open `.env.local` and set `EXPO_PUBLIC_API_URL` to the backend URL:
- **Running backend locally:** `http://localhost:8000`
- **Shared dev server:** ask the team lead for the URL

### 4. Start the development server

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

---

## Project Structure

```
src/
├── screens/
│   ├── auth/           # Login screen
│   ├── evaluator/      # Internal & External Evaluator screens
│   ├── student/        # Student module screens
│   └── supervisor/     # Supervisor module screens
├── components/
│   └── common/         # Shared UI components (buttons, cards, inputs)
├── navigation/         # React Navigation stack setup
├── services/
│   └── api/
│       └── client.js   # Axios instance — all API calls go through here
├── store/
│   └── authStore.js    # Zustand store — auth state (login, logout, token)
├── hooks/              # Custom React hooks
├── utils/              # Helper functions
└── constants/          # App-wide constants (colors, route names, etc.)
```

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code only. Never push directly. |
| `develop` | Integration branch. All feature branches merge here. |
| `feature/your-feature-name` | Your individual working branch |

### Daily Workflow

```bash
# 1. Always start from develop
git checkout develop
git pull

# 2. Create your feature branch
git checkout -b feature/your-feature-name

# 3. Do your work, then commit
git add .
git commit -m "feat: describe what you did"

# 4. Push your branch
git push origin feature/your-feature-name

# 5. Open a Pull Request on GitHub targeting develop
```

### Commit Message Format

| Prefix | When to use |
|--------|------------|
| `feat:` | Adding a new feature |
| `fix:` | Fixing a bug |
| `chore:` | Config, setup, dependencies |
| `style:` | UI/styling changes |
| `docs:` | README or documentation updates |

---

## Environment Files

| File | Purpose | Committed to Git? |
|------|---------|------------------|
| `.env.development` | Template for local dev | ✅ Yes |
| `.env.staging` | Used by CI/CD pipeline | ✅ Yes |
| `.env.local` | Your personal local config | ❌ Never commit |

---

## CI/CD Pipeline

Every Pull Request automatically triggers:

1. **Lint** — ESLint must pass with zero errors
2. **Tests** — Jest test suite runs
3. **EAS Preview Build** — Generates an APK for the PR

Merging to `main` triggers a **Production Build** via EAS.

> **Note:** EAS builds require an `EAS_TOKEN` secret set in GitHub → Settings → Secrets and variables → Actions.

---

## Need Help?

- Check the API documentation (link TBD — Phase 2)
- Contact the Mobile team lead
- Open an issue on this GitHub repo
