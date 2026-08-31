// ─── Filtros de Origem de Tabulação ─────────────────────────────────
// Filtro do gráfico Top 10 (Eleven Labs / Zendesk)
let origemTabFiltro = 'eleven';

// Filtro próprio da sessão de Todas as Tabulações (Eleven Labs / Zendesk)
let origemTodasTabFiltro = 'eleven';

/**
 * Verifica se o mês selecionado é Junho ou Julho (meses sem dados de Zendesk/Motivos)
 */
function isMesSemDadosZendesk() {
  const mes = (typeof mesSelecionado !== 'undefined' && mesSelecionado) 
    ? mesSelecionado.toLowerCase() 
    : 'agosto';
  return mes === 'junho' || mes === 'julho';
}

/**
 * Define a origem ativa para o gráfico Top 10 e atualiza a visualização
 */
function filtrarOrigemTabulacao(origem) {
  origemTabFiltro = origem;

  document.querySelectorAll('#filtros-tabulacao-origem .btn-filter').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.origem === origem);
  });

  renderChartTabulacoes();
}

/**
 * Define a origem ativa exclusiva da nova sessão (Eleven Labs / Zendesk)
 */
function filtrarOrigemTodasTabulacoes(origem) {
  origemTodasTabFiltro = origem;

  document.querySelectorAll('#filtros-todas-tab-origem .btn-filter').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.origem === origem);
  });

  const termo = document.getElementById('busca-tabulacoes')?.value || '';
  renderTabelaTodasTabulacoes(termo);
}

window.filtrarOrigemTabulacao = filtrarOrigemTabulacao;
window.filtrarOrigemTodasTabulacoes = filtrarOrigemTodasTabulacoes;

// Garante o binding de eventos de clique caso handlers inline sejam interceptados
document.addEventListener('click', (e) => {
  const btnTop = e.target.closest('#filtros-tabulacao-origem .btn-filter');
  if (btnTop) {
    const origem = btnTop.dataset.origem;
    if (origem) {
      filtrarOrigemTabulacao(origem);
    }
    return;
  }

  const btnSec = e.target.closest('#filtros-todas-tab-origem .btn-filter');
  if (btnSec) {
    const origem = btnSec.dataset.origem;
    if (origem) {
      filtrarOrigemTodasTabulacoes(origem);
    }
  }
});

// ─── Extração de Dados Base de Tabulações ────────────────────────────
/**
 * Extrai a lista de tabulações brutas conforme os filtros de agente e de origem selecionados
 */
function getListaTabulacoesFiltradas(origemAlvo = origemTabFiltro) {
  const dados = (typeof getDadosAtuais === 'function') ? getDadosAtuais() : null;
  let tabsObj = null;
  if (dados && dados.tabulacoes) {
    if (origemAlvo === 'zendesk') {
      tabsObj = dados.tabulacoes.zendesk;
    } else {
      // Padrão Eleven Labs (com fallback suave caso não haja dados específicos de eleven no mês)
      tabsObj = (dados.tabulacoes.eleven && (dados.tabulacoes.eleven.clara?.length || dados.tabulacoes.eleven.cris?.length))
        ? dados.tabulacoes.eleven
        : (dados.tabulacoes.total || dados.tabulacoes);
    }
  }

  const isValido = (n) => {
    if (!n || typeof n !== 'string') return false;
    const norm = n.toLowerCase().trim();
    if (norm.includes('total')) return false;
    if (norm.includes('workspace')) return false;
    if (norm.includes('eleven labs workspace')) return false;
    if (norm.includes('llm')) return false;
    if (norm.includes('motor')) return false;
    return true;
  };
  let lista = [];

  const filtroAg = (typeof agenteFiltro !== 'undefined') ? agenteFiltro : 'todos';

  if (filtroAg === 'todos') {
    const mapa = {};
    [...(tabsObj?.clara || []), ...(tabsObj?.cris || [])].forEach(item => {
      const n = item.nome;
      if (isValido(n) && item.valor !== undefined && item.valor !== null) {
        mapa[n] = (mapa[n] || 0) + (parseFloat(item.valor) || 0);
      }
    });
    lista = Object.entries(mapa).map(([nome, valor]) => ({ nome, valor }));
  } else if (filtroAg === 'clara') {
    lista = (tabsObj?.clara || []).filter(i => isValido(i.nome)).map(i => ({ nome: i.nome, valor: parseFloat(i.valor) || 0 }));
  } else {
    lista = (tabsObj?.cris || []).filter(i => isValido(i.nome)).map(i => ({ nome: i.nome, valor: parseFloat(i.valor) || 0 }));
  }

  return lista;
}

