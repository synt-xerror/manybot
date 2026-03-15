import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { exec } from "child_process";
import { CLIENT_ID } from "../config.js";
import os from "os";

export const { Client, LocalAuth, MessageMedia } = pkg;

// ── Logger ──────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m",
  red: "\x1b[31m", gray: "\x1b[90m", white: "\x1b[37m",
  blue: "\x1b[34m", magenta: "\x1b[35m",
};

const now = () =>
  new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const logger = {
  info:    (...a) => console.log(`${c.gray}${now()}${c.reset} ℹ️ `, ...a),
  success: (...a) => console.log(`${c.gray}${now()}${c.reset} ${c.green}✅${c.reset}`, ...a),
  warn:    (...a) => console.log(`${c.gray}${now()}${c.reset} ${c.yellow}⚠️ ${c.reset}`, ...a),
  error:   (...a) => console.log(`${c.gray}${now()}${c.reset} ${c.red}❌${c.reset}`, ...a),
  bot:     (...a) => console.log(`${c.gray}${now()}${c.reset} ${c.magenta}🤖${c.reset}`, ...a),
};

// ── Banner ───────────────────────────────────────────────────
function printBanner() {
  console.log(`${c.blue}${c.bold}`);
  console.log(` _____             _____     _   `);
  console.log(`|     |___ ___ _ _| __  |___| |_ `);
  console.log(`| | | | .'|   | | | __ -| . |  _|`);
  console.log(`|_|_|_|__,|_|_|_  |_____|___|_|  `);
  console.log(`              |___|               `);
  console.log();
  console.log(`  website : ${c.reset}${c.cyan}www.mlplovers.com.br/manybot${c.reset}`);
  console.log(`  repo    : ${c.reset}${c.cyan}github.com/synt-xerror/manybot${c.reset}`);
  console.log();
  console.log(`  ${c.bold}✨ A Amizade é Mágica!${c.reset}`);
  console.log();
}

// ── Ambiente ─────────────────────────────────────────────────
const isTermux =
  (os.platform() === "linux" || os.platform() === "android") &&
  process.env.PREFIX?.startsWith("/data/data/com.termux");

logger.info(isTermux
  ? `Ambiente: ${c.yellow}${c.bold}Termux${c.reset} — usando Chromium do sistema`
  : `Ambiente: ${c.blue}${c.bold}${os.platform()}${c.reset} — usando Puppeteer padrão`
);

const puppeteerConfig = isTermux
  ? {
      executablePath: "/data/data/com.termux/files/usr/bin/chromium-browser",
      args: [
        "--headless=new", "--no-sandbox", "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", "--disable-gpu", "--single-process",
        "--no-zygote", "--disable-software-rasterizer",
      ],
    }
  : {};

// ── Cliente ──────────────────────────────────────────────────
export const client = new Client({
  authStrategy: new LocalAuth({ clientId: CLIENT_ID }),
  puppeteer: { headless: true, ...puppeteerConfig },
});

client.on("qr", async qr => {
  if (isTermux) {
    try {
      await QRCode.toFile(QR_PATH, qr, { width: 400 });
      logger.bot(`QR Code salvo em: ${c.cyan}${c.bold}${QR_PATH}${c.reset}`);
      logger.bot(`Abra com: ${c.yellow}termux-open qr.png${c.reset}`);
    } catch (err) {
      logger.error("Falha ao salvar QR Code:", err.message);
    }
  } else {
    logger.bot(`Escaneie o ${c.yellow}${c.bold}QR Code${c.reset} abaixo:`);
    qrcode.generate(qr, { small: true });
  }
});

client.on("ready", () => {
  exec("clear");
  printBanner();
  logger.success(`${c.green}${c.bold}WhatsApp conectado e pronto!${c.reset}`);
  logger.info(`Client ID: ${c.cyan}${CLIENT_ID}${c.reset}`);
});

client.on("disconnected", reason => {
  logger.warn(`Desconectado — motivo: ${c.yellow}${reason}${c.reset}`);
  logger.info(`Reconectando em ${c.cyan}5s${c.reset}...`);
  setTimeout(() => {
    logger.bot("Reinicializando cliente...");
    client.initialize();
  }, 5000);
});

export default client;