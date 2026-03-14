import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { exec } from "child_process";
import { CLIENT_ID } from "../config.js";
import os from "os";

export const { Client, LocalAuth, MessageMedia } = pkg;

// detecta termux, e usa o executável do chromium do sistema em vez do puppeteer
const isTermux =
  (os.platform() === "linux" || os.platform() === "android") &&
  process.env.PREFIX?.startsWith("/data/data/com.termux");

const puppeteerConfig = isTermux
  ? {
        executablePath: "/data/data/com.termux/files/usr/bin/chromium-browser",
        args: [
            "--headless=new",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--single-process",
            "--no-zygote",
            "--disable-software-rasterizer"
        ]
    }
  : {};

export const client = new Client({
    authStrategy: new LocalAuth({ clientId: CLIENT_ID }),
    puppeteer: {
        headless: true,
        ...puppeteerConfig
    }
});

client.on("qr", qr => {
    console.log("[BOT] Escaneie o QR Code");
    console.log(qr);
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