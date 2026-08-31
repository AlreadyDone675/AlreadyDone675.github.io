// ─── Funil: Caminho do Cliente ─────────────────────────────────────────────
// Responsavel por renderizar o funil visual da jornada do cliente com
// tooltips customizados e bifurcacao final entre IA resolvida e Humano.

// Tooltip flutuante unico (reutilizado por todos os niveis)
let _funilTooltipEl = null;

function getFunilTooltip() {
  if (!_funilTooltipEl) {
    _funilTooltipEl = document.createElement('div');
    _funilTooltipEl.className = 'funil-tooltip';
    document.body.appendChild(_funilTooltipEl);
  }
  return _funilTooltipEl;
}

function showFunilTooltip(e, htmlContent) {
  const tip = getFunilTooltip();
  tip.innerHTML = htmlContent;
  tip.classList.add('visible');
  moveFunilTooltip(e);
}

function moveFunilTooltip(e) {
  const tip = getFunilTooltip();
  const margin = 14;
  const tipW = tip.offsetWidth;
  const tipH = tip.offsetHeight;
  let x = e.clientX + margin;
  let y = e.clientY - tipH / 2;
  if (x + tipW > window.innerWidth - 8) x = e.clientX - tipW - margin;
  if (y < 4) y = 4;
  if (y + tipH > window.innerHeight - 4) y = window.innerHeight - tipH - 4;
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}

function hideFunilTooltip() {
  const tip = getFunilTooltip();
  tip.classList.remove('visible');
}

function fmtN(n) {
  return Number(n || 0).toLocaleString('pt-BR');
}

function buildTooltipHtml(title, rows, footer) {
  let html = '<div class="funil-tooltip__title">' + title + '</div>';
  rows.forEach(function(row) {
    html += '<div class="funil-tooltip__row"><div class="funil-tooltip__dot" style="background:' + row.dot + '"></div><span>' + row.text + '</span></div>';
  });
  if (footer) {
    html += '<div class="funil-tooltip__footer">' + footer + '</div>';
  }
  return html;
}

function criarStep(label, valor, cor, widthPct, tooltipHtml) {
  const step = document.createElement('div');
  step.className = 'funil-step';
  step.style.setProperty('--step-color', cor);
  step.style.width = widthPct + '%';
  step.innerHTML =
    '<span class="funil-step__label">' + label + '</span>' +
    '<div class="funil-step__block">' +
      '<span class="funil-step__value">' + fmtN(valor) + '</span>' +
    '</div>';
  step.addEventListener('mouseenter', function(e) { showFunilTooltip(e, tooltipHtml); });
  step.addEventListener('mousemove', moveFunilTooltip);
  step.addEventListener('mouseleave', hideFunilTooltip);
  return step;
}

function criarArrow() {
  const el = document.createElement('div');
  el.className = 'funil-arrow';
  return el;
}

