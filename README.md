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
- Resultados do Time (apresentação para a TV)
- correções visuais de filtros e informativos

## Resultados do Time (TV)

- **Acesso:** na aba "Usuários Autorizados", inclua `Resultados do Time` (ou `TV`) em "Abas Permitidas". Quem tem `TODAS` já vê a aba.
- **Abrir direto na TV:** use o endereço do dashboard com `?tv` no final (ex.: `app.inteligenciaprev.com.br/?tv`). Na TV, a sessão de login dura 12 horas, como nos demais acessos.
- **Fotos:** ficam em `frontend/assets/equipe/`, com o nome da pessoa em minúsculas, sem acento e com hífens (ex.: `yasmin-nunes.jpg`). As atuais foram recortadas do PDF do Canva no mesmo enquadramento dos slides. Para trocar, substitua o arquivo por outro com proporção parecida (cerca de 16:15). Aceita `.jpg`, `.jpeg`, `.png` e `.webp`. Sem foto, o slide mostra as iniciais e o nome.
- **Design:** `frontend/assets/tv/capa.svg`, `colaborador.svg` e `encerramento.svg` são o fundo, as ondas, os ícones e a moldura convertidos do PDF do Canva ("Slide de métrica pessoal"). Textos e fotos são desenhados por cima, nas posições medidas no PDF (`TVR_LAYOUT`).
- **Equipe e regras:** ficam em `TVR_TEAM` e `TVR_KINDS` no `frontend/index.html`.

## Próximos passos

1. Colocar esta versão sob controle do GitHub.
2. Criar ambiente de homologação.
3. Hospedar o frontend fora do Apps Script.
4. Adaptar a comunicação `google.script.run` para uma API HTTP.
5. Configurar `teste.inteligenciaprev.com.br`.
6. Validar o sistema.
7. Configurar `app.inteligenciaprev.com.br`.
