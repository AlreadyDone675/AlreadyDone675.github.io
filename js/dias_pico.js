/**
 * Modulo: dias_pico.js
 * Responsabilidade: Calcular e renderizar os Dias de Pico e Destaques Operacionais
 * especificos para a metrica selecionada no drawer de detalhes.
 */

(function () {
  // Injeta os estilos CSS especificos do componente de Dias de Pico na página
  const styleId = 'dias-pico-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .drawer-peak-days-section {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      .drawer-peak-days-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
      }

      .drawer-peak-days-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }

      .peak-card {
        background: rgba(25, 28, 36, 0.75);
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 10px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: transform 0.2s ease, border-color 0.2s ease;
      }

      .peak-card:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.16);
      }

      .peak-card--purple { border-left: 3.5px solid #a855f7; }
      .peak-card--cyan { border-left: 3.5px solid #06b6d4; }
      .peak-card--amber { border-left: 3.5px solid #f59e0b; }
      .peak-card--rose { border-left: 3.5px solid #f43f5e; }
      .peak-card--emerald { border-left: 3.5px solid #10b981; }
      .peak-card--indigo { border-left: 3.5px solid #6366f1; }

      .peak-card__label {
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #9ca3af;
        margin-bottom: 6px;
      }

      .peak-card__value {
        font-size: 1.15rem;
        font-weight: 700;
        color: #f8fafc;
        margin-bottom: 4px;
        line-height: 1.2;
      }

      .peak-card__date {
        font-size: 0.78rem;
        font-weight: 500;
        color: #cbd5e1;
      }

      .peak-card__question {
        font-size: 0.70rem;
        color: #6b7280;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed rgba(255, 255, 255, 0.06);
      }
    `;
    document.head.appendChild(style);
  }
})();

/**
 * Mapeamento de nomes amigaveis e tipos das metricas do sistema.
 */
const CONFIG_METRICAS_PICO = {
  'ia_custo_total': { label: 'Gasto Total IA', isCurrency: true, isTime: false, isAdditive: true },
  'ia_custo_por_ligacao': { label: 'Custo por Atendimento', isCurrency: true, isTime: false, isAdditive: false },
  'ia_atendimento_total': { label: 'Atendimento IA', isCurrency: false, isTime: false, isAdditive: true },
  'ia_transferencia': { label: 'Transferências IA', isCurrency: false, isTime: false, isAdditive: true },
  'ia_solucionadas': { label: 'Solucionadas IA', isCurrency: false, isTime: false, isAdditive: true },
  'tma_ia': { label: 'TMA IA', isCurrency: false, isTime: true, isAdditive: false },
  'ia_tma': { label: 'TMA IA', isCurrency: false, isTime: true, isAdditive: false },
  'ura_total': { label: 'URA no Mês', isCurrency: false, isTime: false, isAdditive: true },
  'ura_atendidas': { label: 'Atendimentos URA', isCurrency: false, isTime: false, isAdditive: true },
  'ura_auto_servico': { label: 'URA Auto Serviço', isCurrency: false, isTime: false, isAdditive: true },
  'vonix_atendidas': { label: 'Vonix Atendidas', isCurrency: false, isTime: false, isAdditive: true },
  'vonix_recebidas': { label: 'Vonix Recebidas', isCurrency: false, isTime: false, isAdditive: true },
  'vonix_abandonadas': { label: 'Vonix Abandonadas', isCurrency: false, isTime: false, isAdditive: true },
  'vonix_tme': { label: 'TME Médio', isCurrency: false, isTime: true, isAdditive: false }
};

/**
 * Converte tempo HH:MM:SS ou MM:SS em segundos.
 */
function tmeStringToSeconds(str) {
  if (!str || typeof str !== 'string' || str === '00:00' || str === '—') return 0;
  const clean = str.split('.')[0];
  const parts = clean.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Formata data no padrao DD/MM.
 */
function formatarDataCurta(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

/**
 * Formata o valor numerico de acordo com a metrica (Moeda, Tempo ou Numero Inteiro).
 */
function formatarValorMetrica(val, cfg) {
  if (cfg.isCurrency) {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  if (cfg.isTime) {
    const totalSec = Math.round(val || 0);
    if (totalSec <= 0) return '00:00';
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  return Number(val || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/**
 * Extrai o valor numerico do dia para a metrica e agente especificados.
 */
function extrairValorDia(infoDia, metricKey, agente) {
  const c = infoDia.clara || {};
  const cr = infoDia.cris || {};
  const jsonCampo = (metricKey === 'ia_tma' || metricKey === 'tma') ? 'tma_ia' : metricKey;

  // Custo por atendimento
  if (metricKey === 'ia_custo_por_ligacao') {
    let custo = 0;
    let atend = 0;
    if (agente === 'todos') {
      custo = (parseFloat(c.ia_custo_total) || 0) + (parseFloat(cr.ia_custo_total) || 0);
      atend = (parseFloat(c.ia_atendimento_total) || 0) + (parseFloat(cr.ia_atendimento_total) || 0);
    } else if (agente === 'clara') {
      custo = parseFloat(c.ia_custo_total) || 0;
      atend = parseFloat(c.ia_atendimento_total) || 0;
    } else {
      custo = parseFloat(cr.ia_custo_total) || 0;
      atend = parseFloat(cr.ia_atendimento_total) || 0;
    }
    return atend > 0 ? (custo / atend) : 0;
  }

  // Métricas de Tempo (TMA / TME)
  if (jsonCampo === 'tma_ia' || jsonCampo === 'vonix_tme') {
    const secC = tmeStringToSeconds(c[jsonCampo]);
    const secCr = tmeStringToSeconds(cr[jsonCampo]);

    if (agente === 'todos') {
      if (secC > 0 && secCr > 0) return Math.round((secC + secCr) / 2);
      return secC > 0 ? secC : secCr;
    } else if (agente === 'clara') {
      return secC;
    } else {
      return secCr;
    }
  }

  // Métricas Numéricas ou Monetárias diretas
  const valC = parseFloat(c[jsonCampo]) || 0;
  const valCr = parseFloat(cr[jsonCampo]) || 0;

  if (agente === 'todos') return valC + valCr;
  if (agente === 'clara') return valC;
  return valCr;
}

/**
 * Função Principal de Renderização dos Dias de Pico para a métrica específica.
 */
function renderDiasPico(metricKey, monthName, agentFilter, containerId = 'drawer-peak-days-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (typeof DADOS === 'undefined' || !DADOS || !DADOS.dias) {
    container.style.display = 'none';
    return;
  }

  const mesAlvo = (monthName || 'agosto').toLowerCase();
  const agente = agentFilter || 'todos';

  const cfg = CONFIG_METRICAS_PICO[metricKey] || {
    label: 'Métrica',
    isCurrency: metricKey.includes('custo'),
    isTime: metricKey.includes('tma') || metricKey.includes('tme'),
    isAdditive: !metricKey.includes('tma') && !metricKey.includes('tme')
  };

  // Filtra os dias pertencentes ao mês desejado
  const entradasDias = Object.entries(DADOS.dias).filter(([_dStr, info]) => {
    return (info.mes || '').toLowerCase() === mesAlvo;
  });

  if (entradasDias.length === 0) {
    container.style.display = 'none';
    return;
  }

  // Extrai a lista de valores diários para a métrica informada
  const listaDiaria = entradasDias.map(([dStr, info]) => {
    const val = extrairValorDia(info, metricKey, agente);
    return { dataStr: dStr, val };
  });

  // Considera apenas dias que possuem dados ou atividade no mês
  const diasAtivos = listaDiaria.filter(item => item.val > 0);

  if (diasAtivos.length === 0) {
    container.style.display = 'none';
    return;
  }

  // 1. Pico Máximo
  let itemMax = diasAtivos[0];
  diasAtivos.forEach(item => {
    if (item.val > itemMax.val) itemMax = item;
  });

  // 2. Pico Mínimo (em dias ativos)
  let itemMin = diasAtivos[0];
  diasAtivos.forEach(item => {
    if (item.val < itemMin.val) itemMin = item;
  });

  // 3. Média Diária (em dias ativos)
  const somaTotal = diasAtivos.reduce((acc, item) => acc + item.val, 0);
  const mediaDiaria = somaTotal / diasAtivos.length;

  const cardsData = [
    {
      label: `Maior ${cfg.label}`,
      value: formatarValorMetrica(itemMax.val, cfg),
      date: formatarDataCurta(itemMax.dataStr),
      question: 'Dia de maior pico no mês',
      colorClass: 'peak-card--purple'
    },
    {
      label: `Menor ${cfg.label}`,
      value: formatarValorMetrica(itemMin.val, cfg),
      date: formatarDataCurta(itemMin.dataStr),
      question: 'Dia de menor registro no mês',
      colorClass: 'peak-card--amber'
    },
    {
      label: 'Média Diária',
      value: formatarValorMetrica(mediaDiaria, cfg),
      date: `${diasAtivos.length} dias ativos`,
      question: 'Média por dia de operação',
      colorClass: 'peak-card--emerald'
    }
  ];

  // Adiciona card de Total Acumulado se a métrica for aditiva (volume/gasto)
  if (cfg.isAdditive) {
    cardsData.push({
      label: 'Total Acumulado',
      value: formatarValorMetrica(somaTotal, cfg),
      date: 'Mês selecionado',
      question: 'Soma total acumulada',
      colorClass: 'peak-card--cyan'
    });
  }

  container.style.display = 'block';
  container.innerHTML = `
    <div class="drawer-peak-days-header">
      <span class="drawer-section-title">Dias de Pico — ${cfg.label}</span>
    </div>
    <div class="drawer-peak-days-grid">
      ${cardsData.map(c => `
        <div class="peak-card ${c.colorClass}">
          <span class="peak-card__label">${c.label}</span>
          <span class="peak-card__value">${c.value}</span>
          <span class="peak-card__date">${c.date.startsWith('Dia') || c.date.includes('dias') || c.date.includes('Mês') ? c.date : 'Dia ' + c.date}</span>
          <span class="peak-card__question">${c.question}</span>
        </div>
      `).join('')}
    </div>
  `;
}
