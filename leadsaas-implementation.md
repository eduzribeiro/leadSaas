# Plano de Implementação: LeadSaaS 2026

## 🎯 Objetivo
Criar uma ferramenta local de prospecção inteligente usando WhatsApp Web e Raspagem do Google Maps. O sistema será imune à timeouts web comuns, pois rodará como uma aplicação local (Node.js + React).

## 🛠️ Stack Tecnológica
- **Frontend**: React 18, Vite, Tailwind CSS v4 (Cores: Prata Cromado, Cinza Espacial, Verde Claro).
- **Backend**: Node.js, Express (API local).
- **Scraping**: Puppeteer + `puppeteer-extra-plugin-stealth` (Opção A).
- **WhatsApp**: `whatsapp-web.js` + `qrcode-terminal` (Sessão viva e envio de mensagens).
- **Database**: Arquivos locais JSON (`historico.json` e `queue.json`).

## ⚙️ Arquitetura do Sistema

```text
leadsaas/
├── backend/
│   ├── index.js             # Ponto de entrada (Servidor Express)
│   ├── whatsapp.js          # Controle e estado do Whatsapp-web.js (.wwebjs_auth)
│   ├── scraper.js           # Puppeteer Google Maps extractor
│   ├── queueManager.js      # Controle de Fila Persistente (queue.json)
│   ├── historyManager.js    # Controle de Histórico/Filtro (historico.json)
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/      # Cards, Modal de QR Code, Tabela de Leads
    │   ├── App.jsx          # Painel Principal e Roteamento
    │   └── index.css        # Estética NexaTech 2026
    └── package.json
```

## 📍 Fases de Desenvolvimento

### Fase 1: Fundação Node.js e WhatsApp Engine
- Inicializar servidor Express na porta 3001.
- Integrar `whatsapp-web.js` com persistência em `.wwebjs_auth`.
- Criar endpoint para ler o status da conexão e gerar QR Code Base64 pro Front.
- Implementar função de envio de texto com delay dinâmico (300 a 720s) e checagem de horário (09:00 - 18:00).
- Integrar verificação com `historico.json`.

### Fase 2: Motor de Raspagem (Google Maps)
- Implementar `puppeteer-extra` com o plugin `stealth`.
- Criar script que acessa o Google Maps, pesquisa `${nicho} em ${cidade}` e raspa as páginas.
- Filtrar resultados apenas com telefones que possam ser WhatsApp (excluir tel fixo primário ou tratar formatação +55).
- Expor endpoint para buscar e retornar JSON no Front.

### Fase 3: Fila de Tarefas (Queue Management)
- Desenvolver a persistência `queue.json` (Fase P1 - Opção A).
- Permitir pausa e retomada imediata (Botões PAUSAR / RETOMAR).
- Enviar status em tempo real via Server-Sent Events (SSE) ou polling para o React.

### Fase 4: Interface de Usuário (Frontend 2026)
- Desenhada sob o padrão `frontend-specialist`.
- Integrar os tons Cinza Espacial (#1A1A1A), Prata Cromado (#E0E0E0), Verde Claro (#4ADE80).
- Construir Header com Logo e Logout de Sessão WPP.
- Construir Painel de Automação com formulário (Nicho, Cidade, Textarea).
- Tabela de Fila de Espera com botão de "Aprovar/Iniciar Todos" e "Remover Unitário".

### Fase 5: Ajustes Finais e Documentação
- Rodar `checklist.py` de lint e UX local.
- Gerar guia final de "Como Rodar Localmente" para o usuário.
