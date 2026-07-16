/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, AIKey, ReviewLog, Article, StudySession, Settings } from "../types";

const DB_NAME = "VahidRoutingDB";
const DB_VERSION = 2;

// Default initial settings
export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  reviewLimit: 50,
  newCardsLimit: 10,
  voiceGender: "female",
  aiTasks: {
    vocabularyExplanation: "default-gemini",
    grammarCorrection: "default-gemini",
    writingFeedback: "default-gemini",
    pronunciationEvaluation: "default-gemini",
    exampleGeneration: "default-gemini",
  },
};

// Default seed cards to populate the database on first load
const SEED_CARDS: Card[] = [
  {
    id: "seed-1",
    word: "Acumen",
    ipa: "/əˈkjuː.mən/",
    definition: "The ability to make good judgments and quick decisions, typically in a particular domain.",
    translation: "تیزبینی، درک عمیق، بصیرت و هوشمندی بالا در کارها",
    examples: [
      "She has demonstrated remarkable business acumen during her career.",
      "His political acumen allowed him to navigate the complex negotiations."
    ],
    notes: "Derived from Latin 'acuere' meaning 'to sharpen'. Perfect for business and academic conversations.",
    grammarNotes: "Noun (Uncountable). Often preceded by adjectives like 'business', 'political', 'financial'.",
    pronunciationNotes: "Stress is usually on the second syllable (/əˈkjuː.mən/), though some say (/ˈæk.jə.mən/).",
    difficulty: "Hard",
    tags: ["Academic", "Vocabulary", "Business"],
    status: "New",
    easeFactor: 2.5,
    repetitions: 0,
    interval: 0,
    nextReviewDate: new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-2",
    word: "Bite the bullet",
    ipa: "/baɪt ðə ˈbʊl.ɪt/",
    definition: "To face a difficult situation with courage and force oneself to do something unpleasant or difficult.",
    translation: "دندان روی جگر گذاشتن، تن به کار دشواری دادن، دل به دریا زدن",
    examples: [
      "I've got to bite the bullet and go to the dentist tomorrow.",
      "The government had to bite the bullet and raise taxes to cover the deficit."
    ],
    notes: "Historical origin: soldiers in the past biting on lead bullets to cope with pain during surgery without anesthesia.",
    grammarNotes: "Idiomatic verb phrase. Conjugates as 'bit the bullet', 'bitten the bullet'.",
    pronunciationNotes: "Linked pronunciation: 'bite-the' sounds fluent and joined.",
    difficulty: "Medium",
    tags: ["Idiom", "Speaking", "Colloquial"],
    status: "New",
    easeFactor: 2.5,
    repetitions: 0,
    interval: 0,
    nextReviewDate: new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-3",
    word: "Ubiquitous",
    ipa: "/juːˈbɪk.wɪ.təs/",
    definition: "Present, appearing, or found everywhere.",
    translation: "همه‌جا حاضر، فراگیر، همه‌جایی و همه‌گیر",
    examples: [
      "Smartphones have become ubiquitous in modern society.",
      "The ubiquitous influence of social media is undeniable."
    ],
    notes: "Adjective representing something extremely common. Synonyms: omnipresent, pervasive.",
    grammarNotes: "Adjective. Noun form is 'ubiquity' (/juːˈbɪk.wə.ti/).",
    pronunciationNotes: "Watch the second syllable: stress is on '-bɪk-'.",
    difficulty: "Medium",
    tags: ["Academic", "Writing", "Vocabulary"],
    status: "New",
    easeFactor: 2.5,
    repetitions: 0,
    interval: 0,
    nextReviewDate: new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
  }
];

// Open DB Helper
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (!db.objectStoreNames.contains("cards")) {
        db.createObjectStore("cards", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("aiKeys")) {
        db.createObjectStore("aiKeys", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("reviewLogs")) {
        db.createObjectStore("reviewLogs", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("articles")) {
        db.createObjectStore("articles", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("studySessions")) {
        db.createObjectStore("studySessions", { keyPath: "date" });
      }
    };
  });
}

