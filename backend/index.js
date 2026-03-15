const express = require('express');
const cors = require('cors');
const whatsapp = require('./whatsapp');
const scraper = require('./scraper');
const queueManager = require('./queueManager');
const historyManager = require('./historyManager');

const app = express();
app.use(cors());
app.use(express.json());

// Inicia o Whatsapp
whatsapp.initWhatsApp();

// --- Endpoints Whatsapp ---
app.get('/api/status', (req, res) => {
    const status = whatsapp.getStatus();
    res.json({
        ready: status.ready,
        qr: status.qr,
        historyCount: historyManager.getHistoryCount()
    });
});

app.post('/api/logout', async (req, res) => {
    await whatsapp.logout();
    res.json({ success: true });
});

// --- SSE Real-time Updates ---
app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Ping/keep-alive para nao fechar conexao
    const keepAlive = setInterval(() => {
        res.write(':\n\n');
    }, 20000);

    // Registra conexao SSE no whatsapp (para eventos QR, Ready, Disconnect, Queue updates)
    whatsapp.registerSSE(res);

    req.on('close', () => {
        clearInterval(keepAlive);
        // Opcional: remover res de sseClients no whatsapp.js se necessario
    });
});

// --- Extrator Puppeteer ---
app.post('/api/scrape', async (req, res) => {
    const { niche, city } = req.body;
    if (!niche || !city) return res.status(400).json({ error: 'Nicho e Cidade sao obrigatorios.' });

    try {
        const leads = await scraper.scrapeLeads(niche, city);
        res.json({ leads });
    } catch (e) {
        res.status(500).json({ error: 'Falha no scraper.' });
    }
});

// --- Queue Management ---
app.get('/api/queue', (req, res) => {
    res.json(queueManager.getQueueData());
});

app.post('/api/queue/start', (req, res) => {
    const { leads, template } = req.body;
    if (!leads || !template) return res.status(400).json({ error: 'Leads e mensagem obrigatorios.' });

    whatsapp.startQueue(leads, template);
    res.json({ success: true });
});

app.post('/api/queue/pause', (req, res) => {
    whatsapp.pauseQueue();
    res.json({ success: true, status: 'paused' });
});

app.post('/api/queue/resume', (req, res) => {
    whatsapp.resumeQueue();
    res.json({ success: true, status: 'running' });
});

app.post('/api/queue/remove', (req, res) => {
    const { index } = req.body;
    queueManager.removeLead(index);
    res.json(queueManager.getQueueData());
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`API LeadSaaS Backend rodando na porta ${PORT}`);
});
