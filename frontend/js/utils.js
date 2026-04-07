/**
 * utils.js — Shared UI utilities for LearnAI
 */

/* ── Toast notifications ─────────────────────────────────────── */
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ── Set loading state on a button ──────────────────────────── */
export function setLoading(btn, loading, label = '') {
  if (loading) {
    btn._originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>${label}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn._originalHTML || label;
  }
}

/* ── Debounce ────────────────────────────────────────────────── */
export function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

/* ── Format date ─────────────────────────────────────────────── */
export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Scroll animation observer ───────────────────────────────── */
export function observeFadeIn(selector = '[data-animate]') {
  const els = document.querySelectorAll(selector);
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.style.animationDelay = e.target.dataset.delay || '0s';
        e.target.classList.add('page-enter');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach((el) => io.observe(el));
}

/* Make showToast globally accessible */
window.showToast = showToast;
