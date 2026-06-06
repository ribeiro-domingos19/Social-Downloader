#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Função para colorir texto
function log(color, text) {
  console.log(`${colors[color]}${text}${colors.reset}`);
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

// Função principal de deploy
async function deploy() {
  log('cyan', '\n🚀 Iniciando Deploy na Render...\n');

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

    log('bright', '3️⃣  Onde encontrar seus dados:');
    console.log('   Token: https://dashboard.render.com/api-tokens');
    console.log('   Service ID: Dashboard → seu serviço → Settings\n');

    process.exit(1);
  }

  log('green', '✅ Credenciais carregadas com sucesso!');
  log('blue', `📌 Service ID: ${SERVICE_ID.substring(0, 10)}...`);

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

// Executa
deploy()
  .then(() => {
    log('green', '✨ Deploy finalizando...\n');
    process.exit(0);
  })
  .catch((err) => {
    log('red', `\n💥 Falha no deploy: ${err.message}\n`);
    process.exit(1);
  });

