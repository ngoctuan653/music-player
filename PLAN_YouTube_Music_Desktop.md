# Kế hoạch phát triển ứng dụng nghe nhạc YouTube trên Windows

> **Giới hạn audio-only:** YouTube IFrame/embedded player là trình phát
> video, không phải audio-only engine. Ứng dụng chỉ có thể cung cấp giao
> diện tập trung vào nghe nhạc; không thể cam kết không tải hoặc không xử
> lý thành phần video. Không trích xuất audio stream riêng, không dùng API
> nội bộ, proxy, `yt-dlp` hoặc kỹ thuật tương tự. Nếu audio-only ở tầng
> transport là bắt buộc, phải chọn nguồn phát có audio streaming API
> chính thức.

> **Mục tiêu:** Xây dựng ứng dụng desktop gọn nhẹ cho Windows 11 để mở
> và quản lý việc nghe nhạc từ YouTube trong một cửa sổ riêng, tránh
> phải mở cả trình duyệt với nhiều tab. Ứng dụng hướng đến trải nghiệm
> kiểu music player, có danh sách phát và các điều khiển cơ bản.
>
> **Nguyên tắc:** Sử dụng trình phát và API chính thức của
> YouTube/Google trong phạm vi được cho phép. Không tải/trích xuất luồng
> âm thanh trái phép, vượt DRM, chặn quảng cáo hoặc giả lập hành vi nhằm
> né các giới hạn của YouTube. YouTube Data API dùng để đọc/quản lý dữ
> liệu phù hợp; việc phát video cần dùng trình phát được YouTube hỗ trợ
> và tuân thủ điều khoản hiện hành. Trong kế hoạch này, “nghe nhạc” chỉ
> mô tả trải nghiệm giao diện; không đồng nghĩa với audio-only transport.

## 1. Phạm vi sản phẩm

### Mục tiêu MVP

-   Chạy trên Windows 11 dưới dạng ứng dụng desktop.
-   Tìm kiếm video/nhạc trên YouTube.
-   Phát nội dung bằng YouTube embedded player được hỗ trợ, với giao diện
    tập trung vào nghe nhạc.
-   Điều khiển phát/tạm dừng, chuyển bài, tua và điều chỉnh âm lượng
    trong giới hạn trình phát cho phép.
-   Quản lý danh sách bài đang nghe và các playlist cơ bản.
-   Ghi nhớ giao diện, lịch sử gần đây và các tùy chọn cục bộ.
-   Mở nhanh, giao diện tối giản, ít thành phần nền không cần thiết.
-   Có thông báo lỗi rõ ràng khi nội dung không thể nhúng/phát hoặc API hết
    quota.

### Không đưa vào MVP

-   Tải nhạc/video về máy hoặc trích xuất audio stream.
-   Chặn quảng cáo hoặc bỏ qua cơ chế/giới hạn của YouTube.
-   Đồng bộ tài khoản riêng, hệ thống đề xuất phức tạp, social features.
-   Tự xây dựng backend nếu chưa có yêu cầu thực sự cần thiết.
-   Cam kết RAM thấp hơn mọi trình duyệt: WebView và trình phát YouTube
    vẫn tiêu thụ tài nguyên đáng kể.
-   Audio-only transport hoặc cam kết không tải/xử lý video qua embedded
    player.

## 2. Đối tượng sử dụng và luồng chính

1.  Người dùng mở ứng dụng.
2.  Ứng dụng hiển thị màn hình Home/Recently Played.
3.  Người dùng tìm tên bài hát, nghệ sĩ hoặc dán URL YouTube.
4.  Ứng dụng hiển thị kết quả phù hợp.
5.  Người dùng chọn một kết quả để phát trong trình phát được nhúng.
6.  Người dùng thêm nội dung vào hàng đợi hoặc playlist.
7.  Người dùng có thể thu nhỏ hoặc ẩn ứng dụng xuống system tray; player
    chỉ tiếp tục phát khi chế độ chạy nền đã được bật.
8.  Khi mở lại ứng dụng, các tùy chọn và dữ liệu cục bộ được khôi phục.

## 3. Công nghệ đề xuất

### Phương án ưu tiên: Tauri + React + TypeScript

-   **Desktop shell:** Tauri 2.
-   **UI:** React + TypeScript.
-   **Styling:** Tailwind CSS hoặc CSS Modules.
-   **Phát nội dung:** YouTube embedded player / IFrame Player API, sau
    khi xác minh tính tương thích và điều khoản. Chỉ có một player
    instance trong suốt vòng đời cửa sổ.
