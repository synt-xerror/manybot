// main.js
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

const CLIENT_ID = "bot_permanente"; // sempre o mesmo

const client = new Client({
    authStrategy: new LocalAuth({ clientId: CLIENT_ID }),
    puppeteer: { headless: true }
});

client.on('qr', qr => {
    console.log("[BOT] QR Code gerado. Escaneie apenas uma vez:");
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => console.log("[BOT] WhatsApp conectado e sessão permanente"));

client.on('message_create', async msg => {
    try {
        const chat = await msg.getChat(); // pega o chat uma única vez

        console.log("==================================");
        console.log(`CHAT NAME : ${chat.name || chat.id.user || "Sem nome"}`);
        console.log(`CHAT ID   : ${chat.id._serialized}`);
        console.log(`FROM      : ${msg.from}`);
        console.log(`BODY      : ${msg.body}`);
        console.log("==================================\n");

    } catch (err) {
        console.error("[ERRO]", err);
    }
});

client.initialize();