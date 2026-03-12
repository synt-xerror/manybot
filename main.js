import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;

import qrcode from 'qrcode-terminal';
import fs from 'fs';

const CHAT_ID_ALVO = process.argv[2];
if (!CHAT_ID_ALVO) {
    console.error("Use: node main.js <ID_DO_CHAT>");
    process.exit(1);
}

// Cada chat tem um clientId único e persistente
const CLIENT_ID = `chat_${CHAT_ID_ALVO.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
const BOT_PREFIX = "🤖 *ManyBot:* ";

const client = new Client({
    authStrategy: new LocalAuth({ clientId: CLIENT_ID }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 60000,
    }
});

client.on('qr', qr => {
    console.log(`[${CHAT_ID_ALVO}] QR Code gerado. Escaneie apenas uma vez:`);
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => console.log(`[${CHAT_ID_ALVO}] WhatsApp conectado.`));

client.on('disconnected', reason => {
    console.warn(`[${CHAT_ID_ALVO}] Desconectado: ${reason}. Tentando reconectar...`);
    setTimeout(() => client.initialize(), 5000);
});

client.on('message_create', async msg => {
    try {
        const chat = await msg.getChat();
        if (chat.id._serialized !== CHAT_ID_ALVO) return;

        console.log("==================================");
        console.log(`CHAT NAME : ${chat.name || chat.id.user || "Sem nome"}`);
        console.log(`CHAT ID   : ${chat.id._serialized}`);
        console.log(`FROM      : ${msg.from}`);
        console.log(`BODY      : ${msg.body}`);
        console.log("==================================\n");

        await processarComando(msg);
        await processarJogo(msg);

    } catch (err) {
        console.error("[ERRO]", err);
    }
});

// ---------------- Funções de envio ----------------

async function enviarVideo(cliente, chatId, caminhoArquivo) {
    if (!fs.existsSync(caminhoArquivo)) throw new Error(`Arquivo não encontrado: ${caminhoArquivo}`);

    const arquivo = fs.readFileSync(caminhoArquivo);
    const media = new MessageMedia('video/mp4', arquivo.toString('base64'), caminhoArquivo.split('/').pop());

    await cliente.sendMessage(chatId, media, { sendMediaAsDocument: false });
    fs.unlinkSync(caminhoArquivo);
    console.log(`[BOT] Vídeo enviado e removido: ${caminhoArquivo}`);
}

async function enviarAudio(cliente, chatId, caminhoArquivo) {
    if (!fs.existsSync(caminhoArquivo)) throw new Error(`Arquivo não encontrado: ${caminhoArquivo}`);

    const arquivo = fs.readFileSync(caminhoArquivo);
    const media = new MessageMedia('audio/mpeg', arquivo.toString('base64'), caminhoArquivo.split('/').pop());

    await cliente.sendMessage(chatId, media, { sendAudioAsVoice: false });
    fs.unlinkSync(caminhoArquivo);
    console.log(`[BOT] Áudio enviado e removido: ${caminhoArquivo}`);
}

function botMsg(texto) {
    return `${BOT_PREFIX}\n${texto}`;
}

function iniciarJogo(chat) {
    const numeroSecreto = Math.floor(Math.random() * 100) + 1;
    jogoAtivo = numeroSecreto;

    console.log(`[JOGO] ${chat.name}: Número escolhido ${numeroSecreto}`);
    chat.sendMessage(botMsg("Hora do jogo! Tentem adivinhar o número de 1 a 100!"));
}

// ---------------- Download ----------------

let downloadsAtivos = 0;
const MAX_DOWNLOADS = 2;
const downloadQueue = [];
let processingQueue = false;

// Garantir que a pasta downloads exista
if (!fs.existsSync('downloads')) fs.mkdirSync('downloads');

import { exec } from "child_process";

function get_video(url, id) {
    downloadsAtivos++;

    return new Promise((resolve, reject) => {
        const cmd = `yt-dlp -t mp4 --print after_move:filepath -o "downloads/${id}.%(ext)s" "${url}"`;

        exec(cmd, (error, stdout, stderr) => {
            downloadsAtivos--;

            if (stderr) console.error(stderr);
            if (error) return reject(new Error(`yt-dlp falhou: ${error.message}`));

            const filepath = stdout.trim();
            if (!filepath) return reject(new Error("yt-dlp não retornou filepath"));

            resolve(filepath);
        });
    });
}

function get_audio(url, id) {
    downloadsAtivos++;

    return new Promise((resolve, reject) => {
        const cmd = `yt-dlp -t mp3 --print after_move:filepath -o "downloads/${id}.%(ext)s" "${url}"`;

        exec(cmd, (error, stdout, stderr) => {
            downloadsAtivos--;

            if (stderr) console.error(stderr);
            if (error) return reject(new Error(`yt-dlp falhou: ${error.message}`));

            const filepath = stdout.trim();
            if (!filepath) return reject(new Error("yt-dlp não retornou filepath"));

            resolve(filepath);
        });
    });
}

function enqueueDownload(type, url, msg) {
    return new Promise((resolve, reject) => {
        downloadQueue.push({ type, url, msg, resolve, reject });
        processQueue();
    });
}

async function processQueue() {
    if (processingQueue) return;
    processingQueue = true;

    while (downloadQueue.length) {
        const { type, url, msg, resolve, reject } = downloadQueue.shift();
        const chat = await msg.getChat();
        const chatId = chat.id._serialized;
        try {
            let caminho;
            if (type === 'video') caminho = await get_video(url, msg.id._serialized);
            else caminho = await get_audio(url, msg.id._serialized);

            if (type === 'video') await enviarVideo(client, chatId, caminho);
            else await enviarAudio(client, chatId, caminho);

            resolve(caminho);
        } catch (err) {
            reject(err);
            const chat = await msg.getChat();
            chat.sendMessage(botMsg(`❌ Erro ao baixar ${type}: ${err.message}`));
        }
    }

    processingQueue = false;
}

// ---------------- Comandos ----------------

async function processarComando(msg) {
    const tokens = msg.body.trim().split(/\s+/);
    if (tokens[0] !== "!many") return;

    const chat = await msg.getChat();

    if (tokens.length === 1) {
        chat.sendMessage(botMsg(
            "- `!many ping` -> testa se estou funcionando\n" +
            "- `!many jogo` -> jogo de adivinhação\n" +
            "- `!many video <link>` -> baixo um vídeo da internet para você!\n" +
            "- `!many audio <link>` -> baixo um audio da internet para você!"
        ));
        return;
    }

    if (tokens[1] === "ping") chat.sendMessage(botMsg("pong 🏓"));
    if (tokens[1] === "jogo") iniciarJogo(chat);

    if (tokens[1] === "video" && tokens[2]) {
        chat.sendMessage(botMsg("⏳ Baixando vídeo, aguarde..."));
        enqueueDownload('video', tokens[2], msg);
    }

    if (tokens[1] === "audio" && tokens[2]) {
        chat.sendMessage(botMsg("⏳ Baixando áudio, aguarde..."));
        enqueueDownload('audio', tokens[2], msg);
    }
}

// ---------------- Jogo ----------------

async function processarJogo(msg) {
    const chat = await msg.getChat();
    if (!jogoAtivo) return;

    const tentativa = msg.body.trim();
    if (!/^\d+$/.test(tentativa)) return;

    const num = parseInt(tentativa, 10);

    if (num === jogoAtivo) {
        chat.sendMessage(botMsg(`Parabéns! Você acertou! Número: ${jogoAtivo}`));
        jogoAtivo = null;
    } else if (num > jogoAtivo) chat.sendMessage(botMsg(`Quase! Um pouco menor. Sua resposta: ${num}`));
    else chat.sendMessage(botMsg(`Quase! Um pouco maior. Sua resposta: ${num}`));
}

client.initialize();