// ─── Gráfico 4: Barras Horizontais – Top 10 Tabulações ─────────
let chartTabulacoes = null;

/**
 * Renderiza o gráfico Top 10 Tabulações mantendo as categorias detalhadas originais
 */
function renderChartTabulacoes() {
  const canvas = document.getElementById('chartTabulacoes');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const emptyMsg = document.getElementById('tab-empty');
  const badge    = document.getElementById('tab-badge');
  const subtitle = document.getElementById('tab-subtitle');
  
  const periodoText = (typeof modoFiltroAtual !== 'undefined' && modoFiltroAtual === 'mes') ? (typeof capitalizar === 'function' ? capitalizar(mesSelecionado) : mesSelecionado) : 'o Período Selecionado';
  const sufixoOrigem = origemTabFiltro === 'zendesk' ? ' · Zendesk' : ' · Eleven Labs';

  const filtroAg = (typeof agenteFiltro !== 'undefined') ? agenteFiltro : 'todos';
  if (badge) {
    if (filtroAg === 'todos') badge.textContent = `Todos os Agentes${sufixoOrigem}`;
    else if (filtroAg === 'clara') badge.textContent = `Clara${sufixoOrigem}`;
    else badge.textContent = `Cris${sufixoOrigem}`;
  }
  if (subtitle) subtitle.textContent = `Top 10 tabulações em ${periodoText}`;

  // Se for Zendesk nos meses de Junho ou Julho, exibe exclusivamente "Sem dados"
  if (origemTabFiltro === 'zendesk' && isMesSemDadosZendesk()) {
    if (emptyMsg) {
      emptyMsg.innerHTML = '<div style="padding: 30px; font-size: 1rem; font-weight: 600; color: #9ca3af; text-align: center;">Sem dados</div>';
      emptyMsg.style.display = 'block';
    }
    if (chartTabulacoes) { chartTabulacoes.destroy(); chartTabulacoes = null; }
    return;
  }

  // Monta lista conforme filtro de agente e origem do gráfico
  let lista = getListaTabulacoesFiltradas(origemTabFiltro);

  // Ordena por valor desc e pega top 10
  lista.sort((a, b) => b.valor - a.valor);
  const top10 = lista.slice(0, 10);

  if (top10.length === 0) {
    if (emptyMsg) {
      emptyMsg.innerHTML = '<div style="padding: 30px; font-size: 1rem; font-weight: 600; color: #9ca3af; text-align: center;">Sem dados</div>';
      emptyMsg.style.display = 'block';
    }
    if (chartTabulacoes) { chartTabulacoes.destroy(); chartTabulacoes = null; }
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';

  const labels = top10.map(i => i.nome);
  const valores = top10.map(i => i.valor);

  // Gradiente de cor para as barras
  const cores = top10.map((_, idx) => {
    const alpha = 1 - (idx / top10.length) * 0.45;
    return `rgba(99,102,241,${alpha.toFixed(2)})`;
  });

  if (chartTabulacoes) chartTabulacoes.destroy();

  chartTabulacoes = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Ocorrências',
        data: valores,
        backgroundColor: cores,
        borderColor: cores.map(c => c.replace(/[\d.]+\)$/, '1)')),
        borderWidth: 1.5,
        borderRadius: 5,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
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
            label: (ctx) => ` ${ctx.parsed.x.toLocaleString('pt-BR')} ocorrências`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { color: '#9ca3af', font: { size: 11 } }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: '#374151',
            font: { size: 11.5, weight: '500' },
            crossAlign: 'far'
          }
        }
      }
    }
  });
}

// ─── Nova Sessão: Todas as Tabulações Consolidadas ────────────────────

/**
 * Identifica se uma tabulação é referente a transferências
 */
function isTabulacaoTransferencia(nome) {
  if (!nome || typeof nome !== 'string') return false;
  const norm = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  if (norm.startsWith('nao transferido') || norm.startsWith('nao transferida')) {
    return false;
  }

  return norm.startsWith('transferencia') ||
         norm.startsWith('transferencias') ||
         norm.includes('/transferencia') ||
         norm.includes('transferencia/');
}

/**
 * Consolida as tabulações de transferência em "Transferencia",
 * calcula porcentagens sobre o total e ordena do maior para o menor volume.
 */
