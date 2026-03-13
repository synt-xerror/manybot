import { botMsg } from "../utils/botMsg.js";

export async function processarInfo(cmd, chat) {
    switch(cmd) {
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
}