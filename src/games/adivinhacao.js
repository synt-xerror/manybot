import { botMsg } from "../utils/botMsg.js";

let jogoAtivo = null;

export function iniciarJogo() {
    jogoAtivo = Math.floor(Math.random()*100)+1;
    return jogoAtivo;
}

export function pararJogo() {
    jogoAtivo = null;
}

export async function processarJogo(msg, chat) {
    if (!jogoAtivo) return;

    const tentativa = msg.body.trim();
    if (!/^\d+$/.test(tentativa)) return;

    const num = parseInt(tentativa);
    if (num === jogoAtivo) {
        await msg.reply(botMsg(`Acertou! Número: ${jogoAtivo}`));
        pararJogo();
    } else if (num > jogoAtivo) {
        await chat.sendMessage(botMsg("Menor."));
    } else {
        await chat.sendMessage(botMsg("Maior."));
    }
}