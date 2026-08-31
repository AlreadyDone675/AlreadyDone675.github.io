// ─── Estado Global ──────────────────────────────────────────────
let DADOS = null;
let mesSelecionado = 'agosto';
let chartComparativo = null;
let chartGastos = null;
let chartCusto = null;

// Métrica ativa ao clicar nos cards: null = padrão (IA)
let metricaAtiva = null;

// Mapa de configuração de cada card clicavel
const METRICAS_CARDS = {
  // URA
  'card-ura-total':    { campo: 'ura_total',           label: 'URA no Mês',          cor: '#3b82f6', isCurrency: false, isTime: false },
  'card-atendidas':    { campo: 'ura_atendidas',        label: 'Atendimentos URA',     cor: '#10b981', isCurrency: false, isTime: false },
  'card-auto-servico': { campo: 'ura_auto_servico',     label: 'URA Auto Serviço',     cor: '#8b5cf6', isCurrency: false, isTime: false },
  // Vonix
  'card-vonix':        { campo: 'vonix_atendidas',      label: 'Vonix Atendidas',      cor: '#06b6d4', isCurrency: false, isTime: false },
  'card-abandonadas':  { campo: 'vonix_abandonadas',    label: 'Vonix Abandonadas',    cor: '#f43f5e', isCurrency: false, isTime: false },
  'card-tme':          { campo: 'vonix_tme',            label: 'TME Médio',            cor: '#f59e0b', isCurrency: false, isTime: true },
  // IA
  'card-ia-total':     { campo: 'ia_atendimento_total', label: 'Atendimento IA',       cor: '#8b5cf6', isCurrency: false, isTime: false },
  'card-ia-transf':    { campo: 'ia_transferencia',     label: 'Transferências IA',    cor: '#3b82f6', isCurrency: false, isTime: false },
  'card-custo-total':  { campo: 'ia_custo_total',       label: 'Gasto Mensal',         cor: '#6366f1', isCurrency: true,  isTime: false },
  'card-custo-ligacao':{ campo: 'ia_custo_por_ligacao', label: 'Média / Atendimento',  cor: '#f59e0b', isCurrency: true,  isTime: false },
  'card-ia-tma':       { campo: 'ia_tma',               label: 'TMA IA',               cor: '#10b981', isCurrency: false, isTime: true },
};

// Converter hex para rgba globalmente
function hexToRgba(hex, a) {
  if (!hex || typeof hex !== 'string') return `rgba(99, 102, 241, ${a})`;
  if (hex.startsWith('rgb')) return hex.replace('rgb', 'rgba').replace(')', `, ${a})`);
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(99, 102, 241, ${a})`;
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${a})`;
}

// Aplica/remove estado visual de seleção nos cards
function aplicarSelecaoCard(cardId) {
  const todos = Object.keys(METRICAS_CARDS);
  todos.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (cardId && id !== cardId) {
      el.classList.add('card-inactive');
    } else {
      el.classList.remove('card-inactive');
    }
    if (id === cardId) {
      el.classList.add('card-selected');
    } else {
      el.classList.remove('card-selected');
    }
  });
}

// Ativa o filtro de card ou remove se clicar no mesmo
function selecionarMetrica(cardId) {
  if (metricaAtiva === cardId) {
    metricaAtiva = null;
    aplicarSelecaoCard(null);
  } else {
    metricaAtiva = cardId;
    aplicarSelecaoCard(cardId);
  }
  renderChartComparativo();
  renderChartGastos();
}

// Registra os eventos de click nos cards
function registrarClickCards() {
  Object.keys(METRICAS_CARDS).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => selecionarMetrica(id));
    }
  });
}



// ─── Atualiza os Cards de KPI ──────────────────────────────────
function atualizarCards() {
  const d = getDadosAtuais();
  const dAnt = getDadosAnteriores();

  if (!d) return; // Nada a exibir no período

  // Helper específico com valor bruto
  const setCardRaw = (idVal, idBadge, rawAtual, rawAnt, fmtFn, isCost = false) => {
    const elVal = document.getElementById(idVal);
    if (elVal) elVal.textContent = fmtFn(rawAtual);

    const elBadge = document.getElementById(idBadge);
    if (elBadge) {
      if (dAnt && rawAnt !== null && rawAnt !== undefined) {
        const pct = calcVariacao(parseFloat(rawAtual), parseFloat(rawAnt));
        elBadge.innerHTML = badgeVariacao(pct, isCost);
      } else {
        elBadge.innerHTML = '';
      }
    }
  };

  // ── SETOR URA & VONIX (6 Cards) ──
  const isCris = typeof agenteFiltro !== 'undefined' && agenteFiltro === 'cris';
  ['card-ura-total', 'card-atendidas', 'card-auto-servico'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (isCris) {
        el.classList.add('card-hidden-cris');
        setTimeout(() => {
          if (typeof agenteFiltro !== 'undefined' && agenteFiltro === 'cris') {
            el.style.display = 'none';
          }
        }, 180);
      } else {
        el.style.display = '';
        requestAnimationFrame(() => el.classList.remove('card-hidden-cris'));
      }
    }
  });

  setCardRaw('val-ura-total', 'badge-ura-total', d.ura_total, dAnt ? dAnt.ura_total : null, fmtNum);
  setCardRaw('val-atendidas', 'badge-atendidas', d.ura_atendidas, dAnt ? dAnt.ura_atendidas : null, fmtNum);
  setCardRaw('val-auto-servico', 'badge-auto-servico', d.ura_auto_servico, dAnt ? dAnt.ura_auto_servico : null, fmtNum);
  
  setCardRaw('val-vonix-atendidas', 'badge-vonix', d.vonix_atendidas, dAnt ? dAnt.vonix_atendidas : null, fmtNum);
  document.getElementById('val-vonix-recebidas').textContent = fmtNum(d.vonix_recebidas);

  document.getElementById('val-tme').textContent = fmtTime(d.vonix_tme);
  const elBadgeTme = document.getElementById('badge-tme');
  if (elBadgeTme) {
    if (dAnt && dAnt.vonix_tme) {
      const secAtual = timeToSeconds(d.vonix_tme);
      const secAnt = timeToSeconds(dAnt.vonix_tme);
      const pct = calcVariacao(secAtual, secAnt);
      elBadgeTme.innerHTML = badgeVariacao(pct, true);
    } else {
      elBadgeTme.innerHTML = '';
    }
  }

  setCardRaw('val-abandonadas', 'badge-abandonadas', d.vonix_abandonadas, dAnt ? dAnt.vonix_abandonadas : null, fmtNum);
  const elPctAbandonadas = document.getElementById('val-abandonadas-pct');
  if (elPctAbandonadas) {
    elPctAbandonadas.textContent = fmtPct(d.vonix_abandonadas, d.vonix_recebidas);
  }
  // ── SETOR IA (4 Cards) ──
  setCardRaw('val-ia-total', 'badge-ia-total', d.ia_atendimento_total, dAnt ? dAnt.ia_atendimento_total : null, fmtNum);
  setCardRaw('val-ia-transf', 'badge-ia-transf', d.ia_transferencia, dAnt ? dAnt.ia_transferencia : null, fmtNum);
  document.getElementById('val-ia-pct').textContent = fmtPct(d.ia_transferencia, d.ia_atendimento_total);

  setCardRaw('val-custo-total', 'badge-custo-total', d.ia_custo_total, dAnt ? dAnt.ia_custo_total : null, fmtBRL, true);
  setCardRaw('val-custo-ligacao', 'badge-custo-ligacao', d.ia_custo_por_ligacao, dAnt ? dAnt.ia_custo_por_ligacao : null, fmtBRL, true);

  document.getElementById('val-ia-tma').textContent = d.ia_tma || "00:00";
  const elBadgeIaTma = document.getElementById('badge-ia-tma');
  if (elBadgeIaTma) {
    if (dAnt && dAnt.ia_tma) {
      const secAtual = timeToSeconds(d.ia_tma);
      const secAnt = timeToSeconds(dAnt.ia_tma);
      const pct = calcVariacao(secAtual, secAnt);
      elBadgeIaTma.innerHTML = badgeVariacao(pct, true); // true porque tempo menor é melhor
    } else {
      elBadgeIaTma.innerHTML = '';
    }
  }

  // Título dos setores
  document.querySelectorAll('.mes-label').forEach(el => {
    if (modoFiltroAtual === 'mes') {
      el.textContent = capitalizar(mesSelecionado);
    } else if (modoFiltroAtual === 'tudo') {
      el.textContent = 'Todos os Períodos';
    } else {
      el.textContent = 'Período Selecionado';
    }
  });
}



