const SPREADSHEET_ID = '1D1gQe09kytZ5GYBEzCySNl5ICNq7cwCaBNLmm7KP9kU';
const BACKEND_VERSION = 'v47-RESULTADOS-DO-TIME-TV';

const COLABORADORES_ATIVOS = [
  'Luiz Neto',
  'Mayan Macedo',
  'Letícia Oliveira',
  'Brenda Guterres',
  'Ellen Rogowski',
  'Felipe Silva',
  'Letícia da Silva',
  'Eduardo Cardoso',
  'Igor Paz',
  'Yasmin Nunes'
];


const AUTH_SESSION_HOURS = 12;

function getAuthSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName('Usuários Autorizados');

  if (!sh) {
    throw new Error(
      'A aba "Usuários Autorizados" não foi encontrada.'
    );
  }

  return sh;
}

function getAuthRows_() {
  const sh = getAuthSheet_();
  const lastRow = sh.getLastRow();
  const lastCol = Math.max(4, sh.getLastColumn());

  if (lastRow < 2) {
    return [];
  }

  const values = sh.getRange(1, 1, lastRow, lastCol)
    .getDisplayValues();

  const headers = values[0].map(
    v => String(v || '').trim()
  );

  const idxEmail = headers.indexOf('E-mail');
  const idxNome = headers.indexOf('Nome');
  const idxAtivo = headers.indexOf('Ativo');
  const idxPin = headers.indexOf('PIN');
  const idxAbasPermitidas = headers.indexOf('Abas Permitidas');

  if (idxEmail < 0 || idxAtivo < 0 || idxPin < 0) {
    throw new Error(
      'A aba "Usuários Autorizados" deve conter as colunas E-mail, Nome, Ativo e PIN.'
    );
  }

  return values.slice(1).map(
    row => ({
      email: String(row[idxEmail] || '').trim().toLowerCase(),
      nome: idxNome >= 0 ? String(row[idxNome] || '').trim() : '',
      ativo: String(row[idxAtivo] || '').trim(),
      pin: String(row[idxPin] || '').trim(),
      abasPermitidasRaw:
        idxAbasPermitidas >= 0
          ? String(row[idxAbasPermitidas] || '').trim()
          : 'TODAS'
    })
  );
}


const DASHBOARD_ABAS = [
  'geral',
  'tarefas',
  'tecnologia',
  'checklist',
  'operacao',
  'slaOperacao',
  'retificacao',
  'creditos',
  'prazoValidacao',
  'temas',
  'diretoria',
  'resultados'
];

function normalizarNomeAbaDashboard_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseAbasPermitidas_(raw) {
  const texto = String(raw || '').trim();

  if (!texto) {
    return DASHBOARD_ABAS.slice();
  }

  const normalizado = normalizarNomeAbaDashboard_(texto);

  if (
    normalizado === 'todas' ||
    normalizado === 'todos' ||
    normalizado === '*' ||
    normalizado === 'acesso total'
  ) {
    return DASHBOARD_ABAS.slice();
  }

  const aliases = {
    'geral': 'geral',
    'visao geral': 'geral',
    'tarefas': 'tarefas',
    'to-do': 'tarefas',
    'to do': 'tarefas',
    'to-do do time': 'tarefas',
    'to do do time': 'tarefas',
    'tecnologia': 'tecnologia',
    'to-do tecnologia': 'tecnologia',
    'to do tecnologia': 'tecnologia',
    'atividades tecnologia': 'tecnologia',
    'atividades de tecnologia': 'tecnologia',
    'checklist': 'checklist',
    'estoque checklist': 'checklist',
    'estoque do checklist': 'checklist',
    'operacao': 'operacao',
    'estoque operacao': 'operacao',
    'estoque da operacao': 'operacao',
    'sla operacao': 'slaOperacao',
    'sla da operacao': 'slaOperacao',
    'sla operação': 'slaOperacao',
    'sla da operação': 'slaOperacao',
    'retificacao': 'retificacao',
    'estoque retificacao': 'retificacao',
    'estoque da retificacao': 'retificacao',
    'creditos': 'creditos',
    'estoque creditos': 'creditos',
    'estoque de creditos': 'creditos',
    'prazo validacao': 'prazoValidacao',
    'prazo de validacao': 'prazoValidacao',
    'estoque prazo validacao': 'prazoValidacao',
    'estoque prazo de validacao': 'prazoValidacao',
    'temas': 'temas',
    'temas previdenciarios': 'temas',
    'diretoria': 'diretoria',
    'diretoria / performance': 'diretoria',
    'diretoria/performance': 'diretoria',
    'performance': 'diretoria',
    'resultados': 'resultados',
    'resultados do time': 'resultados',
    'resultados do mes': 'resultados',
    'resultados por colaborador': 'resultados',
    'tv': 'resultados',
    'tv studio': 'resultados',
    'televisao': 'resultados',
    'modo tv': 'resultados'
  };

  const partes = texto
    .split(/[;,\n|]+/)
    .map(v => normalizarNomeAbaDashboard_(v))
    .filter(Boolean);

  const result = [];

  partes.forEach(parte => {
    const canonica = aliases[parte];
    if (canonica && !result.includes(canonica)) {
      result.push(canonica);
    }
  });

  return result;
}

function usuarioTemPermissaoAba_(usuario, aba) {
  const permitidas =
    usuario && Array.isArray(usuario.abasPermitidas)
      ? usuario.abasPermitidas
      : DASHBOARD_ABAS;

  return permitidas.includes(String(aba || '').trim());
}

function exigirPermissaoAba_(usuario, aba) {
  if (!usuarioTemPermissaoAba_(usuario, aba)) {
    throw new Error(
      'ACESSO_NEGADO|Seu usuário não possui permissão para esta área do dashboard.'
    );
  }
}

function criarTokenSessao_() {
  return (
    Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '')
  );
}

function salvarSessao_(user) {
  const token = criarTokenSessao_();
  const expiresAt =
    Date.now() + AUTH_SESSION_HOURS * 60 * 60 * 1000;

  PropertiesService.getScriptProperties().setProperty(
    'AUTH_SESSION_' + token,
    JSON.stringify({
      email: user.email,
      nome: user.nome || '',
      expiresAt: expiresAt
    })
  );

  return {
    token: token,
    expiresAt: expiresAt
  };
}

function validarSessao_(token) {
  const t = String(token || '').trim();

  if (!t) {
    return null;
  }

  const props = PropertiesService.getScriptProperties();
  const key = 'AUTH_SESSION_' + t;
  const raw = props.getProperty(key);

  if (!raw) {
    return null;
  }

  let session;

  try {
    session = JSON.parse(raw);
  } catch (e) {
    props.deleteProperty(key);
    return null;
  }

  if (!session.expiresAt || Date.now() > Number(session.expiresAt)) {
    props.deleteProperty(key);
    return null;
  }

  const rows = getAuthRows_();

  const user = rows.find(
    r =>
      r.email === String(session.email || '').toLowerCase() &&
      normalizeStatus_(r.ativo) === 'sim'
  );

  if (!user) {
    props.deleteProperty(key);
    return null;
  }

  return {
    email: user.email,
    nome: user.nome || session.nome || '',
    expiresAt: session.expiresAt,
    abasPermitidas: parseAbasPermitidas_(user.abasPermitidasRaw)
  };
}

function exigirSessao_(token) {
  const session = validarSessao_(token);

  if (!session) {
    throw new Error(
      'SESSAO_INVALIDA|Sua sessão expirou ou seu acesso foi removido.'
    );
  }

  return session;
}

function loginDashboardV25(email, pin) {
  const normalizedEmail =
    String(email || '').trim().toLowerCase();

  const normalizedPin =
    String(pin || '').trim();

  if (!normalizedEmail || !normalizedPin) {
    return {
      ok: false,
      message: 'Informe e-mail e PIN.'
    };
  }

  const rows = getAuthRows_();

  const user = rows.find(
    r =>
      r.email === normalizedEmail &&
      normalizeStatus_(r.ativo) === 'sim'
  );

  if (!user) {
    return {
      ok: false,
      message: 'E-mail não autorizado ou acesso inativo.'
    };
  }

  if (!user.pin) {
    return {
      ok: false,
      message:
        'Este usuário ainda não possui PIN cadastrado na aba Usuários Autorizados.'
    };
  }

  if (String(user.pin) !== normalizedPin) {
    Utilities.sleep(250);

    return {
      ok: false,
      message: 'PIN inválido.'
    };
  }

  const session = salvarSessao_(user);

  return {
    ok: true,
    token: session.token,
    expiresAt: session.expiresAt,
    email: user.email,
    nome: user.nome || '',
    abasPermitidas: parseAbasPermitidas_(user.abasPermitidasRaw),
    hours: AUTH_SESSION_HOURS
  };
}

function validarSessaoDashboardV25(token) {
  const session = validarSessao_(token);

  return session
    ? {
        ok: true,
        email: session.email,
        nome: session.nome || '',
        expiresAt: session.expiresAt,
        abasPermitidas: session.abasPermitidas || DASHBOARD_ABAS.slice()
      }
    : {
        ok: false
      };
}

function logoutDashboardV25(token) {
  const t = String(token || '').trim();

  if (t) {
    PropertiesService.getScriptProperties()
      .deleteProperty('AUTH_SESSION_' + t);
  }

  return { ok: true };
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Gestão Previdenciária | Grupo Studio');
}


/**
 * Endpoint HTTP para o frontend hospedado fora do Apps Script.
 * A Vercel chama este endpoint de forma servidor-servidor.
 * Configure a Script Property VERCEL_SHARED_SECRET antes de usar.
 */
function doPost(e) {
  try {
    const body = JSON.parse(
      e && e.postData && e.postData.contents
        ? e.postData.contents
        : '{}'
    );

    const configuredSecret =
      PropertiesService.getScriptProperties()
        .getProperty('VERCEL_SHARED_SECRET');

    if (!configuredSecret) {
      throw new Error(
        'API_NAO_CONFIGURADA|A Script Property VERCEL_SHARED_SECRET não foi configurada.'
      );
    }

    if (
      !body.secret ||
      String(body.secret) !== String(configuredSecret)
    ) {
      throw new Error('ACESSO_NEGADO|Chave de integração inválida.');
    }

    const action = String(body.action || '').trim();
    const args = Array.isArray(body.args) ? body.args : [];

    const actions = {
      loginDashboardV25: function() {
        return loginDashboardV25.apply(null, args);
      },
      validarSessaoDashboardV25: function() {
        return validarSessaoDashboardV25.apply(null, args);
      },
      logoutDashboardV25: function() {
        return logoutDashboardV25.apply(null, args);
      },
      getDashboardData: function() {
        return getDashboardData.apply(null, args);
      },
      marcarAtualizacaoEstoqueV362: function() {
        return marcarAtualizacaoEstoqueV362.apply(null, args);
      },
      salvarNovaTarefaV6: function() {
        return salvarNovaTarefaV6.apply(null, args);
      },
      alterarStatusTarefaV6: function() {
        return alterarStatusTarefaV6.apply(null, args);
      },
      excluirTarefaV26: function() {
        return excluirTarefaV26.apply(null, args);
      },
      salvarTarefaTecnologiaV37: function() {
        return salvarTarefaTecnologiaV37.apply(null, args);
      },
      alterarStatusTarefaTecnologiaV37: function() {
        return alterarStatusTarefaTecnologiaV37.apply(null, args);
      },
      alterarCampoTarefaTecnologiaV37: function() {
        return alterarCampoTarefaTecnologiaV37.apply(null, args);
      },
      excluirTarefaTecnologiaV37: function() {
        return excluirTarefaTecnologiaV37.apply(null, args);
      },
      alterarSituacaoOperacaoV14: function() {
        return alterarSituacaoOperacaoV14.apply(null, args);
      },
      alterarCampoOperacaoV26: function() {
        return alterarCampoOperacaoV26.apply(null, args);
      },
      alterarStatusChecklistV23: function() {
        return alterarStatusChecklistV23.apply(null, args);
      },
      alterarCampoChecklistV41: function() {
        return alterarCampoChecklistV41.apply(null, args);
      },
      alterarStatusRetificacaoV15: function() {
        return alterarStatusRetificacaoV15.apply(null, args);
      },
      alterarMetodoRetificacaoV36: function() {
        return alterarMetodoRetificacaoV36.apply(null, args);
      },
      alterarAnalistaRetificacaoV32: function() {
        return alterarAnalistaRetificacaoV32.apply(null, args);
      },
      alterarCampoRetificacaoV40: function() {
        return alterarCampoRetificacaoV40.apply(null, args);
      },
      alterarStatusPrazoValidacaoV319: function() {
        return alterarStatusPrazoValidacaoV319.apply(null, args);
      },
      alterarAnalistaPrazoValidacaoV33: function() {
        return alterarAnalistaPrazoValidacaoV33.apply(null, args);
      },
      aplicarValidacoesColaboradoresV353: function() {
        return aplicarValidacoesColaboradoresV353.apply(null, args);
      },
      salvarMetasDiretoriaV22: function() {
        return salvarMetasDiretoriaV22.apply(null, args);
      }
    };

    if (!actions[action]) {
      throw new Error(
        'ACAO_NAO_PERMITIDA|Ação não autorizada pela API: ' + action
      );
    }

    const result = actions[action]();

    return ContentService
      .createTextOutput(
        JSON.stringify({
          ok: true,
          result: result === undefined ? null : result
        })
      )
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(
        JSON.stringify({
          ok: false,
          error: err && err.message
            ? err.message
            : String(err || 'Erro desconhecido')
        })
      )
      .setMimeType(ContentService.MimeType.JSON);
  }
}


function getSheetByNameFlexible_(ss, expectedName) {
  const target = normalizarNomeAbaDashboard_(expectedName);

  return ss.getSheets().find(
    sh => normalizarNomeAbaDashboard_(sh.getName()) === target
  ) || null;
}

function checklistOperationReference_(sheet) {
  if (!sheet) return [];

  const rows = sheetToObjects_(sheet);

  return rows.map(r => ({
    'Número do Job': r['Número do Job'] || '',
    'Data da Entrada na Operação': r['Data da Entrada na Operação'] || ''
  })).filter(
    r => String(r['Número do Job'] || '').trim()
  );
}


