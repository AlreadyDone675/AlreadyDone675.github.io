// ─── Configurações Gerais ───────────────────────────────────────
const ESCONDER_MESES_FUTUROS = true; // Muda para false quando chegar em 2027 para voltar a mostrar os meses do ano novo

// ─── Filtro Mês / Período ───────────────────────────────────────
let modoFiltroAtual = 'mes'; // 'mes' | 'periodo'

function toggleFiltroDropdown(e, source = 'body') {
  if (e) e.stopPropagation();
  const popover = document.getElementById('filter-popover');
  const btn = document.getElementById('btn-filter-trigger');
  const isOpen = popover.style.display !== 'none';

  if (isOpen) {
    fecharPopover();
  } else {
    popover.style.display = 'block';
    btn.classList.add('open');
    
    if (source === 'body' && modoFiltroAtual === 'periodo') {
      document.getElementById('popover-mode-select').style.display = 'none';
      document.getElementById('calendar-section').style.display = 'block';
    } else {
      document.getElementById('popover-mode-select').style.display = 'block';
      document.getElementById('calendar-section').style.display = 'none';
    }
  }
}

function fecharPopover() {
  const pop = document.getElementById('filter-popover');
  const btn = document.getElementById('btn-filter-trigger');
  if (pop) pop.style.display = 'none';
  if (btn) btn.classList.remove('open');
}

// Clica fora fecha o popover
document.addEventListener('click', (e) => {
  const container = document.querySelector('.filter-dropdown-container');
  if (container && !container.contains(e.target)) {
    fecharPopover();
  }
});

function selecionarModoFiltro(modo) {
  modoFiltroAtual = modo;

  const optMes = document.getElementById('opt-por-mes');
  const optPeriodo = document.getElementById('opt-por-periodo');
  const optTudo = document.getElementById('opt-por-tudo');
  const modeSelect = document.getElementById('popover-mode-select');
  const calSection = document.getElementById('calendar-section');
  const monthWrapper = document.getElementById('month-carousel-wrapper');
  const periodDisplay = document.getElementById('period-badge-display');
  const periodTextDisplay = document.getElementById('period-text-display');
  const labelTrigger = document.getElementById('filtro-tipo-label');

  if (optMes) optMes.classList.toggle('active', modo === 'mes');
  if (optPeriodo) optPeriodo.classList.toggle('active', modo === 'periodo');
  if (optTudo) optTudo.classList.toggle('active', modo === 'tudo');

  if (modo === 'mes') {
    monthWrapper.style.display = 'flex';
    periodDisplay.style.display = 'none';
    labelTrigger.textContent = 'Mês';
    fecharPopover();
    if (typeof calDateStart !== 'undefined') {
      calDateStart = null;
      calDateEnd = null;
      calClickCount = 0;
    }
    if (typeof atualizarTudo === 'function') {
      atualizarTudo();
    }
  } else if (modo === 'tudo') {
    monthWrapper.style.display = 'none';
    periodDisplay.style.display = 'flex';
    if (periodTextDisplay) periodTextDisplay.textContent = 'Todos os Períodos';
    labelTrigger.textContent = 'Tudo';
    fecharPopover();
    if (typeof calDateStart !== 'undefined') {
      calDateStart = null;
      calDateEnd = null;
      calClickCount = 0;
    }
    if (typeof atualizarTudo === 'function') {
      atualizarTudo();
    }
  } else {
    // Período: esconde as opções e mostra o calendário no popover
    modeSelect.style.display = 'none';
    calSection.style.display = 'block';
    monthWrapper.style.display = 'none';
    periodDisplay.style.display = 'flex';
    labelTrigger.textContent = 'Período';
    if (typeof renderCalendar === 'function') {
      renderCalendar();
    }
  }
}

// ─── Carrossel de Meses ─────────────────────────────────────────
function scrollMeses(direcao) {
  const container = document.getElementById('filtros-meses');
  if (container) container.scrollBy({ left: direcao * 120, behavior: 'smooth' });
}

// ─── Filtro de Mês ──────────────────────────────────────────────
function selecionarMes(mes) {
  if (typeof mesSelecionado !== 'undefined') {
    mesSelecionado = mes;
  }

  document.querySelectorAll('[data-mes]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mes === mes);
  });

  if (typeof atualizarTudo === 'function') {
    atualizarTudo();
  }
}

// ─── Cria botões de filtro de mês dinamicamente ────────────────
function criarFiltros() {
  const container = document.getElementById('filtros-meses');
  if (!container) return;
  container.innerHTML = '';

  if (typeof DADOS !== 'undefined' && DADOS.meses_disponiveis) {
    let mesesSem2027 = new Set();
    
    if (ESCONDER_MESES_FUTUROS && DADOS.dias) {
      Object.entries(DADOS.dias).forEach(([dataStr, info]) => {
        if (!dataStr.startsWith('2027')) {
          mesesSem2027.add(info.mes);
        }
      });
    }

    const mesesPt = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const currentMonthIndex = new Date().getMonth();

    DADOS.meses_disponiveis.forEach(mes => {
      // Pula meses que só existem em 2027 (se a trava estiver ativa)
      if (ESCONDER_MESES_FUTUROS && DADOS.dias && !mesesSem2027.has(mes)) return;

      const btn = document.createElement('button');
      // eslint-disable-next-line no-undef
      btn.className = 'btn-filter' + (mes === mesSelecionado ? ' active' : '');
      
      // Apaga os meses futuros
      if (mesesPt.indexOf(mes) > currentMonthIndex) {
        btn.classList.add('future-month');
      }

      btn.dataset.mes = mes;
      
      const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);
      btn.textContent = capitalizar(mes);
      
      btn.onclick = () => selecionarMes(mes);
      container.appendChild(btn);
    });
  }
}

// ─── Filtro de Agente (Tabulações) ─────────────────────────────
let agenteFiltro = 'todos';

function filtrarAgente(agente) {
  agenteFiltro = agente;

  document.querySelectorAll('#filtros-agente .btn-filter').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.agente === agente);
  });

  if (typeof atualizarTudo === 'function') {
    atualizarTudo();
  } else {
    if (typeof renderChartTabulacoes === 'function') renderChartTabulacoes();
    if (typeof renderTabelaTodasTabulacoes === 'function') renderTabelaTodasTabulacoes();
    if (typeof renderChartMotivosLigacoes === 'function') renderChartMotivosLigacoes();
    if (typeof renderTabelaMotivosLigacoes === 'function') renderTabelaMotivosLigacoes();
  }
}