// ─── Gráfico 1: Atendimentos Diários IA (Timeline) ──────────────────
function renderChartComparativo() {
  const ctx = document.getElementById('chartComparativo').getContext('2d');
  
  if (typeof DADOS === 'undefined' || !DADOS) return;

  // Determina a metrica e config de acordo com o card selecionado
  const cfg = metricaAtiva ? METRICAS_CARDS[metricaAtiva] : null;
  const campo = cfg ? cfg.campo : 'ia_atendimento_total';
  const tituloGrafico = cfg ? cfg.label + ' Diário' : 'Atendimentos Diários IA';
  const subGrafico    = cfg ? 'Volume diário de ' + cfg.label.toLowerCase() : 'Quantidade de ligações por dia no mês selecionado';
  const cor           = cfg ? cfg.cor : '#f43f5e';
  const isCurrency    = cfg ? cfg.isCurrency : false;
  const isTime        = cfg ? cfg.isTime : false;

  // Atualiza títulos do card do gráfico
  const titleEl = document.querySelector('#chartComparativo')?.closest('.chart-card')?.querySelector('.chart-card__title');
  const subEl   = document.querySelector('#chartComparativo')?.closest('.chart-card')?.querySelector('.chart-card__sub');
  if (titleEl) titleEl.textContent = tituloGrafico;
  if (subEl)   subEl.textContent   = subGrafico;
  
  // Atualiza as legendas HTML
  const elDotComp = document.getElementById('legend-dot-comparativo');
  const elTextComp = document.getElementById('legend-text-comparativo');
  if (elDotComp) elDotComp.style.background = cor;
  if (elTextComp) elTextComp.textContent = cfg ? cfg.label : 'Ligações Diárias';
  
  const mesAtual = typeof mesSelecionado !== 'undefined' ? mesSelecionado : null;
  let diasAtual = Object.entries(DADOS.dias).filter(([dStr, info]) => info.mes === mesAtual);
  diasAtual.sort((a, b) => a[0].localeCompare(b[0]));

  // Filtra dias sem dados do campo selecionado
  const getCampoDia = (info) => {
    const c  = info.clara || {};
    const cr = info.cris  || {};
    
    if (campo === 'ia_custo_por_ligacao') {
      const custo = (parseFloat(c.ia_custo_total) || 0) + (parseFloat(cr.ia_custo_total) || 0);
      const atend = (parseFloat(c.ia_atendimento_total) || 0) + (parseFloat(cr.ia_atendimento_total) || 0);
      return atend > 0 ? (custo / atend) : 0;
    }

    const jsonCampo = (campo === 'ia_tma') ? 'tma_ia' : campo;

    if (isTime) {
      const sc  = timeToSeconds(c[jsonCampo]  || '00:00');
      const scr = timeToSeconds(cr[jsonCampo] || '00:00');
      const cnt = (sc > 0 ? 1 : 0) + (scr > 0 ? 1 : 0);
      return cnt > 0 ? Math.round((sc + scr) / cnt) : 0;
    }
    return (parseFloat(c[jsonCampo])  || 0) + (parseFloat(cr[jsonCampo]) || 0);
  };

  let lastValidIdx = -1;
  diasAtual.forEach(([_dStr, info], i) => {
    if (getCampoDia(info) > 0) lastValidIdx = i;
  });
  diasAtual = lastValidIdx >= 0 ? diasAtual.slice(0, lastValidIdx + 1) : [];

  const labels = [];
  const totais = [];
  const det_clara = [];
  const det_cris = [];
  const det_dia = [];
  const diasSemanaStr = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  diasAtual.forEach(([dStr, info]) => {
    const c  = info.clara || {};
    const cr = info.cris  || {};
    labels.push(dStr.split('-')[2]);
    const [y, m, d] = dStr.split('-');
    const dataObj = new Date(y, m - 1, d);
    det_dia.push(diasSemanaStr[dataObj.getDay()]);
    
    const val = getCampoDia(info);
    totais.push(val);
    
    const jsonCampo = (campo === 'ia_tma') ? 'tma_ia' : campo;
    
    if (campo === 'ia_custo_por_ligacao') {
      const cCusto = parseFloat(c.ia_custo_total) || 0;
      const cAtend = parseFloat(c.ia_atendimento_total) || 0;
      const crCusto = parseFloat(cr.ia_custo_total) || 0;
      const crAtend = parseFloat(cr.ia_atendimento_total) || 0;
      det_clara.push(cAtend > 0 ? (cCusto / cAtend) : 0);
      det_cris.push(crAtend > 0 ? (crCusto / crAtend) : 0);
    } else if (isTime) {
      det_clara.push(fmtTime(c[jsonCampo]));
      det_cris.push(fmtTime(cr[jsonCampo]));
    } else {
      det_clara.push(parseFloat(c[jsonCampo]) || 0);
      det_cris.push(parseFloat(cr[jsonCampo]) || 0);
    }
  });

  if (chartComparativo) chartComparativo.destroy();

  const gradFill = ctx.createLinearGradient(0, 0, 0, 300);
  gradFill.addColorStop(0, hexToRgba(cor, 0.3));
  gradFill.addColorStop(1, hexToRgba(cor, 0.0));

  const fmtTooltipVal = (v) => {
    if (isTime) return fmtTime(String(Math.round(v / 60)).padStart(2,'0') + ':' + String(v % 60).padStart(2,'0'));
    if (isCurrency) return 'R$ ' + v.toLocaleString('pt-BR', {minimumFractionDigits:2});
    return v;
  };

  chartComparativo = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        {
          type: 'line',
          label: tituloGrafico,
          data: totais,
          borderColor: cor,
          backgroundColor: gradFill,
          borderWidth: 2.5,
          pointBackgroundColor: cor,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1d2e',
          titleColor: '#fff',
          bodyColor: '#d1d5db',
          footerColor: '#6b7280',
          footerFont: { size: 11, style: 'italic' },
          footerMarginTop: 8,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            title: () => null,
            label: (c) => ` ${cfg ? cfg.label : 'Ligações Diárias'}: ${fmtTooltipVal(c.parsed.y)}`,
            afterBody: (context) => {
              if (metricaAtiva) return null; // Quando o filtro está ativo, ocultamos o detalhamento por agente
              const idx = context[0].dataIndex;
              if (isTime) return `\n• Clara: ${det_clara[idx]}\n• Cris: ${det_cris[idx]}`;
              return `\n• Clara: ${det_clara[idx]}\n• Cris: ${det_cris[idx]}`;
            },
            footer: (context) => det_dia[context[0].dataIndex]
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            color: '#9ca3af',
            font: { size: 11 },
            callback: (v) => isCurrency ? 'R$' + (v/1000).toFixed(0)+'k' : v
          }
        }
      }
    }
  });
}

