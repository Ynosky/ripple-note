# ripple-note — Focus Writer

A minimalist, distraction-free Markdown editor built with Vite, TypeScript, and React.

## Overview

Focus Writer is a clean writing environment that gets out of your way. It supports Markdown with live preview, multiple typography modes, dark/light themes, and authorship tracking. Documents are persisted in the browser's `localStorage`, and an optional Gemini AI integration is available via the Google Generative AI API.

## Technology Stack

| Layer | Technology |
|---|---|
| Build tool | [Vite](https://vitejs.dev/) v6 |
| Language | TypeScript 5.8 |
| UI framework | React 19 |
| Styling | Tailwind CSS v4 |
| Editor | [CodeMirror 6](https://codemirror.net/) via `@uiw/react-codemirror` |
| Markdown rendering | `react-markdown` + `remark-gfm` |
| Animations | [Motion](https://motion.dev/) (Framer Motion) |
| Icons | [Lucide React](https://lucide.dev/) |
| AI integration | [Google Generative AI](https://ai.google.dev/) (`@google/genai`) |
| Server (optional) | Express + `better-sqlite3` |

## Project Structure

```
ripple-note/
├── src/
│   ├── App.tsx          # Main application component (editor, settings, sidebar)
│   ├── main.tsx         # React entry point
│   ├── authorship.ts    # CodeMirror extension for per-author text highlighting
│   └── index.css        # Global styles
├── index.html           # HTML shell / entry point
├── vite.config.ts       # Vite configuration (React plugin, Tailwind, env vars)
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies and npm scripts
├── metadata.json        # App metadata (name, description)
└── .env.example         # Example environment variable declarations
```

## Setup & Installation

**Prerequisites:** Node.js 18 or later

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ynosky/ripple-note.git
   cd ripple-note
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example file and fill in the values:
   ```bash
   cp .env.example .env.local
   ```

   | Variable | Description |
   |---|---|
   | `GEMINI_API_KEY` | API key for the Google Gemini AI integration. Obtain one from [Google AI Studio](https://aistudio.google.com/). |
   | `APP_URL` | Base URL where the app is hosted (e.g. `http://localhost:3000`). |

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server on port 3000 (all interfaces) |
| `npm run build` | Compile TypeScript and bundle with Vite for production |
| `npm run preview` | Serve the production build locally |
| `npm run clean` | Remove the `dist/` directory |
| `npm run lint` | Run the TypeScript compiler in no-emit mode to type-check |

## Features

- **Distraction-free editor** — the toolbar fades when you start typing
- **Markdown support** — full GFM (GitHub Flavored Markdown) with syntax highlighting
- **Live preview / split view** — toggle between Edit, Preview, and Split modes
- **Focus Mode** — dims everything except the active paragraph
- **Typewriter Mode** — keeps the cursor centred vertically while you write
- **Typography options** — switch between Mono, Sans, and Serif font stacks
- **Dark / Light theme** — persisted across sessions
- **Word count & reading time** — shown in the status bar
- **Multiple documents** — manage several notes from the collapsible sidebar
- **Authorship tracking** — colour-coded highlights per author using a custom CodeMirror extension
- **Local persistence** — all documents and settings are saved to `localStorage`
- **Gemini AI integration** — AI-powered writing assistance (requires `GEMINI_API_KEY`)