// Check and seed if necessary
export async function initDB(): Promise<void> {
  const db = await openDB();
  
  // Seed cards if store is empty
  const transaction = db.transaction("cards", "readonly");
  const store = transaction.objectStore("cards");
  const countRequest = store.count();

  return new Promise((resolve, reject) => {
    countRequest.onsuccess = async () => {
      if (countRequest.result === 0) {
        console.log("Seeding initial English vocabulary cards into IndexedDB...");
        const writeTx = db.transaction("cards", "readwrite");
        const writeStore = writeTx.objectStore("cards");
        for (const card of SEED_CARDS) {
          writeStore.add(card);
        }
        writeTx.oncomplete = () => resolve();
        writeTx.onerror = () => reject(writeTx.error);
      } else {
        resolve();
      }
    };
    countRequest.onerror = () => reject(countRequest.error);
  });
}

// Synchronous settings helper using LocalStorage (immediate access, no theme flickers)
export function getStoredSettings(): Settings {
  try {
    const data = localStorage.getItem("vahid_english_settings");
    if (data) {
      const parsed = JSON.parse(data);
      // Merge keys to avoid breaking on old formats
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error("Error loading settings from localStorage:", e);
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: Settings): void {
  try {
    localStorage.setItem("vahid_english_settings", JSON.stringify(settings));
  } catch (e) {
    console.error("Error saving settings to localStorage:", e);
  }
}

// Generic Store Operations
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put<T>(storeName: string, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function deleteItem(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- Cards Database Interface ---
export async function getAllCards(): Promise<Card[]> {
  return getAll<Card>("cards");
}

export async function saveCard(card: Card): Promise<void> {
  return put<Card>("cards", card);
}

export async function deleteCard(cardId: string): Promise<void> {
  return deleteItem("cards", cardId);
}

// --- AI Keys Database Interface ---
export async function getAllAIKeys(): Promise<AIKey[]> {
  return getAll<AIKey>("aiKeys");
}

export async function saveAIKey(key: AIKey): Promise<void> {
  return put<AIKey>("aiKeys", key);
}

export async function deleteAIKey(keyId: string): Promise<void> {
  return deleteItem("aiKeys", keyId);
}

// --- Review Logs Interface ---
export async function getAllReviewLogs(): Promise<ReviewLog[]> {
  return getAll<ReviewLog>("reviewLogs");
}

export async function saveReviewLog(log: ReviewLog): Promise<void> {
  return put<ReviewLog>("reviewLogs", log);
}

export async function clearReviewLogs(): Promise<void> {
  return clearStore("reviewLogs");
}

// --- Articles Interface ---
export async function getAllArticles(): Promise<Article[]> {
  return getAll<Article>("articles");
}

export async function saveArticle(article: Article): Promise<void> {
  return put<Article>("articles", article);
}

export async function deleteArticle(articleId: string): Promise<void> {
  return deleteItem("articles", articleId);
}

// --- Study Sessions Interface ---
export async function getAllStudySessions(): Promise<StudySession[]> {
  return getAll<StudySession>("studySessions");
}

export async function saveStudySession(session: StudySession): Promise<void> {
  return put<StudySession>("studySessions", session);
}

export async function clearStudySessions(): Promise<void> {
  return clearStore("studySessions");
}

// --- SPACED REPETITION SCHEDULER (SM-2 ALGORITHM) ---
export function calculateNextReview(
  grade: 0 | 1 | 2 | 3, // 0: Again, 1: Hard, 2: Good, 3: Easy
  currentRepetitions: number,
  currentInterval: number,
  currentEaseFactor: number
): { repetitions: number; interval: number; easeFactor: number; status: "New" | "Learning" | "Review" } {
  let repetitions = currentRepetitions;
  let interval = currentInterval;
  let easeFactor = currentEaseFactor;
  let status: "New" | "Learning" | "Review" = "Review";

  if (grade === 0) {
    // Forgot/Failed
    repetitions = 0;
    interval = 1; // Try again tomorrow
    easeFactor = Math.max(1.3, easeFactor - 0.2);
    status = "Learning";
  } else {
    // Recalled successfully
    repetitions = repetitions + 1;

    if (repetitions === 1) {
      interval = 1; // 1 day
    } else if (repetitions === 2) {
      interval = 3; // 3 days
    } else {
      interval = Math.ceil(interval * easeFactor);
    }

    // Adjust ease factor based on grade quality
    // grade: 1 -> hard, 2 -> good, 3 -> easy
    // Map grade to standard SM-2 0-5 scale to use standard SM-2 calculation
    // Grade mapping: 1 -> 3 (hard), 2 -> 4 (good), 3 -> 5 (easy)
    const sm2Grade = grade === 1 ? 3 : grade === 2 ? 4 : 5;
    easeFactor = easeFactor + (0.1 - (5 - sm2Grade) * (0.08 + (5 - sm2Grade) * 0.02));
    easeFactor = Math.max(1.3, easeFactor);
  }

  return {
    repetitions,
    interval,
    easeFactor,
    status,
  };
}

// Add/Update Daily Study Statistics Helper
export async function recordReviewInSession(isCorrect: boolean, timeSpentSec: number): Promise<void> {
  const todayStr = new Date().toISOString().split("T")[0];
  const sessions = await getAllStudySessions();
  const existing = sessions.find((s) => s.date === todayStr);

  const updatedSession: StudySession = existing
    ? {
        date: todayStr,
        cardsReviewed: existing.cardsReviewed + 1,
        correctReviews: existing.correctReviews + (isCorrect ? 1 : 0),
        timeSpentSec: existing.timeSpentSec + timeSpentSec,
      }
    : {
        date: todayStr,
        cardsReviewed: 1,
        correctReviews: isCorrect ? 1 : 0,
        timeSpentSec,
      };

  await saveStudySession(updatedSession);
}

// --- DATABASE RESET / RESTORE IMPLEMENTATION ---
export async function importBackupData(backupJson: string): Promise<{ success: boolean; cardsAdded: number; error?: string }> {
  try {
    const data = JSON.parse(backupJson);
    const db = await openDB();

    if (data.cards && Array.isArray(data.cards)) {
      const tx = db.transaction("cards", "readwrite");
      const store = tx.objectStore("cards");
      for (const card of data.cards) {
        store.put(card);
      }
    }

    if (data.aiKeys && Array.isArray(data.aiKeys)) {
      const tx = db.transaction("aiKeys", "readwrite");
      const store = tx.objectStore("aiKeys");
      for (const key of data.aiKeys) {
        store.put(key);
      }
    }

    if (data.articles && Array.isArray(data.articles)) {
      const tx = db.transaction("articles", "readwrite");
      const store = tx.objectStore("articles");
      for (const article of data.articles) {
        store.put(article);
      }
    }

    if (data.reviewLogs && Array.isArray(data.reviewLogs)) {
      const tx = db.transaction("reviewLogs", "readwrite");
      const store = tx.objectStore("reviewLogs");
      for (const log of data.reviewLogs) {
        store.put(log);
      }
    }

    if (data.studySessions && Array.isArray(data.studySessions)) {
      const tx = db.transaction("studySessions", "readwrite");
      const store = tx.objectStore("studySessions");
      for (const session of data.studySessions) {
        store.put(session);
      }
    }

    if (data.settings) {
      saveStoredSettings(data.settings);
    }

    return { success: true, cardsAdded: data.cards ? data.cards.length : 0 };
  } catch (e: any) {
    console.error("Backup restore failed:", e);
    return { success: false, cardsAdded: 0, error: e.message || "Invalid backup format." };
  }
}

export async function exportBackupData(): Promise<string> {
  const cards = await getAllCards();
  const aiKeys = await getAllAIKeys();
  const articles = await getAllArticles();
  const reviewLogs = await getAllReviewLogs();
  const studySessions = await getAllStudySessions();
  const settings = getStoredSettings();

  const backupObj = {
    exportDate: new Date().toISOString(),
    app: "Vahid-Routing-English",
    cards,
    aiKeys,
    articles,
    reviewLogs,
    studySessions,
    settings,
  };

  return JSON.stringify(backupObj, null, 2);
}
