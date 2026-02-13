const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivo para persistência de dados
const DATA_FILE = path.join(__dirname, 'data.json');

// ===================== FUNÇÃO PARA CRIAR DADOS NOVOS E LIMPOS =====================
function criarDadosNovos() {
    const dadosNovos = {
        Gabriel: [],
        Wagner: [],
        despesas: [],
        mensalistas: [],
        config: {
            pin: '1234',
            whatsapp: '11974065186',
            corte: 28,
            barba: 15,
            combo: 40,
            orcamentoDespesas: 1500,
            notificacoesAtivas: true,
            diasAlerta: 3
        }
    };
    
    try {
        // Se o arquivo existir, DELETA ele primeiro
        if (fs.existsSync(DATA_FILE)) {
            fs.unlinkSync(DATA_FILE);
            console.log('🗑️ Arquivo antigo deletado');
        }
        
        // Cria arquivo NOVO com dados LIMPOS
        fs.writeFileSync(DATA_FILE, JSON.stringify(dadosNovos, null, 2));
        console.log('✅ Arquivo NOVO criado com dados ZERADOS');
    } catch (error) {
        console.error('❌ Erro ao criar arquivo:', error);
    }
    
    return dadosNovos;
}

// ===================== CARREGAR DADOS =====================
function loadData() {
    try {
        // Verifica se o arquivo existe
        if (fs.existsSync(DATA_FILE)) {
            const conteudo = fs.readFileSync(DATA_FILE, 'utf8');
            
            // Se o arquivo estiver vazio, cria novo
            if (!conteudo || conteudo.trim() === '') {
                console.log('⚠️ Arquivo vazio, criando novo...');
                return criarDadosNovos();
            }
            
            // Tenta fazer o parse do JSON
            try {
                const data = JSON.parse(conteudo);
                
                // Verifica se a estrutura está correta
                if (!data.Gabriel || !data.Wagner || !data.despesas || !data.mensalistas || !data.config) {
                    console.log('⚠️ Estrutura corrompida, recriando...');
                    return criarDadosNovos();
                }
                
                console.log('✅ Dados carregados do servidor');
                return data;
            } catch (parseError) {
                console.log('⚠️ Arquivo corrompido, recriando...');
                return criarDadosNovos();
            }
        } else {
            // Arquivo não existe, cria novo
            console.log('📝 Arquivo não existe, criando novo...');
            return criarDadosNovos();
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        return criarDadosNovos();
    }
}

// ===================== SALVAR DADOS =====================
function saveData(data) {
    try {
        // Garante que os arrays existem
        if (!data.Gabriel) data.Gabriel = [];
        if (!data.Wagner) data.Wagner = [];
        if (!data.despesas) data.despesas = [];
        if (!data.mensalistas) data.mensalistas = [];
        if (!data.config) {
            data.config = {
                pin: '1234',
                whatsapp: '11974065186',
                corte: 28,
                barba: 15,
                combo: 40,
                orcamentoDespesas: 1500,
                notificacoesAtivas: true,
                diasAlerta: 3
            };
        }
        
        // Salva o arquivo
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('💾 Dados salvos no servidor');
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        return false;
    }
}

// ===================== ROTA PARA RESETAR SISTEMA (NOVA) =====================
app.get('/resetar-sistema', (req, res) => {
    try {
        const dadosNovos = criarDadosNovos();
        
        // Notificar todos os clientes
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'sync_completo',
                    data: dadosNovos
                }));
            }
        });
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>🔄 Sistema Resetado - BarbaPRO</title>
                <style>
                    body {
                        font-family: 'Segoe UI', sans-serif;
                        background: linear-gradient(135deg, #0a0a0a 0%, #16213e 100%);
                        margin: 0;
                        padding: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        color: #fff;
                    }
                    .container {
                        background: rgba(255,255,255,0.05);
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        padding: 40px;
                        max-width: 600px;
                        margin: 20px;
                        text-align: center;
                        border: 1px solid rgba(255,170,0,0.3);
                    }
                    h1 {
                        color: #ffaa00;
                        font-size: 2.5em;
                        margin-bottom: 20px;
                    }
                    .emoji {
                        font-size: 4em;
                        margin-bottom: 20px;
                    }
                    .stats {
                        background: rgba(255,255,255,0.03);
                        border-radius: 10px;
                        padding: 20px;
                        margin: 20px 0;
                        text-align: left;
                    }
                    .stats ul {
                        list-style: none;
                        padding: 0;
                    }
                    .stats li {
                        padding: 10px;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                        display: flex;
                        justify-content: space-between;
                    }
                    .btn {
                        background: linear-gradient(135deg, #ffaa00, #ff7733);
                        color: black;
                        border: none;
                        padding: 15px 30px;
                        font-size: 1.2em;
                        border-radius: 10px;
                        cursor: pointer;
                        margin: 10px;
                        text-decoration: none;
                        display: inline-block;
                        font-weight: 600;
                    }
                    .btn:hover {
                        transform: scale(1.05);
                    }
                    .success {
                        background: rgba(37, 211, 102, 0.2);
                        border: 1px solid #25D366;
                        color: #25D366;
                        padding: 15px;
                        border-radius: 10px;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="emoji">🔄✨</div>
                    <h1>SISTEMA RESETADO!</h1>
                    
                    <div class="success">
                        ✅ Todos os dados foram APAGADOS permanentemente!
                    </div>
                    
                    <div class="stats">
                        <h3 style="color:#ffaa00;">📊 Status Atual:</h3>
                        <ul>
                            <li><span>✂️ Gabriel:</span> <strong style="color:#fff;">0 serviços</strong></li>
                            <li><span>✂️ Wagner:</span> <strong style="color:#fff;">0 serviços</strong></li>
                            <li><span>💰 Despesas:</span> <strong style="color:#fff;">0</strong></li>
                            <li><span>📅 Mensalistas:</span> <strong style="color:#fff;">0</strong></li>
                        </ul>
                    </div>
                    
                    <a href="/" class="btn">🏠 Ir para o Sistema</a>
                    <a href="/dashboard" class="btn" style="background: linear-gradient(135deg, #3366ff, #6633ff);">📊 Dashboard</a>
                </div>
            </body>
            </html>
        `);
        
        console.log('🧹🧹🧹 SISTEMA RESETADO COM SUCESSO! 🧹🧹🧹');
    } catch (error) {
        res.status(500).send('Erro ao resetar: ' + error.message);
    }
});

// ===================== ROTA PARA VERIFICAR DADOS =====================
app.get('/verificar-dados', (req, res) => {
    const data = loadData();
    res.json({
        Gabriel: data.Gabriel.length,
        Wagner: data.Wagner.length,
        despesas: data.despesas.length,
        mensalistas: data.mensalistas.length,
        arquivo: DATA_FILE,
        status: 'Sistema 100% limpo'
    });
});

// ===================== WEBSOCKET =====================
wss.on('connection', function connection(ws) {
    console.log('📱 Novo dispositivo conectado');
    
    const dados = loadData();
    ws.send(JSON.stringify({
        type: 'dados_iniciais',
        data: dados
    }));
    
    ws.on('message', function message(data) {
        try {
            const message = JSON.parse(data);
            
            if (message.type === 'sync_request') {
                const dados = loadData();
                ws.send(JSON.stringify({
                    type: 'sync_completo',
                    data: dados
                }));
            }
            
            if (message.type === 'update_data') {
                if (saveData(message.data)) {
                    wss.clients.forEach(function each(client) {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'sync_completo',
                                data: message.data
                            }));
                        }
                    });
                }
            }
            
        } catch (error) {
            console.error('❌ Erro WebSocket:', error);
        }
    });
});

// ===================== ROTAS API =====================
app.get('/api/data', (req, res) => {
    try {
        const data = loadData();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/save', (req, res) => {
    try {
        const { data } = req.body;
        
        if (!data) {
            return res.status(400).json({ success: false, error: 'Dados não fornecidos' });
        }
        
        if (saveData(data)) {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'sync_completo',
                        data: data
                    }));
                }
            });
            res.json({ success: true, message: 'Dados salvos com sucesso' });
        } else {
            res.status(500).json({ success: false, error: 'Erro ao salvar dados' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===================== ROTAS PRINCIPAIS =====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/status', (req, res) => {
    const data = loadData();
    res.json({
        status: 'online',
        Gabriel: data.Gabriel?.length || 0,
        Wagner: data.Wagner?.length || 0,
        despesas: data.despesas?.length || 0,
        mensalistas: data.mensalistas?.length || 0
    });
});

// ===================== INICIAR SERVIDOR =====================
server.listen(PORT, '0.0.0.0', () => {
    // FORÇA a criação de dados NOVOS e LIMPOS
    const dados = criarDadosNovos();
    
    console.log(`
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║     ⚡ BARBAPRO DUO - SISTEMA 100% LIMPO! ⚡            ║
    ║                                                          ║
    ╠══════════════════════════════════════════════════════════╣
    ║                                                          ║
    ║   🔗 PORTA: ${PORT}                                         ║
    ║   ⏰ INÍCIO: ${new Date().toLocaleString('pt-BR')}           ║
    ║                                                          ║
    ║   📊 STATUS ATUAL:                                       ║
    ║   ✅ Gabriel: ${dados.Gabriel.length} serviços                             ║
    ║   ✅ Wagner: ${dados.Wagner.length} serviços                             ║
    ║   ✅ Despesas: ${dados.despesas.length}                                 ║
    ║   ✅ Mensalistas: ${dados.mensalistas.length}                             ║
    ║                                                          ║
    ╠══════════════════════════════════════════════════════════╣
    ║                                                          ║
    ║   🚀 ACESSO RÁPIDO:                                     ║
    ║   🔴 RESETAR SISTEMA: http://localhost:${PORT}/resetar-sistema  ║
    ║   📊 DASHBOARD:     http://localhost:${PORT}/dashboard        ║
    ║   🔍 VERIFICAR:     http://localhost:${PORT}/verificar-dados  ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
    `);
});