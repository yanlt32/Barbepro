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

// Contador de requisições (para monitoramento)
let requestCount = 0;
const startupTime = new Date();

// Middleware de logging
app.use((req, res, next) => {
    requestCount++;
    console.log(`📊 ${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
    next();
});

// Arquivo para persistência de dados
const DATA_FILE = path.join(__dirname, 'data.json');

// Carregar dados do arquivo
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
    
    // Dados padrão
    return {
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
}

// Salvar dados no arquivo
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        return false;
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
        } catch (error) {
            console.error('Erro ao processar mensagem WebSocket:', error);
        }
    });
    
    // Enviar saudação ao novo cliente
    ws.send(JSON.stringify({
        type: 'conexao',
        message: 'Conectado ao BarbaPRO Duo',
        clientes: Object.keys(wss.clients).length,
        timestamp: new Date().toLocaleTimeString('pt-BR')
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
// IMPORTANTE: Para o cron-job funcionar na Render

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
        version: '1.0.0',
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
            save_data: '/api/save (POST)'
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
            
            res.json({ success: true, message: 'Dados salvos com sucesso' });
        } else {
            res.status(500).json({ success: false, error: 'Erro ao salvar dados' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===================== INICIAR AUTO-PING (OPCIONAL) =====================

// Se estiver em produção, faz auto-ping
if (process.env.NODE_ENV === 'production') {
    // Auto-ping a cada 10 minutos (para garantir)
    setInterval(() => {
        console.log(`🔄 Auto-ping interno: ${new Date().toLocaleTimeString('pt-BR')}`);
    }, 10 * 60 * 1000); // 10 minutos
    
    console.log('✅ Auto-ping interno configurado (10 minutos)');
}

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
    `);
}, 30 * 60 * 1000); // 30 minutos

// Rota padrão para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
    `);
});

// Tratamento de graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM, encerrando graciosamente...');
    
    // Fechar conexões WebSocket
    wss.clients.forEach(client => {
        client.close();
    });
    
    server.close(() => {
        console.log('✅ Servidor BarbaPRO encerrado');
        process.exit(0);
    });
});