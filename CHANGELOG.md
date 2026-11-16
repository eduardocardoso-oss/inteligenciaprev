# Changelog

Todas as alterações relevantes do dashboard serão registradas neste arquivo.

## v2.0.0 - 2026-11-13

Nova identidade visual e redesenho completo da interface. Nenhuma regra de negócio, chamada ao backend ou permissão foi alterada.

### Identidade

- Nome de produto "Inteligência Prev" com logo, favicon e ícones de app (`frontend/favicon.svg`, `frontend/assets/`).
- Paleta azul/navy única, com tema claro e escuro (segue o sistema na primeira visita). O tema "GS" foi incorporado à identidade padrão.

### Interface

- CSS reescrito em um único design system, substituindo as camadas acumuladas v9/v11/v17 (de ~4.700 para ~1.300 linhas).
- Barra lateral com ícones, usuário e botão de sair; no celular vira menu deslizante.
- Tela de login redesenhada.
- Filtros em grade fluida (não cortam mais o texto) e tabelas com cabeçalho fixo.
- Correção de textos sobrepostos em cartões com valores longos (honorários, metas, KPIs em R$).

### Dashboards

- Visão Geral: fluxo mensal (entradas no Checklist × diagnósticos entregues), prazos da Operação, carga por analista e honorários da Retificação. Os KPIs levam à aba do estoque.
- Operação: jobs por situação e carga por analista.
- Créditos: valor por tema e por status, respeitando os filtros.
- Diretoria: barra de progresso em Metas × Realizado e gráfico de honorários entregues por competência.
- Gráficos em SVG/HTML puros, sem bibliotecas externas.

## v1.0.0 - 2026-09-15

Primeira versão colocada sob controle de versão no GitHub.

### Incluído

- Base funcional do dashboard previdenciário.
- Login por e-mail e PIN.
- Sessão autenticada.
- Permissões por aba para usuários autorizados.
- Log de auditoria das alterações feitas pelo dashboard.
- To-do do time.
- Estoque Checklist.
- Estoque Operação com edição de:
  - Situação
  - Analista Responsável
  - Revisor
  - Crédito?
- Estoque Retificação com edição de status.
- Diretoria / Performance.
- Atualização periódica do dashboard.
- Correções de sobreposição dos filtros.
- Correções de sobreposição dos informativos.
- Correção de tratamento de valores decimais.
