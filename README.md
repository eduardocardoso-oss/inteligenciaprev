# Inteligência Prev Dashboard

Dashboard de gestão previdenciária da Inteligência Prev.

## Estrutura inicial

- `frontend/` → interface do dashboard
  - `index.html` → aplicação inteira (HTML, CSS e JS em um único arquivo)
  - `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` → ícones
  - `assets/` → logo (símbolo e versões horizontais clara/escura)
  - `api/gas.js` → proxy da Vercel para o Apps Script
- `backend/` → backend em Google Apps Script

## Ambientes planejados

- Produção: `app.inteligenciaprev.com.br`
- Teste: `teste.inteligenciaprev.com.br`

## Controle de versão

As alterações devem ser testadas antes de serem promovidas para produção.

## Estado atual

A primeira versão versionada parte da versão funcional v27 do dashboard, já contendo:

- autenticação por e-mail + PIN
- sessões
- permissões por aba
- log de auditoria
- To-do do time
- Estoque Checklist
- Estoque Operação
- Estoque Retificação
- Diretoria / Performance
- correções visuais de filtros e informativos

## Próximos passos

1. Colocar esta versão sob controle do GitHub.
2. Criar ambiente de homologação.
3. Hospedar o frontend fora do Apps Script.
4. Adaptar a comunicação `google.script.run` para uma API HTTP.
5. Configurar `teste.inteligenciaprev.com.br`.
6. Validar o sistema.
7. Configurar `app.inteligenciaprev.com.br`.
