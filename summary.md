### Tóm tắt công việc đã thực hiện (MVP)

#### 1) Giao diện và logic ứng dụng (SPA thuần frontend)
- Đọc route từ `window.location.pathname` (hỗ trợ khôi phục từ 404) thay vì chỉ dùng `hash`.
- Tải dữ liệu từ `words/<id>.json` (mặc định cấu hình `APP_CONFIG.r2BaseUrl='.'`). Có thể override bằng:
  ```html
  <script>
    window.APP_CONFIG = { r2BaseUrl: 'https://your-r2-or-cdn-endpoint' };
  </script>
  ```
- Hiển thị: Từ (EN), IPA, Nghĩa (VI), Ví dụ, Từ liên quan, Emoji, Nút phát âm.
- Phát âm: ưu tiên `audioUrl` nếu dữ liệu có; nếu không, dùng Web Speech API.
- Trạng thái lỗi: ẩn nội dung, hiển thị khối lỗi “Không tìm thấy từ vựng” và nút “Tạo từ mới”.
- Accessibility: sửa nút phát âm có `aria-label`, `title`, `type="button"`.
- Loại bỏ hoàn toàn fallback Dictionary/MyMemory/mock theo yêu cầu.

Các thay đổi chính trong `index.html`:
- Thêm `APP_CONFIG` và mặc định `r2BaseUrl='.'` để đọc dữ liệu cục bộ.
- Thêm cơ chế khôi phục đường dẫn từ `sessionStorage` (phối hợp với `404.html`).
- Dùng class `.hidden` thay inline style để toggle loading/error/content.
- Bổ sung `requestNewWordWithDefault()` để gợi ý câu lệnh `/new <từ>` khi thiếu dữ liệu.

#### 2) Điều hướng và xử lý 404 cho GitHub Pages
- Thêm `404.html` chuyển hướng về `/` và lưu `redirectPath` để SPA tự xử lý route như `/food`.
- Cập nhật `index.html` đọc `redirectPath` và `history.replaceState` khôi phục URL người dùng truy cập.

#### 3) Dữ liệu mẫu cục bộ
- Tạo thư mục `words/` và thêm 4 từ mẫu để chạy ngay trên Pages:
  - `words/apple.json`, `words/book.json`, `words/cat.json`, `words/food.json`.
- Cho phép truy cập trực tiếp `https://e.tway.dev/food` (hoặc `apple`, `book`, `cat`) để xem nội dung mẫu.

#### 4) Khởi tạo GitHub Pages
- Workflow CI: `.github/workflows/pages.yml` tự động deploy khi push `main`.
- Domain tĩnh: `CNAME` (e.tway.dev) và `.nojekyll`.

#### 5) Lint & A11y
- Sửa lỗi a11y “Buttons must have discernible text” cho nút phát âm.
- Loại bỏ inline styles hiển thị/ẩn bằng `.hidden`; không còn cảnh báo lint.

---

### Cách sử dụng
- Dùng dữ liệu cục bộ (mặc định):
  - Truy cập `https://e.tway.dev/food` (hoặc `apple`, `book`, `cat`).
- Dùng R2/CDN public JSON:
  - Đặt file tại `words/<md5>.json` trên endpoint public.
  - Chèn cấu hình:
    ```html
    <script>
      window.APP_CONFIG = { r2BaseUrl: 'https://your-r2-or-cdn-endpoint' };
    </script>
    ```
  - Truy cập `https://e.tway.dev/<md5>`.
- Khi không có dữ liệu: ứng dụng hiển thị lỗi và gợi ý tạo từ mới qua Telegram (`/new <từ>`).

---

### Việc tiếp theo gợi ý
- Kết nối n8n workflow để tạo file JSON tự động lên R2 khi người dùng gửi `/new <từ>`.
- Bổ sung ảnh minh họa và audio TTS vào JSON (và UI hiển thị ảnh nếu có).
- Thêm kiểm thử E2E cho các route và trạng thái lỗi.

