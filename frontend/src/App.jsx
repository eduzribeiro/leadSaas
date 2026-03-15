import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QrCode, LogOut, CheckCircle2, Play, Pause, Trash2, Search, Activity, Users, History, AlertTriangle } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [status, setStatus] = useState({ ready: false, qr: null, historyCount: 0 });
  const [queueData, setQueueData] = useState({ status: 'idle', leads: [], currentIndex: 0 });

  // States of configuration
  const [niche, setNiche] = useState('Clínica Odontológica');
  const [city, setCity] = useState('São Paulo, SP');
  const [template, setTemplate] = useState('Olá {nome}, tudo bem?\nVi seu trabalho em {cidade} e gostaria de apresentar uma solução de IA da NexaTech para escalar seus agendamentos...');

  // Local states
  const [loadingScrape, setLoadingScrape] = useState(false);
  const [scrapedLeads, setScrapedLeads] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Initial fetch
  useEffect(() => {
    fetchStatus();
    fetchQueue();

    // Server-Sent Events (SSE)
    const eventSource = new EventSource(`${API_URL}/stream`);

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'qr') {
        setStatus(prev => ({ ...prev, qr: data.qr }));
      } else if (data.type === 'ready') {
        setStatus(prev => ({ ...prev, ready: true, qr: null }));
      } else if (data.type === 'disconnected') {
        setStatus(prev => ({ ...prev, ready: false, qr: null }));
        setQueueData(prev => ({ ...prev, status: 'idle', leads: [] }));
      } else if (data.type === 'queue_update') {
        setQueueData(data.queue);
        fetchStatus(); // To update history count
      }
    };

    return () => eventSource.close();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/status`);
      setStatus(res.data);
    } catch (e) { console.error('Error fetching status', e); }
  };

  const fetchQueue = async () => {
    try {
      const res = await axios.get(`${API_URL}/queue`);
      setQueueData(res.data);
    } catch (e) { console.error('Error fetching queue', e); }
  };

  const handleLogout = async () => {
    await axios.post(`${API_URL}/logout`);
    setStatus({ ready: false, qr: null, historyCount: 0 });
  };

  const handleScrape = async () => {
    if (!niche || !city) return;
    setLoadingScrape(true);
    setErrorMsg('');
    try {
      const res = await axios.post(`${API_URL}/scrape`, { niche, city });
      setScrapedLeads(res.data.leads || []);
      if (res.data.leads.length === 0) {
        setErrorMsg('Nenhum resultado encontrado. Tente outra busca.');
      }
    } catch (e) {
      setErrorMsg('Erro ao buscar leads. O Google pode ter bloqueado a consulta temporariamente.');
    } finally {
      setLoadingScrape(false);
    }
  };

  const startProspecting = async () => {
    if (scrapedLeads.length === 0) return;
    try {
      await axios.post(`${API_URL}/queue/start`, { leads: scrapedLeads, template });
      setScrapedLeads([]); // clear local list since it went to server
      fetchQueue();
    } catch (e) {
      alert('Erro ao iniciar a fila');
    }
  };

  const pauseQueue = async () => {
    await axios.post(`${API_URL}/queue/pause`);
  };

  const resumeQueue = async () => {
    await axios.post(`${API_URL}/queue/resume`);
  };

  const removeLocalLead = (index) => {
    const list = [...scrapedLeads];
    list.splice(index, 1);
    setScrapedLeads(list);
  };

  // Status Component
  const ConnectionCard = () => (
    <div className="glass-panel flex flex-col items-center justify-center p-8 relative">
      <div className="absolute top-4 right-4 flex gap-2 text-chrome/50">
        <Activity size={18} />
      </div>
      <h3 className="text-xl font-bold mb-4">Status da Conexão</h3>
      {status.ready ? (
        <div className="flex flex-col items-center text-neon">
          <CheckCircle2 size={64} className="mb-4 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
          <span className="text-xl font-bold tracking-wider uppercase">Conectado e Seguro</span>
        </div>
      ) : status.qr ? (
        <div className="flex flex-col items-center">
          <div className="p-4 bg-white rounded-xl mb-4 shadow-lg shadow-white/10">
            {/* Usando uma lib de qr ou api web para desenhar o texto Base64, qrcode-terminal converte pro terminal, o wwebjs manda a string em RAW. Vamos renderizar usando api externa pra simplicidade */}
            <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(status.qr)}&size=200x200`} alt="QR Code" className="w-[200px] h-[200px]" />
          </div>
          <span className="text-sm text-chrome/60 animate-pulse">Escaneie pelo seu WhatsApp...</span>
        </div>
      ) : (
        <div className="animate-pulse text-chrome">Aguardando cliente WhatsApp...</div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex justify-between items-center glass-panel">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-space to-gray-800 border border-white/20 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <Activity className="text-neon" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white m-0">LEAD<span className="text-neon">SAAS</span></h1>
            <p className="text-xs text-chrome/60 -mt-1 uppercase tracking-widest font-bold">Prospecção Inteligente</p>
          </div>
        </div>

        <button onClick={handleLogout} className="btn-danger flex items-center gap-2">
          <LogOut size={18} /> Desconectar / Trocar WhatsApp
        </button>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ConnectionCard />

        <div className="glass-panel flex flex-col justify-between p-8">
          <div>
            <div className="flex items-center gap-2 text-chrome/50 mb-2">
              <History size={18} /> <h3 className="uppercase tracking-widest text-sm font-bold">Total de Histórico</h3>
            </div>
            <p className="text-4xl font-black text-white">{status.historyCount}</p>
          </div>
          <p className="text-xs text-chrome/40 leading-relaxed border-t border-white/10 pt-4 mt-4">
            Contatos já abordados e salvos localmente.<br />Proteção contra duplicidade ativa.
          </p>
        </div>

        <div className="glass-panel flex flex-col justify-between p-8">
          <div>
            <div className="flex items-center gap-2 text-chrome/50 mb-2">
              <Users size={18} /> <h3 className="uppercase tracking-widest text-sm font-bold">Envios do Fila Atual</h3>
            </div>
            <p className="text-4xl font-black text-white">{queueData?.leads?.filter(l => l.status === 'sent').length || 0} <span className="text-xl text-chrome/40 font-normal">/ {queueData?.leads?.length || 0}</span></p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
            <div className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 uppercase tracking-wide
              ${queueData.status === 'running' ? 'bg-neon/10 text-neon' :
                queueData.status === 'standby' ? 'bg-yellow-500/10 text-yellow-500' :
                  queueData.status === 'paused' ? 'bg-orange-500/10 text-orange-500' : 'bg-white/5 text-chrome'}`}>
              {queueData.status === 'running' && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-neon"></span></span>}
              {queueData.status === 'standby' && <AlertTriangle size={14} />}
              Estado: {queueData.status}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Config and Fetch (Left) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel space-y-5">
            <h2 className="text-xl font-bold flex items-center gap-2 border-b border-white/10 pb-4"><Search size={20} className="text-neon" /> Configurar Campanha</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-chrome/60 mb-2">Nicho Profissional</label>
                <input type="text" value={niche} onChange={e => setNiche(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 transition-all font-medium" />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-chrome/60 mb-2">Cidade/Região</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 transition-all font-medium" />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-chrome/60 mb-2">Mensagem Padrão <span className="text-neon font-normal lower-case">(Tags: {'{nome}'}, {'{cidade}'})</span></label>
                <textarea rows="6" value={template} onChange={e => setTemplate(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 transition-all text-sm leading-relaxed" />
              </div>

              <button
                onClick={handleScrape} disabled={loadingScrape || !status.ready}
                className="w-full btn-outline flex items-center justify-center gap-2 font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                {loadingScrape ? <div className="animate-spin border-t-2 border-b-2 border-chrome w-5 h-5 rounded-full" /> : <Search size={18} />}
                {loadingScrape ? 'Minerando no Google Maps...' : 'Minerar Leads Locais'}
              </button>
            </div>
          </div>

          <div className="glass-panel space-y-4">
            <h2 className="text-xl font-bold border-b border-white/10 pb-4">Controles de Fluxo</h2>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={resumeQueue} disabled={queueData.status === 'running' || queueData.leads.length === 0}
                className="btn-neon font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border-none text-space">
                <Play size={18} fill="currentColor" /> RETOMAR
              </button>
              <button onClick={pauseQueue} disabled={queueData.status !== 'running' && queueData.status !== 'standby'}
                className="bg-orange-500 text-white font-bold py-3 px-6 rounded-lg hover:shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                <Pause size={18} fill="currentColor" /> PAUSAR
              </button>
            </div>
            <p className="text-xs text-chrome/40 text-center leading-relaxed">
              Delay Segurana: 5-12 min entre disparos.<br />
              Janela Operacional: 09h s 18h.
            </p>
          </div>
        </div>

        {/* Queue / Table (Right) */}
        <div className="lg:col-span-8">
          <div className="glass-panel h-full flex flex-col">
            <h2 className="text-xl font-bold flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <span>Fila de Contatos</span>
              {scrapedLeads.length > 0 && (
                <button onClick={startProspecting} disabled={!status.ready} className="btn-neon !py-2 !px-4 text-sm whitespace-nowrap">
                  Iniciar Prospecção ({scrapedLeads.length})
                </button>
              )}
            </h2>

            {errorMsg && <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm">{errorMsg}</div>}

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-chrome/50 uppercase tracking-wider text-xs">
                    <th className="px-4 py-3 font-medium">Situação</th>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Telefone</th>
                    <th className="px-4 py-3 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Mostra Fila Pre-envio se tiver leads raspados nao iniciados */}
                  {scrapedLeads.length > 0 && scrapedLeads.map((lead, idx) => (
                    <tr key={`sc-${idx}`} className="bg-black/30 hover:bg-white/5 transition-colors group">
                      <td className="px-4 py-4 rounded-l-lg border-l-2 border-yellow-500/50">
                        <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded text-xs font-bold uppercase">Revisão</span>
                      </td>
                      <td className="px-4 py-4 font-medium text-white">{lead.name}</td>
                      <td className="px-4 py-4 text-chrome/80 font-mono tracking-tight">{lead.phone}</td>
                      <td className="px-4 py-4 rounded-r-lg text-right">
                        <button onClick={() => removeLocalLead(idx)} className="text-chrome/30 hover:text-red-500 transition-colors p-2">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Mostra a Fila Principal do Servidor se estiver vazia a local tb */}
                  {scrapedLeads.length === 0 && queueData.leads.length > 0 && queueData.leads.map((lead, idx) => (
                    <tr key={`q-${idx}`} className={`bg-black/30 hover:bg-white/5 transition-colors
                        ${idx === queueData.currentIndex ? 'border-l-2 border-neon' : ''}
                        ${lead.status === 'sent' ? 'opacity-50' : ''}
                     `}>
                      <td className={`px-4 py-4 rounded-l-lg
                         ${idx === queueData.currentIndex ? 'border-l-2 border-neon' : ''}
                       `}>
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-4 py-4 font-medium text-white">{lead.name}</td>
                      <td className="px-4 py-4 text-chrome/80 font-mono tracking-tight">{lead.phone}</td>
                      <td className="px-4 py-4 rounded-r-lg text-right text-chrome/30 text-xs">
                        {idx === queueData.currentIndex ? 'Em andamento' : ''}
                      </td>
                    </tr>
                  ))}

                  {scrapedLeads.length === 0 && queueData.leads.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-20 text-chrome/30">
                        Nenhum lead na fila.<br />Configure uma campanha e busque novos contatos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const StatusBadge = ({ status }) => {
  switch (status) {
    case 'pending': return <span className="text-blue-400 bg-blue-400/10 px-2 py-1 rounded text-xs font-bold uppercase">Aguardando</span>;
    case 'sent': return <span className="text-neon bg-neon/10 px-2 py-1 rounded text-xs font-bold uppercase">Enviado</span>;
    case 'failed': return <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded text-xs font-bold uppercase">Falha</span>;
    case 'skipped': return <span className="text-chrome/50 border border-chrome/20 px-2 py-1 rounded text-xs font-bold uppercase">Pulado (Duplicado)</span>;
    default: return <span>{status}</span>;
  }
};

export default App;