function aplicarValidacoesColaboradoresV353(authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const regra = collaboratorValidationRuleV353_();
  const resultados = [];

  const defs = [
    ['Estoque Operação', ['Analista Responsável', 'Revisor']],
    ['Estoque Retificação', ['Analista']],
    ['Estoque Prazo de Validação', ['Analista']],
    ['Atividades Equipe', ['Responsável']],
    ['Atividades Tecnologia', ['Responsável']]
  ];

  defs.forEach(function(def) {
    const sh = getSheetByNameFlexible_(ss, def[0]);
    if (!sh) return;

    const lastCol = sh.getLastColumn();
    const headers = sh.getRange(1, 1, 1, lastCol)
      .getDisplayValues()[0]
      .map(function(h) { return String(h || '').trim(); });

    def[1].forEach(function(header) {
      let col = headers.indexOf(header) + 1;

      if (col <= 0 && def[0] === 'Estoque Prazo de Validação' && header === 'Analista') {
        col = lastCol + 1;
        sh.getRange(1, col).setValue('Analista');
      }

      if (col <= 0) return;

      const startRow = 2;
      const rows = Math.max(sh.getMaxRows() - 1, 1);
      const regraAplicar =
        def[0] === 'Estoque Operação'
          ? operationCollaboratorValidationRuleV38_()
          : regra;

      sh.getRange(startRow, col, rows, 1).setDataValidation(regraAplicar);

      resultados.push(def[0] + ' • ' + header);
    });
  });

  registrarLogDashboard_(ss, usuarioAcesso, {
    aba: 'Configuração',
    acao: 'Padronizar validações de colaboradores',
    registro: 'Dashboard',
    campo: 'Colaboradores',
    anterior: '',
    novo: COLABORADORES_ATIVOS.join(', ')
  });

  return {
    ok: true,
    backendVersion: BACKEND_VERSION,
    atualizadas: resultados,
    message: 'Validações de colaboradores atualizadas no Sheets.'
  };
}



const OVERVIEW_STOCK_UPDATE_KEY_V362='OVERVIEW_STOCK_UPDATES_V362';
const OVERVIEW_STOCK_UPDATE_LABELS_V362={
  checklist:'Checklist',
  operacao:'Operação',
  fim:'Fim',
  retificacao:'Retificação',
  prazoValidacao:'Prazo de Validação'
};

function overviewStockUpdatesV362_() {
  const props=PropertiesService.getScriptProperties();
  let data={};

  try{
    data=JSON.parse(
      props.getProperty(OVERVIEW_STOCK_UPDATE_KEY_V362) || '{}'
    ) || {};
  }catch(e){
    data={};
  }

  const tz=
    SpreadsheetApp.openById(SPREADSHEET_ID).getSpreadsheetTimeZone() ||
    Session.getScriptTimeZone();

  const out={};

  Object.keys(OVERVIEW_STOCK_UPDATE_LABELS_V362).forEach(function(key){
    const iso=String(data[key]||'').trim();
    let dataKey='';
    let ultimaAtualizacao='';

    if(iso){
      const d=new Date(iso);

      if(!isNaN(d.getTime())){
        dataKey=Utilities.formatDate(d,tz,'yyyy-MM-dd');
        ultimaAtualizacao=Utilities.formatDate(d,tz,'dd/MM/yyyy HH:mm');
      }
    }

    out[key]={
      label:OVERVIEW_STOCK_UPDATE_LABELS_V362[key],
      dataKey:dataKey,
      ultimaAtualizacao:ultimaAtualizacao,
      atualizadoHoje:dataKey===Utilities.formatDate(new Date(),tz,'yyyy-MM-dd')
    };
  });

  return out;
}

function marcarAtualizacaoEstoqueV362(chave, authToken) {
  const usuarioAcesso=exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso,'geral');

  const key=String(chave||'').trim();

  if(!OVERVIEW_STOCK_UPDATE_LABELS_V362[key]){
    throw new Error('Estoque inválido: '+key);
  }

  const props=PropertiesService.getScriptProperties();
  let data={};

  try{
    data=JSON.parse(
      props.getProperty(OVERVIEW_STOCK_UPDATE_KEY_V362) || '{}'
    ) || {};
  }catch(e){
    data={};
  }

  data[key]=new Date().toISOString();

  props.setProperty(
    OVERVIEW_STOCK_UPDATE_KEY_V362,
    JSON.stringify(data)
  );

  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);

  registrarLogDashboard_(ss,usuarioAcesso,{
    aba:'Visão Geral',
    acao:'Atualização diária de estoque',
    registro:OVERVIEW_STOCK_UPDATE_LABELS_V362[key],
    campo:'Status atualização diária',
    anterior:'',
    novo:'Atualizado'
  });

  return {
    ok:true,
    atualizacoes:overviewStockUpdatesV362_(),
    message:OVERVIEW_STOCK_UPDATE_LABELS_V362[key]+' atualizado agora.'
  };
}


const TECNOLOGIA_CLASSIFICACOES_V37 = [
  'Tax Lumen',
  'Retificação',
  'Compensação',
  'Operação'
];

const TECNOLOGIA_STATUS_V37 = [
  'Pendente',
  'Em Andamento',
  'Concluído'
];

function getAtividadesTecnologiaSheetV37_(ss) {
  const candidatos = [
    'Atividades Tecnologia',
    'Atividades de Tecnologia',
    'Demandas Tecnologia',
    'Demandas de Tecnologia'
  ];

  for (let i = 0; i < candidatos.length; i++) {
    const sh = getSheetByNameFlexible_(ss, candidatos[i]);
    if (sh) return sh;
  }

  return null;
}

function headersTecnologiaV37_(sh) {
  return sh
    .getRange(1, 1, 1, sh.getLastColumn())
    .getDisplayValues()[0]
    .map(function(h) {
      return String(h || '').trim();
    });
}

function colTecnologiaV37_(headers, name) {
  return headers.indexOf(name) + 1;
}

function tecnologiaValidationListV37_(values) {
  return SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
}

function aplicarValidacoesTecnologiaV37_(sh, row, headers) {
  const cClass = colTecnologiaV37_(headers, 'Classificação');
  const cStatus = colTecnologiaV37_(headers, 'Status');
  const cResp = colTecnologiaV37_(headers, 'Responsável');

  if (cClass > 0) {
    sh.getRange(row, cClass).setDataValidation(
      tecnologiaValidationListV37_(TECNOLOGIA_CLASSIFICACOES_V37)
    );
  }

  if (cStatus > 0) {
    sh.getRange(row, cStatus).setDataValidation(
      tecnologiaValidationListV37_(TECNOLOGIA_STATUS_V37)
    );
  }

  if (cResp > 0) {
    aplicarValidacaoColaboradorV353_(sh.getRange(row, cResp));
  }
}

function salvarTarefaTecnologiaV37(payload, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'tecnologia');

  payload = payload || {};

  const tarefa = String(payload.tarefa || '').trim();
  const classificacao = String(payload.classificacao || '').trim();
  const status = String(payload.status || 'Pendente').trim();
  const responsavel = canonicalCollaboratorV352_(payload.responsavel);
  const prazo = payload.prazo ? parseIsoDate_(payload.prazo) : '';
  const observacoes = String(payload.observacoes || '').trim();

  if (!tarefa) {
    throw new Error('Informe a tarefa.');
  }

  if (!TECNOLOGIA_CLASSIFICACOES_V37.includes(classificacao)) {
    throw new Error(
      'Classificação inválida. Permitidas: ' +
      TECNOLOGIA_CLASSIFICACOES_V37.join(', ')
    );
  }

  if (!TECNOLOGIA_STATUS_V37.includes(status)) {
    throw new Error(
      'Status inválido. Permitidos: ' +
      TECNOLOGIA_STATUS_V37.join(', ')
    );
  }

  if (responsavel && !COLABORADORES_ATIVOS.includes(responsavel)) {
    throw new Error(
      'Responsável inválido. Permitidos: ' +
      COLABORADORES_ATIVOS.join(', ')
    );
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getAtividadesTecnologiaSheetV37_(ss);

  if (!sh) {
    throw new Error(
      'A aba de tecnologia não foi encontrada. Use o nome "Atividades Tecnologia".'
    );
  }

  const headers = headersTecnologiaV37_(sh);

  const cEntrada = colTecnologiaV37_(headers, 'Data de Entrada');
  const cTarefa = colTecnologiaV37_(headers, 'Tarefa');
  const cClass = colTecnologiaV37_(headers, 'Classificação');
  const cStatus = colTecnologiaV37_(headers, 'Status');
  const cResp = colTecnologiaV37_(headers, 'Responsável');
  const cPrazo = colTecnologiaV37_(headers, 'Prazo');
  const cFinal = colTecnologiaV37_(headers, 'Data Finalização');
  const cObs = colTecnologiaV37_(headers, 'Observações');

  const required = [
    ['Data de Entrada', cEntrada],
    ['Tarefa', cTarefa],
    ['Classificação', cClass],
    ['Status', cStatus],
    ['Responsável', cResp],
    ['Prazo', cPrazo],
    ['Data Finalização', cFinal]
  ].filter(function(x) {
    return x[1] <= 0;
  });

  if (required.length) {
    throw new Error(
      'Faltam colunas na aba Atividades Tecnologia: ' +
      required.map(function(x) { return x[0]; }).join(', ')
    );
  }

  const row = sh.getLastRow() + 1;

  if (row > sh.getMaxRows()) {
    sh.insertRowsAfter(sh.getMaxRows(), 20);
  }

  // Copia formatação/validações da linha anterior quando houver.
  if (row > 2) {
    try {
      sh.getRange(row - 1, 1, 1, sh.getLastColumn())
        .copyTo(
          sh.getRange(row, 1, 1, sh.getLastColumn()),
          SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
          false
        );
    } catch (e) {}
  }

  aplicarValidacoesTecnologiaV37_(sh, row, headers);

  taskSetValue_(sh, row, cEntrada, new Date(), 'dd/MM/yyyy HH:mm:ss');
  taskSetValue_(sh, row, cTarefa, tarefa);
  taskSetValue_(sh, row, cClass, classificacao);
  taskSetValue_(sh, row, cStatus, status);
  taskSetValue_(sh, row, cResp, responsavel);

  if (prazo) {
    taskSetValue_(sh, row, cPrazo, prazo, 'dd/MM/yyyy');
  } else {
    taskSetValue_(sh, row, cPrazo, '');
  }

  if (normalizeStatus_(status) === 'concluido') {
    taskSetValue_(sh, row, cFinal, new Date(), 'dd/MM/yyyy HH:mm:ss');
  } else {
    taskSetValue_(sh, row, cFinal, '');
  }

  if (cObs > 0) {
    taskSetValue_(sh, row, cObs, observacoes);
  }

  SpreadsheetApp.flush();

  registrarLogDashboard_(ss, usuarioAcesso, {
    aba: 'Atividades Tecnologia',
    acao: 'Criar atividade',
    registro: tarefa,
    campo: 'Tarefa',
    anterior: '',
    novo: tarefa
  });

  return {
    ok: true,
    row: row,
    message: 'Atividade de tecnologia adicionada com sucesso.'
  };
}

function alterarStatusTarefaTecnologiaV37(rowNumber, novoStatus, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'tecnologia');

  const row = Number(rowNumber);
  const status = String(novoStatus || '').trim();

  if (!Number.isInteger(row) || row < 2) {
    throw new Error('Linha inválida: ' + rowNumber);
  }

  if (!TECNOLOGIA_STATUS_V37.includes(status)) {
    throw new Error(
      'Status inválido. Permitidos: ' +
      TECNOLOGIA_STATUS_V37.join(', ')
    );
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getAtividadesTecnologiaSheetV37_(ss);

  if (!sh) {
    throw new Error('A aba "Atividades Tecnologia" não foi encontrada.');
  }

  if (row > sh.getLastRow()) {
    throw new Error('A atividade não existe mais na planilha.');
  }

  const headers = headersTecnologiaV37_(sh);
  const cStatus = colTecnologiaV37_(headers, 'Status');
  const cFinal = colTecnologiaV37_(headers, 'Data Finalização');
  const cTarefa = colTecnologiaV37_(headers, 'Tarefa');

  if (cStatus <= 0 || cFinal <= 0) {
    throw new Error(
      'As colunas Status e Data Finalização são obrigatórias.'
    );
  }

  const anterior = String(
    sh.getRange(row, cStatus).getDisplayValue() || ''
  ).trim();

  aplicarValidacoesTecnologiaV37_(sh, row, headers);
  sh.getRange(row, cStatus).setValue(status);

  if (normalizeStatus_(status) === 'concluido') {
    sh.getRange(row, cFinal)
      .setValue(new Date())
      .setNumberFormat('dd/MM/yyyy HH:mm:ss');
  } else {
    sh.getRange(row, cFinal).clearContent();
  }

  SpreadsheetApp.flush();

  const tarefa =
    cTarefa > 0
      ? String(sh.getRange(row, cTarefa).getDisplayValue() || '').trim()
      : ('Linha ' + row);

  registrarLogDashboard_(ss, usuarioAcesso, {
    aba: 'Atividades Tecnologia',
    acao: 'Alterar status',
    registro: tarefa || ('Linha ' + row),
    campo: 'Status',
    anterior: anterior,
    novo: status
  });

  return {
    ok: true,
    row: row,
    status: status,
    message: 'Status da atividade de tecnologia atualizado.'
  };
}

function alterarCampoTarefaTecnologiaV37(rowNumber, campo, novoValor, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'tecnologia');

  const row = Number(rowNumber);
  const header = String(campo || '').trim();

  if (!Number.isInteger(row) || row < 2) {
    throw new Error('Linha inválida: ' + rowNumber);
  }

  if (!['Classificação', 'Responsável'].includes(header)) {
    throw new Error('Campo não permitido: ' + header);
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getAtividadesTecnologiaSheetV37_(ss);

  if (!sh) {
    throw new Error('A aba "Atividades Tecnologia" não foi encontrada.');
  }

  const headers = headersTecnologiaV37_(sh);
  const col = colTecnologiaV37_(headers, header);

  if (col <= 0) {
    throw new Error('Coluna não encontrada: ' + header);
  }

  let value = String(novoValor || '').trim();

  if (header === 'Responsável') {
    value = canonicalCollaboratorV352_(value);

    if (value && !COLABORADORES_ATIVOS.includes(value)) {
      throw new Error(
        'Responsável inválido. Permitidos: ' +
        COLABORADORES_ATIVOS.join(', ')
      );
    }
  }

  if (
    header === 'Classificação' &&
    value &&
    !TECNOLOGIA_CLASSIFICACOES_V37.includes(value)
  ) {
    throw new Error(
      'Classificação inválida. Permitidas: ' +
      TECNOLOGIA_CLASSIFICACOES_V37.join(', ')
    );
  }

  const anterior = String(
    sh.getRange(row, col).getDisplayValue() || ''
  ).trim();

  aplicarValidacoesTecnologiaV37_(sh, row, headers);

  if (value) {
    sh.getRange(row, col).setValue(value);
  } else {
    sh.getRange(row, col).clearContent();
  }

  SpreadsheetApp.flush();

  registrarLogDashboard_(ss, usuarioAcesso, {
    aba: 'Atividades Tecnologia',
    acao: 'Alterar campo',
    registro: 'Linha ' + row,
    campo: header,
    anterior: anterior,
    novo: value
  });

  return {
    ok: true,
    row: row,
    campo: header,
    valor: value,
    message: header + ' atualizado.'
  };
}

