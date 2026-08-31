/**
 * Modulo: forecast_drawer.js
 * Responsabilidade: Controlar o painel lateral de detalhes e projecoes.
 * Adapta a interface dinamicamente:
 * - Mes Aberto/Atual: Exibe 3 Cenários Benchmark, Filtro de Janela Temporal e Projecao Prophet.
 * - Mes Passado/Fechado: Exibe Destaques Retroativos (Maior/Menor dia, Maior TMA/TME, Distribuicao Real).
 * Mantem dimensao da janela fixa e uniforme.
 */

const FORECAST_SERVICE_URL = (typeof window !== 'undefined' && window.FORECAST_API_URL)
  ? window.FORECAST_API_URL
  : 'http://localhost:5001/api';

const forecastDrawerState = {
  activeMetric: 'ia_atendimento_total',
  activeMetricLabel: 'Atendimento IA',
  timeWindowDays: 30,
  chartInstance: null,
  rawHistorico: [],
  rawProjecao: [],
  isPastMonth: false
};

// Formatadores
function fmtDrawerNum(val) {
  return Number(val || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function fmtDrawerBRL(val) {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarValorPorMetrica(val, metricaId) {
  if (metricaId === 'ia_custo_total') {
    return fmtDrawerBRL(val);
  }
  return fmtDrawerNum(val);
}

function obterAgenteAtivo() {
  if (typeof agenteFiltro !== 'undefined' && agenteFiltro) {
    return agenteFiltro;
  }
  return 'todos';
}

function obterMesAtivo() {
  if (typeof modoFiltroAtual !== 'undefined' && modoFiltroAtual === 'mes') {
    if (typeof mesSelecionado !== 'undefined' && mesSelecionado) {
      return mesSelecionado.toLowerCase();
    }
  }
  return 'agosto';
}

// ─── Inicializacao ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  inicializarEventosDrawer();
});

function inicializarEventosDrawer() {
  // Delegacao de clique nos botoes de detalhes dos cards
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-card-details');
    if (btn) {
      const metricId = btn.dataset.metric;
      const metricLabel = btn.dataset.label || btn.closest('.card, .card-static')?.querySelector('.card__label')?.textContent?.trim() || 'Métrica';
      abrirForecastDrawer(metricId, metricLabel);
    }
  });

  // Fechar Drawer
  const btnClose = document.getElementById('drawer-forecast-btn-close');
  const backdrop = document.getElementById('drawer-forecast-backdrop');

  if (btnClose) btnClose.addEventListener('click', fecharForecastDrawer);
  if (backdrop) backdrop.addEventListener('click', fecharForecastDrawer);

  // Botoes de Janela Temporal do Grafico
  document.querySelectorAll('.drawer-time-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.drawer-time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const days = parseInt(btn.dataset.days, 10);
      forecastDrawerState.timeWindowDays = days;

      if (forecastDrawerState.rawHistorico.length > 0) {
        renderizarGraficoDrawer(forecastDrawerState.rawHistorico, forecastDrawerState.rawProjecao);
      }
    });
  });
}

// ─── Abertura e Fechamento ──────────────────────────────────
function abrirForecastDrawer(metricId, metricLabel) {
  forecastDrawerState.activeMetric = metricId;
  forecastDrawerState.activeMetricLabel = metricLabel;

  const mesAtivo = obterMesAtivo();
  const elTitle = document.getElementById('drawer-forecast-metric-title');
  const elBadge = document.getElementById('drawer-forecast-agent-badge');
  const backdrop = document.getElementById('drawer-forecast-backdrop');
  const panel = document.getElementById('drawer-forecast-panel');

    const mesFormatado = mesAtivo.charAt(0).toUpperCase() + mesAtivo.slice(1);
  if (elTitle) elTitle.textContent = `${metricLabel} — ${mesFormatado}`;
  if (elBadge) elBadge.textContent = obterAgenteAtivo();

  if (backdrop) backdrop.classList.add('open');
  if (panel) panel.classList.add('open');
  document.documentElement.classList.add('drawer-open');
  document.body.classList.add('drawer-open');
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  // Renderiza a secao de Dias de Pico imediatamente com dados locais em memoria
  if (typeof renderDiasPico === 'function') {
    renderDiasPico(
      metricId,
      mesAtivo,
      obterAgenteAtivo(),
      'drawer-peak-days-container'
    );
  }

  carregarDadosProjecao();
}

