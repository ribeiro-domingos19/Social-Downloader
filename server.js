const express = require('express');
const { exec } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const downloadCache = new Map();

// Função auxiliar para definir o caminho do yt-dlp conforme o ambiente
const getYtDlpPath = () => fs.existsSync(path.join(__dirname, 'yt-dlp')) ? './yt-dlp' : 'yt-dlp';

// ROTA 1: PROXY DIRECTO — usa axios para CDNs, yt-dlp só se necessário
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
        const tmpDir = process.env.TMPDIR || process.env.HOME || '/tmp';
        const tmpBase = path.join(tmpDir, `sdl_${Date.now()}`);
        const isAudio = name.endsWith('.mp3');
        const format = isAudio
            ? `-f "bestaudio/best" -x --audio-format mp3`
            : `-f "best[height<=720][ext=mp4]/best[height<=720]/best"`;

        const flags = `--no-warnings --no-check-certificate --socket-timeout 15 --no-playlist`;
        const cleanUrl = url.split(' ')[0].trim();
        
        // Uso do caminho dinâmico
        const ytDlpPath = getYtDlpPath();
        const command = `${ytDlpPath} "${cleanUrl}" -j ${format} ${flags}`;
        
        console.log("=== PROXY-DOWNLOAD (yt-dlp) ===");
        exec(command, (error, stdout, stderr) => {
            const prefix = path.basename(tmpBase);
            let generated = null;
            try {
                const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(prefix));
                if (files.length > 0) generated = path.join(tmpDir, files[0]);
            } catch (e) { console.log(e.message); }

            if (!generated || !fs.existsSync(generated)) return res.status(500).send("Erro no download");

            res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
            const stream = fs.createReadStream(generated);
            stream.pipe(res);
            stream.on('end', () => fs.unlink(generated, () => {}));
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
            method: 'get', url, responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0...', 'Referer': referer }
        });
        res.setHeader('Content-Type', 'image/jpeg');
        response.data.pipe(res);
    } catch (error) { res.status(500).send("Erro thumbnail"); }
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

    let format = (isAudio === 'true') ? `-f bestaudio/best -x --audio-format mp3` : 
                 (noWatermark === 'true') ? `-f "download_addr-2/best[ext=mp4]/best"` : 
                 `-f "best[height<=720][ext=mp4]/best[height<=720]/best"`;

    // CORREÇÃO: Usando caminho dinâmico aqui também
    const ytDlpPath = getYtDlpPath();
    const command = `${ytDlpPath} "${cleanUrl}" ${format} ${flags} -o "${tmpTemplate}"`;

    console.log("=== DOWNLOAD-FILE (TikTok) ===");
    exec(command, (error, stdout, stderr) => {
        const prefix = path.basename(tmpBase);
        let generated = null;
        try {
            const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(prefix));
            if (files.length > 0) generated = path.join(tmpDir, files[0]);
        } catch (e) { console.log(e.message); }

        if (!generated || !fs.existsSync(generated)) return res.status(500).send("Erro ao gerar ficheiro");

        res.setHeader('Content-Type', name.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
        const stream = fs.createReadStream(generated);
        stream.pipe(res);
        stream.on('end', () => fs.unlink(generated, () => {}));
    });
});

// ROTA 3: EXTRAÇÃO DE METADADOS
app.post('/api/download', (req, res) => {
    const { url, isAudio, noWatermark } = req.body;
    const cleanUrl = url.split(' ')[0].trim();
    if (!url) return res.status(400).json({ success: false, error: "URL vazia" });

    const cacheKey = `${isAudio ? 'audio' : 'video'}_${noWatermark ? 'nowm' : 'wm'}_${url}`;
    if (downloadCache.has(cacheKey)) return res.json(downloadCache.get(cacheKey));

    const flags = `--no-playlist --no-warnings --no-check-certificate --socket-timeout 10`;
    let format = isAudio ? `-f bestaudio` : 
                 (/tiktok\.com/i.test(url) && noWatermark) ? `-f "download_addr-2/best[ext=mp4]/best"` : 
                 `-f "best[height<=720][ext=mp4]/best[height<=720]/best"`;

    const ytDlpPath = getYtDlpPath();
    const command = `${ytDlpPath} "${cleanUrl}" -j ${format} ${flags}`;

    exec(command, (error, stdout, stderr) => {
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
            downloadCache.set(cacheKey, responseData);
            setTimeout(() => downloadCache.delete(cacheKey), 600000);
            res.json(responseData);
        } catch (e) { res.status(500).json({ success: false, error: "Erro no processamento" }); }
    });
});

// PORTA DINÂMICA PARA O RENDER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SocialDL rodando na porta ${PORT}`));