function excluirTarefaTecnologiaV37(rowNumber, tarefaEsperada, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'tecnologia');

  const row = Number(rowNumber);

  if (!Number.isInteger(row) || row < 2) {
    throw new Error('Linha inválida: ' + rowNumber);
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getAtividadesTecnologiaSheetV37_(ss);

  if (!sh) {
    throw new Error('A aba "Atividades Tecnologia" não foi encontrada.');
  }

  const headers = headersTecnologiaV37_(sh);
  const cTarefa = colTecnologiaV37_(headers, 'Tarefa');

  if (cTarefa <= 0) {
    throw new Error('Coluna "Tarefa" não encontrada.');
  }

  const atual = String(
    sh.getRange(row, cTarefa).getDisplayValue() || ''
  ).trim();

  const esperada = String(tarefaEsperada || '').trim();

  if (esperada && atual !== esperada) {
    throw new Error(
      'A linha mudou desde a última atualização. Atualize o dashboard e tente novamente.'
    );
  }

  registrarLogDashboard_(ss, usuarioAcesso, {
    aba: 'Atividades Tecnologia',
    acao: 'Excluir atividade',
    registro: atual || ('Linha ' + row),
    campo: 'Registro',
    anterior: atual,
    novo: 'EXCLUÍDO'
  });

  sh.deleteRow(row);
  SpreadsheetApp.flush();

  return {
    ok: true,
    row: row,
    message: 'Atividade de tecnologia excluída.'
  };
}


function normalizeChecklistRowsV41_(rows) {
  return (rows || []).map(function(row) {
    const r = Object.assign({}, row);

    const finalizacao =
      r['Data Finalização Checklist'] ||
      r['Data Finalização Checkist'] ||
      '';

    const funcionarios =
      r['Número de Funcionários'] ||
      r['Quantidade Média Funcionários'] ||
      r['Quantidade Média de Funcionários'] ||
      '';

    const dctf =
      r['DCTFWeb Média'] ||
      r['Valor Médio DCTFWeb'] ||
      '';

    const certificado =
      r['Certificado Digital'] ||
      r['Certificado'] ||
      '';

    const observacao =
      r['Observação'] ||
      r['Observações'] ||
      '';

    const prazoProcuracao =
      r['Prazo Procuração'] ||
      r['Prazo Procuracao'] ||
      '';

    r['Data Finalização Checklist'] = finalizacao;
    r['Data Finalização Checkist'] = finalizacao;

    r['Número de Funcionários'] = funcionarios;
    r['Quantidade Média Funcionários'] = funcionarios;
    r['Quantidade Média de Funcionários'] = funcionarios;

    r['DCTFWeb Média'] = dctf;
    r['Valor Médio DCTFWeb'] = dctf;

    r['Certificado Digital'] = certificado;
    r['Certificado'] = certificado;

    r['Observação'] = observacao;
    r['Observações'] = observacao;

    r['Prazo Procuração'] = prazoProcuracao;

    r['Status'] = String(r['Status'] || '').trim() || 'Pendente';

    return r;
  });
}

function checklistHeadersV41_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn())
    .getDisplayValues()[0]
    .map(function(h) { return String(h || '').trim(); });
}

function checklistFindColumnV41_(headers, aliases) {
  for (let i = 0; i < aliases.length; i++) {
    const idx = headers.indexOf(aliases[i]);
    if (idx >= 0) return idx + 1;
  }
  return 0;
}

function checklistEnsureColumnV41_(sh, headers, preferred, aliases) {
  let col = checklistFindColumnV41_(headers, [preferred].concat(aliases || []));
  if (col > 0) return col;

  col = sh.getLastColumn() + 1;
  sh.getRange(1, col).setValue(preferred);
  headers.push(preferred);
  return col;
}

function checklistStatusRuleV41_() {
  return SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pendente', 'Concluído'], true)
    .setAllowInvalid(false)
    .build();
}

function checklistFormatCurrencyV41_(cell, rawValue) {
  const n = parseNumeroBRDashboard_(rawValue);

  if (String(rawValue || '').trim() === '') {
    cell.clearContent();
    return;
  }

  if (n === null || !isFinite(n)) {
    throw new Error('Informe um valor monetário válido.');
  }

  cell.setValue(n).setNumberFormat('R$ #,##0.00');
}

function checklistParseIntegerV41_(rawValue) {
  const raw = String(rawValue || '').trim();

  if (!raw) return '';

  const n = Number(raw.replace(/\./g, '').replace(',', '.'));

  if (!isFinite(n) || n < 0) {
    throw new Error('Informe um número de funcionários válido.');
  }

  return Math.round(n);
}


function normalizeJobCrossV412_(value) {
  return String(value || '').trim().toLowerCase();
}

function parseDateFlexibleV412_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      12, 0, 0
    );
  }

  const raw = String(value || '').trim();
  if (!raw) return null;

  let m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);

  if (m) {
    const d = new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1]),
      12, 0, 0
    );

    return isNaN(d.getTime()) ? null : d;
  }

  m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (m) {
    const d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      12, 0, 0
    );

    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(raw);

  if (isNaN(d.getTime())) return null;

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    12, 0, 0
  );
}

function earlierDateV412_(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return a.getTime() <= b.getTime() ? a : b;
}

