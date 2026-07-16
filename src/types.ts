/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Card {
  id: string;
  word: string; // The English word, phrase, idiom, expression, etc.
  ipa: string; // British IPA (preferred)
  definition: string; // English definition
  translation: string; // Persian / Farsi translation
  examples: string[]; // List of usage examples
  notes: string; // General study notes
  grammarNotes: string; // Grammar highlights
  pronunciationNotes: string; // Pronunciation cues
  difficulty: "Easy" | "Medium" | "Hard"; // Initial difficulty label
  tags: string[]; // Category tags
  
  // Spaced Repetition (SM-2 Algorithm parameters)
  status: "New" | "Learning" | "Review" | "Suspended";
  easeFactor: number; // Defaults to 2.5
  repetitions: number; // Defaults to 0
  interval: number; // Days until next review (0 means same day or immediate)
  nextReviewDate: string; // ISO string (YYYY-MM-DD)
  lastReviewedDate?: string; // ISO string (YYYY-MM-DD)
  createdAt: string; // ISO string
}

export type AIProviderType =
  | "gemini"
  | "openai"
  | "claude"
  | "deepseek"
  | "openrouter"
  | "groq"
  | "ollama"
  | "custom";

export interface AIKey {
  id: string;
  provider: AIProviderType;
  displayName: string;
  apiKey: string;
  baseUrl?: string; // Custom endpoint URL (for custom, ollama, or openrouter)
  model: string; // Default model to use (e.g., gpt-4o, gemini-3.5-flash, claude-3-5-sonnet)
  enabled: boolean;
  priority: number; // Lower is higher priority
  notes?: string;
  creationDate: string;
  lastUsed?: string;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  cardWord: string;
  grade: 0 | 1 | 2 | 3; // 0: Again, 1: Hard, 2: Good, 3: Easy
  datetime: string;
  interval: number;
  durationMs: number;
}

export interface Article {
  id: string;
  title: string;
  content: string; // Markdown or raw text
  progress: number; // Percentage read (0 - 100)
  highlightedWords: string[]; // List of words marked during reading
  addedDate: string;
  lastReadDate?: string;
}

export interface StudySession {
  date: string; // YYYY-MM-DD
  cardsReviewed: number;
  correctReviews: number; // grade >= 1
  timeSpentSec: number;
}

export interface Settings {
  theme: "light" | "dark" | "sepia";
  reviewLimit: number; // Daily maximum reviews to show
  newCardsLimit: number; // Daily maximum new cards to introduce
  voiceGender: "male" | "female"; // Default speech synth
  aiTasks: {
    vocabularyExplanation: string; // keyId or "default-gemini"
    grammarCorrection: string; // keyId or "default-gemini"
    writingFeedback: string;
    pronunciationEvaluation: string;
    exampleGeneration: string;
  };
}
