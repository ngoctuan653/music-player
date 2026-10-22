# YouTube Music Desktop - Tổng quan dự án

## 1. Mục đích

YouTube Music Desktop là ứng dụng desktop Windows dành cho việc nghe nội
dung âm thanh từ YouTube trong một cửa sổ riêng, theo trải nghiệm gần với
music player:

- Tìm kiếm bài hát hoặc dán link YouTube.
- Phát, tạm dừng, tua, chỉnh âm lượng và chuyển bài.
- Quản lý queue, playlist, bài yêu thích và lịch sử nghe.
- Chạy nền qua system tray và điều khiển bằng phím media.
- Chọn thiết bị audio output như loa, tai nghe hoặc DAC.

Ứng dụng ưu tiên **audio-focused UI**: giao diện tập trung vào nghe nhạc và
có thể ẩn phần video. Tuy nhiên, player YouTube vẫn là player video; dự án
không thể cam kết audio-only ở tầng transport hoặc cam kết tuyệt đối không
tải/xử lý dữ liệu video.

## 2. Nguyên tắc và giới hạn

- Chỉ sử dụng cách phát được YouTube hỗ trợ trong phạm vi chính sách hiện
  hành.
- Không tải hoặc trích xuất audio stream riêng.
- Không dùng API nội bộ, `yt-dlp`, proxy lấy stream, bypass DRM hoặc giả lập
  client để né giới hạn.
- Không tự động chặn quảng cáo hoặc can thiệp cơ chế bảo vệ của YouTube.
- Không lưu bản sao audio/video trên máy.
- Chỉ lưu metadata cần thiết như `videoId`, tiêu đề, kênh, thumbnail và
  thời điểm thêm.
- API key phía client không phải secret tuyệt đối; nếu dùng YouTube Data API
  cần giới hạn API/quota trong Google Cloud Console.

Nếu yêu cầu bắt buộc là audio-only ở tầng network, cần đổi sang nguồn phát có
audio streaming API chính thức thay vì cố tách audio khỏi YouTube player.

## 3. Công nghệ hiện tại

- **Desktop shell:** Electron 34.
- **UI:** React 18.
- **Ngôn ngữ:** TypeScript.
- **Build:** Vite 6 và `vite-plugin-electron`.
- **CSS:** Tailwind CSS, PostCSS, Autoprefixer.
- **Icon:** Lucide React.
- **Lưu trữ:** `localStorage` với schema versioning.
- **Player hiện tại:** Electron `<webview>` mở trang YouTube và điều khiển
  phần tử HTML5 `video` bằng JavaScript.
- **Liquid Glass:** `vaso@1.0.2`, adapter `GlassLens`, CSS fallback và tier
  tự động theo kích thước cửa sổ, resize, pin, reduced motion, visibility và
  trạng thái GPU.
- **Tìm kiếm:** YouTube Data API v3 nếu có API key; direct YouTube search
  hoặc oEmbed làm fallback.

> **Lưu ý kiến trúc:** README cũ mô tả player là IFrame Player API, nhưng code
> hiện tại trong `src/components/EmbeddedPlayer` và
> `src/services/playerService.ts` đang dùng Electron `<webview>`. Cần chọn
> một hướng chính thức, cập nhật tài liệu và đánh giá lại điều khoản trước khi
> phát hành.

> **Lưu ý tuân thủ:** `playerService.ts` hiện vẫn còn đoạn CSS/JavaScript
> nhận diện, ẩn và bỏ qua quảng cáo trong webview. Đây là điểm chưa khớp với
> nguyên tắc không can thiệp quảng cáo và phải được rà soát, loại bỏ hoặc
> thay đổi trước khi phát hành công khai.

## 4. Kiến trúc thư mục