function buildJobDateMapV412_(sheet, jobAliases, dateAliases) {
  const map = new Map();

  if (!sheet || sheet.getLastRow() < 2) {
    return map;
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  const display = sheet
    .getRange(1, 1, lastRow, lastCol)
    .getDisplayValues();

  const raw = sheet
    .getRange(1, 1, lastRow, lastCol)
    .getValues();

  const headers = display[0].map(
    h => String(h || '').trim()
  );

  const findCol = aliases => {
    for (let i = 0; i < aliases.length; i++) {
      const idx = headers.indexOf(aliases[i]);
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const jobCol = findCol(jobAliases);
  const dateCol = findCol(dateAliases);

  if (jobCol < 0) return map;

  for (let r = 1; r < display.length; r++) {
    const job = normalizeJobCrossV412_(display[r][jobCol]);

    if (!job) continue;

    const date =
      dateCol >= 0
        ? parseDateFlexibleV412_(
            raw[r][dateCol] || display[r][dateCol]
          )
        : null;

    if (!map.has(job)) {
      map.set(job, date);
    } else {
      map.set(
        job,
        earlierDateV412_(map.get(job), date)
      );
    }
  }

  return map;
}


function buildOperationChecklistMapV45_(sheet) {
  const map = new Map();

  if (!sheet || sheet.getLastRow() < 2) {
    return map;
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  const display = sheet
    .getRange(1, 1, lastRow, lastCol)
    .getDisplayValues();

  const raw = sheet
    .getRange(1, 1, lastRow, lastCol)
    .getValues();

  const headers = display[0].map(
    h => String(h || '').trim()
  );

  const findCol = aliases => {
    for (let i = 0; i < aliases.length; i++) {
      const idx = headers.indexOf(aliases[i]);
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const jobCol = findCol(['Número do Job']);
  const dateCol = findCol([
    'Data da Entrada na Operação',
    'Data Entrada Operação'
  ]);
  const situacaoCol = findCol([
    'Situação',
    'Situacao'
  ]);

  if (jobCol < 0) {
    return map;
  }

  for (let r = 1; r < display.length; r++) {
    const job = normalizeJobCrossV412_(
      display[r][jobCol]
    );

    if (!job) continue;

    const date =
      dateCol >= 0
        ? parseDateFlexibleV412_(
            raw[r][dateCol] || display[r][dateCol]
          )
        : null;

    const situacao =
      situacaoCol >= 0
        ? String(display[r][situacaoCol] || '').trim()
        : '';

    const current = map.get(job);

    map.set(
      job,
      {
        date:
          current
            ? earlierDateV412_(current.date, date)
            : date,
        // Em caso de repetição do Job, usa a última Situação preenchida,
        // pois representa melhor o estado atual da Operação.
        situacao:
          situacao ||
          (current ? current.situacao : '') ||
          ''
      }
    );
  }

  return map;
}

function sincronizarChecklistConcluidoV412_(ss) {
  const shChecklist = ss.getSheetByName('Estoque Checklist');
  const shOperacao = ss.getSheetByName('Estoque Operação');
  const shFim = getSheetByNameFlexible_(ss, 'Estoque Fim');

  if (!shChecklist || shChecklist.getLastRow() < 2) {
    return {
      atualizados: 0,
      datasPreenchidas: 0,
      semDataOrigem: 0
    };
  }

  const opMap = buildOperationChecklistMapV45_(
    shOperacao
  );

  const fimMap = buildJobDateMapV412_(
    shFim,
    ['Número do Job'],
    ['Data Movimentação', 'Data de Movimentação']
  );

  const lastRow = shChecklist.getLastRow();
  let lastCol = shChecklist.getLastColumn();

  // Cabeçalhos uma única vez.
  let headers = shChecklist
    .getRange(1, 1, 1, lastCol)
    .getDisplayValues()[0]
    .map(function(h) { return String(h || '').trim(); });

  const colJob = checklistFindColumnV41_(
    headers,
    ['Número do Job']
  );

  if (colJob <= 0) {
    return {
      atualizados: 0,
      datasPreenchidas: 0,
      semDataOrigem: 0
    };
  }

  // Garante colunas antes de fazer a leitura em bloco.
  const colStatus = checklistEnsureColumnV41_(
    shChecklist,
    headers,
    'Status',
    []
  );

  const colFinal = checklistEnsureColumnV41_(
    shChecklist,
    headers,
    'Data Finalização Checkist',
    ['Data Finalização Checklist']
  );

  const colPerfil = checklistFindColumnV41_(
    headers,
    ['Perfil', 'Empresa tem Perfil']
  );

  // Se novas colunas foram criadas, atualiza a largura da leitura.
  lastCol = shChecklist.getLastColumn();

  const dataRange = shChecklist.getRange(
    2,
    1,
    lastRow - 1,
    lastCol
  );

  const rawValues = dataRange.getValues();
  const displayValues = dataRange.getDisplayValues();

  const statusOut = [];
  const finalOut = [];

  let atualizados = 0;
  let datasPreenchidas = 0;
  let semDataOrigem = 0;
  let precisaGravarStatus = false;
  let precisaGravarFinal = false;

  for (let i = 0; i < rawValues.length; i++) {
    const rowRaw = rawValues[i];
    const rowDisplay = displayValues[i];

    const job = normalizeJobCrossV412_(
      rowDisplay[colJob - 1]
    );

    let statusAtual = String(
      rowDisplay[colStatus - 1] || ''
    ).trim();

    let finalAtualRaw = rowRaw[colFinal - 1];
    let finalAtualDisplay = String(
      rowDisplay[colFinal - 1] || ''
    ).trim();

    let statusNovo = statusAtual;
    let finalNovo = finalAtualRaw || '';

    const perfilAtual =
      colPerfil > 0
        ? String(rowDisplay[colPerfil - 1] || '').trim()
        : '';

    const perfilManualNao =
      normalizarNomeAbaDashboard_(perfilAtual) === 'nao';

    const temOperacao = job && opMap.has(job);
    const temFim = job && fimMap.has(job);

    const opInfo =
      temOperacao
        ? opMap.get(job)
        : null;

    const operacaoEmChecklist =
      temOperacao &&
      normalizarNomeAbaDashboard_(
        opInfo && opInfo.situacao
          ? opInfo.situacao
          : ''
      ) === 'checklist';

    const operacaoValidaParaConclusao =
      temOperacao &&
      !operacaoEmChecklist;

    // Perfil manual = Não também conclui.
    // O Estoque Fim continua prevalecendo como etapa posterior.
    if (job && (perfilManualNao || temFim || operacaoValidaParaConclusao)) {
      if (normalizeStatus_(statusAtual) !== 'concluido') {
        statusNovo = 'Concluído';
        atualizados++;
        precisaGravarStatus = true;
      }

      if (!finalAtualRaw && !finalAtualDisplay) {
        const opDate =
          operacaoValidaParaConclusao && opInfo
            ? opInfo.date
            : null;

        const fimDate =
          temFim
            ? fimMap.get(job)
            : null;

        let dataConclusao = earlierDateV412_(
          opDate,
          fimDate
        );

        if (!dataConclusao && perfilManualNao) {
          dataConclusao = new Date();
        }

        if (dataConclusao) {
          finalNovo = dataConclusao;
          datasPreenchidas++;
          precisaGravarFinal = true;
        } else {
          semDataOrigem++;
        }
      }
    }
    // Regra especial:
    // Job na Operação com Situação "Checklist" continua Pendente.
    // Também corrige linhas que versões anteriores possam ter concluído.
    else if (
      job &&
      operacaoEmChecklist &&
      !temFim &&
      !perfilManualNao
    ) {
      if (normalizeStatus_(statusAtual) !== 'pendente') {
        statusNovo = 'Pendente';
        atualizados++;
        precisaGravarStatus = true;
      }

      if (finalAtualRaw || finalAtualDisplay) {
        finalNovo = '';
        precisaGravarFinal = true;
      }
    }

    statusOut.push([statusNovo]);
    finalOut.push([finalNovo]);
  }

  // Grava somente as colunas alteráveis, em lote.
  if (precisaGravarStatus) {
    const statusRange = shChecklist.getRange(
      2,
      colStatus,
      statusOut.length,
      1
    );

    statusRange
      .setValues(statusOut)
      .setDataValidation(checklistStatusRuleV41_());
  }

  if (precisaGravarFinal) {
    const finalRange = shChecklist.getRange(
      2,
      colFinal,
      finalOut.length,
      1
    );

    finalRange
      .setValues(finalOut)
      .setNumberFormat('dd/MM/yyyy');
  }

  // Sem SpreadsheetApp.flush(): setValues já entra na fila da execução e
  // o restante da leitura ocorre na mesma chamada do servidor.
  return {
    atualizados: atualizados,
    datasPreenchidas: datasPreenchidas,
    semDataOrigem: semDataOrigem
  };
}


function dashboardCacheGetV414_(key) {
  try {
    const cache = CacheService.getScriptCache();
    const raw = cache.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function dashboardCachePutV414_(key, value, seconds) {
  try {
    CacheService
      .getScriptCache()
      .put(
        key,
        JSON.stringify(value),
        Math.max(30, Math.min(Number(seconds) || 120, 600))
      );
  } catch (e) {
    // Cache é opcional; nunca bloqueia o dashboard.
  }
}

function dashboardStaticConfigV414_(ss) {
  const key = 'DASHBOARD_STATIC_CONFIG_V414';
  const cached = dashboardCacheGetV414_(key);

  if (cached) return cached;

  const config = {
    colaboradoresAtivos: COLABORADORES_ATIVOS,
    analistasOperacao: operationCollaboratorsV38_(),
    revisoresOperacao: operationCollaboratorsV38_(),
    tecnologiaClassificacoes:
      typeof TECNOLOGIA_CLASSIFICACOES_V37 !== 'undefined'
        ? TECNOLOGIA_CLASSIFICACOES_V37
        : [],
    tecnologiaStatus:
      typeof TECNOLOGIA_STATUS_V37 !== 'undefined'
        ? TECNOLOGIA_STATUS_V37
        : []
  };

  dashboardCachePutV414_(key, config, 300);
  return config;
}

function getDashboardData(authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Persiste no Sheets as conclusões derivadas do cruzamento
  // Checklist x Operação/Fim antes de devolver os dados ao dashboard.
  const checklistSyncV412 = sincronizarChecklistConcluidoV412_(ss);

  const abasPermitidas =
    Array.isArray(usuarioAcesso.abasPermitidas)
      ? usuarioAcesso.abasPermitidas
      : DASHBOARD_ABAS.slice();

  const pode = aba => abasPermitidas.includes(aba);

  const precisaBasesGerenciais = pode('geral') || pode('diretoria');

  // Resultados do Time (TV) cruza Checklist, Operação, Retificação e Créditos.
  const carregarResultados = pode('resultados');

  const carregarTarefas = precisaBasesGerenciais || pode('tarefas');
  const carregarTecnologia = pode('tecnologia');
  const carregarChecklist =
    precisaBasesGerenciais ||
    carregarResultados ||
    pode('checklist') ||
    pode('slaOperacao');

  const carregarOperacao =
    precisaBasesGerenciais ||
    carregarResultados ||
    pode('operacao') ||
    pode('slaOperacao');

  const carregarRetificacao =
    precisaBasesGerenciais ||
    carregarResultados ||
    pode('retificacao');
  const carregarTemas = pode('temas');
  const carregarCreditos =
    precisaBasesGerenciais ||
    carregarResultados ||
    pode('creditos');
  const carregarPrazoValidacao = pode('prazoValidacao');
  const carregarMetas = pode('diretoria') || pode('geral');

  const shOperacao = ss.getSheetByName('Estoque Operação');
  const shTecnologia = getAtividadesTecnologiaSheetV37_(ss);
  const shEstoqueFim = getSheetByNameFlexible_(ss, 'Estoque Fim');
  const shPrazoValidacao = getSheetByNameFlexible_(ss, 'Estoque Prazo de Validação');

  return {
    tarefas:
      carregarTarefas
        ? sheetToObjects_(ss.getSheetByName('Atividades Equipe'))
        : [],

    tarefasTecnologia:
      carregarTecnologia
        ? sheetToObjects_(shTecnologia)
        : [],

    checklist:
      carregarChecklist
        ? normalizeChecklistRowsV41_(
            sheetToObjects_(ss.getSheetByName('Estoque Checklist'))
          )
        : [],

    estoqueFim:
      carregarChecklist
        ? sheetToObjects_(shEstoqueFim)
        : [],

    checklistOperacaoRef:
      carregarChecklist
        ? checklistOperationReference_(shOperacao)
        : [],

    prazoValidacao:
      carregarPrazoValidacao
        ? sheetToObjects_(shPrazoValidacao)
        : [],

    operacao:
      carregarOperacao
        ? sheetToObjects_(shOperacao)
        : [],

    retificacao:
      carregarRetificacao
        ? normalizeRetificacaoRows_(
            sheetToObjects_(ss.getSheetByName('Estoque Retificação'))
          )
        : [],

    temas:
      carregarTemas
        ? sheetToObjects_(ss.getSheetByName('Temas Vigentes'))
        : [],

    creditos:
      carregarCreditos
        ? sheetCreditosToObjects_(ss.getSheetByName('Estoque de Créditos'))
        : [],

    metasDiretoria:
      carregarMetas
        ? sheetToObjects_(ss.getSheetByName('Metas Diretoria'))
        : [],

    atualizacoesEstoques:
      pode('geral')
        ? overviewStockUpdatesV362_()
        : {},

    acesso: {
      email: usuarioAcesso.email,
      nome: usuarioAcesso.nome || '',
      expiresAt: usuarioAcesso.expiresAt,
      abasPermitidas: abasPermitidas
    },

    config: {
      statusPrazo: getValidationOptions_(shOperacao, 'Status Prazo'),
      situacoesOperacao: getValidationOptions_(shOperacao, 'Situação'),
      analistasOperacao: operationCollaboratorsV38_(),
      creditosOperacao: getValidationOptions_(shOperacao, 'Crédito?'),
      revisoresOperacao: operationCollaboratorsV38_(),
      statusRetificacao: getValidationOptions_(ss.getSheetByName('Estoque Retificação'), 'Status Retificação'),
      statusPedidoRestituicao: getValidationOptions_(ss.getSheetByName('Estoque Retificação'), 'Status Pedido de Restituição'),
      taskClassificacoes: getValidationOptions_(ss.getSheetByName('Atividades Equipe'), 'Classificação'),
      taskStatus: getValidationOptions_(ss.getSheetByName('Atividades Equipe'), 'Status'),
      tecnologiaClassificacoes: TECNOLOGIA_CLASSIFICACOES_V37,
      tecnologiaStatus: TECNOLOGIA_STATUS_V37,
      colaboradoresAtivos: COLABORADORES_ATIVOS,
      abasPermitidas: abasPermitidas
    },

    checklistSyncV412: checklistSyncV412,

    backendVersion: BACKEND_VERSION,

    atualizadoEm: Utilities.formatDate(
      new Date(),
      ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone(),
      'dd/MM/yyyy HH:mm:ss'
    )
  };
}


function sheetToObjects_(sheet) {
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return [];

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  const headers = values[0].map(h => String(h || '').trim());

  return values.slice(1).map((row, index) => {
    const obj = { __row: index + 2 };
    headers.forEach((header, colIndex) => {
      if (header) obj[header] = row[colIndex];
    });
    return obj;
  }).filter(obj =>
    headers.some(header => header && String(obj[header] || '').trim() !== '')
  );
}



function sheetCreditosToObjects_(sheet) {
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) return [];

  const values = sheet
    .getRange(1, 1, lastRow, lastColumn)
    .getDisplayValues();

  const headers = values[0].map(h => String(h || '').trim());

  let honorarioCount = 0;
  const normalizedHeaders = headers.map((header, colIndex) => {
    // A primeira coluna do Estoque de Créditos é o Número do Job.
    // Canonicalizamos pela posição para não depender de um cabeçalho
    // acidentalmente alterado no Sheets.
    if (colIndex === 0) {
      return 'Número do Job';
    }

    if (normalizarNomeAbaDashboard_(header) === 'honorario') {
      honorarioCount++;
      return honorarioCount === 1 ? 'Honorário %' : 'Honorário $';
    }

    return header;
  });

  return values.slice(1).map((row, index) => {
    const obj = { __row: index + 2 };

    normalizedHeaders.forEach((header, colIndex) => {
      if (header) obj[header] = row[colIndex];
    });

    // Compatibilidade com indicadores antigos que ainda consultam "Honorário".
    if (obj['Honorário $'] !== undefined) {
      obj['Honorário'] = obj['Honorário $'];
    }

    return obj;
  }).filter(obj =>
    normalizedHeaders.some(
      header => header && String(obj[header] || '').trim() !== ''
    )
  );
}


function parseNumeroBRDashboard_(value) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    return isFinite(value) ? value : null;
  }

  let s = String(value)
    .replace(/\u00A0/g, ' ')
    .replace(/R\$/gi, '')
    .replace(/%/g, '')
    .replace(/\s/g, '')
    .trim();

  if (!s) return null;

  if (s.indexOf(',') >= 0) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }

  const n = Number(s);
  return isFinite(n) ? n : null;
}


function normalizeRetificacaoRows_(rows) {
  return (rows || []).map(row => {
    const r = Object.assign({}, row);

    // Compatibilidade com a estrutura atual e com a estrutura antiga do dashboard.
    const statusRet =
      String(r['Status Retificação'] || r['Retificação'] || '').trim();

    const statusPedido =
      String(
        r['Status Pedido de Restituição'] ||
        r['Pedido de Restituição'] ||
        ''
      ).trim();

    r['Status Retificação'] = statusRet;
    r['Retificação'] = statusRet;
    r['Status Pedido de Restituição'] = statusPedido;
    r['Pedido de Restituição'] = statusPedido;

    // Mantém os valores exatamente como estão no Sheets:
    // Valor = coluna F
    // Honorário $ = coluna K
    // O dashboard apenas lê e soma essas duas colunas, sem recalcular honorários.
    return r;
  });
}



function getReviewerOptions_(sheet) {
  const validacao = getValidationOptions_(sheet, 'Revisor');

  return Array.from(
    new Set(
      [
        ...validacao,
        ...COLABORADORES_ATIVOS
      ]
        .map(v => String(v || '').trim())
        .filter(Boolean)
    )
  );
}

function getValidationOptions_(sheet, headerName) {
  if (!sheet) return [];

  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(h => String(h || '').trim());

  const col = headers.indexOf(headerName) + 1;
  if (col <= 0) return [];

  const scanRows = Math.min(Math.max(sheet.getLastRow() - 1, 1), 100);
  const validations = sheet.getRange(2, col, scanRows, 1).getDataValidations();

  for (let i = 0; i < validations.length; i++) {
    const rule = validations[i][0];
    if (!rule) continue;

    const criteria = rule.getCriteriaType();
    const args = rule.getCriteriaValues();

    if (criteria === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
      return (args[0] || []).map(String);
    }

    if (criteria === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
      const range = args[0];
      if (range) {
        return range.getDisplayValues().flat()
          .map(v => String(v || '').trim())
          .filter(Boolean);
      }
    }
  }

  return [];
}

const LOG_DASHBOARD_SHEET = 'Log Dashboard';

function getOrCreateLogDashboardSheet_(ss) {
  let sh = ss.getSheetByName(LOG_DASHBOARD_SHEET);

  if (!sh) {
    sh = ss.insertSheet(LOG_DASHBOARD_SHEET);
    sh.getRange(1, 1, 1, 9).setValues([[
      'Data/Hora',
      'Usuário',
      'E-mail',
      'Aba',
      'Ação',
      'Registro',
      'Campo',
      'Valor Anterior',
      'Valor Novo'
    ]]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 9).setFontWeight('bold');
    sh.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }

  return sh;
}

function registrarLogDashboard_(ss, usuario, dados) {
  try {
    const sh = getOrCreateLogDashboardSheet_(ss);
    const d = dados || {};

    sh.appendRow([
      new Date(),
      String((usuario && usuario.nome) || '').trim() || 'Usuário não identificado',
      String((usuario && usuario.email) || '').trim(),
      String(d.aba || '').trim(),
      String(d.acao || '').trim(),
      String(d.registro || '').trim(),
      String(d.campo || '').trim(),
      d.anterior === null || d.anterior === undefined ? '' : String(d.anterior),
      d.novo === null || d.novo === undefined ? '' : String(d.novo)
    ]);
  } catch (e) {
    // O log não pode derrubar a operação principal do dashboard.
    console.error('Falha ao registrar Log Dashboard: ' + e.message);
  }
}

function valorRegistro_(sh, row, headers) {
  const candidatos = ['Número do Job', 'Nome da Empresa', 'Tarefa'];

  for (let i = 0; i < candidatos.length; i++) {
    const col = headers.indexOf(candidatos[i]) + 1;
    if (col > 0) {
      const v = String(sh.getRange(row, col).getDisplayValue() || '').trim();
      if (v) return v;
    }
  }

  return 'Linha ' + row;
}

/*
 * Gravação simplificada:
 * - não usa LockService
 * - não copia linha inteira
 * - grava diretamente nas 8 colunas da aba Atividades Equipe
 */

function taskHeaders_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn())
    .getDisplayValues()[0]
    .map(h => String(h || '').trim());
}

function taskCol_(headers, name) {
  return headers.indexOf(name) + 1;
}

function taskSetValue_(sh, row, col, value, numberFormat) {
  if (col <= 0) return;
  const cell = sh.getRange(row, col);

  if (value === '' || value === null || value === undefined) {
    cell.clearContent();
    return;
  }

  cell.setValue(value);
  if (numberFormat) cell.setNumberFormat(numberFormat);
}

function copiarValidacaoTarefa_(sh, newRow, headers) {
  if (newRow <= 2 || sh.getLastRow() < 2) return;

  ['Classificação', 'Status'].forEach(header => {
    const col = taskCol_(headers, header);
    if (col > 0) {
      sh.getRange(2, col).copyTo(
        sh.getRange(newRow, col),
        SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION,
        false
      );
    }
  });
}

function sincronizarTarefaOperacao_(ss, shOperacao, row, usuarioAcesso, overrides) {
  overrides = overrides || {};
  const headersOp = shOperacao.getRange(1, 1, 1, shOperacao.getLastColumn())
    .getDisplayValues()[0]
    .map(h => String(h || '').trim());

  const opCol = name => headersOp.indexOf(name) + 1;

  const cJob = opCol('Número do Job');
  const cEmpresa = opCol('Nome da Empresa');
  const cAnalista = opCol('Analista Responsável');
  const cSituacao = opCol('Situação');
  const cEntrada = opCol('Data da Entrada na Operação');
  const cPrazo = opCol('Prazo Final Operação');
  const cFinalizacao = opCol('Data Finalização Revisão');

  const job = cJob > 0
    ? String(shOperacao.getRange(row, cJob).getDisplayValue() || '').trim()
    : '';

  if (!job) {
    return { ok: true, action: 'ignorado', message: 'Operação sem Número do Job.' };
  }

  const empresa = cEmpresa > 0
    ? String(shOperacao.getRange(row, cEmpresa).getDisplayValue() || '').trim()
    : '';

  const analista =
    overrides.analista !== undefined
      ? canonicalOperationCollaboratorV38_(overrides.analista)
      : (
          cAnalista > 0
            ? canonicalOperationCollaboratorV38_(shOperacao.getRange(row, cAnalista).getDisplayValue())
            : ''
        );

  const situacao =
    overrides.situacao !== undefined
      ? String(overrides.situacao || '').trim()
      : (
          cSituacao > 0
            ? String(shOperacao.getRange(row, cSituacao).getDisplayValue() || '').trim()
            : ''
        );

  const entradaRaw = cEntrada > 0
    ? shOperacao.getRange(row, cEntrada).getValue()
    : '';

  const prazoRaw = cPrazo > 0
    ? shOperacao.getRange(row, cPrazo).getValue()
    : '';

  const finalizacaoRaw = cFinalizacao > 0
    ? shOperacao.getRange(row, cFinalizacao).getValue()
    : '';

  const finalizado = normalizeStatus_(situacao) === 'finalizado';

  const shTask = ss.getSheetByName('Atividades Equipe');
  if (!shTask) throw new Error('A aba "Atividades Equipe" não foi encontrada.');

  const headersTask = taskHeaders_(shTask);

  const required = [
    'Número do Job',
    'Data de Entrada',
    'Tarefa',
    'Classificação',
    'Status',
    'Responsável',
    'Prazo',
    'Data Finalização'
  ];

  const missing = required.filter(name => taskCol_(headersTask, name) <= 0);

  if (missing.length) {
    throw new Error(
      'TO-DO_SYNC|A aba "Atividades Equipe" precisa conter as colunas: ' +
      missing.join(', ')
    );
  }

  const cTaskJob = taskCol_(headersTask, 'Número do Job');
  const cTaskEntrada = taskCol_(headersTask, 'Data de Entrada');
  const cTaskTarefa = taskCol_(headersTask, 'Tarefa');
  const cTaskClass = taskCol_(headersTask, 'Classificação');
  const cTaskStatus = taskCol_(headersTask, 'Status');
  const cTaskResp = taskCol_(headersTask, 'Responsável');
  const cTaskPrazo = taskCol_(headersTask, 'Prazo');
  const cTaskFinal = taskCol_(headersTask, 'Data Finalização');
  const cTaskObs = taskCol_(headersTask, 'Observações');

  let taskRow = 0;

  if (shTask.getLastRow() >= 2) {
    const lastRow = shTask.getLastRow();
    const jobs = shTask.getRange(2, cTaskJob, lastRow - 1, 1)
      .getDisplayValues().flat();
    const classes = shTask.getRange(2, cTaskClass, lastRow - 1, 1)
      .getDisplayValues().flat();

    for (let i = 0; i < jobs.length; i++) {
      if (
        String(jobs[i] || '').trim() === job &&
        ['operacao', 'operacional'].includes(normalizeStatus_(classes[i]))
      ) {
        taskRow = i + 2;
        break;
      }
    }
  }

  if (!taskRow && !analista) {
    return {
      ok: true,
      action: 'aguardando_analista',
      job: job,
      message: 'Tarefa não criada porque a Operação ainda não possui analista.'
    };
  }

  const tarefa = 'Diagnóstico JOB ' + job + (empresa ? ' — ' + empresa : '');

  if (!taskRow) {
    taskRow = shTask.getLastRow() + 1;

    if (taskRow > shTask.getMaxRows()) {
      shTask.insertRowsAfter(shTask.getMaxRows(), 20);
    }

    copiarValidacaoTarefa_(shTask, taskRow, headersTask);

    taskSetValue_(shTask, taskRow, cTaskJob, job);
    taskSetValue_(shTask, taskRow, cTaskEntrada, hojeSemHora_(), 'dd/MM/yyyy');
    taskSetValue_(shTask, taskRow, cTaskTarefa, tarefa);
    taskSetValue_(shTask, taskRow, cTaskClass, 'Operação');
    taskSetValue_(shTask, taskRow, cTaskStatus, finalizado ? 'Concluído' : 'Pendente');
    aplicarValidacaoColaboradorV353_(shTask.getRange(taskRow, cTaskResp));
    taskSetValue_(shTask, taskRow, cTaskResp, analista);

    if (prazoRaw) {
      taskSetValue_(shTask, taskRow, cTaskPrazo, prazoRaw, 'dd/MM/yyyy');
    }

    if (finalizado) {
      taskSetValue_(
        shTask,
        taskRow,
        cTaskFinal,
        finalizacaoRaw || hojeSemHora_(),
        'dd/MM/yyyy'
      );
    }

    if (cTaskObs > 0) {
      taskSetValue_(
        shTask,
        taskRow,
        cTaskObs,
        'Gerada automaticamente pelo Estoque Operação.'
      );
    }

    SpreadsheetApp.flush();

    registrarLogDashboard_(ss, usuarioAcesso, {
      aba: 'Atividades Equipe',
      acao: 'Criar tarefa automática',
      registro: job,
      campo: 'Tarefa',
      anterior: '',
      novo: tarefa + ' | ' + analista
    });

    return {
      ok: true,
      action: 'criada',
      row: taskRow,
      job: job,
      message: 'Tarefa operacional criada automaticamente.'
    };
  }

  const statusAtual =
    String(shTask.getRange(taskRow, cTaskStatus).getDisplayValue() || '').trim();

  const respAnterior =
    String(shTask.getRange(taskRow, cTaskResp).getDisplayValue() || '').trim();

  taskSetValue_(shTask, taskRow, cTaskJob, job);
  taskSetValue_(shTask, taskRow, cTaskTarefa, tarefa);
  taskSetValue_(shTask, taskRow, cTaskClass, 'Operação');
  aplicarValidacaoColaboradorV353_(shTask.getRange(taskRow, cTaskResp));
  taskSetValue_(shTask, taskRow, cTaskResp, analista);

  if (prazoRaw) {
    taskSetValue_(shTask, taskRow, cTaskPrazo, prazoRaw, 'dd/MM/yyyy');
  }

  if (finalizado) {
    taskSetValue_(shTask, taskRow, cTaskStatus, 'Concluído');
    taskSetValue_(
      shTask,
      taskRow,
      cTaskFinal,
      finalizacaoRaw || hojeSemHora_(),
      'dd/MM/yyyy'
    );
  } else if (normalizeStatus_(statusAtual) === 'concluido') {
    taskSetValue_(shTask, taskRow, cTaskStatus, 'Pendente');
    taskSetValue_(shTask, taskRow, cTaskFinal, '');
  }

  SpreadsheetApp.flush();

  registrarLogDashboard_(ss, usuarioAcesso, {
    aba: 'Atividades Equipe',
    acao: 'Sincronizar tarefa automática',
    registro: job,
    campo: 'Responsável / Status',
    anterior: respAnterior + ' | ' + statusAtual,
    novo:
      analista + ' | ' +
      (finalizado
        ? 'Concluído'
        : (normalizeStatus_(statusAtual) === 'concluido' ? 'Pendente' : statusAtual))
  });

  return {
    ok: true,
    action: 'atualizada',
    row: taskRow,
    job: job,
    message: 'Tarefa operacional sincronizada.'
  };
}


function salvarNovaTarefaV6(payload, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'tarefas');
  let etapa = 'início';

  try {
    if (!payload) throw new Error('Payload não recebido.');

    const tarefa = String(payload.tarefa || '').trim();
    if (!tarefa) throw new Error('Informe a tarefa.');

    etapa = 'abrindo planilha';
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName('Atividades Equipe');

    if (!sh) throw new Error('A aba "Atividades Equipe" não foi encontrada.');

    const headers = taskHeaders_(sh);
    const col = name => taskCol_(headers, name);

    const cEntrada = col('Data de Entrada');
    const cJob = col('Número do Job');
    const cTarefa = col('Tarefa');
    const cClass = col('Classificação');
    const cStatus = col('Status');
    const cResp = col('Responsável');
    const cPrazo = col('Prazo');
    const cFinal = col('Data Finalização');
    const cObs = col('Observações');

    const required = [
      ['Data de Entrada', cEntrada],
      ['Tarefa', cTarefa],
      ['Classificação', cClass],
      ['Status', cStatus],
      ['Responsável', cResp],
      ['Prazo', cPrazo],
      ['Data Finalização', cFinal]
    ].filter(x => x[1] <= 0);

    if (required.length) {
      throw new Error(
        'Colunas obrigatórias não encontradas: ' +
        required.map(x => x[0]).join(', ')
      );
    }

    const classificacoesValidas = getValidationOptions_(sh, 'Classificação');
    const statusValidos = getValidationOptions_(sh, 'Status');

    const classificacao = String(payload.classificacao || '').trim();
    const status = String(payload.status || 'Pendente').trim();

    if (
      classificacoesValidas.length &&
      !classificacoesValidas.includes(classificacao)
    ) {
      throw new Error(
        'Classificação inválida: "' + classificacao +
        '". Permitidas: ' + classificacoesValidas.join(', ')
      );
    }

    if (statusValidos.length && !statusValidos.includes(status)) {
      throw new Error(
        'Status inválido: "' + status +
        '". Permitidos: ' + statusValidos.join(', ')
      );
    }

    const newRow = sh.getLastRow() + 1;

    if (newRow > sh.getMaxRows()) {
      sh.insertRowsAfter(sh.getMaxRows(), 20);
    }

    copiarValidacaoTarefa_(sh, newRow, headers);

    const prazo = payload.prazo ? parseIsoDate_(payload.prazo) : '';

    taskSetValue_(sh, newRow, cEntrada, new Date(), 'dd/MM/yyyy HH:mm:ss');
    if (cJob > 0) {
      taskSetValue_(sh, newRow, cJob, String(payload.numeroJob || '').trim());
    }
    taskSetValue_(sh, newRow, cTarefa, tarefa);
    taskSetValue_(sh, newRow, cClass, classificacao);
    taskSetValue_(sh, newRow, cStatus, status);
    aplicarValidacaoColaboradorV353_(sh.getRange(newRow, cResp));
    taskSetValue_(sh, newRow, cResp, canonicalCollaboratorV352_(payload.responsavel));

    if (prazo) {
      taskSetValue_(sh, newRow, cPrazo, prazo, 'dd/MM/yyyy');
    }

    taskSetValue_(sh, newRow, cFinal, '');

    if (cObs > 0) {
      taskSetValue_(sh, newRow, cObs, String(payload.observacoes || '').trim());
    }

    SpreadsheetApp.flush();

    registrarLogDashboard_(ss, usuarioAcesso, {
      aba: 'Atividades Equipe',
      acao: 'Criar tarefa',
      registro: tarefa,
      campo: 'Tarefa',
      anterior: '',
      novo: tarefa
    });

    return {
      ok: true,
      row: newRow,
      backendVersion: BACKEND_VERSION,
      message: 'Atividade adicionada com sucesso na linha ' + newRow + '.'
    };

  } catch (e) {
    throw new Error(
      'Falha ao salvar tarefa na etapa "' + etapa + '": ' + e.message
    );
  }
}

function alterarStatusTarefaV6(rowNumber, novoStatus, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'tarefas');
  let etapa = 'início';

  try {
    const row = Number(rowNumber);

    if (!row || row < 2) {
      throw new Error('Linha de tarefa inválida: ' + rowNumber);
    }

    etapa = 'abrindo planilha';
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    etapa = 'localizando aba';
    const sh = ss.getSheetByName('Atividades Equipe');

    if (!sh) {
      throw new Error('A aba "Atividades Equipe" não foi encontrada.');
    }

    if (row > sh.getLastRow()) {
      throw new Error('A linha ' + row + ' não existe mais.');
    }

    etapa = 'mapeando colunas';
    const headers = sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getDisplayValues()[0]
      .map(function(h) {
        return String(h || '').trim();
      });

    const cStatus = headers.indexOf('Status') + 1;
    const cFinal = headers.indexOf('Data Finalização') + 1;
    const cTarefa = headers.indexOf('Tarefa') + 1;

    if (cStatus <= 0) {
      throw new Error('Coluna "Status" não encontrada na aba Atividades Equipe.');
    }

    if (cFinal <= 0) {
      throw new Error('Coluna "Data Finalização" não encontrada na aba Atividades Equipe.');
    }

    etapa = 'validando status';
    const status = String(novoStatus || '').trim();
    const statusValidos = getValidationOptions_(sh, 'Status');

    if (status && statusValidos.length && !statusValidos.includes(status)) {
      throw new Error(
        'Status inválido: "' + status +
        '". Permitidos: ' + statusValidos.join(', ')
      );
    }

    const statusAnterior = String(
      sh.getRange(row, cStatus).getDisplayValue() || ''
    ).trim();

    const tarefaRegistro =
      cTarefa > 0
        ? (
            String(
              sh.getRange(row, cTarefa).getDisplayValue() || ''
            ).trim() || ('Linha ' + row)
          )
        : ('Linha ' + row);

    etapa = 'gravando status';

    if (status) {
      sh.getRange(row, cStatus).setValue(status);
    } else {
      sh.getRange(row, cStatus).clearContent();
    }

    etapa = 'gravando data de finalização';

    if (normalizeStatus_(status) === 'concluido') {
      sh.getRange(row, cFinal)
        .setValue(new Date())
        .setNumberFormat('dd/MM/yyyy HH:mm:ss');
    } else {
      sh.getRange(row, cFinal).clearContent();
    }

    etapa = 'flush';
    SpreadsheetApp.flush();

    registrarLogDashboard_(ss, usuarioAcesso, {
      aba: 'Atividades Equipe',
      acao: 'Alterar status',
      registro: tarefaRegistro,
      campo: 'Status',
      anterior: statusAnterior,
      novo: status
    });

    return {
      ok: true,
      row: row,
      status: status,
      backendVersion: BACKEND_VERSION,
      message: 'Status atualizado com sucesso.'
    };

  } catch (e) {
    throw new Error(
      'Falha ao atualizar status na etapa "' + etapa + '": ' + e.message
    );
  }
}


