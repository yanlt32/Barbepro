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

// Contador de requisições
let requestCount = 0;
const startupTime = new Date();

// Middleware de logging
app.use((req, res, next) => {
    requestCount++;
    console.log(`📊 ${new Date().toLocaleTimeString()} - ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

// Arquivo para persistência de dados
const DATA_FILE = path.join(__dirname, 'data.json');

// Carregar dados do arquivo
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            console.log('✅ Dados carregados do servidor');
            return data;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
    }
    
    // Dados padrão
    const defaultData = {
        Gabriel: [],
        Wagner: [],
        despesas: [],
        mensalistas: [],
        config: {
            pin: '1234',
            whatsapp: '11962094589',
            corte: 28,
            barba: 15,
            combo: 40
        }
    };
    
    // Criar arquivo com dados padrão
    saveData(defaultData);
    console.log('📝 Arquivo de dados criado com configurações padrão');
    return defaultData;
}

// Salvar dados no arquivo
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('💾 Dados salvos no servidor');
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        return false;
    }
}

// Backup automático a cada hora
function criarBackup() {
    try {
        const data = loadData();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(__dirname, 'backups', `backup-${timestamp}.json`);
        
        // Criar pasta de backups se não existir
        if (!fs.existsSync(path.join(__dirname, 'backups'))) {
            fs.mkdirSync(path.join(__dirname, 'backups'), { recursive: true });
        }
        
        fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
        console.log(`💾 Backup criado: ${backupFile}`);
    } catch (error) {
        console.error('❌ Erro ao criar backup:', error);
    }
}

// WebSocket - Notificações em tempo real
wss.on('connection', function connection(ws) {
    console.log('📱 Novo dispositivo conectado');
    
    ws.on('message', function message(data) {
        try {
            const message = JSON.parse(data);
            
            if (message.type === 'novo_servico') {
                // Enviar notificação para TODOS os outros dispositivos
                wss.clients.forEach(function each(client) {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'notificacao',
                            barbeiro: message.barbeiro,
                            servico: message.servico,
                            cliente: message.cliente,
                            valor: message.valor,
                            timestamp: new Date().toLocaleTimeString('pt-BR')
                        }));
                    }
                });
            }
            
            if (message.type === 'atualizar_dashboard') {
                // Forçar atualização do dashboard em todos os dispositivos
                wss.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'atualizar'
                        }));
                    }
                });
            }
            
            if (message.type === 'sync_dados') {
                // Enviar dados atualizados para sincronização
                const dados = loadData();
                ws.send(JSON.stringify({
                    type: 'sync_completo',
                    data: dados
                }));
            }
        } catch (error) {
            console.error('❌ Erro ao processar mensagem WebSocket:', error);
        }
    });
    
    // Enviar saudação ao novo cliente
    ws.send(JSON.stringify({
        type: 'conexao',
        message: 'Conectado ao BarbaPRO Duo',
        clientes: wss.clients.size,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        online: true
    }));
    
    // Enviar dados iniciais
    const dados = loadData();
    ws.send(JSON.stringify({
        type: 'dados_iniciais',
        data: dados
    }));
});

// Função para enviar notificação
function enviarNotificacao(barbeiro, servico, cliente, valor) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'notificacao',
                barbeiro: barbeiro,
                servico: servico,
                cliente: cliente,
                valor: valor,
                timestamp: new Date().toLocaleTimeString('pt-BR')
            }));
        }
    });
}

// ===================== ROTAS DE KEEP-ALIVE =====================

// 1. ROTA PING SIMPLES (para cron-job)
app.get('/ping', (req, res) => {
    const now = new Date();
    console.log(`✅ Ping recebido às ${now.toLocaleTimeString('pt-BR')}`);
    
    res.json({
        status: 'online',
        service: 'BarbaPRO Duo - Sistema de Barbearia',
        timestamp: now.toISOString(),
        uptime: Math.floor(process.uptime()),
        requests: requestCount,
        websocket_clients: wss.clients.size,
        message: 'BarbaPRO Duo online e respondendo'
    });
});

// 2. ROTA HEALTH CHECK DETALHADO
app.get('/health', (req, res) => {
    const memory = process.memoryUsage();
    const data = loadData();
    
    res.json({
        status: 'healthy',
        app: 'BarbaPRO Duo - Sistema de Barbearia',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        startup: startupTime.toISOString(),
        requests: requestCount,
        
        // Dados da barbearia
        barbearia: {
            total_servicos: (data.Gabriel?.length || 0) + (data.Wagner?.length || 0),
            Gabriel: data.Gabriel?.length || 0,
            Wagner: data.Wagner?.length || 0,
            despesas: data.despesas?.length || 0,
            mensalistas: data.mensalistas?.length || 0
        },
        
        // Sistema
        memory: {
            rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`
        },
        
        websocket: {
            connected_clients: wss.clients.size,
            status: 'ativo'
        },
        
        node: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV || 'development',
        port: PORT
    });
});

