const express = require('express');
const { exec, execSync } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

// ========== SISTEMA DE CONTAGEM DE ACESSOS ==========
const VISITS_FILE = path.join(__dirname, 'visits.json');
const ADMIN_SECRET = 'admin-view';

if (!fs.existsSync(VISITS_FILE)) {
  fs.writeFileSync(VISITS_FILE, JSON.stringify({ totalVisits: 0, visits: [] }));
  console.log('Arquivo visits.json criado');
}

app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    try {
      const visitsData = JSON.parse(fs.readFileSync(VISITS_FILE, 'utf8'));
      visitsData.totalVisits += 1;
      visitsData.visits.push({
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress || 'desconhecido',
        userAgent: req.get('user-agent') || 'desconhecido',
        path: req.path
      });
      fs.writeFileSync(VISITS_FILE, JSON.stringify(visitsData, null, 2));
      console.log(`✓ Acesso registrado! Total: ${visitsData.totalVisits}`);
    } catch (err) {
      console.log('Erro ao registrar visita:', err.message);
    }
  }
  next();
});

app.use((req, res, next) => {
    if (req.url.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
    }
    next();
});

app.use(express.static('public'));

app.get(`/${ADMIN_SECRET}`, (req, res) => {
  try {
    const visitsData = JSON.parse(fs.readFileSync(VISITS_FILE, 'utf8'));
    const html = `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SocialDL - Estatísticas</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #f5f3ff, #e9e4ff); min-height: 100vh; padding: 40px 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { color: #7037e5; font-size: 28px; margin-bottom: 10px; }
        .header p { color: #666; }
        .stats-box { background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); margin-bottom: 30px; }
        .stat { text-align: center; padding: 20px; }
        .stat-number { font-size: 48px; font-weight: 700; color: #7037e5; }
        .stat-label { font-size: 16px; color: #666; margin-top: 10px; }
        .visits-list { background: white; border-radius: 15px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); max-height: 500px; overflow-y: auto; }
        .visit-item { padding: 15px; border-bottom: 1px solid #eee; font-size: 13px; color: #666; }
        .visit-item:last-child { border-bottom: none; }
        .visit-time { color: #7037e5; font-weight: 600; }
        .reset-btn { background: #ef4444; color: white; border: none; padding: 12px 24px; border-radius: 10px; cursor: pointer; margin-top: 20px; font-weight: 600; }
        .reset-btn:hover { background: #dc2626; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Estatísticas do SocialDL</h1>
          <p>Painel secreto - Não compartilhe esta URL!</p>
        </div>
        
        <div class="stats-box">
          <div class="stat">
            <div class="stat-number">${visitsData.totalVisits}</div>
            <div class="stat-label">Total de Acessos</div>
          </div>
        </div>

        <div class="visits-list">
          <h3 style="padding: 0 0 15px 0; color: #7037e5;">Últimos 50 Acessos:</h3>
          ${visitsData.visits.slice(-50).reverse().map(v => `
            <div class="visit-item">
              <span class="visit-time">${new Date(v.timestamp).toLocaleString('pt-BR')}</span> - IP: ${v.ip}
            </div>
          `).join('')}
        </div>

        <button class="reset-btn" onclick="if(confirm('Tem certeza que quer resetar as estatísticas?')) { fetch('/${ADMIN_SECRET}/reset', {method: 'POST'}).then(() => location.reload()); }">Resetar Estatísticas</button>
      </div>
    </body>
    </html>
    `;
    res.send(html);
  } catch (err) {
    res.status(500).send('Erro ao carregar estatísticas: ' + err.message);
  }
});

app.post(`/${ADMIN_SECRET}/reset`, (req, res) => {
  try {
    fs.writeFileSync(VISITS_FILE, JSON.stringify({ totalVisits: 0, visits: [] }));
    console.log('Estatísticas resetadas');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

const downloadCache = new Map();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Verifica yt-dlp local ao iniciar
try {
    execSync('./yt-dlp --version', { stdio: 'ignore' });
    console.log("yt-dlp local encontrado e pronto.");
} catch (e) {
    console.log("Atenção: ./yt-dlp não encontrado ou sem permissão.");
}

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

    const command = `./yt-dlp "${cleanUrl}" ${format} ${flags} -o "${tmpTemplate}"`;
    console.log("=== YT-DLP ===");
    console.log("Comando:", command);

    exec(command, (error, stdout, stderr) => {
        const prefix = path.basename(tmpBase);
        let generated = null;
        try {
            const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(prefix));
            if (files.length > 0) generated = path.join(tmpDir, files[0]);
        } catch (e) { console.log("Erro readdirSync:", e.message); }

        if (!generated || !fs.existsSync(generated)) {
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

// Rotas API mantidas conforme original...
app.get('/api/thumbnail', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send("URL ausente");
    try {
        const response = await axios({ method: 'get', url, responseType: 'stream', headers: { 'User-Agent': UA } });
        res.setHeader('Content-Type', 'image/jpeg');
        response.data.pipe(res);
    } catch (error) { res.status(500).send("Erro thumbnail"); }
});

app.get('/api/proxy-download', async (req, res) => {
    const { url, name } = req.query;
    if (!url) return res.status(400).send("URL ausente");
    const isCDN = url.includes('cdninstagram.com') || url.includes('fbcdn.net') || url.includes('facebook.com/video');
    if (isCDN) {
        const response = await axios({ method: 'get', url, responseType: 'stream', headers: { 'User-Agent': UA } });
        res.setHeader('Content-Type', name.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
        response.data.pipe(res);
    } else {
        dispararYtDlp(res, url, name, name.endsWith('.mp3'), false);
    }
});

app.get('/api/download-file', (req, res) => {
    const { url, name, isAudio, noWatermark } = req.query;
    dispararYtDlp(res, url, name, isAudio === 'true', noWatermark === 'true');
});

app.post('/api/download', (req, res) => {
    const { url, isAudio, noWatermark } = req.body;
    const command = `./yt-dlp "${url.split(' ')[0].trim()}" -j`;
    exec(command, (error, stdout) => {
        if (error) return res.status(500).json({ error: "Falha" });
        const info = JSON.parse(stdout);
        res.json({ success: true, title: info.title, url: info.url });
    });
});

app.get('/api/check', (req, res) => {
    exec('./yt-dlp --version', (error, stdout) => { res.json({ resultado: stdout }); });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SocialDL rodando na porta ${PORT}`));

