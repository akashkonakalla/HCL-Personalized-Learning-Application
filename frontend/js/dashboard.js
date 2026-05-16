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
    topic: 'step-topic',
    quiz: 'step-quiz',
    results: 'step-results',
    content: 'step-content',
    flashcards: 'step-flashcards',
    recommendations: 'step-recommendations',
    agent: 'step-agent',
    history: 'section-history'
  };

  const STEP_TITLES = {
    topic: 'Start Learning',
    quiz: 'Diagnostic Quiz',
    results: 'Quiz Results',
    content: 'Study Materials',
    flashcards: 'Flashcards',
    recommendations: 'Recommendations',
    agent: 'AI Tutor',
    history: 'Learning History'
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
    const name = user.name || 'User';
    const email = user.email || '';

    setEl('user-name', name);
    setEl('user-email', email);
    setEl('user-avatar', initial);
    setEl('chip-name', name.split(' ')[0]);
    setEl('chip-avatar', initial);
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
    const target = document.getElementById(targetId);
    if (target) target.classList.remove('hidden');

    // Update topbar title
    setEl('topbar-title', STEP_TITLES[step] || step);

    // Show/hide topic badge in topbar
    const badge = document.getElementById('topic-badge');
    const badgeText = document.getElementById('topic-badge-text');
    if (badge && badgeText && state.topic && step !== 'topic' && step !== 'history') {
      badge.classList.remove('hidden');
      badgeText.textContent = state.topic;
    } else if (badge) {
      badge.classList.add('hidden');
    }

    // Update sidebar active links
    document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
      const section = link.dataset.section;
      link.classList.toggle('active', section === (step === 'history' ? 'history' : 'learn'));
      link.setAttribute('aria-current', link.classList.contains('active') ? 'page' : 'false');
    });

    // Sync journey strip
    const JOURNEY_ORDER = ['topic', 'quiz', 'results', 'content', 'flashcards', 'recommendations', 'agent'];
    const currentIdx = JOURNEY_ORDER.indexOf(step);
    
    // Determine maximum reachable index based on data
    let maxIdx = 0; // topic
    if (state.questions && state.questions.length > 0) maxIdx = 1; // quiz
    if (state.quizResult) maxIdx = 2; // results
    if (state.contentData) maxIdx = 6; // all content steps

    document.querySelectorAll('.journey-step[data-step]').forEach(el => {
      const s = el.dataset.step;
      const idx = JOURNEY_ORDER.indexOf(s);
      el.classList.remove('active', 'completed');
      
      if (s === step) {
        el.classList.add('active');
      } else if (idx <= maxIdx) {
        el.classList.add('completed');
      }
    });

    // Sync sidebar progress dots
    const DOT_MAP = { topic: 1, quiz: 2, results: 3, content: 4, flashcards: 5, recommendations: 6, agent: 7 };
    const currentDot = DOT_MAP[step];
    let maxDot = 1;
    if (state.questions && state.questions.length > 0) maxDot = 2;
    if (state.quizResult) maxDot = 3;
    if (state.contentData) maxDot = 7;

    document.querySelectorAll('.progress-dot[data-dot]').forEach(dot => {
      const n = parseInt(dot.dataset.dot);
      dot.classList.remove('done', 'current');
      
      if (n === currentDot) {
        dot.classList.add('current');
      } else if (n <= maxDot) {
        dot.classList.add('done');
      }
    });

    // Update buttons if we have downstream data
    const generateBtn = document.getElementById('generate-content-btn');
    if (generateBtn) {
      generateBtn.textContent = state.contentData ? 'View Study Materials →' : 'Generate My Study Materials →';
    }

    // Scroll main content to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Loaders ───

  function showLoader(text = 'Generating with AI...') {
    const loader = document.getElementById('global-loader');
    const loaderText = document.getElementById('loader-text');
    if (loader) loader.classList.remove('hidden');
    if (loaderText) loaderText.textContent = text;
  }

  function hideLoader() {
    document.getElementById('global-loader')?.classList.add('hidden');
  }

  // ─── STEP 1: Topic Input ───

  function bindTopicStep() {
    const startBtn = document.getElementById('start-learning-btn');
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

    // If exact same topic and questions exist, skip generation
    if (state.topic.toLowerCase() === topic.toLowerCase() && state.questions && state.questions.length > 0) {
      navigateTo('quiz');
      return;
    }

    state.topic = topic;
    // Clear downstream state
    state.questions = [];
    state.quizResult = null;
    state.contentData = null;
    agentHistory = [];

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

    // Clear content data since we are submitting a new quiz
    state.contentData = null;
    agentHistory = [];

    showLoader('Evaluating your answers...');

    try {
      const payload = Quiz.getSubmitPayload();
      const result = await API.submitQuiz({
        topic: state.topic,
        answers: payload.answers,
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
    const total = 10;
    const pct = score / total;
    const circumference = 326.7;
    const offset = circumference * (1 - pct);

    const ringFill = document.getElementById('ring-fill');
    if (ringFill) {
      const svg = ringFill.closest('svg');
      // Only inject defs if not already present in HTML
      if (svg && !svg.querySelector('#ring-gradient')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#6366F1"/>
            <stop offset="100%" stop-color="#38BDF8"/>
          </linearGradient>
        `;
        svg.insertBefore(defs, svg.firstChild);
      }
      // Ensure stroke uses gradient
      ringFill.setAttribute('stroke', 'url(#ring-gradient)');

      // Animate fill
      setTimeout(() => { ringFill.style.strokeDashoffset = offset; }, 100);
    }

    setEl('ring-score', score);

    // Level badge
    const levelBadge = document.getElementById('results-level-badge');
    const levelClass = Utils.getLevelClass(level);
    if (levelBadge) {
      levelBadge.className = `results-level-badge ${levelClass}`;
    }
    const levelEmojiEl = document.getElementById('results-level-emoji');
    if (levelEmojiEl) levelEmojiEl.innerHTML = Utils.getLevelEmoji(level);
    setEl('results-level-name', level);
    setEl('results-heading', `You're at ${level} Level!`);
    setEl('results-desc', Utils.getLevelDescription(level, score));

    // Breakdown
    Quiz.renderBreakdown(result);
  }

  function bindResultsStep() {
    // Back button
    document.getElementById('quiz-back-btn')?.addEventListener('click', () => navigateTo('quiz'));
    document.getElementById('generate-content-btn')?.addEventListener('click', generateContent);
  }

  // ─── STEP 4: Content ───

  async function generateContent() {
    if (state.contentData) {
      navigateTo('content');
      return;
    }

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
        topic: state.topic,
        level: state.quizResult?.level,
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
      <div class="msg-avatar">${isAI ? '<i class="ph ph-robot"></i>' : '<i class="ph ph-user"></i>'}</div>
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
      <div class="msg-avatar"><i class="ph ph-robot"></i></div>
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
          <td>
            <div class="ht-topic-wrapper">
              <div class="ht-topic-icon"><i class="ph ph-book-open-text"></i></div>
              <span class="ht-topic">${Utils.sanitize(item.topic)}</span>
            </div>
          </td>
          <td>
            <div class="ht-score-wrapper">
              <span class="ht-score">${item.score}</span>
              <span class="ht-score-total">/ 10</span>
            </div>
          </td>
          <td>
            <span class="history-level-badge level-${levelClass}">
              <span class="level-emoji">${Utils.getLevelEmoji(item.level)}</span>
              ${item.level}
            </span>
          </td>
          <td class="ht-date">${Utils.formatDate(item.created_at)}</td>
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
          startOver();
        }
      });
    });

    // Mobile sidebar toggle — also updates aria-expanded
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      const toggle = document.getElementById('sidebar-toggle');
      const isOpen = sidebar?.classList.toggle('open');
      toggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Step Navigation Handler
    const handleStepNavigation = (targetStep) => {
      if (targetStep === 'topic') {
        navigateTo('topic');
      } else if (targetStep === 'quiz' && state.questions.length > 0) {
        navigateTo('quiz');
      } else if (targetStep === 'results' && state.quizResult) {
        navigateTo('results');
      } else if (['content', 'flashcards', 'recommendations', 'agent'].includes(targetStep) && state.contentData) {
        if (targetStep === 'flashcards' && state.step !== 'flashcards') {
          goToFlashcards();
        } else if (targetStep === 'recommendations' && state.step !== 'recommendations') {
          goToRecommendations();
        } else if (targetStep === 'agent' && state.step !== 'agent') {
          goToAgent();
        } else if (targetStep === 'content' && state.step !== 'content') {
          navigateTo('content');
        }
      }
    };

    // Journey strip clicks
    document.querySelectorAll('.journey-step[data-step]').forEach(stepEl => {
      stepEl.addEventListener('click', () => {
        if (!stepEl.classList.contains('active') && !stepEl.classList.contains('completed')) return;
        handleStepNavigation(stepEl.dataset.step);
      });
    });

    // Progress dot clicks
    const DOT_MAP_REVERSE = { 1: 'topic', 2: 'quiz', 3: 'results', 4: 'content', 5: 'flashcards', 6: 'recommendations', 7: 'agent' };
    document.querySelectorAll('.progress-dot[data-dot]').forEach(dotEl => {
      dotEl.addEventListener('click', () => {
        if (!dotEl.classList.contains('current') && !dotEl.classList.contains('done')) return;
        handleStepNavigation(DOT_MAP_REVERSE[dotEl.dataset.dot]);
      });
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
