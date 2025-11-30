const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
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
        const { data } = req.body;
        if (saveData(data)) {
            res.json({ success: true, message: 'Dados salvos com sucesso' });
        } else {
            res.status(500).json({ success: false, error: 'Erro ao salvar dados' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check para Render
app.get('/health', (req, res) => {
    res.json({ 
        status: 'online', 
        service: 'BarbaPRO Duo',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Rota padrão para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor BarbaPRO rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
    console.log(`💈 Barbearia Online - Sistema de Gestão`);
    console.log(`💾 Dados salvos em: ${DATA_FILE}`);
});