```text
music-player/
├── electron/
│   ├── main.ts                 # BrowserWindow, tray, IPC, media shortcut
│   └── preload.ts              # contextBridge cho renderer
├── src/
│   ├── components/
│   │   ├── AudioOutputSelector/ # Chọn thiết bị audio output
│   │   ├── AmbientBackdrop/      # Nền ambient từ thumbnail hiện tại
│   │   ├── EmbeddedPlayer/      # Webview player singleton
│   │   ├── GlassLens/            # Adapter Vaso có fallback theo tier
│   │   ├── GlassSurface/         # Bề mặt CSS glass
│   │   ├── PlayerBar/           # Điều khiển phát và timeline
│   │   ├── PlaylistModal/
│   │   ├── Sidebar/
│   │   └── TitleBar/
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── QueuePage.tsx
│   │   ├── PlaylistsPage.tsx
│   │   ├── HistoryPage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/
│   │   ├── audioOutputService.ts
│   │   ├── playerService.ts
│   │   ├── playlistService.ts
│   │   └── youtubeSearch.ts
│   ├── storage/
│   │   └── localStore.ts
│   ├── models/
│   │   ├── glass.ts
│   │   └── types.ts
│   ├── hooks/
│   │   └── useGlassTier.ts
│   ├── App.tsx
│   └── index.css
├── public/
├── tests/
├── package.json
├── vite.config.ts
└── PLAN_YouTube_Music_Desktop.md
```

## 5. Luồng khởi động

### Development

```powershell
npm install
npm run dev
```

### Production build và chạy

```powershell
npm run build
npm start
```

`npm start` build renderer, build Electron main/preload rồi chạy
`scripts/launch.js`.

### Kiểm thử

```powershell
npm test
```

Build dùng TypeScript strict mode và sẽ kiểm tra lỗi type trước khi chạy Vite:

```powershell
npm run build
```

## 6. Player và trạng thái phát

`PlayerService` là service singleton điều phối:

- Track hiện tại.
- Trạng thái playing/paused/buffering.
- Current time và duration.
- Volume/mute.
- Repeat mode: `off`, `one`, `all`.
- Shuffle.
- Error hiển thị lên player bar.

Player được khởi tạo một lần với webview. Listener `did-finish-load` được giữ
một bản duy nhất để tránh `MaxListenersExceededWarning`. Service polling trạng
thái video định kỳ để cập nhật progress và phát hiện bài đã kết thúc.

Khi đổi bài:

- Navigation cũ có thể bị hủy (`ERR_ABORTED`) nếu người dùng đổi bài nhanh.
- Đây là hành vi bình thường của navigation, không phải crash.
- Lỗi tải khác `ERR_ABORTED` được đưa vào trạng thái lỗi của player.
- URL phát ưu tiên `vq=small` để giảm băng thông và phù hợp với nhu cầu nghe;
  YouTube vẫn có thể tự điều chỉnh chất lượng.

## 7. Queue và Next

### Queue thủ công

- Chọn bài từ Search chỉ phát bài được chọn; danh sách kết quả tìm kiếm không
  tự động trở thành queue.
- `Enqueue Next` thêm bài ngay sau bài hiện tại.
- `Enqueue End` thêm bài vào cuối queue.
- Có thể xóa từng bài hoặc clear toàn bộ queue.
- Queue được lưu cục bộ và khôi phục khi mở lại app.

### Chuyển bài

Thứ tự xử lý:

1. Nếu shuffle bật, chọn bài khác ngẫu nhiên trong queue.
2. Nếu queue còn bài tiếp theo, phát bài tiếp theo.
3. Nếu repeat all bật và đã tới cuối queue, quay lại đầu queue.
4. Nếu bật auto-play và đã hết queue, tìm một bài liên quan mới.
5. Nếu không tìm được ứng viên đủ tin cậy, dừng thay vì phát bừa.

### Bộ lọc gợi ý tự động

Autoplay tìm kiếm theo nghệ sĩ/kênh hiện tại với truy vấn ưu tiên:

```text
<artist/channel> official audio
```

Ứng viên bị loại nếu:

- Là video hiện tại hoặc đã có trong queue.
- Trùng tiêu đề với bài hiện tại.
- Có dấu hiệu music video, video clip hoặc MV.
- Có dấu hiệu playlist/mix/compilation/full album/medley/radio/live set.
- Dài hơn khoảng 12 phút.
- Không có dấu hiệu là kênh chính thức, Topic, VEVO, Records, Music hoặc
  kênh trùng với nghệ sĩ hiện tại.