function fecharForecastDrawer() {
  const backdrop = document.getElementById('drawer-forecast-backdrop');
  const panel = document.getElementById('drawer-forecast-panel');

  if (backdrop) backdrop.classList.remove('open');
  if (panel) panel.classList.remove('open');
  document.documentElement.classList.remove('drawer-open');
  document.body.classList.remove('drawer-open');
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
}

// ─── Requisicao ao Microservico ─────────────────────────────
async function carregarDadosProjecao() {
  const loading = document.getElementById('drawer-forecast-loading');
  if (loading) loading.classList.add('active');

  const mesAtivo = obterMesAtivo();

  const payload = {
    metric: forecastDrawerState.activeMetric,
    agent: obterAgenteAtivo(),
    month: mesAtivo,
    scenario_factor: 1.0,
    horizon_days: 15,
    end_of_month: '2026-08-31'
  };

  try {
    const res = await fetch(`${FORECAST_SERVICE_URL}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Servico de projecao retornou status ${res.status}`);
    }

    const data = await res.json();
    const resultado = data.resultado;

    forecastDrawerState.rawHistorico = resultado.historico || [];
    forecastDrawerState.rawProjecao = resultado.projecao || [];
    forecastDrawerState.isPastMonth = !!resultado.is_mes_passado;

    alternarVisaoMes(resultado);
    renderizarGraficoDrawer(forecastDrawerState.rawHistorico, forecastDrawerState.rawProjecao);
    renderizarSazonalidadeDrawer(resultado.sazonalidade_semanal);

    if (typeof renderDiasPico === 'function') {
      renderDiasPico(
        forecastDrawerState.activeMetric,
        obterMesAtivo(),
        obterAgenteAtivo(),
        'drawer-peak-days-container'
      );
    }

  } catch (err) {
    console.error('[ForecastDrawer] Falha ao carregar dados:', err);
  } finally {
    if (loading) loading.classList.remove('active');
  }
}

// ─── Alternancia entre Mes Atual e Mes Passado ──────────────
function alternarVisaoMes(resultado) {
  const viewCurrent = document.getElementById('drawer-view-current-month');
  const viewPast = document.getElementById('drawer-view-past-month');
  const chartTitle = document.getElementById('drawer-chart-title');
  const seasonTitle = document.getElementById('drawer-seasonality-title');

  if (resultado.is_mes_passado) {
    // MODO MÊS PASSADO (RETROATIVO)
    if (viewCurrent) viewCurrent.style.display = 'none';
    if (viewPast) viewPast.style.display = 'block';

    const mesCap = resultado.mes_nome ? (resultado.mes_nome.charAt(0).toUpperCase() + resultado.mes_nome.slice(1)) : 'Mês Fechado';
    if (chartTitle) chartTitle.textContent = `Evolução Realizada — ${mesCap}`;
    if (seasonTitle) seasonTitle.textContent = `Distribuição por Dia da Semana — ${mesCap}`;

    atualizarDestaquesMesPassado(resultado.sumario);
  } else {
    // MODO MÊS ATUAL / ABERTO (PROJEÇÃO)
    if (viewCurrent) viewCurrent.style.display = 'block';
    if (viewPast) viewPast.style.display = 'none';

    if (chartTitle) chartTitle.textContent = 'Evolução Histórica e Projeção';
    if (seasonTitle) seasonTitle.textContent = 'Distribuição por Dia da Semana';

    atualizarTresCenarios(resultado.sumario);
  }
}

