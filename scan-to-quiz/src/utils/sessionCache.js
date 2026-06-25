import { openDB } from 'idb';

const DB_NAME = 'DocQuizDB';
const DB_VERSION = 1;

/** Singleton — opened once, reused everywhere */
let _dbPromise = null;

function getDB() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('ocrResults')) db.createObjectStore('ocrResults');
        if (!db.objectStoreNames.contains('mcqResults')) db.createObjectStore('mcqResults');
        if (!db.objectStoreNames.contains('prompts'))    db.createObjectStore('prompts');
        if (!db.objectStoreNames.contains('ocrImages'))  db.createObjectStore('ocrImages');
      },
    });
  }
  return _dbPromise;
}

// --- OCR Cache ---
export async function saveOcrResult(sectionId, result) {
  const db = await getDB();
  await db.put('ocrResults', result, sectionId);
}

export async function saveOcrImages(sectionId, imagesArray) {
  const db = await getDB();
  // We can merge with existing images or replace. Here we replace.
  await db.put('ocrImages', imagesArray, sectionId);
}

export async function loadOcrImages(sectionId) {
  const db = await getDB();
  return (await db.get('ocrImages', sectionId)) || [];
}

export async function loadAllOcrResults() {
  const db = await getDB();
  const keys = await db.getAllKeys('ocrResults');
  const values = await db.getAll('ocrResults');
  return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
}

export async function clearOcrCache() {
  const db = await getDB();
  await db.clear('ocrResults');
  await db.clear('ocrImages');
}

// --- MCQ Cache ---
export async function saveMcqResults(results) {
  const db = await getDB();
  await db.put('mcqResults', results, 'all');
}

export async function loadMcqResults() {
  const db = await getDB();
  return (await db.get('mcqResults', 'all')) || [];
}

export async function clearMcqCache() {
  const db = await getDB();
  await db.clear('mcqResults');
}

export async function clearSession() {
  await clearOcrCache();
  await clearMcqCache();
}
