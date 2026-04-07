/**
 * dashboard.js — Dashboard interactions for LearnAI
 */
import { getUser, logout, requireAuth } from './auth.js';
import { mockChat, mockDelay, mockGenerateQuiz } from './api.js';
import { showToast } from './utils.js';

/* ── Boot ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  initUser();
  initTasks();
  initChat();
  initCards();
  initSidebar();
  initProgress();
  animateStats();
});

/* ── User ────────────────────────────────────────────────────── */
function initUser() {
  const user = getUser();
  if (!user) return;

  document.querySelectorAll('[data-user-name]').forEach((el) => {
    el.textContent = user.name;
  });
  document.querySelectorAll('[data-user-email]').forEach((el) => {
    el.textContent = user.email;
  });
  document.querySelectorAll('[data-user-avatar]').forEach((el) => {
    el.textContent = user.avatar || user.name.charAt(0).toUpperCase();
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout();
  });
}

/* ── Tasks ───────────────────────────────────────────────────── */
function initTasks() {
  const tasks = document.querySelectorAll('.task-item');
  tasks.forEach((task) => {
    task.addEventListener('click', () => {
      task.classList.toggle('completed');
      updateProgress();
    });
  });
  updateProgress();
}

function updateProgress() {
  const tasks = document.querySelectorAll('.task-item');
  const done = document.querySelectorAll('.task-item.completed').length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const ring = document.querySelector('.progress-ring__fill');
  const label = document.querySelector('.progress-ring__label');
  if (!ring) return;

  const r = 22;
  const circ = 2 * Math.PI * r;
  ring.style.strokeDasharray = circ;
  ring.style.strokeDashoffset = circ - (circ * pct) / 100;
  if (label) label.textContent = pct + '%';

  const count = document.querySelector('.study-plan__count');
  if (count) count.textContent = `${done}/${tasks.length} done`;
}

/* ── Chat ────────────────────────────────────────────────────── */
let chatHistory = [];
let selectedDifficulty = 'medium';

function initChat() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const attachBtn = document.getElementById('chat-attach');
  const diffBtns = document.querySelectorAll('.chat-difficulty-btn');
  const suggestions = document.querySelectorAll('.suggestion-chip');

  diffBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      diffBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDifficulty = btn.dataset.level;
    });
  });

  // Set default active
  document.querySelector('[data-level="medium"]')?.classList.add('active');

  suggestions.forEach((chip) => {
    chip.addEventListener('click', () => {
      if (input) {
        input.value = chip.textContent;
        input.focus();
      }
    });
  });

  sendBtn?.addEventListener('click', sendMessage);

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    sendBtn.disabled = !input.value.trim();
  });

  attachBtn?.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.txt,.docx,.png,.jpg';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        showToast(`📎 "${file.name}" attached`, 'success');
        if (input) input.value = `[File: ${file.name}] `;
      }
    };
    fileInput.click();
  });

  if (sendBtn) sendBtn.disabled = true;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const text = input?.value.trim();
  if (!text) return;

  appendMessage('user', text);
  input.value = '';
  input.style.height = 'auto';
  if (sendBtn) sendBtn.disabled = true;

  chatHistory.push({ role: 'user', content: text });

  const typingEl = showTyping();
  try {
    const reply = await mockChat(text);
    typingEl.remove();
    appendMessage('ai', reply);
    chatHistory.push({ role: 'assistant', content: reply });
  } catch (err) {
    typingEl.remove();
    appendMessage('ai', 'Sorry, something went wrong. Please try again.');
  }
}