// ─── Atualizacao de Mês Passado ─────────────────────────────
function atualizarDestaquesMesPassado(sumario) {
  if (!sumario) return;
  const metric = forecastDrawerState.activeMetric;

  // 1. Total Realizado e Media
  const elTotal = document.getElementById('drawer-past-total');
  const elMedia = document.getElementById('drawer-past-media');
  if (elTotal) elTotal.textContent = formatarValorPorMetrica(sumario.total_realizado_mes, metric);
  if (elMedia) elMedia.textContent = `Média: ${formatarValorPorMetrica(sumario.media_diaria_mes, metric)} / dia útil`;

  // 2. Maior Dia de Volume
  const elMaxVal = document.getElementById('drawer-past-max-val');
  const elMaxSub = document.getElementById('drawer-past-max-sub');
  if (sumario.dia_maior) {
    if (elMaxVal) elMaxVal.textContent = formatarValorPorMetrica(sumario.dia_maior.valor, metric);
    if (elMaxSub) elMaxSub.textContent = `Data: ${sumario.dia_maior.data}`;
  } else {
    if (elMaxVal) elMaxVal.textContent = '—';
    if (elMaxSub) elMaxSub.textContent = 'Sem registros';
  }

  // 3. Menor Dia de Volume
  const elMinVal = document.getElementById('drawer-past-min-val');
  const elMinSub = document.getElementById('drawer-past-min-sub');
  if (sumario.dia_menor) {
    if (elMinVal) elMinVal.textContent = formatarValorPorMetrica(sumario.dia_menor.valor, metric);
    if (elMinSub) elMinSub.textContent = `Data: ${sumario.dia_menor.data}`;
  } else {
    if (elMinVal) elMinVal.textContent = '—';
    if (elMinSub) elMinSub.textContent = 'Sem registros';
  }

  // 4. Destaques de Tempo (TMA e TME)
  const rowTimes = document.getElementById('drawer-past-times-row');
  const cardTma = document.getElementById('drawer-past-tma-card');
  const cardTme = document.getElementById('drawer-past-tme-card');
  const elTmaVal = document.getElementById('drawer-past-tma-val');
  const elTmaSub = document.getElementById('drawer-past-tma-sub');
  const elTmeVal = document.getElementById('drawer-past-tme-val');
  const elTmeSub = document.getElementById('drawer-past-tme-sub');

  let hasTimes = false;

  if (sumario.maior_tma && sumario.maior_tma.valor && sumario.maior_tma.valor !== '00:00') {
    if (cardTma) cardTma.style.display = 'flex';
    if (elTmaVal) elTmaVal.textContent = sumario.maior_tma.valor;
    if (elTmaSub) elTmaSub.textContent = `Data: ${sumario.maior_tma.data}`;
    hasTimes = true;
  } else if (cardTma) {
    cardTma.style.display = 'none';
  }

  if (sumario.maior_tme && sumario.maior_tme.valor && sumario.maior_tme.valor !== '00:00') {
    if (cardTme) cardTme.style.display = 'flex';
    if (elTmeVal) elTmeVal.textContent = sumario.maior_tme.valor;
    if (elTmeSub) elTmeSub.textContent = `Data: ${sumario.maior_tme.data}`;
    hasTimes = true;
  } else if (cardTme) {
    cardTme.style.display = 'none';
  }

  if (rowTimes) {
    rowTimes.style.display = hasTimes ? 'grid' : 'none';
  }
}

// ─── Atualizacao dos 3 Cenarios Benchmark (Mes Atual) ────────
function atualizarTresCenarios(sumario) {
  if (!sumario) return;
  const metric = forecastDrawerState.activeMetric;

  // 1. Ritmo Recente
  const recente = sumario.cenario_recente || {};
  const elRecenteProj = document.getElementById('drawer-kpi-recente-proj');
  const elRecenteMedia = document.getElementById('drawer-kpi-recente-media');
  if (elRecenteProj) elRecenteProj.textContent = formatarValorPorMetrica(recente.total_projetado || sumario.total_projetado_mes, metric);
  if (elRecenteMedia) elRecenteMedia.textContent = `Média: ${formatarValorPorMetrica(recente.media_diaria || sumario.media_diaria_projetada, metric)} / dia`;

  // 2. Media Historica Global
  const hist = sumario.cenario_historico || {};
  const elHistProj = document.getElementById('drawer-kpi-hist-proj');
  const elHistMedia = document.getElementById('drawer-kpi-hist-media');
  if (elHistProj) elHistProj.textContent = formatarValorPorMetrica(hist.total_projetado, metric);
  if (elHistMedia) elHistMedia.textContent = `Média: ${formatarValorPorMetrica(hist.media_diaria, metric)} / dia`;

  // 3. Cenario Minimo
  const min = sumario.cenario_minimo || {};
  const elMinProj = document.getElementById('drawer-kpi-min-proj');
  const elMinMedia = document.getElementById('drawer-kpi-min-media');
  if (elMinProj) elMinProj.textContent = formatarValorPorMetrica(min.total_projetado, metric);
  if (elMinMedia) elMinMedia.textContent = `Média: ${formatarValorPorMetrica(min.media_diaria, metric)} / dia`;
}

