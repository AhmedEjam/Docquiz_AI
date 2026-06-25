# DocQuiz AI

**DocQuiz AI** is a fully localized, privacy-first pipeline that converts any PDF (scanned, image-heavy, or digital text) into a structured Multiple-Choice Question (MCQ) spreadsheet. The entire pipeline is powered by your local hardware via the **Ollama** server—meaning no cloud uploads, no API costs, and total data privacy.

---

## 🏗 Pipeline Stages

The application is broken down into three distinct, user-guided stages:

### Stage 1: PDF Splitter
Load large books and break them into manageable sections.
- **Auto-Detection**: Automatically reads the PDF text layer to detect "Chapter", "Unit", or "Section" markers to logically chunk the book.
- **Manual Splitting**: Click on any page thumbnail to manually insert or remove a section break.
- **Lazy Loading**: Smoothly handles massive 1,000+ page books via lazy-loaded canvas rendering.

### Stage 2: OCR Engine
Translates the visual data of your PDF into raw, clean text using Vision Language Models.
- **Intelligent Canvas Slicing**: Extra tall pages (like A3 charts) are automatically split in half before processing to preserve visual fidelity.
- **Batch Processing**: Pages within sections are queued and processed asynchronously.
- **Legibility Badges**: Automatically flags output that appears to be gibberish so you can review it before continuing.

### Stage 3: MCQ Processor
Parses the clean OCR text and extracts or generates MCQs.
- **Data Extraction**: Instructs an LLM to find questions, options, keys, and explanations, returning strict JSON.
- **Data Generation**: If the text is purely informational, it intelligently crafts plausible MCQs based on the content.
- **Interactive Grid**: Review, edit, and append manual rows via a rich table UI before hitting export.
- **Export**: Exports cleanly to `.csv` format for easy integration into Anki, Excel, or other LMS tools.

---

## 🚀 Getting Started

### Prerequisites
1. **Node.js** (v18+)
2. **Ollama**: Must be installed and running on your machine. [Download Ollama here.](https://ollama.com/)

### 1. Download Required Models
Open your terminal and run the following commands to download the default models used by the app.
*(You can swap these out for lighter/heavier models in the app settings later).*

```bash
ollama pull glm-ocr     # Used for OCR (Vision model)
ollama pull llama3.1    # Used for MCQ logic (Language model)
```

### 2. Start the Development Server
Navigate to this project folder in your terminal:

```bash
npm install
npm run dev
```

### 3. Open the App
Vite will output a local URL (e.g., `http://localhost:5173`). Click the link or paste it into your browser.

---

## 🛠 Configuration & Settings

DocQuiz AI is designed to be highly modifiable. You can tweak the behavior globally in the top navigation bar:
- **Base URL**: Defaults to `http://localhost:11434`. Ensure your Ollama server is accepting CORS requests if hosted on a different machine.
- **Concurrency**: Adjust how many pages/sections process at the same time. If your GPU runs out of VRAM and times out, set this down to `1`.
- **System Prompts**: The Prompts tab allows you to completely rewrite the instructions sent to the LLM for both OCR extraction and MCQ Generation. 

*(All configuration and progress data is safely cached in your browser's IndexedDB, meaning you won't lose your place if you accidentally refresh the page).*

---

## 🐛 Troubleshooting

### Failed to Load PDF / App Freezes
- **Wait for Parsing**: Massive PDFs might take a few seconds to initialize. The UI will display a loading percentage.
- **Browser Extensions**: Strict ad-blockers can sometimes intercept local canvas blobs. Try disabling them if pages refuse to render.

### OCR Fails, Times Out, or Returns "Network Error"
- **Ollama CORS**: If Ollama isn't allowing local browser requests, start Ollama with CORS enabled. On Mac/Linux: `OLLAMA_ORIGINS="*" ollama serve`.
- **GPU Limits**: If your machine lacks VRAM for `glm-ocr`, use a smaller model like `minicpm-v` or `moondream` and update the model name in the app config.
- **Concurrency**: Lower the concurrency slider to `1`.

### Build Errors
If you run `npm run build` and get a worker error, verify that you are on Vite 5+ and that the CDN links in `src/services/pdfService.js` are unblocked by your network.

---

## 📚 For Developers / AI Review

If you are an AI coding assistant or a developer looking to extend this project, please read the [agent.md](./agent.md) file for a deep dive into the state management, architecture, and design patterns.
