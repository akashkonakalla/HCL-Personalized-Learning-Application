/**
 * register.js — Register page interactions
 */
import {
  redirectIfLoggedIn, performRegister, setSession,
  validateEmail, validatePassword, getPasswordStrength,
  setFieldError, clearAllErrors,
} from './auth.js';
import { showToast } from './utils.js';

redirectIfLoggedIn();

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passInput = document.getElementById('password');
  const togglePass = document.getElementById('toggle-password');
  const submitBtn = document.getElementById('submit-btn');
  const strengthBars = document.querySelectorAll('.strength-bar');

  // Password toggle
  togglePass?.addEventListener('click', () => {
    const type = passInput.type === 'password' ? 'text' : 'password';
    passInput.type = type;
    togglePass.textContent = type === 'password' ? '👁' : '🙈';
  });

  // Password strength
  passInput?.addEventListener('input', () => {
    const score = getPasswordStrength(passInput.value);
    strengthBars.forEach((bar, i) => {
      bar.classList.remove('weak', 'medium', 'strong');
      if (i < score) {
        if (score <= 1) bar.classList.add('weak');
        else if (score <= 2) bar.classList.add('medium');
        else bar.classList.add('strong');
      }
    });
    passInput.closest('.form-group')?.classList.remove('error');
  });

  // Clear errors
  [nameInput, emailInput].forEach((inp) => {
    inp?.addEventListener('input', () => inp.closest('.form-group')?.classList.remove('error'));
  });

  // Submit
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passInput.value;
    let valid = true;

    if (!name || name.length < 2) {
      setFieldError(nameInput, document.getElementById('name-error'), 'Enter your full name.');
      valid = false;
    }
    if (!email || !validateEmail(email)) {
      setFieldError(emailInput, document.getElementById('email-error'), 'Enter a valid email address.');
      valid = false;
    }
    if (!password || !validatePassword(password)) {
      setFieldError(passInput, document.getElementById('pass-error'), 'Password must be at least 6 characters.');
      valid = false;
    }
    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating account…';

    try {
      const { user, token } = await performRegister(name, email, password);
      setSession(token, user);
      showToast(`Welcome to LearnAI, ${user.name}! 🚀`, 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Create Account →';
      showToast(err.message || 'Registration failed. Please try again.', 'error');
      setFieldError(emailInput, document.getElementById('email-error'), err.message);
    }
  });
});
