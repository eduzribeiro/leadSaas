const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, 'historico.json');

// Inicializa o arquivo de histórico caso não exista
function initHistory() {
    if (!fs.existsSync(HISTORY_FILE)) {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
    }
}

function getHistory() {
    initHistory();
    const data = fs.readFileSync(HISTORY_FILE, 'utf8');
    return JSON.parse(data);
}

function hasBeenContacted(phone) {
    const history = getHistory();
    return history.includes(phone);
}

function addToHistory(phone) {
    if (hasBeenContacted(phone)) return;
    const history = getHistory();
    history.push(phone);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function getHistoryCount() {
    return getHistory().length;
}

module.exports = {
    hasBeenContacted,
    addToHistory,
    getHistoryCount
};
