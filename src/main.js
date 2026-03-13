console.log("Iniciando...");

import client from "./client/whatsappClient.js";
import { CHATS } from "./config.js";
import { processarComando } from "./commands/index.js";
import { processarJogo } from "./games/adivinhacao.js";
import { getChatId } from "./utils/getChatId.js";

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
    } catch(err) {
        console.error("[ERRO]", err);
    }
});

client.initialize();