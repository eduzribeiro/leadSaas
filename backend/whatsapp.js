const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const queueManager = require('./queueManager');
const historyManager = require('./historyManager');

let client = null;
let qrCodeValue = null;
let clientReady = false;
let currentTimeout = null;
let sseClients = [];

// Funções de manipulação do SSE
function registerSSE(res) {
    sseClients.push(res);
}

function notifyClients(data) {
    sseClients.forEach(client => {
        client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

// Inicializa ou recupera cliente do WhatsApp
function initWhatsApp() {
    client = new Client({
        authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        qrCodeValue = qr;
        notifyClients({ type: 'qr', qr });
    });

    client.on('ready', () => {
        qrCodeValue = null;
        clientReady = true;
        notifyClients({ type: 'ready' });
        console.log('Cliente WhatsApp Pronto!');

        // Verifica se havia uma fila rodando e tenta resumir
        resumeQueueIfRunning();
    });

    client.on('disconnected', (reason) => {
        clientReady = false;
        qrCodeValue = null;
        console.log('Cliente Desconectado:', reason);
        notifyClients({ type: 'disconnected' });

        // Pausa a queue, se estava rodando
        const q = queueManager.getQueueData();
        if (q.status === 'running') {
            queueManager.updateQueueStatus('paused');
            notifyClients({ type: 'queue_update', queue: queueManager.getQueueData() });
        }
    });

    client.initialize();
}

function getStatus() {
    return {
        ready: clientReady,
        qr: qrCodeValue
    };
}

// Finaliza a sessão atual e apaga a pasta (Logout)
async function logout() {
    if (client) {
        try {
            await client.destroy();
        } catch (e) {
            console.error('Erro ao destruir cliente:', e);
        }
    }
    clientReady = false;
    qrCodeValue = null;
    const authPath = path.join(__dirname, '.wwebjs_auth');
    if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
    }

    // Zera a queue
    queueManager.setQueue([], '');

    notifyClients({ type: 'disconnected' });
    initWhatsApp(); // reinicia pra esperar novo QR
}

// Formata o número (ex: +55 (11) 99999-9999 -> 5511999999999)
function formatNumber(phone) {
    let clean = phone.replace(/\D/g, '');
    if (!clean.startsWith('55')) {
        clean = '55' + clean;
    }
    return clean;
}

// Loop de envio de mensagens persistente
async function processQueue() {
    clearTimeout(currentTimeout);

    let queue = queueManager.getQueueData();

    // Se no est rodando, para a execuo
    if (queue.status !== 'running') return;

    if (queue.currentIndex >= queue.leads.length) {
        console.log('Fila finalizada!');
        queueManager.updateQueueStatus('idle');
        queueManager.updateCurrentIndex(0);
        notifyClients({ type: 'queue_update', queue: queueManager.getQueueData() });
        return;
    }

    // Regra da Janela de Horário
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour < 9 || currentHour >= 18) {
        console.log('Fora da janela de horrio. Entrando em Standby.');
        queueManager.updateQueueStatus('standby');
        notifyClients({ type: 'queue_update', queue: queueManager.getQueueData() });

        // Tenta de novo a cada 10 minutos at dar a hora
        currentTimeout = setTimeout(processQueue, 10 * 60 * 1000);
        return;
    }

    if (!clientReady) {
        console.log('Cliente WPP no est pronto, aguardando...');
        // Tenta novamente em um minuto
        currentTimeout = setTimeout(processQueue, 60 * 1000);
        return;
    }

    const lead = queue.leads[queue.currentIndex];

    // Verifica se ja foi contatado (ignora)
    const formatted = formatNumber(lead.phone);
    if (historyManager.hasBeenContacted(formatted)) {
        console.log(`Pulado: Já contatado anteriormente (${lead.phone})`);
        queueManager.updateLeadStatus(queue.currentIndex, 'skipped');

        // Vai pro proximo
        queueManager.updateCurrentIndex(queue.currentIndex + 1);
        notifyClients({ type: 'queue_update', queue: queueManager.getQueueData() });

        currentTimeout = setTimeout(processQueue, 1000); // pula super rpido
        return;
    }

    // Lgica de Tags
    let message = queue.messageTemplate
        .replace(/{nome}/gi, lead.name)
        .replace(/{cidade}/gi, lead.city);

    try {
        // Validação Inteligente: Antes de atirar, verifica se é um WhatsApp Ativo
        const numberId = await client.getNumberId(formatted);

        if (!numberId) {
            console.log(`[!] IGNORADO: Telefone de ${lead.name} sem WhatsApp ou é Fixo (${formatted})`);
            queueManager.updateLeadStatus(queue.currentIndex, 'failed');

            historyManager.addToHistory(formatted); // Evitar retestes futuros
            queueManager.updateCurrentIndex(queue.currentIndex + 1);
            notifyClients({ type: 'queue_update', queue: queueManager.getQueueData() });

            currentTimeout = setTimeout(processQueue, 3000);
            return;
        }

        const chatId = numberId._serialized;
        await client.sendMessage(chatId, message);
        console.log(`[OK] Mensagem enviada para ${lead.name} (${formatted})`);

        queueManager.updateLeadStatus(queue.currentIndex, 'sent');
        historyManager.addToHistory(formatted); // Salva no histrico

        // Se conseguiu enviar, espera o Delay Humano Aleatório (300 a 720 seg)
        // Isso é de 5 a 12 minutos
        const delayMs = Math.floor(Math.random() * (720000 - 300000 + 1) + 300000);
        // Avana index
        queueManager.updateCurrentIndex(queue.currentIndex + 1);
        notifyClients({ type: 'queue_update', queue: queueManager.getQueueData() });

        console.log(`Aguardando ${(delayMs / 1000).toFixed(0)} segundos para a prxima mensagem...`);
        currentTimeout = setTimeout(processQueue, delayMs);

    } catch (e) {
        console.error(`Falha ao enviar para ${lead.name} (${formatted}):`, e);
        queueManager.updateLeadStatus(queue.currentIndex, 'failed');

        // Pula para o prximo (delay curto j que falhou)
        queueManager.updateCurrentIndex(queue.currentIndex + 1);
        notifyClients({ type: 'queue_update', queue: queueManager.getQueueData() });

        currentTimeout = setTimeout(processQueue, 5000);
    }
}

function startQueue(leads, template) {
    queueManager.setQueue(leads, template);
    queueManager.updateQueueStatus('running');
    notifyClients({ type: 'queue_update', queue: queueManager.getQueueData() });
    processQueue();
}

function resumeQueueIfRunning() {
    const q = queueManager.getQueueData();
    if (q.status === 'running' || q.status === 'standby') {
        queueManager.updateQueueStatus('running');
        notifyClients({ type: 'queue_update', queue: queueManager.getQueueData() });
        processQueue();
    }
}

function resumeQueue() {
    queueManager.updateQueueStatus('running');
    notifyClients({ type: 'queue_update', queue: queueManager.getQueueData() });
    processQueue();
}

function pauseQueue() {
    clearTimeout(currentTimeout); // Pausa Resiliente
    queueManager.updateQueueStatus('paused');
    notifyClients({ type: 'queue_update', queue: queueManager.getQueueData() });
}

module.exports = {
    initWhatsApp,
    getStatus,
    logout,
    startQueue,
    resumeQueue,
    pauseQueue,
    registerSSE
};
