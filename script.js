(async () => {
  try {
    console.log("Đang yêu cầu chụp ảnh trang CryptoBubbles...");
    // Sử dụng dịch vụ screenshot công khai miễn phí để chụp trực tiếp trang web
    const targetUrl = "https://cryptobubbles.net/en";
    const screenshotApiUrl = `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false&embed=screenshot.url&waitFor=10000`;
    
    const apiRes = await fetch(screenshotApiUrl);
    const apiData = await apiRes.json();
    
    if (!apiData.data || !apiData.data.screenshot) {
      throw new Error("Không lấy được ảnh chụp màn hình từ dịch vụ.");
    }
    
    const imageUrl = apiData.data.screenshot.url;
    console.log("Đã chụp ảnh xong, đang tải ảnh xuống để gửi AI...");
    
    const imgRes = await fetch(imageUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    console.log("Đang gửi ảnh sang Gemini AI để đọc thông tin bong bóng...");
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
    
    console.log("Hoàn tất! Trạng thái đẩy Sheets:", sheetRes.status);

  } catch (error) {
    console.error("Lỗi tiến trình:", error);
    process.exit(1);
  }
})();
