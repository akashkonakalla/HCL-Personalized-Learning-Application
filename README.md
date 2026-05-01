# Personalized Learning AI Assistant

An intelligent, AI-powered learning system that diagnoses knowledge, classifies proficiency, generates personalized study materials, and proactively guides learners — built with **FastAPI**, **Google Gemini**, **Supabase**, and **Vanilla JS**.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧠 Knowledge Diagnosis | AI-generated 10-question quiz on any topic |
| ⚡ Adaptive Content | Study materials tuned to Beginner / Intermediate / Expert |
| 🃏 Flashcards | Auto-generated active-recall cards |
| 🤖 AI Tutor Chat | Agentic AI that answers questions and suggests next steps |
| 📥 Export | Download study materials as PDF, DOCX, or Markdown |
| 📊 History | Full session history with scores and levels |
| 🔐 Auth | JWT-based authentication with bcrypt password hashing |

---

## 🏗️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+), no frameworks
- **Backend**: Python 3.11, FastAPI, Pydantic v2
- **AI**: Google Gemini 1.5 Flash
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT (python-jose) + bcrypt (passlib)

---

## 📁 Project Structure

```
HCL-Personalized-learning-ai/
├── frontend/
│   ├── index.html          # Landing page
│   ├── login.html          # Login
│   ├── register.html       # Registration
│   ├── dashboard.html      # Main app (7-step flow)
│   ├── css/
│   │   ├── style.css       # Landing styles
│   │   ├── auth.css        # Auth page styles
│   │   ├── components.css  # Sidebar, topbar, loader
│   │   └── dashboard.css   # All dashboard step styles
│   └── js/
│       ├── utils.js        # Helpers, markdown renderer
│       ├── api.js          # Centralized API layer
│       ├── auth.js         # JWT + form handling
│       ├── quiz.js         # Quiz rendering + evaluation
│       ├── content.js      # Study material rendering + export
│       ├── flashcards.js   # Flip cards + keyboard nav
│       ├── recommendations.js  # Recommendation cards
│       └── dashboard.js    # State machine orchestrator
│
├── backend/
│   ├── main.py             # FastAPI app + CORS
│   ├── config.py           # Pydantic settings
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── routes/
│   │   ├── auth.py         # /auth/register, /auth/login
│   │   └── learning.py     # /learning/* endpoints
│   ├── services/
│   │   ├── gemini_service.py   # All Gemini API calls + prompts
│   │   ├── quiz_service.py     # Quiz gen + evaluation
│   │   ├── content_service.py  # Content gen + history
│   │   └── agent_service.py    # AI tutor chat
│   ├── schemas/
│   │   ├── auth_schema.py
│   │   └── learning_schema.py
│   ├── utils/
│   │   ├── jwt_handler.py
│   │   ├── supabase_client.py
│   │   ├── security.py
│   │   └── helpers.py
│   └── database/
│       └── init.sql        # Supabase table creation
│
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## 🚀 Setup Guide

### Prerequisites

- Python Version 3.11+ (https://www.python.org/downloads/release/python-3119/)
              - Windows Installer x64 (https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe)
              - MacOS Installer x64   (https://www.python.org/ftp/python/3.11.9/python-3.11.9-macos11.pkg)
- A [Supabase](https://supabase.com) account (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

---

### 1. Clone the Repository

```bash
git https://github.com/akashkonakalla/HCL-Personalized-Learning-Application.git
cd  HCL-Personalized-Learning-Application
```

---

### 2. Set Up Supabase

1. Go to [app.supabase.com](https://app.supabase.com) and create a new project.
2. Open the **SQL Editor** and run the contents of `backend/database/init.sql`.
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_KEY` *(use service role, not anon key)*

---

### 3. Get a Gemini API Key

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create a new API key.
3. Copy it → `GEMINI_API_KEY`

---

### 4. Configure Environment

```bash
cd backend
cp ../.env.example .env
```

Edit `.env`:

```env
SECRET_KEY=your-random-32-char-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-key
```

Generate a secure `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

### 5. Install Backend Dependencies

```bash
Open a New Terminal, then run the following commands:
cd backend
py -3.11 -m venv venv
venv\Scripts\Activate.ps1       #<--- Venv activation in Power shell terminal (default)
                                #If you are On Git BASH:  source venv/Scripts/activate                   
pip install -r requirements.txt
```

---

### 6. Run the Backend

```bash
uvicorn main:app --reload --port 8000
```

The API will be at `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

---

### 7. Run the Frontend

Open `frontend/index.html` directly in your browser, or use a local server:

```bash
# Using Python
cd frontend
python -m http.server 5500

# Using VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

Frontend: `http://localhost:5500`

---

## 🐳 Docker Deployment

```bash
# Copy and fill in environment variables
cp .env.example .env

# Build and start both services
docker-compose up --build -d
```

- Frontend: `http://localhost:80`
- Backend API: `http://localhost:8000`

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account → returns JWT |
| POST | `/auth/login` | Login → returns JWT |

### Learning (all require `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/learning/generate-quiz` | Generate 10 MCQs for a topic |
| POST | `/learning/submit-quiz` | Evaluate answers → score + level |
| POST | `/learning/generate-content` | Generate personalized study materials |
| GET | `/learning/history` | Get session history |
| POST | `/learning/agent-chat` | Chat with AI tutor |

Full interactive docs available at `/docs` when the server is running.

---

## 🧠 Learning Flow

```
Login
  └─ Enter Topic
       └─ [AI] Generate 10-question quiz
            └─ Submit Answers
                 └─ Score calculated
                      └─ Level classified:
                           0–4  → Beginner
                           5–7  → Intermediate
                           8–10 → Expert
                              └─ [AI] Generate study materials
                                   ├─ Summary
                                   ├─ Key Concepts
                                   ├─ Deep Dive
                                   ├─ Flashcards
                                   ├─ Recommendations
                                   └─ AI Tutor Chat
```

---

## 🎨 Design System

- **Theme**: Dark glassmorphism with purple → blue gradient
- **Fonts**: Syne (display) + DM Sans (body)
- **Colors**: `#7c5cfc` primary, `#4fc4f9` accent, `#34d399` success
- **Motion**: CSS animations, smooth step transitions, orb backgrounds

---

## 🔐 Security

- Passwords hashed with bcrypt (passlib)
- JWT signed with HS256 and configurable secret
- All learning endpoints require valid Bearer token
- Input sanitized and validated with Pydantic
- CORS configured to allowed origins only

---

## 📄 License

MIT License — free to use, modify, and distribute.