// ─── Gráfico 2: Barras de Gasto Total por Mês ─────────────────
function renderChartGastos() {
  const ctx = document.getElementById('chartGastos').getContext('2d');
  const meses = DADOS.meses_disponiveis;
  const labels = meses.map(capitalizar);

  const cfg        = metricaAtiva ? METRICAS_CARDS[metricaAtiva] : null;
  const campo      = cfg ? cfg.campo : 'ia_custo_total';
  const cor        = cfg ? cfg.cor : '#8b5cf6';
  const isCurrency = cfg ? cfg.isCurrency : true;
  const isTime     = cfg ? cfg.isTime : false;
  const tituloGrafico = cfg ? cfg.label + ' por Mês' : 'Gasto Total por Mês';
  const subGrafico    = cfg ? 'Volume mensal de ' + cfg.label.toLowerCase() : 'Custo total de IA acumulado no mês';

  const titleEl = document.querySelector('#chartGastos')?.closest('.chart-card')?.querySelector('.chart-card__title');
  const subEl   = document.querySelector('#chartGastos')?.closest('.chart-card')?.querySelector('.chart-card__sub');
  if (titleEl) titleEl.textContent = tituloGrafico;
  if (subEl)   subEl.textContent   = subGrafico;

  // Atualiza as legendas HTML
  const elDotGastos = document.getElementById('legend-dot-gastos');
  const elTextGastos = document.getElementById('legend-text-gastos');
  if (elDotGastos) elDotGastos.style.background = cor;
  if (elTextGastos) elTextGastos.textContent = cfg ? cfg.label : 'Custo Total IA (R$)';

  const valores = meses.map(m => {
    const d = getDadosAgregados('mes', m);
    if (!d) return 0;
    if (isTime) return timeToSeconds(d[campo] || '00:00');
    return parseFloat(d[campo]) || 0;
  });

  const hexToRgba = (hex, a) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  };

  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, hexToRgba(cor, 0.85));
  gradient.addColorStop(1, hexToRgba(cor, 0.20));

  if (chartGastos) chartGastos.destroy();

  chartGastos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: tituloGrafico,
        data: valores,
        backgroundColor: gradient,
        borderColor: hexToRgba(cor, 1),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1d2e',
          titleColor: '#fff',
          bodyColor: '#d1d5db',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (c) => {
              const v = c.parsed.y;
              const prefix = cfg ? cfg.label : 'Custo Total';
              if (isTime) return ` ${prefix}: ` + fmtTime(String(Math.floor(v/60)).padStart(2,'0') + ':' + String(v%60).padStart(2,'0'));
              if (isCurrency) return ` ${prefix}: R$ ${v.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
              return ` ${prefix}: ${v.toLocaleString('pt-BR')}`;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            color: '#9ca3af',
            font: { size: 11 },
            callback: (v) => {
              if (isCurrency) return 'R$' + (v/1000).toFixed(0) + 'k';
              if (isTime) return Math.floor(v/60) + 'min';
              return v;
            }
          }
        }
      }
    }
  });
}

// ─── Gráfico 3: Linha – Custo por Atendimento (Linha de Referência Histórica Global) ─────
function renderChartCusto() {
  const ctx = document.getElementById('chartCusto').getContext('2d');
  const meses = DADOS.meses_disponiveis;
  const labels = meses.map(capitalizar);
  // Usa overrideAgente='todos' para manter a evolução do custo por atendimento como referência histórica global fixa
  const valores = meses.map(m => parseFloat(getDadosAgregados('mes', m, null, null, 'todos')?.ia_custo_por_ligacao) || 0);

  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, 'rgba(16,185,129,0.2)');
  gradient.addColorStop(1, 'rgba(16,185,129,0.01)');

  if (chartCusto) chartCusto.destroy();

  chartCusto = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Custo médio / Atendimento',
        data: valores,
        borderColor: '#10b981',
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 9,
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1d2e',
          titleColor: '#fff',
          bodyColor: '#d1d5db',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => ` R$ ${ctx.parsed.y.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            color: '#9ca3af',
            font: { size: 11 },
            callback: (v) => 'R$ ' + v.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})
          }
        }
      }
    }
  });
}

