# YouTube Music Desktop (Windows 11)

A lightweight Windows 11 desktop application dedicated to listening to music from YouTube in a separate window. It supports running in the system tray, media hotkeys, local queues and playlists, and a focused audio-listening experience.

---

## 🌟 Key Features

- **Audio-focused UI:**
  - Integrates the official Google YouTube Embedded IFrame Player API.
  - Uses exactly **one player instance** throughout the application's lifecycle (the player is not reloaded when navigating between pages).
  - Supports opening a compact video window (Mini Video View / Picture-in-Picture) or hiding the window in the background for focused listening.
- **Smart search and direct link support:**
  - Supports directly pasting any YouTube link (`youtube.com/watch?v=...`, `youtu.be/...`, `shorts/...`) or an 11-character video ID for instant playback.
  - Automatically retrieves metadata (title, author, and thumbnail) through oEmbed without requiring an API key.
  - Integrates the **YouTube Data API v3**, with an API key configuration field in Settings and 400 ms debouncing.
  - Provides curated Relaxing / Lofi / Hits playlists when no API key is configured.
- **Queue and local playlist management:**
  - Add songs to the queue using Play Now, Enqueue Next, or Enqueue End.
  - Automatically plays the next song when the current one ends; supports Repeat modes (`off`, `all`, `one`) and random Shuffle.
  - Create, rename, and delete personal playlists, as well as a Favorites list.
  - Stores data safely in `localStorage` with schema versioning (`v1.0.0`).
- **Recently Played history:**
  - Keeps up to 60 recently played songs, making it easy to replay them or add them to any playlist.
- **Deep Windows 11 integration:**
  - Modern frameless window with Minimize, Maximize, and Close buttons.
  - **System Tray:** Double-click or use the context menu to show/hide the app or control Play/Pause/Next/Previous; includes a "Quit completely" option.
  - Global media shortcuts (**Windows Global Media Keys**): `MediaPlayPause`, `MediaNextTrack`, and `MediaPreviousTrack`.
- **YouTube API and Google policy compliance:**
  - Does not illegally download or extract audio streams (audio ripping), bypass DRM, or interfere with ad blocking.

---

## 🛠️ Technology Stack

- **Desktop Shell:** Electron 34
- **Frontend Framework:** React 18 + TypeScript + Vite 6
- **Styling:** Tailwind CSS + PostCSS + Autoprefixer
- **Icons:** Lucide React
- **Player Engine:** Official YouTube IFrame Player API

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

### 4. Build and run the production version

```bash
npm run build
npm start
```

### 5. Run unit tests

```bash
npm test
```

---

## ⚙️ Configure the YouTube Data API v3 (Optional)

The application can work completely independently by pasting YouTube links directly or using the curated playlists. To enable full search functionality:

1. Visit the [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project and enable the **YouTube Data API v3** service.
3. Create an **API key** (Google provides 10,000 quota units per day for free).
4. Open the application, go to **Settings**, paste in the API key, and click **Save Settings**. Alternatively, set `VITE_YOUTUBE_API_KEY` in a `.env` file.

---

## 📂 Project Structure

```text
music-player/
├── electron/
│   ├── main.ts              # Manages BrowserWindow, Tray, IPC, and global media shortcuts
│   └── preload.ts           # Secure context bridge between Electron and the web application
├── src/
│   ├── components/
│   │   ├── TitleBar/        # Draggable frameless title bar and window controls
│   │   ├── Sidebar/         # Page navigation menu and playlist list
│   │   ├── PlayerBar/       # Playback controls, timeline, and volume
│   │   ├── EmbeddedPlayer/  # Singleton YouTube IFrame Player instance
│   │   └── PlaylistModal/   # Modal for adding songs to playlists
│   ├── pages/
│   │   ├── HomePage.tsx     # Home page, quick link input, and featured music
│   │   ├── SearchPage.tsx   # Search, debouncing, and API quota notifications
│   │   ├── QueuePage.tsx    # View and manage the current playback queue
│   │   ├── PlaylistsPage.tsx# Manage playlists and play all songs
│   │   ├── HistoryPage.tsx  # Recently played songs
│   │   └── SettingsPage.tsx # API key, tray behavior, and policy settings
│   ├── services/
│   │   ├── playerService.ts # Coordinates YouTube IFrame Player API state
│   │   ├── playlistService.ts # Manages queues, playlists, and autoplay
│   │   └── youtubeSearch.ts # Parses links, handles oEmbed, and calls Data API v3
│   ├── storage/
│   │   └── localStore.ts    # Versioned, secure local storage
│   ├── models/
│   │   └── types.ts         # TypeScript models and interfaces
│   ├── App.tsx              # Root component and IPC integration
│   ├── index.css            # Tailwind directives and scrollbar styles
│   └── main.tsx             # React DOM entry point
├── tests/
│   └── app.test.mjs         # Automated unit tests for the link parser, queue, and playlists
├── public/
│   └── icon.png             # Application logo and system tray icon
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

