import pkg from "whatsapp-web.js";
const { MessageMedia } = pkg;

import fs from "fs";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import webpmux from "node-webpmux";

import { botMsg } from "../utils/botMsg.js";
import { client } from "../client/whatsappClient.js";

const exec = promisify(execFile);

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

    const so = os.platform();
    const cmd = so === "win32" ? ".\\bin\\ffmpeg.exe" : "./bin/ffmpeg";

    await exec(cmd, [
        "-y",
        "-i", input,
        "-vf",
        "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000",
        "-vcodec", "libwebp",
        "-lossless", "1",
        "-qscale", "75",
        "-preset", "default",
        "-an",
        "-vsync", "0",
        output
    ]);

    const img = new webpmux.Image();
    await img.load(output);

    const metadata = {
        "sticker-pack-id": "manybot",
        "sticker-pack-name": "Feito por ManyBot",
        "sticker-pack-publisher": "My Little Pony Lovers",
        "emojis": ["🤖"]
    };

    const json = Buffer.from(JSON.stringify(metadata));

    const exif = Buffer.concat([
        Buffer.from([
            0x49,0x49,0x2A,0x00,
            0x08,0x00,0x00,0x00,
            0x01,0x00,
            0x41,0x57,
            0x07,0x00
        ]),
        Buffer.from([
            json.length & 0xff,
            (json.length >> 8) & 0xff,
            (json.length >> 16) & 0xff,
            (json.length >> 24) & 0xff
        ]),
        json
    ]);

    img.exif = exif;
    await img.save(output);

    const data = fs.readFileSync(output);

    const sticker = new MessageMedia(
        "image/webp",
        data.toString("base64"),
        "sticker.webp"
    );

    const chat = await msg.getChat();

    await client.sendMessage(
        chat.id._serialized,
        sticker,
        { sendMediaAsSticker: true }
    );

    fs.unlinkSync(input);
    fs.unlinkSync(output);
}