console.log("[CARREGANDO] Aguarde...");

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;

import qrcode from 'qrcode-terminal';
import fs from 'fs';
import { exec, spawn } from 'child_process';
import sharp from 'sharp';
import os from 'os';
import path from "path";

console.log(os.platform());

import { CHATS } from "./env.js";

const CLIENT_ID = "bot_permanente";
const BOT_PREFIX = "🤖 *ManyBot:* ";

let jogoAtivo = null;

if (!fs.existsSync("downloads")) fs.mkdirSync("downloads");

const client = new Client({
    authStrategy: new LocalAuth({ clientId: CLIENT_ID }),
    puppeteer: { headless: true }
});

function botMsg(texto) {
    return `${BOT_PREFIX}\n${texto}`;
}

function getChatId(chat) {
    return chat.id._serialized;
}

// ---------------- Eventos ----------------

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

client.on("message_create", async msg => {
    try {
        const chat = await msg.getChat();
        const chatId = getChatId(chat);

        if (!CHATS.includes(chatId)) return;

        console.log("==================================");
        console.log(`CHAT NAME : ${chat.name || chat.id.user}`);
        console.log(`CHAT ID   : ${chatId}`);
        console.log(`FROM      : ${msg.from}`);
        console.log(`BODY      : ${msg.body}`);
        console.log("==================================\n");

        await processarComando(msg, chat, chatId);
        await processarJogo(msg, chat);

    } catch (err) {
        console.error("[ERRO]", err);
    }
});

// ---------------- Download ----------------

let downloadQueue = [];
let processingQueue = false;

function run(cmd, args) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args);

        let stdout = "";

        proc.stdout.on("data", data => {
            const text = data.toString();
            stdout += text;
            console.log("[cmd]", text);
        });

        proc.stderr.on("data", data => {
            console.error("[cmd ERR]", data.toString());
        });

        proc.on("close", code => {
            if (code !== 0) reject(new Error("Processo saiu com código " + code));
            else resolve(stdout);
        });
    });
}

const so = os.platform();

async function get_video(url, id) {
    let cmd = "";
    const cmd_lin = "./bin/yt-dlp";
    const cmd_win = ".\\bin\\yt-dlp.exe";

    switch (so) {
        case "win32":
            cmd = cmd_win;
            break;
        case "linux":
            cmd = cmd_lin;
            break;
    }

    const args = [
      '--extractor-args', 'youtube:player_client=android', // mantém seu client preferido
      '-f', 'bv+ba/best',                                 // tentar vídeo+áudio; fallback para best
      '--print', 'after_move:filepath',
      '--output', `downloads/${id}.%(ext)s`,
    
      // autenticacao (use cookies exportado com yt-dlp ou --cookies-from-browser)
      '--cookies', 'cookies.txt',                         // arquivo de cookies (gerar antes)
      // cabeçalhos para reduzir 403
      '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      '--add-header', 'Referer:https://www.youtube.com/',
      // tolerância de rede
      '--retries', '4',
      '--fragment-retries', '5',
      '--socket-timeout', '15',
      '--sleep-interval', '1', '--max-sleep-interval', '4',
      // permitir formatos que podem ser marcados como "unplayable" (útil em alguns casos)
      '--allow-unplayable-formats',
      // testes / debug: use -v quando precisar diagnosticar
      // url
      url
    ];

    const stdout = await run(cmd, args);
    const filepath = stdout.trim();
    if (!filepath) throw new Error("yt-dlp não retornou caminho");

    return filepath;
}

async function get_audio(url, id) {
    const video = await get_video(url, id);
    const output = `downloads/${id}.mp3`;

    let cmd = "";
    const cmd_lin = "./bin/ffmpeg";
    const cmd_win = ".\\bin\\ffmpeg.exe";

    switch (so) {
        case "win32":
            cmd = cmd_win;
            break;
        case "linux":
            cmd = cmd_lin;
            break;
    }

    const args = [
      '-i', video,
      '-vn', '-acodec',
      'libmp3lame', '-q:a', '2',
      output
    ];

    await run(cmd, args);

    return output;
}

function empty_folder(folder) {
    fs.readdirSync(folder).forEach(file => {
        const filePath = path.join(folder, file);
        if (fs.lstatSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
        }
    });
}

async function enviarVideo(chatId, path) {
    const file = fs.readFileSync(path);
    const media = new MessageMedia(
        "video/mp4",
        file.toString("base64"),
        path.split("/").pop()
    );
    await client.sendMessage(chatId, media);
    fs.unlinkSync(path);
    empty_folder("./downloads");
}

async function enviarAudio(chatId, path) {
    const file = fs.readFileSync(path);
    const media = new MessageMedia(
        "audio/mpeg",
        file.toString("base64"),
        path.split("/").pop()
    );
    await client.sendMessage(chatId, media);
    fs.unlinkSync(path);
    empty_folder("./downloads");
}

function enqueueDownload(type, url, msg, chatId) {
    downloadQueue.push({ type, url, msg, chatId });
    if (!processingQueue) processQueue();
}