function excluirTarefaV26(rowNumber, tarefaEsperada, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'tarefas');

  const row = Number(rowNumber);

  if (!Number.isInteger(row) || row < 2) {
    throw new Error('Linha de tarefa inválida: ' + rowNumber);
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName('Atividades Equipe');

  if (!sh) {
    throw new Error('A aba "Atividades Equipe" não foi encontrada.');
  }

  if (row > sh.getLastRow()) {
    throw new Error('A tarefa não existe mais na planilha.');
  }

  // Proteção contra exclusão de uma linha diferente caso o dashboard esteja desatualizado.
  const tarefaAtual = String(sh.getRange(row, 2).getDisplayValue() || '').trim();
  const esperada = String(tarefaEsperada || '').trim();

  if (esperada && tarefaAtual !== esperada) {
    throw new Error(
      'A linha da tarefa mudou desde a última atualização. Atualize o dashboard e tente novamente.'
    );
  }

  const statusAtual = String(sh.getRange(row, 4).getDisplayValue() || '').trim();
  registrarLogDashboard_(ss, usuarioAcesso, {
    aba: 'Atividades Equipe',
    acao: 'Excluir tarefa',
    registro: tarefaAtual || ('Linha ' + row),
    campo: 'Registro',
    anterior: statusAtual ? (tarefaAtual + ' | Status: ' + statusAtual) : tarefaAtual,
    novo: 'EXCLUÍDO'
  });

  sh.deleteRow(row);
  SpreadsheetApp.flush();

  return {
    ok: true,
    row: row,
    message: 'Tarefa excluída do dashboard e do Sheets.'
  };
}


function testarEscritaV6(authToken) {
  exigirSessao_(authToken);
  return salvarNovaTarefaV6({
    tarefa: 'TESTE V6',
    classificacao: 'Demais Tarefas',
    status: 'Pendente',
    responsavel: 'Eduardo Cardoso',
    prazo: '2026-09-18',
    observacoes: 'Teste direto do backend v6'
  });
}




function hojeSemHora_() {
  const agora = new Date();
  return new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate()
  );
}

