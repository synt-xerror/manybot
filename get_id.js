// get_id.js

const arg = process.argv[2]; // argumento passado no node
if (!arg) {
    console.log("Use: node get_id.js grupos|contatos|<nome>");
    process.exit(0);
}

console.log("[PESQUISANDO] Aguarde...");

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

client.on('ready', () => {
    console.log("[BOT] WhatsApp conectado e sessão permanente");
});

client.on('ready', async () => {
    const chats = await client.getChats();

    let filtered = [];

    if (arg.toLowerCase() === "grupos") {
        filtered = chats.filter(c => c.isGroup);
    } else if (arg.toLowerCase() === "contatos") {
        filtered = chats.filter(c => !c.isGroup);
    } else {
        const search = arg.toLowerCase();
        filtered = chats.filter(c => (c.name || c.id.user).toLowerCase().includes(search));
    }

    if (filtered.length === 0) {
        console.log("Nenhum chat encontrado com esse filtro.");
    } else {
        console.log(`Encontrados ${filtered.length} chats:`);
        filtered.forEach(c => {
            console.log("================================");
            console.log("NAME:", c.name || c.id.user);
            console.log("ID:", c.id._serialized);
            console.log("GROUP:", c.isGroup);
        });
    }

    process.exit(0); // fecha o script após listar
});

client.initialize();