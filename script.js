const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  try {
    console.log("Đang khởi động trình duyệt ẩn danh chống chặn...");
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    
    console.log("Đang truy cập trang CryptoBubbles...");
    await page.goto('https://cryptobubbles.net/en', { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log("Đang chờ bong bóng hiển thị đầy đủ...");
    await new Promise(r => setTimeout(r, 12000)); // Chờ 12 giây để trang render canvas bong bóng
    
    const imageBuffer = await page.screenshot();
    const base64Image = imageBuffer.toString('base64');
    await browser.close();
    console.log("Đã chụp ảnh màn hình thành công!");

    console.log("Đang gửi ảnh sang Gemini AI để đọc...");
    const payload = {
      "contents": [{
        "parts": [
          {"text": "Hãy quan sát bức ảnh chụp màn hình trang web CryptoBubbles này. Lọc ra chính xác 4 bong bóng xanh to nhất (tăng mạnh nhất) và 4 bong bóng đỏ to nhất (giảm mạnh nhất). Trả về kết quả dưới dạng mảng JSON thuần túy (không kèm markdown khác): [{\"type\": \"Xanh\", \"coin\": \"Tên coin\", \"change\": \"% biến động\"}]"},
          {"inline_data": {"mime_type": "image/png", "data": base64Image}}
        ]
      }]
    };

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const aiJson = await aiRes.json();
    if (!aiJson.candidates || !aiJson.candidates[0].content) {
      throw new Error("Lỗi phản hồi từ Gemini AI: " + JSON.stringify(aiJson));
    }
    
    const rawText = aiJson.candidates[0].content.parts[0].text;
    const cleanJsonStr = rawText.match(/\[.*\]/s)[0]; 
    const finalData = JSON.parse(cleanJsonStr);

    console.log("Đang đẩy dữ liệu về Google Sheets...");
    const sheetRes = await fetch(process.env.SHEET_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: finalData })
    });
    
    console.log("Đẩy dữ liệu thành công, mã trạng thái:", sheetRes.status);

  } catch (error) {
    console.error("Lỗi tiến trình:", error);
    process.exit(1);
  }
})();