async function processQueue() {
    processingQueue = true;
    while (downloadQueue.length) {
        const job = downloadQueue.shift();
        try {
            let path;
            if (job.type === "video")
                path = await get_video(job.url, job.msg.id._serialized);
            else
                path = await get_audio(job.url, job.msg.id._serialized);

            if (job.type === "video")
                await enviarVideo(job.chatId, path);
            else
                await enviarAudio(job.chatId, path);

        } catch (err) {
            await client.sendMessage(
                job.chatId,
                botMsg(`❌ Erro ao baixar ${job.type}\n\`${err.message}\``)
            );
        }
    }
    processingQueue = false;
}

// ---------------- Figurinha ----------------

async function gerarSticker(msg) {
    if (!msg.hasMedia) {
        await msg.reply(botMsg("Envie uma imagem junto com o comando: `!figurinha`."));
        return;
    }

    const media = await msg.downloadMedia();
    const ext = media.mimetype.split("/")[1];

    const input = `downloads/${msg.id._serialized}.${ext}`;
    const output = `downloads/${msg.id._serialized}.webp`;

    fs.writeFileSync(input, Buffer.from(media.data, "base64"));

    await sharp(input)
        .resize(512, 512, { fit: "contain", background: { r:0,g:0,b:0,alpha:0 } })
        .webp()
        .toFile(output);

    const data = fs.readFileSync(output);
    const sticker = new MessageMedia("image/webp", data.toString("base64"), "sticker.webp");
    const chat = await msg.getChat();

    await client.sendMessage(chat.id._serialized, sticker, { sendMediaAsSticker: true });

    fs.unlinkSync(input);
    fs.unlinkSync(output);
}

// ---------------- Comandos ----------------

async function processarComando(msg, chat, chatId) {
    const tokens = msg.body.trim().split(/\s+/);
    try {
        switch(tokens[0]) {
            case "!many":
                await chat.sendMessage(botMsg(
                    "Comandos:\n\n"+
                    "`!ping`\n"+
                    "`!video <link>`\n"+
                    "`!audio <link>`\n"+
                    "`!figurinha`\n"+
                    "`!adivinhação começar|parar`\n"+
                    "`!info <comando>`"
                ));
            break;

            case "!ping":
                await msg.reply(botMsg("pong 🏓"));
            break;

            case "!video":
                if (!tokens[1]) return;
                await msg.reply(botMsg("⏳ Baixando vídeo..."));
                enqueueDownload("video", tokens[1], msg, chatId);
            break;

            case "!audio":
                if (!tokens[1]) return;
                await msg.reply(botMsg("⏳ Baixando áudio..."));
                enqueueDownload("audio", tokens[1], msg, chatId);
            break;

            case "!figurinha":
                await gerarSticker(msg);
            break;

            case "!adivinhação":
                if (!tokens[1]) {
                    await chat.sendMessage(botMsg("`!adivinhação começar`\n`!adivinhação parar`"));
                    return;
                }
                if (tokens[1] === "começar") {
                    jogoAtivo = Math.floor(Math.random()*100)+1;
                    await chat.sendMessage(botMsg("Adivinhe o número de 1 a 100!"));
                }
                if (tokens[1] === "parar") {
                    jogoAtivo = null;
                    await chat.sendMessage(botMsg("Jogo encerrado."));
                }
            break;

            case "A":
            case "a":
                if (!tokens[1]) await msg.reply(botMsg("B!"));
            break;

            case "!info":
                if (!tokens[1]) {
                    await chat.sendMessage(botMsg("Use:\n`!info <comando>`"));
                    return;
                }
                switch(tokens[1]) {
                    case "ping":
                        await chat.sendMessage(botMsg("> `!ping`\nResponde pong."));
                    break;
                    case "video":
                        await chat.sendMessage(botMsg("> `!video <link>`\nBaixa vídeo da internet."));
                    break;
                    case "audio":
                        await chat.sendMessage(botMsg("> `!audio <link>`\nBaixa áudio da internet."));
                    break;
                    case "figurinha":
                        await chat.sendMessage(botMsg("`!figurinha`\nTransforma imagem/GIF em sticker."));
                    break;
                    default:
                        await chat.sendMessage(botMsg(`❌ Comando '${tokens[1]}' não encontrado.`));
                }
            break;
        }
    } catch(err) {
        console.error(err);
        await chat.sendMessage(botMsg("Erro:\n`"+err.message+"`"));
    }
}

// ---------------- Jogo ----------------

async function processarJogo(msg, chat) {
    if (!jogoAtivo) return;

    const tentativa = msg.body.trim();
    if (!/^\d+$/.test(tentativa)) return;

    const num = parseInt(tentativa);
    if (num === jogoAtivo) {
        await msg.reply(botMsg(`Acertou! Número: ${jogoAtivo}`));
        jogoAtivo = null;
    } else if (num > jogoAtivo) {
        await chat.sendMessage(botMsg("Menor."));
    } else {
        await chat.sendMessage(botMsg("Maior."));
    }
}

client.initialize();