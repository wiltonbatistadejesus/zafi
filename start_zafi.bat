@echo off
taskkill /f /im node.exe 2>nul
start cmd /k "cd /d C:\Users\wilto\Downloads\zafi && npm run dev"
