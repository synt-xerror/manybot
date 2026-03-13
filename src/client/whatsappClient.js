import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { exec } from "child_process";
import { CLIENT_ID } from "../config.js";

export const { Client, LocalAuth, MessageMedia } = pkg;

export const client = new Client({
    authStrategy: new LocalAuth({ clientId: CLIENT_ID }),
    puppeteer: { headless: true }
});

client.on("qr", qr => {
    console.log("[BOT] Escaneie o QR Code");
    qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
    exec("clear");
    console.log("[BOT] WhatsApp conectado.");
});

client.on("disconnected", reason => {
    console.warn("[BOT] Reconectando:", reason);
    setTimeout(() => client.initialize(), 5000);
});

export default client;