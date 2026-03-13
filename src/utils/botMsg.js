import { BOT_PREFIX } from "../config.js";

export function botMsg(texto) {
    return `${BOT_PREFIX}\n${texto}`;
}