@echo off
REM Math-X API launcher. Reads apps\api\.env (routed to LiteLLM via ANTHROPIC_BASE_URL).
REM Port comes from .env (PORT=5000). Run detached by the fleet launcher.
cd /d "%~dp0"
node_modules\.bin\ts-node.cmd src\index.ts
