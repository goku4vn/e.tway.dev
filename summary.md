### Kế hoạch hoàn tất ứng dụng e.tway.dev

#### Mục tiêu
- **QR → Web app**: Quét QR dẫn tới `https://e.tway.dev/<md5_hash>` để hiển thị: từ (EN), phiên âm IPA, nghĩa (VI), phát âm, ví dụ, từ liên quan, hình minh họa.
- **Nguồn dữ liệu**: Lấy từ 1 file markdown (hoặc nhiều file theo từng từ) lưu ở Cloudflare R2; có thể mở rộng thành 1 file/1 từ để dễ mở rộng và cache, vẫn đáp ứng yêu cầu gốc.
- **Tạo từ mới qua n8n**: Người dùng gõ vào Telegram → Bot → n8n workflow → hỏi AI → lưu R2 → trả ảnh dán tem kèm QR về Telegram.

---

### Kiến trúc & phân hệ
- **Frontend (Pages app)**: `web/` (static SPA, hiện có `index.html` sẽ nâng cấp cấu trúc)
  - Đọc `pathname` để lấy `<md5_hash>` (thay cho `hash` hiện tại).
  - Gọi API `GET /api/v1/words/:id` để lấy dữ liệu hiển thị.
  - TTS: ưu tiên audio đã sinh sẵn; fallback Web Speech API.
  - Accessibility: thêm `aria-label` cho nút phát âm (sửa lint).

- **API (Cloudflare Pages Functions / Workers)**: `api/`
  - `GET /api/v1/words/:id` → đọc từ R2, parse MD → JSON; Cache 120s + ETag.
  - `POST /api/v1/words` (private, gọi từ n8n) → ghi dữ liệu vào R2; xác thực HMAC.
  - `GET /healthz`.

- **Lưu trữ (Cloudflare R2)**: `r2://etway-vocab`
  - Giai đoạn 1 (đơn giản, đúng yêu cầu gốc): 1 file `vocab.md`.
  - Giai đoạn 2 (mở rộng): 1 file/1 từ `words/<md5>.md` và `index.json` (map hash → meta) để tối ưu truy cập.

- **n8n Workflow**: `n8n/`
  - Trigger: Telegram (via Bot Token) hoặc Webhook.
  - Steps: Chuẩn hóa từ → Gọi AI tạo nội dung (EN, IPA, VI, ví dụ, tags) → Sinh ảnh (model image) → Upload R2 (MD, image, audio nếu có) → Call API `POST /api/v1/words` → Reply Telegram (ảnh + link QR).

- **Telegram Bot**: `bot/` (có thể dùng webhook của n8n, không cần code riêng giai đoạn 1).

- **QR Pipeline**: `tools/qr`
  - Script Node tạo PNG/PDF QR có dải nhãn song ngữ, icon; đọc từ `index.json`.

- **Dev môi trường (docker compose)**: `docker/compose.yml`
  - `minio` (giả lập R2 S3 API) + Console; `n8n`; `worker` (Miniflare); `web` (static server/vite). 
  - Lưu ý: dùng `docker compose`, không dùng `docker-compose`.

---

### Định dạng dữ liệu
- Giai đoạn 1: 1 file `vocab.md` trong R2, nhiều entry ngăn cách bằng `---`:

```
---
id: 4a7d1ed414474e4033ac29ccb8653d9b
word: Apple
ipa: /ˈæp.əl/
vietnamese: Quả táo
emoji: "🍎"
examples:
  - en: I eat an apple every day
    vi: Tôi ăn một quả táo mỗi ngày
  - en: The apple is red and sweet
    vi: Quả táo màu đỏ và ngọt
related: [fruit, food, healthy, tree]
audioUrl: null
image: images/4a7d1e.png
updatedAt: 2025-01-01T00:00:00Z
---
```

- Giai đoạn 2: Mỗi từ 1 file `words/<md5>.md` + `index.json`:
```
// index.json
{
  "4a7d1ed414474e4033ac29ccb8653d9b": { "word": "Apple", "lang": "en", "image": "images/4a7d1e.png" }
}
```

---

### API hợp đồng
- `GET /api/v1/words/:id`
  - 200: `{ id, word, ipa, vietnamese, emoji, examples[], related[], audioUrl, image }`
  - 404: `{ error: "NOT_FOUND" }`

- `POST /api/v1/words` (private)
  - Header: `X-Signature: <HMAC-SHA256(payload, SECRET)>`
  - Body: giống schema trên; server ghi vào R2.

---

### Luồng QR → Web
1) Quét QR dẫn `https://e.tway.dev/<md5>`.
2) Frontend đọc `window.location.pathname` → `<md5>`.
3) Gọi `GET /api/v1/words/<md5>` → render UI.
4) Nút phát âm: nếu `audioUrl` có → play; không có → Web Speech API.

---

### Luồng tạo từ mới (Telegram → n8n)
1) Người dùng: `/new <từ>` trong Telegram.
2) n8n nhận → chuẩn hóa, tính `md5(word.toLowerCase())`.
3) Gọi AI (LLM) sinh: EN, IPA, VI, ví dụ, tags.
4) Gọi dịch vụ ảnh (model image) tạo `images/<md5>.png` → upload R2.
5) Tùy chọn tạo audio TTS lưu R2 `audio/<md5>.mp3`.
6) Gọi API private `POST /api/v1/words` lưu bản ghi.
7) n8n trả về Telegram ảnh nhãn in + link `https://e.tway.dev/<md5>`.

---

