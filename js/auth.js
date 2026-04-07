/**
 * auth.js — Authentication logic for LearnAI
 */

/* ── Token / User helpers ───────────────────────────────────── */
export function getToken() {
  return localStorage.getItem('learnai_token');
}
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('learnai_user') || 'null');
  } catch {
    return null;
  }
}
export function setSession(token, user) {
  localStorage.setItem('learnai_token', token);
  localStorage.setItem('learnai_user', JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem('learnai_token');
  localStorage.removeItem('learnai_user');
}
export function isLoggedIn() {
  return !!getToken();
}

/* ── Guard helpers ──────────────────────────────────────────── */
export function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}
export function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = 'dashboard.html';
  }
}

/* ── Validation ──────────────────────────────────────────────── */
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function validatePassword(pw) {
  return pw.length >= 6;
}
export function getPasswordStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-4
}

/* ── Form utilities ──────────────────────────────────────────── */
export function setFieldError(inputEl, errorEl, msg) {
  inputEl.closest('.form-group')?.classList.add('error');
  if (errorEl) errorEl.textContent = msg;
}
export function clearFieldError(inputEl) {
  inputEl.closest('.form-group')?.classList.remove('error');
}
export function clearAllErrors(form) {
  form.querySelectorAll('.form-group.error').forEach((g) => g.classList.remove('error'));
}

/* ── Login flow (mock) ───────────────────────────────────────── */
export async function performLogin(email, password) {
  // Mock: accept any valid-format credentials
  await new Promise((r) => setTimeout(r, 1200));

  // Simulate wrong password
  if (password === 'wrong') throw new Error('Invalid email or password.');

  const user = {
    id: 'u_' + Date.now(),
    name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
    email,
    avatar: email.charAt(0).toUpperCase(),
    joinedAt: new Date().toISOString(),
  };
  const token = 'mock_token_' + btoa(email + ':' + Date.now());
  return { user, token };
}

/* ── Register flow (mock) ────────────────────────────────────── */
export async function performRegister(name, email, password) {
  await new Promise((r) => setTimeout(r, 1400));

  if (email === 'taken@example.com') throw new Error('This email is already registered.');

  const user = {
    id: 'u_' + Date.now(),
    name,
    email,
    avatar: name.charAt(0).toUpperCase(),
    joinedAt: new Date().toISOString(),
  };
  const token = 'mock_token_' + btoa(email + ':' + Date.now());
  return { user, token };
}

/* ── Logout ──────────────────────────────────────────────────── */
export function logout() {
  clearSession();
  window.location.href = 'index.html';
}