function getDiasUteisMes(mesNome, ano = 2026) {
  const mapaMeses = {
    'janeiro': 0, 'fevereiro': 1, 'marco': 2, 'abril': 3,
    'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
    'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
  };
  const mIdx = mapaMeses[mesNome ? mesNome.toLowerCase() : 'agosto'] !== undefined ? mapaMeses[mesNome.toLowerCase()] : 7;
  const totalDiasNoMes = new Date(ano, mIdx + 1, 0).getDate();
  let diasUteis = 0;
  for (let d = 1; d <= totalDiasNoMes; d++) {
    const dayOfWeek = new Date(ano, mIdx, d).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      diasUteis++;
    }
  }
  return diasUteis;
}

function atualizarProjecoes() {
  if (typeof DADOS === 'undefined' || !DADOS || !DADOS.dias) return;

  const mesAtual = typeof mesSelecionado !== 'undefined' ? mesSelecionado : 'agosto';
  const anoAtual = 2026;
  const totalDiasUteisMes = getDiasUteisMes(mesAtual, anoAtual);

  let diasDoMes = Object.entries(DADOS.dias).filter(([dStr, info]) => info.mes === mesAtual);
  diasDoMes.sort((a, b) => a[0].localeCompare(b[0]));

  let diasUteisDecorridos = 0;

  diasDoMes.forEach(([dStr, info]) => {
    const parts = dStr.split('-');
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayOfWeek = dt.getDay();

    const c = info.clara || {};
    const cr = info.cris || {};

    const filterAgent = typeof agenteFiltro !== 'undefined' ? agenteFiltro : 'todos';
    let hasData = false;
    if (filterAgent === 'todos') {
      hasData = ((c.ura_total || 0) + (cr.ura_total || 0) + (c.vonix_recebidas || 0) + (cr.vonix_recebidas || 0) + (c.ia_atendimento_total || 0) + (cr.ia_atendimento_total || 0)) > 0;
    } else if (filterAgent === 'clara') {
      hasData = ((c.ura_total || 0) + (c.vonix_recebidas || 0) + (c.ia_atendimento_total || 0)) > 0;
    } else {
      hasData = ((cr.ura_total || 0) + (cr.vonix_recebidas || 0) + (cr.ia_atendimento_total || 0)) > 0;
    }

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && hasData) {
      diasUteisDecorridos++;
    }
  });

  if (diasUteisDecorridos === 0) diasUteisDecorridos = 1;

  const agregados = getDadosAtuais();
  const custoAcumulado = agregados ? (agregados.ia_custo_total || 0) : 0;
  const atendimentosAcumulados = agregados ? (agregados.ia_atendimento_total || 0) : 0;

  const ritmoCustoDiario = custoAcumulado / diasUteisDecorridos;
  const ritmoAtendDiario = atendimentosAcumulados / diasUteisDecorridos;

  const projecaoCustoFinal = ritmoCustoDiario * totalDiasUteisMes;
  const projecaoAtendFinal = Math.round(ritmoAtendDiario * totalDiasUteisMes);
  const mediaAtendPrevista = projecaoAtendFinal > 0 ? (projecaoCustoFinal / projecaoAtendFinal) : 0;

  const elRitmoCusto = document.getElementById('val-ritmo-custo-dia');
  const elRitmoAtend = document.getElementById('val-ritmo-atend-dia');
  const elRitmoAtendCard = document.getElementById('val-ritmo-atend-dia-card');
  const elProjCusto = document.getElementById('val-projecao-custo');
  const elProjAtend = document.getElementById('val-projecao-atend');
  const elMediaAtendPrev = document.getElementById('val-projecao-media-atend');

  if (elRitmoCusto) elRitmoCusto.textContent = fmtBRL(ritmoCustoDiario);
  if (elRitmoAtend) elRitmoAtend.textContent = fmtNum(Math.round(ritmoAtendDiario));
  if (elRitmoAtendCard) elRitmoAtendCard.textContent = fmtNum(Math.round(ritmoAtendDiario));
  if (elProjCusto) elProjCusto.textContent = fmtBRL(projecaoCustoFinal);
  if (elProjAtend) elProjAtend.textContent = fmtNum(projecaoAtendFinal);
  if (elMediaAtendPrev) elMediaAtendPrev.textContent = fmtBRL(mediaAtendPrevista);

  document.querySelectorAll('.val-dias-uteis-decorridos').forEach(el => el.textContent = `${diasUteisDecorridos}`);
  document.querySelectorAll('.val-dias-uteis-totais').forEach(el => el.textContent = `${totalDiasUteisMes}`);
}

// ─── Atualiza todo o Dashboard ──────────────────────────────────
function atualizarTudo() {
  atualizarCards();
  atualizarProjecoes();
  if (typeof renderChartComparativo === 'function') renderChartComparativo();
  if (typeof renderChartGastos === 'function') renderChartGastos();
  if (typeof renderChartCusto === 'function') renderChartCusto();
  if (typeof renderChartTabulacoes === 'function') renderChartTabulacoes();
  if (typeof renderTabelaTodasTabulacoes === 'function') renderTabelaTodasTabulacoes();
  if (typeof renderChartMotivosLigacoes === 'function') renderChartMotivosLigacoes();
  if (typeof renderTabelaMotivosLigacoes === 'function') renderTabelaMotivosLigacoes();
  if (typeof renderFunil === 'function') renderFunil();
}




