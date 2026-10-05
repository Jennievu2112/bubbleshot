(async () => {
  try {
    console.log("Đang gọi dịch vụ ScreenshotOne để chụp ảnh...");
    const targetUrl = "https://cryptobubbles.net/en";
    
    // Sử dụng ScreenshotOne API với tham số chờ render Canvas
    const apiKey = process.env.SCREENSHOTONE_API_KEY;
    const screenshotUrl = `https://api.screenshotone.com/take?access_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&viewport_width=1280&viewport_height=900&block_ads=true&delay=10&format=png`;
    
    const imgRes = await fetch(screenshotUrl);
    if (!imgRes.ok) {
      throw new Error("Lỗi chụp ảnh từ ScreenshotOne, mã trạng thái: " + imgRes.status);
    }
    
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    console.log("Chụp ảnh thành công, đang gửi sang Gemini AI...");

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
    const rawText = aiJson.candidates[0].content.parts[0].text;
    const cleanJsonStr = rawText.match(/\[.*\]/s)[0]; 
    const finalData = JSON.parse(cleanJsonStr);

    console.log("Đang đẩy dữ liệu về Google Sheets...");
    const sheetRes = await fetch(process.env.SHEET_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: finalData })
    });
    
    console.log("Hoàn tất! Đã đẩy dữ liệu về Sheets thành công.");

  } catch (error) {
    console.error("Lỗi tiến trình:", error);
    process.exit(1);
  }
})();
