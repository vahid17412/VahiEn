/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Card } from "../types";
import { executeAITask } from "../lib/ai";
import { Sparkles, Trash2, Plus, X, Loader2 } from "lucide-react";

interface CardEditorProps {
  card?: Card; // If editing
  onSave: (card: Card) => void;
  onCancel: () => void;
}

export default function CardEditor({ card, onSave, onCancel }: CardEditorProps) {
  const [word, setWord] = useState("");
  const [ipa, setIpa] = useState("");
  const [definition, setDefinition] = useState("");
  const [translation, setTranslation] = useState("");
  const [examples, setExamples] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");
  const [grammarNotes, setGrammarNotes] = useState("");
  const [pronunciationNotes, setPronunciationNotes] = useState("");
  const [difficulty, setDifficulty] = useState<Card["difficulty"]>("Medium");
  const [tagsInput, setTagsInput] = useState("");
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAIError] = useState("");

  useEffect(() => {
    if (card) {
      setWord(card.word);
      setIpa(card.ipa);
      setDefinition(card.definition);
      setTranslation(card.translation);
      setExamples(card.examples.length > 0 ? card.examples : [""]);
      setNotes(card.notes);
      setGrammarNotes(card.grammarNotes);
      setPronunciationNotes(card.pronunciationNotes);
      setDifficulty(card.difficulty);
      setTagsInput(card.tags.join(", "));
    }
  }, [card]);

  const handleAddExample = () => {
    setExamples([...examples, ""]);
  };

  const handleExampleChange = (index: number, val: string) => {
    const updated = [...examples];
    updated[index] = val;
    setExamples(updated);
  };

  const handleRemoveExample = (index: number) => {
    const updated = examples.filter((_, idx) => idx !== index);
    setExamples(updated.length > 0 ? updated : [""]);
  };

  const handleAIAutoComplete = async () => {
    if (!word.trim()) {
      setAIError("لطفاً ابتدا کلمه یا عبارت انگلیسی را وارد کنید.");
      return;
    }

    setIsAILoading(true);
    setAIError("");

    const systemInstruction = `You are an expert lexicographer, English-Persian translator, and linguist.
Return your answer in strictly valid JSON format. Do not include markdown wraps like \`\`\`json. Just pure JSON.
JSON structure must match:
{
  "ipa": "British IPA transcription, surrounded by forward slashes, e.g. /əˈkjuː.mən/",
  "definition": "A clear, descriptive English definition of the word",
  "translation": "An elegant, precise Persian (Farsi) translation of the word, capturing the exact nuances",
  "examples": ["An authentic English example sentence 1", "An authentic English example sentence 2"],
  "grammarNotes": "A short note on parts of speech, syntax, collocations, or common grammar patterns.",
  "pronunciationNotes": "Tips for Persian speakers on how to pronounce it correctly, highlighting silent letters, stress, or linking sound details."
}`;

    const prompt = `Generate details for the English word/phrase: "${word}". Preferred accent is British English. Make translations natural and precise. Ensure output is strictly in JSON format.`;

    try {
      const responseText = await executeAITask(
        "vocabularyExplanation",
        prompt,
        systemInstruction,
        true
      );

      // Parse JSON from response
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const aiData = JSON.parse(cleanJson);

      if (aiData.ipa) setIpa(aiData.ipa);
      if (aiData.definition) setDefinition(aiData.definition);
      if (aiData.translation) setTranslation(aiData.translation);
      if (aiData.examples && Array.isArray(aiData.examples)) {
        setExamples(aiData.examples);
      }
      if (aiData.grammarNotes) setGrammarNotes(aiData.grammarNotes);
      if (aiData.pronunciationNotes) setPronunciationNotes(aiData.pronunciationNotes);
      
    } catch (err: any) {
      console.error("AI Auto-complete error:", err);
      setAIError("کامل‌سازی خودکار با خطا مواجه شد. لطفاً اتصال اینترنت خود را چک کرده یا تنظیمات کلیدهای هوش مصنوعی را در بخش تنظیمات بررسی نمایید.");
    } finally {
      setIsAILoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !definition.trim() || !translation.trim()) {
      alert("پر کردن فیلدهای کلمه انگلیسی، معنی انگلیسی و ترجمه فارسی الزامی است.");
      return;
    }

    const filteredExamples = examples.map(ex => ex.trim()).filter(ex => ex !== "");

    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t !== "");

    const finalCard: Card = {
      id: card?.id || `card-${Date.now()}`,
      word: word.trim(),
      ipa: ipa.trim(),
      definition: definition.trim(),
      translation: translation.trim(),
      examples: filteredExamples,
      notes: notes.trim(),
      grammarNotes: grammarNotes.trim(),
      pronunciationNotes: pronunciationNotes.trim(),
      difficulty,
      tags: parsedTags,
      status: card?.status || "New",
      easeFactor: card?.easeFactor || 2.5,
      repetitions: card?.repetitions || 0,
      interval: card?.interval || 0,
      nextReviewDate: card?.nextReviewDate || new Date().toISOString().split("T")[0],
      createdAt: card?.createdAt || new Date().toISOString(),
      lastReviewedDate: card?.lastReviewedDate,
    };

    onSave(finalCard);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-6 text-slate-100" dir="rtl">
      {/* Title */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
        <h2 className="text-xl font-semibold text-emerald-400 font-sans">
          {card ? "ویرایش کارت لغت" : "افزودن کارت لغت جدید"}
        </h2>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: English word with AI Button */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              کلمه یا عبارت انگلیسی (Word / Phrase) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              className="w-full text-left font-semibold text-lg bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="e.g. Serendipity"
              dir="ltr"
              required
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleAIAutoComplete}
              disabled={isAILoading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-emerald-600 shadow-lg shadow-emerald-950/40"
            >
              {isAILoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>در حال تولید لغت...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>تولید خودکار با هوش مصنوعی</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Error Display */}
        {aiError && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg p-3 text-right">
            {aiError}
          </p>
        )}

        {/* IPA Pronunciation & Tags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              تلفظ صوتی بریتانیایی (British IPA)
            </label>
            <input
              type="text"
              value={ipa}
              onChange={(e) => setIpa(e.target.value)}
              className="w-full text-left font-mono bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="/ˌser.ənˈdɪp.ə.ti/"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              برچسب‌ها (جداشده با کاما)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full text-right bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="مثال: Academic, Business, Idiom"
            />
          </div>
        </div>

        {/* Definition & Translation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              تعریف به انگلیسی (English Definition) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              rows={3}
              className="w-full text-left bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Explain the meaning of the word in simple English..."
              dir="ltr"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              معنی و معادل فارسی دقیق <span className="text-red-500">*</span>
            </label>
            <textarea
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              rows={3}
              className="w-full text-right bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="ترجمه روان و اصطلاحات معادل فارسی را وارد کنید..."
              required
            />
          </div>
        </div>

        {/* Dynamic Examples List */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-300">
              جملات نمونه انگلیسی (Examples)
            </label>
            <button
              type="button"
              onClick={handleAddExample}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              <Plus size={14} />
              <span>افزودن جمله نمونه</span>
            </button>
          </div>
          <div className="space-y-3">
            {examples.map((example, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={example}
                  onChange={(e) => handleExampleChange(index, e.target.value)}
                  className="flex-1 text-left bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={`Example sentence ${index + 1}`}
                  dir="ltr"
                />
                {examples.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveExample(index)}
                    className="text-red-400 hover:text-red-300 bg-slate-950 hover:bg-slate-800 p-3 rounded-xl border border-slate-800"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Grammar Notes & Pronunciation Cues */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              نکات گرامری و ساختارها (Grammar Notes)
            </label>
            <textarea
              value={grammarNotes}
              onChange={(e) => setGrammarNotes(e.target.value)}
              rows={2}
              className="w-full text-left bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Grammatical properties (e.g. transitive, noun uncountable)"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              نکات تلفظی و راهنمای خواندن (Pronunciation Cues)
            </label>
            <textarea
              value={pronunciationNotes}
              onChange={(e) => setPronunciationNotes(e.target.value)}
              rows={2}
              className="w-full text-right bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="نکات تلفظی، بخش‌های بیصدا، تکیه بر کلمات..."
            />
          </div>
        </div>

        {/* Notes & Difficulty Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              یادداشت‌های شخصی اضافه
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-right bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="منشا کلمه، ترفندهای یادگیری، تاریخ ثبت..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              سطح سختی اولیه لغت
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 border border-slate-800 p-1.5 rounded-xl text-center">
              {(["Easy", "Medium", "Hard"] as Card["difficulty"][]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                    difficulty === level
                      ? level === "Easy"
                        ? "bg-green-600 text-white"
                        : level === "Medium"
                        ? "bg-yellow-600 text-white"
                        : "bg-red-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {level === "Easy" ? "آسان" : level === "Medium" ? "متوسط" : "سخت"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-850 transition-colors text-slate-300 font-medium text-sm"
          >
            انصراف
          </button>
          <button
            type="submit"
            className="px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-medium text-sm transition-colors shadow-lg shadow-emerald-950/20"
          >
            ذخیره کارت
          </button>
        </div>
      </form>
    </div>
  );
}
