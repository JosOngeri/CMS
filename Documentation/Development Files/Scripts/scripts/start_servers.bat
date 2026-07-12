@echo off
set "PATH=C:\nvm4w\nodejs;%PATH%"
cd backend
start /b node server.js > server_bg.log 2>&1
cd ..
cd frontend
start /b npx vite --port 5180 --host 0.0.0.0 > vite_bg.log 2>&1
echo Servers starting in background...
