const input           = document.getElementById("video-url");
const downloadBtn     = document.getElementById("main-download");
const resultContainer = document.getElementById("result-container");
const pasteBtn        = document.getElementById("paste-btn");
const menuBtn         = document.querySelector('.menu-btn');
const menu            = document.querySelector('.menu');
const menuIcon        = menuBtn.querySelector('i');
const switchBtns      = document.querySelectorAll('.switch button');
const switchBox       = document.querySelector('.switch');

const redes = {
  facebook:  { texto: "Baixar vídeos do Facebook",  icon: "bi-facebook",  regex: /(facebook\.com|fb\.watch)/i },
  instagram: { texto: "Baixar vídeos do Instagram", icon: "bi-instagram", regex: /instagram\.com/i },
  tiktok:    { texto: "Baixar vídeos do TikTok",    icon: "bi-tiktok",    regex: /(tiktok\.com|vm\.tiktok\.com)/i }
};
const nomesRedes = ["facebook", "instagram", "tiktok"];

downloadBtn.addEventListener("click", iniciarDownload);

pasteBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    input.value = text;
    detectarLink();
  } catch (err) {
    console.error("Erro ao colar:", err);
  }
});

menuBtn.addEventListener('click', () => {
  menu.classList.toggle('active');
  menuIcon.classList.toggle('bi-list');
  menuIcon.classList.toggle('bi-x-lg');
});

document.addEventListener('click', (e) => {
  if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
    menu.classList.remove('active');
    menuIcon.classList.add('bi-list');
    menuIcon.classList.remove('bi-x-lg');
  }
});

switchBtns.forEach((btn, index) => {
  btn.addEventListener('click', () => trocarRede(index, btn));
});

input.addEventListener("input", detectarLink);

function redeAtiva() {
  const index = [...switchBtns].findIndex(btn => btn.classList.contains('active'));
  return nomesRedes[index];
}

function trocarRede(index, btn) {
  switchBox.classList.remove('facebook', 'instagram', 'tiktok');
  switchBox.classList.add(nomesRedes[index]);
  switchBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const rede = redes[nomesRedes[index]];
  document.getElementById("social-text").textContent = rede.texto;
  document.getElementById("social-icon").className = `bi ${rede.icon}`;

  document.getElementById("tiktok-options").style.display = "none";
  resultContainer.style.display = "none";

  detectarLink();
}

function detectarLink() {
  const url = input.value.trim();
  const redeAtual = redes[redeAtiva()];

  if (!url) {
    input.parentElement.style.boxShadow = "none";
    return;
  }

  input.parentElement.style.boxShadow = redeAtual.regex.test(url)
    ? "0 0 0 2px #22c55e"
    : "0 0 0 2px #ef4444";
}

function processandoUI(estado) {
  downloadBtn.disabled = estado;
  downloadBtn.textContent = estado ? "A extrair..." : "Baixar";
}

async function iniciarDownload() {
  const url = input.value.trim();
  if (!url) return alert("Cole o link primeiro!");

  const rede = redeAtiva();
  processandoUI(true);
  resultContainer.style.display = "none";
  document.getElementById("tiktok-options").style.display = "none";

  const data = await fetchMetadados(url);

  if (data && data.success) {
    if (rede === 'tiktok') {
      const thumbTiktok = document.getElementById("thumb-tiktok");
      // Linha 104-106 — TikTok
if (data.thumbnail) {
    thumbTiktok.src = `/api/thumbnail?url=${encodeURIComponent(data.thumbnail)}`;
    thumbTiktok.style.display = "block";
}else {
        thumbTiktok.style.display = "none";
      }
      document.getElementById("res-title-tiktok").textContent = data.title;
      document.getElementById("tiktok-options").style.display = "block";

      // COM marca d'água — download directo via yt-dlp
      document.getElementById("btn-tiktok-wm").onclick = () => {
        dispararDownloadDireto(url, data.suggestedName, false, false);
      };

      // SEM marca d'água — download directo via yt-dlp com formato especial
      document.getElementById("btn-tiktok-nowm").onclick = async () => {
        const btn = document.getElementById("btn-tiktok-nowm");
        btn.textContent = "A remover marca...";
        btn.disabled = true;
        dispararDownloadDireto(url, data.suggestedName, false, true);
        setTimeout(() => {
          btn.textContent = "Sem Marca d'Água";
          btn.disabled = false;
        }, 3000);
      };

      // ÁUDIO
      document.getElementById("btn-tiktok-audio").onclick = async () => {
        const btn = document.getElementById("btn-tiktok-audio");
        btn.textContent = "Extraindo...";
        btn.disabled = true;
        dispararDownloadDireto(url, data.suggestedName, true, false);
        setTimeout(() => {
          btn.textContent = "Áudio (MP3)";
          btn.disabled = false;
        }, 3000);
      };

    } else {
      exibirResultado(data, url);
    }
  } else {
    alert("Não foi possível extrair o vídeo. Verifica se o link é válido e público.");
  }

  processandoUI(false);
}

async function fetchMetadados(url) {
  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, isAudio: false, noWatermark: false })
    });
    return await res.json();
  } catch (err) {
    return null;
  }
}

function exibirResultado(data, originalUrl) {
  document.getElementById("thumb-img").src = data.thumbnail
    ? `/api/thumbnail?url=${encodeURIComponent(data.thumbnail)}`
    : '';
  document.getElementById("res-title").textContent = data.title;
  resultContainer.style.display = "block";

  document.getElementById("btn-video").onclick = () => {
    dispararDownloadProxy(data.url, data.suggestedName, false);
  };

  document.getElementById("btn-audio").onclick = async () => {
    const btnAudio = document.getElementById("btn-audio");
    btnAudio.textContent = "Convertendo...";
    btnAudio.disabled = true;

    const audioData = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: originalUrl, isAudio: true, noWatermark: false })
    }).then(r => r.json()).catch(() => null);

    if (audioData && audioData.success) {
      dispararDownloadProxy(audioData.url, audioData.suggestedName, true);
    } else {
      alert("Erro ao converter para MP3.");
    }

    btnAudio.textContent = "Áudio (MP3)";
    btnAudio.disabled = false;
  };
}

// Para Facebook/Instagram — proxy directo da URL da CDN
function dispararDownloadProxy(url, baseName, isAudio) {
  const ext = isAudio ? 'mp3' : 'mp4';
  window.location.href = `/api/proxy-download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(baseName + '.' + ext)}`;
}

// Para TikTok — yt-dlp faz o download completo no servidor
function dispararDownloadDireto(url, baseName, isAudio, noWatermark) {
  const ext = isAudio ? 'mp3' : 'mp4';
  window.location.href = `/api/download-file?url=${encodeURIComponent(url)}&name=${encodeURIComponent(baseName + '.' + ext)}&isAudio=${isAudio}&noWatermark=${noWatermark}`;
}
