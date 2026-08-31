// ─── Calendário Interativo ──────────────────────────────────────
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-indexed
let calDateStart = null;   // Date object
let calDateEnd = null;     // Date object
let calClickCount = 0;     // 0 = nenhum, 1 = aguardando segundo clique

function calNavMes(dir) {
  calMonth += dir;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function renderCalendar() {
  const label = document.getElementById('cal-month-label');
  const grid  = document.getElementById('cal-days');
  if (!label || !grid) return;

  label.textContent = `${MESES_PT[calMonth]} ${calYear}`;
  grid.innerHTML = '';

  const firstDay = new Date(calYear, calMonth, 1).getDay(); // dia da semana (0=Dom)
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  // Células vazias antes do dia 1
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day cal-day--empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(calYear, calMonth, d);
    date.setHours(0,0,0,0);

    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.textContent = d;

    // Hoje
    if (date.getTime() === today.getTime()) cell.classList.add('cal-day--today');

    // Estado de seleção
    const isStart = calDateStart && date.getTime() === calDateStart.getTime();
    const isEnd   = calDateEnd   && date.getTime() === calDateEnd.getTime();
    const inRange = calDateStart && calDateEnd &&
                    date > calDateStart && date < calDateEnd;

    if (isStart || isEnd) {
      cell.classList.add('cal-day--selected');
      if (isStart && calDateEnd) cell.classList.add('cal-day--range-start');
      if (isEnd && calDateStart) cell.classList.add('cal-day--range-end');
    } else if (inRange) {
      cell.classList.add('cal-day--range');
    }

    cell.addEventListener('click', (e) => {
      e.stopPropagation(); // Evita que o evento suba para o document (que fecharia o popover, pois o elemento é removido do DOM no renderCalendar)
      handleCalClick(new Date(calYear, calMonth, d));
    });
    grid.appendChild(cell);
  }
}

function handleCalClick(date) {
  date.setHours(0,0,0,0);

  if (calClickCount === 0) {
    // Primeiro clique: define início
    calDateStart = date;
    calDateEnd = null;
    calClickCount = 1;
  } else {
    // Segundo clique
    if (date.getTime() === calDateStart.getTime()) {
      // Mesmo dia: seleciona aquele dia como período
      calDateEnd = date;
    } else if (date < calDateStart) {
      // Clicou antes: inverte
      calDateEnd = calDateStart;
      calDateStart = date;
    } else {
      calDateEnd = date;
    }
    calClickCount = 0;
    // Atualiza badge e fecha popover
    atualizarPeriodoBadge();
    fecharPopover();
    
    // Atualiza todo o dashboard
    if (typeof atualizarTudo === 'function') {
      atualizarTudo();
    }
  }

  renderCalendar();
}

function atualizarPeriodoBadge() {
  if (!calDateStart) return;
  const fmt = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  const end = calDateEnd || calDateStart;
  const text = calDateStart.getTime() === end.getTime()
    ? fmt(calDateStart)
    : `${fmt(calDateStart)} — ${fmt(end)}`;
  const el = document.getElementById('period-text-display');
  if (el) el.textContent = text;
}