// ─── Horário de atualização ─────────────────────────────────────
function setTimestamp() {
  const el = document.getElementById('last-update');
  if (el) {
    const now = new Date();
    el.textContent = now.toLocaleString('pt-BR', {
      day:'2-digit', month:'2-digit', year:'numeric',
      hour:'2-digit', minute:'2-digit'
    });
  }
}

// ─── Troca de Página (Gerencial / Tabulações / Simulador) ────────
let paginaAtual = 'gerencial';

function trocarPagina(pagina) {
  paginaAtual = pagina;

  // Atualiza abas
  document.querySelectorAll('.page-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.page === pagina);
  });

  // Mostra/esconde os <main>
  const elGerencial = document.getElementById('page-gerencial');
  const elTabulacoes = document.getElementById('page-tabulacoes');
  const elSimulador = document.getElementById('page-simulador');

  if (elGerencial) elGerencial.style.display = pagina === 'gerencial' ? '' : 'none';
  if (elTabulacoes) elTabulacoes.style.display = pagina === 'tabulacoes' ? '' : 'none';
  if (elSimulador) elSimulador.style.display = pagina === 'simulador' ? '' : 'none';

  // Controles de período e filtros que não se aplicam ao simulador
  const elFilterDropdown = document.querySelector('.filter-dropdown-container');
  const elControlsCommon = document.getElementById('controls-common');
  if (elFilterDropdown) elFilterDropdown.style.display = pagina === 'simulador' ? 'none' : '';
  if (elControlsCommon) elControlsCommon.style.display = pagina === 'simulador' ? 'none' : 'flex';

  if (pagina === 'tabulacoes') {
    // Aguarda o navegador aplicar display:block para renderizar o gráfico no tamanho correto
    requestAnimationFrame(() => {
      if (typeof renderChartTabulacoes === 'function') renderChartTabulacoes();
      if (typeof renderTabelaTodasTabulacoes === 'function') renderTabelaTodasTabulacoes();
      if (typeof renderChartMotivosLigacoes === 'function') renderChartMotivosLigacoes();
      if (typeof renderTabelaMotivosLigacoes === 'function') renderTabelaMotivosLigacoes();
    });
  } else if (pagina === 'simulador') {
    requestAnimationFrame(() => {
      if (typeof initSimulador === 'function') {
        initSimulador();
      }
    });
  }
}



