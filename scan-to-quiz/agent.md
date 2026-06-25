# DocQuiz AI — Agent Review Document

This document is intended for AI coding assistants and developers to quickly understand the architecture, state management, and critical patterns used in the DocQuiz AI project.

## Architecture Overview

DocQuiz AI is a local-first, serverless frontend application built with React and Vite. It relies exclusively on a local **Ollama** server for inference (OCR and LLM text generation).

The application operates as a three-stage pipeline:
1. **Stage 1 (PDF Splitter)**: Parses a PDF, extracts text/images, and defines logical boundaries (sections/chapters).
2. **Stage 2 (OCR Engine)**: Feeds sectioned images to a VLM (Vision Language Model, e.g., `glm-ocr`) via Ollama to extract raw, readable text.
3. **Stage 3 (MCQ Processor)**: Feeds the OCR text to an LLM (e.g., `llama3.1`) to either parse existing MCQs or generate new ones in a strict JSON format, which is then mapped to a Data Grid and exportable to CSV.

## Tech Stack & Libraries
- **Framework**: React 19, Vite 8.
- **Styling**: TailwindCSS 3 (utility-first, custom color theme in `tailwind.config.js`).
- **State Management**: Zustand 5 (global store with named selectors).
- **Persistence**: `idb` (IndexedDB via singleton connection pattern).
- **PDF Processing**: `pdfjs-dist` 6 (loads, renders, and extracts text layers from PDFs).
- **Export**: `xlsx` (CSV/Excel generation via shared MCQ schema).

## Directory Structure
```
src/
├── services/              # Business logic & external API calls
│   ├── ollamaClient.js    # Unified HTTP client (retry, backoff, abort)
│   ├── pdfService.js      # PDF parsing, rendering, section detection
│   ├── ocrService.js      # OCR orchestration (uses ollamaClient)
│   └── mcqService.js      # MCQ extraction/generation (uses ollamaClient)
├── lib/                   # Generic reusable utilities
│   └── asyncQueue.js      # Bounded-concurrency async task queue
├── schema/                # Data type definitions
│   └── mcqSchema.js       # MCQ field definitions, labels, export mappers
├── store/                 # State management
│   └── useAppStore.js     # Zustand store with named selector exports
├── utils/                 # Pure helpers
│   ├── sessionCache.js    # IndexedDB persistence (singleton connection)
│   ├── textChunker.js     # Text splitting by page markers
│   ├── csvExport.js       # CSV/XLSX export (uses mcqSchema)
│   └── jsonParser.js      # Resilient JSON parsing for LLM output
├── prompts/               # LLM prompt templates
│   ├── ocrPrompt.js       # OCR system prompt
│   └── mcqPrompts.js      # MCQ extraction/generation/review prompts
├── components/
│   ├── shared/            # Cross-stage UI
│   │   ├── PipelineNav.jsx
│   │   └── ErrorBoundary.jsx
│   ├── stage1/            # PDF splitting UI
│   ├── stage2/            # OCR processing UI
│   └── stage3/            # MCQ review & export UI
├── App.jsx                # Root component with stage routing
└── main.jsx               # Entry point with ErrorBoundary
```

## Critical Design Patterns

### 1. Unified Ollama Client (`ollamaClient.js`)
All communication to Ollama goes through a single HTTP client with:
- Exponential backoff retry (3 attempts by default)
- `AbortSignal` support for cancellation
- Custom `OllamaHttpError` with status codes
- Two convenience wrappers: `generateWithImage()` for vision, `chatComplete()` for chat

### 2. Generic AsyncQueue (`lib/asyncQueue.js`)
Both OCR and MCQ pipelines share the same concurrency-limited queue. This prevents GPU memory exhaustion when processing many sections. Usage:
```javascript
const queue = new AsyncQueue(concurrency);
const promise = queue.enqueue(() => someAsyncWork());
```

### 3. PDF Proxy Registry (`pdfService.js`)
Heavy `PDFPageProxy` objects are stored in a module-level `Map`, NOT in Zustand state. This prevents Zustand's state differ from walking complex internal pdfjs objects on every update. Access via:
```javascript
import { getPageProxy, renderPage } from './services/pdfService';
const proxy = getPageProxy(pageNum);   // For OCR
const dataUrl = await renderPage(pageNum, 0.35);  // For thumbnails
```

### 4. Zustand Selectors (`useAppStore.js`)
Components subscribe to only the state slices they need via named selectors:
```javascript
import useAppStore, { selectPages } from '../store/useAppStore';
const pages = useAppStore(selectPages);           // Re-renders only when pages change
const setPages = useAppStore(s => s.setPages);    // Actions never cause re-renders
```

### 5. Singleton IndexedDB (`sessionCache.js`)
The DB connection is opened once and reused. This avoids the overhead of re-handshaking with IndexedDB on every read/write during batch processing.

### 6. MCQ Schema (`schema/mcqSchema.js`)
All MCQ field definitions (names, labels, export headers) are defined in one place. Used by:
- `MCQTable.jsx` for the `emptyMCQ()` template
- `csvExport.js` for `EXPORT_HEADERS`, `mcqToRow()`, `mcqToCSVValues()`

### 7. Canvas Memory Management (`ocrService.js`)
Canvases are zeroed out (`canvas.width = 0; canvas.height = 0`) immediately after `toDataURL()` to release GPU/CPU memory. Without this, a 200-page book at 2x scale can consume 1GB+ of transient memory.

## Rules for Contributors
- **No `window.alert()`** — use inline React error states or the ErrorBoundary.
- **No direct `fetch()` to Ollama** — always go through `ollamaClient.js`.
- **No PDFPageProxy in Zustand** — use `getPageProxy(pageNum)`.
- **No full-store subscriptions** — always use a selector or `s => s.actionName`.
- **MCQ field changes** — update `mcqSchema.js` only; all consumers inherit.