function getTabulacoesConsolidadas(lista) {
  if (!lista || lista.length === 0) return { itens: [], totalGeral: 0 };

  const mapa = {};
  lista.forEach(item => {
    const nomeOriginal = String(item.nome || '').trim();
    if (!nomeOriginal) return;

    const valor = parseFloat(item.valor) || 0;
    if (valor <= 0) return;

    const categoria = isTabulacaoTransferencia(nomeOriginal) ? 'Transferencia' : nomeOriginal;
    mapa[categoria] = (mapa[categoria] || 0) + valor;
  });

  const totalGeral = Object.values(mapa).reduce((acc, curr) => acc + curr, 0);

  const itens = Object.entries(mapa).map(([nome, valor]) => {
    const percentual = totalGeral > 0 ? (valor / totalGeral) * 100 : 0;
    return {
      nome,
      valor,
      percentual
    };
  });

  itens.sort((a, b) => b.valor - a.valor);

  return { itens, totalGeral };
}

/**
 * Escapa strings para evitar problemas de inserção HTML
 */
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Renderiza a nova sessão com indicadores e tabela detalhada de Todas as Tabulações
 */
function renderTabelaTodasTabulacoes(termoBusca = '') {
  const tbody = document.getElementById('tbody-todas-tabulacoes');
  const emptyMsg = document.getElementById('todas-tab-empty');
  const badge = document.getElementById('todas-tab-badge');
  const subtitle = document.getElementById('todas-tab-subtitle');

  const kpiVolume = document.getElementById('kpi-tab-total-volume');
  const kpiCategorias = document.getElementById('kpi-tab-total-categorias');
  const kpiPrincipal = document.getElementById('kpi-tab-principal');

  const periodoText = (typeof modoFiltroAtual !== 'undefined' && modoFiltroAtual === 'mes') ? (typeof capitalizar === 'function' ? capitalizar(mesSelecionado) : mesSelecionado) : 'o Período Selecionado';
  const sufixoOrigem = origemTodasTabFiltro === 'eleven' ? 'Eleven Labs' : 'Zendesk';
  const filtroAg = (typeof agenteFiltro !== 'undefined') ? agenteFiltro : 'todos';
  const sufixoAgente = filtroAg === 'clara' ? 'Clara' : (filtroAg === 'cris' ? 'Cris' : 'Todos os Agentes');

  if (badge) badge.textContent = `${sufixoAgente} · ${sufixoOrigem}`;
  if (subtitle) subtitle.textContent = `Distribuição completa de tabulações em ${periodoText}`;

  // Se for Zendesk nos meses de Junho ou Julho, exibe apenas "Sem dados"
  if (origemTodasTabFiltro === 'zendesk' && isMesSemDadosZendesk()) {
    if (kpiVolume) kpiVolume.textContent = '-';
    if (kpiCategorias) kpiCategorias.textContent = '-';
    if (kpiPrincipal) kpiPrincipal.textContent = 'Sem dados';
    if (tbody) tbody.innerHTML = '';
    if (emptyMsg) {
      emptyMsg.style.display = 'block';
      emptyMsg.innerHTML = '<div style="padding: 30px; font-size: 1rem; font-weight: 600; color: #9ca3af; text-align: center;">Sem dados</div>';
    }
    return;
  }

  // Usa o filtro de origem exclusivo da nova sessão (Eleven Labs ou Zendesk)
  const listaBruta = getListaTabulacoesFiltradas(origemTodasTabFiltro);
  const { itens, totalGeral } = getTabulacoesConsolidadas(listaBruta);

  if (kpiVolume) kpiVolume.textContent = totalGeral.toLocaleString('pt-BR');
  if (kpiCategorias) kpiCategorias.textContent = itens.length.toLocaleString('pt-BR');
  if (kpiPrincipal) {
    if (itens.length > 0) {
      const top = itens[0];
      kpiPrincipal.textContent = `${top.nome} · ${top.percentual.toFixed(1).replace('.', ',')}%`;
    } else {
      kpiPrincipal.textContent = '-';
    }
  }

  if (!tbody) return;
  tbody.innerHTML = '';

  const termoNorm = termoBusca ? termoBusca.toLowerCase().trim() : '';
  const itensExibir = termoNorm
    ? itens.filter(i => i.nome.toLowerCase().includes(termoNorm))
    : itens;

  if (itensExibir.length === 0) {
    if (emptyMsg) {
      emptyMsg.style.display = 'block';
      emptyMsg.innerHTML = '<div style="padding: 30px; font-size: 1rem; font-weight: 600; color: #9ca3af; text-align: center;">Sem dados</div>';
    }
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';

  const maxPercent = itens.length > 0 ? Math.max(...itens.map(i => i.percentual)) : 100;

  itensExibir.forEach(item => {
    const tr = document.createElement('tr');

    const rankGlobal = itens.indexOf(item) + 1;
    const rankClass = rankGlobal <= 3 ? `tab-rank-top tab-rank-${rankGlobal}` : 'tab-rank-default';

    const pctFormatado = item.percentual.toFixed(1).replace('.', ',') + '%';
    const volFormatado = item.valor.toLocaleString('pt-BR');
    const larguraBarra = Math.min(100, Math.max(1, (item.percentual / Math.max(maxPercent, 0.01)) * 100)).toFixed(1);

    tr.innerHTML = `
      <td style="text-align: center;">
        <span class="tab-rank-badge ${rankClass}">${rankGlobal}</span>
      </td>
      <td class="tab-cell-name">
        <span class="tab-name-text">${escapeHtml(item.nome)}</span>
      </td>
      <td style="text-align: right;" class="tab-cell-val">
        ${volFormatado}
      </td>
      <td style="text-align: right;" class="tab-cell-pct">
        <span class="tab-pct-badge">${pctFormatado}</span>
      </td>
      <td>
        <div class="tab-progress-track">
          <div class="tab-progress-fill" style="width: ${larguraBarra}%;"></div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Manipula a busca em tempo real na tabela de tabulações
 */
function filtrarTabelaTabulacoes() {
  const input = document.getElementById('busca-tabulacoes');
  const termo = input ? input.value : '';
  renderTabelaTodasTabulacoes(termo);
}

window.filtrarTabelaTabulacoes = filtrarTabelaTabulacoes;
window.renderTabelaTodasTabulacoes = renderTabelaTodasTabulacoes;

// ─── Terceira Sessão: Motivos das Ligações (ia_call_summary_title) ─────
let chartMotivos = null;

/**
 * Renderiza o gráfico de barras horizontais do Top 10 Motivos de Ligações
 */
function renderChartMotivosLigacoes() {
  const canvas = document.getElementById('chartMotivosLigacoes');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const emptyMsg = document.getElementById('motivos-chart-empty');

  // Nos meses de Junho e Julho, exibe exclusivamente "Sem dados"
  if (isMesSemDadosZendesk()) {
    if (emptyMsg) {
      emptyMsg.style.display = 'block';
      emptyMsg.innerHTML = '<div style="padding: 30px; font-size: 1rem; font-weight: 600; color: #9ca3af; text-align: center;">Sem dados</div>';
    }
    if (chartMotivos) { chartMotivos.destroy(); chartMotivos = null; }
    return;
  }

  const dados = (typeof getDadosAtuais === 'function') ? getDadosAtuais() : null;
  const lista = (dados && dados.motivos_ligacoes) ? dados.motivos_ligacoes : [];

  const top10 = lista.slice(0, 10);

  if (top10.length === 0) {
    if (emptyMsg) {
      emptyMsg.style.display = 'block';
      emptyMsg.innerHTML = '<div style="padding: 30px; font-size: 1rem; font-weight: 600; color: #9ca3af; text-align: center;">Sem dados</div>';
    }
    if (chartMotivos) { chartMotivos.destroy(); chartMotivos = null; }
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';

  const labels = top10.map(i => i.nome);
  const valores = top10.map(i => i.valor);

  const cores = top10.map((_, idx) => {
    const alpha = 1 - (idx / top10.length) * 0.45;
    return `rgba(99, 102, 241, ${alpha.toFixed(2)})`;
  });

  if (chartMotivos) chartMotivos.destroy();

  chartMotivos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Ocorrências',
        data: valores,
        backgroundColor: cores,
        borderColor: cores.map(c => c.replace(/[\d.]+\)$/, '1)')),
        borderWidth: 1.5,
        borderRadius: 5,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
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
            label: (ctx) => ` ${ctx.parsed.x.toLocaleString('pt-BR')} ocorrências`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { color: '#9ca3af', font: { size: 11 } }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: '#374151',
            font: { size: 11.5, weight: '500' },
            crossAlign: 'far'
          }
        }
      }
    }
  });
}

/**
 * Renderiza a tabela completa e ranqueada de Motivos das Ligações
 */
function renderTabelaMotivosLigacoes(termoBusca = '') {
  const tbody = document.getElementById('tbody-motivos-ligacoes');
  const emptyMsg = document.getElementById('motivos-tab-empty');
  const subtitle = document.getElementById('motivos-subtitle');

  const kpiVolume = document.getElementById('kpi-motivos-total-volume');
  const kpiCategorias = document.getElementById('kpi-motivos-total-categorias');
  const kpiPrincipal = document.getElementById('kpi-motivos-principal');

  const periodoText = (typeof modoFiltroAtual !== 'undefined' && modoFiltroAtual === 'mes') 
    ? (typeof capitalizar === 'function' ? capitalizar(mesSelecionado) : mesSelecionado) 
    : 'o Período Selecionado';

  if (subtitle) subtitle.textContent = `Top 10 e distribuição completa dos motivos em ${periodoText}`;

  // Nos meses de Junho e Julho, exibe exclusivamente "Sem dados"
  if (isMesSemDadosZendesk()) {
    if (kpiVolume) kpiVolume.textContent = '-';
    if (kpiCategorias) kpiCategorias.textContent = '-';
    if (kpiPrincipal) kpiPrincipal.textContent = 'Sem dados';
    if (tbody) tbody.innerHTML = '';
    if (emptyMsg) {
      emptyMsg.style.display = 'block';
      emptyMsg.innerHTML = '<div style="padding: 30px; font-size: 1rem; font-weight: 600; color: #9ca3af; text-align: center;">Sem dados</div>';
    }
    return;
  }

  const dados = (typeof getDadosAtuais === 'function') ? getDadosAtuais() : null;
  const lista = (dados && dados.motivos_ligacoes) ? dados.motivos_ligacoes : [];
  const totalGeral = lista.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);

  if (kpiVolume) kpiVolume.textContent = totalGeral.toLocaleString('pt-BR');
  if (kpiCategorias) kpiCategorias.textContent = lista.length.toLocaleString('pt-BR');

  if (kpiPrincipal) {
    if (lista.length > 0 && totalGeral > 0) {
      const top = lista[0];
      const pct = ((top.valor / totalGeral) * 100).toFixed(1).replace('.', ',');
      kpiPrincipal.textContent = `${top.nome} · ${pct}%`;
    } else {
      kpiPrincipal.textContent = '-';
    }
  }

  if (!tbody) return;
  tbody.innerHTML = '';

  const termoNorm = termoBusca ? termoBusca.toLowerCase().trim() : '';
  const itensExibir = termoNorm
    ? lista.filter(i => i.nome.toLowerCase().includes(termoNorm))
    : lista;

  if (itensExibir.length === 0) {
    if (emptyMsg) {
      emptyMsg.style.display = 'block';
      emptyMsg.innerHTML = '<div style="padding: 30px; font-size: 1rem; font-weight: 600; color: #9ca3af; text-align: center;">Sem dados</div>';
    }
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';

  const maxPercent = lista.length > 0 && totalGeral > 0 ? (lista[0].valor / totalGeral) * 100 : 100;

  itensExibir.forEach(item => {
    const tr = document.createElement('tr');
    const rankGlobal = lista.indexOf(item) + 1;
    const rankClass = rankGlobal <= 3 ? `tab-rank-top tab-rank-${rankGlobal}` : 'tab-rank-default';

    const percentual = totalGeral > 0 ? (item.valor / totalGeral) * 100 : 0;
    const pctFormatado = percentual.toFixed(1).replace('.', ',') + '%';
    const volFormatado = item.valor.toLocaleString('pt-BR');
    const larguraBarra = Math.min(100, Math.max(1, (percentual / Math.max(maxPercent, 0.01)) * 100)).toFixed(1);

    tr.innerHTML = `
      <td style="text-align: center;">
        <span class="tab-rank-badge ${rankClass}">${rankGlobal}</span>
      </td>
      <td class="tab-cell-name">
        <span class="tab-name-text">${escapeHtml(item.nome)}</span>
      </td>
      <td style="text-align: right;" class="tab-cell-val">
        ${volFormatado}
      </td>
      <td style="text-align: right;" class="tab-cell-pct">
        <span class="tab-pct-badge">${pctFormatado}</span>
      </td>
      <td>
        <div class="tab-progress-track">
          <div class="tab-progress-fill" style="width: ${larguraBarra}%;"></div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Manipula a busca em tempo real na tabela de motivos
 */
function filtrarTabelaMotivos() {
  const input = document.getElementById('busca-motivos-ligacoes');
  const termo = input ? input.value : '';
  renderTabelaMotivosLigacoes(termo);
}

window.renderChartMotivosLigacoes = renderChartMotivosLigacoes;
window.renderTabelaMotivosLigacoes = renderTabelaMotivosLigacoes;
window.filtrarTabelaMotivos = filtrarTabelaMotivos;