function renderFunil() {
  const container = document.getElementById('funil-container');
  if (!container) return;
  container.innerHTML = '';

  const mes = typeof mesSelecionado !== 'undefined' ? mesSelecionado : null;
  const d = getDadosAgregados('mes', mes);
  if (!d) return;

  const uraTotal     = d.ura_total             || 0;
  const uraAtendidas = d.ura_atendidas          || 0;
  const uraAutoServ  = d.ura_auto_servico       || 0;
  const iaTotal      = d.ia_atendimento_total   || 0;
  const iaTransf     = d.ia_transferencia       || 0;
  const iaSoluc      = d.ia_solucionadas        || 0;
  const vonixAtend   = d.vonix_atendidas        || 0;
  const vonixReceb   = d.vonix_recebidas        || 0;
  const vonixAband   = d.vonix_abandonadas      || 0;
  const iaResolvidos = iaSoluc;
  const diretoVonix  = Math.max(0, vonixAtend - iaTransf);

  const COR_URA_TOTAL = '#3b82f6';
  const COR_URA_ATEND = '#06b6d4';
  const COR_IA_ATEND  = '#8b5cf6';
  const COR_IA_TRANSF = '#f59e0b';
  const COR_IA_RESOL  = '#10b981';
  const COR_HUMANO    = '#f43f5e';

  const tipUraTotal = buildTooltipHtml('URA no Mês', [{dot: COR_URA_TOTAL, text: 'Clientes que ligaram no 0800'}]);
  const tipUraAtend = buildTooltipHtml('Atendimentos URA', [{dot: COR_URA_ATEND, text: 'Clientes atendidos: ' + fmtN(uraAtendidas)},{dot: '#9ca3af', text: 'URA Auto Servico: ' + fmtN(uraAutoServ)}]);
  const tipIaAtend  = buildTooltipHtml('Atendimentos IA', [{dot: COR_IA_ATEND, text: 'Clientes que escolheram a opção 4 ou 5'}]);

  const pctIA     = uraAtendidas > 0 ? ((iaResolvidos / uraAtendidas) * 100).toFixed(1) : 0;
  const pctHumano = uraAtendidas > 0 ? ((vonixAtend / uraAtendidas) * 100).toFixed(1) : 0;

  const tipFinalIA     = buildTooltipHtml('Resolvidos pela IA', [{dot: '#d1d5db', text: 'Atendidos na URA: ' + fmtN(uraAtendidas)},{dot: COR_IA_RESOL, text: 'Resolvidos pela IA: ' + fmtN(iaResolvidos)}], pctIA + '% do total de clientes resolvido pela IA');
  const tipFinalHumano = buildTooltipHtml('Humano', [{dot: COR_IA_TRANSF, text: 'Foram recebidos pela IA: ' + fmtN(iaTransf)},{dot: COR_HUMANO, text: 'Passaram direto para vonix: ' + fmtN(diretoVonix)}, {dot: '#9ca3af', text: 'Abandonadas na Vonix: ' + fmtN(vonixAband)}], pctHumano + '% do total de clientes atendidos por humano');

  const calcW = (v, max) => max > 0 ? Math.max(40, (v / max) * 100) : 100;

  var steps = [
    {label: 'URA no Mes',        valor: uraTotal,     cor: COR_URA_TOTAL, w: calcW(uraTotal, uraTotal), tip: tipUraTotal},
    {label: 'Atendimentos URA',  valor: uraAtendidas, cor: COR_URA_ATEND, w: calcW(uraAtendidas, uraTotal),  tip: tipUraAtend},
    {label: 'Atendimentos IA',   valor: iaTotal,       cor: COR_IA_ATEND,  w: calcW(iaTotal, uraTotal),  tip: tipIaAtend}
  ];

  steps.forEach(function(s) {
    container.appendChild(criarStep(s.label, s.valor, s.cor, s.w, s.tip));
    container.appendChild(criarArrow());
  });

  var splitEl = document.createElement('div');
  splitEl.className = 'funil-split';

  const totFlex = iaResolvidos + iaTransf;
  const flexRatioIa = totFlex > 0 ? Math.max(0.35, Math.min(0.65, iaResolvidos / totFlex)) : 0.5;
  const flexRatioHum = totFlex > 0 ? 1 - flexRatioIa : 0.5;

  var iaItem = document.createElement('div');
  iaItem.className = 'funil-split-item';
  iaItem.style.flex = flexRatioIa;
  var iaArrow = document.createElement('div');
  iaArrow.className = 'funil-split-arrow';
  var iaStep = criarStep('Resolvidos IA', iaResolvidos, COR_IA_RESOL, 100, tipFinalIA);
  iaItem.appendChild(iaArrow);
  iaItem.appendChild(iaStep);

  var humItem = document.createElement('div');
  humItem.className = 'funil-split-item';
  humItem.style.flex = flexRatioHum;
  var humArrow = document.createElement('div');
  humArrow.className = 'funil-split-arrow';
  var humStep = criarStep('Humano', iaTransf, COR_HUMANO, 100, tipFinalHumano);
  humItem.appendChild(humArrow);
  humItem.appendChild(humStep);

  splitEl.appendChild(iaItem);
  splitEl.appendChild(humItem);
  container.appendChild(splitEl);
}
