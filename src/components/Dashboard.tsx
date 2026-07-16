/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Card, StudySession } from "../types";
import { getAllCards, getAllStudySessions } from "../lib/db";
import { executeAITask } from "../lib/ai";
import { Play, Calendar, CheckCircle2, Flame, Sparkles, BookOpen, Clock, Loader2, Award, ArrowUpRight, RefreshCw } from "lucide-react";

interface DashboardProps {
  onStartReview: () => void;
  cardsDueCount: number;
  onNavigateToTab: (tabName: string) => void;
  theme?: string;
}

export default function Dashboard({ onStartReview, cardsDueCount, onNavigateToTab, theme }: DashboardProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  
  // AI Daily Tip state
  const [aiTip, setAiTip] = useState<{ quote: string; explanation: string; idiom: string } | null>(null);
  const [isTipLoading, setIsTipLoading] = useState(false);

  useEffect(() => {
    loadData();
    fetchDailyAiTip();
  }, []);

  const loadData = async () => {
    const c = await getAllCards();
    const s = await getAllStudySessions();
    setCards(c);
    setSessions(s);
  };

  // Calculate today's stats
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySession = sessions.find((s) => s.date === todayStr);

  const reviewsCompletedToday = todaySession ? todaySession.cardsReviewed : 0;
  const accuracyToday = todaySession && todaySession.cardsReviewed > 0
    ? Math.round((todaySession.correctReviews / todaySession.cardsReviewed) * 100)
    : 0;
  const timeSpentTodayMin = todaySession ? Math.round(todaySession.timeSpentSec / 60) : 0;

  // Active status groups
  const cardsLearnedCount = cards.filter((c) => c.status === "Review").length;
  const cardsLearningCount = cards.filter((c) => c.status === "Learning").length;

  const fetchDailyAiTip = async () => {
    // Attempt to load from localStorage so we don't query AI unnecessarily on every single load
    const cachedTip = localStorage.getItem("vahid_daily_tip");
    const cachedDate = localStorage.getItem("vahid_daily_tip_date");

    if (cachedTip && cachedDate === todayStr) {
      try {
        setAiTip(JSON.parse(cachedTip));
        return;
      } catch (e) {
        // Parse error, query again
      }
    }

    setIsTipLoading(true);
    const systemInstruction = `You are a friendly bilingual English-Persian language tutor.
Generate a beautiful English learning pack. Return strictly as valid JSON (Do not wrap in markdown or backticks):
{
  "idiom": "An advanced British English phrasal verb, expression or idiom, e.g. Call it a day",
  "explanation": "Clear explanation of the idiom and when to use it, written in Persian/Farsi",
  "quote": "A short, beautiful motivational quote in English about dedication, persistence or learning"
}`;

    const prompt = `Generate today's English tip and motivational quote for a Persian learner. Accentuate British English style.`;

    try {
      const response = await executeAITask("vocabularyExplanation", prompt, systemInstruction, true);
      const cleanJson = response.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      
      setAiTip(parsed);
      localStorage.setItem("vahid_daily_tip", JSON.stringify(parsed));
      localStorage.setItem("vahid_daily_tip_date", todayStr);
    } catch (err) {
      console.error("AI Daily Tip failed:", err);
      // High-quality rotating bilingual fallbacks
      const fallbacks = [
        {
          idiom: "Bite the bullet",
          explanation: "دندان روی جگر گذاشتن و با شجاعت با یک موقعیت سخت یا ناگزیر روبرو شدن. مثلاً وقتی با وجود تمام سختی‌ها تصمیم راسخ می‌گیرید خواندن لغات انگلیسی را شروع کنید.",
          quote: "The only way to do great work is to love what you do."
        },
        {
          idiom: "Break a leg",
          explanation: "عبارتی بریتانیایی برای آرزوی موفقیت کردن؛ به ویژه پیش از رفتن روی صحنه، شرکت در آزمون یا شروع کاری مهم. معادل 'موفق باشی' خودمان.",
          quote: "Success is not final, failure is not fatal: it is the courage to continue that counts."
        },
        {
          idiom: "Call it a day",
          explanation: "دست کشیدن از کار یا متوقف کردن فعالیت روزانه به این دلیل که کار کافی انجام شده یا بیش از حد خسته شده‌اید. گزینه‌ای عالی برای انتهای یک جلسه مطالعه پربار!",
          quote: "It does not matter how slowly you go as long as you do not stop."
        },
        {
          idiom: "Piece of cake",
          explanation: "مثل آب خوردن! کاری که انجام دادنش بسیار ساده و بی‌دردسر است. لغات امروز را به حافظه بسپارید تا آزمون‌ها برایتان piece of cake شوند.",
          quote: "Believe you can and you're halfway there."
        },
        {
          idiom: "Burn the midnight oil",
          explanation: "تا دیروقت بیدار ماندن و سخت کار کردن یا درس خواندن. ریشه این اصطلاح محبوب بریتانیایی به دوران استفاده از چراغ‌های نفتی برمی‌گردد.",
          quote: "The beautiful thing about learning is that nobody can take it away from you."
        },
        {
          idiom: "Hit the nail on the head",
          explanation: "زدن به هدف یا زدن حرف آخر؛ اشاره به انجام کاری یا گفتن حرفی که دقیقاً درست، هوشمندانه و به‌جا است.",
          quote: "Your talent determines what you can do. Your motivation determines how much you are willing to do."
        },
        {
          idiom: "Spill the beans",
          explanation: "بند را آب دادن یا رازی را فاش کردن. معمولاً به طور غیرعمدی یا پیش از موعد مقرر.",
          quote: "Education is the most powerful weapon which you can use to change the world."
        },
        {
          idiom: "Through thick and thin",
          explanation: "در خوشی‌ها و ناخوشی‌ها؛ یعنی تحت هر شرایطی و با وجود تمام موانع و سختی‌های مسیر، وفادار ماندن به یک هدف.",
          quote: "Continuous effort - not strength or intelligence - is the key to unlocking our potential."
        },
        {
          idiom: "Once in a blue moon",
          explanation: "قرنی یک بار! کاری که بسیار به ندرت و خیلی کم اتفاق می‌افتد. برعکسِ مطالعه لایتنر شما که باید کاملاً منظم و روزانه باشد!",
          quote: "A person who never made a mistake never tried anything new."
        },
        {
          idiom: "By the skin of your teeth",
          explanation: "به سختی یا با مویی فاصله از خطر گریختن یا کاری را انجام دادن. معادل 'مویی نجات یافتن' یا 'لب مرز رد شدن'.",
          quote: "Learn as if you were to live forever; live as if you were to die tomorrow."
        }
      ];
      const randomIndex = new Date().getDate() % fallbacks.length;
      const fallback = fallbacks[randomIndex];
      setAiTip(fallback);
    } finally {
      setIsTipLoading(false);
    }
  };

  const getLast7DaysStats = () => {
    const stats = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split("T")[0];
      const daySession = sessions.find((s) => s.date === dStr);
      stats.push({
        dayName: d.toLocaleDateString("fa-IR", { weekday: "narrow" }),
        dateStr: dStr,
        count: daySession ? daySession.cardsReviewed : 0,
      });
    }
    const maxCount = Math.max(...stats.map((s) => s.count), 5); // scale height with base min of 5
    return stats.map((s) => ({
      ...s,
      heightPct: Math.min(100, Math.round((s.count / maxCount) * 100)),
    }));
  };
  const last7Days = getLast7DaysStats();

  const isDark = theme !== "light" && theme !== "sepia";

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Section: Hero + Activity (Bento Grid Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hero Welcome Card */}
        <div className={`lg:col-span-2 border rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col justify-between shadow-2xl transition-all duration-200 ${
          isDark
            ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-white/10"
            : theme === "sepia"
            ? "bg-[#faf4e8] text-[#5c4033] border-[#e4d5b7]"
            : "bg-white text-slate-800 border-slate-200"
        }`}>
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none select-none">
            <div className="text-9xl font-bold font-sans">01</div>
          </div>

          <div className="space-y-3 max-w-xl text-right">
            <div className="flex justify-between items-center">
              <span className={`px-3 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider ${
                isDark 
                  ? "bg-white/10 text-white border-white/20" 
                  : "bg-blue-500/10 text-blue-600 border-blue-500/20"
              }`}>
                {cardsDueCount > 0 ? `${cardsDueCount} لغت در صف مرور` : "آماده و به‌روز"}
              </span>
            </div>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">
              سلام، به مهد آموزش هوشمند <span className={isDark ? "text-emerald-300 font-extrabold" : "text-blue-600 font-extrabold"}>وحید-روتینگ</span> خوش آمدید!
            </h1>
            <p className={`text-sm leading-relaxed ${isDark ? "text-blue-100/80" : "text-slate-500"}`}>
              امروز <strong className="font-semibold">{cardsDueCount}</strong> کارت لایتنر آماده مرور دارید. با صرف زمان کوتاهی در روز، یادگیری خود را تثبیت کنید.
            </p>
          </div>

          <div className="mt-8 flex justify-end">
            {cardsDueCount > 0 ? (
              <button
                onClick={onStartReview}
                className={`flex items-center gap-2 font-bold py-3.5 px-8 rounded-2xl transition-all shadow-xl hover:scale-[1.02] transform text-sm w-full md:w-auto justify-center cursor-pointer ${
                  isDark
                    ? "bg-white text-blue-900 hover:bg-slate-100"
                    : "bg-blue-600 text-white hover:bg-blue-500"
                }`}
              >
                <Play size={18} fill="currentColor" />
                <span>شروع جلسه مرور سریع ({cardsDueCount} کارت)</span>
              </button>
            ) : (
              <div className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-semibold w-full md:w-auto justify-center border ${
                isDark
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : "bg-emerald-50/50 border-emerald-100 text-emerald-600"
              }`}>
                <CheckCircle2 size={16} />
                <span>همه مرورهای امروز انجام شده‌اند. عالیه!</span>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Activity Performance Graph */}
        <div className={`border rounded-3xl p-6 flex flex-col justify-between shadow-2xl transition-all duration-200 ${
          isDark ? "bg-[#121214] border-slate-800/50 text-slate-200" : theme === "sepia" ? "bg-[#faf4e8] text-[#5c4033] border-[#e4d5b7]" : "bg-white text-slate-800 border-slate-200"
        }`}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>تحلیل عملکرد هفتگی (Throughput)</h3>
              <p className="text-xs font-semibold mt-1">تعداد لغات مطالعه‌شده در ۷ روز گذشته</p>
            </div>
            <div className="flex gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className={`w-2.5 h-2.5 rounded-full ${isDark ? "bg-slate-850" : "bg-slate-200"}`}></span>
            </div>
          </div>

          <div className="flex-1 flex items-end gap-3 h-28 pt-4" dir="ltr">
            {last7Days.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Visual bar */}
                <div 
                  className={`w-full rounded-t-lg transition-all duration-300 ${
                    day.count > 0 
                      ? "bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 shadow-md shadow-blue-500/10" 
                      : isDark ? "bg-slate-800/40" : "bg-slate-100"
                  }`}
                  style={{ height: `${day.heightPct || 4}%` }}
                  title={`${day.count} واژه`}
                ></div>
                
                <span className={`text-[10px] font-medium mt-2 uppercase ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  {day.dayName}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between items-center">
            <span className={`text-[9px] font-mono uppercase tracking-wider ${isDark ? "text-slate-600" : "text-slate-400"}`}>
              METRIC ENG: INTEGRATED
            </span>
            <span className={`text-xs font-bold font-mono ${isDark ? "text-blue-400" : "text-blue-600"}`}>
              {sessions.reduce((acc, s) => acc + s.cardsReviewed, 0)} لغات مرورشده
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row (Bento Grid Style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className={`border p-5 rounded-3xl flex items-center gap-4 transition-all duration-200 ${
          isDark ? "bg-[#121214] border-slate-800/50 shadow-lg text-slate-100" : theme === "sepia" ? "bg-[#faf4e8] text-[#5c4033] border-[#e4d5b7]" : "bg-white text-slate-800 border-slate-200 shadow-sm"
        }`}>
          <div className="w-11 h-11 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/10">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className={`text-[10px] block font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>مرورهای امروز</span>
            <span className={`text-base font-extrabold font-mono tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>{reviewsCompletedToday} <span className="text-xs font-normal text-slate-400">لغت</span></span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className={`border p-5 rounded-3xl flex items-center gap-4 transition-all duration-200 ${
          isDark ? "bg-[#121214] border-slate-800/50 shadow-lg text-slate-100" : theme === "sepia" ? "bg-[#faf4e8] text-[#5c4033] border-[#e4d5b7]" : "bg-white text-slate-800 border-slate-200 shadow-sm"
        }`}>
          <div className="w-11 h-11 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/10">
            <Clock size={20} />
          </div>
          <div>
            <span className={`text-[10px] block font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>زمان مطالعه</span>
            <span className={`text-base font-extrabold font-mono tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>{timeSpentTodayMin} <span className="text-xs font-normal text-slate-400">دقیقه</span></span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className={`border p-5 rounded-3xl flex items-center gap-4 transition-all duration-200 ${
          isDark ? "bg-[#121214] border-slate-800/50 shadow-lg text-slate-100" : theme === "sepia" ? "bg-[#faf4e8] text-[#5c4033] border-[#e4d5b7]" : "bg-white text-slate-800 border-slate-200 shadow-sm"
        }`}>
          <div className="w-11 h-11 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/10">
            <Award size={20} />
          </div>
          <div>
            <span className={`text-[10px] block font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>دقت یادگیری</span>
            <span className={`text-base font-extrabold font-mono tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>{accuracyToday}%</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className={`border p-5 rounded-3xl flex items-center gap-4 transition-all duration-200 ${
          isDark ? "bg-[#121214] border-slate-800/50 shadow-lg text-slate-100" : theme === "sepia" ? "bg-[#faf4e8] text-[#5c4033] border-[#e4d5b7]" : "bg-white text-slate-800 border-slate-200 shadow-sm"
        }`}>
          <div className="w-11 h-11 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-500/10">
            <BookOpen size={20} />
          </div>
          <div>
            <span className={`text-[10px] block font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>کل واژه‌ها</span>
            <span className={`text-base font-extrabold font-mono tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>{cards.length} <span className="text-xs font-normal text-slate-400">کارت</span></span>
          </div>
        </div>
      </div>

      {/* Insights + Status (Bento Grid Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* AI Daily Tip & Motivation Card */}
        <div className={`lg:col-span-2 border rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-2xl transition-all duration-200 ${
          isDark ? "bg-[#121214] border-slate-800/50 text-slate-200" : theme === "sepia" ? "bg-[#faf4e8] text-[#5c4033] border-[#e4d5b7]" : "bg-white text-slate-800 border-slate-200"
        }`}>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-3.5 border-slate-800/50">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
                <span>برگ زرین روزانه هوش مصنوعی (Daily Insights)</span>
              </h3>
              <button
                onClick={fetchDailyAiTip}
                disabled={isTipLoading}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isDark ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-white" : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800"
                }`}
                title="تولید دوباره"
              >
                <RefreshCw size={14} className={isTipLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {isTipLoading ? (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <Loader2 className="animate-spin mx-auto text-blue-500" size={24} />
                <p className="text-xs font-medium">در حال مشورت با هوش مصنوعی برای تولید چالش امروز...</p>
              </div>
            ) : aiTip ? (
              <div className="space-y-4 text-right">
                {/* Idiom Box */}
                <div className={`border p-5 rounded-2xl text-left ${
                  isDark ? "bg-slate-950/50 border-slate-850/50" : "bg-slate-50 border-slate-100"
                }`} dir="ltr">
                  <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                    Today's British Idiom / Phrase:
                  </span>
                  <h4 className={`text-lg font-bold font-sans mb-2 ${isDark ? "text-white" : "text-slate-800"}`}>{aiTip.idiom}</h4>
                  <p className={`text-xs leading-relaxed text-right mt-1.5 ${isDark ? "text-slate-300" : "text-slate-600"}`} dir="rtl">
                    💡 <strong>توضیح مربی:</strong> {aiTip.explanation}
                  </p>
                </div>

                {/* Quote Box */}
                <div className="text-center py-2 space-y-1 select-all" dir="ltr">
                  <p className={`text-sm italic font-sans ${isDark ? "text-slate-300" : "text-slate-600"}`}>"{aiTip.quote}"</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="pt-3 border-t border-slate-800/50 flex justify-between items-center text-xs text-slate-500">
            <span>تاریخ امروز: <strong className="font-mono text-slate-400">{new Date().toLocaleDateString("fa-IR")}</strong></span>
            <span className="flex items-center gap-1">
              <Flame size={13} className="text-red-400" />
              <span>موتور هوش مصنوعی بومی فعال است</span>
            </span>
          </div>
        </div>

        {/* Learning Status Breakdown Card */}
        <div className={`border rounded-3xl p-6 space-y-4 flex flex-col justify-between shadow-2xl transition-all duration-200 ${
          isDark ? "bg-[#121214] border-slate-800/50 text-slate-200" : theme === "sepia" ? "bg-[#faf4e8] text-[#5c4033] border-[#e4d5b7]" : "bg-white text-slate-800 border-slate-200"
        }`}>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-3.5 border-slate-800/50">پوشش تسلط لایتنر</h3>
            
            <div className="space-y-5">
              {/* Review gauge */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>لغات کاملاً تثبیت‌شده (Review)</span>
                  <span className={`font-bold font-mono ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>{cardsLearnedCount} لغت</span>
                </div>
                <div className={`w-full h-2.5 rounded-full overflow-hidden border ${isDark ? "bg-slate-950 border-slate-850" : "bg-slate-100 border-slate-200"}`}>
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${cards.length > 0 ? (cardsLearnedCount / cards.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Learning gauge */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>لغات در حال یادگیری (Learning)</span>
                  <span className={`font-bold font-mono ${isDark ? "text-amber-400" : "text-amber-600"}`}>{cardsLearningCount} لغت</span>
                </div>
                <div className={`w-full h-2.5 rounded-full overflow-hidden border ${isDark ? "bg-slate-950 border-slate-850" : "bg-slate-100 border-slate-200"}`}>
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${cards.length > 0 ? (cardsLearningCount / cards.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Total list cards */}
              <div className={`p-4 rounded-2xl border flex justify-between items-center ${isDark ? "bg-slate-950/40 border-slate-850" : "bg-slate-50 border-slate-200"}`}>
                <div className="text-right">
                  <span className={`text-[10px] block ${isDark ? "text-slate-500" : "text-slate-400"}`}>دفتر واژگان کلی</span>
                  <span className="text-xs font-bold">{cards.length} لغت ثبت شده</span>
                </div>
                <button
                  onClick={() => onNavigateToTab("browser")}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    isDark ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white" : "bg-white border-slate-250 text-slate-600 hover:text-slate-800 hover:shadow"
                  }`}
                  title="نمایش دفتر لغت"
                >
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 leading-relaxed text-right pt-3 border-t border-slate-800/50">
            💡 <strong>توصیه حافظه:</strong> روش SM-2 برای بهینه‌ترین زمان بازخوانی طراحی شده؛ مرورها را منظم و بدون فاصله انجام دهید.
          </div>
        </div>
      </div>
    </div>
  );
}
