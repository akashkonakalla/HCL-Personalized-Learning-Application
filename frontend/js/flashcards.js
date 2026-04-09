/**
 * flashcards.js — Flashcard logic and rendering
 */

const Flashcards = (() => {

  let cards = [];
  let currentIndex = 0;
  let isFlipped = false;

  /**
   * Initialize flashcards with data
   * @param {Array} flashcardData - [{ question, answer }]
   */
  function init(flashcardData) {
    cards = flashcardData || [];
    currentIndex = 0;
    isFlipped = false;

    updateCounter();
    renderCurrent();
    bindEvents();
  }

  /**
   * Render the current card
   */
  function renderCurrent() {
    if (!cards.length) {
      document.getElementById('fc-question-text').textContent = 'No flashcards available.';
      document.getElementById('fc-answer-text').textContent = '';
      return;
    }

    const card = cards[currentIndex];
    const fcEl = document.getElementById('flashcard');
    const questionEl = document.getElementById('fc-question-text');
    const answerEl = document.getElementById('fc-answer-text');

    // Reset flip state
    isFlipped = false;
    if (fcEl) fcEl.classList.remove('flipped');

    // Update text
    if (questionEl) questionEl.textContent = card.question || 'Question not available';
    if (answerEl)   answerEl.textContent   = card.answer   || 'Answer not available';

    updateCounter();
    updateNavButtons();
  }

  /**
   * Update counter display
   */
  function updateCounter() {
    const currentEl = document.getElementById('fc-current');
    const totalEl   = document.getElementById('fc-total');
    if (currentEl) currentEl.textContent = cards.length ? currentIndex + 1 : 0;
    if (totalEl)   totalEl.textContent   = cards.length;
  }

  /**
   * Update prev/next button states
   */
  function updateNavButtons() {
    const prevBtn = document.getElementById('fc-prev-btn');
    const nextBtn = document.getElementById('fc-next-btn');
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === cards.length - 1;
  }

  /**
   * Flip the card
   */
  function flip() {
    const fcEl = document.getElementById('flashcard');
    if (!fcEl) return;
    isFlipped = !isFlipped;
    fcEl.classList.toggle('flipped', isFlipped);
  }

  /**
   * Navigate to previous card
   */
  function prev() {
    if (currentIndex > 0) {
      currentIndex--;
      renderCurrent();
    }
  }

  /**
   * Navigate to next card
   */
  function next() {
    if (currentIndex < cards.length - 1) {
      currentIndex++;
      renderCurrent();
    }
  }

  /**
   * Bind all event listeners
   */
  function bindEvents() {
    // Flip button
    document.getElementById('fc-flip-btn')?.addEventListener('click', flip);

    // Click on card to flip
    document.getElementById('flashcard')?.addEventListener('click', flip);

    // Navigation
    document.getElementById('fc-prev-btn')?.addEventListener('click', prev);
    document.getElementById('fc-next-btn')?.addEventListener('click', next);

    // Keyboard navigation
    document.addEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    // Only active when flashcard section is visible
    const section = document.getElementById('step-flashcards');
    if (!section || section.classList.contains('hidden')) return;

    if (e.key === 'ArrowLeft')  prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
  }

  /**
   * Get current cards
   */
  function getCards() {
    return cards;
  }

  return {
    init,
    flip,
    prev,
    next,
    getCards
  };

})();

window.Flashcards = Flashcards;