// 3. ROTA STATUS PARA VERIFICAÇÃO MANUAL
app.get('/status', (req, res) => {
    const data = loadData();
    const totalServicos = (data.Gabriel?.length || 0) + (data.Wagner?.length || 0);
    const totalValor = calcularTotalServicos(data);
    
    res.json({
        online: true,
        service: 'BarbaPRO Duo',
        uptime: `${Math.floor(process.uptime() / 60)} minutos`,
        last_access: new Date().toLocaleString('pt-BR'),
        
        // Estatísticas da barbearia
        statistics: {
            total_services: totalServicos,
            total_value: `R$ ${totalValor.toFixed(2)}`,
            Gabriel_services: data.Gabriel?.length || 0,
            Wagner_services: data.Wagner?.length || 0,
            expenses: data.despesas?.length || 0,
            monthly_clients: data.mensalistas?.length || 0
        },
        
        // Configurações
        config: data.config || {},
        
        // Endpoints disponíveis
        endpoints: {
            app: '/',
            dashboard: '/dashboard',
            ping: '/ping (para cron-job)',
            health: '/health',
            api_data: '/api/data',
            save_data: '/api/save (POST)',
            delete_mensalista: '/api/mensalista/delete (POST)'
        },
        
        // Para cron-job
        keep_alive: {
            recommended_url: 'https://SEU-APP.onrender.com/ping',
            recommended_interval: '14 minutos',
            note: 'Configure no cron-job.org para manter online'
        }
    });
});

// 4. ROTA SUPER SIMPLES (apenas "OK")
app.get('/up', (req, res) => {
    res.send('OK');
});

// Função auxiliar para calcular total
function calcularTotalServicos(data) {
    let total = 0;
    
    // Somar serviços do Gabriel
    if (data.Gabriel) {
        data.Gabriel.forEach(servico => {
            total += parseFloat(servico.valor) || 0;
        });
    }
    
    // Somar serviços do Wagner
    if (data.Wagner) {
        data.Wagner.forEach(servico => {
            total += parseFloat(servico.valor) || 0;
        });
    }
    
    return total;
}

// ===================== ROTAS PRINCIPAIS DO APP =====================

// Rotas principais
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API para dados
app.get('/api/data', (req, res) => {
    const data = loadData();
    res.json({ success: true, data });
});