function alterarSituacaoOperacaoV14(rowNumber, novaSituacao, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'operacao');
  let etapa = 'início';

  try {
    const row = Number(rowNumber);

    if (!Number.isInteger(row) || row < 2) {
      throw new Error('Linha inválida: ' + rowNumber);
    }

    const situacao = String(novaSituacao || '').trim();

    etapa = 'abrindo planilha';
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName('Estoque Operação');

    if (!sh) {
      throw new Error('A aba "Estoque Operação" não foi encontrada.');
    }

    etapa = 'lendo cabeçalhos';
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn())
      .getDisplayValues()[0]
      .map(h => String(h || '').trim());

    const colSituacao = headers.indexOf('Situação') + 1;
    const colFinalizacaoOp = headers.indexOf('Data Finalização OP') + 1;
    const colFinalizacaoRevisao = headers.indexOf('Data Finalização Revisão') + 1;

    if (colSituacao <= 0) {
      throw new Error('Coluna "Situação" não encontrada.');
    }

    const validas = getValidationOptions_(sh, 'Situação');

    if (situacao && validas.length && !validas.includes(situacao)) {
      throw new Error(
        'Situação inválida: "' + situacao +
        '". Permitidas: ' + validas.join(', ')
      );
    }

    const situacaoAnterior = String(sh.getRange(row, colSituacao).getDisplayValue() || '').trim();
    const registroOperacao = valorRegistro_(sh, row, headers);

    etapa = 'gravando situação';
    if (situacao) {
      sh.getRange(row, colSituacao).setValue(situacao);
    } else {
      sh.getRange(row, colSituacao).clearContent();
    }

    const n = situacao.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    const hoje = hojeSemHora_();

    // Ao entrar em Revisão, registra o encerramento da Operação.
    if (n === 'revisao') {
      if (colFinalizacaoOp > 0) {
        const celula = sh.getRange(row, colFinalizacaoOp);

        if (!celula.getValue()) {
          celula.setValue(hoje);
          celula.setNumberFormat('dd/MM/yyyy');
        }
      }
    }

    // Ao finalizar, mantém a data de OP e registra a conclusão da Revisão.
    if (n === 'finalizado') {
      if (colFinalizacaoOp > 0) {
        const celulaOp = sh.getRange(row, colFinalizacaoOp);

        if (!celulaOp.getValue()) {
          celulaOp.setValue(hoje);
          celulaOp.setNumberFormat('dd/MM/yyyy');
        }
      }

      if (colFinalizacaoRevisao > 0) {
        const celulaRev = sh.getRange(row, colFinalizacaoRevisao);

        if (!celulaRev.getValue()) {
          celulaRev.setValue(hoje);
          celulaRev.setNumberFormat('dd/MM/yyyy');
        }
      }
    }

    SpreadsheetApp.flush();

    registrarLogDashboard_(ss, usuarioAcesso, {
      aba: 'Estoque Operação',
      acao: 'Alterar campo',
      registro: registroOperacao,
      campo: 'Situação',
      anterior: situacaoAnterior,
      novo: situacao
    });

    const tarefaSync = sincronizarTarefaOperacao_(
      ss,
      sh,
      row,
      usuarioAcesso,
      { situacao: situacao }
    );

    return {
      ok: true,
      row: row,
      situacao: situacao,
      tarefaSync: tarefaSync
    };

  } catch (e) {
    throw new Error(
      'Falha ao alterar Situação na etapa "' +
      etapa + '": ' + e.message
    );
  }
}




function alterarCampoOperacaoV26(rowNumber, campo, novoValor, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'operacao');

  let etapa = 'início';

  try {
    const row = Number(rowNumber);
    const header = String(campo || '').trim();
    const rawValue = String(novoValor || '').trim();

    const camposDatasPro = [
      'Data Finalização OP',
      'Data Finalização Revisão'
    ];

    const camposPermitidos = [
      'Analista Responsável',
      'Crédito?',
      'Revisor'
    ].concat(camposDatasPro);

    if (!Number.isInteger(row) || row < 2) {
      throw new Error('Linha inválida: ' + rowNumber);
    }

    if (!camposPermitidos.includes(header)) {
      throw new Error('Campo da Operação não permitido: ' + header);
    }

    etapa = 'abrindo planilha';

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName('Estoque Operação');

    if (!sh) {
      throw new Error('A aba "Estoque Operação" não foi encontrada.');
    }

    if (row > sh.getLastRow()) {
      throw new Error('A linha ' + row + ' não existe mais.');
    }

    etapa = 'lendo cabeçalhos';

    const headers = sh.getRange(1, 1, 1, sh.getLastColumn())
      .getDisplayValues()[0]
      .map(h => String(h || '').trim());

    const col = headers.indexOf(header) + 1;

    if (col <= 0) {
      throw new Error('Coluna não encontrada: ' + header);
    }

    // Segurança no BACKEND:
    // as datas só podem ser alteradas manualmente pelo dashboard
    // quando a própria linha no Sheets estiver marcada como PRO.
    if (camposDatasPro.includes(header)) {
      etapa = 'validando empresa PRO';

      const colFastPass = headers.indexOf('Fast Pass') + 1;

      if (colFastPass <= 0) {
        throw new Error(
          'A coluna "Fast Pass" não foi encontrada para validar a empresa PRO.'
        );
      }

      const tipoEmpresa = String(
        sh.getRange(row, colFastPass).getDisplayValue() || ''
      ).trim();

      const tipoNormalizado = tipoEmpresa
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

      if (tipoNormalizado !== 'pro') {
        throw new Error(
          'Somente empresas PRO podem ter "' +
          header +
          '" alterada manualmente pelo dashboard.'
        );
      }
    }

    const valorAnterior = String(
      sh.getRange(row, col).getDisplayValue() || ''
    ).trim();

    const registroOperacao = valorRegistro_(sh, row, headers);

    // Datas PRO
    if (camposDatasPro.includes(header)) {
      etapa = 'gravando data PRO';

      const cell = sh.getRange(row, col);

      if (!rawValue) {
        cell.clearContent();
      } else {
        const data = parseIsoDate_(rawValue);

        if (!data || isNaN(data.getTime())) {
          throw new Error(
            'Data inválida para "' + header + '": "' + rawValue + '".'
          );
        }

        cell
          .setValue(data)
          .setNumberFormat('dd/MM/yyyy');
      }

      SpreadsheetApp.flush();

      registrarLogDashboard_(ss, usuarioAcesso, {
        aba: 'Estoque Operação',
        acao: 'Alterar data PRO',
        registro: registroOperacao,
        campo: header,
        anterior: valorAnterior,
        novo: rawValue
      });

      return {
        ok: true,
        row: row,
        campo: header,
        valor: rawValue,
        message: header + ' atualizada no Sheets com sucesso.'
      };
    }

    // Campos já existentes
    const value =
      ['Analista Responsável', 'Revisor'].includes(header)
        ? canonicalOperationCollaboratorV38_(rawValue)
        : rawValue;

    etapa = 'validando valor';

    const validas =
      ['Analista Responsável', 'Revisor'].includes(header)
        ? operationCollaboratorsV38_()
        : getValidationOptions_(sh, header);

    if (value && validas.length && !validas.includes(value)) {
      throw new Error(
        'Valor inválido em "' + header + '": "' + value +
        '". Permitidos: ' + validas.join(', ')
      );
    }

    const cell = sh.getRange(row, col);

    if (['Analista Responsável', 'Revisor'].includes(header)) {
      aplicarValidacaoColaboradorOperacaoV38_(cell);
    }

    etapa = 'gravando campo';

    if (value) {
      cell.setValue(value);
    } else {
      cell.clearContent();
    }

    SpreadsheetApp.flush();

    registrarLogDashboard_(ss, usuarioAcesso, {
      aba: 'Estoque Operação',
      acao: 'Alterar campo',
      registro: registroOperacao,
      campo: header,
      anterior: valorAnterior,
      novo: value
    });

    let tarefaSync = null;

    if (header === 'Analista Responsável') {
      tarefaSync = sincronizarTarefaOperacao_(
        ss,
        sh,
        row,
        usuarioAcesso,
        { analista: value }
      );
    }

    return {
      ok: true,
      row: row,
      campo: header,
      valor: value,
      tarefaSync: tarefaSync,
      message:
        header + ' atualizado com sucesso.' +
        (
          tarefaSync && tarefaSync.message
            ? ' ' + tarefaSync.message
            : ''
        )
    };

  } catch (e) {
    throw new Error(
      'Falha ao alterar campo da Operação na etapa "' +
      etapa + '": ' + e.message
    );
  }
}


function alterarStatusChecklistV23(rowNumber, coluna, novoStatus, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'checklist');

  let etapa = 'início';

  try {
    const row = Number(rowNumber);
    const status = String(novoStatus || '').trim();

    if (!Number.isInteger(row) || row < 2) {
      throw new Error('Linha inválida: ' + rowNumber);
    }

    if (!['Pendente', 'Concluído'].includes(status)) {
      throw new Error('Status inválido: ' + status);
    }

    etapa = 'abrindo planilha';

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName('Estoque Checklist');

    if (!sh) {
      throw new Error('A aba "Estoque Checklist" não foi encontrada.');
    }

    if (row > sh.getLastRow()) {
      throw new Error('A linha ' + row + ' não existe mais.');
    }

    etapa = 'mapeando colunas';

    const headers = checklistHeadersV41_(sh);

    const colStatus = checklistEnsureColumnV41_(
      sh,
      headers,
      'Status',
      []
    );

    const colFinal = checklistEnsureColumnV41_(
      sh,
      headers,
      'Data Finalização Checkist',
      ['Data Finalização Checklist']
    );

    const statusCell = sh.getRange(row, colStatus);
    const finalCell = sh.getRange(row, colFinal);

    const anterior = String(statusCell.getDisplayValue() || '').trim();

    etapa = 'gravando status';

    statusCell
      .setDataValidation(checklistStatusRuleV41_())
      .setValue(status);

    etapa = 'atualizando finalização';

    if (normalizeStatus_(status) === 'concluido') {
      if (!finalCell.getValue()) {
        finalCell
          .setValue(new Date())
          .setNumberFormat('dd/MM/yyyy HH:mm:ss');
      }
    } else {
      finalCell.clearContent();
    }

    SpreadsheetApp.flush();

    registrarLogDashboard_(ss, usuarioAcesso, {
      aba: 'Estoque Checklist',
      acao: 'Alterar status',
      registro: valorRegistro_(sh, row, headers),
      campo: 'Status',
      anterior: anterior,
      novo: status
    });

    return {
      ok: true,
      row: row,
      status: status,
      finalizado: normalizeStatus_(status) === 'concluido',
      backendVersion: BACKEND_VERSION,
      message: 'Status do Checklist atualizado com sucesso.'
    };

  } catch (e) {
    throw new Error(
      'Falha ao atualizar Checklist na etapa "' +
      etapa + '": ' + e.message
    );
  }
}




function alterarCampoChecklistV41(rowNumber, campo, novoValor, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'checklist');

  const row = Number(rowNumber);
  const field = String(campo || '').trim();
  const raw = String(novoValor || '').trim();

  if (!Number.isInteger(row) || row < 2) {
    throw new Error('Linha inválida: ' + rowNumber);
  }

  const allowed = [
    'Número de Funcionários',
    'DCTFWeb Média',
    'Observação',
    'Certificado Digital',
    'Prazo Procuração',
    'Analista Responsável',
    'Perfil'
  ];

  if (!allowed.includes(field)) {
    throw new Error('Campo do Checklist não permitido: ' + field);
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName('Estoque Checklist');

  if (!sh) {
    throw new Error('A aba "Estoque Checklist" não foi encontrada.');
  }

  if (row > sh.getLastRow()) {
    throw new Error('A linha ' + row + ' não existe mais.');
  }

  const headers = checklistHeadersV41_(sh);

  const aliases = {
    'Número de Funcionários': [
      'Quantidade Média Funcionários',
      'Quantidade Média de Funcionários'
    ],
    'DCTFWeb Média': [
      'Valor Médio DCTFWeb'
    ],
    'Observação': [
      'Observações'
    ],
    'Certificado Digital': [
      'Certificado'
    ],
    'Prazo Procuração': [
      'Prazo Procuracao'
    ],
    'Analista Responsável': [
      'Analista',
      'Analista Responsavel'
    ],
    'Perfil': [
      'Empresa tem Perfil'
    ]
  };

  const col = checklistEnsureColumnV41_(
    sh,
    headers,
    field,
    aliases[field] || []
  );

  const cell = sh.getRange(row, col);
  const anterior = String(cell.getDisplayValue() || '').trim();

  if (field === 'DCTFWeb Média') {
    checklistFormatCurrencyV41_(cell, raw);
  } else if (field === 'Número de Funcionários') {
    const n = checklistParseIntegerV41_(raw);

    if (n === '') {
      cell.clearContent();
    } else {
      cell.setValue(n).setNumberFormat('0');
    }
  } else if (field === 'Prazo Procuração') {
    if (!raw) {
      cell.clearContent();
    } else {
      const d = parseIsoDate_(raw);

      if (!d || isNaN(d.getTime())) {
        throw new Error('Data inválida para Prazo Procuração.');
      }

      cell.setValue(d).setNumberFormat('dd/MM/yyyy');
    }
  } else if (field === 'Perfil') {
    if (raw && !['Sim', 'Não'].includes(raw)) {
      throw new Error('Perfil inválido: ' + raw);
    }

    cell.setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(['Sim', 'Não'], true)
        .setAllowInvalid(true)
        .build()
    );

    if (raw) {
      cell.setValue(raw);
    } else {
      cell.clearContent();
    }

    // Regra solicitada:
    // Perfil = Não conclui o Checklist e preenche a data.
    if (normalizarNomeAbaDashboard_(raw) === 'nao') {
      const colStatus = checklistEnsureColumnV41_(
        sh,
        headers,
        'Status',
        []
      );

      const colFinal = checklistEnsureColumnV41_(
        sh,
        headers,
        'Data Finalização Checkist',
        ['Data Finalização Checklist']
      );

      const statusCell = sh.getRange(row, colStatus);
      const finalCell = sh.getRange(row, colFinal);

      statusCell
        .setDataValidation(checklistStatusRuleV41_())
        .setValue('Concluído');

      if (!finalCell.getValue()) {
        finalCell
          .setValue(new Date())
          .setNumberFormat('dd/MM/yyyy HH:mm:ss');
      }
    }
  } else if (field === 'Analista Responsável') {
    if (!raw) {
      cell.clearContent();
    } else {
      const canonico = canonicalCollaboratorV352_(raw) || raw;

      cell
        .setDataValidation(
          SpreadsheetApp.newDataValidation()
            .requireValueInList(COLABORADORES_ATIVOS, true)
            .setAllowInvalid(true)
            .build()
        )
        .setValue(canonico);
    }
  } else {
    if (raw) {
      cell.setValue(raw);
    } else {
      cell.clearContent();
    }
  }

  SpreadsheetApp.flush();

  registrarLogDashboard_(ss, usuarioAcesso, {
    aba: 'Estoque Checklist',
    acao: 'Alterar campo',
    registro: valorRegistro_(sh, row, headers),
    campo: field,
    anterior: anterior,
    novo: raw
  });

  return {
    ok: true,
    row: row,
    campo: field,
    valor: raw,
    backendVersion: BACKEND_VERSION,
    message: field + ' atualizado com sucesso.'
  };
}

