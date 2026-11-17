# Changelog

Todas as alterações relevantes do dashboard serão registradas neste arquivo.

## v2.1.0 - 2026-11-17

Nova aba **Resultados do Time**, feita para a TV da Studio. Ela reproduz a apresentação do Canva "Acompanhamento de métricas mensais": abertura, um slide por colaborador com foto e o resultado do mês corrente, e o encerramento "Legado se constrói em grupo".

### Indicadores

Todas as quantidades contam empresas únicas (linhas repetidas da mesma empresa contam uma vez).

- Checklist (Yasmin Nunes): jobs para a Operação e jobs sem perfil, entre os checklists concluídos no mês.
- Jobs PRO e Operação (Luiz Neto, Letícia Oliveira e Brenda Guterres): jobs entregues (Data Finalização Revisão no mês) e valores analisados.
- Revisão (Mayan Sampaio): jobs revisados (Data Finalização Revisão no mês) e valor total.
- Retificação (Ellen Rogowski e Letícia da Silva): retificações entregues e honorários gerados.
- Automações (Igor Paz): empresas retificadas com o Robô Studio e honorários gerados.
- Valores analisados e valor total somam o Valor do Estoque de Créditos pelo número do job, com o mesmo cruzamento de job da SLA Operação.
- Honorários: Valor Retificação × Honorário %, a mesma regra do relatório da Retificação.

### Tela

- Fundo, ondas, ícones e moldura convertidos do PDF original do Canva (`frontend/assets/tv/`); fotos da equipe em `frontend/assets/equipe/`.
- Fontes: Montserrat e Open Sans, as mesmas do Canva; DM Sans substitui a TT Commons Pro, que não é livre.
- Troca de slide a cada 10 s a 1 min (padrão 15 s), com pausa e navegação pelas setas.
- Botão **Modo TV** abre em tela cheia; o endereço com `?tv` já entra direto no modo TV.
- Os números se atualizam junto com o refresh automático de 2 minutos, sem reiniciar a apresentação.
- Tabela-resumo com os mesmos números (exportável) e metodologia dos cálculos.

### Backend

- Nova permissão `resultados` (aliases: "Resultados do Time", "TV"). Quem tem acesso "TODAS" já recebe a aba.
- A permissão carrega Checklist, Operação, Retificação e Estoque de Créditos.

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
