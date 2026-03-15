@echo off
echo ==============================================
echo        INICIANDO LeadSaaS 2026                 
echo ==============================================
echo.
echo Iniciando o Servidor Backend (WhatsApp Engine + Scraper)...
start "LeadSaaS - Backend" cmd /k "cd backend && npm start"

echo.
echo Iniciando a Interface Frontend (React)...
start "LeadSaaS - Interface" cmd /k "cd frontend && npm run dev"

echo.
echo A interface abrira no seu navegador em alguns segundos:
echo http://localhost:5173
echo.
echo Deixe as janelas pretas abertas.
echo ==============================================
pause
