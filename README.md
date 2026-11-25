# MediAssist AI – Voice-Based Doctor Appointment Assistant

MediAssist AI is an AI-powered doctor appointment assistant that helps users find doctors, check available appointment slots, book appointments, and cancel existing appointments through natural language conversations and voice interactions.

The application also provides a manual booking interface alongside the AI assistant, allowing users to manage appointments using either method.

## Features

- **AI-Powered Conversations:** Interact with the assistant using natural language.
- **Voice Interaction:** Speak to the assistant using voice input and receive spoken responses.
- **Doctor Discovery:** Find doctors based on their specialization.
- **Slot Availability:** Check available appointment dates and time slots.
- **Appointment Booking:** Book appointments through the AI assistant or manual booking form.
- **Appointment Cancellation:** Cancel existing appointments through natural language.
- **Integrated Interface:** Access manual booking and AI assistance from a single dashboard.

## Tech Stack

### Frontend
- React.js
- TypeScript
- Vite
- Tailwind CSS
- Axios
- Lucide React

### Backend
- Python
- FastAPI
- SQLite

### AI and Voice
- **LLM:** Groq API – `openai/gpt-oss-20b`
- **Speech-to-Text:** ElevenLabs
- **Text-to-Speech:** ElevenLabs

The Groq-hosted GPT-OSS 20B model powers the conversational assistant. It interprets user requests and uses tool/function calling to interact with backend appointment functionalities, such as retrieving doctors, checking available slots, booking appointments, and cancelling appointments.

## Project Structure

```text
MediAssist-AI/
├── backend/
│   ├── app/
│   │   ├── services/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── routes.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

## Prerequisites

Make sure you have the following installed:

- Python 3.10 or later
- Node.js and npm
- Git
- Groq API key
- ElevenLabs API key and Voice ID

## Getting Started

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd MediAssist-AI
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual GitHub repository URL.

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

**Windows:**
```powershell
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` directory using `.env.example` as a template.

Configure the following environment variables:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id
```

Start the backend server:

```bash
uvicorn app.main:app --reload
```

The backend will be available at:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### 3. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at the URL displayed in your terminal, usually:

`http://localhost:5173`

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/doctors` | Retrieve available doctors |
| GET | `/api/slots` | Retrieve available appointment slots |
| POST | `/api/book` | Book an appointment |
| POST | `/api/cancel/{appointment_id}` | Cancel an appointment |
| POST | `/api/chat` | Interact with the AI assistant |
| POST | `/api/voice/transcribe` | Convert voice input into text |
| POST | `/api/voice/speak` | Generate spoken AI responses |

## Environment Variables and Security

- Never commit your actual `.env` file or API keys to GitHub.
- Use `.env.example` as a template for configuration.
- Add your own Groq and ElevenLabs credentials before running the application.

## Future Improvements

- User authentication and appointment history.
- Doctor-side appointment management.
- Integration with real healthcare providers.
- Improved conversational context and multilingual support.
- Deployment with production-ready database infrastructure.

---

**MediAssist AI** – Making doctor appointment booking simpler through conversational AI and voice technology.
