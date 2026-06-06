# 📱 SocialDL - Download de Vídeos das Redes Sociais

> **A ferramenta definitiva para guardar seus momentos favoritos das redes sociais**

<div align="center">

![Badge](https://img.shields.io/badge/Status-Online-brightgreen?style=flat-square)
![Badge](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Badge](https://img.shields.io/badge/Made%20with-Node.js-green?style=flat-square)

[🚀 Acessar Agora](#-como-acessar) • [📚 Como Usar](#-como-usar) • [🛠️ Tecnologias](#-tecnologias) • [📦 Deploy](#-deploy)

</div>

---

## ✨ O que é SocialDL?

**SocialDL** é uma aplicação web moderna que permite **baixar vídeos de alta qualidade** do Facebook, Instagram e TikTok em apenas alguns cliques. Com uma interface intuitiva e rápida, você pode guardar seus momentos favoritos em qualquer dispositivo.

### 🎯 Características Principais

- ✅ **Suporte a Múltiplas Plataformas** - Facebook, Instagram e TikTok
- ✨ **Interface Intuitiva e Moderna** - Design responsivo e elegante
- ⚡ **Rápido e Eficiente** - Processamento otimizado
- 📲 **Funciona Offline** - Interface disponível sem conexão
- 🎨 **PWA Instalável** - Instale como app nativo no celular
- 🔒 **Seguro** - Nenhum dado armazenado no servidor
- 📱 **Compatível** - Android, iOS, Windows, Mac e Linux

---

## 🚀 Como Acessar

### Online
Acesse diretamente em: **[https://social-downloader-zta7.onrender.com](https://social-downloader-zta7.onrender.com)**

### Como Instalar como App (PWA)

#### 📱 No Android (Chrome):
1. Abra o site no **Chrome**
2. Clique no menu **⋮** (três pontinhos)
3. Selecione **"Instalar app"**
4. Pronto! O app estará na sua tela inicial

#### 📱 No iPhone (Safari):
1. Abra o site no **Safari**
2. Clique em **Compartilhar** (seta para cima)
3. Selecione **"Adicionar à Tela de Início"**
4. Pronto! O app estará na sua tela inicial

### 🎁 Benefícios de Instalar como App:
- ⚡ **Acesso mais rápido** - Atalho direto na tela inicial
- 💾 **Funciona offline** - Interface disponível sem internet
- 🎯 **Sem barra do navegador** - Experiência de app nativo
- 📲 **Mais prático** - Acesso instantâneo

---

## 📖 Como Usar

### Passo 1️⃣: Cole o Link
Cole o link do vídeo do Facebook, Instagram ou TikTok que deseja baixar

### Passo 2️⃣: Clique em Baixar
Clique no botão **"Baixar"** para processar o vídeo

### Passo 3️⃣: Escolha o Formato
Selecione o formato desejado:
- **MP4** - Vídeo com áudio (recomendado)
- **MP3** - Apenas áudio

### Passo 4️⃣: Pronto!
O download começará automaticamente em seu dispositivo

---

## 🛠️ Tecnologias

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Design responsivo e moderno
- **JavaScript** - Interatividade e lógica
- **PWA** - Instalável como app nativo

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **yt-dlp** - Download de vídeos
- **FFmpeg** - Processamento de mídia

### Hospedagem
- **Render** - Deploy e hosting
- **GitHub** - Versionamento de código

---

## 💻 Desenvolvimento Local

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Git

### Instalação

```bash
# Clone o repositório
git clone https://github.com/ribeiro-domingos19/Social-Downloader.git
cd Social-Downloader

# Instale as dependências
npm install

# Inicie o servidor
npm start
```

Acesse em: **http://localhost:3000**

### Estrutura do Projeto

```
Social-Downloader/
├── public/              # Arquivos estáticos
│   ├── index.html       # Página principal
│   ├── styles.css       # Estilos
│   └── script.js        # JavaScript
├── src/                 # Código do servidor
│   └── server.js        # Servidor Node.js
├── package.json         # Dependências
└── README.md           # Este arquivo
```

---

## 🚀 Deploy

### Deploy Automático (Recomendado)

Este projeto está configurado para deploy automático no Render:

```bash
# 1. Edite o código
nano public/index.html

# 2. Commit suas mudanças
git add .
git commit -m "sua mensagem"

# 3. Deploy automático com script
node deploy-render-auto.js
```

O script automaticamente:
- ✅ Faz git push
- ✅ Aguarda sincronização
- ✅ Inicia deploy na Render

### Deploy Manual

```bash
# Apenas git push
git push origin main

# Render detectará e fará deploy automaticamente
```

---

## 📊 Performance

- ⚡ **Tempo de Download** - Varia conforme tamanho do vídeo
- 🔄 **Processamento** - Otimizado para máxima velocidade
- 📈 **Uptime** - 99.9% de disponibilidade
- 🌍 **Global** - Servidores distribuídos

---

## 🔒 Privacidade e Segurança

- 🔐 **Sem Rastreamento** - Não coletamos dados pessoais
- 📵 **Sem Cookies** - Funcionamento sem cookies desnecessários
- 🗑️ **Sem Armazenamento** - Vídeos não são armazenados
- ✅ **HTTPS** - Conexão criptografada

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Se encontrar bugs ou tiver sugestões:

1. Abra uma [Issue](https://github.com/ribeiro-domingos19/Social-Downloader/issues)
2. Faça um [Pull Request](https://github.com/ribeiro-domingos19/Social-Downloader/pulls)
3. Compartilhe feedback

---

## 📝 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## ⭐ Dê uma Estrela!

Se gostou do projeto, considere dar uma ⭐ no GitHub!

```bash
git star ribeiro-domingos19/Social-Downloader
```

---

## 📞 Suporte

Encontrou algum problema?

- 📧 **Email**: [contato@socialdl.com](mailto:contato@socialdl.com)
- 🐛 **Reportar Bug**: [GitHub Issues](https://github.com/ribeiro-domingos19/Social-Downloader/issues)
- 💬 **Discussões**: [GitHub Discussions](https://github.com/ribeiro-domingos19/Social-Downloader/discussions)

---

## 🎉 Agradecimentos

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Engine de download
- [FFmpeg](https://ffmpeg.org/) - Processamento de mídia
- [Express.js](https://expressjs.com/) - Framework web
- [Render](https://render.com/) - Hospedagem

---

<div align="center">

### Feito com ❤️ por [Ribeiro Domingos](https://github.com/ribeiro-domingos19)

**© 2026 SocialDL - Todos os direitos reservados**

⬆️ [Voltar ao Topo](#-socialdl---download-de-vídeos-das-redes-sociais)

</div>

