/**
 * CRION AI ASSISTANT FRONTEND WIDGET
 * Conecta a interface gráfica do Dashboard ao servidor de IA (http://localhost:5000/api/chat)
 */

(function () {
  const AI_API_URL = 'http://localhost:5000/api/chat';

  // Injeta o HTML do Widget no DOM
  function injectWidgetHTML() {
    const container = document.createElement('div');
    container.id = 'ai-widget-container';
    container.innerHTML = `
      <!-- Botão Flutuante (FAB) -->
      <button class="ai-fab" id="ai-fab-btn">
        <svg class="ai-icon-spark" viewBox="0 0 24 24">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"></path>
        </svg>
        <span>Assistente IA</span>
      </button>

      <!-- Gaveta (Drawer) do Chatbot -->
      <div class="ai-drawer" id="ai-drawer">
        <div class="ai-header">
          <div class="ai-header-title">
            <svg class="ai-icon-spark" viewBox="0 0 24 24" style="width:18px;height:18px;fill:#2563EB;">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"></path>
            </svg>
            <span>Assistente IA CRION</span>
          </div>
          <button class="ai-close-btn" id="ai-close-btn">&times;</button>
        </div>

        <div class="ai-messages" id="ai-messages">
          <div class="msg-bubble ai">
            Olá! Sou o Assistente IA do CRION. Como posso ajudar com a análise de custos, atendimentos ou métricas hoje?
          </div>
        </div>

        <div class="ai-input-area">
          <input type="text" class="ai-input" id="ai-input" placeholder="Pergunte sobre custos, atendimentos..." />
          <button class="ai-send-btn" id="ai-send-btn">Enviar</button>
        </div>
      </div>
    `;
    document.body.appendChild(container);
  }

  // Inicializa eventos do chat
  function initWidgetEvents() {
    const fabBtn = document.getElementById('ai-fab-btn');
    const closeBtn = document.getElementById('ai-close-btn');
    const drawer = document.getElementById('ai-drawer');
    const inputEl = document.getElementById('ai-input');
    const sendBtn = document.getElementById('ai-send-btn');
    const messagesEl = document.getElementById('ai-messages');

    // Alternar exibição do drawer
    function toggleDrawer(open) {
      if (open === undefined) {
        drawer.classList.toggle('open');
      } else if (open) {
        drawer.classList.add('open');
      } else {
        drawer.classList.remove('open');
      }
      if (drawer.classList.contains('open')) {
        inputEl.focus();
      }
    }

    fabBtn.addEventListener('click', () => toggleDrawer());
    closeBtn.addEventListener('click', () => toggleDrawer(false));

    // Adiciona bolha de mensagem no chat
    function addMessage(text, isUser = false, kpis = []) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `msg-bubble ${isUser ? 'user' : 'ai'}`;
      msgDiv.textContent = text;

      // Adiciona cards de KPI se houver
      if (kpis && kpis.length > 0) {
        kpis.forEach(kpi => {
          const kpiCard = document.createElement('div');
          kpiCard.className = 'ai-kpi-card';
          kpiCard.style.borderLeftColor = kpi.cor || '#2563EB';
          kpiCard.innerHTML = `
            <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;">${kpi.titulo || ''}</div>
            <div style="font-size:16px;font-weight:800;color:#0F172A;margin:2px 0;">${kpi.valor || ''}</div>
            <div style="font-size:11px;color:#64748B;">${kpi.subtitulo || ''}</div>
          `;
          msgDiv.appendChild(kpiCard);
        });
      }

      messagesEl.appendChild(msgDiv);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // Envia mensagem para o servidor Python do Assistente
    async function sendMessage() {
      const userText = inputEl.value.trim();
      if (!userText) return;

      addMessage(userText, true);
      inputEl.value = '';
      sendBtn.disabled = true;

      // Indicador visual de carregando
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'msg-bubble ai';
      loadingDiv.id = 'ai-loading-msg';
      loadingDiv.textContent = 'Analisando dados com IA...';
      messagesEl.appendChild(loadingDiv);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      try {
        const response = await fetch(AI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userText })
        });

        const loadingEl = document.getElementById('ai-loading-msg');
        if (loadingEl) loadingEl.remove();

        if (response.ok) {
          const data = await response.json();
          const replyText = data.resposta_texto || 'Resposta recebida.';
          const kpis = data.kpis || [];
          addMessage(replyText, false, kpis);
        } else {
          addMessage('[Manutencao] O assistente inteligente esta temporariamente em manutencao. Por favor, tente novamente em alguns instantes.', false);
        }
      } catch (err) {
        console.warn('Assistente IA offline ou servidor nao iniciado:', err);
        const loadingEl = document.getElementById('ai-loading-msg');
        if (loadingEl) loadingEl.remove();
        addMessage('[Manutencao] Assistente em manutencao.', false);
      } finally {
        sendBtn.disabled = false;
      }
    }

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // Executa na inicialização do DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectWidgetHTML();
      initWidgetEvents();
    });
  } else {
    injectWidgetHTML();
    initWidgetEvents();
  }
})();
