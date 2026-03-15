@echo off
echo ==============================================
echo        INICIANDO LeadSaaS 2026                 
echo ==============================================
echo.
echo [1/3] Limpando processos travados e cache antigo...
:: Derruba processos Node zumbis para evitar "Localhost Recusou Conexao"
taskkill /f /im node.exe >nul 2>&1

echo [2/3] Iniciando o Servidor Backend (WhatsApp + Scraper)...
start "LeadSaaS - Backend" cmd /k "cd backend && npm start"

echo [3/3] Iniciando a Interface Frontend (React)...
:: O --force limpa o cache do vite, o strictPort recusa bugar a porta
start "LeadSaaS - Interface" cmd /k "cd frontend && npx vite --force --port 5173 --strictPort"

echo.
echo Aguardando o aquecimento dos turbos (5s)...
timeout /t 5 /nobreak >nul

echo Abrindo o Chrome em nova janela...
start chrome --new-window "http://localhost:5173"

echo.
echo Processo concluido! Deixe as 2 janelas pretas abertas.
echo Caso queira PARAR tudo = Clique no X das janelas pretas.
echo ==============================================
pause
