// ─── Simulador de Custo de Agente - Voz / IA ─────────────────────
// Módulo autônomo responsável pelos cálculos de dimensionamento financeiro

const MATRIZ_TAXAS_SIMULADOR = {
  padrao: {
    nome: 'Gemini 3.1 Flash Lite / GPT 5.4 Nano',
    taxaBase: 0.078,
    faixaMin: 0.075,
    faixaMax: 0.080,
    badge: 'Gemini 3.1 / GPT 5.4'
  },
  custom: {
    nome: 'Personalizado',
    taxaBase: 0.080,
    faixaMin: 0.070,
    faixaMax: 0.090,
    badge: 'Personalizado'
  }
};

let modeloSimuladorSelecionado = 'padrao';
let chartSimuladorModelos = null;
let chartSimuladorCenarios = null;

// Converte string de TMA em segundos inteiros
function parseTMASimulador(str) {
  if (!str) return 0;
  const s = String(str).trim().toLowerCase().replace('s', '');
  if (s.includes(':')) {
    const parts = s.split(':');
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  if (s.includes('m')) {
    const parts = s.split('m');
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n);
}

// Formata segundos em MM:SS
function formatTMASimulador(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Formata valores monetários em Dólar
function fmtUSDSimulador(val, digits = 2) {
  if (val === null || val === undefined || isNaN(val)) return '$ 0,00';
  return '$ ' + Number(val).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// Formata valores monetários em Real
function fmtBRLSimulador(val, digits = 2) {
  if (val === null || val === undefined || isNaN(val)) return 'R$ 0,00';
  return 'R$ ' + Number(val).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// Formata números inteiros com separador
function fmtNumSimulador(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString('pt-BR');
}

// Altera o modelo de LLM ativo no simulador
function selecionarModeloSimulador(key) {
  modeloSimuladorSelecionado = key;
  document.querySelectorAll('.model-card-option').forEach(el => el.classList.remove('selected'));
  const card = document.getElementById(`card-model-${key}`);
  if (card) card.classList.add('selected');

  const customPanel = document.getElementById('custom-rates-panel');
  if (customPanel) {
    customPanel.style.display = key === 'custom' ? 'grid' : 'none';
  }

  recalcularSimulacao();
}

// Funções de preenchimento rápido dos inputs
function setAtendimentosSimulador(val) {
  const el = document.getElementById('input-atendimentos-dia');
  if (el) el.value = val;
  recalcularSimulacao();
}

function setDiasSimulador(val) {
  const el = document.getElementById('input-dias-mes');
  if (el) el.value = val;
  const p22 = document.getElementById('pill-dias-22');
  const p30 = document.getElementById('pill-dias-30');
  if (p22) p22.classList.toggle('active', val === 22);
  if (p30) p30.classList.toggle('active', val === 30);
  recalcularSimulacao();
}

function setTMASimulador(val) {
  const el = document.getElementById('input-tma');
  if (el) el.value = val;
  recalcularSimulacao();
}

function setCotacaoSimulador(val) {
  const el = document.getElementById('input-cotacao-dolar');
  if (el) el.value = val.toFixed(2);
  recalcularSimulacao();
}

// Executa o recálculo matemático completo do simulador
function recalcularSimulacao() {
  const elAtend = document.getElementById('input-atendimentos-dia');
  const elDias = document.getElementById('input-dias-mes');
  const elTMA = document.getElementById('input-tma');
  const elCotacao = document.getElementById('input-cotacao-dolar');

  if (!elAtend || !elDias || !elTMA || !elCotacao) return;

  const atendimentosDia = Math.max(0, parseInt(elAtend.value, 10) || 0);
  const diasMes = Math.max(0, parseInt(elDias.value, 10) || 0);
  const tmaStr = elTMA.value;
  const cotacaoDolar = Math.max(0.1, parseFloat(elCotacao.value) || 5.50);

  const tmaSegundos = parseTMASimulador(tmaStr);
  const minutosTMA = tmaSegundos / 60;

  // Volumes operacionais
  const minutosDia = atendimentosDia * minutosTMA;
  const ligacoesMes = atendimentosDia * diasMes;
  const minutosMes = minutosDia * diasMes;

  // Taxas do modelo selecionado
  let taxaBase, faixaMin, faixaMax, badgeNome;
  if (modeloSimuladorSelecionado === 'custom') {
    taxaBase = parseFloat(document.getElementById('input-custom-base')?.value) || 0.080;
    faixaMin = parseFloat(document.getElementById('input-custom-min')?.value) || 0.070;
    faixaMax = parseFloat(document.getElementById('input-custom-max')?.value) || 0.090;
    badgeNome = 'Personalizado';
    const previewEl = document.getElementById('custom-rate-preview');
    if (previewEl) previewEl.innerHTML = `$ ${taxaBase.toFixed(3).replace('.', ',')} <span style="font-size:0.75rem; font-weight:500;">/ min</span>`;
  } else {
    const config = MATRIZ_TAXAS_SIMULADOR[modeloSimuladorSelecionado] || MATRIZ_TAXAS_SIMULADOR.padrao;
    taxaBase = config.taxaBase;
    faixaMin = config.faixaMin;
    faixaMax = config.faixaMax;
    badgeNome = config.badge;
  }

  // Cálculos financeiros em USD
  const custoDiarioCentralUSD = minutosDia * taxaBase;
  const custoMensalCentralUSD = minutosMes * taxaBase;
  const custoMensalMinUSD = minutosMes * faixaMin;
  const custoMensalMaxUSD = minutosMes * faixaMax;

  const custoDiarioMinUSD = minutosDia * faixaMin;
  const custoDiarioMaxUSD = minutosDia * faixaMax;

  const custoUnitarioCentralUSD = atendimentosDia > 0 ? (custoDiarioCentralUSD / atendimentosDia) : 0;
  const custoUnitarioMinUSD = atendimentosDia > 0 ? (custoDiarioMinUSD / atendimentosDia) : 0;
  const custoUnitarioMaxUSD = atendimentosDia > 0 ? (custoDiarioMaxUSD / atendimentosDia) : 0;

  // Conversões em BRL
  const custoDiarioCentralBRL = custoDiarioCentralUSD * cotacaoDolar;
  const custoMensalCentralBRL = custoMensalCentralUSD * cotacaoDolar;
  const custoMensalMinBRL = custoMensalMinUSD * cotacaoDolar;
  const custoMensalMaxBRL = custoMensalMaxUSD * cotacaoDolar;

  const custoDiarioMinBRL = custoDiarioMinUSD * cotacaoDolar;
  const custoDiarioMaxBRL = custoDiarioMaxUSD * cotacaoDolar;

  const custoUnitarioCentralBRL = custoUnitarioCentralUSD * cotacaoDolar;
  const custoUnitarioMinBRL = custoUnitarioMinUSD * cotacaoDolar;
  const custoUnitarioMaxBRL = custoUnitarioMaxUSD * cotacaoDolar;

  // Atualização dos Cards Operacionais Mantidos
  const elOpLig = document.getElementById('card-op-ligacoes-mes');
  if (elOpLig) elOpLig.textContent = fmtNumSimulador(ligacoesMes);

  const elOpMinDia = document.getElementById('card-op-minutos-dia');
  if (elOpMinDia) elOpMinDia.textContent = fmtNumSimulador(Math.round(minutosDia)) + ' min';

  const elOpMinMes = document.getElementById('card-op-minutos-mes');
  if (elOpMinMes) elOpMinMes.textContent = fmtNumSimulador(Math.round(minutosMes)) + ' min';

  // Atualização dos Cards Financeiros
  const elFinDiaUSD = document.getElementById('card-fin-custo-dia-usd');
  if (elFinDiaUSD) elFinDiaUSD.textContent = fmtUSDSimulador(custoDiarioCentralUSD);

  const elFinDiaBRL = document.getElementById('card-fin-custo-dia-brl');
  if (elFinDiaBRL) elFinDiaBRL.textContent = fmtBRLSimulador(custoDiarioCentralBRL);

  const elFinMesUSD = document.getElementById('card-fin-custo-mes-usd');
  if (elFinMesUSD) elFinMesUSD.textContent = fmtUSDSimulador(custoMensalCentralUSD);

  const elFinMesBRL = document.getElementById('card-fin-custo-mes-brl');
  if (elFinMesBRL) elFinMesBRL.textContent = fmtBRLSimulador(custoMensalCentralBRL);

  const elFinUnitUSD = document.getElementById('card-fin-custo-unit-usd');
  if (elFinUnitUSD) elFinUnitUSD.textContent = fmtUSDSimulador(custoUnitarioCentralUSD, 3);

  const elFinUnitBRL = document.getElementById('card-fin-custo-unit-brl');
  if (elFinUnitBRL) elFinUnitBRL.textContent = fmtBRLSimulador(custoUnitarioCentralBRL, 2);

  const elFinFaixaUSD = document.getElementById('card-fin-faixa-usd');
  if (elFinFaixaUSD) elFinFaixaUSD.textContent = `${fmtUSDSimulador(custoMensalMinUSD)} — ${fmtUSDSimulador(custoMensalMaxUSD)}`;

  const elFinFaixaBRL = document.getElementById('card-fin-faixa-brl');
  if (elFinFaixaBRL) elFinFaixaBRL.textContent = `${fmtBRLSimulador(custoMensalMinBRL)} — ${fmtBRLSimulador(custoMensalMaxBRL)}`;

  // Atualização da Tabela de Cenários
  const elTblBadge = document.getElementById('table-model-badge');
  if (elTblBadge) elTblBadge.textContent = badgeNome;

  // Cenário Mínimo
  const elTblMinTaxa = document.getElementById('tbl-min-taxa');
  if (elTblMinTaxa) elTblMinTaxa.textContent = `$ ${faixaMin.toFixed(3).replace('.', ',')} / min`;

  const elTblMinDiaUSD = document.getElementById('tbl-min-diario-usd');
  if (elTblMinDiaUSD) elTblMinDiaUSD.textContent = fmtUSDSimulador(custoDiarioMinUSD);

  const elTblMinDiaBRL = document.getElementById('tbl-min-diario-brl');
  if (elTblMinDiaBRL) elTblMinDiaBRL.textContent = fmtBRLSimulador(custoDiarioMinBRL);

  const elTblMinMesUSD = document.getElementById('tbl-min-mensal-usd');
  if (elTblMinMesUSD) elTblMinMesUSD.textContent = fmtUSDSimulador(custoMensalMinUSD);

  const elTblMinMesBRL = document.getElementById('tbl-min-mensal-brl');
  if (elTblMinMesBRL) elTblMinMesBRL.textContent = fmtBRLSimulador(custoMensalMinBRL);

  const elTblMinUnitUSD = document.getElementById('tbl-min-unit-usd');
  if (elTblMinUnitUSD) elTblMinUnitUSD.textContent = fmtUSDSimulador(custoUnitarioMinUSD, 3);

  const elTblMinUnitBRL = document.getElementById('tbl-min-unit-brl');
  if (elTblMinUnitBRL) elTblMinUnitBRL.textContent = fmtBRLSimulador(custoUnitarioMinBRL);

  const varMin = custoMensalCentralUSD > 0 ? (((custoMensalMinUSD - custoMensalCentralUSD) / custoMensalCentralUSD) * 100).toFixed(1) : '0.0';
  const elTblMinVar = document.getElementById('tbl-min-var');
  if (elTblMinVar) elTblMinVar.textContent = `${varMin}%`;

  // Cenário Normal
  const elTblCentralTaxa = document.getElementById('tbl-central-taxa');
  if (elTblCentralTaxa) elTblCentralTaxa.textContent = `$ ${taxaBase.toFixed(3).replace('.', ',')} / min`;

  const elTblCentralDiaUSD = document.getElementById('tbl-central-diario-usd');
  if (elTblCentralDiaUSD) elTblCentralDiaUSD.textContent = fmtUSDSimulador(custoDiarioCentralUSD);

  const elTblCentralDiaBRL = document.getElementById('tbl-central-diario-brl');
  if (elTblCentralDiaBRL) elTblCentralDiaBRL.textContent = fmtBRLSimulador(custoDiarioCentralBRL);

  const elTblCentralMesUSD = document.getElementById('tbl-central-mensal-usd');
  if (elTblCentralMesUSD) elTblCentralMesUSD.textContent = fmtUSDSimulador(custoMensalCentralUSD);

  const elTblCentralMesBRL = document.getElementById('tbl-central-mensal-brl');
  if (elTblCentralMesBRL) elTblCentralMesBRL.textContent = fmtBRLSimulador(custoMensalCentralBRL);

  const elTblCentralUnitUSD = document.getElementById('tbl-central-unit-usd');
  if (elTblCentralUnitUSD) elTblCentralUnitUSD.textContent = fmtUSDSimulador(custoUnitarioCentralUSD, 3);

  const elTblCentralUnitBRL = document.getElementById('tbl-central-unit-brl');
  if (elTblCentralUnitBRL) elTblCentralUnitBRL.textContent = fmtBRLSimulador(custoUnitarioCentralBRL);

  // Cenário Máximo
  const elTblMaxTaxa = document.getElementById('tbl-max-taxa');
  if (elTblMaxTaxa) elTblMaxTaxa.textContent = `$ ${faixaMax.toFixed(3).replace('.', ',')} / min`;

  const elTblMaxDiaUSD = document.getElementById('tbl-max-diario-usd');
  if (elTblMaxDiaUSD) elTblMaxDiaUSD.textContent = fmtUSDSimulador(custoDiarioMaxUSD);

  const elTblMaxDiaBRL = document.getElementById('tbl-max-diario-brl');
  if (elTblMaxDiaBRL) elTblMaxDiaBRL.textContent = fmtBRLSimulador(custoDiarioMaxBRL);

  const elTblMaxMesUSD = document.getElementById('tbl-max-mensal-usd');
  if (elTblMaxMesUSD) elTblMaxMesUSD.textContent = fmtUSDSimulador(custoMensalMaxUSD);

  const elTblMaxMesBRL = document.getElementById('tbl-max-mensal-brl');
  if (elTblMaxMesBRL) elTblMaxMesBRL.textContent = fmtBRLSimulador(custoMensalMaxBRL);

  const elTblMaxUnitUSD = document.getElementById('tbl-max-unit-usd');
  if (elTblMaxUnitUSD) elTblMaxUnitUSD.textContent = fmtUSDSimulador(custoUnitarioMaxUSD, 3);

  const elTblMaxUnitBRL = document.getElementById('tbl-max-unit-brl');
  if (elTblMaxUnitBRL) elTblMaxUnitBRL.textContent = fmtBRLSimulador(custoUnitarioMaxBRL);

  const varMax = custoMensalCentralUSD > 0 ? (((custoMensalMaxUSD - custoMensalCentralUSD) / custoMensalCentralUSD) * 100).toFixed(1) : '0.0';
  const elTblMaxVar = document.getElementById('tbl-max-var');
  if (elTblMaxVar) elTblMaxVar.textContent = `+${varMax}%`;

  // Renderização dos Gráficos
  renderGraficosSimulador(minutosMes, cotacaoDolar, custoMensalMinBRL, custoMensalCentralBRL, custoMensalMaxBRL);
}

// Renderiza os gráficos de apoio do simulador com cores normalizadas e sem parenteses
function renderGraficosSimulador(minutosMes, cotacao, minBRL, centralBRL, maxBRL) {
  const isDark = document.body.classList.contains('dark-mode');
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  // 1. Gráfico de Comparação de Categorias - USD
  const custoPadraoUSD = minutosMes * MATRIZ_TAXAS_SIMULADOR.padrao.taxaBase;
  const customTaxa = parseFloat(document.getElementById('input-custom-base')?.value) || 0.080;
  const custoCustomUSD = minutosMes * customTaxa;

  const labelsModelos = ['Gemini 3.1 / GPT 5.4'];
  const dataModelos = [custoPadraoUSD];
  const bgModelos = ['#6366f1'];

  if (modeloSimuladorSelecionado === 'custom') {
    labelsModelos.push('Personalizado');
    dataModelos.push(custoCustomUSD);
    bgModelos.push('#6366f1');
  }

  const ctxModelos = document.getElementById('chartModelosComp');
  if (ctxModelos) {
    if (chartSimuladorModelos) chartSimuladorModelos.destroy();
    chartSimuladorModelos = new Chart(ctxModelos, {
      type: 'bar',
      data: {
        labels: labelsModelos,
        datasets: [{
          label: 'Custo Mensal USD',
          data: dataModelos,
          backgroundColor: bgModelos,
          borderRadius: 6,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => `Custo: $ ${item.raw.toFixed(2).replace('.', ',')} · R$ ${(item.raw * cotacao).toFixed(2).replace('.', ',')}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: 'Inter', size: 11, weight: '600' } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'Inter', size: 10 },
              callback: (v) => '$ ' + v
            }
          }
        }
      }
    });
  }

  // 2. Gráfico de Cenários - BRL
  const ctxCenarios = document.getElementById('chartCenariosComp');
  if (ctxCenarios) {
    if (chartSimuladorCenarios) chartSimuladorCenarios.destroy();
    chartSimuladorCenarios = new Chart(ctxCenarios, {
      type: 'bar',
      data: {
        labels: ['Cenário Mínimo', 'Cenário Normal', 'Cenário Máximo'],
        datasets: [{
          label: 'Custo Mensal BRL',
          data: [minBRL, centralBRL, maxBRL],
          backgroundColor: ['#6366f1', '#6366f1', '#6366f1'],
          borderRadius: 6,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => `Total: R$ ${item.raw.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: 'Inter', size: 11, weight: '600' } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'Inter', size: 10 },
              callback: (v) => 'R$ ' + v.toLocaleString('pt-BR')
            }
          }
        }
      }
    });
  }
}

// Inicializador do simulador
function initSimulador() {
  recalcularSimulacao();
}

// Expor funções globalmente para eventos inline
window.selecionarModeloSimulador = selecionarModeloSimulador;
window.setAtendimentosSimulador = setAtendimentosSimulador;
window.setDiasSimulador = setDiasSimulador;
window.setTMASimulador = setTMASimulador;
window.setCotacaoSimulador = setCotacaoSimulador;
window.recalcularSimulacao = recalcularSimulacao;
window.initSimulador = initSimulador;
