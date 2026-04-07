/**
 * login.js — Login page interactions
 */
import {
  redirectIfLoggedIn, performLogin, setSession,
  validateEmail, setFieldError, clearAllErrors,
} from './auth.js';
import { showToast } from './utils.js';

redirectIfLoggedIn();

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passInput = document.getElementById('password');
  const togglePass = document.getElementById('toggle-password');
  const submitBtn = document.getElementById('submit-btn');

  // Password toggle
  togglePass?.addEventListener('click', () => {
    const type = passInput.type === 'password' ? 'text' : 'password';
    passInput.type = type;
    togglePass.textContent = type === 'password' ? '👁' : '🙈';
  });

  // Clear errors on input
  emailInput?.addEventListener('input', () => {
    emailInput.closest('.form-group')?.classList.remove('error');
  });
  passInput?.addEventListener('input', () => {
    passInput.closest('.form-group')?.classList.remove('error');
  });

  // Submit
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const email = emailInput.value.trim();
    const password = passInput.value;
    let valid = true;

    if (!email || !validateEmail(email)) {
      setFieldError(emailInput, document.getElementById('email-error'), 'Enter a valid email address.');
      valid = false;
    }
    if (!password || password.length < 6) {
      setFieldError(passInput, document.getElementById('pass-error'), 'Password must be at least 6 characters.');
      valid = false;
    }
    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Signing in…';

    try {
      const { user, token } = await performLogin(email, password);
      setSession(token, user);
      showToast(`Welcome back, ${user.name}! 🎉`, 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Sign In →';
      showToast(err.message || 'Login failed. Please try again.', 'error');
      setFieldError(emailInput, document.getElementById('email-error'), err.message);
    }
  });
});
