import { enqueueDownload } from "../download/queue.js";
import { gerarSticker } from "./figurinha.js";
import { botMsg } from "../utils/botMsg.js";
import { iniciarJogo, pararJogo, processarJogo } from "../games/adivinhacao.js";
import { processarInfo } from "./info.js";

export async function processarComando(msg, chat, chatId) {
    const tokens = msg.body.trim().split(/\s+/);
    try {
        switch(tokens[0]) {
            case "!many":
                await chat.sendMessage(botMsg(
                    "Comandos:\n\n"+
                    "- `!ping`\n"+
                    "- `!video <link>`\n"+
                    "- `!audio <link>`\n"+
                    "- `!figurinha`\n"+
                    "- `!adivinhação começar|parar`\n"+
                    "- `!info <comando>`"
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
                    iniciarJogo();
                    await chat.sendMessage(botMsg("Jogo iniciado! Tente adivinhar o número de 1 a 100."));
                }
                if (tokens[1] === "parar") {
                    pararJogo();
                    await chat.sendMessage(botMsg("Jogo parado."));
                }
            break;

            case "!info":
                if (!tokens[1]) {
                    await chat.sendMessage(botMsg("Use:\n`!info <comando>`"));
                    return;
                } else {
                    processarInfo(tokens[1], chat);
                }
            break;
        }
    } catch(err) {
        console.error(err);
        await chat.sendMessage(botMsg("Erro:\n`"+err.message+"`"));
    }
}