/**
 * auth.js — Authentication logic + JWT handling
 * Handles both dashboard auth guard and login/register form logic
 */

const Auth = (() => {

  const TOKEN_KEY = 'learnai_token';
  const USER_KEY  = 'learnai_user';

  // ─── Token Management ───

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = 'index.html';
  }

  // ─── Auth Guard ───
  // Call this on protected pages to redirect if not logged in
  // TEMPORARY: For development, we can bypass auth and go straight to quiz step with a preset topic
  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }
   
//   function requireAuth() {
//   return true; // TEMP BYPASS
// }


  // ─── Redirect Logged-in Users ───
  // Call on login/register pages

  function redirectIfLoggedIn() {
    if (isLoggedIn()) {
      window.location.href = 'dashboard.html';
    }
  }

  // ─── Validation ───

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function validatePassword(password) {
    return password.length >= 8;
  }

  // ─── Login Form ───

  function initLoginForm() {
    redirectIfLoggedIn();

    const form = document.getElementById('login-form');
    if (!form) return;

    // Toggle password visibility
    document.getElementById('toggle-pw')?.addEventListener('click', () => {
      const pw = document.getElementById('password');
      pw.type = pw.type === 'password' ? 'text' : 'password';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();

      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      // Client-side validation
      let valid = true;

      if (!email || !validateEmail(email)) {
        showFieldError('email-error', 'Please enter a valid email address.');
        document.getElementById('email').classList.add('is-invalid');
        valid = false;
      }

      if (!password) {
        showFieldError('password-error', 'Password is required.');
        document.getElementById('password').classList.add('is-invalid');
        valid = false;
      }

      if (!valid) return;

      // Submit
      Utils.setButtonLoading('login-btn', 'login-spinner', true);
      Utils.hideAlert('alert-box');

      try {
        const data = await API.login({ email, password });
        setToken(data.access_token);
        setUser(data.user);
        window.location.href = 'dashboard.html';
      } catch (err) {
        Utils.showAlert('alert-box', err.message || 'Login failed. Please try again.', 'error');
      } finally {
        Utils.setButtonLoading('login-btn', 'login-spinner', false);
      }
    });
  }

  // ─── Register Form ───

  function initRegisterForm() {
    redirectIfLoggedIn();

    const form = document.getElementById('register-form');
    if (!form) return;

    document.getElementById('toggle-pw')?.addEventListener('click', () => {
      const pw = document.getElementById('password');
      pw.type = pw.type === 'password' ? 'text' : 'password';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();

      const name            = document.getElementById('name').value.trim();
      const email           = document.getElementById('email').value.trim();
      const password        = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      let valid = true;

      if (!name || name.length < 2) {
        showFieldError('name-error', 'Please enter your full name (at least 2 characters).');
        document.getElementById('name').classList.add('is-invalid');
        valid = false;
      }

      if (!email || !validateEmail(email)) {
        showFieldError('email-error', 'Please enter a valid email address.');
        document.getElementById('email').classList.add('is-invalid');
        valid = false;
      }

      if (!validatePassword(password)) {
        showFieldError('password-error', 'Password must be at least 8 characters.');
        document.getElementById('password').classList.add('is-invalid');
        valid = false;
      }

      if (password !== confirmPassword) {
        showFieldError('confirm-password-error', 'Passwords do not match.');
        document.getElementById('confirm-password').classList.add('is-invalid');
        valid = false;
      }

      if (!valid) return;

      Utils.setButtonLoading('register-btn', 'register-spinner', true);
      Utils.hideAlert('alert-box');

      try {
        await API.register({ name, email, password });
        Utils.showAlert('alert-box', 'Account created! Redirecting to login...', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
      } catch (err) {
        Utils.showAlert('alert-box', err.message || 'Registration failed. Please try again.', 'error');
      } finally {
        Utils.setButtonLoading('register-btn', 'register-spinner', false);
      }
    });
  }

  // ─── Helpers ───

  function showFieldError(id, message) {
    const el = document.getElementById(id);
    if (el) el.textContent = message;
  }

  function clearErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }

  // ─── Auto-init based on page ───

  function init() {
    const page = window.location.pathname.split('/').pop();

    if (page === 'login.html' || page === '') {
      initLoginForm();
    } else if (page === 'register.html') {
      initRegisterForm();
    } else if (page === 'dashboard.html') {
      requireAuth();
    }
  }

  // Run on DOM ready
  document.addEventListener('DOMContentLoaded', init);

  return {
    getToken,
    setToken,
    getUser,
    setUser,
    isLoggedIn,
    logout,
    requireAuth,
    redirectIfLoggedIn
  };

})();

window.Auth = Auth;
