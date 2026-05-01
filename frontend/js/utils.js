/**
 * utils.js — Global helper functions
 * HCL Personalized Learning AI — Personalized Learning Assistant
 */

const Utils = (() => {

  /**
   * Format a date string to a readable format
   * @param {string} dateStr - ISO date string
   * @returns {string}
   */
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  /**
   * Get level CSS class
   * @param {string} level - 'Beginner' | 'Intermediate' | 'Expert'
   * @returns {string}
   */
  function getLevelClass(level) {
    const map = {
      'Beginner': 'beginner',
      'Intermediate': 'intermediate',
      'Expert': 'expert'
    };
    return map[level] || 'beginner';
  }

  /**
   * Get level emoji
   * @param {string} level
   * @returns {string}
   */
  function getLevelEmoji(level) {
    const map = {
      'Beginner': '🌱',
      'Intermediate': '⚡',
      'Expert': '🏆'
    };
    return map[level] || '🎯';
  }

  /**
   * Get level description
   * @param {string} level
   * @param {number} score
   * @returns {string}
   */
  function getLevelDescription(level, score) {
    const descriptions = {
      'Beginner': `You scored ${score}/10. No worries — everyone starts somewhere! Your personalized beginner materials will build a strong foundation.`,
      'Intermediate': `You scored ${score}/10. Great knowledge base! Your materials will deepen your understanding and fill in the gaps.`,
      'Expert': `You scored ${score}/10. Impressive expertise! Your advanced materials will push the boundaries of your knowledge.`
    };
    return descriptions[level] || `You scored ${score}/10.`;
  }

  /**
   * Sanitize HTML to prevent XSS
   * @param {string} str
   * @returns {string}
   */
  function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Convert markdown-like text to basic HTML
   * @param {string} text
   * @returns {string}
   */
  function renderMarkdown(text) {
    if (!text) return '';
    return text
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Unordered lists
      .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>')
      // Numbered lists
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Paragraphs (double newlines)
      .replace(/\n\n(?!<)/g, '</p><p>')
      // Wrap if not already wrapped
      .replace(/^(?!<)/, '<p>')
      .replace(/(?!>)$/, '</p>');
  }

  /**
   * Show an alert element with message and type
   * @param {string} elementId - ID of the alert element
   * @param {string} message
   * @param {string} type - 'error' | 'success'
   */
  function showAlert(elementId, message, type = 'error') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `alert alert-${type}`;
    el.classList.remove('hidden');
    // Auto-hide success alerts
    if (type === 'success') {
      setTimeout(() => el.classList.add('hidden'), 4000);
    }
  }

  /**
   * Hide an alert element
   * @param {string} elementId
   */
  function hideAlert(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.classList.add('hidden');
  }

  /**
   * Toggle loading state on a button
   * @param {string} btnId
   * @param {string} spinnerId
   * @param {boolean} isLoading
   */
  function setButtonLoading(btnId, spinnerId, isLoading) {
    const btn = document.getElementById(btnId);
    const spinner = document.getElementById(spinnerId);
    const text = btn?.querySelector('.btn-text');
    if (!btn) return;
    btn.disabled = isLoading;
    if (spinner) spinner.classList.toggle('hidden', !isLoading);
    if (text) text.style.opacity = isLoading ? '0.5' : '1';
  }

  /**
   * Debounce function
   * @param {Function} fn
   * @param {number} delay
   * @returns {Function}
   */
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /**
   * Generate a random ID
   * @returns {string}
   */
  function randomId() {
    return Math.random().toString(36).slice(2, 9);
  }

  /**
   * Scroll element into view smoothly
   * @param {string|HTMLElement} target
   */
  function scrollTo(target) {
    const el = typeof target === 'string' ? document.getElementById(target) : target;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Download a file with given content
   * @param {string} filename
   * @param {string} content
   * @param {string} mimeType
   */
  function downloadFile(filename, content, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Convert text content to DOCX-like HTML for download
   * (simplified client-side DOCX substitute)
   */
  function contentToMarkdown(topic, level, content) {
    const timestamp = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return `# ${topic} — Study Guide\n\n**Level:** ${level}  \n**Generated:** ${timestamp}\n\n---\n\n${content}`;
  }

  return {
    formatDate,
    getLevelClass,
    getLevelEmoji,
    getLevelDescription,
    sanitize,
    renderMarkdown,
    showAlert,
    hideAlert,
    setButtonLoading,
    debounce,
    randomId,
    scrollTo,
    downloadFile,
    contentToMarkdown
  };

})();

// Expose globally
window.Utils = Utils;
