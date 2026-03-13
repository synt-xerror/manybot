import pkg from "whatsapp-web.js";
const { MessageMedia } = pkg;
import sharp from "sharp";
import fs from "fs";
import { botMsg } from "../utils/botMsg.js";
import { client } from "../client/whatsappClient.js"

export async function gerarSticker(msg) {
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