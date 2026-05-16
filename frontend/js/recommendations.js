/**
 * recommendations.js — Recommendations UI rendering
 */

const Recommendations = (() => {

  /**
   * Render recommendations into the grid
   * @param {object} data - { weak_areas, next_topics, practice_suggestions, resources }
   */
  function render(data) {
    const grid = document.getElementById('recommendations-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const sections = buildSections(data);

    if (!sections.length) {
      grid.innerHTML = '<p style="color:var(--color-text-muted)">No recommendations available.</p>';
      return;
    }

    sections.forEach(section => {
      grid.appendChild(createCard(section));
    });
  }

  /**
   * Build recommendation sections from API data
   * @param {object} data
   * @returns {Array}
   */
  function buildSections(data) {
    const sections = [];

    if (data.weak_areas?.length) {
      sections.push({
        icon: '🎯',
        type: 'Focus Areas',
        title: 'Topics to Strengthen',
        desc: data.weak_areas.join(' · ')
      });
    }

    if (data.next_topics?.length) {
      data.next_topics.slice(0, 3).forEach(topic => {
        sections.push({
          icon: '📖',
          type: 'Next Topic',
          title: typeof topic === 'string' ? topic : topic.title,
          desc: typeof topic === 'object' ? topic.reason : 'Explore this related topic to deepen your understanding.',
          action: typeof topic === 'string' ? topic : topic.title
        });
      });
    }

    if (data.practice_suggestions?.length) {
      sections.push({
        icon: '🏋️',
        type: 'Practice',
        title: 'Recommended Exercises',
        desc: Array.isArray(data.practice_suggestions)
          ? data.practice_suggestions.join(' · ')
          : data.practice_suggestions
      });
    }

    if (data.resources?.length) {
      data.resources.slice(0, 2).forEach(res => {
        sections.push({
          icon: '🔗',
          type: 'Resource',
          title: typeof res === 'string' ? res : res.title,
          desc: typeof res === 'object' ? res.description : 'Recommended learning resource.'
        });
      });
    }

    // Fallback if data is a string
    if (!sections.length && typeof data === 'string') {
      sections.push({
        icon: '💡',
        type: 'Suggestion',
        title: 'AI Recommendation',
        desc: data
      });
    }

    return sections;
  }

  /** 
   * Create a recommendation card element
   * @param {object} item
   * @returns {HTMLElement}
   */
  function createCard(item) {
    const card = document.createElement('div');
    card.className = 'rec-card';

    card.innerHTML = `
      <span class="rec-card-icon">${item.icon}</span>
      <div class="rec-card-type">${Utils.sanitize(item.type)}</div>
      <div class="rec-card-title">${Utils.sanitize(item.title)}</div>
      <p class="rec-card-desc">${Utils.sanitize(item.desc)}</p>
      ${item.action ? `
        <button class="btn-ghost" style="margin-top:14px;font-size:0.82rem;" data-topic="${Utils.sanitize(item.action)}">
          Learn This →
        </button>
      ` : ''}
    `;

    // If it has an action button, allow starting a new topic
    const actionBtn = card.querySelector('[data-topic]');
    if (actionBtn) {
      actionBtn.addEventListener('click', () => {
        const topic = actionBtn.dataset.topic;
        // Fill topic input and start over
        const topicInput = document.getElementById('topic-input');
        if (topicInput) topicInput.value = topic;
        Dashboard?.navigateTo?.('topic');
      });
    }

    return card;
  }

  return { render };

})();

window.Recommendations = Recommendations;
