# v28 — Integração Vercel + Apps Script

Arquivos desta atualização:

- `frontend/index.html` — dashboard com adaptador `google.script.run` para Vercel.
- `frontend/api/gas.js` — função serverless da Vercel que encaminha as chamadas ao Apps Script.
- `backend/Code.gs` — backend com endpoint `doPost(e)` e lista explícita de ações autorizadas.

## Variáveis da Vercel

- `GAS_WEB_APP_URL`
- `GAS_SHARED_SECRET`

## Script Property do Apps Script

- `VERCEL_SHARED_SECRET`

O valor de `GAS_SHARED_SECRET` e `VERCEL_SHARED_SECRET` deve ser exatamente o mesmo.
