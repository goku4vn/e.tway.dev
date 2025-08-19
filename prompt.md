# Ý tưởng đặt ra là sẽ có nhãn dán lên các đồ vật. 

## Trên nhãn có các thông tin:
* QR Code để quét nhằm dễ đọc
* Tiếng anh - Tiếng Việt
* Phiên âm IPA
* Hình ảnh minh họa
* Style thân thiện với trẻ em

## Luồng chạy sẽ như sau:
* Quét QR để dẫn đến đường dẫn ứng dụng https://e.tway.dev/md5_hash 
* Website hiển thị thông tin liên quan: từ ngữ, phiên âm, bản dịch và đọc
   * Thông tin của từ sẽ được tìm kiếm từ 1 file md lưu trữ tại R2
* Chức năng tạo ra từ ngữ mới có liên kết với n8n
   * Chat hoặc hỏi từ cần tìm hiểu vào telegram
   * Telegram bot sẽ lấy thông tin và gửi qua n8n workflow để hỏi AI về các thông tin
   * Sau khi AI trả lời các thông tin thì gọi R2 API để lưu trữ nội dung
   * Tạo hình ảnh để in và gửi lại telegram

## Cấu trúc markdown
---
word: "apple"
vietnamese: "quả táo"
ipa: "/ˈæp.əl/"
category: "fruit"
created: "2024-01-20"
---

# Apple - Quả táo

## Phát âm
/ˈæp.əl/

## Định nghĩa
Một loại quả tròn, thường có màu đỏ, xanh hoặc vàng

## Ví dụ
- I eat an apple every day
- The apple is red

## Từ liên quan
- fruit, tree, red