function renderizarSazonalidadeDrawer(sazonalidadeList) {
  const grid = document.getElementById('drawer-seasonality-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!sazonalidadeList || sazonalidadeList.length === 0) return;

  const siglas = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

  sazonalidadeList.forEach(item => {
    const card = document.createElement('div');
    card.className = 'drawer-seasonality-day';
    card.innerHTML = `
      <div class="drawer-day-name">${siglas[item.dia_indice]}</div>
      <div class="drawer-day-val">${formatarValorPorMetrica(item.media_diaria, forecastDrawerState.activeMetric)}</div>
      <div class="drawer-day-pct">${item.indice_relativo_pct}%</div>
    `;
    grid.appendChild(card);
  });
}

// ─── Grafico Chart.js ───────────────────────────────────────
function renderizarGraficoDrawer(historico, projecao) {
  const canvas = document.getElementById('drawerForecastMainChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let histSlice = historico;
  // Aplica corte de janela apenas se for mes atual
  if (!forecastDrawerState.isPastMonth) {
    const windowDays = forecastDrawerState.timeWindowDays;
    if (windowDays > 0 && historico.length > windowDays) {
      histSlice = historico.slice(-windowDays);
    }
  }

  const labels = [];
  const dadosRealizados = [];
  const dadosProjetados = [];
  const dadosUpper = [];
  const dadosLower = [];

  histSlice.forEach(pt => {
    labels.push(pt.ds.substring(5)); // MM-DD
    dadosRealizados.push(pt.y);
    dadosProjetados.push(null);
    dadosUpper.push(null);
    dadosLower.push(null);
  });

  if (projecao && projecao.length > 0) {
    if (histSlice.length > 0) {
      const ultimoPt = histSlice[histSlice.length - 1];
      dadosProjetados[dadosProjetados.length - 1] = ultimoPt.y;
      dadosUpper[dadosUpper.length - 1] = ultimoPt.y;
      dadosLower[dadosLower.length - 1] = ultimoPt.y;
    }

    projecao.forEach(pt => {
      labels.push(pt.ds.substring(5)); // MM-DD
      dadosRealizados.push(null);
      dadosProjetados.push(pt.yhat);
      dadosUpper.push(pt.yhat_upper);
      dadosLower.push(pt.yhat_lower);
    });
  }

  if (forecastDrawerState.chartInstance) {
    forecastDrawerState.chartInstance.destroy();
  }

  const datasets = [
    {
      label: 'Realizado',
      data: dadosRealizados,
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      borderWidth: 2.5,
      tension: 0.2,
      pointRadius: 3,
      pointBackgroundColor: '#38bdf8',
      pointBorderColor: '#191c24',
      pointBorderWidth: 1.5,
      fill: false
    }
  ];

  if (projecao && projecao.length > 0) {
    datasets.push(
      {
        label: 'Projeção',
        data: dadosProjetados,
        borderColor: '#c084fc',
        borderDash: [6, 4],
        borderWidth: 2.5,
        tension: 0.2,
        pointRadius: 3.5,
        pointBackgroundColor: '#c084fc',
        pointBorderColor: '#191c24',
        pointBorderWidth: 1.5,
        fill: false
      },
      {
        label: 'Banda Superior',
        data: dadosUpper,
        borderColor: 'transparent',
        backgroundColor: 'rgba(192, 132, 252, 0.16)',
        pointRadius: 0,
        fill: '+1'
      },
      {
        label: 'Banda Inferior',
        data: dadosLower,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        pointRadius: 0,
        fill: false
      }
    );
  }

  forecastDrawerState.chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#e5e7eb',
            boxWidth: 14,
            font: { size: 12, weight: '600' },
            filter: function(item) {
              return !item.text.includes('Banda');
            }
          }
        },
        tooltip: {
          backgroundColor: '#191c24',
          borderColor: '#282c37',
          borderWidth: 1,
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          padding: 10,
          boxPadding: 4,
          callbacks: {
            label: function(context) {
              const val = context.parsed.y;
              if (val === null || val === undefined) return '';
              const dsLabel = context.dataset.label;
              return `${dsLabel}: ${formatarValorPorMetrica(val, forecastDrawerState.activeMetric)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.07)' },
          ticks: { color: '#9ca3af', font: { size: 11, weight: '500' }, maxRotation: 45 }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.07)' },
          ticks: {
            color: '#9ca3af',
            font: { size: 11, weight: '500' },
            callback: function(val) {
              if (forecastDrawerState.activeMetric === 'ia_custo_total') {
                return 'R$ ' + Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
              }
              return val;
            }
          }
        }
      }
    }
  });
}