// ─── Inicialização ──────────────────────────────────────────────
async function init() {
  try {
    // Adiciona timestamp para desativar cache do navegador
    const resp = await fetch('dados_dashboard.json?v=' + Date.now());
    if (!resp.ok) throw new Error('Arquivo não encontrado');
    DADOS = await resp.json();

    mesSelecionado = DADOS.mes_atual || 'agosto';

    criarFiltros();
    registrarClickCards();
    atualizarCards();
    renderChartComparativo();
    renderChartGastos();
    renderChartCusto();
    if (typeof renderFunil === 'function') renderFunil();
    initHoldAndDragCards();
    setTimestamp();
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px;font-family:Inter,sans-serif;color:#6b7280;">
        <strong style="color:#1a1d2e">Arquivo de dados não encontrado</strong>
        <p style="font-size:0.85rem">Execute o <code>dataload.py</code> primeiro para gerar o <code>dados_dashboard.json</code></p>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);


// ─── LÓGICA DE HOLD & REVEAL E GRÁFICOS PERSONALIZADOS ──────────────
let customChartsList = []; // Array de gráficos: [{ id, chartType, metricas: [{ cardId, campo, label, cor, isCurrency, isTime }] }]
let customChartInstances = {};
let holdTimer = null;
let activeHoldCardId = null;
let isHoldingCard = false;

function initHoldAndDragCards() {
  const cards = document.querySelectorAll('.card');

  // 1. Suporte a scroll via roda do mouse / trackpad durante o hold
  window.addEventListener('wheel', (e) => {
    if (isHoldingCard) {
      window.scrollBy({ top: e.deltaY, behavior: 'auto' });
    }
  }, { passive: true });

  // 2. Auto-scroll nas bordas da tela
  window.addEventListener('mousemove', (e) => {
    if (!isHoldingCard) return;

    const edgeThreshold = 100;
    const viewportHeight = window.innerHeight;

    if (e.clientY > viewportHeight - edgeThreshold) {
      window.scrollBy({ top: 18, behavior: 'auto' });
    } else if (e.clientY < edgeThreshold) {
      window.scrollBy({ top: -18, behavior: 'auto' });
    }
  });

  // 3. Listener Global de Liberação
  const handleGlobalRelease = (e) => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }

    if (isHoldingCard && activeHoldCardId) {
      const clientX = e.clientX || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0);
      const clientY = e.clientY || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : 0);
      
      const hoveredEl = document.elementFromPoint(clientX, clientY);
      const addBtn = hoveredEl ? hoveredEl.closest('.preview-slot-add-btn') : null;
      const existingChartCard = hoveredEl ? hoveredEl.closest('.custom-chart-card') : null;
      const modelCard = hoveredEl ? hoveredEl.closest('.preview-model-card') : null;
      const slot = hoveredEl ? hoveredEl.closest('#drop-slot-active, .preview-slot-card') : null;

      if (addBtn && customChartsList.length > 0) {
        if (METRICAS_CARDS[activeHoldCardId]) {
          adicionarMetricaAoGrafico(activeHoldCardId, customChartsList[0].id);
        } else {
          mesclarGraficos(activeHoldCardId, customChartsList[0].id);
        }
      } else if (existingChartCard) {
        const targetChartId = existingChartCard.id.replace('card_', '');
        if (activeHoldCardId !== targetChartId) {
          if (METRICAS_CARDS[activeHoldCardId]) {
            adicionarMetricaAoGrafico(activeHoldCardId, targetChartId);
          } else {
            mesclarGraficos(activeHoldCardId, targetChartId);
          }
        }
      } else if (modelCard) {
        const cType = modelCard.dataset.chartType || 'line';
        confirmChartCreation(activeHoldCardId, cType);
      } else if (slot) {
        confirmChartCreation(activeHoldCardId, 'line');
      } else {
        isHoldingCard = false;
        document.querySelectorAll('.card').forEach(c => c.classList.remove('card-holding'));
        activeHoldCardId = null;
        renderCustomCharts();
      }
    }
  };

  window.addEventListener('mouseup', handleGlobalRelease);
  window.addEventListener('touchend', handleGlobalRelease);

  cards.forEach(card => {
    const startHold = (e) => {
      const cardId = card.id;
      if (!METRICAS_CARDS[cardId]) return;

      activeHoldCardId = cardId;
      holdTimer = setTimeout(() => {
        isHoldingCard = true;
        card.classList.add('card-holding');
        showPreviewZone(cardId);

        const section = document.getElementById('custom-charts-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 120);
    };

    const handleMouseLeave = (e) => {
      if (!isHoldingCard && holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
    };

    card.addEventListener('mousedown', startHold);
    card.addEventListener('mouseleave', handleMouseLeave);
    card.addEventListener('touchstart', startHold, { passive: true });

    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.id);
      activeHoldCardId = card.id;
      isHoldingCard = true;
      card.classList.add('card-holding');
      showPreviewZone(card.id);

      const section = document.getElementById('custom-charts-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    card.addEventListener('dragend', (e) => {
      isHoldingCard = false;
      document.querySelectorAll('.card').forEach(c => c.classList.remove('card-holding'));
      activeHoldCardId = null;
      renderCustomCharts();
    });
  });
}

function showPreviewZone(cardId) {
  const section = document.getElementById('custom-charts-section');
  const grid = document.getElementById('custom-charts-grid');
  if (!section || !grid) return;

  section.style.display = 'block';

  const cfg = METRICAS_CARDS[cardId];
  const label = cfg ? cfg.label : 'Métrica';

  const previewSlotHTML = (isFull = false, titleText = '') => {
    return `
      <div class="preview-slot-card ${isFull ? 'preview-slot-card--full' : ''}" id="drop-slot-active">
        <span class="preview-slot-card__title">${titleText}</span>
        <div class="preview-slot-models-grid">
          <div class="preview-model-card" data-chart-type="line" onclick="confirmChartCreation('${cardId}', 'line')">
            <div class="preview-model-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
            </div>
            <span class="preview-model-name">Linha</span>
            <span class="preview-model-hint">Evolução temporal</span>
          </div>

          <div class="preview-model-card" data-chart-type="bar" onclick="confirmChartCreation('${cardId}', 'bar')">
            <div class="preview-model-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
            </div>
            <span class="preview-model-name">Barra</span>
            <span class="preview-model-hint">Comparativo mensal</span>
          </div>

          <div class="preview-model-card" data-chart-type="pie" onclick="confirmChartCreation('${cardId}', 'pie')">
            <div class="preview-model-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
            </div>
            <span class="preview-model-name">Pizza</span>
            <span class="preview-model-hint">Proporção do total</span>
          </div>
        </div>
      </div>
    `;
  };

  const chartCardHTML = (chartItem, index) => {
    return `
      <div class="custom-chart-card" id="card_${chartItem.id}">
        <div class="custom-chart-card__header">
          <div>
            <p class="chart-card__title">Gráfico ${index + 1} (${chartItem.chartType.toUpperCase()})</p>
            <div class="custom-chart-card__metric-chips">
              ${chartItem.metricas.map((m, mIdx) => `
                <span class="metric-chip" style="border-left: 3px solid ${m.cor};">
                  ${m.label}
                  <button class="metric-chip__remove" onclick="removerMetricaDoGrafico('${chartItem.id}', ${mIdx})" title="Remover métrica">✕</button>
                </span>
              `).join('')}
            </div>
          </div>
          <button class="custom-chart-card__btn-close" onclick="removerGraficoPersonalizado('${chartItem.id}')" title="Fechar gráfico">✕</button>
        </div>
        <button class="preview-slot-add-btn" onclick="adicionarMetricaAoGrafico('${cardId}', '${chartItem.id}')" style="margin: 10px 14px 4px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          <span>+ Adicionar ${label} ao Gráfico ${index + 1}</span>
        </button>
        <div class="chart-canvas-wrapper">
          <canvas id="canvas_${chartItem.id}"></canvas>
        </div>
      </div>
    `;
  };

  if (customChartsList.length === 0) {
    grid.innerHTML = previewSlotHTML(true, `Sugestão de Gráfico: ${label}`);
  } else if (customChartsList.length === 1) {
    grid.innerHTML = `
      ${chartCardHTML(customChartsList[0], 0)}
      ${previewSlotHTML(false, `Criar 2º Gráfico: ${label}`)}
    `;
    renderSingleCustomChartCanvas(customChartsList[0]);
  } else {
    grid.innerHTML = `
      ${chartCardHTML(customChartsList[0], 0)}
      ${chartCardHTML(customChartsList[1], 1)}
    `;
    renderSingleCustomChartCanvas(customChartsList[0]);
    renderSingleCustomChartCanvas(customChartsList[1]);
  }

  bindPreviewDropEvents(cardId);
}

function bindPreviewDropEvents(cardId) {
  const modelCards = document.querySelectorAll('.preview-model-card');
  modelCards.forEach(card => {
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.classList.add('drop-over');
    });
    card.addEventListener('dragleave', () => {
      card.classList.remove('drop-over');
    });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drop-over');
      const chartType = card.dataset.chartType || 'line';
      confirmChartCreation(cardId, chartType);
    });
  });

  const chartCards = document.querySelectorAll('#custom-charts-grid .custom-chart-card');
  chartCards.forEach(chartCard => {
    const targetChartId = chartCard.id.replace('card_', '');

    chartCard.addEventListener('dragover', (e) => {
      e.preventDefault();
      chartCard.classList.add('drop-over-card');
    });

    chartCard.addEventListener('dragleave', () => {
      chartCard.classList.remove('drop-over-card');
    });

    chartCard.addEventListener('drop', (e) => {
      e.preventDefault();
      chartCard.classList.remove('drop-over-card');
      const sourceChartId = e.dataTransfer.getData('text/custom-chart-id');
      const droppedKpiId = e.dataTransfer.getData('text/plain') || cardId || activeHoldCardId;

      if (sourceChartId && sourceChartId !== targetChartId) {
        mesclarGraficos(sourceChartId, targetChartId);
      } else if (droppedKpiId) {
        if (METRICAS_CARDS[droppedKpiId]) {
          adicionarMetricaAoGrafico(droppedKpiId, targetChartId);
        } else if (droppedKpiId !== targetChartId) {
          mesclarGraficos(droppedKpiId, targetChartId);
        }
      }
    });
  });
}

