#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Função para colorir texto
function log(color, text) {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

// Função para aguardar
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Carrega arquivo .env
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const env = {};

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        env[key.trim()] = value.trim();
      }
    });
  }

  return env;
}

// Função para fazer git push
function gitPush() {
  log('cyan', '\n📤 Fazendo git push...\n');

  try {
    // Verifica se tem mudanças
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    
    if (status.trim()) {
      log('yellow', '⚠️  Mudanças detectadas, commitando...\n');
      
      // Se tem mudanças, precisa fazer commit
      log('red', '❌ Erro: Você tem mudanças não commitadas!\n');
      log('yellow', 'Execute antes:\n');
      console.log('   git add .');
      console.log('   git commit -m "sua mensagem"\n');
      return false;
    }

    // Faz o push
    const result = execSync('git push origin main', { encoding: 'utf-8' });
    log('green', '✅ Git push realizado com sucesso!\n');
    
    // Mostra resultado
    if (result.includes('up to date') || result.includes('Everything up-to-date')) {
      log('blue', '📌 Seu código já estava sincronizado com o GitHub.\n');
    } else {
      log('green', '📌 Mudanças enviadas para o GitHub!\n');
    }
    
    return true;
  } catch (error) {
    log('red', `❌ Erro ao fazer git push: ${error.message}\n`);
    return false;
  }
}

// Função para aguardar com visualização
async function waitWithProgress(seconds) {
  log('magenta', `⏳ Aguardando ${seconds}s para GitHub sincronizar com Render...\n`);
  
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`   ${i}s... `);
    await sleep(1000);
    process.stdout.write('\r');
  }
  
  console.log('   ✅ Pronto!\n');
}

// Função principal de deploy
async function deploy() {
  log('cyan', '\n🚀 Iniciando Deploy Automático na Render...\n');

  // Carrega variáveis
  const envVars = loadEnv();
  const RENDER_TOKEN = process.env.RENDER_TOKEN || envVars.RENDER_TOKEN;
  const SERVICE_ID = process.env.RENDER_SERVICE_ID || envVars.RENDER_SERVICE_ID;

  // Valida tokens
  if (!RENDER_TOKEN || !SERVICE_ID) {
    log('red', '❌ Erro: RENDER_TOKEN ou RENDER_SERVICE_ID não configurados!');
    log('yellow', '\n📋 Configure de uma destas formas:\n');
    
    log('bright', '1️⃣  Variáveis de ambiente:');
    console.log('   export RENDER_TOKEN=seu-token-aqui');
    console.log('   export RENDER_SERVICE_ID=seu-service-id-aqui\n');

    log('bright', '2️⃣  Arquivo .env (recomendado):');
    console.log('   Crie um arquivo .env na raiz do projeto com:\n');
    console.log('   RENDER_TOKEN=seu-token-aqui');
    console.log('   RENDER_SERVICE_ID=seu-service-id-aqui\n');

    process.exit(1);
  }

  log('green', '✅ Credenciais carregadas com sucesso!');
  log('blue', `📌 Service ID: ${SERVICE_ID.substring(0, 10)}...`);

  // PASSO 1: Git Push
  log('bright', '\n━━━ PASSO 1: Git Push ━━━');
  const pushSuccess = gitPush();
  
  if (!pushSuccess) {
    process.exit(1);
  }

  // PASSO 2: Aguarda sincronização
  log('bright', '\n━━━ PASSO 2: Aguardando Sincronização ━━━');
  await waitWithProgress(10);

  // PASSO 3: Deploy na Render
  log('bright', '\n━━━ PASSO 3: Deploy na Render ━━━\n');

  // Faz requisição ao Render
  const options = {
    hostname: 'api.render.com',
    port: 443,
    path: `/v1/services/${SERVICE_ID}/deploys`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RENDER_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (res.statusCode === 201 || res.statusCode === 200) {
            log('green', '\n✅ Deploy iniciado com sucesso!\n');
            log('bright', '📊 Informações do Deploy:');
            console.log(`   ID: ${response.id}`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Iniciado em: ${new Date(response.createdAt).toLocaleString('pt-BR')}\n`);

            log('cyan', '📍 Acompanhe em tempo real:');
            console.log(`   https://dashboard.render.com/services/${SERVICE_ID}\n`);

            log('yellow', '⏱️  Tempo estimado: 2-5 minutos\n');

            resolve(response);
          } else {
            log('red', `\n❌ Erro ao fazer deploy (${res.statusCode}):\n`);
            console.log(data);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        } catch (err) {
          log('red', '\n❌ Erro ao processar resposta:\n');
          console.log(data);
          reject(err);
        }
      });
    });

    req.on('error', (error) => {
      log('red', `\n❌ Erro de conexão: ${error.message}\n`);
      reject(error);
    });

    // Envia request vazia (deploy do main branch)
    req.write('{}');
    req.end();
  });
}

// Executa tudo
(async () => {
  try {
    await deploy();
    log('green', '✨ Deploy finalizado com sucesso!\n');
    process.exit(0);
  } catch (err) {
    log('red', `\n💥 Falha no deploy: ${err.message}\n`);
    process.exit(1);
  }
})();

