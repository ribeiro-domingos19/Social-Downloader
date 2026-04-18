const express = require('express');
const { exec, execSync } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const downloadCache = new Map();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Verifica yt-dlp ao iniciar
try {
    execSync('yt-dlp --version', { stdio: 'ignore' });
    console.log("yt-dlp OK");
} catch (e) {
    console.log("A instalar yt-dlp...");
    try { execSync('pip install yt-dlp', { stdio: 'inherit' }); }
    catch (e2) {
        try { execSync('pip3 install yt-dlp', { stdio: 'inherit' }); }
        catch (e3) { console.log("Erro ao instalar yt-dlp:", e3.message); }
    }
}

// Função partilhada de download via yt-dlp
function dispararYtDlp(res, url, name, isAudio = false, noWatermark = false) {
    const cleanUrl = url.split(' ')[0].trim();
    const tmpDir = process.env.TMPDIR || process.env.HOME || '/tmp';
    const tmpBase = path.join(tmpDir, `sdl_${Date.now()}`);
    const tmpTemplate = `${tmpBase}.%(ext)s`;
    const flags = `--no-warnings --no-check-certificate --socket-timeout 15 --no-playlist`;

    let format;
    if (isAudio) {
        format = `-f "bestaudio/best" -x --audio-format mp3`;
    } else if (noWatermark) {
        format = `-f "download_addr-2/best[ext=mp4]/best"`;
    } else {
        format = `-f "best[height<=720][ext=mp4]/best[height<=720]/best"`;
    }

    const command = `yt-dlp "${cleanUrl}" ${format} ${flags} -o "${tmpTemplate}"`;
    console.log("=== YT-DLP ===");
    console.log("Comando:", command);

    exec(command, (error, stdout, stderr) => {
        console.log("Erro:", error ? error.message : "nenhum");
        console.log("stderr:", stderr);

        const prefix = path.basename(tmpBase);
        let generated = null;
        try {
            const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(prefix));
            console.log("Ficheiros:", files);
            if (files.length > 0) generated = path.join(tmpDir, files[0]);
        } catch (e) {
            console.log("Erro readdirSync:", e.message);
        }

        if (!generated || !fs.existsSync(generated)) {
            console.log("FALHOU: ficheiro não gerado");
            return res.status(500).send("Erro ao gerar ficheiro");
        }

        const ext = path.extname(generated).toLowerCase();
        res.setHeader('Content-Type', ext === '.mp3' ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
        const stream = fs.createReadStream(generated);
        stream.pipe(res);
        stream.on('end', () => fs.unlink(generated, () => {}));
        stream.on('error', () => fs.unlink(generated, () => {}));
    });
}

// ROTA: THUMBNAIL
app.get('/api/thumbnail', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send("URL ausente");

    let referer = 'https://www.facebook.com/';
    if (url.includes('tiktok') || url.includes('muscdn')) referer = 'https://www.tiktok.com/';
    if (url.includes('instagram') || url.includes('cdninstagram')) referer = 'https://www.instagram.com/';

    try {
        const response = await axios({
            method: 'get', url, responseType: 'stream',
            headers: { 'User-Agent': UA, 'Referer': referer }
        });
        res.setHeader('Content-Type', 'image/jpeg');
        response.data.pipe(res);
    } catch (error) {
        console.log("Erro thumbnail:", error.message);
        res.status(500).send("Erro thumbnail");
    }
});

// ROTA: PROXY DOWNLOAD (CDN directa ou yt-dlp)
app.get('/api/proxy-download', async (req, res) => {
    const { url, name } = req.query;
    if (!url) return res.status(400).send("URL ausente");

    const isCDN = url.includes('cdninstagram.com') ||
                  url.includes('fbcdn.net') ||
                  url.includes('facebook.com/video');

    if (isCDN) {
        console.log("=== PROXY-DOWNLOAD (axios) ===");
        try {
            const response = await axios({
                method: 'get', url, responseType: 'stream', timeout: 30000,
                headers: {
                    'User-Agent': UA,
                    'Referer': url.includes('instagram') ? 'https://www.instagram.com/' : 'https://www.facebook.com/'
                }
            });
            res.setHeader('Content-Type', name.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
            response.data.pipe(res);
        } catch (error) {
            console.log("Erro axios:", error.message);
            res.status(500).send("Erro no download");
        }
    } else {
        dispararYtDlp(res, url, name, name.endsWith('.mp3'), false);
    }
});

// ROTA: DOWNLOAD VIA YT-DLP (TikTok)
app.get('/api/download-file', (req, res) => {
    const { url, name, isAudio, noWatermark } = req.query;
    if (!url) return res.status(400).send("URL ausente");
    dispararYtDlp(res, url, name, isAudio === 'true', noWatermark === 'true');
});

// ROTA: EXTRAÇÃO DE METADADOS
app.post('/api/download', (req, res) => {
    const { url, isAudio, noWatermark } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "URL vazia" });

    const cleanUrl = url.split(' ')[0].trim();
    const cacheKey = `${isAudio ? 'audio' : 'video'}_${noWatermark ? 'nowm' : 'wm'}_${cleanUrl}`;
    if (downloadCache.has(cacheKey)) {
        console.log("Cache hit!");
        return res.json(downloadCache.get(cacheKey));
    }

    const flags = `--no-playlist --no-warnings --no-check-certificate --socket-timeout 10`;
    let format;
    if (isAudio) {
        format = `-f "bestaudio/best"`;
    } else if (/tiktok\.com/i.test(cleanUrl) && noWatermark) {
        format = `-f "download_addr-2/best[ext=mp4]/best"`;
    } else {
        format = `-f "best[height<=720][ext=mp4]/best[height<=720]/best"`;
    }

    const command = `yt-dlp "${cleanUrl}" -j ${format} ${flags}`;
    console.log("=== EXTRAÇÃO METADADOS ===");
    console.log("Comando:", command);

    exec(command, (error, stdout, stderr) => {
        console.log("Erro:", error ? error.message : "nenhum");
        console.log("stderr:", stderr);

        if (error) return res.status(500).json({ success: false, error: "Falha na extração" });

        try {
            const info = JSON.parse(stdout);
            const responseData = {
                success: true,
                title: info.title || "Vídeo",
                thumbnail: info.thumbnail || "",
                url: info.url,
                suggestedName: `SocialDL_${Date.now().toString().slice(-4)}`
            };
            console.log("Extração OK:", responseData.title);
            downloadCache.set(cacheKey, responseData);
            setTimeout(() => downloadCache.delete(cacheKey), 600000);
            res.json(responseData);
        } catch (e) {
            console.log("Erro JSON:", e.message);
            res.status(500).json({ success: false, error: "Erro no processamento" });
        }
    });
});

// ROTA: VERIFICAÇÃO
app.get('/api/check', (req, res) => {
    exec('yt-dlp --version && ffmpeg -version 2>&1 | head -1', (error, stdout, stderr) => {
        res.json({ resultado: stdout || error?.message, stderr });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SocialDL rodando na porta ${PORT}`));
