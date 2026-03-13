import { get_video } from "./video.js";
import { get_audio } from "./audio.js";
import pkg from "whatsapp-web.js";
const { MessageMedia } = pkg;
import fs from "fs";
import { botMsg } from "../utils/botMsg.js";
import { emptyFolder } from "../utils/file.js";
import client from "../client/whatsappClient.js";

let downloadQueue = [];
let processingQueue = false;

export function enqueueDownload(type, url, msg, chatId) {
    downloadQueue.push({ type, url, msg, chatId });
    if (!processingQueue) processQueue();
}

async function processQueue() {
    processingQueue = true;
    while (downloadQueue.length) {
        const job = downloadQueue.shift();
        try {
            let path;
            if (job.type === "video") path = await get_video(job.url, job.msg.id._serialized);
            else path = await get_audio(job.url, job.msg.id._serialized);

            const file = fs.readFileSync(path);
            const media = new MessageMedia(
                job.type === "video" ? "video/mp4" : "audio/mpeg",
                file.toString("base64"),
                path.split("/").pop()
            );
            await client.sendMessage(job.chatId, media);
            fs.unlinkSync(path);
            emptyFolder("downloads");

        } catch (err) {
            await client.sendMessage(job.chatId, botMsg(`❌ Erro ao baixar ${job.type}\n\`${err.message}\``));
        }
    }
    processingQueue = false;
}