### Roadmap triển khai (Tuần → Công việc → KQ)
- **Tuần 1**: Khởi tạo repo, compose dev, MinIO, skeleton API/Frontend, sửa lint nút play.
- **Tuần 2**: Tích hợp R2 (dev=MinIO), parse MD, hiển thị dữ liệu thật, cache.
- **Tuần 3**: n8n workflow cơ bản, Telegram webhook, tạo/sửa từ, auth HMAC.
- **Tuần 4**: QR tool + template in, sinh ảnh minh họa tự động, tối ưu UI.
- **Tuần 5**: Triển khai Cloudflare (Pages + Functions/Workers + R2), CI/CD.

---

### Hạng mục công việc chi tiết (Backlog)
- Frontend
  - [ ] Đổi routing `hash` → `pathname` (`/apple` demo → `/4a7d1e..` thật)
  - [ ] Fetch API thay `mockData`
  - [ ] Sửa lint: thêm `aria-label` hoặc `title` cho nút play
  - [ ] Loading/Error states (đã có) gắn với API
  - [ ] Test mobile, hiệu năng, accessibility

- API/Worker
  - [ ] Kết nối R2 (SDK S3 compatible)
  - [ ] Parser MD → JSON (front-matter YAML)
  - [ ] Cache (ETag/Cache-Control)
  - [ ] `POST /words` + HMAC
  - [ ] Logs/metrics

- R2
  - [ ] Tạo bucket `etway-vocab`
  - [ ] `vocab.md` (Giai đoạn 1) hoặc `words/<md5>.md` (Giai đoạn 2)
  - [ ] `images/`, `audio/`

- n8n
  - [ ] Telegram trigger
  - [ ] LLM prompt (chuẩn hóa output JSON)
  - [ ] Upload R2 (S3 credentials)
  - [ ] Call API private
  - [ ] Trả kết quả cho Telegram

- QR & In ấn
  - [ ] Script tạo QR PNG/PDF, template nhãn dễ đọc cho trẻ em
  - [ ] Gộp English/Việt + IPA + icon + QR

- DevOps
  - [ ] `docker/compose.yml` gồm: minio, minio-console, n8n, worker, web
  - [ ] Secrets qua `.env` (R2 keys, TELEGRAM_TOKEN, N8N_WEBHOOK_SECRET, HMAC_SECRET)
  - [ ] CI/CD Cloudflare (Pages + Functions/Workers)

---

### Acceptance Criteria (MVP)
- Quét QR mở `https://e.tway.dev/<md5>` hiển thị đúng dữ liệu từ R2.
- UI hiển thị: từ, IPA, nghĩa, ví dụ (≥2), từ liên quan (≥3), ảnh minh họa, nút phát âm hoạt động.
- Tạo từ mới qua Telegram thành công, dữ liệu được lưu vào R2, link phản hồi hoạt động.
- QR tool sinh đúng mã và template nhãn.
- Triển khai production trên Cloudflare, domain hoạt động, có cache control.

---

### Rủi ro & Giảm thiểu
- Định dạng 1 file MD lớn: dễ xung đột, khó scale → chuyển dần sang 1 file/1 từ + `index.json`.
- Giới hạn model ảnh/TTS: hỗ trợ fallback Web Speech API; ảnh có thể dùng emoji tạm.
- Bảo mật webhook: dùng HMAC + secret + allowlist IP Cloudflare/n8n.

---

### Ghi chú kỹ thuật nhanh
- Tính `md5`: `md5(normalize(word).toLowerCase().trim())` để đảm bảo ổn định.
- CDN/Cache: ưu tiên cache API ở edge 120s, revalidate khi POST.
- i18n: trước mắt cố định EN→VI; mở rộng sau.

---

### Việc tiếp theo (Next actions)
1) Tạo cấu trúc thư mục `web/`, `api/`, `n8n/`, `tools/qr/`, `docker/`.
2) Viết `docker/compose.yml` cho dev (MinIO, n8n, worker, web).
3) Sửa `index.html` để đọc `pathname` và thêm `aria-label` cho nút play.
4) Tạo API `GET /api/v1/words/:id` (đọc MinIO local).
5) Nhập mẫu dữ liệu thật vào `vocab.md` (hoặc `words/<md5>.md`).

---

## MVP (không cần backend riêng)
- **Phạm vi**: Không triển khai API app. FE gọi trực tiếp các API công khai:
  - Dictionary: `https://api.dictionaryapi.dev/api/v2/entries/en/<word>` để lấy IPA, ví dụ, audio.
  - Dịch nghĩa VI: `https://api.mymemory.translated.net/get?q=<text>&langpair=en|vi`.
  - Optional: R2 public JSON nếu có (cấu hình `window.APP_CONFIG.r2BaseUrl`).
- **Thực thi**:
  - Đã chỉnh `index.html` đọc `pathname` làm id; nếu là MD5 và có `r2BaseUrl` → ưu tiên lấy JSON từ R2; nếu không → fallback Dictionary API + MyMemory; sau cùng → mock.
  - Sửa a11y nút phát âm: thêm `aria-label`/`title` và ưu tiên phát `audioUrl` nếu có, fallback Web Speech API.
  - Click vào tag “từ liên quan” sẽ đổi URL bằng `history.pushState` và nạp lại nội dung.
- **Cấu hình**: có thể chèn trước script chạy:
```
<script>
  window.APP_CONFIG = { r2BaseUrl: 'https://cdn.example.com/etway' };
<\/script>
```
- **Cách dùng**:
  - Truy cập `https://e.tway.dev/apple` (demo theo từ) hoặc `https://e.tway.dev/<md5>` (khi đã có JSON công khai trên R2: `words/<md5>.json`).
  - Không cần cài n8n trong repo; workflow tạo từ mới sẽ làm sau.



