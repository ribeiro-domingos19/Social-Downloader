const express = require('express');
const { exec } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const downloadCache = new Map();

// ROTA 1: PROXY DIRECTO (Facebook / Instagram)

// ROTA 1: PROXY DIRECTO — usa axios para CDNs, yt-dlp só se necessário
app.get('/api/proxy-download', async (req, res) => {
    const { url, name } = req.query;
    if (!url) return res.status(400).send("URL ausente");

    const isCDN = url.includes('cdninstagram.com') || 
                  url.includes('fbcdn.net') || 
                  url.includes('facebook.com/video');

    if (isCDN) {
        // CDN directa — axios é muito mais rápido
        console.log("=== PROXY-DOWNLOAD (axios) ===");
        try {
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
        // Não é CDN directa — usa yt-dlp
        const tmpDir = process.env.TMPDIR || process.env.HOME || '/tmp';
        const tmpBase = path.join(tmpDir, `sdl_${Date.now()}`);
        const tmpTemplate = `${tmpBase}.%(ext)s`;

        const isAudio = name.endsWith('.mp3');
        const format = isAudio
            ? `-f "bestaudio/best" -x --audio-format mp3`
            : `-f "best[height<=720][ext=mp4]/best[height<=720]/best"`;

        const flags = `--no-warnings --no-check-certificate --socket-timeout 15 --no-playlist`;
        const cleanUrl = url.split(' ')[0].trim();
        const command = `yt-dlp "${cleanUrl}" ${format} ${flags} -o "${tmpTemplate}"`;

        console.log("=== PROXY-DOWNLOAD (yt-dlp) ===");
        console.log("Comando:", command);

        exec(command, (error, stdout, stderr) => {
            console.log("Erro exec:", error ? error.message : "nenhum");
            console.log("stderr:", stderr);

            const prefix = path.basename(tmpBase);
            let generated = null;
            try {
                const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(prefix));
                if (files.length > 0) generated = path.join(tmpDir, files[0]);
            } catch (e) {
                console.log("Erro ao procurar ficheiro:", e.message);
            }

            if (!generated || !fs.existsSync(generated)) {
                return res.status(500).send("Erro no download");
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
});

app.get('/api/thumbnail', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send("URL ausente");

    let referer = 'https://www.facebook.com/';
    if (url.includes('tiktok') || url.includes('muscdn')) referer = 'https://www.tiktok.com/';
    if (url.includes('instagram') || url.includes('cdninstagram')) referer = 'https://www.instagram.com/';

    try {
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': referer
            }
        });
        res.setHeader('Content-Type', 'image/jpeg');
        response.data.pipe(res);
    } catch (error) {
        console.log("Erro thumbnail:", error.message);
        res.status(500).send("Erro ao carregar thumbnail");
    }
});

// ROTA 2: DOWNLOAD DIRECTO VIA YT-DLP (TikTok)
app.get('/api/download-file', (req, res) => {
    const { url, name, isAudio, noWatermark } = req.query;
    const cleanUrl = url.split(' ')[0].trim();
    if (!url) return res.status(400).send("URL ausente");

    const tmpDir = process.env.TMPDIR || process.env.HOME || '/tmp';
    const tmpBase = path.join(tmpDir, `sdl_${Date.now()}`);
    const tmpTemplate = `${tmpBase}.%(ext)s`;
    const flags = `--no-warnings --no-check-certificate --socket-timeout 15 --no-playlist`;

    let format;
    if (isAudio === 'true') {
        format = `-f bestaudio/best -x --audio-format mp3`;
    } else if (noWatermark === 'true') {
        format = `-f "download_addr-2/best[ext=mp4]/best"`;
    } else {
        format = `-f "best[height<=720][ext=mp4]/best[height<=720]/best"`;
    }

    const command = `yt-dlp "${cleanUrl}" ${format} ${flags} -o "${tmpTemplate}"`;

    console.log("=== DOWNLOAD-FILE ===");
    console.log("URL:", url);
    console.log("Comando:", command);

    exec(command, (error, stdout, stderr) => {
        console.log("Erro exec:", error ? error.message : "nenhum");
        console.log("stdout:", stdout);
        console.log("stderr:", stderr);

        const prefix = path.basename(tmpBase);
        let generated = null;
        try {
	    const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(prefix));
            console.log("Ficheiros encontrados:", files);
            if (files.length > 0) generated = path.join(tmpDir, files[0]);
        } catch (e) {
            console.log("Erro ao procurar ficheiro:", e.message);
        }

        if (!generated || !fs.existsSync(generated)) {
            console.log("FALHOU: ficheiro não gerado");
            return res.status(500).send("Erro ao gerar ficheiro");
        }

        const ext = path.extname(generated).toLowerCase();
        console.log("A servir:", generated);

        res.setHeader('Content-Type', ext === '.mp3' ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${name}"`);

        const stream = fs.createReadStream(generated);
        stream.pipe(res);
        stream.on('end', () => fs.unlink(generated, () => {}));
        stream.on('error', (e) => {
            console.log("Erro stream:", e.message);
            fs.unlink(generated, () => {});
        });
    });
});

// ROTA 3: EXTRAÇÃO DE METADADOS (Facebook, Instagram, TikTok)
app.post('/api/download', (req, res) => {
    const { url, isAudio, noWatermark } = req.body;
	// Limpa o URL — remove tudo após o primeiro espaço
    const cleanUrl = url.split(' ')[0].trim();
    if (!url) return res.status(400).json({ success: false, error: "URL vazia" });

    console.log("=== EXTRAÇÃO METADADOS ===");
    console.log("URL:", url, "isAudio:", isAudio, "noWatermark:", noWatermark);

    const cacheKey = `${isAudio ? 'audio' : 'video'}_${noWatermark ? 'nowm' : 'wm'}_${url}`;
    if (downloadCache.has(cacheKey)) {
        console.log("Cache hit!");
        return res.json(downloadCache.get(cacheKey));
    }

    const isTikTok = /tiktok\.com/i.test(url);
    const flags = `--no-playlist --no-warnings --no-check-certificate --socket-timeout 10`;

    let format;
    if (isAudio) {
        format = `-f bestaudio`;
    } else if (isTikTok && noWatermark) {
        format = `-f "download_addr-2/best[ext=mp4]/best"`;
    } else {
        format = `-f "best[height<=720][ext=mp4]/best[height<=720]/best"`;
    }

    const command = `yt-dlp "${cleanUrl}" -j ${format} ${flags}`;
    console.log("Comando:", command);

    exec(command, (error, stdout, stderr) => {
        console.log("Erro exec:", error ? error.message : "nenhum");
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
            console.log("Erro JSON parse:", e.message);
            res.status(500).json({ success: false, error: "Erro no processamento" });
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`SocialDL rodando em http://localhost:${PORT}`));
