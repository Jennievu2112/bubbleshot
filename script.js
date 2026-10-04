const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  // Mở trình duyệt giả lập
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  
  console.log("Đang mở trang CryptoBubbles...");
  await page.goto('https://cryptobubbles.net/en', { waitUntil: 'networkidle2' });
  
  // Đợi 8 giây cho bong bóng load hoàn toàn
  await new Promise(r => setTimeout(r, 8000)); 
  
  const imageBuffer = await page.screenshot();
  const base64Image = imageBuffer.toString('base64');
  await browser.close();

  console.log("Đang nhờ Gemini AI đọc ảnh...");
  const payload = {
    "contents": [{
      "parts": [
        {"text": "Lọc ra chính xác 4 bong bóng xanh to nhất và 4 bong bóng đỏ to nhất. Trả về đúng 1 mảng JSON: [{\"type\": \"Xanh\", \"coin\": \"Tên\", \"change\": \"%\"}]"},
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
  const rawText = aiJson.candidates[0].content.parts[0].text;
  
  // Lọc lấy mảng dữ liệu JSON
  const cleanJsonStr = rawText.match(/\[.*\]/s)[0]; 
  const finalData = JSON.parse(cleanJsonStr);

  console.log("Đang đẩy dữ liệu về Google Sheets...");
  await fetch(process.env.SHEET_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: finalData })
  });

  console.log("Hoàn thành!");
})();
