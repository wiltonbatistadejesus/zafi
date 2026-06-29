@echo off
cd /d C:\Users\wilto\Downloads\zafi
echo Enviando mudancas para o Vercel...
git add -A
git commit -m "feat: tracking de afiliados via /go/[id] + pagina de privacidade"
git push
echo.
echo Deploy enviado! Aguarde 1-2 minutos e atualize o site no Vercel.
pause