-   **Tìm kiếm và metadata:** YouTube Data API v3.
-   **Lưu dữ liệu cục bộ:** Ưu tiên JSON có versioning và ghi an toàn cho
    MVP; dùng SQLite nếu dữ liệu hoặc truy vấn thực tế yêu cầu.
-   **Chạy nền:** Tauri system tray, lifecycle của player, Windows
    sleep/wake và media key chỉ được triển khai sau prototype.
-   **Đăng nhập Google:** OAuth 2.0 theo luồng phù hợp với ứng dụng
    desktop; không nhúng client secret vào ứng dụng.
-   **Build & release:** GitHub Actions hoặc quy trình build thủ công
    ban đầu.

**Vì sao chọn Tauri:** Ứng dụng desktop có thể nhẹ hơn một app Electron
trong một số trường hợp nhờ dùng webview hệ thống. Tuy nhiên, YouTube
player và web content vẫn tốn bộ nhớ; cần đo thực tế thay vì coi đây là
bảo đảm.

### Phương án thay thế: Electron

Chọn Electron nếu ưu tiên hệ sinh thái JavaScript quen thuộc, thư viện
phong phú và tốc độ phát triển. Đổi lại, gói cài đặt và mức dùng RAM cơ
bản thường cao hơn, tùy cách triển khai.

### Quyết định về audio-only và chạy nền

-   Mục tiêu khả thi của MVP là **audio-focused UI** dùng player YouTube
    chính thức, không phải audio-only transport.
-   Không dùng việc ẩn iframe bằng CSS làm bằng chứng rằng video không
    được tải; phải đo network, RAM và CPU trên prototype.
-   Không preload nhiều bài, không tạo player mới khi đổi route hoặc đổi
    bài nếu API hỗ trợ tái sử dụng.
-   Minimize/ẩn cửa sổ không được tạo thêm WebView hoặc iframe. Khi UI
    không hiển thị, giảm timer/polling và dừng animation không cần thiết.
-   Đóng cửa sổ phải phân biệt `hide to tray` và `quit`; menu tray luôn
    có lệnh Quit hoàn toàn.

## 4. Kiến trúc tổng quan

``` text
┌──────────────────────────────────────────────┐
│                Desktop App                   │
│                                              │
│  React UI                                    │
│  ├── Home / Search                           │
│  ├── Player Controls                         │
│  ├── Queue / Playlists                       │
│  └── Settings                                │
│            │                                 │
│            ▼                                 │
│  Application Services                        │
│  ├── YouTube Search Service                  │
│  ├── Player State Service                    │
│  ├── Playlist Service                        │
│  └── Local Persistence                       │
│            │                                 │
│      ┌─────┴──────────┐                      │
│      ▼                ▼                      │
│ YouTube APIs      Local Storage              │
│ Data API / OAuth  SQLite or JSON             │
│      │                                       │
│      ▼                                       │
│ YouTube-supported embedded player            │
└──────────────────────────────────────────────┘
```

### Ranh giới trách nhiệm

-   **UI:** Chỉ hiển thị trạng thái và gửi hành động của người dùng.
-   **Search service:** Gọi YouTube Data API, xử lý loading, lỗi, quota
    và phân trang.
-   **Player service:** Điều phối trạng thái trình phát; không tự tải
    hoặc trích xuất audio.
-   **Playlist service:** Quản lý queue và playlist cục bộ; chỉ tích hợp
    playlist tài khoản khi API và OAuth cho phép.
-   **Persistence:** Lưu cài đặt, lịch sử và dữ liệu cục bộ.
-   **OAuth/token handling:** Dùng cơ chế an toàn phù hợp với desktop;
    không ghi token hoặc khóa bí mật vào log.

