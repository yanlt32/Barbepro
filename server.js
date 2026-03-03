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

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DATA_FILE = path.join(__dirname, 'data.json');

// ===================== CONFIGURAÇÃO DE EMAIL (COM A NOVA SENHA) =====================
const SEU_EMAIL = 'larrisalolv7@gmail.com';
const SUA_SENHA_APP = 'brgwqllprdbqbzlj'; // ✅ NOVA SENHA DE APP (sem espaços)
const EMAIL_WAGNER = 'ladeiatortelli8@gmail.com';

// Criar transporte
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: SEU_EMAIL,
        pass: SUA_SENHA_APP
    }
});

// Verificar conexão
transporter.verify(function(error, success) {
    if (error) {
        console.log('❌ Erro na configuração de email:', error);
    } else {
        console.log('✅ Servidor de email pronto!');
        console.log(`📧 Remetente: ${SEU_EMAIL}`);
        console.log(`📬 Destinatário: ${EMAIL_WAGNER}`);
    }
});

// ===================== FUNÇÃO PARA ENVIAR EMAIL =====================
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

// ===================== DADOS =====================
function criarDadosNovos() {
    return {
        Gabriel: [],
        Wagner: [],
        despesas: [],
        mensalistas: [],
        config: {
            pin: '1234',
            emailRemetente: SEU_EMAIL,
            emailWagner: EMAIL_WAGNER,
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
                return JSON.parse(conteudo);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
    }
    return criarDadosNovos();
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('💾 Dados salvos');
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        return false;
    }
}

// ===================== WEBSOCKET =====================
wss.on('connection', function connection(ws) {
    console.log('📱 Novo dispositivo conectado');
    
    const dados = loadData();
    ws.send(JSON.stringify({ type: 'dados_iniciais', data: dados }));
    
    ws.on('message', async function message(data) {
        try {
            const message = JSON.parse(data);
            
            if (message.type === 'sync_request') {
                ws.send(JSON.stringify({ type: 'sync_completo', data: loadData() }));
            }
            
            if (message.type === 'update_data') {
                if (saveData(message.data)) {
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'sync_completo', data: message.data }));
                        }
                    });
                }
            }
            
            if (message.type === 'novo_servico') {
                console.log('📧 Enviando email automático para Wagner...');
                
                const assunto = `💈 NOVO SERVIÇO - ${message.barbeiro}`;
                const mensagem = `
💈 BARBAPRO DUO - NOVO SERVIÇO

━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 BARBEIRO: ${message.barbeiro}
✂️ SERVIÇO: ${message.servico}
👤 CLIENTE: ${message.cliente || 'Cliente'}
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
            console.error('❌ Erro WebSocket:', error);
        }
    });
});

// ===================== ROTAS API =====================
app.get('/api/data', (req, res) => {
    res.json({ success: true, data: loadData() });
});

app.post('/api/save', (req, res) => {
    const { data } = req.body;
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

// ===================== ROTA PARA TESTAR EMAIL =====================
app.get('/testar-email', async (req, res) => {
    const resultado = await enviarEmailParaWagner(
        '🧪 TESTE DO SISTEMA',
        `Olá Wagner! 👋\n\nEste é um email de teste do sistema BarbaPRO.\n\n✅ Se você recebeu, o sistema está funcionando perfeitamente!\n\n📅 Data: ${new Date().toLocaleString('pt-BR')}\n\n🚀 BarbaPRO Duo`
    );
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Teste Email</title>
            <style>
                body { background:#0a0a0a; color:white; font-family:Arial; padding:20px; }
                .container { max-width:600px; margin:0 auto; }
                h1 { color:#ffaa00; }
                .success { background:rgba(37,211,102,0.2); border:1px solid #25D366; padding:15px; border-radius:10px; }
                .error { background:rgba(255,51,102,0.2); border:1px solid #ff3366; padding:15px; border-radius:10px; }
                pre { background:#1a1a1a; padding:10px; border-radius:5px; overflow:auto; }
                a { color:#ffaa00; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📧 Teste de Email</h1>
                
                <div class="${resultado.success ? 'success' : 'error'}">
                    <h3>${resultado.success ? '✅ SUCESSO!' : '❌ ERRO!'}</h3>
                    <p>De: <strong>${SEU_EMAIL}</strong></p>
                    <p>Para: <strong>${EMAIL_WAGNER}</strong></p>
                    ${resultado.messageId ? `<p>ID: ${resultado.messageId}</p>` : ''}
                    ${resultado.error ? `<p>Erro: ${resultado.error}</p>` : ''}
                </div>
                
                <br>
                <a href="/">← Voltar ao sistema</a>
                <br><br>
                <a href="/dashboard">📊 Ir para Dashboard</a>
            </div>
        </body>
        </html>
    `);
});

// ===================== ROTAS PRINCIPAIS =====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ===================== INICIAR SERVIDOR =====================
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║        🔥 BARBAPRO - EMAIL AUTOMÁTICO ATIVO! 🔥         ║
    ║                                                          ║
    ╠══════════════════════════════════════════════════════════╣
    ║                                                          ║
    ║   📧 ENVIANDO DE: ${SEU_EMAIL}            ║
    ║   📬 PARA: ${EMAIL_WAGNER}                ║
    ║   🔑 SENHA: NOVA SENHA DE APP                           ║
    ║                                                          ║
    ║   📊 STATUS: ✅ CONFIGURADO!                             ║
    ║                                                          ║
    ║   🚀 TESTAR: http://localhost:${PORT}/testar-email        ║
    ║   📊 DASHBOARD: http://localhost:${PORT}/dashboard        ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
    `);
});