function alterarMetodoRetificacaoV36(rowNumber, novoMetodo, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'retificacao');
  const row=Number(rowNumber);
  const metodo=String(novoMetodo||'').trim();
  const permitidos=['Compensação','Pedido de Restituição'];
  if(!Number.isInteger(row)||row<2) throw new Error('Linha inválida: '+rowNumber);
  if(!permitidos.includes(metodo)) throw new Error('Método inválido: '+metodo);
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh=ss.getSheetByName('Estoque Retificação');
  if(!sh) throw new Error('A aba "Estoque Retificação" não foi encontrada.');
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(h=>String(h||'').trim());
  const col=headers.indexOf('Método')+1;
  if(col<=0) throw new Error('Coluna "Método" não encontrada.');
  const cell=sh.getRange(row,col);
  const anterior=String(cell.getDisplayValue()||'').trim();
  cell.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(permitidos,true).setAllowInvalid(false).build());
  cell.setValue(metodo);
  SpreadsheetApp.flush();
  registrarLogDashboard_(ss,usuarioAcesso,{aba:'Estoque Retificação',acao:'Alterar campo',registro:valorRegistro_(sh,row,headers),campo:'Método',anterior:anterior,novo:metodo});
  sincronizarTarefaRetificacao_(ss,sh,row,usuarioAcesso);
  return {ok:true,row:row,metodo:metodo,message:'Método atualizado para '+metodo+'.'};
}

function retificacaoJobFinalizadaV361_(sh, headers, job) {
  const cJob = headers.indexOf('Número do Job') + 1;
  const cRet = headers.indexOf('Status Retificação') + 1;

  if (cJob <= 0 || cRet <= 0) return false;

  const last = sh.getLastRow();

  if (last < 2) return false;

  const vals = sh
    .getRange(2, 1, last - 1, sh.getLastColumn())
    .getDisplayValues();

  const relevant = vals.filter(
    r => String(r[cJob - 1] || '').trim() === job
  );

  if (!relevant.length) return false;

  return relevant.every(
    r => normalizeStatus_(r[cRet - 1]) === 'concluido'
  );
}

function sincronizarTarefaRetificacao_(ss, shRet, row, usuarioAcesso, overrideAnalista) {
  const headers=shRet.getRange(1,1,1,shRet.getLastColumn()).getDisplayValues()[0].map(h=>String(h||'').trim());
  const col=n=>headers.indexOf(n)+1;
  const cJob=col('Número do Job'), cEmp=col('Nome da Empresa'), cAna=col('Analista');
  if(cJob<=0)return {ok:true,action:'ignorado'};
  const job=String(shRet.getRange(row,cJob).getDisplayValue()||'').trim();
  if(!job)return {ok:true,action:'ignorado'};
  const empresa=cEmp>0?String(shRet.getRange(row,cEmp).getDisplayValue()||'').trim():'';
  const analista=overrideAnalista!==undefined?canonicalCollaboratorV352_(overrideAnalista):(cAna>0?canonicalCollaboratorV352_(shRet.getRange(row,cAna).getDisplayValue()):'');
  const shTask=ss.getSheetByName('Atividades Equipe');
  if(!shTask)throw new Error('A aba "Atividades Equipe" não foi encontrada.');
  const ht=taskHeaders_(shTask);
  const cTJ=taskCol_(ht,'Número do Job'), cTE=taskCol_(ht,'Data de Entrada'), cTT=taskCol_(ht,'Tarefa'),
        cTC=taskCol_(ht,'Classificação'), cTS=taskCol_(ht,'Status'), cTR=taskCol_(ht,'Responsável'),
        cTF=taskCol_(ht,'Data Finalização'), cTO=taskCol_(ht,'Observações');
  const missing=[['Número do Job',cTJ],['Data de Entrada',cTE],['Tarefa',cTT],['Classificação',cTC],['Status',cTS],['Responsável',cTR],['Data Finalização',cTF]].filter(x=>x[1]<=0).map(x=>x[0]);
  if(missing.length)throw new Error('TO-DO_SYNC|Faltam colunas no To-do: '+missing.join(', '));
  let taskRow=0;
  if(shTask.getLastRow()>=2){
    const jobs=shTask.getRange(2,cTJ,shTask.getLastRow()-1,1).getDisplayValues().flat();
    const cls=shTask.getRange(2,cTC,shTask.getLastRow()-1,1).getDisplayValues().flat();
    for(let i=0;i<jobs.length;i++){
      if(String(jobs[i]||'').trim()===job && normalizeStatus_(cls[i])==='retificacao'){taskRow=i+2;break;}
    }
  }
  if(!taskRow && !analista)return {ok:true,action:'aguardando_analista'};
  const finalizado=retificacaoJobFinalizadaV361_(shRet,headers,job);
  const tarefa='Retificação JOB '+job+(empresa?' — '+empresa:'');
  if(!taskRow){
    taskRow=shTask.getLastRow()+1;
    if(taskRow>shTask.getMaxRows())shTask.insertRowsAfter(shTask.getMaxRows(),20);
    copiarValidacaoTarefa_(shTask,taskRow,ht);
    taskSetValue_(shTask,taskRow,cTJ,job);
    taskSetValue_(shTask,taskRow,cTE,hojeSemHora_(),'dd/MM/yyyy');
    taskSetValue_(shTask,taskRow,cTT,tarefa);
    taskSetValue_(shTask,taskRow,cTC,'Retificação');
    taskSetValue_(shTask,taskRow,cTS,finalizado?'Concluído':'Pendente');
    aplicarValidacaoColaboradorV353_(shTask.getRange(taskRow,cTR));
    taskSetValue_(shTask,taskRow,cTR,analista);
    if(finalizado)taskSetValue_(shTask,taskRow,cTF,hojeSemHora_(),'dd/MM/yyyy');
    if(cTO>0)taskSetValue_(shTask,taskRow,cTO,'Gerada automaticamente pelo Estoque Retificação.');
  } else {
    taskSetValue_(shTask,taskRow,cTT,tarefa);
    taskSetValue_(shTask,taskRow,cTC,'Retificação');
    aplicarValidacaoColaboradorV353_(shTask.getRange(taskRow,cTR));
    taskSetValue_(shTask,taskRow,cTR,analista);
    taskSetValue_(shTask,taskRow,cTS,finalizado?'Concluído':'Pendente');
    taskSetValue_(shTask,taskRow,cTF,finalizado?hojeSemHora_():'',finalizado?'dd/MM/yyyy':null);
  }
  SpreadsheetApp.flush();
  return {ok:true,action:taskRow?'sincronizada':'criada',job:job,row:taskRow};
}


function retHeaderNormV411_(value) {
  return normalizarNomeAbaDashboard_(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function retFindColV411_(headers, aliases) {
  const wanted = (aliases || []).map(retHeaderNormV411_);

  for (let i = 0; i < headers.length; i++) {
    if (wanted.includes(retHeaderNormV411_(headers[i]))) {
      return i + 1;
    }
  }

  return 0;
}

function retEnsureColV411_(sh, headers, preferred, aliases) {
  let col = retFindColV411_(
    headers,
    [preferred].concat(aliases || [])
  );

  if (col > 0) return col;

  col = sh.getLastColumn() + 1;
  sh.getRange(1, col).setValue(preferred);
  headers.push(preferred);

  return col;
}

function retPrepareFreeTextCellV411_(cell) {
  if (!cell) return;

  // Certificado e Observações devem aceitar texto livre.
  cell.clearDataValidations();
  cell.setNumberFormat('@');
}

function retPrepareDateCellV411_(cell) {
  if (!cell) return;

  // Remove validações antigas incompatíveis e aplica data válida.
  cell.clearDataValidations();

  const rule = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(false)
    .build();

  cell.setDataValidation(rule);
}

function retPrepareMoneyCellV411_(cell) {
  if (!cell) return;

  // Evita que uma validação antiga da planilha impeça o valor pós-retificação.
  cell.clearDataValidations();
  cell.setNumberFormat('R$ #,##0.00');
}

function alterarCampoRetificacaoV40(rowNumber, campo, novoValor, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'retificacao');

  let etapa = 'início';

  try {
    const row = Number(rowNumber);
    const header = String(campo || '').trim();
    const rawValue = String(novoValor || '').trim();

    if (!Number.isInteger(row) || row < 2) {
      throw new Error('Linha inválida: ' + rowNumber);
    }

    if (!['Certificado Digital', 'Prazo Procuração'].includes(header)) {
      throw new Error('Campo da Retificação não permitido: ' + header);
    }

    etapa = 'abrindo planilha';

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName('Estoque Retificação');

    if (!sh) {
      throw new Error('A aba "Estoque Retificação" não foi encontrada.');
    }

    if (row > sh.getLastRow()) {
      throw new Error('A linha ' + row + ' não existe mais.');
    }

    etapa = 'mapeando colunas';

    const headers = sh.getRange(1, 1, 1, sh.getLastColumn())
      .getDisplayValues()[0]
      .map(function(h) { return String(h || '').trim(); });

    const aliases =
      header === 'Certificado Digital'
        ? ['Certificado', 'Certificado digital']
        : ['Prazo Procuracao', 'Prazo da Procuração', 'Prazo da Procuracao'];

    const col = retEnsureColV411_(
      sh,
      headers,
      header,
      aliases
    );

    const cell = sh.getRange(row, col);
    const anterior = String(cell.getDisplayValue() || '').trim();

    etapa = 'preparando célula';

    if (header === 'Prazo Procuração') {
      retPrepareDateCellV411_(cell);

      etapa = 'gravando data';

      if (!rawValue) {
        cell.clearContent();
      } else {
        const data = parseIsoDate_(rawValue);

        if (!data || isNaN(data.getTime())) {
          throw new Error(
            'Data inválida para Prazo Procuração: "' + rawValue + '".'
          );
        }

        cell
          .setValue(data)
          .setNumberFormat('dd/MM/yyyy');
      }
    } else {
      retPrepareFreeTextCellV411_(cell);

      etapa = 'gravando certificado';

      if (rawValue) {
        cell.setValue(rawValue);
      } else {
        cell.clearContent();
      }
    }

    etapa = 'flush';
    SpreadsheetApp.flush();

    registrarLogDashboard_(ss, usuarioAcesso, {
      aba: 'Estoque Retificação',
      acao: 'Alterar campo',
      registro: valorRegistro_(sh, row, headers),
      campo: header,
      anterior: anterior,
      novo: rawValue
    });

    return {
      ok: true,
      row: row,
      campo: header,
      valor: rawValue,
      backendVersion: BACKEND_VERSION,
      message: header + ' atualizado com sucesso.'
    };

  } catch (e) {
    throw new Error(
      'Falha ao atualizar "' + String(campo || '') +
      '" na etapa "' + etapa + '": ' + e.message
    );
  }
}

function alterarAnalistaRetificacaoV32(rowNumber, novoAnalista, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'retificacao');

  const row = Number(rowNumber);
  const analista = canonicalCollaboratorV352_(novoAnalista);

  if (!Number.isInteger(row) || row < 2) {
    throw new Error('Linha inválida: ' + rowNumber);
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName('Estoque Retificação');

  if (!sh) {
    throw new Error('A aba "Estoque Retificação" não foi encontrada.');
  }

  if (row > sh.getLastRow()) {
    throw new Error('A linha ' + row + ' não existe mais.');
  }

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn())
    .getDisplayValues()[0]
    .map(h => String(h || '').trim());

  const col = headers.indexOf('Analista') + 1;

  if (col <= 0) {
    throw new Error('Coluna "Analista" não encontrada.');
  }

  const valorAnterior =
    String(sh.getRange(row, col).getDisplayValue() || '').trim();

  const validacao = getValidationOptions_(sh, 'Analista');

  const permitidos = Array.from(
    new Set(
      [
        ...validacao,
        ...COLABORADORES_ATIVOS,
        valorAnterior
      ]
        .map(v => String(v || '').trim())
        .filter(Boolean)
    )
  );

  if (analista && !COLABORADORES_ATIVOS.includes(analista)) {
    throw new Error(
      'Analista inválido: "' + analista +
      '". Permitidos: ' + COLABORADORES_ATIVOS.join(', ')
    );
  }

  aplicarValidacaoColaboradorV353_(sh.getRange(row, col));

  if (analista) {
    sh.getRange(row, col).setValue(analista);
  } else {
    sh.getRange(row, col).clearContent();
  }

  SpreadsheetApp.flush();

  registrarLogDashboard_(ss, usuarioAcesso, {
    aba: 'Estoque Retificação',
    acao: 'Alterar campo',
    registro: valorRegistro_(sh, row, headers),
    campo: 'Analista',
    anterior: valorAnterior,
    novo: analista
  });

  const tarefaSync = sincronizarTarefaRetificacao_(ss, sh, row, usuarioAcesso, analista);

  return {
    ok: true,
    row: row,
    analista: analista,
    backendVersion: BACKEND_VERSION,
    message: analista
      ? 'Analista da retificação atualizado para ' + analista + '.'
      : 'Analista da retificação removido.'
  };
}