## 5. Chức năng và yêu cầu

  -----------------------------------------------------------------------
  ID                Chức năng         Ưu tiên           Tiêu chí hoàn
                                                        thành
  ----------------- ----------------- ----------------- -----------------
  FR-01             Mở ứng dụng và    Must              Khởi động thành
                    giao diện chính                     công, không có
                                                        lỗi nghiêm trọng

  FR-02             Tìm kiếm YouTube  Must              Hiển thị kết quả,
                                                        loading, lỗi và
                                                        trạng thái không
                                                        có kết quả

  FR-03             Phát nội dung     Must              Phát được video
                    bằng player được                    cho phép nhúng;
                    hỗ trợ                              thông báo khi
                                                        không thể phát

  FR-04             Điều khiển player Must              Các điều khiển
                                                        hoạt động trong
                                                        phạm vi API hỗ
                                                        trợ

  FR-05             Hàng đợi phát     Must              Thêm/xóa bài và
                                                        chuyển mục trong
                                                        queue

  FR-06             Playlist cục bộ   Must              Tạo, đổi tên,
                                                        thêm/xóa mục và
                                                        lưu sau khi đóng
                                                        app

  FR-07             Lịch sử gần đây   Should            Ghi lại nội dung
                                                        đã chọn/phát theo
                                                        thiết kế

  FR-08             Dán URL YouTube   Must              Nhận diện URL hợp
                                                        lệ và xử lý lỗi
                                                        rõ ràng

  FR-09             Google OAuth      Could             Chỉ triển khai
                                                        sau khi xác định
                                                        rõ quyền cần xin

  FR-10             Đồng bộ playlist  Could             Chỉ triển khai
                    tài khoản                           nếu
                                                        API/permission
                                                        hiện hành hỗ trợ
                                                        use case

  FR-11             Phím tắt media    Should            Play/pause và
                                                        chuyển bài hoạt
                                                        động ổn định

  FR-12             Cài đặt giao diện Should            Lưu theme và các
                                                        tùy chọn người
                                                        dùng

  NFR-01            Hiệu năng         Must              Đo cold start,
                                                        RAM/CPU idle, khi
                                                        phát và khi chạy
                                                        nền; chỉ một player
                                                        instance

  NFR-02            Độ ổn định        Must              Không crash trong
                                                        bài test sử dụng
                                                        liên tục 30 phút

  NFR-03            Bảo mật           Must              Không commit API
                                                        key/token; không
                                                        log thông tin
                                                        nhạy cảm

  NFR-04            Tuân thủ          Must              Không bypass
                                                        quảng cáo, DRM,
                                                        hạn chế nhúng
                                                        hoặc cơ chế truy
                                                        cập

  NFR-05            Khả năng bảo trì  Should            Tách UI, service
                                                        và persistence;
                                                        có hướng dẫn
                                                        setup
  -----------------------------------------------------------------------

## 6. Thiết kế giao diện dự kiến

### Cửa sổ chính

-   **Sidebar:** Home, Search, Queue, Playlists, Recently Played,
    Settings.
-   **Khu vực nội dung:** Ô tìm kiếm, kết quả và chi tiết playlist.
-   **Player bar:** Thumbnail, tên nội dung, play/pause, bài trước/sau,
    tiến trình và âm lượng nếu được hỗ trợ.
-   **Theme:** Dark mode làm mặc định; tránh animation nặng.
-   **Responsive:** Ưu tiên cửa sổ desktop nhỏ; không yêu cầu giao diện
    mobile.

### Nguyên tắc UX

-   Không tự phát âm thanh bất ngờ khi khởi động.
-   Có trạng thái loading, lỗi mạng, quota hết và nội dung không thể
    nhúng.
-   Không giả định mọi video đều có thể phát trong embedded player.
-   Khi mở URL ngoài, thông báo rõ và dùng trình duyệt mặc định nếu phù
    hợp.
-   Có lựa chọn rõ ràng giữa `hide to tray` và `quit`; menu tray luôn có
    lệnh thoát hoàn toàn.
-   Khi cửa sổ bị ẩn, không render lại danh sách, không preload bài tiếp
    theo và không duy trì timer UI ở tần suất không cần thiết.
-   Không mount lại player khi chuyển màn hình; không tự phát khi khởi
    động hoặc sau khi khôi phục cửa sổ nếu người dùng chưa bật tùy chọn.

## 7. Kế hoạch triển khai theo giai đoạn

### Giai đoạn 0 --- Kiểm chứng khả thi (0,5--1 ngày)

-   Đọc điều khoản YouTube API Services và chính sách embedded player
    hiện hành.
-   Tạo prototype Tauri + React.
-   Thử nhúng một video công khai bằng player được hỗ trợ.
-   Đo RAM, CPU và network khi app rảnh, khi phát, khi minimize và khi
    ẩn xuống tray.
-   Chuyển bài 20 lần để kiểm tra player có bị tạo lại hoặc rò rỉ tài
    nguyên không.
-   Kiểm tra sleep/wake Windows, media key và khả năng tiếp tục phát khi
    cửa sổ bị ẩn.
-   Ghi nhận rõ rằng embedded player không đáp ứng audio-only transport.
-   Xác nhận cách tìm kiếm, quota và quyền OAuth cần thiết.

**Đầu ra:** Quyết định kiến trúc và danh sách giới hạn kỹ thuật đã biết.

### Giai đoạn 1 --- Khung ứng dụng (1--2 ngày)

-   Khởi tạo repo và cấu hình TypeScript/lint/format.
-   Tạo cửa sổ desktop, routing và theme.
-   Dựng sidebar, content area và player bar giả lập.
-   Tạo cấu hình môi trường và hướng dẫn chạy local.

