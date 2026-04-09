/**
 * api.js — Centralized API layer
 * All backend communication happens through this module.
 */

const API = (() => {

  const BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

  /**
   * Core fetch wrapper with auth header injection and error handling
   * @param {string} endpoint
   * @param {object} options
   * @returns {Promise<any>}
   */
  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    // Inject JWT token if available
    const token = Auth?.getToken?.();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized — redirect to login
      if (response.status === 401) {
        Auth?.logout?.();
        window.location.href = 'login.html';
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new APIError(data.detail || data.message || 'Something went wrong', response.status);
      }

      return data;
    } catch (err) {
      if (err instanceof APIError) throw err;
      // Network error
      throw new APIError('Unable to connect to server. Please check your connection.', 0);
    }
  }

  /**
   * Custom error class for API errors
   */
  class APIError extends Error {
    constructor(message, status) {
      super(message);
      this.name = 'APIError';
      this.status = status;
    }
  }

  // ─────────────────────────────────────────────
  // Auth Endpoints
  // ─────────────────────────────────────────────

  /**
   * Register a new user
   * @param {object} payload - { name, email, password }
   */
  async function register(payload) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Login user
   * @param {object} payload - { email, password }
   */
  async function login(payload) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // ─────────────────────────────────────────────
  // Learning Endpoints
  // ─────────────────────────────────────────────

  /**
   * Generate a quiz for a given topic
   * @param {string} topic
   */
  async function generateQuiz(topic) {
    return request('/learning/generate-quiz', {
      method: 'POST',
      body: JSON.stringify({ topic })
    });
  }

  /**
   * Submit quiz answers for evaluation
   * @param {object} payload - { topic, answers, questions }
   */
  async function submitQuiz(payload) {
    return request('/learning/submit-quiz', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Generate personalized learning content
   * @param {object} payload - { topic, level, score }
   */
  async function generateContent(payload) {
    return request('/learning/generate-content', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Get user's learning history
   */
  async function getHistory() {
    return request('/learning/history', {
      method: 'GET'
    });
  }

  /**
   * Send a message to the AI agent
   * @param {object} payload - { topic, level, message, history }
   */
  async function chatWithAgent(payload) {
    return request('/learning/agent-chat', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  return {
    APIError,
    register,
    login,
    generateQuiz,
    submitQuiz,
    generateContent,
    getHistory,
    chatWithAgent
  };

})();

window.API = API;
