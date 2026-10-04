const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  try {
    console.log("Đang khởi động trình duyệt giả lập...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    
    console.log("Đang mở trang CryptoBubbles...");
    await page.goto('https://cryptobubbles.net/en', { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log("Đang đợi bong bóng load...");
    await new Promise(r => setTimeout(r, 10000)); // Đợi 10 giây cho dữ liệu render đầy đủ
    
    const imageBuffer = await page.screenshot();
    const base64Image = imageBuffer.toString('base64');
    await browser.close();

    console.log("Đang gửi ảnh sang Gemini AI để đọc...");
    const payload = {
      "contents": [{
        "parts": [
          {"text": "Lọc ra chính xác 4 bong bóng xanh to nhất và 4 bong bóng đỏ to nhất từ ảnh này. Trả về đúng 1 mảng JSON thuần túy (không kèm markdown khác): [{\"type\": \"Xanh\", \"coin\": \"Tên coin\", \"change\": \"% biến động\"}]"},
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
      throw new Error("Gemini AI không trả về kết quả: " + JSON.stringify(aiJson));
    }
    
    const rawText = aiJson.candidates[0].content.parts[0].text;
    console.log("AI trả về: ", rawText);
    
    const cleanJsonStr = rawText.match(/\[.*\]/s)[0]; 
    const finalData = JSON.parse(cleanJsonStr);

    console.log("Đang đẩy dữ liệu về Google Sheets...");
    const sheetRes = await fetch(process.env.SHEET_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: finalData })
    });
    
    console.log("Đã gửi xong, trạng thái Sheets:", sheetRes.status);

  } catch (error) {
    console.error("Lỗi chi tiết:", error);
    process.exit(1);
  }
})();
