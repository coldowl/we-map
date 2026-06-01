@echo off
setlocal
call "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvarsall.bat" x64
if errorlevel 1 (
    echo Failed to setup VS 2019 environment
    pause
    exit /b 1
)
cd /d D:\Code\we-map
echo Starting Tauri dev...
npx tauri dev
pause
