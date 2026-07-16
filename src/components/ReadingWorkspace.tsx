/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Article, Card } from "../types";
import { getAllArticles, saveArticle, deleteArticle, saveCard } from "../lib/db";
import { executeAITask } from "../lib/ai";
import { Plus, BookOpen, Trash2, ArrowRight, Sparkles, Loader2, PlusCircle, Check, List, Clock, BookMarked } from "lucide-react";

export default function ReadingWorkspace() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  
  // Create state
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Reader states
  const [selectedWord, setSelectedWord] = useState("");
  const [aiWordData, setAIWordData] = useState<any | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isSavedToCards, setIsSavedToCards] = useState(false);
  const [aiError, setAIError] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    const list = await getAllArticles();
    setArticles(list.sort((a, b) => b.addedDate.localeCompare(a.addedDate)));
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("پر کردن هر دو فیلد عنوان و متن الزامی است.");
      return;
    }

    const newArticle: Article = {
      id: `article-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      progress: 0,
      highlightedWords: [],
      addedDate: new Date().toISOString(),
    };

    await saveArticle(newArticle);
    setTitle("");
    setContent("");
    setIsCreating(false);
    loadArticles();
  };

  const handleDeleteArticle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("آیا مطمئن هستید که می‌خواهید این متن را حذف کنید؟")) {
      await deleteArticle(id);
      if (activeArticle?.id === id) {
        setActiveArticle(null);
      }
      loadArticles();
    }
  };

  const handleSelectArticle = (art: Article) => {
    setActiveArticle(art);
    setProgress(art.progress);
    setSelectedWord("");
    setAIWordData(null);
    setIsSavedToCards(false);
    
    // Save last read date
    const updated: Article = {
      ...art,
      lastReadDate: new Date().toISOString(),
    };
    saveArticle(updated);
  };

  const handleProgressChange = (val: number) => {
    setProgress(val);
    if (activeArticle) {
      const updated: Article = {
        ...activeArticle,
        progress: val,
      };
      saveArticle(updated);
      // Update local state list as well
      setArticles((prev) => prev.map((a) => (a.id === activeArticle.id ? updated : a)));
    }
  };

  // Click on a word inside reader
  const handleWordClick = async (word: string) => {
    // Sanitize word (remove punctuation)
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();
    if (!cleanWord || cleanWord.length <= 1) return;

    setSelectedWord(cleanWord);
    setIsAILoading(true);
    setAIWordData(null);
    setIsSavedToCards(false);
    setAIError("");

    const systemInstruction = `You are a translator, British phonetician, and English teacher.
Generate details for the word. Output strictly in JSON format matching this schema:
{
  "word": "The exact base form of the word, e.g. serendipity",
  "ipa": "British IPA phonetic transcription e.g. /ˌser.ənˈdɪp.ə.ti/",
  "definition": "Simple English definition matching the reading context",
  "translation": "Precise Persian translation",
  "example": "A short simple example sentence using this word",
  "grammar": "Noun/Verb/Adjective etc."
}`;

    const prompt = `Define the word "${cleanWord}" found in the article text context. British English is preferred. Ensure valid JSON return.`;

    try {
      const response = await executeAITask("vocabularyExplanation", prompt, systemInstruction, true);
      const cleanJson = response.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      setAIWordData(parsed);
    } catch (err: any) {
      console.error("AI Reader lookup failed:", err);
      setAIError("خطا در ترجمه کلمه با هوش مصنوعی.");
    } finally {
      setIsAILoading(false);
    }
  };

  const handleAddLookedUpWordToFlashcards = async () => {
    if (!aiWordData) return;

    const newCard: Card = {
      id: `card-${Date.now()}`,
      word: aiWordData.word || selectedWord,
      ipa: aiWordData.ipa || "",
      definition: aiWordData.definition || "",
      translation: aiWordData.translation || "",
      examples: aiWordData.example ? [aiWordData.example] : [],
      notes: "ثبت شده از طریق محیط روان‌خوانی مقالات.",
      grammarNotes: aiWordData.grammar || "",
      pronunciationNotes: "",
      difficulty: "Medium",
      tags: ["Reading", "AI-Lookup"],
      status: "New",
      easeFactor: 2.5,
      repetitions: 0,
      interval: 0,
      nextReviewDate: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };

    await saveCard(newCard);
    setIsSavedToCards(true);

    // Save word as highlighted in the article
    if (activeArticle) {
      const updatedWords = Array.from(new Set([...activeArticle.highlightedWords, selectedWord]));
      const updatedArticle: Article = {
        ...activeArticle,
        highlightedWords: updatedWords,
      };
      await saveArticle(updatedArticle);
      setActiveArticle(updatedArticle);
    }
  };

  // Helper to split a content block into clickable word spans
  const renderInteractiveText = (text: string) => {
    const paragraphs = text.split("\n\n");
    return paragraphs.map((para, paraIdx) => {
      const words = para.split(/\s+/);
      return (
        <p key={paraIdx} className="mb-4 text-base md:text-lg leading-relaxed text-slate-300 select-text">
          {words.map((word, wordIdx) => {
            const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
            const isHighlighted = activeArticle?.highlightedWords.includes(cleanWord);
            
            return (
              <span
                key={wordIdx}
                onClick={() => handleWordClick(word)}
                className={`inline-block mr-1.5 px-0.5 rounded cursor-pointer transition-colors ${
                  isHighlighted 
                    ? "bg-amber-500/20 text-amber-300 border-b border-amber-500/50" 
                    : "hover:bg-slate-800 hover:text-emerald-400"
                } ${selectedWord.toLowerCase() === cleanWord ? "bg-emerald-500/25 text-emerald-300" : ""}`}
              >
                {word}
              </span>
            );
          })}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* Shell layout: Article Selector vs Active Reader */}
      {!activeArticle && !isCreating ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div>
              <h1 className="text-xl font-semibold text-emerald-400 font-sans mb-1">کتابخانه و محیط روان‌خوانی مقالات</h1>
              <p className="text-xs text-slate-400">متون، داستان‌های کوتاه یا مقالات علمی خود را وارد کنید، هوشمندانه بخوانید و لغات جدید را فورا استخراج کنید.</p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-colors"
            >
              <Plus size={16} />
              <span>افزودن مقاله جدید</span>
            </button>
          </div>

          {/* List of articles */}
          {articles.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <BookOpen className="mx-auto mb-3 opacity-40 text-slate-400" size={44} />
              <p className="text-sm font-medium">مقاله‌ای در کتابخانه شما وجود ندارد.</p>
              <p className="text-xs mt-1 text-slate-600">با دکمه بالا اولین مقاله، شعر یا متن دلخواه خود را ثبت کنید.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => handleSelectArticle(art)}
                  className="bg-slate-900 border border-slate-850 hover:border-slate-700 p-5 rounded-xl flex flex-col justify-between gap-4 cursor-pointer transition-all hover:shadow-lg"
                >
                  <div className="space-y-2 text-right">
                    <h3 className="font-semibold text-slate-200 text-base line-clamp-1">{art.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed" dir="ltr">
                      {art.content}
                    </p>
                  </div>

                  <div className="border-t border-slate-850 pt-3 flex justify-between items-center text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <BookMarked size={12} className="text-emerald-500" />
                      <span>پیشرفت: {art.progress}%</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteArticle(art.id, e)}
                      className="p-1.5 bg-slate-950 hover:bg-slate-850 rounded text-red-400 hover:text-red-300 transition-colors"
                      title="حذف مقاله"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : isCreating ? (
        /* Create View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold text-emerald-400 font-sans mb-4">ثبت مقاله یا متن جدید در کتابخانه</h2>
          <form onSubmit={handleSaveArticle} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">عنوان مقاله</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="مثال: The Benefits of Active Recall in Language Learning"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">متن مقاله (به زبان انگلیسی)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500 text-left"
                placeholder="Insert your English text here. You will be able to click on any word to get instant lookup meanings..."
                dir="ltr"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 py-2 px-4 rounded-xl text-xs transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-6 rounded-xl text-xs font-medium transition-colors"
              >
                ذخیره مقاله
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Active Reader Workspace View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reader (Left/Center 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              {/* Back & Title */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <button
                  onClick={() => setActiveArticle(null)}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-xs"
                >
                  <ArrowRight size={14} />
                  <span>بازگشت به کتابخانه</span>
                </button>
                <h2 className="text-base font-semibold text-slate-200 max-w-[70%] truncate font-sans">{activeArticle.title}</h2>
              </div>

              {/* Word Highlight Tip */}
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center gap-2 text-xs text-slate-400">
                <Sparkles size={14} className="text-emerald-400" />
                <span>روی <strong>هر کلمه‌ای</strong> که مایل هستید کلیک کنید تا ترجمه، تلفظ و معادل دقیق آن فوراً توسط هوش مصنوعی استخراج شود.</span>
              </div>

              {/* Dynamic Scrollable Content area */}
              <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-850/60 max-h-[500px] overflow-y-auto font-sans text-left tracking-wide" dir="ltr">
                {renderInteractiveText(activeArticle.content)}
              </div>

              {/* Progress Slider */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>میزان پیشرفت مطالعه متن</span>
                  <span className="font-semibold text-emerald-400">{progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Sidebar Lookup panel (Right 1 col) */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 min-h-[380px] flex flex-col justify-between">
              {/* Top half */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2.5 flex items-center gap-2">
                  <BookOpen size={16} className="text-emerald-400" />
                  <span>دیکشنری هوشمند هوش مصنوعی</span>
                </h3>

                {!selectedWord ? (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <Clock className="mx-auto opacity-30" size={32} />
                    <p className="text-xs">کلمه‌ای انتخاب نشده است.</p>
                    <p className="text-[10px] text-slate-600 max-w-[200px] mx-auto leading-relaxed">روی کلمات متن در کادر راست کلیک کنید تا ترجمه صوتی و معانی اینجا نشان داده شوند.</p>
                  </div>
                ) : isAILoading ? (
                  <div className="py-12 text-center text-slate-400 space-y-3">
                    <Loader2 className="animate-spin mx-auto text-emerald-400" size={24} />
                    <p className="text-xs">در حال واکاوی کلمه <strong className="text-emerald-400 font-sans">"{selectedWord}"</strong>...</p>
                  </div>
                ) : aiError ? (
                  <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs text-center">
                    {aiError}
                  </div>
                ) : aiWordData ? (
                  <div className="space-y-4 text-right">
                    {/* Word, Grammar & IPA */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 text-left" dir="ltr">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-lg font-bold text-white tracking-wide font-sans">{aiWordData.word}</h4>
                        <span className="text-[9px] font-semibold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-mono">
                          {aiWordData.grammar}
                        </span>
                      </div>
                      {aiWordData.ipa && (
                        <p className="text-xs text-slate-400 font-mono mt-0.5 tracking-wider">{aiWordData.ipa}</p>
                      )}
                    </div>

                    {/* Farsi Meaning */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-500 block">ترجمه فارسی:</span>
                      <p className="text-base text-emerald-400 font-semibold">{aiWordData.translation}</p>
                    </div>

                    {/* Definition */}
                    <div className="space-y-1 text-left" dir="ltr">
                      <span className="text-[10px] font-semibold text-slate-500 block uppercase">English Definition:</span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{aiWordData.definition}</p>
                    </div>

                    {/* Example */}
                    {aiWordData.example && (
                      <div className="space-y-1 text-left bg-slate-950 p-2.5 rounded-lg border border-slate-850" dir="ltr">
                        <span className="text-[10px] font-semibold text-slate-500 block uppercase">Example context:</span>
                        <p className="text-xs text-slate-300 italic leading-relaxed font-sans">"{aiWordData.example}"</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Bottom half: Action to add to card */}
              {selectedWord && aiWordData && !isAILoading && (
                <div className="pt-4 border-t border-slate-800">
                  {isSavedToCards ? (
                    <div className="w-full flex items-center justify-center gap-1 bg-green-950/40 text-green-400 border border-green-900/40 py-2.5 rounded-xl text-xs font-semibold">
                      <Check size={14} />
                      <span>لغت به جعبه لایتنر افزوده شد</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleAddLookedUpWordToFlashcards}
                      className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl text-xs transition-colors"
                    >
                      <PlusCircle size={14} />
                      <span>افزودن مستقیم به کارت‌ها</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
