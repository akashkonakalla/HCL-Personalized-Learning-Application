/**
 * dashboard.js — Main dashboard logic (flow control + state management)
 * State-driven UI rendering with step-based progressive disclosure.
 */

const Dashboard = (() => {

  // ─── State ───
  let state = {
    topic: '',
    questions: [],
    quizResult: null,  // { score, level, breakdown }
    contentData: null,
    step: 'topic'      // topic | quiz | results | content | flashcards | recommendations | agent
  };

  // ─── Step → section ID mapping ───
  const STEP_SECTIONS = {
    topic:           'step-topic',
    quiz:            'step-quiz',
    results:         'step-results',
    content:         'step-content',
    flashcards:      'step-flashcards',
    recommendations: 'step-recommendations',
    agent:           'step-agent',
    history:         'section-history'
  };

  const STEP_TITLES = {
    topic:           'Start Learning',
    quiz:            'Diagnostic Quiz',
    results:         'Quiz Results',
    content:         'Study Materials',
    flashcards:      'Flashcards',
    recommendations: 'Recommendations',
    agent:           'AI Tutor',
    history:         'Learning History'
  };

  // ─── Init ───
  // TEMPORARY: For development, we can bypass auth and go straight to quiz step with a preset topic
  function init() {
    // Require auth
    if (!Auth.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }

    populateUserInfo();
    bindGlobalEvents();
    navigateTo('topic');
    loadHistory();
  }

  // ─── User Info ───

  function populateUserInfo() {
    const user = Auth.getUser();
    if (!user) return;

    const initial = (user.name || 'U')[0].toUpperCase();
    const name    = user.name || 'User';
    const email   = user.email || '';

    setEl('user-name',    name);
    setEl('user-email',   email);
    setEl('user-avatar',  initial);
    setEl('chip-name',    name.split(' ')[0]);
    setEl('chip-avatar',  initial);
  }

  // ─── Navigation ───

  /**
   * Navigate to a step/section
   * @param {string} step
   */
  function navigateTo(step) {
    state.step = step;

    // Hide all sections
    Object.values(STEP_SECTIONS).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    // Show target section
    const targetId = STEP_SECTIONS[step];
    const target   = document.getElementById(targetId);
    if (target) target.classList.remove('hidden');

    // Update topbar title
    setEl('topbar-title', STEP_TITLES[step] || step);

    // Update sidebar active links
    document.querySelectorAll('.sidebar-link').forEach(link => {
      const section = link.dataset.section;
      link.classList.toggle('active', section === (step === 'history' ? 'history' : 'learn'));
    });

    // Scroll main content to top
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Loaders ───

  function showLoader(text = 'Generating with AI...') {
    const loader = document.getElementById('global-loader');
    const loaderText = document.getElementById('loader-text');
    if (loader)     loader.classList.remove('hidden');
    if (loaderText) loaderText.textContent = text;
  }

  function hideLoader() {
    document.getElementById('global-loader')?.classList.add('hidden');
  }

  // ─── STEP 1: Topic Input ───

  function bindTopicStep() {
    const startBtn  = document.getElementById('start-learning-btn');
    const topicInput = document.getElementById('topic-input');

    startBtn?.addEventListener('click', startLearning);
    topicInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') startLearning();
    });

    // Suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (topicInput) topicInput.value = chip.dataset.topic;
        startLearning();
      });
    });
  }

  async function startLearning() {
    const topicInput = document.getElementById('topic-input');
    const topic = topicInput?.value.trim();

    if (!topic || topic.length < 2) {
      topicInput?.focus();
      topicInput?.classList.add('is-invalid');
      setTimeout(() => topicInput?.classList.remove('is-invalid'), 2000);
      return;
    }

    state.topic = topic;

    showLoader('Generating your diagnostic quiz...');

    try {
      const data = await API.generateQuiz(topic);
      state.questions = data.questions;

      Quiz.render(data.questions, topic);
      navigateTo('quiz');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      hideLoader();
    }
  }

  // ─── STEP 2: Quiz ───

  function bindQuizStep() {
    document.getElementById('submit-quiz-btn')?.addEventListener('click', submitQuiz);
    document.getElementById('quiz-back-btn')?.addEventListener('click', () => navigateTo('topic'));
  }

  async function submitQuiz() {
    const { valid, unanswered } = Quiz.validate();

    if (!valid) {
      Quiz.highlightUnanswered(unanswered);
      return;
    }

    showLoader('Evaluating your answers...');

    try {
      const payload = Quiz.getSubmitPayload();
      const result  = await API.submitQuiz({
        topic:     state.topic,
        answers:   payload.answers,
        questions: payload.questions
      });

      state.quizResult = result;

      renderResults(result);
      navigateTo('results');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      hideLoader();
    }
  }

  // ─── STEP 3: Results ───

  function renderResults(result) {
    const { score, level, breakdown } = result;

    // Score ring animation
    const total      = 10;
    const pct        = score / total;
    const circumference = 326.7;
    const offset     = circumference * (1 - pct);

    const ringFill = document.getElementById('ring-fill');
    if (ringFill) {
      // Inject gradient def into SVG
      const svg = ringFill.closest('svg');
      if (svg && !svg.querySelector('#ring-gradient')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#7c5cfc"/>
            <stop offset="100%" stop-color="#4fc4f9"/>
          </linearGradient>
        `;
        svg.insertBefore(defs, svg.firstChild);
        ringFill.setAttribute('stroke', 'url(#ring-gradient)');
      }

      // Animate
      setTimeout(() => { ringFill.style.strokeDashoffset = offset; }, 100);
    }

    setEl('ring-score', score);

    // Level badge
    const levelBadge = document.getElementById('results-level-badge');
    const levelClass  = Utils.getLevelClass(level);
    if (levelBadge) {
      levelBadge.className = `results-level-badge ${levelClass}`;
    }
    setEl('results-level-emoji', Utils.getLevelEmoji(level));
    setEl('results-level-name',  level);
    setEl('results-heading',     `You're at ${level} Level!`);
    setEl('results-desc',        Utils.getLevelDescription(level, score));

    // Breakdown
    Quiz.renderBreakdown(result);

    // Bind generate button
    document.getElementById('generate-content-btn')?.addEventListener('click', generateContent, { once: true });
  }

  function bindResultsStep() {
    // Back button
    document.getElementById('quiz-back-btn')?.addEventListener('click', () => navigateTo('quiz'));
  }

  // ─── STEP 4: Content ───

  async function generateContent() {
    showLoader('Generating personalized study materials...');

    try {
      const data = await API.generateContent({
        topic: state.topic,
        level: state.quizResult.level,
        score: state.quizResult.score
      });

      state.contentData = data;

      Content.render(data, state.topic, state.quizResult.level);
      navigateTo('content');

      // Load history again to reflect new session
      loadHistory();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      hideLoader();
    }
  }

  function bindContentStep() {
    document.getElementById('content-back-btn')?.addEventListener('click', () => navigateTo('results'));
    document.getElementById('show-flashcards-btn')?.addEventListener('click', goToFlashcards);

    // Download buttons
    document.getElementById('download-pdf-btn')?.addEventListener('click', () =>
      Content.exportPDF(state.topic, state.quizResult?.level));
    document.getElementById('download-docx-btn')?.addEventListener('click', () =>
      Content.exportDOCX(state.topic, state.quizResult?.level));
    document.getElementById('download-md-btn')?.addEventListener('click', () =>
      Content.exportMarkdown(state.topic, state.quizResult?.level));
  }

  // ─── STEP 5: Flashcards ───

  function goToFlashcards() {
    const flashcards = state.contentData?.flashcards || [];
    Flashcards.init(flashcards);
    navigateTo('flashcards');
  }

  function bindFlashcardsStep() {
    document.getElementById('flashcards-back-btn')?.addEventListener('click', () => navigateTo('content'));
    document.getElementById('show-recommendations-btn')?.addEventListener('click', goToRecommendations);
  }

  // ─── STEP 6: Recommendations ───

  function goToRecommendations() {
    const recs = state.contentData?.recommendations || {};
    Recommendations.render(recs);
    navigateTo('recommendations');
  }

  function bindRecommendationsStep() {
    document.getElementById('recs-back-btn')?.addEventListener('click', () => navigateTo('flashcards'));
    document.getElementById('show-agent-btn')?.addEventListener('click', goToAgent);
  }

  // ─── STEP 7: AI Agent ───

  function goToAgent() {
    navigateTo('agent');
    initAgentChat();
  }

  let agentHistory = [];

  function initAgentChat() {
    agentHistory = [];
    const chatEl = document.getElementById('agent-chat');
    if (!chatEl) return;
    chatEl.innerHTML = '';

    // Initial AI greeting
    const greeting = state.contentData?.agent_intro ||
      `Hi! I'm your AI tutor for **${state.topic}**. You're at the **${state.quizResult?.level}** level.\n\nI've reviewed your quiz performance. Ask me anything — about weak areas, what to study next, or specific concepts you want to clarify!`;

    appendMessage('ai', greeting);
  }

  function bindAgentStep() {
    document.getElementById('agent-back-btn')?.addEventListener('click', () => navigateTo('recommendations'));
    document.getElementById('start-over-btn')?.addEventListener('click', startOver);
    document.getElementById('agent-send-btn')?.addEventListener('click', sendAgentMessage);
    document.getElementById('agent-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAgentMessage(); }
    });
  }

  async function sendAgentMessage() {
    const input = document.getElementById('agent-input');
    const message = input?.value.trim();
    if (!message) return;

    input.value = '';
    appendMessage('user', message);

    // Disable input while waiting
    if (input) input.disabled = true;
    const sendBtn = document.getElementById('agent-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    // Typing indicator
    const typingId = appendTyping();

    try {
      agentHistory.push({ role: 'user', content: message });

      const data = await API.chatWithAgent({
        topic:   state.topic,
        level:   state.quizResult?.level,
        message,
        history: agentHistory
      });

      removeTyping(typingId);
      const reply = data.reply || data.message || 'I could not generate a response.';
      agentHistory.push({ role: 'assistant', content: reply });
      appendMessage('ai', reply);
    } catch (err) {
      removeTyping(typingId);
      appendMessage('ai', `Sorry, I encountered an error: ${err.message}`);
    } finally {
      if (input) input.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
      input?.focus();
    }
  }

  function appendMessage(role, text) {
    const chatEl = document.getElementById('agent-chat');
    if (!chatEl) return;

    const isAI = role === 'ai';
    const msgEl = document.createElement('div');
    msgEl.className = `agent-message ${role}`;

    const formattedText = Utils.renderMarkdown(text);

    msgEl.innerHTML = `
      <div class="msg-avatar">${isAI ? '🤖' : '👤'}</div>
      <div class="msg-bubble">${formattedText}</div>
    `;

    chatEl.appendChild(msgEl);
    chatEl.scrollTop = chatEl.scrollHeight;
    return msgEl.id;
  }

  function appendTyping() {
    const chatEl = document.getElementById('agent-chat');
    if (!chatEl) return;

    const id = Utils.randomId();
    const el = document.createElement('div');
    el.className = 'agent-message ai';
    el.id = `typing-${id}`;
    el.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-bubble" style="opacity:0.6">
        <span style="letter-spacing:2px;font-size:1.1rem">···</span>
      </div>
    `;

    chatEl.appendChild(el);
    chatEl.scrollTop = chatEl.scrollHeight;
    return id;
  }

  function removeTyping(id) {
    document.getElementById(`typing-${id}`)?.remove();
  }

  // ─── Start Over ───

  function startOver() {
    state = {
      topic: '',
      questions: [],
      quizResult: null,
      contentData: null,
      step: 'topic'
    };
    agentHistory = [];
    document.getElementById('topic-input').value = '';
    navigateTo('topic');
  }

  // ─── History ───

  async function loadHistory() {
    try {
      const data = await API.getHistory();
      renderHistoryCards(data.history || []);
      renderHistoryTable(data.history || []);
    } catch {
      // Silently fail — history is non-critical
    }
  }

  function renderHistoryCards(history) {
    const grid = document.getElementById('recent-history-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!history.length) {
      grid.innerHTML = '<p style="color:var(--color-text-muted);grid-column:1/-1;">No sessions yet. Start learning!</p>';
      return;
    }

    history.slice(0, 6).forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-card';
      const levelClass = Utils.getLevelClass(item.level);

      card.innerHTML = `
        <div class="history-card-topic">${Utils.sanitize(item.topic)}</div>
        <div class="history-card-meta">
          <span class="history-card-level level-${levelClass}">${Utils.getLevelEmoji(item.level)} ${item.level}</span>
          <span class="history-card-score">${item.score}/10</span>
        </div>
      `;

      card.addEventListener('click', () => {
        const topicInput = document.getElementById('topic-input');
        if (topicInput) topicInput.value = item.topic;
        navigateTo('topic');
      });

      grid.appendChild(card);
    });
  }

  function renderHistoryTable(history) {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;

    if (!history.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted);">No sessions yet.</td></tr>';
      return;
    }

    tbody.innerHTML = history.map(item => {
      const levelClass = Utils.getLevelClass(item.level);
      return `
        <tr>
          <td>${Utils.sanitize(item.topic)}</td>
          <td>${item.score}/10</td>
          <td><span class="level-pill level-${levelClass}">${Utils.getLevelEmoji(item.level)} ${item.level}</span></td>
          <td>${Utils.formatDate(item.created_at)}</td>
        </tr>
      `;
    }).join('');
  }

  // ─── Global Events ───

  function bindGlobalEvents() {
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', Auth.logout);

    // Sidebar nav links
    document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        if (section === 'history') {
          navigateTo('history');
        } else {
          navigateTo('topic');
        }
      });
    });

    // Mobile sidebar toggle
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });

    // Step bindings
    bindTopicStep();
    bindQuizStep();
    bindResultsStep();
    bindContentStep();
    bindFlashcardsStep();
    bindRecommendationsStep();
    bindAgentStep();
  }

  // ─── Helpers ───

  function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // ─── Bootstrap ───

  document.addEventListener('DOMContentLoaded', () => {
    // Only init on dashboard
    if (document.getElementById('step-topic')) {
      init();
    }
  });

  return {
    navigateTo,
    loadHistory
  };

})();

window.Dashboard = Dashboard;
