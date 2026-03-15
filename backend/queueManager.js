const fs = require('fs');
const path = require('path');

const QUEUE_FILE = path.join(__dirname, 'queue.json');

// Estado:
// "idle" -> Nenhuma campanha em andamento
// "running" -> Enviando ou esperando o delay
// "paused" -> Pausado voluntariamente
// "standby" -> Pausado pela janela de horário (fora das 09h às 18h)

function initQueue() {
    if (!fs.existsSync(QUEUE_FILE)) {
        fs.writeFileSync(QUEUE_FILE, JSON.stringify({
            status: 'idle',
            leads: [], // { id, name, phone, city, status: 'pending'|'sent'|'failed'|'skipped' }
            messageTemplate: '',
            currentIndex: 0
        }, null, 2));
    }
}

function getQueueData() {
    initQueue();
    const data = fs.readFileSync(QUEUE_FILE, 'utf8');
    return JSON.parse(data);
}

function saveQueueData(data) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2));
}

function setQueue(leads, messageTemplate) {
    const data = {
        status: 'idle',
        leads: leads.map((l, i) => ({ ...l, id: i, status: 'pending' })),
        messageTemplate,
        currentIndex: 0
    };
    saveQueueData(data);
    return data;
}

function updateQueueStatus(status) {
    const data = getQueueData();
    data.status = status;
    saveQueueData(data);
    return data;
}

function updateLeadStatus(index, status) {
    const data = getQueueData();
    if (data.leads[index]) {
        data.leads[index].status = status;
        saveQueueData(data);
    }
}

function updateCurrentIndex(index) {
    const data = getQueueData();
    data.currentIndex = index;
    saveQueueData(data);
}

function removeLead(index) {
    const data = getQueueData();
    data.leads.splice(index, 1);
    // adjust currentIndex if needed
    saveQueueData(data);
    return data;
}

module.exports = {
    getQueueData,
    saveQueueData,
    setQueue,
    updateQueueStatus,
    updateLeadStatus,
    updateCurrentIndex,
    removeLead
};