function appendMessage(role, text) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const user = getUser();
  const initials = user ? user.avatar || user.name.charAt(0) : '?';
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const msg = document.createElement('div');
  msg.className = `chat-msg chat-msg--${role}`;
  msg.innerHTML = `
    <div class="chat-msg__avatar">${role === 'ai' ? '🤖' : initials}</div>
    <div>
      <div class="chat-msg__bubble">${escapeHTML(text)}</div>
      <span class="chat-msg__time">${now}</span>
    </div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function showTyping() {
  const container = document.getElementById('chat-messages');
  const el = document.createElement('div');
  el.className = 'chat-msg chat-msg--ai';
  el.innerHTML = `
    <div class="chat-msg__avatar">🤖</div>
    <div>
      <div class="chat-msg__bubble">
        <div class="typing-indicator">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
    </div>
  `;
  container?.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return el;
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── Feature Cards ───────────────────────────────────────────── */
function initCards() {
  // Study guide
  document.getElementById('btn-study')?.addEventListener('click', () => {
    openModal('study');
  });

  // Quiz
  document.getElementById('btn-quiz')?.addEventListener('click', () => {
    openModal('quiz');
  });

  // Recommendations
  document.getElementById('btn-rec')?.addEventListener('click', () => {
    openModal('rec');
  });

  // Difficulty in quiz card
  document.querySelectorAll('.quiz-diff-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.quiz-diff-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

/* ── Modal ───────────────────────────────────────────────────── */
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

function openModal(type) {
  if (!modalOverlay) return;

  const configs = {
    study: {
      title: '📚 Generate Study Material',
      body: `
        <div>
          <div class="modal__label">Topic</div>
          <input class="modal__input" id="study-topic" placeholder="e.g. Photosynthesis, World War II, Calculus…" />
        </div>
        <div>
          <div class="modal__label">Difficulty</div>
          <select class="modal__select" id="study-diff">
            <option value="beginner">🟢 Beginner</option>
            <option value="medium" selected>🟡 Medium</option>
            <option value="advanced">🔴 Advanced</option>
          </select>
        </div>
        <div>
          <div class="modal__label">Format</div>
          <select class="modal__select" id="study-format">
            <option value="summary">Summary Notes</option>
            <option value="flashcards">Flashcards</option>
            <option value="outline">Detailed Outline</option>
          </select>
        </div>
        <div class="modal__footer">
          <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="generateStudy()">✨ Generate</button>
        </div>
      `,
    },
    quiz: {
      title: '🎯 Generate Quiz',
      body: `
        <div>
          <div class="modal__label">Topic</div>
          <input class="modal__input" id="quiz-topic" placeholder="e.g. Algebra, French Revolution, Python…" />
        </div>
        <div>
          <div class="modal__label">Difficulty</div>
          <select class="modal__select" id="quiz-diff">
            <option value="beginner">🟢 Beginner</option>
            <option value="medium" selected>🟡 Medium</option>
            <option value="advanced">🔴 Advanced</option>
          </select>
        </div>
        <div>
          <div class="modal__label">Number of Questions</div>
          <input class="modal__input" type="number" id="quiz-count" value="10" min="5" max="30" />
        </div>
        <div class="modal__footer">
          <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="generateQuiz()">🚀 Generate Quiz</button>
        </div>
      `,
    },
    rec: {
      title: '💡 Personalized Recommendations',
      body: `
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${getRecommendationCards()}
        </div>
        <div class="modal__footer">
          <button class="btn btn-outline" onclick="closeModal()">Close</button>
          <button class="btn btn-primary" onclick="refreshRec()">🔄 Refresh</button>
        </div>
      `,
    },
  };

  const cfg = configs[type];
  if (!cfg) return;
  if (modalTitle) modalTitle.textContent = cfg.title;
  if (modalBody) modalBody.innerHTML = cfg.body;
  modalOverlay.classList.add('open');
}

function getRecommendationCards() {
  const recs = [
    { icon: '🧬', title: 'Biology — Cell Division', reason: 'Based on your recent study sessions', tag: 'Beginner' },
    { icon: '📐', title: 'Geometry — Trigonometry', reason: 'You scored 60% on the last quiz', tag: 'Medium' },
    { icon: '🌍', title: 'World History — Cold War', reason: 'Trending topic in your syllabus', tag: 'Advanced' },
  ];
  return recs.map(r => `
    <div style="padding:14px 16px;background:rgba(91,99,245,0.08);border:1px solid var(--border-subtle);border-radius:12px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:0.2s;" onmouseenter="this.style.borderColor='var(--border-glow)'" onmouseleave="this.style.borderColor='var(--border-subtle)'">
      <div style="font-size:1.6rem">${r.icon}</div>
      <div style="flex:1">
        <div style="font-family:var(--font-display);font-weight:700;font-size:0.9rem;margin-bottom:3px">${r.title}</div>
        <div style="font-size:0.76rem;color:var(--text-muted)">${r.reason}</div>
      </div>
      <span class="badge badge-${r.tag.toLowerCase()}">${r.tag}</span>
    </div>
  `).join('');
}

window.closeModal = function () {
  modalOverlay?.classList.remove('open');
};

modalOverlay?.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.getElementById('modal-close')?.addEventListener('click', closeModal);

window.generateStudy = async function () {
  const topic = document.getElementById('study-topic')?.value.trim();
  if (!topic) { showToast('Please enter a topic', 'error'); return; }

  const btn = modalBody.querySelector('.btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Generating…'; }

  await mockDelay(1800);

  closeModal();
  showToast(`📚 Study guide for "${topic}" generated!`, 'success');
  appendMessage('ai', `I've generated a study guide for "${topic}". It includes key concepts, summaries, and flashcards. Would you like me to quiz you on this topic?`);
};

window.generateQuiz = async function () {
  const topic = document.getElementById('quiz-topic')?.value.trim();
  const diff = document.getElementById('quiz-diff')?.value || 'medium';
  if (!topic) { showToast('Please enter a topic', 'error'); return; }

  const btn = modalBody.querySelector('.btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Generating…'; }

  const quiz = await mockGenerateQuiz(topic, diff);
  closeModal();
  showToast(`🎯 Quiz on "${topic}" ready! ${quiz.questions.length} questions.`, 'success');
};

window.refreshRec = async function () {
  const btn = document.querySelector('#modal-body .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; }
  await mockDelay(1000);
  showToast('💡 Recommendations refreshed!', 'success');
  closeModal();
};

/* ── Sidebar (mobile) ────────────────────────────────────────── */
function initSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');

  toggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
  });

  // Nav items
  document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
      item.classList.add('active');
      sidebar?.classList.remove('open');
    });
  });
}

/* ── Progress ring ───────────────────────────────────────────── */
function initProgress() {
  updateProgress();
}

/* ── Stat counter animation ──────────────────────────────────── */
function animateStats() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current + (el.dataset.suffix || '');
      if (current >= target) clearInterval(timer);
    }, 30);
  });
}
