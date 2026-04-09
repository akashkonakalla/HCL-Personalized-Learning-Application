/**
 * quiz.js — Quiz rendering + evaluation
 */

const Quiz = (() => {

  let questions = [];
  let userAnswers = {};  // { questionIndex: selectedOption }

  /**
   * Render quiz questions into the quiz container
   * @param {Array} qs - Array of question objects
   * @param {string} topic
   */
  function render(qs, topic) {
    questions = qs;
    userAnswers = {};

    // Update topic label
    const topicLabel = document.getElementById('quiz-topic-label');
    if (topicLabel) topicLabel.textContent = topic;

    // Update counters
    document.getElementById('quiz-q-total').textContent = qs.length;
    document.getElementById('quiz-q-current').textContent = Object.keys(userAnswers).length;

    const container = document.getElementById('quiz-container');
    if (!container) return;

    container.innerHTML = '';

    qs.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'quiz-question-card';
      card.id = `q-card-${idx}`;

      const letters = ['A', 'B', 'C', 'D'];
      const optionsHTML = q.options.map((opt, optIdx) => `
        <div class="quiz-option" data-q="${idx}" data-opt="${optIdx}" role="button" tabindex="0">
          <div class="option-label">${letters[optIdx]}</div>
          <span>${Utils.sanitize(opt)}</span>
        </div>
      `).join('');

      card.innerHTML = `
        <div class="question-header">
          <div class="question-num">Q${idx + 1}</div>
          <div class="question-text">${Utils.sanitize(q.question)}</div>
        </div>
        <div class="quiz-options">
          ${optionsHTML}
        </div>
      `;

      container.appendChild(card);
    });

    // Attach click listeners
    container.querySelectorAll('.quiz-option').forEach(opt => {
      opt.addEventListener('click', () => selectOption(opt));
      opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') selectOption(opt);
      });
    });
  }

  /**
   * Handle option selection
   * @param {HTMLElement} optEl
   */
  function selectOption(optEl) {
    const qIdx  = parseInt(optEl.dataset.q);
    const optIdx = parseInt(optEl.dataset.opt);

    // Deselect all options in this question
    const card = document.getElementById(`q-card-${qIdx}`);
    card.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));

    // Select this option
    optEl.classList.add('selected');
    userAnswers[qIdx] = optIdx;

    // Update counter
    const current = document.getElementById('quiz-q-current');
    if (current) current.textContent = Object.keys(userAnswers).length;
  }

  /**
   * Validate that all questions have been answered
   * @returns {{ valid: boolean, unanswered: number[] }}
   */
  function validate() {
    const unanswered = [];
    questions.forEach((_, idx) => {
      if (userAnswers[idx] === undefined) unanswered.push(idx);
    });
    return { valid: unanswered.length === 0, unanswered };
  }

  /**
   * Highlight unanswered questions
   * @param {number[]} unanswered
   */
  function highlightUnanswered(unanswered) {
    unanswered.forEach(idx => {
      const card = document.getElementById(`q-card-${idx}`);
      if (card) {
        card.style.borderColor = 'var(--color-error)';
        card.style.backgroundColor = 'rgba(248, 113, 113, 0.04)';
        setTimeout(() => {
          card.style.borderColor = '';
          card.style.backgroundColor = '';
        }, 2000);
      }
    });
    // Scroll to first unanswered
    const firstCard = document.getElementById(`q-card-${unanswered[0]}`);
    if (firstCard) firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * Get the payload for quiz submission
   * @returns {{ answers: object, questions: Array }}
   */
  function getSubmitPayload() {
    return {
      answers: { ...userAnswers },
      questions: questions.map(q => ({
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer
      }))
    };
  }

  /**
   * Render the results breakdown section
   * @param {object} result - { score, level, breakdown }
   */
  function renderBreakdown(result) {
    const container = document.getElementById('results-breakdown');
    if (!container) return;

    const { breakdown = [] } = result;

    if (!breakdown.length) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <h3>Question Breakdown</h3>
      <div class="breakdown-grid">
        ${breakdown.map((item, idx) => `
          <div class="breakdown-item ${item.correct ? 'correct' : 'wrong'}">
            <div class="breakdown-q">Q${idx + 1}: ${Utils.sanitize(item.question)}</div>
            <div class="breakdown-answer">
              Your answer: 
              <span class="${item.correct ? 'correct-answer' : 'wrong-answer'}">
                ${Utils.sanitize(item.user_answer || 'Not answered')}
              </span>
            </div>
            ${!item.correct ? `
              <div class="breakdown-answer correct-answer">
                ✓ Correct: ${Utils.sanitize(item.correct_answer)}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Get the current set of questions
   * @returns {Array}
   */
  function getQuestions() {
    return questions;
  }

  /**
   * Get user's answers
   * @returns {object}
   */
  function getUserAnswers() {
    return { ...userAnswers };
  }

  return {
    render,
    validate,
    highlightUnanswered,
    getSubmitPayload,
    renderBreakdown,
    getQuestions,
    getUserAnswers
  };

})();

window.Quiz = Quiz;
