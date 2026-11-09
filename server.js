const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const Barba = require('./public/common.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3001;

// ========== MIDDLEWARE ==========
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ========== DISCO PERSISTENTE ==========
// No Render, /var/data só persiste entre deploys se houver um Disk montado nesse caminho.
// Se a pasta não puder ser criada, usa a pasta do projeto (que é zerada a cada deploy).
function escolherPastaDados() {
    const desejada = process.env.DATA_DIR || (process.env.RENDER ? '/var/data' : __dirname);
    try {
        fs.mkdirSync(desejada, { recursive: true });
        fs.accessSync(desejada, fs.constants.W_OK);
        return desejada;
    } catch (error) {
        console.error(`⚠️ Sem acesso a ${desejada} (${error.message}). Usando ${__dirname}`);
        return __dirname;
    }
}

const DATA_DIR = escolherPastaDados();
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 30;

fs.mkdirSync(BACKUP_DIR, { recursive: true });

console.log(`📁 Diretório de dados: ${DATA_DIR}`);
console.log(`📄 Arquivo de dados: ${DATA_FILE}`);

// ========== FUNÇÕES DE PERSISTÊNCIA ==========
function lerJSON(arquivo) {
    const conteudo = fs.readFileSync(arquivo, 'utf8');
    if (!conteudo || conteudo.trim() === '') return null;
    return JSON.parse(conteudo);
}

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const dados = lerJSON(DATA_FILE);
            if (dados) return Barba.normalizarDados(dados);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error.message);
        // Arquivo corrompido: tenta o backup mais recente
        const ultimo = listarBackups()[0];
        if (ultimo) {
            console.log(`♻️ Recuperando do backup ${ultimo.arquivo}`);
            return Barba.normalizarDados(lerJSON(path.join(BACKUP_DIR, ultimo.arquivo)));
        }
    }
    return Barba.normalizarDados(null);
}

function saveData(data) {
    try {
        // Escrita atômica: grava num temporário e renomeia
        const tmp = DATA_FILE + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
        fs.renameSync(tmp, DATA_FILE);
        salvarBackupDiario(data);
        console.log(`💾 Dados salvos - Wagner: ${data.Wagner.length}, Gabriel: ${data.Gabriel.length}`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error.message);
        return false;
    }
}

// Junta o que chegou com o que já existe. Um aparelho com dados antigos ou vazios
// nunca apaga o histórico; exclusões chegam pela lista "removidos".
function mesclarESalvar(recebido) {
    const mesclado = Barba.mesclarDados(loadData(), recebido);
    return saveData(mesclado) ? mesclado : null;
}

// ========== BACKUPS ==========
function salvarBackupDiario(data) {
    if (Barba.totalRegistros(data) === 0) return;
    const arquivo = path.join(BACKUP_DIR, `data-${Barba.hoje()}.json`);
    fs.writeFileSync(arquivo, JSON.stringify(data));
    listarBackups().slice(MAX_BACKUPS).forEach(b => fs.unlinkSync(path.join(BACKUP_DIR, b.arquivo)));
}

function listarBackups() {
    try {
        return fs.readdirSync(BACKUP_DIR)
            .filter(f => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(f))
            .sort()
            .reverse()
            .map(arquivo => ({ arquivo, data: arquivo.substring(5, 15) }));
    } catch (error) {
        return [];
    }
}

function transmitir(payload, exceto) {
    const texto = JSON.stringify(payload);
    wss.clients.forEach(client => {
        if (client !== exceto && client.readyState === WebSocket.OPEN) client.send(texto);
    });
}

// ========== WEBSOCKET ==========
wss.on('connection', function connection(ws) {
    const clientCount = wss.clients.size;
    console.log(`📱 Novo dispositivo conectado! Total: ${clientCount}`);
    
    const dados = loadData();
    ws.send(JSON.stringify({ type: 'dados_iniciais', data: dados }));
    
    ws.on('message', function message(data) {
        try {
            const message = JSON.parse(data);
            console.log(`📥 Mensagem: ${message.type}`);
            
            if (message.type === 'sync_request') {
                const dadosAtuais = loadData();
                ws.send(JSON.stringify({ type: 'sync_completo', data: dadosAtuais }));
            }
            
            // Aparelhos com versão antiga da página ainda mandam a base inteira por aqui
            if ((message.type === 'update_data' || message.type === 'sync_completo') && message.data) {
                const mesclado = mesclarESalvar(message.data);
                if (mesclado) transmitir({ type: 'sync_completo', data: mesclado });
            }
        } catch (error) {
            console.error('❌ Erro WebSocket:', error.message);
        }
    });
    
    ws.on('close', () => {
        console.log(`📱 Dispositivo desconectado! Restam: ${wss.clients.size}`);
    });
});

