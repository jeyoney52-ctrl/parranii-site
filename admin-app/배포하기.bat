@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ===== 파르라니 관리 앱 배포 =====
if not exist node_modules (
  echo 처음이라 필요한 도구를 설치해요...
  call npm install
)
call npx wrangler whoami >nul 2>&1 || call npx wrangler login
echo.
echo 서버에 올리는 중...
call npx wrangler deploy
if errorlevel 1 (
  echo 올리지 못했어요. 위 내용을 캡처해서 Claude에게 보여 주세요.
  pause
  exit /b 1
)
node tools\setup.mjs
echo.
echo ===== 끝났어요 =====
echo 위에 나온 https://parranii-admin.....workers.dev 주소를 핸드폰에서 열어 주세요.
pause
