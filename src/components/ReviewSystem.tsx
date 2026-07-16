/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Card } from "../types";
import { calculateNextReview, recordReviewInSession, saveCard } from "../lib/db";
import { Volume2, Keyboard, Eye, Check, AlertTriangle, Play, HelpCircle, CornerDownLeft, Sparkles } from "lucide-react";

interface ReviewSystemProps {
  cardsDue: Card[];
  onReviewFinished: () => void;
}

export default function ReviewSystem({ cardsDue, onReviewFinished }: ReviewSystemProps) {
  const [queue, setQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [showHelp, setShowHelp] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    // Shuffle or sort cardsDue so that it has some natural review order
    setQueue([...cardsDue]);
    setCurrentIndex(0);
    setIsRevealed(false);
    setStartTime(Date.now());
  }, [cardsDue]);

  // Listen to keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (queue.length === 0 || currentIndex >= queue.length) return;

      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (!isRevealed) {
          handleReveal();
        }
      } else if (isRevealed) {
        if (e.key === "1") handleGrade(0); // Again
        else if (e.key === "2") handleGrade(1); // Hard
        else if (e.key === "3") handleGrade(2); // Good
        else if (e.key === "4") handleGrade(3); // Easy
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [queue, currentIndex, isRevealed]);

  const activeCard = queue[currentIndex];

  const handleReveal = () => {
    setIsRevealed(true);
    // Auto-pronounce if desired or simply play voice on reveal
    speakWord(activeCard?.word);
  };

  const speakWord = (text: string) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop any current speech
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Select British English voice if available
    const voices = window.speechSynthesis.getVoices();
    const gbVoice = voices.find(
      (v) => v.lang.includes("en-GB") || v.name.toLowerCase().includes("british") || v.name.toLowerCase().includes("united kingdom")
    ) || voices.find((v) => v.lang.startsWith("en"));
    
    if (gbVoice) {
      utterance.voice = gbVoice;
    }
    
    utterance.rate = 0.85; // Slightly slower for clear learning
    
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const handleGrade = async (grade: 0 | 1 | 2 | 3) => {
    if (!activeCard) return;

    const timeSpentMs = Date.now() - startTime;
    const timeSpentSec = Math.round(timeSpentMs / 1000);

    // Calculate new SM-2 parameters
    const updatedParams = calculateNextReview(
      grade,
      activeCard.repetitions,
      activeCard.interval,
      activeCard.easeFactor
    );

    const todayStr = new Date().toISOString().split("T")[0];
    
    // Calculate next review date: Today + interval in days
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + updatedParams.interval);
    const nextReviewDateStr = nextDate.toISOString().split("T")[0];

    const updatedCard: Card = {
      ...activeCard,
      status: updatedParams.status,
      repetitions: updatedParams.repetitions,
      interval: updatedParams.interval,
      easeFactor: updatedParams.easeFactor,
      nextReviewDate: nextReviewDateStr,
      lastReviewedDate: todayStr,
    };

    // Save in IndexedDB
    await saveCard(updatedCard);

    // Save study session telemetry (correct review means grade >= 1)
    await recordReviewInSession(grade >= 1, timeSpentSec);

    // Move to next card
    setIsRevealed(false);
    setStartTime(Date.now());

    if (grade === 0) {
      // Again/Forgot: Push it to the end of the current review session queue so user sees it again
      const updatedQueue = [...queue];
      updatedQueue.push(updatedCard);
      setQueue(updatedQueue);
    }

    setCurrentIndex((prev) => prev + 1);
  };

  // If reviews completed
  if (queue.length === 0 || currentIndex >= queue.length) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-100">
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={32} />
        </div>
        <h2 className="text-xl font-semibold text-slate-200 font-sans mb-2">
          مرورهای امروز به پایان رسید!
        </h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          شما تمام کارت‌های نوبت امروز خود را با موفقیت مرور کردید. فردا کارت‌های جدیدی در صف مرور قرار خواهند گرفت. کار عالی‌ای انجام دادید!
        </p>
        <button
          onClick={onReviewFinished}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-6 rounded-xl text-sm transition-colors"
        >
          بازگشت به داشبورد
        </button>
      </div>
    );
  }

  const progressPercent = Math.round((currentIndex / queue.length) * 100);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 text-slate-100" dir="rtl">
      {/* Upper Status Row */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>کارت {currentIndex + 1} از {queue.length}</span>
          <div className="w-24 h-1.5 bg-slate-850 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1 hover:text-slate-200 transition-colors"
          >
            <Keyboard size={14} />
            <span>کلیدهای میانبر</span>
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Help Banner */}
      {showHelp && (
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-xs space-y-2 text-slate-300">
          <h4 className="font-semibold text-slate-200 flex items-center gap-1 mb-1">
            <Keyboard size={12} />
            <span>راهنمای کلیدهای میانبر کیبورد:</span>
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><kbd className="bg-slate-850 border border-slate-750 px-1.5 py-0.5 rounded text-white font-sans text-[10px]">Space</kbd> or <kbd className="bg-slate-850 border border-slate-750 px-1.5 py-0.5 rounded text-white font-sans text-[10px]">Enter</kbd> : نمایش معنی</div>
            <div><kbd className="bg-slate-850 border border-slate-750 px-2 py-0.5 rounded text-white font-sans text-[10px]">1</kbd> : تکرار مجدد (Again)</div>
            <div><kbd className="bg-slate-850 border border-slate-750 px-2 py-0.5 rounded text-white font-sans text-[10px]">2</kbd> : سخت بود (Hard)</div>
            <div><kbd className="bg-slate-850 border border-slate-750 px-2 py-0.5 rounded text-white font-sans text-[10px]">3</kbd> : خوب بود (Good)</div>
            <div><kbd className="bg-slate-850 border border-slate-750 px-2 py-0.5 rounded text-white font-sans text-[10px]">4</kbd> : آسان بود (Easy)</div>
          </div>
        </div>
      )}

      {/* Primary Study Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-6 md:p-8 min-h-[360px] flex flex-col justify-between relative">
        {/* Difficulty Tag */}
        <div className="absolute top-6 left-6 flex items-center gap-2">
          {activeCard.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium"
            >
              {tag}
            </span>
          ))}
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
              activeCard.difficulty === "Easy"
                ? "bg-green-500/10 text-green-400 border-green-500/25"
                : activeCard.difficulty === "Medium"
                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/25"
                : "bg-red-500/10 text-red-400 border-red-500/25"
            }`}
          >
            {activeCard.difficulty === "Easy" ? "آسان" : activeCard.difficulty === "Medium" ? "متوسط" : "سخت"}
          </span>
        </div>

        {/* Card Content */}
        <div className="my-auto space-y-6 py-6">
          {/* Word/Phrase */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-wide font-sans text-left dir-ltr select-all">
              {activeCard.word}
            </h1>
            {activeCard.ipa && (
              <div className="flex justify-start items-center gap-2 text-slate-400 font-mono text-sm tracking-wider select-all">
                <span>{activeCard.ipa}</span>
                <button
                  onClick={() => speakWord(activeCard.word)}
                  disabled={speaking}
                  className="p-1 rounded-md text-emerald-400 hover:bg-slate-800 transition-colors"
                  title="پخش تلفظ بریتانیایی"
                >
                  <Volume2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Hidden/Revealed Section */}
          {!isRevealed ? (
            <div className="flex justify-center py-8">
              <button
                onClick={handleReveal}
                className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 font-medium py-3 px-8 rounded-xl transition-all shadow-lg"
              >
                <Eye size={16} />
                <span>نمایش معنی کارت</span>
                <span className="text-[10px] text-slate-500 border border-slate-800 px-1 py-0.2 rounded font-sans mr-2">Space / Enter</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6 pt-4 border-t border-slate-800/80 animate-fade-in text-right">
              {/* Definition */}
              <div className="space-y-1 text-left" dir="ltr">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">English Definition</span>
                <p className="text-slate-200 text-sm md:text-base leading-relaxed select-all">
                  {activeCard.definition}
                </p>
              </div>

              {/* Translation */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider block">ترجمه و معادل فارسی</span>
                <p className="text-slate-100 text-base md:text-lg font-medium leading-relaxed select-all">
                  {activeCard.translation}
                </p>
              </div>

              {/* Examples */}
              {activeCard.examples && activeCard.examples.length > 0 && (
                <div className="space-y-2 text-left" dir="ltr">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Example Sentences</span>
                  <div className="space-y-1.5">
                    {activeCard.examples.map((ex, index) => (
                      <div key={index} className="flex gap-2 items-start text-sm select-all">
                        <span className="text-emerald-400 mt-1">•</span>
                        <p className="text-slate-300 italic leading-relaxed">{ex}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced Cues (Grammar, Pronunciation) */}
              {(activeCard.grammarNotes || activeCard.pronunciationNotes) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-3 bg-slate-950 rounded-xl border border-slate-850">
                  {activeCard.grammarNotes && (
                    <div className="space-y-1 text-left" dir="ltr">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Grammar Notes</span>
                      <p className="text-xs text-slate-300">{activeCard.grammarNotes}</p>
                    </div>
                  )}
                  {activeCard.pronunciationNotes && (
                    <div className="space-y-1 text-right">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">راهنمای تلفظ</span>
                      <p className="text-xs text-slate-300">{activeCard.pronunciationNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Buttons Row */}
        {!isRevealed ? (
          <div className="h-12"></div>
        ) : (
          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-800">
            {/* Grade 0 - Again */}
            <button
              onClick={() => handleGrade(0)}
              className="bg-red-950/40 border border-red-900/50 hover:bg-red-900/40 text-red-400 font-medium py-3 px-1 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-1"
            >
              <span className="text-xs">تکرار مجدد</span>
              <span className="text-[10px] opacity-75 font-mono">1</span>
            </button>

            {/* Grade 1 - Hard */}
            <button
              onClick={() => handleGrade(1)}
              className="bg-yellow-950/40 border border-yellow-900/50 hover:bg-yellow-900/40 text-yellow-400 font-medium py-3 px-1 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-1"
            >
              <span className="text-xs">سخت بود</span>
              <span className="text-[10px] opacity-75 font-mono">2</span>
            </button>

            {/* Grade 2 - Good */}
            <button
              onClick={() => handleGrade(2)}
              className="bg-sky-950/40 border border-sky-900/50 hover:bg-sky-900/40 text-sky-400 font-medium py-3 px-1 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-1"
            >
              <span className="text-xs">خوب بود</span>
              <span className="text-[10px] opacity-75 font-mono">3</span>
            </button>

            {/* Grade 3 - Easy */}
            <button
              onClick={() => handleGrade(3)}
              className="bg-green-950/40 border border-green-900/50 hover:bg-green-900/40 text-green-400 font-medium py-3 px-1 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-1"
            >
              <span className="text-xs">آسان بود</span>
              <span className="text-[10px] opacity-75 font-mono">4</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