function confirmChartCreation(cardId, chartType) {
  if (holdTimer) clearTimeout(holdTimer);
  isHoldingCard = false;
  activeHoldCardId = null;
  document.querySelectorAll('.card').forEach(c => c.classList.remove('card-holding'));
  criarGraficoPersonalizado(cardId, chartType);
}

function criarGraficoPersonalizado(cardId, chartType = 'line') {
  const cfg = METRICAS_CARDS[cardId];
  if (!cfg) return;

  if (customChartsList.length >= 2) {
    adicionarMetricaAoGrafico(cardId, customChartsList[1].id);
    return;
  }

  const customId = `custom_${Date.now()}`;
  customChartsList.push({
    id: customId,
    chartType: chartType,
    metricas: [{
      cardId: cardId,
      campo: cfg.campo,
      label: cfg.label,
      cor: cfg.cor,
      isCurrency: cfg.isCurrency,
      isTime: cfg.isTime
    }]
  });

  renderCustomCharts();
}

function adicionarMetricaAoGrafico(cardId, chartId) {
  const cfg = METRICAS_CARDS[cardId];
  if (!cfg) return;

  const targetChart = customChartsList.find(c => c.id === chartId);
  if (!targetChart) return;

  // Evita duplicar a mesma métrica no mesmo gráfico
  const jaExiste = targetChart.metricas.some(m => m.cardId === cardId);
  if (!jaExiste) {
    targetChart.metricas.push({
      cardId: cardId,
      campo: cfg.campo,
      label: cfg.label,
      cor: cfg.cor,
      isCurrency: cfg.isCurrency,
      isTime: cfg.isTime
    });
  }

  if (holdTimer) clearTimeout(holdTimer);
  isHoldingCard = false;
  activeHoldCardId = null;
  document.querySelectorAll('.card').forEach(c => c.classList.remove('card-holding'));

  renderCustomCharts();
}

function removerMetricaDoGrafico(chartId, metricIndex) {
  const targetChart = customChartsList.find(c => c.id === chartId);
  if (!targetChart) return;

  targetChart.metricas.splice(metricIndex, 1);
  if (targetChart.metricas.length === 0) {
    removerGraficoPersonalizado(chartId);
  } else {
    renderCustomCharts();
  }
}

function removerGraficoPersonalizado(customId) {
  customChartsList = customChartsList.filter(c => c.id !== customId);
  renderCustomCharts();
}

function renderCustomCharts() {
  const section = document.getElementById('custom-charts-section');
  const grid = document.getElementById('custom-charts-grid');
  if (!grid || !section) return;

  Object.values(customChartInstances).forEach(inst => {
    if (inst && typeof inst.destroy === 'function') inst.destroy();
  });
  customChartInstances = {};

  if (customChartsList.length === 0) {
    if (!isHoldingCard) section.style.display = 'none';
    grid.innerHTML = '';
    return;
  }

  section.style.display = 'block';
  const isSingle = customChartsList.length === 1;

  grid.innerHTML = customChartsList.map(item => `
    <div class="custom-chart-card ${isSingle ? 'custom-chart-card--full' : ''}" id="card_${item.id}">
      <div class="custom-chart-card__header">
        <div>
          <p class="chart-card__title">Gráfico Personalizado (${item.chartType.toUpperCase()})</p>
          <div class="custom-chart-card__metric-chips">
            ${item.metricas.map((m, mIdx) => `
              <span class="metric-chip" style="border-left: 3px solid ${m.cor};">
                ${m.label}
                <button class="metric-chip__remove" onclick="removerMetricaDoGrafico('${item.id}', ${mIdx})" title="Remover métrica">✕</button>
              </span>
            `).join('')}
          </div>
        </div>
        <button class="custom-chart-card__btn-close" onclick="removerGraficoPersonalizado('${item.id}')" title="Fechar gráfico">✕</button>
      </div>
      <div class="chart-canvas-wrapper">
        <canvas id="canvas_${item.id}"></canvas>
      </div>
    </div>
  `).join('');

  customChartsList.forEach(item => {
    renderSingleCustomChartCanvas(item);

    const el = document.getElementById(`card_${item.id}`);
    if (el) {
      // Habilita arrastar o próprio gráfico
      el.setAttribute('draggable', 'true');
      el.style.cursor = 'grab';

      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/custom-chart-id', item.id);
        e.dataTransfer.setData('text/plain', item.id);
        activeHoldCardId = item.id;
        el.classList.add('card-dragging');
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('card-dragging');
        activeHoldCardId = null;
      });

      // Habilita receber soltura de outros gráficos ou cards
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.classList.add('drop-over-card');
      });

      el.addEventListener('dragleave', () => {
        el.classList.remove('drop-over-card');
      });

      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drop-over-card');
        const sourceChartId = e.dataTransfer.getData('text/custom-chart-id');
        const droppedKpiId = e.dataTransfer.getData('text/plain') || activeHoldCardId;

        if (sourceChartId && sourceChartId !== item.id) {
          mesclarGraficos(sourceChartId, item.id);
        } else if (droppedKpiId && droppedKpiId !== item.id) {
          if (METRICAS_CARDS[droppedKpiId]) {
            adicionarMetricaAoGrafico(droppedKpiId, item.id);
          } else {
            mesclarGraficos(droppedKpiId, item.id);
          }
        }
      });
    }
  });
}

function extrairValorMetrica(d, campo, isTime) {
  if (!d) return 0;
  if (isTime) {
    const valStr = d[campo] || '00:00';
    return typeof timeToSeconds === 'function' ? timeToSeconds(String(valStr)) : 0;
  }
  return parseFloat(d[campo]) || 0;
}