Đây là bộ lọc heuristic, không phải xác minh bản quyền hoặc dấu tick chính
thức tuyệt đối. Tên channel có thể gây hiểu nhầm; nếu cần độ chính xác cao
phải dùng metadata channel chính thức và chính sách API phù hợp.

## 8. Tìm kiếm và metadata

`YouTubeSearchService` hỗ trợ:

- URL `youtube.com/watch?v=...`.
- URL `youtu.be/...`.
- URL `/embed/...`.
- URL `/shorts/...`.
- Video ID 11 ký tự.
- oEmbed để lấy tiêu đề, tác giả và thumbnail.
- YouTube Data API v3 khi người dùng cấu hình API key.
- Direct YouTube HTML search làm fallback.
- Debounce tìm kiếm ở UI để tránh gọi API theo từng ký tự.

Search result chỉ nên được xem là metadata tham khảo. Không nên coi title hoặc
channel name là bằng chứng tuyệt đối về quyền sở hữu nội dung.

## 9. Audio output

`AudioOutputService`:

- Liệt kê `audiooutput` bằng `navigator.mediaDevices`.
- Theo dõi `devicechange` khi cắm/rút tai nghe, loa hoặc DAC.
- Lưu thiết bị đã chọn vào localStorage.
- Áp dụng `setSinkId` cho media element trong renderer.
- Cố gắng áp dụng sink cho video bên trong webview.
- Gọi IPC Electron để áp dụng cho frame/cross-origin media nếu được hỗ trợ.

Selector output có responsive behavior:

- Cửa sổ rộng: hiển thị tên thiết bị đã rút gọn.
- Cửa sổ hẹp: giữ icon và ẩn tên để không đẩy các nút khác ra ngoài.
- Popover giới hạn theo chiều rộng viewport.

Việc đổi audio output phụ thuộc hỗ trợ `setSinkId` của Chromium và quyền
thiết bị. Nếu hệ điều hành hoặc webview không cho phép, app phải giữ output
hiện tại và ghi warning rõ ràng.

## 10. Electron và chạy nền

`electron/main.ts` phụ trách:

- Frameless `BrowserWindow`.
- Static server local cho production.
- System tray.
- Hide/show cửa sổ.
- Quit hoàn toàn.
- Global media keys:
  - `MediaPlayPause`.
  - `MediaNextTrack`.
  - `MediaPreviousTrack`.
- IPC cho window controls, fetch network và audio output.
- Single-instance lock.

Đóng cửa sổ thông thường có thể ẩn app xuống tray tùy cấu hình. Người dùng
phải có lệnh Quit hoàn toàn trong menu tray.

## 11. Hiệu năng và giới hạn thực tế

Các tối ưu hiện có:

- Một player/webview duy nhất.
- Không tạo player mới khi đổi route.
- Không preload hàng loạt bài.
- Ưu tiên chất lượng video thấp bằng `vq=small`.
- Ẩn phần lớn UI YouTube khi player chạy trong webview.
- Selector và player bar co giãn theo chiều rộng cửa sổ.
- Không dùng Electron network interceptor để giả mạo header YouTube.

Không nên tuyên bố ứng dụng là audio-only hoặc chắc chắn nhẹ hơn trình duyệt.
Webview, Chromium và player YouTube vẫn có thể dùng đáng kể RAM/CPU.

Nên đo trên cùng một máy:

- Cold start.
- RAM idle.
- RAM khi phát 30--60 phút.
- RAM sau khi chuyển 20 bài.
- CPU khi phát và khi chạy tray.
- Số request mạng.
- Hành vi sau sleep/wake.

## 12. Lỗi thường gặp

### `MODULE_TYPELESS_PACKAGE_JSON`

`postcss.config.js` hiện dùng CommonJS để tương thích với `scripts/launch.js`.
Không thêm `"type": "module"` vào `package.json` nếu chưa chuyển toàn bộ script
CommonJS sang ESM.

