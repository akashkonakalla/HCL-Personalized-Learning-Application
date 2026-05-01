/**
 * content.js — Study material rendering
 */

const Content = (() => {

  let contentData = null; // { summary, key_concepts, details, flashcards, recommendations }
  let currentTab = 'summary';

  /**
   * Render study content into the dashboard
   * @param {object} data - Content response from backend
   * @param {string} topic
   * @param {string} level
   */
  function render(data, topic, level) {
    contentData = data;
    currentTab = 'summary';

    // Update section headers
    const levelLabel = document.getElementById('content-level-label');
    const topicTitle = document.getElementById('content-topic-title');
    if (levelLabel) levelLabel.textContent = `${Utils.getLevelEmoji(level)} ${level}`;
    if (topicTitle) topicTitle.textContent = topic;

    // Show summary by default
    renderTab('summary');

    // Wire up tab buttons
    document.querySelectorAll('.content-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderTab(tab.dataset.tab);
      });
    });
  }

  /**
   * Render a specific content tab
   * @param {string} tab - 'summary' | 'concepts' | 'details'
   */
  function renderTab(tab) {
    currentTab = tab;
    const body = document.getElementById('content-body');
    if (!body || !contentData) return;

    body.style.opacity = '0';

    setTimeout(() => {
      switch (tab) {
        case 'summary':
          body.innerHTML = renderSummary(contentData.summary);
          break;
        case 'concepts':
          body.innerHTML = renderConcepts(contentData.key_concepts);
          break;
        case 'details':
          body.innerHTML = renderDetails(contentData.details);
          break;
        default:
          body.innerHTML = '<p>Content not available.</p>';
      }
      body.style.opacity = '1';
      body.style.transition = 'opacity 0.25s ease';
    }, 120);
  }

  function renderSummary(summary) {
    if (!summary) return '<p>Summary not available.</p>';
    return Utils.renderMarkdown(summary);
  }

  function renderConcepts(concepts) {
    if (!concepts) return '<p>Key concepts not available.</p>';
    if (typeof concepts === 'string') return Utils.renderMarkdown(concepts);

    // If structured array
    if (Array.isArray(concepts)) {
      return `
        <div style="display:flex;flex-direction:column;gap:16px;">
          ${concepts.map(c => `
            <div style="padding:18px;background:rgba(255,255,255,0.03);border:1px solid var(--color-border);border-radius:var(--radius-md);">
              <h3 style="margin-bottom:8px;font-size:1rem;">${Utils.sanitize(c.term || c.title || '')}</h3>
              <p style="margin:0;">${Utils.sanitize(c.definition || c.description || '')}</p>
            </div>
          `).join('')}
        </div>
      `;
    }

    return Utils.renderMarkdown(String(concepts));
  }

  function renderDetails(details) {
    if (!details) return '<p>Detailed explanation not available.</p>';
    return Utils.renderMarkdown(details);
  }

  /**
   * Export content as Markdown
   * @param {string} topic
   * @param {string} level
   */
  function exportMarkdown(topic, level) {
    if (!contentData) return;
    const md = buildMarkdownExport(topic, level);
    Utils.downloadFile(
      `${topic.replace(/\s+/g, '_')}_study_guide.md`,
      md,
      'text/markdown'
    );
  }

  /**
   * Export content as PDF (via print dialog)
   * @param {string} topic
   * @param {string} level
   */
  function exportPDF(topic, level) {
    if (!contentData) return;
    const md = buildMarkdownExport(topic, level);
    const html = buildHTMLExport(topic, level, md);
    openPrintWindow(html, `${topic} — Study Guide`);
  }

  /**
   * Export content as DOCX-like HTML
   * @param {string} topic
   * @param {string} level
   */
  function exportDOCX(topic, level) {
    if (!contentData) return;
    const md = buildMarkdownExport(topic, level);
    const html = buildHTMLExport(topic, level, md);
    Utils.downloadFile(
      `${topic.replace(/\s+/g, '_')}_study_guide.html`,
      html,
      'text/html'
    );
  }

  function buildMarkdownExport(topic, level) {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const sections = [
      `# ${topic} — Study Guide`,
      `**Level:** ${level} | **Generated:** ${date}`,
      `---`,
      `## Summary`,
      contentData.summary || '',
      `## Key Concepts`,
      typeof contentData.key_concepts === 'string'
        ? contentData.key_concepts
        : Array.isArray(contentData.key_concepts)
          ? contentData.key_concepts.map(c => `**${c.term || c.title}**: ${c.definition || c.description}`).join('\n\n')
          : '',
      `## Detailed Explanation`,
      contentData.details || '',
    ];

    if (contentData.flashcards?.length) {
      sections.push('## Flashcards');
      contentData.flashcards.forEach((fc, i) => {
        sections.push(`**Q${i + 1}:** ${fc.question}\n**A:** ${fc.answer}`);
      });
    }

    return sections.join('\n\n');
  }

  function buildHTMLExport(topic, level, markdownContent) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${topic} — Study Guide</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 24px; line-height: 1.7; color: #222; }
    h1 { font-size: 2rem; border-bottom: 2px solid #7c5cfc; padding-bottom: 12px; color: #1a1a2e; }
    h2 { font-size: 1.35rem; color: #3d2b8a; margin-top: 32px; }
    h3 { font-size: 1.1rem; color: #555; }
    p { margin: 12px 0; }
    strong { color: #1a1a2e; }
    .meta { color: #888; font-size: 0.9rem; margin-bottom: 32px; }
    hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    .fc-item { background: #f9f7ff; border-left: 4px solid #7c5cfc; padding: 12px 16px; margin: 12px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${topic}</h1>
  <div class="meta">Level: <strong>${level}</strong> · Generated by Personalized Learning AI · ${new Date().toLocaleDateString()}</div>
  ${Utils.renderMarkdown(markdownContent)}
</body>
</html>`;
  }

  function openPrintWindow(html, title) {
    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow popups to export PDF.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }

  /**
   * Get content data (used by other modules)
   * @returns {object|null}
   */
  function getData() {
    return contentData;
  }

  return {
    render,
    renderTab,
    exportMarkdown,
    exportPDF,
    exportDOCX,
    getData
  };

})();

window.Content = Content;
