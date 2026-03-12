// main_global.js
console.log("[CARREGANDO] Aguarde...");

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import { exec } from 'child_process';

const CLIENT_ID = "bot_permanente"; // sessão única global
const BOT_PREFIX = "🤖 *ManyBot:* ";

// lista fixa de chats que queremos interagir
import { CHATS_PERMITIDOS } from "./env.js"
// parecido com isso:
/*
export const CHATS_PERMITIDOS = [
    "123456789101234567@c.us", // pedrinho
    "987654321012345678@g.us" // escola
];
*/

let jogoAtivo = null;

// criar client único
const client = new Client({
    authStrategy: new LocalAuth({ clientId: CLIENT_ID }),
    puppeteer: { headless: true }
});

client.on('qr', qr => {
    console.log("[BOT] QR Code gerado. Escaneie apenas uma vez:");
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    exec("clear");
    console.log("[BOT] WhatsApp conectado e sessão permanente");
});

client.on('disconnected', reason => {
    console.warn(`[BOT] Desconectado: ${reason}. Tentando reconectar...`);
    setTimeout(() => client.initialize(), 5000);
});

client.on('message_create', async msg => {
    try {
        const chat = await msg.getChat();

        // filtra apenas chats permitidos
        if (!CHATS_PERMITIDOS.includes(chat.id._serialized)) return;

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
}

// ---------------- Download ----------------

let downloadsAtivos = 0;
const MAX_DOWNLOADS = 2;
const downloadQueue = [];
let processingQueue = false;

// Garantir que a pasta downloads exista
if (!fs.existsSync('downloads')) fs.mkdirSync('downloads');

function runYtDlp(cmd1, cmd2) {
    return new Promise((resolve, reject) => {
        exec(cmd1, (error, stdout, stderr) => {
            if (!error) return resolve({ stdout, stderr });

            exec(cmd2, (error2, stdout2, stderr2) => {
                if (error2) return reject(error2);
                resolve({ stdout: stdout2, stderr: stderr2 });
            });
        });
    });
}

function get_video(url, id) {
    downloadsAtivos++;

    return new Promise(async (resolve, reject) => {
        const cmd1 = `yt-dlp -t mp4 --print after_move:filepath -o "downloads/${id}.%(ext)s" "${url}"`;
        const cmd2 = `.\yt-dlp.exe -t mp4 --print after_move:filepath -o "downloads/${id}.%(ext)s" "${url}"`;

        try {
            const { stdout, stderr } = await runYtDlp(cmd1, cmd2);
            downloadsAtivos--;

            if (stderr) console.error(stderr);

            const filepath = stdout.trim();
            if (!filepath) return reject(new Error("yt-dlp não retornou filepath"));

            resolve(filepath);
        } catch (err) {
            downloadsAtivos--;
            reject(new Error(`yt-dlp falhou: ${err.message}`));
        }
    });
}

function get_audio(url, id) {
    downloadsAtivos++;

    return new Promise(async (resolve, reject) => {
        const cmd1 = `yt-dlp -t mp3 --print after_move:filepath -o "downloads/${id}.%(ext)s" "${url}"`;
        const cmd2 = `.\yt-dlp.exe -t mp3 --print after_move:filepath -o "downloads/${id}.%(ext)s" "${url}"`;

        try {
            const { stdout, stderr } = await runYtDlp(cmd1, cmd2);
            downloadsAtivos--;

            if (stderr) console.error(stderr);

            const filepath = stdout.trim();
            if (!filepath) return reject(new Error("yt-dlp não retornou filepath"));

            resolve(filepath);
        } catch (err) {
            downloadsAtivos--;
            reject(new Error(`yt-dlp falhou: ${err.message}`));
        }
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
            "- `!many adivinhação <começar|parar>` -> jogo de adivinhação\n" +
            "- `!many video <link>` -> baixo um vídeo da internet para você!\n" +
            "- `!many audio <link>` -> baixo um audio da internet para você!"
        ));
        return;
    }

    if (tokens[1] === "ping") chat.sendMessage(botMsg("pong 🏓"));
    if (tokens[1] === "adivinhação") {
        if (tokens[2] === undefined) {
            chat.sendMessage(botMsg("Acho que você se esqueceu de algo! 😅\n" +
                                        "🏁 `!many adivinhação começar` -> começa o jogo\n" +
                                        "🛑 `!many adivinhação parar` -> para o jogo atual"
                                    ));
        } else if (tokens[2] === "começar") {
            iniciarJogo(chat);
            chat.sendMessage(botMsg("Hora do jogo! 🏁 Tentem adivinhar o número de 1 a 100 que eu estou pensando!"));
        } else if (tokens[2] === "parar") {
            jogoAtivo = null
            chat.sendMessage(botMsg("O jogo atual foi interrompido 🛑"));
        }
    }

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