function renderSingleCustomChartCanvas(item) {
  const canvasEl = document.getElementById(`canvas_${item.id}`);
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');

  if (customChartInstances[item.id]) {
    try { customChartInstances[item.id].destroy(); } catch(e) {}
  }

  const meses = (typeof DADOS !== 'undefined' && DADOS.meses_disponiveis) ? DADOS.meses_disponiveis : [];

  if (item.chartType === 'pie') {
    let pieLabels = [];
    let pieData = [];
    let pieColors = [];

    if (item.metricas.length > 1) {
      // Múltiplas métricas no mesmo gráfico de pizza: compara o volume de cada métrica
      item.metricas.forEach(m => {
        const d = (modoFiltroAtual === 'mes' && mesSelecionado) ? getDadosAgregados('mes', mesSelecionado) : getDadosAgregados('tudo');
        const val = extrairValorMetrica(d, m.campo, m.isTime);
        pieLabels.push(m.label);
        pieColors.push(m.cor);
        pieData.push(val);
      });
    } else {
      // Métrica única distribuída pelos meses
      const mSingle = item.metricas[0] || { campo: 'ura_total', cor: '#6366f1', label: 'URA' };
      const palette = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
      meses.forEach((m, idx) => {
        const d = getDadosAgregados('mes', m);
        const val = extrairValorMetrica(d, mSingle.campo, mSingle.isTime);
        pieLabels.push(capitalizar(m));
        pieColors.push(palette[idx % palette.length]);
        pieData.push(val);
      });
    }

    const totalSum = pieData.reduce((a, b) => a + b, 0);

    const isDark = document.body.classList.contains('dark-mode');
    customChartInstances[item.id] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: pieLabels.length > 0 ? pieLabels : ['Sem Dados'],
        datasets: [{
          data: totalSum > 0 ? pieData : (pieData.length > 0 ? pieData.map(() => 1) : [1]),
          backgroundColor: totalSum > 0 ? pieColors : (pieColors.length > 0 ? pieColors.map(() => '#cbd5e1') : ['#cbd5e1']),
          borderWidth: 2,
          borderColor: isDark ? '#191c24' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: isDark ? '#e5e7eb' : '#475569', font: { size: 11, family: 'Inter, sans-serif' }, boxWidth: 12, padding: 12 }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                if (totalSum === 0) return ` ${context.label}: Sem dados`;
                const val = pieData[context.dataIndex] || 0;
                const mInfo = item.metricas[context.dataIndex] || item.metricas[0];
                if (mInfo && mInfo.isTime && typeof secondsToTime === 'function') return ` ${context.label}: ${secondsToTime(val)}`;
                if (mInfo && mInfo.isCurrency) return ` ${context.label}: R$ ${val.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
                return ` ${context.label}: ${val.toLocaleString('pt-BR')}`;
              }
            }
          }
        }
      }
    });

  } else if (item.chartType === 'bar') {
    const labels = meses.map(capitalizar);
    const datasets = item.metricas.map(m => {
      const values = meses.map(mesStr => {
        const d = getDadosAgregados('mes', mesStr);
        return extrairValorMetrica(d, m.campo, m.isTime);
      });
      return {
        label: m.label,
        data: values,
        backgroundColor: hexToRgba(m.cor, 0.8),
        borderColor: m.cor,
        borderWidth: 1.5,
        borderRadius: 5
      };
    });

    customChartInstances[item.id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: item.metricas.length > 1, position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                const mInfo = item.metricas[context.datasetIndex] || item.metricas[0];
                if (mInfo && mInfo.isTime && typeof secondsToTime === 'function') return ` ${context.dataset.label}: ${secondsToTime(val)}`;
                if (mInfo && mInfo.isCurrency) return ` ${context.dataset.label}: R$ ${val.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
                return ` ${context.dataset.label}: ${val.toLocaleString('pt-BR')}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' }
          }
        }
      }
    });

  } else {
    const labels = meses.map(capitalizar);
    const datasets = item.metricas.map(m => {
      const values = meses.map(mesStr => {
        const d = getDadosAgregados('mes', mesStr);
        return extrairValorMetrica(d, m.campo, m.isTime);
      });
      const gradFill = ctx.createLinearGradient(0, 0, 0, 200);
      gradFill.addColorStop(0, hexToRgba(m.cor, 0.25));
      gradFill.addColorStop(1, hexToRgba(m.cor, 0.01));

      return {
        label: m.label,
        data: values,
        borderColor: m.cor,
        backgroundColor: gradFill,
        borderWidth: 2.5,
        fill: item.metricas.length === 1,
        tension: 0.3
      };
    });

    customChartInstances[item.id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: item.metricas.length > 1, position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                const mInfo = item.metricas[context.datasetIndex] || item.metricas[0];
                if (mInfo && mInfo.isTime && typeof secondsToTime === 'function') return ` ${context.dataset.label}: ${secondsToTime(val)}`;
                if (mInfo && mInfo.isCurrency) return ` ${context.dataset.label}: R$ ${val.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
                return ` ${context.dataset.label}: ${val.toLocaleString('pt-BR')}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' }
          }
        }
      }
    });
  }
}


function mesclarGraficos(sourceChartId, targetChartId) {
  if (sourceChartId === targetChartId) return;

  const sourceChart = customChartsList.find(c => c.id === sourceChartId);
  const targetChart = customChartsList.find(c => c.id === targetChartId);

  if (!sourceChart || !targetChart) return;

  // Copia as métricas do gráfico de origem para o gráfico de destino sem duplicar
  sourceChart.metricas.forEach(mSrc => {
    const jaExiste = targetChart.metricas.some(mDst => mDst.cardId === mSrc.cardId);
    if (!jaExiste) {
      targetChart.metricas.push({ ...mSrc });
    }
  });

  // Remove o gráfico de origem após mesclar
  customChartsList = customChartsList.filter(c => c.id !== sourceChartId);
  renderCustomCharts();
}

window.mesclarGraficos = mesclarGraficos;

window.criarGraficoPersonalizado = criarGraficoPersonalizado;
window.adicionarMetricaAoGrafico = adicionarMetricaAoGrafico;
window.removerMetricaDoGrafico = removerMetricaDoGrafico;
window.removerGraficoPersonalizado = removerGraficoPersonalizado;
window.limparGraficosPersonalizados = () => {
  customChartsList = [];
  renderCustomCharts();
};

window.toggleTema = () => {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  
  const icon = document.querySelector('.moon-icon');
  if (icon) {
    if (isDark) {
      icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    } else {
      icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }
  }

  if (typeof renderCustomCharts === 'function') {
    renderCustomCharts();
  }
  if (typeof recalcularSimulacao === 'function' && paginaAtual === 'simulador') {
    recalcularSimulacao();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    const icon = document.querySelector('.moon-icon');
    if(icon) {
      icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    }
  }
});