// ========== ROTAS API ==========
app.get('/api/data', (req, res) => {
    const dados = loadData();
    res.json({ success: true, data: dados, info: { servicos: Barba.totalServicos(dados) } });
});

app.post('/api/save', (req, res) => {
    const { data } = req.body;

    if (!data || typeof data !== 'object') {
        return res.status(400).json({ success: false, error: 'Dados não fornecidos' });
    }

    const mesclado = mesclarESalvar(data);
    if (!mesclado) return res.status(500).json({ success: false });
    transmitir({ type: 'sync_completo', data: mesclado });
    res.json({ success: true, data: mesclado });
});

app.get('/api/status-dados', (req, res) => {
    const dados = loadData();
    res.json({
        success: true,
        servicos: Barba.totalServicos(dados),
        registros: Barba.totalRegistros(dados),
        backups: listarBackups().length,
        persistente: DATA_DIR !== __dirname
    });
});

app.get('/api/backups', (req, res) => {
    const backups = listarBackups().map(b => {
        try {
            return { ...b, servicos: Barba.totalServicos(lerJSON(path.join(BACKUP_DIR, b.arquivo))) };
        } catch (error) {
            return { ...b, servicos: 0 };
        }
    });
    res.json({ success: true, backups });
});

app.post('/api/restaurar-backup', (req, res) => {
    const arquivo = String(req.body.arquivo || '');
    if (!listarBackups().some(b => b.arquivo === arquivo)) {
        return res.status(404).json({ success: false, error: 'Backup não encontrado' });
    }
    try {
        const mesclado = mesclarESalvar(lerJSON(path.join(BACKUP_DIR, arquivo)));
        if (!mesclado) throw new Error('Falha ao salvar');
        transmitir({ type: 'sync_completo', data: mesclado });
        res.json({ success: true, data: mesclado });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/backup', (req, res) => {
    res.setHeader('Content-Disposition', `attachment; filename="barbapro-backup-${Barba.hoje()}.json"`);
    res.json(loadData());
});

app.get('/api/total-combinado', (req, res) => {
    const data = loadData();
    const hoje = Barba.hoje();
    
    const wagnerHoje = data.Wagner?.filter(s => s.data === hoje) || [];
    const gabrielHoje = data.Gabriel?.filter(s => s.data === hoje) || [];
    
    const totalWagner = wagnerHoje.reduce((sum, s) => sum + (s.valor || 0), 0);
    const totalGabriel = gabrielHoje.reduce((sum, s) => sum + (s.valor || 0), 0);
    
    res.json({
        success: true,
        hoje: {
            Wagner: { quantidade: wagnerHoje.length, total: totalWagner },
            Gabriel: { quantidade: gabrielHoje.length, total: totalGabriel },
            combinado: totalWagner + totalGabriel
        }
    });
});

app.get('/status', (req, res) => {
    const dados = loadData();
    res.json({
        success: true,
        status: 'online',
        port: PORT,
        clientesWebSocket: wss.clients.size,
        disco: DATA_DIR,
        dados: {
            wagner: dados.Wagner?.length || 0,
            gabriel: dados.Gabriel?.length || 0,
            despesas: dados.despesas?.length || 0,
            mensalistas: dados.mensalistas?.length || 0
        }
    });
});

// ========== ROTAS PRINCIPAIS ==========
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ========== INICIAR SERVIDOR ==========
server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         🔥 BARBAPRO DUO - SERVIDOR ATIVO! 🔥               ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║   📁 DISCO PERSISTENTE: ${DATA_DIR.padEnd(36)}║`);
    console.log(`║   📄 ARQUIVO: ${DATA_FILE.padEnd(36)}║`);
    console.log(`║   🌐 SERVIDOR: http://localhost:${PORT}                      ║`);
    console.log(`║   📊 DASHBOARD: http://localhost:${PORT}/dashboard           ║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║   ✅ LIMITE DE PAYLOAD: 50MB                               ║');
    console.log(`║   ${DATA_DIR !== __dirname ? '✅ DISCO PERSISTENTE ATIVO   ' : '⚠️ SEM DISCO PERSISTENTE     '}                           ║`);
    console.log('║   ✅ WEBSOCKET ATIVO                                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
});