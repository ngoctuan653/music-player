# YouTube Music Desktop (Windows 11)

A lightweight Windows 11 desktop application dedicated to listening to music from YouTube in a separate window. It features an Apple Music-inspired dark aesthetic, liquid glass effects, running in the system tray, Windows global media hotkeys, local queues and playlists, audio output speaker selection, uBlock DNS ad-protection, and an immersive listening experience.

---

## 🌟 Key Features

- **Audio-focused UI with Apple Music Dark Aesthetic:**
  - Modern, dark-first UI inspired by Apple Music with sleek typography, smooth animations, and dynamic album glow backdrops.
  - Integrates an Electron YouTube singleton player throughout the application's lifecycle (the player is never interrupted or reloaded when navigating between pages).
  - Compact Picture-in-Picture / Mini Video View or completely backgrounded audio playback.
  - **Liquid Glass Visual Tiers:** Dynamic glass surface effects (`high`, `balanced`, `performance`, `off`) with automatic performance-saving fallback on battery or low-power GPUs.
- **Instant Ad Protection & uBlock DNS:**
  - Integrated encrypted DNS over HTTPS (DoH) via uBlock DNS (`https://my.ublockdns.com/na56bjem`).
  - Active in-stream ad bypass and instant dismissal of age confirmation/interstitial warnings (supporting videos like Kendrick Lamar's *Not Like Us* seamlessly).
- **Smart Search and Direct Link Support:**
  - Supports directly pasting any YouTube link (`youtube.com/watch?v=...`, `youtu.be/...`, `shorts/...`) or an 11-character video ID for instant playback.
  - Built-in Direct YouTube Search Engine without requiring an API key, with optional YouTube Data API v3 key support in Settings.
  - Curated Relaxing / Lofi / Hits playlists when offline or starting out fresh.
- **Audio Output Selection:**
  - Built-in Studio Dock to route audio directly to headphones, Bluetooth speakers, or external sound cards with a single click.
- **Queue and Local Playlist Management:**
  - Queue actions: Play Now, Enqueue Next, Enqueue End.
  - Automatically plays the next song when the current one ends; supports Repeat modes (`off`, `all`, `one`) and random Shuffle.
  - Smart deduplication & taste-profile engine to keep recommendations fresh and avoid video podcasts or duplicates.
  - Create, rename, and delete personal playlists, as well as a Favorites list.
  - Stores data safely in `localStorage` with schema versioning (`v1.0.0`).
- **Recently Played History:**
  - Keeps up to 60 recently played songs, making it easy to replay them or add them to any playlist.
- **Deep Windows 11 Integration:**
  - Modern frameless window with Minimize, Maximize, and Close buttons.
  - **System Tray:** Double-click or use the context menu to show/hide the app or control Play/Pause/Next/Previous; includes a "Quit completely" option.
  - Global media shortcuts (**Windows Global Media Keys**): `MediaPlayPause`, `MediaNextTrack`, and `MediaPreviousTrack`.

---

## 🛠️ Technology Stack

- **Desktop Shell:** Electron 34
- **Packaging & Release:** `electron-builder` + GitHub Actions CI/CD
- **Frontend Framework:** React 18 + TypeScript + Vite 6
- **Styling:** Tailwind CSS + Vanilla CSS Variables & Glassmorphism
- **Icons:** Lucide React
- **Player Engine:** Electron `<webview>` singleton with native bypass injection
- **DNS Protection:** uBlock DNS DoH

---

## 🚀 Installation and Usage

### 1. Prerequisites

- Operating system: Windows 10 / 11
- Node.js: >= v18 (v20 or later recommended)
- npm: >= v9

### 2. Install dependencies

```bash
npm install
```

### 3. Run in development mode

Run the application with Vite Hot Reload:

```bash
npm run dev
```

### 4. Build and run the desktop app

```bash
npm start
```

### 5. Package Windows EXE locally

```bash
npm run package:win
```
The output installer and portable `.exe` will be located in the `release/` directory.

### 6. Run automated tests

```bash
npm test
```

---

## ⚙️ Automated GitHub Actions Releases

This repository includes a pre-configured CI/CD workflow at `.github/workflows/build-release.yml`. When you push a version tag or trigger the workflow manually from the GitHub Actions tab, it automatically builds:
- **NSIS Installer:** `Music Player Setup <version>.exe`
- **Portable Executable:** `Music Player <version>.exe`

And publishes them directly to your repository's GitHub Releases page.

```bash
# To trigger a release:
git tag v1.0.0
git push origin v1.0.0
```

---

## 📂 Project Structure

```text
music-player/
├── .github/
│   └── workflows/
│       └── build-release.yml # Automated Windows .exe build & GitHub Release
├── electron/
│   ├── main.ts              # BrowserWindow, Tray, IPC, uBlock DNS & ad blocking
│   └── preload.ts           # Secure context bridge between Electron and web app
├── src/
│   ├── components/
│   │   ├── TitleBar/        # Draggable frameless title bar and window controls
│   │   ├── Sidebar/         # Apple Music style sidebar navigation
│   │   ├── PlayerBar/       # Playback controls, scrubber, volume & output selector
│   │   ├── EmbeddedPlayer/  # Singleton YouTube Webview player with ad bypass
│   │   ├── AudioOutputSelector/ # Audio speaker/headphone device selector
│   │   └── PlaylistModal/   # Modal for adding songs to playlists
│   ├── pages/
│   │   ├── HomePage.tsx     # Home page, quick link input, and taste profile cards
│   │   ├── SearchPage.tsx   # Direct YouTube search and API quota notifications
│   │   ├── QueuePage.tsx    # Current playback queue
│   │   ├── PlaylistsPage.tsx# Playlists management
│   │   ├── HistoryPage.tsx  # Recently played songs
│   │   └── SettingsPage.tsx # uBlock DNS, Audio output & API settings
│   ├── services/
│   │   ├── playerService.ts # Ad skipping & interstitial consent dismissal
│   │   ├── audioOutputService.ts # Media device enumeration & sinkId routing
│   │   ├── playlistService.ts # Queue, playlist & autoplay management
│   │   └── youtubeSearch.ts # Direct scraping + YouTube Data API v3 fallback
│   ├── storage/
│   │   └── localStore.ts    # Versioned local storage
│   ├── models/
│   │   └── types.ts         # TypeScript models and interfaces
│   ├── App.tsx              # Root component & theme provider
│   ├── index.css            # Apple Music dark design system
│   └── main.tsx             # React DOM entry point
├── tests/                   # 33 comprehensive unit tests
├── package.json             # electron-builder release configuration
└── vite.config.ts
```
