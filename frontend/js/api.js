/**
 * api.js — LearnAI API Client
 * All backend interactions go through this module.
 */

const API_BASE = 'https://api.learnai.example.com/v1';

/**
 * Core fetch wrapper with auth + error handling
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('learnai_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('learnai_token');
    localStorage.removeItem('learnai_user');
    window.location.href = 'login.html';
    return;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

/* ── Auth Endpoints ──────────────────────────────────────────── */
export const authAPI = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request('/auth/me'),
};

/* ── Study Material Endpoints ────────────────────────────────── */
export const studyAPI = {
  generateGuide: (topic, difficulty = 'medium') =>
    request('/study/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, difficulty }),
    }),

  getFlashcards: (topic, count = 10) =>
    request('/study/flashcards', {
      method: 'POST',
      body: JSON.stringify({ topic, count }),
    }),

  getHistory: () => request('/study/history'),
};

/* ── Quiz Endpoints ──────────────────────────────────────────── */
export const quizAPI = {
  generate: (topic, difficulty = 'medium', questionCount = 10) =>
    request('/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, difficulty, questionCount }),
    }),

  submit: (quizId, answers) =>
    request(`/quiz/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  getHistory: () => request('/quiz/history'),
};

/* ── Recommendations Endpoint ────────────────────────────────── */
export const recommendAPI = {
  get: () => request('/recommendations'),
  dismiss: (id) => request(`/recommendations/${id}`, { method: 'DELETE' }),
};

/* ── Progress Endpoint ───────────────────────────────────────── */
export const progressAPI = {
  get: () => request('/progress'),
  getStats: () => request('/progress/stats'),
};

/* ── Chat / AI Endpoint ──────────────────────────────────────── */
export const chatAPI = {
  send: (message, difficulty = 'medium', history = []) =>
    request('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message, difficulty, history }),
    }),
};

/* ── Upload ──────────────────────────────────────────────────── */
export const uploadAPI = {
  file: async (file) => {
    const token = localStorage.getItem('learnai_token');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },
};

/* ── Mock helper (dev only) ──────────────────────────────────── */
export function mockDelay(ms = 1200) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function mockChat(message) {
  await mockDelay(1000 + Math.random() * 800);
  const responses = [
    `Great question about "${message}"! Here's a summary to help you understand this topic better. Start with the core concepts, then build up complexity gradually.`,
    `I can help you study "${message}". Let me break this down into digestible pieces so you can master it step by step.`,
    `For "${message}", I recommend starting with the fundamentals. Would you like me to generate a study guide, a quiz, or some flashcards?`,
    `Excellent! "${message}" is a fascinating topic. Here are the key points you should focus on for your studies...`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export async function mockGenerateQuiz(topic, difficulty) {
  await mockDelay(1500);
  return {
    id: 'quiz_' + Date.now(),
    topic,
    difficulty,
    questions: [
      {
        id: 1,
        text: `What is the main concept behind ${topic}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: 0,
      },
      {
        id: 2,
        text: `Which principle is most important in ${topic}?`,
        options: ['Principle X', 'Principle Y', 'Principle Z', 'None of the above'],
        correct: 2,
      },
    ],
  };
}
