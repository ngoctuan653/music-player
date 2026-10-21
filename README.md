# YouTube Music Desktop (Windows 11)

Ứng dụng desktop Windows 11 gọn nhẹ dành riêng cho việc nghe nhạc từ YouTube trong một cửa sổ riêng, hỗ trợ chạy nền khay hệ thống (System Tray), phím tắt Media và quản lý danh sách bài hát / playlist cục bộ.

---

## 🌟 Tính năng chính

- **Giao diện tập trung vào nghe nhạc (Audio-focused UI):**
  - Tích hợp YouTube Embedded IFrame Player API chính thức của Google.
  - Sử dụng đúng **1 player instance duy nhất** trong suốt vòng đời ứng dụng (không reload player khi chuyển trang).
  - Tùy chọn mở cửa sổ thu nhỏ xem video (Mini Video View / Picture-in-Picture) hoặc ẩn vào nền để tập trung nghe nhạc.
- **Tìm kiếm thông minh & Hỗ trợ dán Link trực tiếp:**
  - Hỗ trợ dán trực tiếp mọi dạng link YouTube (`youtube.com/watch?v=...`, `youtu.be/...`, `shorts/...`) hoặc video ID 11 ký tự để nghe tức thì.
  - Tự động lấy metadata (tiêu đề, tác giả, thumbnail) qua oEmbed mà **không bắt buộc phải có API Key**.
  - Tích hợp **YouTube Data API v3** (với ô cấu hình API Key trong Cài đặt và cơ chế Debounce 400ms).
  - Cung cấp sẵn các danh sách nhạc thư giãn / Lofi / Hit tuyển chọn khi chưa cấu hình key.
- **Quản lý Hàng đợi (Queue) & Playlist cục bộ:**
  - Thêm bài hát vào hàng đợi: Phát ngay, Phát kế tiếp (Enqueue Next), Thêm vào cuối (Enqueue End).
  - Tự động chuyển bài tiếp theo khi hết bài; hỗ trợ chế độ Lặp lại (`off`, `all`, `one`) và Xáo trộn ngẫu nhiên (`shuffle`).
  - Tạo, đổi tên, xóa các playlist cá nhân và danh sách "Bài hát yêu thích" (Favorites).
  - Lưu trữ an toàn trong `localStorage` với schema versioning (`v1.0.0`).
- **Lịch sử nghe (Recently Played):**
  - Ghi nhận tới 60 bài hát gần nhất, dễ dàng nghe lại hoặc đưa vào playlist bất kỳ.
- **Tích hợp sâu với Windows 11:**
  - Khung cửa sổ Frameless hiện đại với nút Thu nhỏ, Phóng to, Đóng.
  - Khay hệ thống (**System Tray**): Click đúp hoặc menu chuột phải để hiện/ẩn hoặc điều khiển Play/Pause/Next/Prev; tùy chọn "Thoát hoàn toàn".
  - Phím tắt Media toàn cục (**Windows Global Media Keys**): `MediaPlayPause`, `MediaNextTrack`, `MediaPreviousTrack`.
- **Tuân thủ chính sách YouTube API & Google:**
  - Không tải / trích xuất trái phép luồng audio (audio ripping), không bypass DRM hay can thiệp chặn quảng cáo.

---

## 🛠️ Công nghệ sử dụng

- **Desktop Shell:** Electron 34
- **Frontend Framework:** React 18 + TypeScript + Vite 6
- **Styling:** Tailwind CSS + PostCSS + Autoprefixer
- **Icons:** Lucide React
- **Player Engine:** Official YouTube IFrame Player API

---

## 🚀 Hướng dẫn cài đặt & Chạy ứng dụng

### 1. Yêu cầu môi trường
- Hệ điều hành: Windows 10 / 11
- Node.js: >= v18 (khuyến nghị v20 trở lên)
- npm: >= v9

### 2. Cài đặt thư viện
```bash
npm install
```

### 3. Chạy môi trường phát triển (Dev Mode)
Chạy ứng dụng với Vite Hot Reload:
```bash
npm run dev
```

### 4. Build và Chạy bản Production
```bash
npm run build
npm start
```

### 5. Chạy Unit Tests
```bash
npm test
```

---

## ⚙️ Cấu hình YouTube Data API v3 (Tùy chọn)

Ứng dụng có thể hoạt động hoàn toàn độc lập thông qua việc dán link YouTube trực tiếp hoặc dùng danh sách tuyển chọn. Nếu muốn kích hoạt tìm kiếm mọi video từ khóa trong ô Search:
1. Truy cập [Google Cloud Console](https://console.cloud.google.com).
2. Tạo dự án mới và bật dịch vụ **YouTube Data API v3**.
3. Tạo **API Key** (Google cấp miễn phí 10.000 quota units / ngày).
4. Mở ứng dụng, vào trang **Cài đặt (Settings)** &rarr; dán API Key vào và nhấn **Lưu cài đặt** (hoặc đặt biến `VITE_YOUTUBE_API_KEY` trong file `.env`).

---

## 📂 Cấu trúc thư mục

```text
music-player/
├── electron/
│   ├── main.ts              # Quản lý BrowserWindow, Tray, IPC, Global Media Shortcuts
│   └── preload.ts           # Context bridge an toàn giữa Electron và Web
├── src/
│   ├── components/
│   │   ├── TitleBar/        # Thanh tiêu đề frameless kéo thả và nút điều khiển
│   │   ├── Sidebar/         # Menu điều hướng trang và danh sách playlist
│   │   ├── PlayerBar/       # Thanh điều khiển phát nhạc, timeline, âm lượng
│   │   ├── EmbeddedPlayer/  # YouTube IFrame Player singleton instance
│   │   └── PlaylistModal/   # Modal thêm bài hát vào playlist
│   ├── pages/
│   │   ├── HomePage.tsx     # Trang chủ, dán link nhanh, nhạc nổi bật
│   │   ├── SearchPage.tsx   # Tìm kiếm, debounce, thông báo API quota
│   │   ├── QueuePage.tsx    # Xem và quản lý hàng đợi đang phát
│   │   ├── PlaylistsPage.tsx# Quản lý danh sách phát, phát tất cả
│   │   ├── HistoryPage.tsx  # Lịch sử bài hát đã nghe gần đây
│   │   └── SettingsPage.tsx # Cài đặt API key, hành vi tray, chính sách
│   ├── services/
│   │   ├── playerService.ts # Điều phối trạng thái YouTube IFrame Player API
│   │   ├── playlistService.ts # Quản lý Queue, Playlists, Auto-play
│   │   └── youtubeSearch.ts # Phân tích link, oEmbed, gọi Data API v3
│   ├── storage/
│   │   └── localStore.ts    # Lưu trữ cục bộ an toàn có versioning
│   ├── models/
│   │   └── types.ts         # TypeScript models và interfaces
│   ├── App.tsx              # Component gốc và kết nối IPC
│   ├── index.css            # Tailwind directives và style thanh cuộn
│   └── main.tsx             # Entrypoint React DOM
├── tests/
│   └── app.test.mjs         # Unit test tự động cho Link parser, Queue và Playlist
├── public/
│   └── icon.png             # Logo ứng dụng và icon System Tray
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```