app.post('/api/save', (req, res) => {
    try {
        const { data, notificar } = req.body;
        
        if (saveData(data)) {
            // Se for para notificar (novo serviço)
            if (notificar && notificar.barbeiro && notificar.servico) {
                enviarNotificacao(
                    notificar.barbeiro,
                    notificar.servico,
                    notificar.cliente,
                    notificar.valor
                );
            }
            
            // Enviar sincronização para todos os clientes
            wss.clients.forEach(function each(client) {
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

// API para deletar mensalista
app.post('/api/mensalista/delete', (req, res) => {
    try {
        const { id } = req.body;
        const dados = loadData();
        
        const index = dados.mensalistas.findIndex(m => m.id === id);
        if (index !== -1) {
            const mensalistaRemovido = dados.mensalistas.splice(index, 1)[0];
            
            if (saveData(dados)) {
                // Notificar todos os clientes
                wss.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'mensalista_removido',
                            id: id,
                            mensalista: mensalistaRemovido.nome
                        }));
                    }
                });
                
                res.json({ 
                    success: true, 
                    message: `Mensalista ${mensalistaRemovido.nome} removido com sucesso` 
                });
            } else {
                res.status(500).json({ success: false, error: 'Erro ao salvar após remoção' });
            }
        } else {
            res.status(404).json({ success: false, error: 'Mensalista não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API para backup
app.get('/api/backup', (req, res) => {
    try {
        criarBackup();
        res.json({ success: true, message: 'Backup criado com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API para restaurar backup
app.post('/api/backup/restore', (req, res) => {
    try {
        const { file } = req.body;
        const backupFile = path.join(__dirname, 'backups', file);
        
        if (fs.existsSync(backupFile)) {
            const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
            
            if (saveData(backupData)) {
                // Notificar todos os clientes
                wss.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'sync_completo',
                            data: backupData
                        }));
                    }
                });
                
                res.json({ success: true, message: 'Backup restaurado com sucesso' });
            } else {
                res.status(500).json({ success: false, error: 'Erro ao restaurar backup' });
            }
        } else {
            res.status(404).json({ success: false, error: 'Arquivo de backup não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Listar backups
app.get('/api/backup/list', (req, res) => {
    try {
        const backupsDir = path.join(__dirname, 'backups');
        
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }
        
        const files = fs.readdirSync(backupsDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const stats = fs.statSync(path.join(backupsDir, file));
                return {
                    file,
                    size: `${(stats.size / 1024).toFixed(2)} KB`,
                    created: stats.mtime
                };
            })
            .sort((a, b) => b.created - a.created);
        
        res.json({ success: true, backups: files });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Rota padrão para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===================== INICIAR AUTO-PING =====================

// Se estiver em produção, faz auto-ping
if (process.env.NODE_ENV === 'production') {
    // Auto-ping a cada 10 minutos (para garantir)
    setInterval(() => {
        console.log(`🔄 Auto-ping interno: ${new Date().toLocaleTimeString('pt-BR')}`);
    }, 10 * 60 * 1000); // 10 minutos
    
    console.log('✅ Auto-ping interno configurado (10 minutos)');
}

// Backup automático a cada hora
setInterval(() => {
    criarBackup();
}, 60 * 60 * 1000); // 1 hora

// ===================== LOGS PERIÓDICOS =====================

// Log de status a cada 30 minutos
setInterval(() => {
    const data = loadData();
    const totalServicos = (data.Gabriel?.length || 0) + (data.Wagner?.length || 0);
    
    console.log(`
    📊 STATUS BARBAPRO DUO:
    ⏰ Horário: ${new Date().toLocaleString('pt-BR')}
    🔄 Uptime: ${Math.floor(process.uptime() / 60)} minutos
    📞 Requisições: ${requestCount}
    💈 Serviços totais: ${totalServicos}
    👥 Gabriel: ${data.Gabriel?.length || 0}
    👥 Wagner: ${data.Wagner?.length || 0}
    💰 Valor total: R$ ${calcularTotalServicos(data).toFixed(2)}
    📡 WebSocket: ${wss.clients.size} clientes
    💾 Último backup: ${new Date().toLocaleTimeString('pt-BR')}
    `);
}, 30 * 60 * 1000); // 30 minutos

// ===================== INICIAR SERVIDOR =====================

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 BARBAPRO DUO INICIADO!
    🔗 Porta: ${PORT}
    ⏰ Início: ${new Date().toLocaleString('pt-BR')}
    📡 WebSocket: Ativo para notificações em tempo real
    💾 Dados: ${DATA_FILE}
    
    🌐 ENDPOINTS PARA CRON-JOB:
    ✅ Ping: http://localhost:${PORT}/ping
    ✅ Health: http://localhost:${PORT}/health  
    ✅ Status: http://localhost:${PORT}/status
    ✅ Simples: http://localhost:${PORT}/up
    
    🔧 API ENDPOINTS:
    📊 Dados: /api/data
    💾 Salvar: /api/save (POST)
    ❌ Deletar mensalista: /api/mensalista/delete (POST)
    💽 Backup: /api/backup
    
    💈 Acesse: http://localhost:${PORT}
    📊 Dashboard: http://localhost:${PORT}/dashboard
    `);
    
    // Mostrar dados iniciais
    const data = loadData();
    console.log(`
    📁 DADOS CARREGADOS:
    ✂️  Gabriel: ${data.Gabriel?.length || 0} serviços
    ✂️  Wagner: ${data.Wagner?.length || 0} serviços  
    💸 Despesas: ${data.despesas?.length || 0}
    📅 Mensalistas: ${data.mensalistas?.length || 0}
    ⚙️  PIN: ${data.config?.pin || '1234'}
    📱 WhatsApp: ${data.config?.whatsapp || 'Não configurado'}
    `);
    
    // Criar primeiro backup
    criarBackup();
});

// Tratamento de graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM, encerrando graciosamente...');
    
    // Fechar conexões WebSocket
    wss.clients.forEach(client => {
        client.close();
    });
    
    // Criar backup final
    criarBackup();
    
    server.close(() => {
        console.log('✅ Servidor BarbaPRO encerrado com backup salvo');
        process.exit(0);
    });
});

process.on('uncaughtException', (err) => {
    console.error('❌ Erro não tratado:', err);
    criarBackup(); // Salvar dados antes de sair
    process.exit(1);
});