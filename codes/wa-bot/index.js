const { create } = require('@open-wa/wa-automate');
const axios = require('axios');
const express = require('express');
const app = express();

// Middleware untuk parsing JSON
app.use(express.json());

// Fungsi delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// Variabel global untuk client WhatsApp
let waClient;

create({
  sessionId: "mysession",
  headless: true,
  multiDevice: true,
  qrTimeout: 0,
  protocolTimeout: 60000,
  authTimeout: 0,
  webhook: true,
  webhookUrl: "http://104.175.87.180:5678/webhook/whatsapp-in", // arahkan ke n8n
  eventMode: true
}).then(client => {
  waClient = client;
  console.log("? WhatsApp bot is running...");

  // Handler pesan masuk dari WhatsApp
  client.onAnyMessage(async (message) => {
    try {
      // ? Abaikan pesan dari bot sendiri supaya tidak loop
      if (message.fromMe) {
        console.log("?? Pesan dari bot sendiri diabaikan.");
        return;
      }

      await client.sendSeen(message.chatId);

      // Teruskan ke webhook n8n
      await axios.post(
        "http://104.175.87.180:5678/webhook/whatsapp-in",
        message
      );

      console.log("?? Pesan terkirim ke n8n!");
    } catch (error) {
      console.error("? Gagal mengirim ke n8n:", error.message);
    }
  });

  // Start Express server di port 3002
  app.listen(3002, () => {
    console.log("?? Server API bot siap di http://localhost:3002");
  });

}).catch(err => {
  console.error("? Error starting WA client:", err);
});

// Endpoint untuk menerima permintaan dari n8n (untuk kirim pesan)
app.post('/api/send-message', async (req, res) => {
  const { to, content } = req.body;
  
  if (!waClient) {
    return res.status(500).send("Bot WhatsApp belum siap!");
  }

  try {
    // Simulasikan sedang mengetik
    await waClient.simulateTyping(to, true);
    const delayMs = Math.min(6000, content.length * 50);
    await delay(delayMs);
    await waClient.simulateTyping(to, false);

    // Kirim pesan
    await waClient.sendText(to, content);

    res.status(200).send("Pesan WhatsApp terkirim!");
  } catch (error) {
    console.error("? Gagal mengirim pesan:", error);
    res.status(500).send("Gagal mengirim pesan: " + error.message);
  }
});
