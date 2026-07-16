/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { executeAITask } from "../lib/ai";
import { Sparkles, Loader2, RefreshCw, PenTool, CheckCircle, HelpCircle, FileText, ChevronLeft, Award } from "lucide-react";

export default function WritingWorkspace() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Result States
  const [correctedText, setCorrectedText] = useState("");
  const [grammarFeedback, setGrammarFeedback] = useState<string[]>([]);
  const [vocabularyFeedback, setVocabularyFeedback] = useState<string[]>([]);
  const [fluencyScore, setFluencyScore] = useState<number | null>(null);
  const [overallComments, setOverallComments] = useState("");

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError("لطفاً ابتدا متنی را برای ارزیابی وارد کنید.");
      return;
    }

    setIsLoading(true);
    setError("");

    const systemInstruction = `You are an expert Cambridge/IELTS English examiner and professional editor specializing in British English.
Review the user's paragraph and correct any grammatical errors, unnatural phrasing, punctuation issues, or poor style.
Structure your evaluation strictly as valid JSON with this schema (Do not output markdown code blocks, return pure JSON):
{
  "correctedText": "The fully corrected paragraph, polished to sound highly natural, native, and in elegant British English",
  "grammarCorrections": [
    "Identify a specific grammatical mistake, original sentence -> corrected, and a brief explanation why in Farsi/Persian",
    "Identify another mistake with Farsi explanation if present"
  ],
  "vocabularyEnhancements": [
    "A suggestion of a more sophisticated British synonym or collocation, explaining the difference in Farsi/Persian",
    "Another word suggestion"
  ],
  "fluencyScore": 85, // Integer from 0 to 100 representing overall quality/naturalness
  "overallComments": "A warm, helpful general commentary and feedback in Farsi/Persian, encouraging the student and highlighting their strengths."
}`;

    const prompt = `Review, correct, and evaluate this English paragraph: "${inputText.trim()}"`;

    try {
      const response = await executeAITask("writingFeedback", prompt, systemInstruction, true);
      const cleanJson = response.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(cleanJson);

      setCorrectedText(result.correctedText || "");
      setGrammarFeedback(result.grammarCorrections || []);
      setVocabularyFeedback(result.vocabularyEnhancements || []);
      setFluencyScore(result.fluencyScore || 0);
      setOverallComments(result.overallComments || "");
    } catch (err: any) {
      console.error("AI writing correction error:", err);
      setError("ارزیابی متن با خطا مواجه شد. لطفاً کلید هوش مصنوعی پیش‌فرض یا کلید انتخابی رایتینگ را در بخش تنظیمات بررسی کنید.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInputText("");
    setCorrectedText("");
    setGrammarFeedback([]);
    setVocabularyFeedback([]);
    setFluencyScore(null);
    setOverallComments("");
    setError("");
  };

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* Description */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-xl font-semibold text-emerald-400 font-sans mb-1 flex items-center gap-2">
          <PenTool size={20} />
          <span>میز تحریر و تصحیح رایتینگ انگلیسی (Writing Suite)</span>
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          یک پاراگراف، یادداشت روزانه یا ایمیل به زبان انگلیسی بنویسید. هوش مصنوعی متن شما را تصحیح کرده، تفاوت‌ها را نشان می‌دهد و تحلیل کاملی از گرامر، دایره واژگان و اصطلاحات بریتانیایی به شما ارائه خواهد داد.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor (Right column) */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText size={16} className="text-emerald-400" />
                <span>نگارش متن انگلیسی شما</span>
              </h3>
              <button
                onClick={handleClear}
                className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                پاک کردن همه
              </button>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={12}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-200 font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500 text-left"
              placeholder="Write or paste your English text here..."
              dir="ltr"
              disabled={isLoading}
            />

            {error && (
              <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded-xl text-right">
                {error}
              </p>
            )}

            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/25"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>در حال بررسی و نگارش مجدد...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>بررسی و تصحیح هوشمند با هوش مصنوعی</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Panel (Left column) */}
        <div className="space-y-4">
          {!correctedText && !isLoading ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500 min-h-[460px] flex flex-col justify-center items-center">
              <Award className="opacity-20 mb-3 text-slate-400" size={48} />
              <p className="text-sm font-medium">آماده ارزیابی رایتینگ شما</p>
              <p className="text-xs mt-1 text-slate-600 max-w-[280px] leading-relaxed">پس از نوشتن متن در کادر مقابل، روی دکمه تصحیح کلیک کنید تا نمره فلوئنسی و نسخه بریتانیایی اصلاح‌شده را دریافت کنید.</p>
            </div>
          ) : isLoading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[460px] flex flex-col justify-center items-center space-y-4 text-center">
              <Loader2 className="animate-spin text-emerald-400" size={32} />
              <div>
                <p className="text-sm font-medium text-slate-300">هوش مصنوعی در حال تحلیل نگارش شماست</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[250px] leading-relaxed">ما در حال بررسی گرامر، واژگان بریتانیایی، لحن کلمات و بهینه‌سازی ساختار متن هستیم...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Score and Comments */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-4">
                {fluencyScore !== null && (
                  <div className="flex flex-col items-center justify-center bg-slate-950 border border-emerald-500/20 w-24 h-24 rounded-full text-center relative overflow-hidden shrink-0">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">امتیاز روانی</span>
                    <span className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">{fluencyScore}%</span>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500/10"></div>
                  </div>
                )}
                <div className="space-y-1.5 text-right flex-1">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">بازخورد کلی هوش مصنوعی:</h4>
                  <p className="text-sm text-slate-200 leading-relaxed italic">{overallComments}</p>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">مقایسه متن اصلاح‌شده بریتانیایی:</h4>
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-left" dir="ltr">
                  <p className="text-xs font-semibold text-emerald-400 uppercase mb-2">Corrected British Version:</p>
                  <p className="text-sm text-slate-100 leading-relaxed select-all font-sans">
                    {correctedText}
                  </p>
                </div>
              </div>

              {/* Detailed Corrections (Grammar + Vocabulary) */}
              {(grammarFeedback.length > 0 || vocabularyFeedback.length > 0) && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">نکات و تحلیل‌های آموزشی اختصاصی:</h4>
                  
                  {grammarFeedback.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-semibold text-red-400">اصلاحات گرامری و ساختاری:</h5>
                      <ul className="space-y-2 text-sm text-slate-300">
                        {grammarFeedback.map((g, idx) => (
                          <li key={idx} className="flex gap-2 items-start bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                            <span className="text-red-400 mt-1">•</span>
                            <span className="leading-relaxed text-xs">{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {vocabularyFeedback.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h5 className="text-xs font-semibold text-emerald-400">پیشنهادات لغات پیشرفته بریتانیایی:</h5>
                      <ul className="space-y-2 text-sm text-slate-300">
                        {vocabularyFeedback.map((v, idx) => (
                          <li key={idx} className="flex gap-2 items-start bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                            <span className="text-emerald-400 mt-1">•</span>
                            <span className="leading-relaxed text-xs">{v}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
