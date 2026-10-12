# ViralCut AI 🎬⚡

> **Transform YouTube videos and transcripts into high-retention viral Reels, Shorts, and TikTok scripts with psychological hooks, visual scene cues, retention analytics, and mobile editor.**

---

## 🌟 Features

- **⚡ YouTube Metadata & Transcript Extractor**: Instant automatic extraction of YouTube video transcripts, timestamps, and metadata.
- **🎙️ AI Audio Transcription & Subtitle Generator**: Uses Gemini to transcribe uploaded video/audio tracks with word-level timestamps and viral on-screen caption cues.
- **🧠 Psychological Hook Generator**: Suggests high-converting viral hooks based on cognitive engagement principles.
- **📱 Mobile Reel Simulator**: Real-time 9:16 interactive preview simulator with subtitle styling, safe zones, and sound effect cues.
- **📊 Retention Analytics & Score**: Analyzes viewer drop-off points and provides actionable recommendations to boost watch time.
- **🎞️ Multi-Format Export**:
  - **NLE Cut Sheet / EDL / FCPXML**: Export directly into Premiere Pro, DaVinci Resolve, or Final Cut Pro.
  - **TTS Voiceover Export**: Generate AI speech voiceovers for reels.
- **☁️ Cloud Sync via Firebase**: Save projects, drafts, and analytics in Firestore with Google Auth.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Framer Motion
- **Backend**: Node.js, Express, tsx
- **AI / LLM**: Google Gemini API (`@google/genai`)
- **Cloud Database / Auth**: Firebase & Firestore

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended; tested on v20+)
- npm or bun

### 1. Installation

```bash
git clone https://github.com/aliraza254/viral-cut.git
cd viral-cut
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` or `.env`:

```bash
cp .env.example .env
```

Add your Google Gemini API key:
```env
GEMINI_API_KEY="your_actual_gemini_api_key"
PORT=3000
```
*(Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey))*

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
viral-cut/
├── server/
│   ├── app.ts                 # Express API routes (transcription, reels, hooks, TTS)
│   ├── gemini.ts              # Gemini API client initialization
│   ├── geminiRunner.ts        # Model fallback and error handling
│   └── youtube.ts             # YouTube metadata & caption extraction
├── src/
│   ├── components/            # React UI components (Editor, Mobile Reel, Modals)
│   ├── data/                  # Sample templates & presets
│   ├── lib/                   # Firebase initialization & helpers
│   ├── utils/                 # Audio extraction, NLE export, and SFX utils
│   ├── App.tsx                # Main application interface
│   └── main.tsx               # App entrypoint
├── server.ts                  # Production Express server entry
├── vite.config.ts             # Vite configuration with Express API middleware
└── package.json               # Project dependencies and scripts
```

---

## 📄 License

MIT