**Đầu ra:** App mở được, điều hướng giữa các màn hình cơ bản.

### Giai đoạn 2 --- Tìm kiếm và phát (2--4 ngày)

-   Tích hợp YouTube Data API cho tìm kiếm metadata.
-   Xử lý API key, quota, timeout, lỗi mạng và phân trang.
-   Debounce tìm kiếm 300--500 ms, ưu tiên tìm khi người dùng dừng nhập
    hoặc nhấn Enter; không retry vô hạn khi quota hết.
-   Tích hợp embedded player theo hướng dẫn chính thức.
-   Đồng bộ trạng thái player với UI trong phạm vi API hỗ trợ.
-   Xử lý nội dung private, bị giới hạn độ tuổi/khu vực hoặc không cho
    nhúng.

**Đầu ra:** Người dùng tìm và phát được nội dung đủ điều kiện.

### Giai đoạn 3 --- Queue và playlist (2--3 ngày)

-   Xây dựng model `TrackReference`, `QueueItem`, `Playlist`.
-   Thêm/xóa/sắp xếp mục trong queue.
-   Tạo, sửa tên và xóa playlist cục bộ.
-   Lưu/đọc dữ liệu qua SQLite hoặc JSON có versioning.
-   Xử lý dữ liệu lỗi và nâng cấp schema đơn giản.

**Đầu ra:** Queue và playlist vẫn tồn tại sau khi khởi động lại.

### Giai đoạn 4 --- Hoàn thiện trải nghiệm (1--3 ngày)

-   Recently Played và cài đặt.
-   System tray, hide/show cửa sổ, Quit hoàn toàn và phím tắt media.
-   Loading, empty state, lỗi và thông báo.
-   Tối ưu số lần render, kích thước ảnh và tài nguyên nền.
-   Kiểm tra thao tác bằng bàn phím và độ tương phản.

**Đầu ra:** Bản MVP đủ dùng hàng ngày.

### Giai đoạn 5 --- Kiểm thử và đóng gói (1--2 ngày)

-   Test unit cho playlist, queue và persistence.
-   Test thủ công với video nhúng được và không nhúng được.
-   Test mất mạng, quota/API lỗi và khởi động lại.
-   Đo cold start, RAM/CPU idle, khi phát, khi minimize và khi chạy nền.
-   Kiểm tra phát liên tục ít nhất 60 phút và chuyển bài nhiều lần để
    phát hiện tăng RAM bất thường.
-   Build installer Windows, kiểm tra cài đặt/gỡ cài đặt.
-   Viết README, changelog và hướng dẫn báo lỗi.

**Đầu ra:** Bản cài đặt thử nghiệm và checklist nghiệm thu.

> Ước lượng tổng MVP: khoảng 7--15 ngày làm việc nếu làm một mình và đã
> quen React/TypeScript; có thể tăng nếu OAuth, đồng bộ tài khoản hoặc
> chính sách API phát sinh trở ngại.

## 8. Cấu trúc thư mục gợi ý

``` text
youtube-music-desktop/
├── src/
│   ├── app/
│   ├── components/
│   │   ├── Sidebar/
│   │   ├── SearchResults/
│   │   ├── PlayerBar/
│   │   └── PlaylistView/
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── QueuePage.tsx
│   │   ├── PlaylistsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/
│   │   ├── youtubeSearch.ts
│   │   ├── playerService.ts
│   │   └── playlistService.ts
│   ├── models/
│   ├── storage/
│   └── main.tsx
├── src-tauri/
├── tests/
├── .env.example
├── .gitignore
├── README.md
└── PLAN.md
```

Tên và cấu trúc có thể điều chỉnh theo phiên bản Tauri/React được chọn.

## 9. Dữ liệu cục bộ đề xuất

### TrackReference

-   `videoId`: ID video YouTube, không lưu bản sao audio/video.
-   `title`: tiêu đề hiển thị đã lấy từ API.
-   `channelTitle`: tên kênh nếu có.
-   `thumbnailUrl`: URL thumbnail nếu có.
-   `addedAt`: thời điểm thêm vào queue/playlist.

### Playlist

-   `id`: ID nội bộ.
-   `name`: tên playlist.
-   `items`: danh sách `TrackReference` hoặc tham chiếu tới mục.
-   `createdAt`, `updatedAt`: thời điểm tạo/cập nhật.

Chỉ lưu metadata cần thiết; cân nhắc điều khoản API và yêu cầu làm
mới/xóa dữ liệu theo chính sách hiện hành. Không lưu token OAuth dạng
plaintext.

