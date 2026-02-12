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
            whatsapp: '11974065186',
            corte: 28,
            barba: 15,
            combo: 40,
            orcamentoDespesas: 1500,
            notificacoesAtivas: true,
            diasAlerta: 3
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

// ===================== ROTA ESPECIAL PARA LIMPAR TUDO AGORA =====================
// ACESSE: http://localhost:3000/limpar-tudo
app.get('/limpar-tudo', (req, res) => {
    try {
        // Carregar dados atuais
        const dados = loadData();
        
        // Manter apenas a configuração, apagar TODO o resto
        const dadosLimpos = {
            Gabriel: [],           // LIMPO
            Wagner: [],           // LIMPO
            despesas: [],         // LIMPO
            mensalistas: [],      // LIMPO
            config: dados.config || {  // Mantém a configuração
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
        
        // Salvar dados limpos
        if (saveData(dadosLimpos)) {
            
            // Notificar todos os clientes WebSocket que os dados foram resetados
            wss.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'sync_completo',
                        data: dadosLimpos
                    }));
                }
            });
            
            // Criar um backup ANTES de limpar (caso queira recuperar depois)
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(__dirname, 'backups');
            
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const backupFile = path.join(backupDir, `backup-antes-limpeza-${timestamp}.json`);
            fs.writeFileSync(backupFile, JSON.stringify(dados, null, 2));
            
            // Enviar resposta HTML bonita
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>🧹 Sistema Limpo - BarbaPRO</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            margin: 0;
                            padding: 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            color: #333;
                        }
                        .container {
                            background: white;
                            border-radius: 20px;
                            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                            padding: 40px;
                            max-width: 600px;
                            margin: 20px;
                            text-align: center;
                        }
                        h1 {
                            color: #4CAF50;
                            font-size: 2.5em;
                            margin-bottom: 20px;
                        }
                        .emoji {
                            font-size: 4em;
                            margin-bottom: 20px;
                        }
                        .stats {
                            background: #f5f5f5;
                            border-radius: 10px;
                            padding: 20px;
                            margin: 20px 0;
                            text-align: left;
                        }
                        .stats h3 {
                            color: #555;
                            margin-top: 0;
                        }
                        .stats ul {
                            list-style: none;
                            padding: 0;
                        }
                        .stats li {
                            padding: 10px;
                            border-bottom: 1px solid #ddd;
                            display: flex;
                            justify-content: space-between;
                        }
                        .stats li:last-child {
                            border-bottom: none;
                        }
                        .btn {
                            background: #4CAF50;
                            color: white;
                            border: none;
                            padding: 15px 30px;
                            font-size: 1.2em;
                            border-radius: 10px;
                            cursor: pointer;
                            margin: 10px;
                            transition: transform 0.3s;
                            text-decoration: none;
                            display: inline-block;
                        }
                        .btn:hover {
                            transform: scale(1.05);
                            background: #45a049;
                        }
                        .btn-backup {
                            background: #2196F3;
                        }
                        .btn-backup:hover {
                            background: #0b7dda;
                        }
                        .warning {
                            background: #fff3cd;
                            border: 1px solid #ffeeba;
                            color: #856404;
                            padding: 15px;
                            border-radius: 10px;
                            margin: 20px 0;
                        }
                        .success {
                            background: #d4edda;
                            border: 1px solid #c3e6cb;
                            color: #155724;
                            padding: 15px;
                            border-radius: 10px;
                            margin: 20px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="emoji">🧹✨</div>
                        <h1>SISTEMA LIMPO!</h1>
                        
                        <div class="success">
                            ✅ Todos os serviços, despesas e mensalistas foram APAGADOS!
                        </div>
                        
                        <div class="stats">
                            <h3>📊 Status Atual:</h3>
                            <ul>
                                <li><span>✂️ Serviços Gabriel:</span> <strong>0</strong></li>
                                <li><span>✂️ Serviços Wagner:</span> <strong>0</strong></li>
                                <li><span>💰 Despesas:</span> <strong>0</strong></li>
                                <li><span>📅 Mensalistas:</span> <strong>0</strong></li>
                            </ul>
                        </div>
                        
                        <div class="warning">
                            ⚠️ Um backup dos dados ANTES da limpeza foi criado:<br>
                            <strong>backup-antes-limpeza-${timestamp}.json</strong><br>
                            <small>Você pode restaurar este backup se necessário</small>
                        </div>
                        
                        <a href="/" class="btn">🏠 Ir para o Sistema</a>
                        <a href="/dashboard" class="btn btn-backup">📊 Ir para Dashboard</a>
                        <br>
                        <a href="/api/backup/list" style="color: #666; margin-top: 20px; display: block;">
                            📁 Ver lista de backups
                        </a>
                    </div>
                </body>
                </html>
            `);
            
            console.log('🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹');
            console.log('🧹 TODOS OS DADOS FORAM LIMPOS!');
            console.log('🧹 Gabriel: 0 serviços');
            console.log('🧹 Wagner: 0 serviços');
            console.log('🧹 Despesas: 0');
            console.log('🧹 Mensalistas: 0');
            console.log('🧹 Backup salvo em: backup-antes-limpeza-' + timestamp + '.json');
            console.log('🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹');
            
        } else {
            res.status(500).send('Erro ao limpar dados');
        }
    } catch (error) {
        console.error('❌ Erro ao limpar dados:', error);
        res.status(500).send('Erro: ' + error.message);
    }
});

// ===================== ROTA PARA LIMPAR APENAS SERVIÇOS =====================
app.get('/limpar-servicos', (req, res) => {
    try {
        const dados = loadData();
        
        dados.Gabriel = [];
        dados.Wagner = [];
        
        saveData(dados);
        
        // Notificar clientes
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'sync_completo',
                    data: dados
                }));
            }
        });
        
        res.send('✅ Serviços limpos! Gabriel e Wagner estão com 0 serviços.');
        
    } catch (error) {
        res.status(500).send('Erro: ' + error.message);
    }
});

// ===================== ROTA PARA LIMPAR APENAS DESPESAS =====================
app.get('/limpar-despesas', (req, res) => {
    try {
        const dados = loadData();
        dados.despesas = [];
        saveData(dados);
        
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'sync_completo',
                    data: dados
                }));
            }
        });
        
        res.send('💰 Despesas limpas!');
        
    } catch (error) {
        res.status(500).send('Erro: ' + error.message);
    }
});

// ===================== ROTA PARA LIMPAR APENAS MENSALISTAS =====================
app.get('/limpar-mensalistas', (req, res) => {
    try {
        const dados = loadData();
        dados.mensalistas = [];
        saveData(dados);
        
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'sync_completo',
                    data: dados
                }));
            }
        });
        
        res.send('📅 Mensalistas limpos!');
        
    } catch (error) {
        res.status(500).send('Erro: ' + error.message);
    }
});

// Backup automático
function criarBackup() {
    try {
        const data = loadData();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, 'backups');
        const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
        console.log(`💾 Backup criado: ${backupFile}`);
        
        const files = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.json'))
            .map(file => ({ file, time: fs.statSync(path.join(backupDir, file)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);
        
        if (files.length > 10) {
            files.slice(10).forEach(({ file }) => {
                fs.unlinkSync(path.join(backupDir, file));
                console.log(`🗑️ Backup antigo removido: ${file}`);
            });
        }
        
        return backupFile;
    } catch (error) {
        console.error('❌ Erro ao criar backup:', error);
        return null;
    }
}

// WebSocket
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
                    
                    ws.send(JSON.stringify({
                        type: 'update_success',
                        message: 'Dados atualizados'
                    }));
                }
            }
            
            if (message.type === 'novo_servico') {
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
            
        } catch (error) {
            console.error('❌ Erro ao processar mensagem WebSocket:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Erro ao processar mensagem'
            }));
        }
    });
    
    ws.on('close', function close() {
        console.log('📱 Dispositivo desconectado');
    });
    
    ws.on('error', function error(err) {
        console.error('❌ Erro WebSocket:', err);
    });
});

// ===================== ROTAS PRINCIPAIS =====================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API para obter dados
app.get('/api/data', (req, res) => {
    try {
        const data = loadData();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API para salvar dados
app.post('/api/save', (req, res) => {
    try {
        const { data } = req.body;
        
        if (!data) {
            return res.status(400).json({ success: false, error: 'Dados não fornecidos' });
        }
        
        if (saveData(data)) {
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

// API para backup
app.get('/api/backup', (req, res) => {
    try {
        const backupFile = criarBackup();
        
        if (backupFile) {
            res.json({ 
                success: true, 
                message: 'Backup criado com sucesso',
                file: path.basename(backupFile)
            });
        } else {
            res.status(500).json({ success: false, error: 'Erro ao criar backup' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API para listar backups
app.get('/api/backup/list', (req, res) => {
    try {
        const backupDir = path.join(__dirname, 'backups');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const files = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const stats = fs.statSync(path.join(backupDir, file));
                return {
                    file,
                    size: `${(stats.size / 1024).toFixed(2)} KB`,
                    created: stats.mtime,
                    url: `/api/backup/download/${file}`
                };
            })
            .sort((a, b) => b.created - a.created);
        
        res.json({ success: true, backups: files });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API para baixar backup
app.get('/api/backup/download/:file', (req, res) => {
    try {
        const file = req.params.file;
        const backupFile = path.join(__dirname, 'backups', file);
        
        if (fs.existsSync(backupFile)) {
            res.download(backupFile, `backup-${file}`);
        } else {
            res.status(404).json({ success: false, error: 'Backup não encontrado' });
        }
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

// API para deletar backup
app.delete('/api/backup/:file', (req, res) => {
    try {
        const file = req.params.file;
        const backupFile = path.join(__dirname, 'backups', file);
        
        if (fs.existsSync(backupFile)) {
            fs.unlinkSync(backupFile);
            res.json({ success: true, message: 'Backup excluído com sucesso' });
        } else {
            res.status(404).json({ success: false, error: 'Backup não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API para exportar dados em CSV
app.get('/api/export/:type', (req, res) => {
    try {
        const type = req.params.type;
        const data = loadData();
        
        let csv = '';
        let filename = '';
        
        switch(type) {
            case 'servicos':
                const servicos = [...(data.Gabriel || []), ...(data.Wagner || [])];
                csv = 'Data,Hora,Barbeiro,Cliente,Serviço,Valor,Status,Pagamento,Observações\n';
                
                servicos.forEach(s => {
                    const linha = [
                        s.data || '',
                        s.hora || '',
                        s.barbeiro || '',
                        s.cliente || '',
                        s.tipo || '',
                        s.valor || 0,
                        s.pago ? 'PAGO' : 'FIADO',
                        s.metodoPagamento || '',
                        s.observacoes || ''
                    ].map(campo => `"${campo}"`).join(',');
                    
                    csv += linha + '\n';
                });
                
                filename = `servicos_${new Date().toISOString().split('T')[0]}.csv`;
                break;
                
            case 'despesas':
                const despesas = data.despesas || [];
                csv = 'Data,Descrição,Categoria,Valor,Tags,Comprovante,Observações\n';
                
                despesas.forEach(d => {
                    const linha = [
                        d.data || '',
                        d.descricao || '',
                        d.categoria || '',
                        d.valor || 0,
                        (d.tags || []).join('; '),
                        d.comprovante || '',
                        d.observacoes || ''
                    ].map(campo => `"${campo}"`).join(',');
                    
                    csv += linha + '\n';
                });
                
                filename = `despesas_${new Date().toISOString().split('T')[0]}.csv`;
                break;
                
            case 'mensalistas':
                const mensalistas = data.mensalistas || [];
                csv = 'Nome,Telefone,Barbeiro,Valor,Data Início,Dia Vencimento,Status,Observações\n';
                
                mensalistas.forEach(m => {
                    const linha = [
                        m.nome || '',
                        m.telefone || '',
                        m.barbeiro || '',
                        m.valor || 0,
                        m.dataInicio || '',
                        m.diaVencimento || '',
                        m.status || '',
                        m.observacoes || ''
                    ].map(campo => `"${campo}"`).join(',');
                    
                    csv += linha + '\n';
                });
                
                filename = `mensalistas_${new Date().toISOString().split('T')[0]}.csv`;
                break;
                
            default:
                return res.status(400).json({ success: false, error: 'Tipo de exportação inválido' });
        }
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Rota para verificar status simples
app.get('/status', (req, res) => {
    const data = loadData();
    const totalServicos = (data.Gabriel?.length || 0) + (data.Wagner?.length || 0);
    
    res.json({
        status: 'online',
        app: 'BarbaPRO Duo',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        clients: wss.clients.size,
        statistics: {
            total_services: totalServicos,
            Gabriel: data.Gabriel?.length || 0,
            Wagner: data.Wagner?.length || 0,
            expenses: data.despesas?.length || 0,
            monthly_clients: data.mensalistas?.length || 0
        }
    });
});

// Rota para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===================== INICIAR SERVIDOR =====================

// Backup a cada 1 hora
setInterval(() => {
    criarBackup();
}, 60 * 60 * 1000);

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
    const data = loadData();
    const totalServicos = (data.Gabriel?.length || 0) + (data.Wagner?.length || 0);
    
    console.log(`
    ⚡ BARBAPRO DUO INICIADO!
    🔗 Porta: ${PORT}
    ⏰ Início: ${new Date().toLocaleString('pt-BR')}
    📡 WebSocket: Pronto para sincronização em tempo real
    💾 Dados: ${DATA_FILE}
    
    📊 DADOS INICIAIS:
    ✂️  Gabriel: ${data.Gabriel?.length || 0} serviços
    ✂️  Wagner: ${data.Wagner?.length || 0} serviços  
    💸 Despesas: ${data.despesas?.length || 0}
    📅 Mensalistas: ${data.mensalistas?.length || 0}
    📈 Total serviços: ${totalServicos}
    
    🧹 ROTAS PARA LIMPAR DADOS:
    🔴 LIMPAR TUDO: http://localhost:${PORT}/limpar-tudo
    ✂️  Limpar só serviços: http://localhost:${PORT}/limpar-servicos
    💰 Limpar só despesas: http://localhost:${PORT}/limpar-despesas
    📅 Limpar só mensalistas: http://localhost:${PORT}/limpar-mensalistas
    
    🌐 ENDPOINTS DISPONÍVEIS:
    🔗 App: http://localhost:${PORT}
    📊 Dashboard: http://localhost:${PORT}/dashboard
    📊 API Data: http://localhost:${PORT}/api/data
    💾 Backup: http://localhost:${PORT}/api/backup/list
    📄 Exportar: /api/export/servicos, /api/export/despesas, /api/export/mensalistas
    📡 Status: http://localhost:${PORT}/status
    `);
    
    // Criar primeiro backup
    criarBackup();
});

// Tratamento de graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM, encerrando graciosamente...');
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.close();
        }
    });
    
    criarBackup();
    
    server.close(() => {
        console.log('✅ Servidor BarbaPRO encerrado com backup salvo');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Recebido SIGINT, encerrando...');
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.close();
        }
    });
    
    criarBackup();
    
    server.close(() => {
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});

process.on('uncaughtException', (err) => {
    console.error('❌ Erro não tratado:', err);
    criarBackup();
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', reason);
});