### `powerPreference option is ignored`

Đây là warning từ Chromium/ANGLE trên Windows khi WebGPU bỏ qua lựa chọn
`powerPreference`. Không phải lỗi build hoặc lỗi phát audio.

### `ERR_ABORTED (-3)`

Thường xảy ra khi navigation YouTube cũ bị hủy để chuyển sang bài mới. Đây là
lỗi có thể dự đoán được và không nên hiển thị như lỗi nghiêm trọng cho người
dùng.

### SSL handshake `net_error -101`

Thường liên quan đến mạng, CDN YouTube, VPN, proxy hoặc antivirus kiểm tra
HTTPS. Không nên tắt xác minh SSL để xử lý. Cần kiểm tra mạng và thử lại.

### YouTube player error

Video có thể không phát do private, giới hạn khu vực/độ tuổi, không cho nhúng,
lỗi quyền hoặc chính sách YouTube. App nên hiển thị thông báo và cho phép mở
video bằng trình duyệt mặc định khi phù hợp.

## 13. Kiểm thử nghiệm thu

- [ ] App build và khởi động trên Windows 11.
- [ ] Tìm kiếm và dán URL YouTube hoạt động.
- [ ] Phát/tạm dừng/tua/volume hoạt động.
- [ ] Queue thủ công không bị trộn với toàn bộ Search results.
- [ ] Next ưu tiên queue thủ công trước khi tìm bài liên quan.
- [ ] Autoplay không chọn music video, reup rõ ràng hoặc playlist dài.
- [ ] Queue và playlist khôi phục sau khi restart.
- [ ] System tray và Quit hoàn toàn hoạt động.
- [ ] Media keys hoạt động.
- [ ] Chọn loa/tai nghe và đổi thiết bị khi đang phát.
- [ ] Selector output không vỡ layout ở cửa sổ hẹp.
- [ ] Chuyển bài nhanh không tạo listener tăng dần.
- [ ] Mất mạng, quota hết và lỗi player có thông báo rõ.
- [ ] Không có API key/token trong Git hoặc log.
- [ ] Chạy liên tục ít nhất 60 phút không crash hoặc tăng RAM bất thường.

## 14. Việc nên làm tiếp theo

1. Quyết định dứt khoát dùng YouTube `<webview>` hay IFrame Player API chính
   thức; loại bỏ mô tả không còn đúng trong README.
2. Rà lại code injection CSS/JavaScript trong webview để bảo đảm không vi
   phạm chính sách YouTube.
3. Tách logic lọc autoplay thành module thuần và bổ sung unit test cho:
   official audio, Topic channel, music video và playlist dài.
4. Bổ sung metadata channel/video chính thức nếu cần phân biệt tốt hơn giữa
   kênh nghệ sĩ và reup.
5. Kiểm tra output routing trên nhiều thiết bị Windows thực tế.
6. Đo RAM/CPU/network trước và sau khi chạy nền lâu.
7. Cập nhật [PLAN_YouTube_Music_Desktop.md](./PLAN_YouTube_Music_Desktop.md)
   sau mỗi quyết định kiến trúc lớn.

## 15. Lệnh nhanh

```powershell
# Cài dependency
npm install

# Build type-check + renderer + Electron
npm run build

# Chạy production local
npm start

# Chạy test
npm test
```

## 16. Tài liệu liên quan

- [README.md](./README.md)
- [PLAN_YouTube_Music_Desktop.md](./PLAN_YouTube_Music_Desktop.md)
- [package.json](./package.json)
- [electron/main.ts](./electron/main.ts)
- [src/services/playerService.ts](./src/services/playerService.ts)
- [src/services/playlistService.ts](./src/services/playlistService.ts)
- [src/services/audioOutputService.ts](./src/services/audioOutputService.ts)
- [src/components/GlassLens/GlassLens.tsx](./src/components/GlassLens/GlassLens.tsx)
- [src/hooks/useGlassTier.ts](./src/hooks/useGlassTier.ts)
- [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)