function alterarStatusRetificacaoV15(rowNumber, campo, novoStatus, authToken, valorRetificacao, observacoesRetificacao) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'retificacao');
  let etapa = 'início';

  try {
    const row = Number(rowNumber);
    const status = String(novoStatus || '').trim();
    const campoRecebido = String(campo || '').trim();

    if (!Number.isInteger(row) || row < 2) {
      throw new Error('Linha inválida: ' + rowNumber);
    }

    const aliases = {
      'Retificação': 'Status Retificação',
      'Status Retificação': 'Status Retificação',
      'Pedido de Restituição': 'Status Pedido de Restituição',
      'Status Pedido de Restituição': 'Status Pedido de Restituição'
    };

    const mapaData = {
      'Status Retificação': 'Data Finalização Retificação',
      'Status Pedido de Restituição': 'Data Finalização Pedido de Restituição'
    };

    const campoStatus = aliases[campoRecebido];
    const cabecalhoData = campoStatus ? mapaData[campoStatus] : '';

    if (!campoStatus || !cabecalhoData) {
      throw new Error('Campo inválido: ' + campoRecebido);
    }

    etapa = 'abrindo planilha';
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName('Estoque Retificação');

    if (!sh) {
      throw new Error('A aba "Estoque Retificação" não foi encontrada.');
    }

    etapa = 'mapeando colunas';
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn())
      .getDisplayValues()[0]
      .map(h => String(h || '').trim());

    const colStatus = headers.indexOf(campoStatus) + 1;
    const colData = headers.indexOf(cabecalhoData) + 1;

    let colValorRetificacao = retFindColV411_(
      headers,
      ['Valor Retificação', 'Valor Retificacao']
    );

    // Compatibilidade com a estrutura informada: coluna R,
    // mas somente se o cabeçalho da R for compatível ou estiver vazio.
    if (colValorRetificacao <= 0 && sh.getLastColumn() >= 18) {
      const headerR = String(headers[17] || '').trim();

      if (
        !headerR ||
        retHeaderNormV411_(headerR) === 'valor retificacao'
      ) {
        colValorRetificacao = 18;

        if (!headerR) {
          sh.getRange(1, 18).setValue('Valor Retificação');
          headers[17] = 'Valor Retificação';
        }
      }
    }

    if (colValorRetificacao <= 0) {
      colValorRetificacao = retEnsureColV411_(
        sh,
        headers,
        'Valor Retificação',
        ['Valor Retificacao']
      );
    }

    const colObservacoes = retEnsureColV411_(
      sh,
      headers,
      'Observações',
      ['Observação', 'Observacoes', 'Observacao']
    );

    if (colStatus <= 0) {
      throw new Error('Coluna não encontrada: ' + campoStatus);
    }

    if (colData <= 0) {
      throw new Error('Coluna não encontrada: ' + cabecalhoData);
    }

    etapa = 'validando status';

    const validos =
      campoStatus === 'Status Retificação'
        ? ['Pendente', 'Em Andamento', 'Aguardando Cadastro', 'Concluído']
        : (
            getValidationOptions_(sh, campoStatus).length
              ? getValidationOptions_(sh, campoStatus)
              : ['Pendente', 'Em Andamento', 'Concluído']
          );

    if (status && !validos.includes(status)) {
      throw new Error(
        'Status inválido: "' + status +
        '". Permitidos: ' + validos.join(', ')
      );
    }

    sh.getRange(row, colStatus).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(validos, true)
        .setAllowInvalid(false)
        .build()
    );

    const statusAnterior = String(sh.getRange(row, colStatus).getDisplayValue() || '').trim();
    const registroRetificacao = valorRegistro_(sh, row, headers);

    let valorRetificacaoNumero = null;

    if (
      campoStatus === 'Status Retificação' &&
      normalizeStatus_(status) === 'concluido'
    ) {
      valorRetificacaoNumero = parseNumeroBRDashboard_(valorRetificacao);

      if (
        valorRetificacaoNumero === null ||
        !isFinite(valorRetificacaoNumero) ||
        valorRetificacaoNumero < 0
      ) {
        throw new Error(
          'Informe um Valor após retificação válido para concluir a retificação.'
        );
      }

      if (colValorRetificacao <= 0) {
        throw new Error(
          'Coluna "Valor Retificação" não encontrada na aba Estoque Retificação.'
        );
      }
    }

    etapa = 'gravando status';
    sh.getRange(row, colStatus).setValue(status);

    etapa = 'atualizando data';
    const celulaData = sh.getRange(row, colData);

    if (normalizeStatus_(status) === 'concluido') {
      if (!celulaData.getValue()) {
        celulaData.setValue(new Date());
        celulaData.setNumberFormat('dd/MM/yyyy');
      }

      if (
        campoStatus === 'Status Retificação' &&
        colValorRetificacao > 0
      ) {
        etapa = 'gravando valor retificação';

        const valorCell = sh.getRange(row, colValorRetificacao);
        retPrepareMoneyCellV411_(valorCell);

        valorCell
          .setValue(valorRetificacaoNumero)
          .setNumberFormat('R$ #,##0.00');

        const obs = String(observacoesRetificacao || '').trim();

        if (obs && colObservacoes > 0) {
          etapa = 'gravando observações';

          const obsCell = sh.getRange(row, colObservacoes);
          retPrepareFreeTextCellV411_(obsCell);

          const obsAnterior = String(
            obsCell.getDisplayValue() || ''
          ).trim();

          const obsNovo =
            obsAnterior && obsAnterior !== obs
              ? obsAnterior + '\n\n' + obs
              : obs;

          obsCell.setValue(obsNovo);
        }
      }
    } else {
      celulaData.clearContent();
    }

    SpreadsheetApp.flush();

    registrarLogDashboard_(ss, usuarioAcesso, {
      aba: 'Estoque Retificação',
      acao: 'Alterar status',
      registro: registroRetificacao,
      campo: campoStatus,
      anterior: statusAnterior,
      novo: status
    });

    sincronizarTarefaRetificacao_(ss, sh, row, usuarioAcesso);

    return {
      ok: true,
      row: row,
      campo: campoStatus,
      status: status,
      message: campoStatus + ' atualizado para ' + status + '.'
    };

  } catch (e) {
    throw new Error(
      'Erro na atualização da Retificação | etapa: ' +
      etapa + ' | ' + e.message
    );
  }
}




function alterarAnalistaPrazoValidacaoV33(rowNumber, novoAnalista, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'prazoValidacao');

  const row = Number(rowNumber);
  const analista = canonicalCollaboratorV352_(novoAnalista);

  if (!Number.isInteger(row) || row < 2) {
    throw new Error('Linha inválida: ' + rowNumber);
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getSheetByNameFlexible_(ss, 'Estoque Prazo de Validação');

  if (!sh) {
    throw new Error('A aba "Estoque Prazo de Validação" não foi encontrada.');
  }

  if (row > sh.getLastRow()) {
    throw new Error('A linha ' + row + ' não existe mais.');
  }

  let lastCol = sh.getLastColumn();
  let headers = sh.getRange(1, 1, 1, lastCol)
    .getDisplayValues()[0]
    .map(h => String(h || '').trim());

  let col = headers.indexOf('Analista') + 1;

  // Se a coluna ainda não existir no Sheets, cria no final da tabela.
  if (col <= 0) {
    col = lastCol + 1;
    sh.getRange(1, col).setValue('Analista');
    headers.push('Analista');
  }

  const anterior =
    String(sh.getRange(row, col).getDisplayValue() || '').trim();

  const permitidos = Array.from(
    new Set(
      [
        ...COLABORADORES_ATIVOS,
        anterior
      ]
        .map(v => String(v || '').trim())
        .filter(Boolean)
    )
  );

  if (analista && !COLABORADORES_ATIVOS.includes(analista)) {
    throw new Error(
      'Analista inválido: "' + analista +
      '". Permitidos: ' + COLABORADORES_ATIVOS.join(', ')
    );
  }

  aplicarValidacaoColaboradorV353_(sh.getRange(row, col));

  if (analista) {
    sh.getRange(row, col).setValue(analista);
  } else {
    sh.getRange(row, col).clearContent();
  }

  SpreadsheetApp.flush();

  registrarLogDashboard_(ss, usuarioAcesso, {
    aba: 'Estoque Prazo de Validação',
    acao: 'Alterar campo',
    registro: valorRegistro_(sh, row, headers),
    campo: 'Analista',
    anterior: anterior,
    novo: analista
  });

  return {
    ok: true,
    row: row,
    analista: analista,
    backendVersion: BACKEND_VERSION,
    message: analista
      ? 'Analista do Estoque PV atualizado para ' + analista + '.'
      : 'Analista do Estoque PV removido.'
  };
}

function alterarStatusPrazoValidacaoV319(rowNumber, novoStatus, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'prazoValidacao');

  const row = Number(rowNumber);
  const status = String(novoStatus || '').trim();

  if (!Number.isInteger(row) || row < 2) {
    throw new Error('Linha inválida: ' + rowNumber);
  }

  if (!['Pendente', 'Concluído'].includes(status)) {
    throw new Error('Status inválido: ' + status);
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getSheetByNameFlexible_(ss, 'Estoque Prazo de Validação');

  if (!sh) {
    throw new Error('A aba "Estoque Prazo de Validação" não foi encontrada.');
  }

  if (row > sh.getLastRow()) {
    throw new Error('A linha ' + row + ' não existe mais.');
  }

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn())
    .getDisplayValues()[0]
    .map(h => String(h || '').trim());

  const statusCandidates = ['Status', 'Situação'];
  const dateCandidates = [
    'Data Finalização',
    'Data de Finalização',
    'Data Finalizacao',
    'Data de Finalizacao'
  ];

  let colStatus = 0;
  let statusHeader = '';

  for (let i = 0; i < statusCandidates.length; i++) {
    const c = headers.indexOf(statusCandidates[i]) + 1;
    if (c > 0) {
      colStatus = c;
      statusHeader = statusCandidates[i];
      break;
    }
  }

  let colData = 0;
  let dataHeader = '';

  for (let i = 0; i < dateCandidates.length; i++) {
    const c = headers.indexOf(dateCandidates[i]) + 1;
    if (c > 0) {
      colData = c;
      dataHeader = dateCandidates[i];
      break;
    }
  }

  if (colStatus <= 0) {
    throw new Error(
      'Não foi encontrada a coluna "Status" na aba Estoque Prazo de Validação.'
    );
  }

  if (colData <= 0) {
    throw new Error(
      'Não foi encontrada a coluna "Data Finalização" na aba Estoque Prazo de Validação.'
    );
  }

  const statusAnterior =
    String(sh.getRange(row, colStatus).getDisplayValue() || '').trim();

  const dataAnterior =
    String(sh.getRange(row, colData).getDisplayValue() || '').trim();

  sh.getRange(row, colStatus).setValue(status);

  if (status === 'Concluído') {
    const hoje = hojeSemHora_();
    sh.getRange(row, colData)
      .setValue(hoje)
      .setNumberFormat('dd/MM/yyyy');
  } else {
    sh.getRange(row, colData).clearContent();
  }

  SpreadsheetApp.flush();

  registrarLogDashboard_(ss, usuarioAcesso, {
    aba: 'Estoque Prazo de Validação',
    acao: 'Alterar status',
    registro: valorRegistro_(sh, row, headers),
    campo: statusHeader,
    anterior: statusAnterior + (dataAnterior ? ' | ' + dataAnterior : ''),
    novo: status + (status === 'Concluído' ? ' | Data finalização preenchida' : '')
  });

  return {
    ok: true,
    row: row,
    status: status,
    backendVersion: BACKEND_VERSION,
    message:
      status === 'Concluído'
        ? 'Prazo de validação concluído e data de finalização preenchida.'
        : 'Prazo de validação marcado como pendente e data de finalização removida.'
  };
}

function salvarMetasDiretoriaV22(payload, authToken) {
  const usuarioAcesso = exigirSessao_(authToken);
  exigirPermissaoAba_(usuarioAcesso, 'diretoria');
  let etapa = 'início';

  try {
    if (!payload) {
      throw new Error('Dados não recebidos.');
    }

    const competencia = String(payload.competencia || '').trim();

    if (!/^\d{4}-\d{2}$/.test(competencia)) {
      throw new Error('Competência inválida. Use AAAA-MM.');
    }

    function numeroBR_(value) {
      if (value === null || value === undefined || value === '') return '';

      let s = String(value)
        .replace(/\u00A0/g, ' ')
        .replace(/R\$/gi, '')
        .replace(/\s/g, '')
        .trim();

      if (!s) return '';

      if (s.indexOf(',') >= 0) {
        s = s.replace(/\./g, '').replace(',', '.');
      }

      const n = Number(s);

      if (!isFinite(n)) {
        throw new Error('Valor monetário inválido: ' + value);
      }

      return n;
    }

    etapa = 'abrindo planilha';
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName('Metas Diretoria');

    if (!sh) {
      throw new Error('A aba "Metas Diretoria" não foi encontrada.');
    }

    etapa = 'lendo competências';
    const lastRow = Math.max(sh.getLastRow(), 1);
    let row = 0;

    if (lastRow >= 2) {
      const comps = sh.getRange(2, 1, lastRow - 1, 1)
        .getDisplayValues()
        .flat()
        .map(v => String(v || '').trim());

      const idx = comps.indexOf(competencia);

      if (idx >= 0) {
        row = idx + 2;
      }
    }

    if (!row) {
      row = lastRow + 1;
    }

    etapa = 'gravando linha';

    const valoresAnteriores = row <= sh.getLastRow()
      ? sh.getRange(row, 1, 1, 7).getDisplayValues()[0]
      : ['', '', '', '', '', '', ''];

    const novosValores = [
      competencia,
      numeroBR_(payload.metaCredito),
      numeroBR_(payload.metaVenda),
      numeroBR_(payload.metaCaixa),
      numeroBR_(payload.caixaRealizado),
      payload.metaContratos === '' || payload.metaContratos === null || payload.metaContratos === undefined
        ? ''
        : Number(String(payload.metaContratos).replace(/\D/g, '')) || 0,
      String(payload.observacoes || '').trim()
    ];

    sh.getRange(row, 1, 1, 7).setValues([novosValores]);

    sh.getRange(row, 2, 1, 4).setNumberFormat('R$ #,##0.00');

    SpreadsheetApp.flush();

    registrarLogDashboard_(ss, usuarioAcesso, {
      aba: 'Metas Diretoria',
      acao: 'Salvar metas',
      registro: competencia,
      campo: 'Metas da competência',
      anterior: valoresAnteriores.join(' | '),
      novo: novosValores.join(' | ')
    });

    return {
      ok: true,
      row: row,
      competencia: competencia,
      message: 'Metas e indicadores manuais salvos.'
    };

  } catch (e) {
    throw new Error(
      'Falha em Metas Diretoria | etapa: ' +
      etapa + ' | ' + e.message
    );
  }
}

function parseIsoDate_(iso) {
  const p = String(iso || '').split('-').map(Number);

  if (p.length !== 3 || !p[0] || !p[1] || !p[2]) {
    return '';
  }

  return new Date(p[0], p[1] - 1, p[2], 12, 0, 0);
}

function normalizeStatus_(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}


function canonicalCollaboratorV352_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const n = normalizeStatus_(raw);

  const aliases = {
    'luiz': 'Luiz Neto',
    'luiz neto': 'Luiz Neto',
    'mayan': 'Mayan Macedo',
    'mayan macedo': 'Mayan Macedo',
    'leticia oliveira': 'Letícia Oliveira',
    'brenda guterres': 'Brenda Guterres',
    'ana beatriz': 'Ana Beatriz',
    'ellen rogowski': 'Ellen Rogowski',
    'felipe silva': 'Felipe Silva',
    'leticia santos': 'Letícia da Silva',
    'leticia da silva': 'Letícia da Silva',
    'eduardo': 'Eduardo Cardoso',
    'eduardo cardoso': 'Eduardo Cardoso',
    'igor paz': 'Igor Paz',
    'igor': 'Igor Paz'
  };

  return aliases[n] || raw;
}



function canonicalOperationCollaboratorV38_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const n = normalizeStatus_(raw);

  // Igor histórico da Operação é diferente de Igor Paz.
  if (n === 'igor' || n === 'igor paz') {
    return 'Igor';
  }

  return canonicalCollaboratorV352_(raw);
}

function operationCollaboratorsV38_() {
  const values = COLABORADORES_ATIVOS
    .filter(function(name) {
      return normalizeStatus_(name) !== 'igor paz';
    });

  values.push('Igor');

  return Array.from(new Set(values));
}

function operationCollaboratorValidationRuleV38_() {
  return SpreadsheetApp.newDataValidation()
    .requireValueInList(operationCollaboratorsV38_(), true)
    .setAllowInvalid(false)
    .build();
}

function aplicarValidacaoColaboradorOperacaoV38_(range) {
  if (!range) return;
  range.setDataValidation(operationCollaboratorValidationRuleV38_());
}

function collaboratorValidationRuleV353_() {
  return SpreadsheetApp.newDataValidation()
    .requireValueInList(COLABORADORES_ATIVOS, true)
    .setAllowInvalid(false)
    .build();
}

function aplicarValidacaoColaboradorV353_(range) {
  if (!range) return;
  range.setDataValidation(collaboratorValidationRuleV353_());
}
