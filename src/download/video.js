import { spawn } from "child_process";
import os from "os";

const so = os.platform();

export async function get_video(url, id) {
    const cmd = so === "win32" ? ".\\bin\\yt-dlp.exe" : "./bin/yt-dlp";
    const args = [
        '--extractor-args', 'youtube:player_client=android',
        '-f', 'bv+ba/best',
        '--print', 'after_move:filepath',
        '--output', `downloads/${id}.%(ext)s`,
        '--cookies', 'cookies.txt',
        '--add-header', 'User-Agent:Mozilla/5.0',
        '--add-header', 'Referer:https://www.youtube.com/',
        '--retries', '4',
        '--fragment-retries', '5',
        '--socket-timeout', '15',
        '--sleep-interval', '1', '--max-sleep-interval', '4',
        '--allow-unplayable-formats',
        url
    ];

    return await runCmd(cmd, args);
}

async function runCmd(cmd, args) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args);
        let stdout = "";

        proc.stdout.on("data", data => stdout += data.toString());
        proc.stderr.on("data", data => console.error("[cmd ERR]", data.toString()));
        proc.on("close", code => code === 0 ? resolve(stdout.trim()) : reject(new Error("Processo saiu com código "+code)));
    });
}