## 10. Kiểm thử nghiệm thu

-   [ ] App cài đặt, mở và đóng bình thường trên Windows 11.
-   [ ] Tìm kiếm trả kết quả hoặc hiển thị lỗi dễ hiểu.
-   [ ] URL YouTube hợp lệ được nhận diện.
-   [ ] Video cho phép nhúng phát được trong player.
-   [ ] Video không cho nhúng được báo lỗi phù hợp, không treo app.
-   [ ] Ứng dụng không trích xuất audio stream và không dùng player/API
    nội bộ.
-   [ ] Queue thêm/xóa/chuyển bài đúng.
-   [ ] Playlist lưu lại sau khi đóng và mở app.
-   [ ] App xử lý mất mạng và API quota hết.
-   [ ] Không có khóa bí mật hoặc token trong Git/log.
-   [ ] Đo RAM/CPU trên cùng một máy, cùng nội dung và điều kiện để so
    sánh công bằng với trình duyệt.
-   [ ] Chỉ có một player instance sau khi chuyển bài, đổi màn hình và
    chạy nền.
-   [ ] Minimize/ẩn xuống tray ít nhất 60 phút không tạo iframe/WebView
    mới và không làm RAM tăng bất thường.
-   [ ] Sleep/wake, mất focus, media key và Quit hoàn toàn hoạt động theo
    thiết kế.
-   [ ] Có debounce tìm kiếm, không gọi API cho từng phím nhập và không
    retry vô hạn khi quota hết.
-   [ ] Các luồng sử dụng tuân thủ điều khoản và chính sách
    YouTube/Google hiện hành.

## 11. Rủi ro và quyết định cần xác nhận

  -----------------------------------------------------------------------
  Rủi ro / câu hỏi                    Hướng xử lý
  ----------------------------------- -----------------------------------
  Không phải video nào cũng nhúng     Kiểm tra lỗi player và đưa lựa chọn
  được                                mở trên YouTube

  API quota giới hạn                  Cache metadata trong phạm vi chính
                                      sách cho phép; tránh tìm kiếm lặp

  OAuth và playlist tài khoản phức    Để sau MVP; trước hết làm playlist
  tạp                                 cục bộ

  App vẫn dùng nhiều RAM khi phát     Đo prototype trước khi cam kết; tối
                                      ưu UI và tài nguyên phụ

  Muốn nghe khi cửa sổ thu nhỏ/chạy   Prototype tray + lifecycle player,
  nền                                 đo 60 phút khi ẩn/minimize; không
                                      tự trích xuất audio

  Muốn bỏ quảng cáo hoặc tải audio    Không triển khai tính năng né quảng
                                      cáo/giới hạn hoặc tải trái phép.
                                      Nếu bắt buộc audio-only, chọn
                                      nguồn phát khác có API chính thức
  -----------------------------------------------------------------------

## 12. Việc cần làm đầu tiên

1.  Tạo repository `youtube-music-desktop`.
2.  Khởi tạo Tauri + React + TypeScript.
3.  Tạo prototype nhúng player, xác nhận giới hạn audio-only và đo
    RAM/CPU/network khi idle, phát, minimize và chạy nền.
4.  Kiểm tra sleep/wake, system tray, media key, chuyển bài 20 lần và
    bảo đảm chỉ có một player instance.
5.  Xác minh YouTube Data API, OAuth và điều khoản liên quan; restrict
    API key theo API/quota và không coi key phía client là secret.
6.  Nếu prototype đáp ứng mục tiêu audio-focused UI, triển khai Search →
    Player → Queue → Playlist cục bộ.
7.  Chỉ thêm Google login/đồng bộ playlist sau khi MVP ổn định.

## 13. Tài liệu tham khảo chính thức

Trước khi triển khai, kiểm tra phiên bản tài liệu và điều khoản mới
nhất:

-   YouTube Data API: https://developers.google.com/youtube/v3
-   YouTube IFrame Player API:
    https://developers.google.com/youtube/iframe_api_reference
-   YouTube API Services Terms of Service:
    https://developers.google.com/youtube/terms/api-services-terms-of-service
-   YouTube API Services Developer Policies:
    https://developers.google.com/youtube/terms/developer-policies
-   Tauri: https://tauri.app/
-   Google OAuth 2.0:
    https://developers.google.com/identity/protocols/oauth2

------------------------------------------------------------------------

**Trạng thái:** Kế hoạch MVP --- đã xác định embedded player không phải
audio-only transport; cần kiểm chứng player, background lifecycle và
hiệu năng trước khi đầu tư vào tính năng nâng cao.
