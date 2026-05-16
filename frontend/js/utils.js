/**
 * utils.js — Global helper functions
 * Personalized Learning AI
 */

const Utils = (() => {

  // ─────────────────────────────────────────────
  // Date & Level helpers
  // ─────────────────────────────────────────────

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function getLevelClass(level) {
    return { Beginner: 'beginner', Intermediate: 'intermediate', Expert: 'expert' }[level] || 'beginner';
  }

  function getLevelEmoji(level) {
    return { Beginner: '<i class="ph ph-plant"></i>', Intermediate: '<i class="ph ph-lightning"></i>', Expert: '<i class="ph ph-trophy"></i>' }[level] || '<i class="ph ph-target"></i>';
  }

  function getLevelDescription(level, score) {
    const d = {
      Beginner:     `You scored ${score}/10. Everyone starts somewhere — your beginner materials will build a rock-solid foundation.`,
      Intermediate: `You scored ${score}/10. Solid knowledge! Your materials will deepen your understanding and close any gaps.`,
      Expert:       `You scored ${score}/10. Outstanding expertise! Your advanced materials cover nuance, edge cases, and architecture.`
    };
    return d[level] || `You scored ${score}/10.`;
  }

  // ─────────────────────────────────────────────
  // Sanitize
  // ─────────────────────────────────────────────

  function sanitize(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // ─────────────────────────────────────────────
  // Markdown renderer (enhanced)
  // ─────────────────────────────────────────────

  function renderMarkdown(text) {
    if (!text) return '';
    let html = String(text);

    // 1. Fenced code blocks  ```lang\n...\n```
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const langLabel = lang ? `<span class="code-lang-label">${sanitize(lang)}</span>` : '';
      const highlighted = highlightCode(code.trim(), lang);
      return `<div class="code-block-wrapper">${langLabel}<pre class="code-block"><code>${highlighted}</code></pre><button class="copy-btn" onclick="Utils.copyCode(this)" title="Copy">⎘ Copy</button></div>`;
    });

    // 2. Inline code `code`
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // 3. Headers
    html = html.replace(/^#### (.+)$/gm, '<h4 class="md-h4">$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');

    // 4. Bold + italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');

    // 5. Horizontal rule
    html = html.replace(/^---+$/gm, '<hr class="md-hr" />');

    // 6. Ordered lists (process before unordered so "1." isn't confused)
    html = html.replace(/((?:^\d+\. .+\n?)+)/gm, match => {
      const items = match.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
      return `<ol class="md-ol">${items}</ol>`;
    });

    // 7. Unordered lists
    html = html.replace(/((?:^[\-\*] .+\n?)+)/gm, match => {
      const items = match.trim().split('\n').map(l => `<li>${l.replace(/^[\-\*] /, '')}</li>`).join('');
      return `<ul class="md-ul">${items}</ul>`;
    });

    // 8. Blockquote
    html = html.replace(/^> (.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>');

    // 9. Links
    html = html.replace(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="md-link">$1 ↗</a>');

    // 10. Paragraphs — wrap double-newline separated text that isn't already in a block element
    const blockTags = /^<(h[1-6]|ul|ol|li|blockquote|pre|div|hr)/;
    const lines = html.split('\n\n');
    html = lines.map(block => {
      if (!block.trim()) return '';
      if (blockTags.test(block.trim())) return block;
      return `<p class="md-p">${block.trim()}</p>`;
    }).join('\n');

    return html;
  }

  /**
   * Very lightweight syntax highlighter — colours keywords/strings/comments
   * for the most common languages without any external dependency.
   */
  function highlightCode(code, lang) {
    // Sanitize first
    let s = sanitize(code);

    // Language-agnostic token groups
    const rules = [
      // Comments
      [/(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>'],
      // Strings
      [/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="hl-string">$1</span>'],
      // Python/JS/general keywords
      [/\b(def|class|return|import|from|if|else|elif|for|while|in|not|and|or|is|None|True|False|async|await|function|const|let|var|new|this|typeof|instanceof|export|default|try|catch|finally|raise|pass|with|yield|lambda|print|self)\b/g,
        '<span class="hl-keyword">$1</span>'],
      // Numbers
      [/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>'],
      // Function calls
      [/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="hl-fn">$1</span>'],
    ];

    rules.forEach(([pattern, replacement]) => {
      s = s.replace(pattern, replacement);
    });

    return s;
  }

  /** Copy code block to clipboard */
  function copyCode(btn) {
    const code = btn.closest('.code-block-wrapper')?.querySelector('code');
    if (!code) return;
    navigator.clipboard.writeText(code.innerText).then(() => {
      btn.textContent = '✓ Copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = '⎘ Copy'; btn.classList.remove('copied'); }, 2000);
    });
  }

  // ─────────────────────────────────────────────
  // Toast notifications
  // ─────────────────────────────────────────────

  let _toastContainer = null;

  function _getToastContainer() {
    if (_toastContainer) return _toastContainer;
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'toast-container';
    _toastContainer.style.cssText = `
      position:fixed; bottom:24px; right:24px; z-index:9999;
      display:flex; flex-direction:column; gap:10px; pointer-events:none;
    `;
    document.body.appendChild(_toastContainer);
    return _toastContainer;
  }

  /**
   * Show a toast notification
   * @param {string} message
   * @param {'success'|'error'|'info'|'warn'} type
   * @param {number} duration ms
   */
  function toast(message, type = 'info', duration = 3500) {
    const icons = { success: '✓', error: '✕', info: 'ℹ', warn: '⚠' };
    const colors = {
      success: 'rgba(52,211,153,0.15)',
      error:   'rgba(239,68,68,0.15)',
      info:    'rgba(99,102,241,0.15)',
      warn:    'rgba(251,191,36,0.15)'
    };
    const borders = {
      success: '#34D399', error: '#EF4444', info: '#6366F1', warn: '#FBBF24'
    };

    const el = document.createElement('div');
    el.style.cssText = `
      display:flex; align-items:center; gap:10px;
      padding:12px 18px;
      background:${colors[type]};
      border:1px solid ${borders[type]}40;
      border-left:3px solid ${borders[type]};
      border-radius:10px;
      font-size:0.9rem; font-weight:500;
      color:#E2E8F0;
      backdrop-filter:blur(20px);
      box-shadow:0 8px 32px rgba(0,0,0,0.4);
      pointer-events:all;
      transform:translateX(120%);
      transition:transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease;
      max-width:340px; word-break:break-word;
    `;
    el.innerHTML = `<span style="font-size:1rem;flex-shrink:0">${icons[type]}</span><span>${sanitize(message)}</span>`;
    _getToastContainer().appendChild(el);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { el.style.transform = 'translateX(0)'; });
    });

    // Animate out
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(120%)';
      setTimeout(() => el.remove(), 350);
    }, duration);
  }

  // ─────────────────────────────────────────────
  // Alert (inline form alerts)
  // ─────────────────────────────────────────────

  function showAlert(elementId, message, type = 'error') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `alert alert-${type}`;
    el.classList.remove('hidden');
    if (type === 'success') setTimeout(() => el.classList.add('hidden'), 4000);
  }

  function hideAlert(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.classList.add('hidden');
  }

  // ─────────────────────────────────────────────
  // Button loading state
  // ─────────────────────────────────────────────

  function setButtonLoading(btnId, spinnerId, isLoading) {
    const btn = document.getElementById(btnId);
    const spinner = document.getElementById(spinnerId);
    const text = btn?.querySelector('.btn-text');
    if (!btn) return;
    btn.disabled = isLoading;
    if (spinner) spinner.classList.toggle('hidden', !isLoading);
    if (text) text.style.opacity = isLoading ? '0.5' : '1';
  }

  // ─────────────────────────────────────────────
  // Skeleton loaders
  // ─────────────────────────────────────────────

  /**
   * Inject skeleton placeholder HTML into a container
   * @param {string|HTMLElement} target - element ID or DOM node
   * @param {'card'|'text'|'table'} type
   * @param {number} count
   */
  function showSkeleton(target, type = 'card', count = 3) {
    const el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return;

    const skeletons = {
      card: () => `
        <div class="skeleton-card" aria-hidden="true">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width:70%"></div>
        </div>`,
      text: () => `
        <div aria-hidden="true">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width:85%"></div>
          <div class="skeleton skeleton-text" style="width:60%"></div>
        </div>`,
      table: () => `
        <div class="skeleton-row" aria-hidden="true">
          <div class="skeleton skeleton-text" style="width:40%"></div>
          <div class="skeleton skeleton-text" style="width:20%"></div>
          <div class="skeleton skeleton-text" style="width:25%"></div>
        </div>`
    };

    const gen = skeletons[type] || skeletons.card;
    el.innerHTML = Array.from({ length: count }, gen).join('');
  }

  function clearSkeleton(target) {
    const el = typeof target === 'string' ? document.getElementById(target) : target;
    if (el) el.innerHTML = '';
  }

  // ─────────────────────────────────────────────
  // Misc utilities
  // ─────────────────────────────────────────────

  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function randomId() {
    return Math.random().toString(36).slice(2, 9);
  }

  function scrollTo(target) {
    const el = typeof target === 'string' ? document.getElementById(target) : target;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function downloadFile(filename, content, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function contentToMarkdown(topic, level, content) {
    const ts = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return `# ${topic} — Study Guide\n\n**Level:** ${level}  \n**Generated:** ${ts}\n\n---\n\n${content}`;
  }

  return {
    formatDate, getLevelClass, getLevelEmoji, getLevelDescription,
    sanitize, renderMarkdown, highlightCode, copyCode,
    toast, showAlert, hideAlert, setButtonLoading,
    showSkeleton, clearSkeleton,
    debounce, randomId, scrollTo, downloadFile, contentToMarkdown
  };

})();

// ── Inject shared styles for markdown + code blocks ──
(function injectMarkdownStyles() {
  if (document.getElementById('utils-md-styles')) return;
  const style = document.createElement('style');
  style.id = 'utils-md-styles';
  style.textContent = `
    /* Markdown typography */
    .md-h1,.md-h2 { font-family:var(--font-display,Poppins,sans-serif); font-weight:800; margin:28px 0 12px; line-height:1.25; background:linear-gradient(135deg,#6366F1,#38BDF8); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .md-h1 { font-size:1.9rem; }
    .md-h2 { font-size:1.45rem; }
    .md-h3 { font-family:var(--font-display,Poppins,sans-serif); font-size:1.15rem; font-weight:700; margin:22px 0 8px; color:#E2E8F0; }
    .md-h4 { font-size:1rem; font-weight:700; margin:16px 0 6px; color:#94A3B8; text-transform:uppercase; letter-spacing:0.05em; }
    .md-p  { color:#CBD5E1; line-height:1.8; margin:0 0 14px; }
    .md-ul,.md-ol { padding-left:22px; margin:8px 0 14px; color:#CBD5E1; }
    .md-ul li,.md-ol li { margin-bottom:6px; line-height:1.7; }
    .md-hr { border:none; border-top:1px solid rgba(255,255,255,0.08); margin:28px 0; }
    .md-blockquote { border-left:3px solid #6366F1; margin:16px 0; padding:10px 16px; background:rgba(99,102,241,0.06); border-radius:0 8px 8px 0; color:#94A3B8; font-style:italic; }
    .md-link { color:#6366F1; text-decoration:none; font-weight:500; }
    .md-link:hover { text-decoration:underline; color:#818CF8; }
    .inline-code { background:rgba(99,102,241,0.15); color:#A5B4FC; padding:2px 7px; border-radius:4px; font-family:monospace; font-size:0.88em; border:1px solid rgba(99,102,241,0.2); }

    /* Code blocks */
    .code-block-wrapper { position:relative; margin:18px 0; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); background:#0B1120; }
    .code-lang-label { display:block; padding:6px 16px; background:rgba(255,255,255,0.04); font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#64748B; border-bottom:1px solid rgba(255,255,255,0.06); }
    .code-block { margin:0; padding:20px; overflow-x:auto; font-family:'Fira Code',Consolas,monospace; font-size:0.875rem; line-height:1.7; color:#E2E8F0; }
    .copy-btn { position:absolute; top:32px; right:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#94A3B8; font-size:0.78rem; padding:4px 10px; cursor:pointer; transition:0.2s; }
    .copy-btn:hover { background:rgba(99,102,241,0.2); color:#E2E8F0; }
    .copy-btn.copied { color:#34D399; border-color:#34D399; }

    /* Syntax highlight */
    .hl-comment { color:#4B5563; font-style:italic; }
    .hl-string  { color:#34D399; }
    .hl-keyword { color:#818CF8; font-weight:600; }
    .hl-number  { color:#F59E0B; }
    .hl-fn      { color:#38BDF8; }

    /* Skeleton loaders */
    .skeleton { height:14px; border-radius:6px; background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation:skeleton-wave 1.6s infinite; margin-bottom:10px; }
    .skeleton-title { height:22px; width:55%; margin-bottom:14px; }
    .skeleton-text  { width:100%; }
    .skeleton-card  { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:14px; padding:22px; }
    .skeleton-row   { display:flex; gap:16px; margin-bottom:12px; }
    @keyframes skeleton-wave { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  `;
  document.head.appendChild(style);
})();

window.Utils = Utils;
