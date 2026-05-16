/**
 * content.js — Rich study material rendering for all 8 content sections
 * Personalized Learning AI
 */

const Content = (() => {

  let contentData = null;
  let currentTab = 'summary';

  // ─────────────────────────────────────────────
  // Public: init
  // ─────────────────────────────────────────────

  /**
   * Render study content into the dashboard content section.
   * @param {object} data  - Full content object from backend
   * @param {string} topic
   * @param {string} level
   */
  function render(data, topic, level) {
    contentData = data;
    currentTab = 'summary';

    const levelLabel = document.getElementById('content-level-label');
    const topicTitle = document.getElementById('content-topic-title');
    if (levelLabel) levelLabel.innerHTML = `${Utils.getLevelEmoji(level)} ${level}`;
    if (topicTitle) topicTitle.textContent = topic;

    // Reset tab states
    document.querySelectorAll('.content-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    const firstTab = document.querySelector('.content-tab[data-tab="summary"]');
    if (firstTab) { firstTab.classList.add('active'); firstTab.setAttribute('aria-selected', 'true'); }

    renderTab('summary');
    _bindTabClicks();
  }

  function _bindTabClicks() {
    // Clone to remove stale listeners
    document.querySelectorAll('.content-tab').forEach(tab => {
      const fresh = tab.cloneNode(true);
      tab.parentNode.replaceChild(fresh, tab);
    });
    document.querySelectorAll('.content-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.content-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        renderTab(tab.dataset.tab);
      });
    });
  }

  // ─────────────────────────────────────────────
  // Tab router
  // ─────────────────────────────────────────────

  function renderTab(tab) {
    currentTab = tab;
    const body = document.getElementById('content-body');
    if (!body || !contentData) return;

    body.style.opacity = '0';
    body.style.transform = 'translateY(8px)';

    setTimeout(() => {
      switch (tab) {
        case 'summary': body.innerHTML = renderSummary(contentData.summary); break;
        case 'concepts': body.innerHTML = renderConcepts(contentData.key_concepts); break;
        case 'details': body.innerHTML = renderDeepDive(contentData.deep_dive || contentData.details); break;
        case 'real_world': body.innerHTML = renderRichMarkdown(contentData.real_world_applications, '🌍', '#F59E0B'); break;
        case 'interview': body.innerHTML = renderInterview(contentData.viva_voice || contentData.interview_questions); break;
        case 'best_practices': body.innerHTML = renderBestPractices(contentData.best_practices); break;
        case 'roadmap': body.innerHTML = renderRoadmap(contentData.learning_roadmap); break;
        default: body.innerHTML = '<p class="md-p">Content not available.</p>';
      }
      body.style.opacity = '1';
      body.style.transform = 'translateY(0)';
      body.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      _initAccordions(body);
    }, 130);
  }

  // ─────────────────────────────────────────────
  // Section renderers
  // ─────────────────────────────────────────────

  /** 1 — Summary: full markdown + a quick-stats ribbon */
  function renderSummary(summary) {
    if (!summary) return _empty('Summary not available.');
    const level = contentData?.level || '';
    const emoji = Utils.getLevelEmoji(level);

    return `
      <div class="content-section-ribbon">
        <div class="ribbon-stat"><span>${emoji}</span><div><div class="rs-label">Level</div><div class="rs-val">${Utils.sanitize(level)}</div></div></div>
        <div class="ribbon-sep"></div>
        <div class="ribbon-stat"><span>🃏</span><div><div class="rs-label">Flashcards</div><div class="rs-val">${contentData?.flashcards?.length || 0}</div></div></div>
        <div class="ribbon-sep"></div>
        <div class="ribbon-stat"><span>🔑</span><div><div class="rs-label">Key Concepts</div><div class="rs-val">${Array.isArray(contentData?.key_concepts) ? contentData.key_concepts.length : '—'}</div></div></div>
        <div class="ribbon-sep"></div>
        <div class="ribbon-stat"><span>📖</span><div><div class="rs-label">Sections</div><div class="rs-val">7</div></div></div>
      </div>
      <div class="content-md-body">${Utils.renderMarkdown(summary)}</div>
    `;
  }

  /** 2 — Key Concepts: card grid with expandable definitions */
  function renderConcepts(concepts) {
    if (!concepts) return _empty('Key concepts not available.');
    if (typeof concepts === 'string') return `<div class="content-md-body">${Utils.renderMarkdown(concepts)}</div>`;

    if (Array.isArray(concepts) && concepts.length) {
      return `
        <div class="concepts-intro">
          <p class="md-p">Master these <strong>${concepts.length} core concepts</strong> to build a solid understanding of the topic.</p>
        </div>
        <div class="concepts-grid">
          ${concepts.map((c, i) => `
            <div class="concept-card" style="animation-delay:${i * 0.05}s">
              <div class="concept-num">${String(i + 1).padStart(2, '0')}</div>
              <div class="concept-body">
                <div class="concept-term">${Utils.sanitize(c.term || c.title || 'Concept')}</div>
                <div class="concept-def">${Utils.renderMarkdown(c.definition || c.description || '')}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `<div class="content-md-body">${Utils.renderMarkdown(String(concepts))}</div>`;
  }

  /** 3 — Deep Dive: collapsible accordion sections */
  function renderDeepDive(content) {
    if (!content) return _empty('Deep dive content not available.');

    // Try to split into accordion items by ## headings
    const sections = _splitBySections(content);
    if (sections.length > 1) {
      return `
        <div class="section-intro-bar">
          <span>🔬</span>
          <span>${sections.length} in-depth sections — click any to expand</span>
        </div>
        <div class="accordion">
          ${sections.map((s, i) => `
            <div class="accordion-item${i === 0 ? ' open' : ''}">
              <button class="accordion-header" aria-expanded="${i === 0}">
                <span class="accordion-title">${Utils.sanitize(s.title)}</span>
                <span class="accordion-icon" aria-hidden="true">▾</span>
              </button>
              <div class="accordion-body">${Utils.renderMarkdown(s.body)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `<div class="content-md-body">${Utils.renderMarkdown(content)}</div>`;
  }

  /** 4 — Real World: markdown with coloured accent bar */
  function renderRichMarkdown(content, icon = '📄', accent = '#6366F1') {
    if (!content) return _empty('This section is not available.');
    return `
      <div class="section-accent-bar" style="border-left-color:${accent}">
        <span class="sab-icon">${icon}</span>
        <div class="content-md-body" style="padding:0">${Utils.renderMarkdown(content)}</div>
      </div>
    `;
  }

  /** 5 — Viva Voice: tiered accordion by difficulty */
  function renderInterview(content) {
    if (!content) return _empty('Viva Voice questions not available.');

    // If content has ###-level tier headers, split into difficulty tiers
    const tiers = _splitBySections(content, '###');
    if (tiers.length > 1) {
      const tierColors = { 0: '#34D399', 1: '#F59E0B', 2: '#EF4444' };
      const tierIcons = ['🟢', '🟡', '🔴'];
      return `
        <div class="section-intro-bar">
          <span>🎙️</span>
          <span>Viva Voice questions grouped by difficulty — expand each tier</span>
        </div>
        <div class="interview-tiers">
          ${tiers.map((t, i) => `
            <div class="interview-tier" style="--tier-color:${tierColors[i] || '#6366F1'}">
              <div class="tier-header">
                <span>${tierIcons[i] || '⚪'}</span>
                <span class="tier-title">${Utils.sanitize(t.title)}</span>
              </div>
              <div class="tier-body content-md-body">${Utils.renderMarkdown(t.body)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `<div class="content-md-body">${Utils.renderMarkdown(content)}</div>`;
  }

  /** 6 — Best Practices: do/don't split layout */
  function renderBestPractices(content) {
    if (!content) return _empty('Best practices not available.');

    const sections = _splitBySections(content, '###');
    const doSection = sections.find(s => /do'?s?|recommend/i.test(s.title));
    const dontSection = sections.find(s => /don'?t|pitfall|mistake|avoid/i.test(s.title));
    const otherSections = sections.filter(s => s !== doSection && s !== dontSection);

    if (doSection || dontSection) {
      return `
        <div class="bp-split">
          ${doSection ? `
            <div class="bp-col bp-do">
              <div class="bp-col-header"><span>✅</span> ${Utils.sanitize(doSection.title)}</div>
              <div class="content-md-body">${Utils.renderMarkdown(doSection.body)}</div>
            </div>` : ''}
          ${dontSection ? `
            <div class="bp-col bp-dont">
              <div class="bp-col-header"><span>❌</span> ${Utils.sanitize(dontSection.title)}</div>
              <div class="content-md-body">${Utils.renderMarkdown(dontSection.body)}</div>
            </div>` : ''}
        </div>
        ${otherSections.map(s => `
          <div class="bp-extra">
            <h3 class="md-h3">${Utils.sanitize(s.title)}</h3>
            <div class="content-md-body">${Utils.renderMarkdown(s.body)}</div>
          </div>
        `).join('')}
      `;
    }

    return `<div class="content-md-body">${Utils.renderMarkdown(content)}</div>`;
  }



  /** 8 — Learning Roadmap: phase timeline */
  function renderRoadmap(content) {
    if (!content) return _empty('Learning roadmap not available.');

    const phases = _splitBySections(content, '###');
    if (phases.length > 1) {
      const phaseColors = ['#6366F1', '#38BDF8', '#34D399', '#F59E0B', '#F472B6'];
      return `
        <div class="roadmap-timeline">
          ${phases.map((p, i) => `
            <div class="roadmap-phase">
              <div class="phase-connector" style="--phase-color:${phaseColors[i % phaseColors.length]}">
                <div class="phase-dot"></div>
                ${i < phases.length - 1 ? '<div class="phase-line"></div>' : ''}
              </div>
              <div class="phase-content">
                <div class="phase-title" style="color:${phaseColors[i % phaseColors.length]}">${Utils.sanitize(p.title)}</div>
                <div class="content-md-body">${Utils.renderMarkdown(p.body)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `<div class="content-md-body">${Utils.renderMarkdown(content)}</div>`;
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  function _empty(msg) {
    return `<p style="color:var(--color-text-muted);font-style:italic;padding:20px 0;">${msg}</p>`;
  }

  /**
   * Split markdown into [{title, body}] by heading level
   * @param {string} content
   * @param {string} marker '##' | '###'
   */
  function _splitBySections(content, marker = '##') {
    const lines = content.split('\n');
    const pattern = new RegExp(`^${marker}\\s+(.+)$`);
    const sections = [];
    let current = null;

    lines.forEach(line => {
      const match = line.match(pattern);
      if (match) {
        if (current) sections.push(current);
        current = { title: match[1].trim(), body: '' };
      } else if (current) {
        current.body += line + '\n';
      }
    });

    if (current) sections.push(current);
    return sections.filter(s => s.body.trim());
  }

  /** Wire up accordion click handlers inside a container */
  function _initAccordions(container) {
    container.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const item = header.closest('.accordion-item');
        const isOpen = item.classList.contains('open');
        // Close all in same accordion
        item.closest('.accordion')?.querySelectorAll('.accordion-item').forEach(i => {
          i.classList.remove('open');
          i.querySelector('.accordion-header')?.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('open');
          header.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  // ─────────────────────────────────────────────
  // Export helpers
  // ─────────────────────────────────────────────

  function exportMarkdown(topic, level) {
    if (!contentData) return;
    Utils.downloadFile(
      `${topic.replace(/\s+/g, '_')}_study_guide.md`,
      _buildMarkdownExport(topic, level),
      'text/markdown'
    );
    Utils.toast('Markdown file downloaded!', 'success');
  }

  function exportPDF(topic, level) {
    if (!contentData) return;
    const html = _buildHTMLExport(topic, level);
    const win = window.open('', '_blank');
    if (!win) { Utils.toast('Please allow popups to export PDF.', 'warn'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
    Utils.toast('Print dialog opened for PDF export.', 'info');
  }

  function exportDOCX(topic, level) {
    if (!contentData) return;
    Utils.downloadFile(
      `${topic.replace(/\s+/g, '_')}_study_guide.html`,
      _buildHTMLExport(topic, level),
      'text/html'
    );
    Utils.toast('HTML study guide downloaded!', 'success');
  }

  function _buildMarkdownExport(topic, level) {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const kc = Array.isArray(contentData.key_concepts)
      ? contentData.key_concepts.map(c => `### ${c.term || c.title}\n\n${c.definition || c.description}`).join('\n\n')
      : (contentData.key_concepts || '');

    return [
      `# ${topic} — Complete Study Guide`,
      `**Level:** ${level} | **Generated:** ${date} | **By:** Personalized Learning AI`,
      `---`,
      `## Summary`, contentData.summary || '',
      `## Key Concepts`, kc,
      `## Deep Dive`, contentData.deep_dive || '',
      `## Real-World Applications`, contentData.real_world_applications || '',
      `## Viva Voice`, contentData.viva_voice || contentData.interview_questions || '',
      `## Best Practices`, contentData.best_practices || '',
      `## Learning Roadmap`, contentData.learning_roadmap || '',
    ].join('\n\n');
  }

  function _buildHTMLExport(topic, level) {
    const md = _buildMarkdownExport(topic, level);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${topic} — Study Guide</title>
  <style>
    body { font-family:Georgia,serif; max-width:820px; margin:48px auto; padding:0 28px; line-height:1.8; color:#1E293B; }
    h1 { font-size:2.2rem; border-bottom:3px solid #6366F1; padding-bottom:14px; color:#0F172A; }
    h2 { font-size:1.5rem; color:#312E81; margin-top:40px; }
    h3 { font-size:1.15rem; color:#4338CA; }
    h4 { font-size:1rem; text-transform:uppercase; letter-spacing:0.05em; color:#6366F1; }
    p  { margin:12px 0; }
    strong { color:#0F172A; }
    code   { background:#EEF2FF; color:#4338CA; padding:2px 6px; border-radius:4px; font-family:monospace; }
    pre    { background:#1E293B; color:#E2E8F0; padding:20px; border-radius:10px; overflow-x:auto; }
    pre code { background:none; color:inherit; padding:0; }
    ul, ol { padding-left:22px; }
    li { margin-bottom:5px; }
    blockquote { border-left:4px solid #6366F1; margin:16px 0; padding:10px 18px; background:#EEF2FF; color:#312E81; }
    hr { border:none; border-top:1px solid #E2E8F0; margin:32px 0; }
    .meta { color:#64748B; font-size:0.9rem; margin-bottom:32px; }
    a { color:#6366F1; }
  </style>
</head>
<body>
  ${Utils.renderMarkdown(md)}
</body>
</html>`;
  }

  function getData() { return contentData; }

  return { render, renderTab, exportMarkdown, exportPDF, exportDOCX, getData };

})();

// ── Inject content-section component styles ──
(function injectContentStyles() {
  if (document.getElementById('content-section-styles')) return;
  const s = document.createElement('style');
  s.id = 'content-section-styles';
  s.textContent = `
    /* Ribbon stats */
    .content-section-ribbon { 
      display: flex; align-items: center; gap: 0; 
      background: linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
      border: 1px solid rgba(255,255,255,0.08); 
      border-top: 1px solid rgba(255,255,255,0.12);
      border-radius: var(--radius-xl); 
      padding: 12px; 
      margin-bottom: 36px; 
      flex-wrap: wrap; 
      backdrop-filter: blur(20px);
      box-shadow: var(--shadow-card);
    }
    .ribbon-stat { display: flex; align-items: center; gap: 16px; padding: 12px 24px; flex: 1; min-width: max-content; }
    .ribbon-stat span { font-size: 1.8rem; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2)); }
    .rs-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-text-muted); margin-bottom: 4px; }
    .rs-val   { font-size: 1.25rem; font-weight: 800; font-family: var(--font-display, Poppins, sans-serif); color: var(--color-text); }
    .ribbon-sep { width: 1px; height: 48px; background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent); }

    /* Key concepts grid */
    .concepts-intro { margin-bottom: 24px; font-size: 1.1rem; color: var(--color-text-muted); }
    .concepts-grid  { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .concept-card   { 
      display: flex; gap: 20px; align-items: flex-start; 
      background: rgba(255,255,255,0.02); 
      border: 1px solid rgba(255,255,255,0.06); 
      border-radius: var(--radius-lg); 
      padding: 24px; 
      transition: var(--transition); 
      animation: fadeSlideUp 0.4s ease both; 
      backdrop-filter: blur(10px);
    }
    .concept-card:hover { 
      border-color: rgba(99,102,241,0.4); 
      background: rgba(255,255,255,0.035); 
      transform: translateY(-4px); 
      box-shadow: var(--shadow-card);
    }
    @keyframes fadeSlideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
    .concept-num    { 
      font-family: var(--font-display, Poppins, sans-serif); 
      font-size: 1.8rem; font-weight: 800; 
      color: transparent; 
      -webkit-text-stroke: 1px rgba(99,102,241,0.5);
      flex-shrink: 0; line-height: 1; 
    }
    .concept-term   { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; color: var(--color-text); margin-bottom: 8px; }
    .concept-def    { font-size: 0.95rem; color: var(--color-text-muted); line-height: 1.6; }
    .concept-def p  { margin: 0; color: inherit; }

    /* Accordion */
    .section-intro-bar { 
      display: flex; align-items: center; gap: 12px; 
      font-size: 0.95rem; font-weight: 600; color: var(--color-text-muted); 
      margin-bottom: 24px; padding: 16px 24px;
      background: rgba(99,102,241,0.05); border: 1px solid rgba(99,102,241,0.1); border-radius: var(--radius-md);
    }
    .accordion { display: flex; flex-direction: column; gap: 12px; }
    .accordion-item { 
      background: rgba(255,255,255,0.02); 
      border: 1px solid rgba(255,255,255,0.08); 
      border-radius: var(--radius-lg); 
      overflow: hidden; transition: var(--transition); 
      backdrop-filter: blur(10px);
    }
    .accordion-item:hover { border-color: rgba(255,255,255,0.15); }
    .accordion-item.open { border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.02); box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .accordion-header { 
      width: 100%; display: flex; align-items: center; justify-content: space-between; 
      padding: 20px 24px; background: none; border: none; 
      color: var(--color-text); font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; 
      cursor: pointer; text-align: left; transition: var(--transition);
    }
    .accordion-header:hover { background: rgba(255,255,255,0.03); }
    .accordion-icon { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: var(--color-primary-light); font-size: 1.4rem; }
    .accordion-item.open .accordion-icon { transform: rotate(180deg); }
    .accordion-body { display: none; padding: 0 24px 24px; color: var(--color-text-muted); }
    .accordion-item.open .accordion-body { display: block; animation: fadeSlideUp 0.3s ease; }

    /* Section accent bar */
    .section-accent-bar { 
      display: flex; gap: 20px;
      background: linear-gradient(90deg, rgba(245,158,11,0.05) 0%, transparent 100%);
      border-left: 4px solid #F59E0B; 
      border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
      padding: 32px; margin-bottom: 24px;
    }
    .sab-icon { font-size: 2.5rem; flex-shrink: 0; filter: drop-shadow(0 4px 12px rgba(245,158,11,0.3)); }

    /* Interview tiers */
    .interview-tiers { display: flex; flex-direction: column; gap: 24px; }
    .interview-tier  { 
      border-radius: var(--radius-lg); 
      border: 1px solid rgba(255,255,255,0.08); 
      overflow: hidden; 
      background: rgba(255,255,255,0.01);
      box-shadow: inset 0 0 0 1px var(--tier-color, #6366F1), 0 4px 20px rgba(0,0,0,0.1);
    }
    .tier-header { 
      display: flex; align-items: center; gap: 12px; 
      padding: 16px 24px; 
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%); 
      font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; color: var(--color-text); 
      border-bottom: 1px solid rgba(255,255,255,0.05); 
    }
    .tier-body   { padding: 24px; }

    /* Best Practices split */
    .bp-split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    @media(max-width:768px) { .bp-split { grid-template-columns: 1fr; } }
    .bp-col  { border-radius: var(--radius-lg); padding: 32px; position: relative; overflow: hidden; }
    .bp-do   { background: linear-gradient(145deg, rgba(52,211,153,0.08) 0%, rgba(52,211,153,0.02) 100%); border: 1px solid rgba(52,211,153,0.2); box-shadow: 0 4px 24px rgba(52,211,153,0.05); }
    .bp-dont { background: linear-gradient(145deg, rgba(248,113,113,0.08) 0%, rgba(248,113,113,0.02) 100%); border: 1px solid rgba(248,113,113,0.2); box-shadow: 0 4px 24px rgba(248,113,113,0.05); }
    .bp-col-header { 
      display: flex; align-items: center; gap: 12px; 
      font-family: var(--font-display); font-weight: 800; font-size: 1.2rem; 
      margin-bottom: 20px; color: var(--color-text); 
    }
    .bp-col-header span { font-size: 1.5rem; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2)); }
    .bp-extra { margin-top: 24px; padding: 32px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-lg); backdrop-filter: blur(10px); }

    /* Roadmap timeline */
    .roadmap-timeline { display: flex; flex-direction: column; gap: 0; padding: 12px 0; }
    .roadmap-phase    { display: flex; gap: 28px; position: relative; }
    .phase-connector  { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 24px; }
    .phase-dot        { 
      width: 18px; height: 18px; border-radius: 50%; 
      background: var(--phase-color,#6366F1); flex-shrink: 0; margin-top: 6px; 
      box-shadow: 0 0 16px var(--phase-color,#6366F1);
      border: 3px solid rgba(15, 23, 42, 0.8);
      position: relative; z-index: 2;
    }
    .phase-line       { 
      width: 2px; 
      background: linear-gradient(to bottom, var(--phase-color,#6366F1), rgba(255,255,255,0.1)); 
      flex: 1; margin: 4px 0; border-radius: 2px;
    }
    .phase-content    { padding-bottom: 40px; flex: 1; }
    .phase-title      { font-family: var(--font-display); font-weight: 800; font-size: 1.25rem; margin-bottom: 12px; letter-spacing: -0.01em; }

    /* Shared content md body */
    .content-md-body { line-height: 1.8; color: var(--color-text-muted); font-size: 1.05rem; }
    .content-md-body h3 { font-family: var(--font-display); font-size: 1.3rem; font-weight: 700; color: var(--color-text); margin: 24px 0 12px; }
    .content-md-body h4 { font-size: 1.1rem; font-weight: 600; color: var(--color-text); margin: 20px 0 10px; }
    .content-md-body p { margin-bottom: 16px; }
    .content-md-body ul, .content-md-body ol { margin-bottom: 16px; padding-left: 24px; }
    .content-md-body li { margin-bottom: 8px; }
    .content-md-body strong { color: var(--color-text); font-weight: 600; }
    .content-md-body pre { background: rgba(0,0,0,0.3); padding: 20px; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.08); overflow-x: auto; margin-bottom: 20px; }
    .content-md-body code { font-family: monospace; font-size: 0.9rem; color: var(--color-primary-light); background: rgba(99,102,241,0.1); padding: 2px 6px; border-radius: 4px; }
    .content-md-body pre code { background: none; padding: 0; color: #E2E8F0; }
    .content-md-body blockquote { border-left: 4px solid var(--color-primary); padding: 12px 20px; background: rgba(99,102,241,0.05); margin: 20px 0; border-radius: 0 8px 8px 0; font-style: italic; }
  `;
  document.head.appendChild(s);
})();

window.Content = Content;
