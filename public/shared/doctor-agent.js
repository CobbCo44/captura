/* Doctor Agent Chat UI
   Injects a chat panel into any /doctor/* page */

(function () {
  // Don't load on login screen
  if (!document.getElementById('dashboard-section')) return;

  // ── Inject styles ──
  const style = document.createElement('style');
  style.textContent = `
    .mira-fab {
      position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 900;
      width: 56px; height: 56px; border-radius: 50%;
      background: var(--primary); color: white; border: none;
      cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.25rem; font-weight: 700;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .mira-fab:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
    .mira-fab.has-panel { display: none; }

    .mira-panel {
      position: fixed; z-index: 1000;
      background: var(--surface); border-left: 1px solid var(--border);
      display: flex; flex-direction: column;
      transition: transform 0.3s ease;
    }
    .mira-panel.closed { transform: translateX(100%); pointer-events: none; }

    /* Desktop: right sidebar */
    @media (min-width: 769px) {
      .mira-panel {
        top: 0; right: 0; bottom: 0; width: 400px;
        box-shadow: -4px 0 24px rgba(0,0,0,0.08);
      }
      body.mira-open .dashboard-body { margin-right: 400px; transition: margin-right 0.3s; }
    }

    /* Mobile: full screen overlay */
    @media (max-width: 768px) {
      .mira-panel {
        top: 0; right: 0; bottom: 0; left: 0;
      }
      .mira-fab { bottom: 1rem; right: 1rem; width: 48px; height: 48px; }
    }

    .mira-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.875rem 1rem; border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .mira-header-left {
      display: flex; align-items: center; gap: 0.5rem;
    }
    .mira-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--primary); color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.75rem;
    }
    .mira-header h3 { font-size: 0.9375rem; margin: 0; }
    .mira-header .mira-sub { font-size: 0.6875rem; color: var(--text-light); }
    .mira-header-actions { display: flex; gap: 0.5rem; }
    .mira-header-actions button {
      background: none; border: none; cursor: pointer;
      color: var(--text-secondary); font-size: 0.8125rem; padding: 0.25rem;
    }
    .mira-header-actions button:hover { color: var(--text); }

    .mira-messages {
      flex: 1; overflow-y: auto; padding: 1rem;
      display: flex; flex-direction: column; gap: 0.75rem;
      -webkit-overflow-scrolling: touch;
    }

    .mira-msg {
      max-width: 90%; padding: 0.625rem 0.875rem;
      border-radius: 1rem; font-size: 0.875rem; line-height: 1.5;
      animation: miraFade 0.2s ease;
    }
    @keyframes miraFade {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .mira-msg.agent {
      align-self: flex-start; background: var(--bg);
      border: 1px solid var(--border); border-bottom-left-radius: 4px;
    }
    .mira-msg.user {
      align-self: flex-end; background: var(--primary);
      color: white; border-bottom-right-radius: 4px;
    }
    .mira-msg.tool-status {
      align-self: flex-start; font-size: 0.75rem;
      color: var(--text-light); padding: 0.25rem 0;
      max-width: 100%;
    }
    .mira-msg.agent p { margin: 0 0 0.5rem; }
    .mira-msg.agent p:last-child { margin-bottom: 0; }
    .mira-msg.agent strong { color: var(--primary-dark); }
    .mira-msg.agent ul, .mira-msg.agent ol {
      margin: 0.25rem 0; padding-left: 1.25rem;
    }
    .mira-msg.agent li { margin-bottom: 0.25rem; }

    .mira-typing {
      align-self: flex-start; padding: 0.625rem 1rem;
      background: var(--bg); border: 1px solid var(--border);
      border-radius: 1rem; border-bottom-left-radius: 4px;
    }
    .mira-dots { display: flex; gap: 4px; }
    .mira-dots span {
      width: 5px; height: 5px; border-radius: 50%;
      background: var(--text-light); animation: miraBounce 1.4s infinite;
    }
    .mira-dots span:nth-child(2) { animation-delay: 0.2s; }
    .mira-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes miraBounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-3px); opacity: 1; }
    }

    .mira-input-bar {
      padding: 0.75rem; border-top: 1px solid var(--border);
      display: flex; gap: 0.5rem; align-items: flex-end; flex-shrink: 0;
    }
    .mira-input-bar textarea {
      flex: 1; border: 1px solid var(--border); border-radius: 1.25rem;
      padding: 0.5rem 0.875rem; font-size: 0.875rem; font-family: inherit;
      resize: none; max-height: 100px; line-height: 1.4; outline: none;
    }
    .mira-input-bar textarea:focus { border-color: var(--primary-light); }
    .mira-send {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--primary); color: white; border: none;
      cursor: pointer; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0;
    }
    .mira-send:disabled { opacity: 0.4; cursor: not-allowed; }
    .mira-send svg { width: 16px; height: 16px; }

    .mira-welcome {
      text-align: center; padding: 2rem 1rem; color: var(--text-secondary);
    }
    .mira-welcome h4 { color: var(--text); margin-bottom: 0.375rem; }
    .mira-welcome p { font-size: 0.8125rem; max-width: 280px; margin: 0 auto; line-height: 1.5; }
    .mira-suggestions {
      display: flex; flex-direction: column; gap: 0.375rem;
      margin-top: 1rem;
    }
    .mira-suggestion {
      background: var(--accent); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 0.5rem 0.75rem;
      font-size: 0.8125rem; cursor: pointer; text-align: left;
      color: var(--text); transition: background 0.15s;
    }
    .mira-suggestion:hover { background: var(--primary-light); color: white; }

    @supports (padding-bottom: env(safe-area-inset-bottom)) {
      .mira-input-bar { padding-bottom: calc(0.75rem + env(safe-area-inset-bottom)); }
    }
  `;
  document.head.appendChild(style);

  // ── Inject HTML ──
  const fab = document.createElement('button');
  fab.className = 'mira-fab';
  fab.innerHTML = 'M';
  fab.title = 'Open Mira';
  fab.onclick = () => togglePanel(true);
  document.body.appendChild(fab);

  const panel = document.createElement('div');
  panel.className = 'mira-panel closed';
  panel.innerHTML = `
    <div class="mira-header">
      <div class="mira-header-left">
        <div class="mira-avatar">M</div>
        <div>
          <h3>Mira</h3>
          <span class="mira-sub">AI Chief of Staff</span>
        </div>
      </div>
      <div class="mira-header-actions">
        <button onclick="miraNewConvo()" title="New conversation">New</button>
        <button onclick="miraToggle(false)" title="Close">Close</button>
      </div>
    </div>
    <div class="mira-messages" id="mira-messages">
      <div class="mira-welcome">
        <div class="mira-avatar" style="margin:0 auto 0.75rem;width:40px;height:40px;font-size:1rem;">M</div>
        <h4>Hey, I'm Mira</h4>
        <p>Your AI chief of staff. Ask me about your day, your patients, or your inbox.</p>
        <div class="mira-suggestions">
          <button class="mira-suggestion" onclick="miraSend('Walk me through today')">Walk me through today</button>
          <button class="mira-suggestion" onclick="miraSend('What\\'s urgent in my inbox?')">What's urgent in my inbox?</button>
          <button class="mira-suggestion" onclick="miraSend('Show me all recent check-ins')">Show me all recent check-ins</button>
        </div>
      </div>
    </div>
    <div class="mira-input-bar">
      <textarea id="mira-input" rows="1" placeholder="Ask Mira anything..."></textarea>
      <button class="mira-send" id="mira-send-btn" onclick="miraSendFromInput()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  `;
  document.body.appendChild(panel);

  // ── State ──
  let isOpen = false;
  let isWaiting = false;
  let conversationHistory = [];
  const messagesEl = document.getElementById('mira-messages');
  const inputEl = document.getElementById('mira-input');
  const sendBtn = document.getElementById('mira-send-btn');

  // Auto-resize textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  });

  // Enter to send
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      miraSendFromInput();
    }
  });

  // Keyboard shortcut: Cmd+K or /
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey && e.key === 'k') || (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName))) {
      e.preventDefault();
      togglePanel(!isOpen);
      if (isOpen) inputEl.focus();
    }
  });

  // ── Functions (exposed globally) ──
  window.miraToggle = function (open) { togglePanel(open); };
  window.miraNewConvo = function () {
    conversationHistory = [];
    messagesEl.innerHTML = `
      <div class="mira-welcome">
        <div class="mira-avatar" style="margin:0 auto 0.75rem;width:40px;height:40px;font-size:1rem;">M</div>
        <h4>Fresh conversation</h4>
        <p>What can I help you with?</p>
        <div class="mira-suggestions">
          <button class="mira-suggestion" onclick="miraSend('Walk me through today')">Walk me through today</button>
          <button class="mira-suggestion" onclick="miraSend('What\\'s urgent in my inbox?')">What's urgent in my inbox?</button>
        </div>
      </div>`;
  };

  window.miraSend = async function (text) {
    if (!text || isWaiting) return;

    // Remove welcome screen
    const welcome = messagesEl.querySelector('.mira-welcome');
    if (welcome) welcome.remove();

    // Add user message
    addMsg(text, 'user');
    conversationHistory.push({ role: 'user', content: text });
    inputEl.value = '';
    inputEl.style.height = 'auto';

    isWaiting = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const user = await getUser();
      const res = await fetch('/.netlify/functions/doctor-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_email: user.email,
          user_message: text,
        }),
      });

      hideTyping();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addMsg(err.error || 'Something went wrong. Try again.', 'agent');
        isWaiting = false;
        sendBtn.disabled = false;
        return;
      }

      const data = await res.json();

      // Show tool calls as status
      if (data.tool_calls_made && data.tool_calls_made.length > 0) {
        const toolNames = data.tool_calls_made.map(t => {
          const labels = {
            get_todays_appointments: 'Checked today\'s appointments',
            get_patient_snapshot: 'Pulled patient snapshot',
            get_recent_checkins: 'Checked recent check-ins',
            get_doctor_digest: 'Scanned inbox',
            query_patient_panel: 'Searched patient panel',
            get_protocol_history: 'Checked protocol history',
            mark_checkin_reviewed: 'Marked check-in as reviewed',
            draft_patient_message: 'Drafted message',
            get_patient_labs: 'Pulled lab results',
          };
          return labels[t.name] || t.name;
        });
        addMsg(toolNames.join(' · '), 'tool-status');
      }

      // Render agent response with basic markdown
      addMsg(renderMarkdown(data.agent_message), 'agent', true);
      conversationHistory.push({ role: 'assistant', content: data.agent_message });

    } catch (err) {
      hideTyping();
      console.error('Mira error:', err);
      addMsg('Connection issue. Please try again.', 'agent');
    }

    isWaiting = false;
    sendBtn.disabled = false;
    inputEl.focus();
  };

  window.miraSendFromInput = function () {
    miraSend(inputEl.value.trim());
  };

  function togglePanel(open) {
    isOpen = open;
    panel.classList.toggle('closed', !open);
    document.body.classList.toggle('mira-open', open);
    fab.classList.toggle('has-panel', open);
    if (open) inputEl.focus();
  }

  function addMsg(content, type, isHtml) {
    const div = document.createElement('div');
    div.className = `mira-msg ${type}`;
    if (isHtml) {
      div.innerHTML = content;
    } else {
      div.textContent = content;
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'mira-typing';
    div.id = 'mira-typing';
    div.innerHTML = '<div class="mira-dots"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('mira-typing');
    if (el) el.remove();
  }

  function renderMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>')
      .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>').replace(/$/, '</p>')
      .replace(/<p><\/p>/g, '');
  }

  // ── Load on dashboard ready ──
  function waitForAuth() {
    const check = setInterval(async () => {
      const dashEl = document.getElementById('dashboard-section');
      if (dashEl && !dashEl.classList.contains('hidden')) {
        clearInterval(check);
        fab.style.display = '';
      }
    }, 500);
  }
  waitForAuth();
})();
