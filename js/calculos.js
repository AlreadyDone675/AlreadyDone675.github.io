// ─── Formatadores (Aplicados para exibir dados de todos os agentes) ───

// Formata números simples com separador de milhar (ex: 1.500)
const fmtNum = (v) => {
  if (v === null || v === undefined) return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toLocaleString('pt-BR');
};

// Formata valores monetários em Reais (ex: R$ 1.500,00)
const fmtBRL = (v) => {
  if (v === null || v === undefined) return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Calcula a porcentagem de uma parte em relação ao todo (ex: 25.5%)
const fmtPct = (part, total) => {
  if (!total || total === 0) return '0%';
  return ((part / total) * 100).toFixed(1) + '%';
};

// Ajusta o horário do TME para mostrar de forma legível: "00min 00s"
const fmtTime = (v) => {
  if (v === null || v === undefined) return '—';
  const s = String(v).trim();
  const parts = s.split(':');
  if (parts.length >= 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return s;
};

// Converte texto de tempo ("01:30") para segundos totais (90).
// Usado na hora de somar o Tempo Médio de Espera (TME) de múltiplos agentes.
const timeToSeconds = (v) => {
  if (v === null || v === undefined) return 0;
  const parts = String(v).trim().split(':');
  if (parts.length >= 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  return 0;
};

// ─── Lógica de Variação (Calcula o crescimento/queda em relação ao mês passado) ───

// Calcula a variação percentual matemática entre dois valores.
const calcVariacao = (atual, anterior) => {
  if (anterior === null || anterior === undefined || anterior === 0) return null;
  if (atual === null || atual === undefined) return null;
  const diff = ((atual - anterior) / Math.abs(anterior)) * 100;
  return diff.toFixed(1);
};

// Gera o selo colorido em HTML baseado na variação (Verde para bom, Vermelho para ruim).
// isCost inverte a lógica: se for custo, gastar menos (número negativo) é verde!
const badgeVariacao = (pct, isCost = false) => {
  if (pct === null || pct === undefined || isNaN(pct)) return '';
  const num = parseFloat(pct);

  if (num === 0) {
    return `<span class="card__badge card__badge--neutral has-custom-tooltip" data-tooltip="Comparativo com mês passado">0.0%</span>`;
  }

  let isGood = num > 0;
  if (isCost) {
    isGood = num < 0; // Gastar menos é BOM (Verde)
  }

  const cls = isGood ? 'card__badge--up' : 'card__badge--down';
  const arrow = num > 0 ? '↑' : '↓';
  const sign = num > 0 ? '+' : '';

  return `<span class="card__badge ${cls} has-custom-tooltip" data-tooltip="Comparativo com mês passado">${arrow} ${sign}${num}%</span>`;
};

// ─── Máquina de Agregação e Somatório (Coração dos Cálculos) ────────────────
// Esta função recorta os dados pela data e soma os valores dependendo do Agente selecionado.
function getDadosAgregados(modo, mes, start, end, overrideAgente = null, limitDays = null) {
  if (typeof DADOS === 'undefined' || !DADOS || !DADOS.dias) return null;
  
  let dias = Object.entries(DADOS.dias);
  
  // Ordena cronologicamente por chave de data (YYYY-MM-DD)
  dias.sort((a, b) => a[0].localeCompare(b[0]));
  
  // 1. Filtro de Datas (Recorta a planilha dependendo do Mês ou Período escolhido)
  if (modo === 'mes') {
    dias = dias.filter(([dStr, info]) => info.mes === mes);
    if (limitDays !== null && limitDays !== undefined && limitDays > 0) {
      dias = dias.slice(0, limitDays);
    }
  } else if (modo === 'periodo') {
    if (!start) return null;
    const tStart = start.getTime();
    const tEnd = end ? end.getTime() : tStart;
    dias = dias.filter(([dStr, info]) => {
      const parts = dStr.split('-');
      // YYYY-MM-DD
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      const t = dateObj.getTime();
      return t >= tStart && t <= tEnd;
    });
  }

  if (dias.length === 0) return null;

  // 2. Estrutura Base (Zera todos os cálculos antes de começar a somar)
  let ag = {
    ura_total: 0, ura_atendidas: 0, ura_auto_servico: 0,
    vonix_recebidas: 0, vonix_atendidas: 0, vonix_abandonadas: 0,
    ia_atendimento_total: 0, ia_transferencia: 0, ia_solucionadas: 0,
    ia_custo_total: 0,
    vonix_tme_sum: 0, vonix_tme_count: 0,
    ia_tma_sum: 0, ia_tma_count: 0,
    tabulacoes_clara: {}, tabulacoes_cris: {},
    tabulacoes_eleven_clara: {}, tabulacoes_eleven_cris: {},
    tabulacoes_zendesk_clara: {}, tabulacoes_zendesk_cris: {},
    motivos_ligacoes_map: {}
  };

  // 3. Loop Principal: Passa dia por dia, somando os números
  dias.forEach(([dStr, info]) => {
    const c = info.clara || {};
    const cr = info.cris || {};
    
    const filterAgent = overrideAgente || (typeof agenteFiltro !== 'undefined' ? agenteFiltro : 'todos');
    
    const agentsToProcess = [];
    if (filterAgent === 'todos') {
      agentsToProcess.push(c, cr);
    } else if (filterAgent === 'clara') {
      agentsToProcess.push(c);
    } else if (filterAgent === 'cris') {
      agentsToProcess.push(cr);
    }

    // 3.2 Realiza a soma de URA, Vonix e IA para os agentes permitidos
    agentsToProcess.forEach(agentObj => {
      ag.ura_total += (agentObj.ura_total || 0);
      ag.ura_atendidas += (agentObj.ura_atendidas || 0);
      ag.ura_auto_servico += (agentObj.ura_auto_servico || 0);
      
      ag.vonix_recebidas += (agentObj.vonix_recebidas || 0);
      ag.vonix_atendidas += (agentObj.vonix_atendidas || 0);
      ag.vonix_abandonadas += (agentObj.vonix_abandonadas || 0);
      
      if (agentObj.vonix_tme) {
        const sec = timeToSeconds(String(agentObj.vonix_tme));
        if (sec > 0) {
          ag.vonix_tme_sum += sec;
          ag.vonix_tme_count++;
        }
      }
      
      ag.ia_atendimento_total += (agentObj.ia_atendimento_total || 0);
      ag.ia_transferencia += (agentObj.ia_transferencia || 0);
      ag.ia_solucionadas += (agentObj.ia_solucionadas || 0);
      
      ag.ia_custo_total += (agentObj.ia_custo_total || 0);
      ag.ia_custo_total += (agentObj.custo_linha_23 || 0);

      if (agentObj.tma_ia) {
        const secIa = timeToSeconds(String(agentObj.tma_ia));
        if (secIa > 0) {
          ag.ia_tma_sum += secIa;
          ag.ia_tma_count++;
        }
      }
    });
    
    // 3.3 Separa as tabulações por origem (Total, Eleven, Zendesk) e por agente
    if (c.tabulacoes) {
      c.tabulacoes.forEach(t => { ag.tabulacoes_clara[t.nome] = (ag.tabulacoes_clara[t.nome] || 0) + t.valor; });
    }
    if (cr.tabulacoes) {
      cr.tabulacoes.forEach(t => { ag.tabulacoes_cris[t.nome] = (ag.tabulacoes_cris[t.nome] || 0) + t.valor; });
    }

    if (c.tabulacoes_eleven) {
      c.tabulacoes_eleven.forEach(t => { ag.tabulacoes_eleven_clara[t.nome] = (ag.tabulacoes_eleven_clara[t.nome] || 0) + t.valor; });
    }
    if (cr.tabulacoes_eleven) {
      cr.tabulacoes_eleven.forEach(t => { ag.tabulacoes_eleven_cris[t.nome] = (ag.tabulacoes_eleven_cris[t.nome] || 0) + t.valor; });
    }

    if (c.tabulacoes_zendesk) {
      c.tabulacoes_zendesk.forEach(t => { ag.tabulacoes_zendesk_clara[t.nome] = (ag.tabulacoes_zendesk_clara[t.nome] || 0) + t.valor; });
    }
    if (cr.tabulacoes_zendesk) {
      cr.tabulacoes_zendesk.forEach(t => { ag.tabulacoes_zendesk_cris[t.nome] = (ag.tabulacoes_zendesk_cris[t.nome] || 0) + t.valor; });
    }

    // 3.4 Agrega motivos de ligacao (ia_call_summary_title) para todos os agentes sempre
    const motList = info.motivos_ligacoes || [...(c.motivos_ligacoes || []), ...(cr.motivos_ligacoes || [])];
    if (motList && Array.isArray(motList)) {
      motList.forEach(m => {
        if (m && m.nome && m.valor) {
          ag.motivos_ligacoes_map[m.nome] = (ag.motivos_ligacoes_map[m.nome] || 0) + (parseFloat(m.valor) || 0);
        }
      });
    }
  });

  // 4. Fechamento de Cálculos Médios
  ag.vonix_tme = "00:00";
  if (ag.vonix_tme_count > 0) {
    const avgSec = Math.round(ag.vonix_tme_sum / ag.vonix_tme_count);
    const m = Math.floor(avgSec / 60);
    const s = avgSec % 60;
    ag.vonix_tme = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  
  ag.ia_tma = "00:00";
  if (ag.ia_tma_count > 0) {
    const avgSecIa = Math.round(ag.ia_tma_sum / ag.ia_tma_count);
    const mIa = Math.floor(avgSecIa / 60);
    const sIa = avgSecIa % 60;
    ag.ia_tma = `${String(mIa).padStart(2,'0')}:${String(sIa).padStart(2,'0')}`;
  }
  
  ag.ia_custo_por_ligacao = 0;
  if (ag.ia_atendimento_total > 0) {
    ag.ia_custo_por_ligacao = ag.ia_custo_total / ag.ia_atendimento_total;
  }

  // Sobrescreve ia_custo_total com o valor real mensal Crion quando disponivel.
  // Aplica apenas no modo "mes" pois o dado e sempre uma referencia mensal fechada.
  // Para meses sem dado (anteriores a agosto), mantem o acumulado diario.
  if (
    modo === 'mes' &&
    typeof DADOS !== 'undefined' &&
    DADOS.gasto_mensal_por_mes &&
    DADOS.gasto_mensal_por_mes[mes] !== undefined
  ) {
    ag.ia_custo_total = DADOS.gasto_mensal_por_mes[mes];
    if (ag.ia_atendimento_total > 0) {
      ag.ia_custo_por_ligacao = ag.ia_custo_total / ag.ia_atendimento_total;
    }
  }

  // Prepara as tabulações separadas por origem e por agente
  ag.tabulacoes = {
    total: {
      clara: Object.entries(ag.tabulacoes_clara).map(([nome, valor]) => ({nome, valor})),
      cris: Object.entries(ag.tabulacoes_cris).map(([nome, valor]) => ({nome, valor}))
    },
    eleven: {
      clara: Object.entries(ag.tabulacoes_eleven_clara).map(([nome, valor]) => ({nome, valor})),
      cris: Object.entries(ag.tabulacoes_eleven_cris).map(([nome, valor]) => ({nome, valor}))
    },
    zendesk: {
      clara: Object.entries(ag.tabulacoes_zendesk_clara).map(([nome, valor]) => ({nome, valor})),
      cris: Object.entries(ag.tabulacoes_zendesk_cris).map(([nome, valor]) => ({nome, valor}))
    },
    clara: Object.entries(ag.tabulacoes_clara).map(([nome, valor]) => ({nome, valor})),
    cris: Object.entries(ag.tabulacoes_cris).map(([nome, valor]) => ({nome, valor}))
  };

  // Prepara lista ordenada de motivos de ligacoes (ia_call_summary_title)
  ag.motivos_ligacoes = Object.entries(ag.motivos_ligacoes_map)
    .map(([nome, valor]) => ({ nome, valor: parseFloat(valor) || 0 }))
    .sort((a, b) => b.valor - a.valor);

  return ag;
}

function getDadosAtuais() {
  const start = (typeof calDateStart !== 'undefined') ? calDateStart : null;
  const end = (typeof calDateEnd !== 'undefined') ? calDateEnd : null;
  return getDadosAgregados(typeof modoFiltroAtual !== 'undefined' ? modoFiltroAtual : 'mes', typeof mesSelecionado !== 'undefined' ? mesSelecionado : null, start, end);
}

// Obtém os dados do mês anterior limitando a quantidade aos mesmos N dias iniciais do mês atual
function getDadosAnteriores() {
  if (typeof modoFiltroAtual !== 'undefined' && modoFiltroAtual !== 'mes') return null; // Sem comparativo para período customizado
  if (typeof DADOS === 'undefined' || !DADOS || !DADOS.meses_disponiveis) return null;
  
  const meses = DADOS.meses_disponiveis;
  const mesAtual = typeof mesSelecionado !== 'undefined' ? mesSelecionado : null;
  const idx = meses.indexOf(mesAtual);
  if (idx > 0) {
    const mesAnterior = meses[idx - 1];

    // Busca todos os dias do mês atual e garante ordenação cronológica
    let diasAtual = Object.entries(DADOS.dias).filter(([dStr, info]) => info.mes === mesAtual);
    diasAtual.sort((a, b) => a[0].localeCompare(b[0]));
    
    // Verifica até qual dia existem dados reais (>0) consolidados no mês atual (ignora dias futuros vazios)
    let qtdDiasAtual = 0;
    diasAtual.forEach(([_date, info], i) => {
      const c = info.clara || {};
      const cr = info.cris || {};
      const sum = (c.ura_total || 0) + (cr.ura_total || 0) + 
                  (c.vonix_recebidas || 0) + (cr.vonix_recebidas || 0) + 
                  (c.ia_atendimento_total || 0) + (cr.ia_atendimento_total || 0);
      if (sum > 0) {
        qtdDiasAtual = i + 1;
      }
    });

    if (qtdDiasAtual === 0) qtdDiasAtual = 1;

    // Retorna a agregação do mês anterior recortando exatamente os primeiros N dias ativos
    return getDadosAgregados('mes', mesAnterior, null, null, null, qtdDiasAtual);
  }
  return null;
}

const capitalizar = (s) => {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
};
