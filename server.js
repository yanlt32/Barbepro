const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARE - COM AUMENTO DE LIMITE ==========
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ========== USAR O DISCO PERSISTENTE DO RENDER ==========
// O Render monta o disco em /var/data
const DATA_DIR = process.env.RENDER ? '/var/data' : __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');

// Garantir que o diretório existe
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log(`📁 Diretório de dados: ${DATA_DIR}`);
console.log(`📄 Arquivo de dados: ${DATA_FILE}`);

// ========== CONFIGURAÇÃO DE EMAIL ==========
const SEU_EMAIL = 'larrisalolv7@gmail.com';
const SUA_SENHA_APP = 'brgwqllprdbqbzlj';
const EMAIL_WAGNER = 'ladeiatortelli8@gmail.com';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: SEU_EMAIL,
        pass: SUA_SENHA_APP
    }
});

transporter.verify(function(error, success) {
    if (error) {
        console.log('❌ Erro na configuração de email:', error.message);
    } else {
        console.log('✅ Servidor de email pronto!');
    }
});

async function enviarEmailParaWagner(assunto, mensagem) {
    try {
        const mailOptions = {
            from: `"BarbaPRO" <${SEU_EMAIL}>`,
            to: EMAIL_WAGNER,
            subject: assunto,
            text: mensagem,
            html: mensagem.replace(/\n/g, '<br>')
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email enviado! ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error.message);
        return { success: false, error: error.message };
    }
}

// ========== DADOS COM PERSISTÊNCIA EM DISCO ==========
function criarDadosNovos() {
    return {
        Gabriel: [],
        Wagner: [],
        despesas: [],
        mensalistas: [],
        config: {
            pin: '1234',
            whatsapp: '5511974065186',
            corte: 30,
            barba: 20,
            combo: 40,
            notificacoesEmail: true
        }
    };
}

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const conteudo = fs.readFileSync(DATA_FILE, 'utf8');
            if (conteudo && conteudo.trim() !== '') {
                const dados = JSON.parse(conteudo);
                console.log(`📂 Dados carregados do disco: ${dados.Wagner?.length || 0} Wagner, ${dados.Gabriel?.length || 0} Gabriel`);
                return dados;
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error.message);
    }
    console.log('📂 Nenhum dado encontrado, criando novo arquivo');
    return criarDadosNovos();
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log(`💾 Dados salvos no disco - Wagner: ${data.Wagner?.length || 0}, Gabriel: ${data.Gabriel?.length || 0}`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error.message);
        return false;
    }
}

// ========== WEBSOCKET ==========
wss.on('connection', function connection(ws) {
    const clientCount = wss.clients.size;
    console.log(`📱 Novo dispositivo conectado! Total: ${clientCount}`);
    
    const dados = loadData();
    ws.send(JSON.stringify({ type: 'dados_iniciais', data: dados }));
    
    ws.on('message', async function message(data) {
        try {
            const message = JSON.parse(data);
            console.log(`📥 Mensagem: ${message.type}`);
            
            if (message.type === 'sync_request') {
                const dadosAtuais = loadData();
                ws.send(JSON.stringify({ type: 'sync_completo', data: dadosAtuais }));
            }
            
            if (message.type === 'update_data') {
                if (saveData(message.data)) {
                    wss.clients.forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'sync_completo', data: message.data }));
                        }
                    });
                }
            }
            
            if (message.type === 'novo_servico') {
                console.log(`✂️ NOVO SERVIÇO - ${message.barbeiro}: ${message.cliente} - R$ ${message.valor}`);
                
                const assunto = `💈 NOVO SERVIÇO - ${message.barbeiro}`;
                const mensagem = `
💈 BARBAPRO DUO - NOVO SERVIÇO

━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 BARBEIRO: ${message.barbeiro}
✂️ SERVIÇO: ${message.servico}
👤 CLIENTE: ${message.cliente}
💰 VALOR: R$ ${message.valor}
📊 STATUS: ${message.status === 'PAGO' ? '✅ PAGO' : '⏳ FIADO'}
⏰ HORA: ${message.hora}
📅 DATA: ${message.data}
━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 Sistema BarbaPRO Duo
                `;
                
                await enviarEmailParaWagner(assunto, mensagem);
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
    res.json({ success: true, data: dados });
});

app.post('/api/save', (req, res) => {
    const { data } = req.body;
    
    if (!data) {
        return res.status(400).json({ success: false, error: 'Dados não fornecidos' });
    }
    
    if (saveData(data)) {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'sync_completo', data }));
            }
        });
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false });
    }
});

app.get('/api/total-combinado', (req, res) => {
    const data = loadData();
    const hoje = new Date().toISOString().split('T')[0];
    
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

app.get('/testar-email', async (req, res) => {
    const resultado = await enviarEmailParaWagner(
        '🧪 TESTE DO SISTEMA BARBAPRO',
        `Olá Wagner! 👋\n\nEste é um email de teste do sistema BarbaPRO.\n\n✅ Se você recebeu, o sistema está funcionando perfeitamente!\n\n📅 Data: ${new Date().toLocaleString('pt-BR')}`
    );
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Teste Email</title></head>
        <body style="background:#0a0a0a; color:white; font-family:Arial; padding:20px; text-align:center;">
            <h1 style="color:#ffaa00;">📧 Teste de Email</h1>
            <div style="background:${resultado.success ? 'rgba(37,211,102,0.2)' : 'rgba(255,51,102,0.2)'}; padding:20px; border-radius:10px;">
                <h3>${resultado.success ? '✅ SUCESSO!' : '❌ ERRO!'}</h3>
                <p>De: ${SEU_EMAIL}</p>
                <p>Para: ${EMAIL_WAGNER}</p>
                ${resultado.error ? `<p>Erro: ${resultado.error}</p>` : ''}
            </div>
            <br>
            <a href="/" style="color:#ffaa00;">← Voltar</a>
        </body>
        </html>
    `);
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
    console.log('║   ✅ DISCO PERSISTENTE ATIVO                               ║');
    console.log('║   ✅ WEBSOCKET ATIVO                                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
});