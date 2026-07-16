/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { executeAITask } from "../lib/ai";
import { Mic, MicOff, Volume2, Sparkles, Loader2, Play, CornerDownLeft, Info, HelpCircle, RefreshCw, CheckCircle } from "lucide-react";

interface SpeechChallenge {
  id: string;
  sentence: string;
  ipa: string;
  category: "Idiom" | "Collocation" | "Intonation" | "Tongue Twister";
  farsiTranslation: string;
}

const SPEAKING_CHALLENGES: SpeechChallenge[] = [
  {
    id: "sc-1",
    sentence: "An apple of discord in the family.",
    ipa: "/ən ˈæp.əl əv ˈdɪs.kɔːd ɪn ðə ˈfæm.əl.i/",
    category: "Collocation",
    farsiTranslation: "مایه نفاق و تفرقه در خانواده.",
  },
  {
    id: "sc-2",
    sentence: "She sells seashells by the seashore.",
    ipa: "/ʃiː selz ˈsiː.ʃelz baɪ ðə ˈsiː.ʃɔːr/",
    category: "Tongue Twister",
    farsiTranslation: "او صدف‌های دریایی را در ساحل می‌فروشد. (چالش تلفظ s و sh)",
  },
  {
    id: "sc-3",
    sentence: "Bite off more than you can chew.",
    ipa: "/baɪt ɒf mɔːr ðæn juː kæn tʃuː/",
    category: "Idiom",
    farsiTranslation: "لقمه بزرگتر از دهان برداشتن.",
  },
  {
    id: "sc-4",
    sentence: "A ubiquitous and pervasive influence on society.",
    ipa: "/ə juːˈbɪk.wɪ.təs ənd pəˈveɪ.sɪv ˈɪn.flu.əns ɒn səˈsaɪ.ə.ti/",
    category: "Intonation",
    farsiTranslation: "نفوذی فراگیر و همه‌جانبه بر جامعه.",
  }
];

export default function SpeakingWorkspace() {
  const [challenges] = useState<SpeechChallenge[]>(SPEAKING_CHALLENGES);
  const [activeIdx, setActiveIdx] = useState(0);
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [recognitionError, setRecognitionError] = useState("");
  const [isAILoading, setIsAILoading] = useState(false);
  
  // Evaluation Result States
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const [missingWords, setMissingWords] = useState<string[]>([]);
  const [phoneticTips, setPhoneticTips] = useState<string[]>([]);
  const [coachingAdvice, setCoachingAdvice] = useState("");

  const recognitionRef = useRef<any>(null);

  const activeChallenge = challenges[activeIdx];

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = "en-GB"; // Target British English transcription
      rec.interimResults = false;

      rec.onstart = () => {
        setIsRecording(true);
        setTranscribedText("");
        setRecognitionError("");
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        setTranscribedText(resultText);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setRecognitionError("دسترسی به میکروفون داده نشده است. لطفاً تنظیمات مجوز مرورگر را بررسی کنید.");
        } else {
          setRecognitionError("خطایی در شناسایی صدا رخ داد. لطفاً دوباره تلاش کنید.");
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    } else {
      setRecognitionError("مرورگر شما از Speech Recognition پشتیبانی نمی‌کند. از Google Chrome استفاده نمایید.");
    }
  }, []);

  const handleStartRecording = () => {
    if (recognitionRef.current) {
      setPronunciationScore(null);
      setPhoneticTips([]);
      setCoachingAdvice("");
      setMissingWords([]);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Start recognition error:", err);
      }
    } else {
      alert("میکروفون یا ابزار تشخیص گفتار در این مرورگر در دسترس نیست.");
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const playBritishPronunciation = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(activeChallenge.sentence);
    const voices = window.speechSynthesis.getVoices();
    const gbVoice = voices.find(
      (v) => v.lang.includes("en-GB") || v.name.toLowerCase().includes("british")
    ) || voices.find((v) => v.lang.startsWith("en"));
    if (gbVoice) utterance.voice = gbVoice;
    utterance.rate = 0.8; // Clear slow rate
    window.speechSynthesis.speak(utterance);
  };

  const handleGetAIFeedback = async () => {
    if (!transcribedText) return;

    setIsAILoading(true);

    const systemInstruction = `You are an expert British accent coach (RP accent) and speech pathologist.
Compare the "Target Sentence" with what the user actually said ("Transcribed Speech").
Analyze phonetic errors, dropped letters, omitted words, or accent discrepancies.
Provide a highly encouraging evaluation in Farsi/Persian.
Output strictly as valid JSON matching this schema:
{
  "pronunciationScore": 88, // Int from 0 to 100
  "missingOrMispronouncedWords": ["word1", "word2"], // Words that the user skipped or mispronounced
  "phoneticTips": [
    "Tip 1 in Persian: detailed mouth, tongue position or stress advice",
    "Tip 2 in Persian: detail"
  ],
  "coachingAdvice": "Overall coaching commentary in Persian, guiding them to sound more native and fluent."
}`;

    const prompt = `Target Sentence: "${activeChallenge.sentence}"
Transcribed Speech: "${transcribedText}"
Please perform a British English accent audit.`;

    try {
      const response = await executeAITask("pronunciationEvaluation", prompt, systemInstruction, true);
      const cleanJson = response.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(cleanJson);

      setPronunciationScore(result.pronunciationScore || 0);
      setMissingWords(result.missingOrMispronouncedWords || []);
      setPhoneticTips(result.phoneticTips || []);
      setCoachingAdvice(result.coachingAdvice || "");
    } catch (err: any) {
      console.error("Pronunciation AI feedback failed:", err);
      setCoachingAdvice("ارزیابی تلفظ با خطا مواجه شد. لطفاً کلید هوش مصنوعی پیش‌فرض یا انتخابی اسپیکینگ را در بخش تنظیمات بررسی کنید.");
    } finally {
      setIsAILoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* Description */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-xl font-semibold text-emerald-400 font-sans mb-1 flex items-center gap-2">
          <Mic size={20} />
          <span>میز مکالمه و سنجش لهجه بریتانیایی (Speaking Suite)</span>
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          تلفظ صحیح جملات را بشنوید، صدای خود را ضبط کنید و با کمک موتور تحلیل گفتار بومی و مربی تلفظ هوش مصنوعی، نقاط ضعف تلفظی، ادغام کلمات و تکیه‌های لهجه بریتانیایی (RP Accent) را اصلاح کنید.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Middle: Interactive challenge, record and audio output */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            {/* Header: Select challenge */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-300">چالش‌های گفتاری روزانه</h3>
              <div className="flex gap-1.5">
                {challenges.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveIdx(idx);
                      setTranscribedText("");
                      setPronunciationScore(null);
                      setPhoneticTips([]);
                      setCoachingAdvice("");
                      setMissingWords([]);
                    }}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      activeIdx === idx
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Speaking challenge card */}
            <div className="bg-slate-950 border border-slate-850 p-6 rounded-xl space-y-4 text-center">
              <div className="flex justify-center">
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider font-mono">
                  {activeChallenge.category}
                </span>
              </div>
              
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide font-sans text-left dir-ltr select-all">
                {activeChallenge.sentence}
              </h2>
              
              <div className="flex justify-between items-center text-xs text-slate-400 max-w-md mx-auto pt-2">
                <span className="font-mono text-left tracking-wider">{activeChallenge.ipa}</span>
                <span className="text-slate-300 font-medium">{activeChallenge.farsiTranslation}</span>
              </div>
            </div>

            {/* Interaction Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={playBritishPronunciation}
                className="flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-slate-200 py-3.5 px-4 rounded-xl text-xs transition-all font-medium"
              >
                <Volume2 className="text-emerald-400" size={16} />
                <span>شنیدن تلفظ صحیح بریتانیایی (British RP)</span>
              </button>

              {isRecording ? (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3.5 px-4 rounded-xl text-xs transition-all font-medium animate-pulse"
                >
                  <MicOff size={16} />
                  <span>پایان ضبط صدا (در حال گوش دادن...)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 px-4 rounded-xl text-xs transition-all font-medium shadow-lg shadow-emerald-950/20"
                >
                  <Mic size={16} />
                  <span>ضبط و تلفظ جمله چالش</span>
                </button>
              )}
            </div>

            {/* Error or speech results */}
            {recognitionError && (
              <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-3 rounded-xl text-right">
                {recognitionError}
              </p>
            )}

            {/* Transcribed text block */}
            {transcribedText && (
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>گفتار شناسایی‌شده شما (Your Speech):</span>
                  <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-medium">میکروفون فعال بود</span>
                </div>
                <p className="text-base text-slate-200 font-semibold text-left font-sans select-all" dir="ltr">
                  "{transcribedText}"
                </p>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleGetAIFeedback}
                    disabled={isAILoading}
                    className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-emerald-400 py-2 px-4 rounded-lg text-xs font-semibold transition-all"
                  >
                    {isAILoading ? (
                      <Loader2 className="animate-spin text-emerald-400" size={14} />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    <span>ارزیابی تلفظ و لهجه با هوش مصنوعی</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Pronunciation feedback coach */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 min-h-[420px] flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2.5 flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400" />
                <span>آنالیز صوتی و مربی آواشناسی (AI Coach)</span>
              </h3>

              {!coachingAdvice && !isAILoading ? (
                <div className="py-16 text-center text-slate-500 space-y-2">
                  <HelpCircle className="mx-auto opacity-30" size={36} />
                  <p className="text-xs">منتظر گفتار شما</p>
                  <p className="text-[10px] text-slate-600 max-w-[180px] mx-auto leading-relaxed">جمله را تلفظ کنید، سپس دکمه سنجش تلفظ را فشار دهید تا مربی آواشناسی ایرادات را تحلیل کند.</p>
                </div>
              ) : isAILoading ? (
                <div className="py-16 text-center text-slate-400 space-y-3">
                  <Loader2 className="animate-spin mx-auto text-emerald-400" size={24} />
                  <p className="text-xs font-medium">مربی صوتی در حال بررسی لهجه شماست...</p>
                  <p className="text-[10px] text-slate-600 leading-relaxed">تحلیل الگوهای آوایی، تکیه‌ها و ساختار فک و زبان کلمات...</p>
                </div>
              ) : (
                <div className="space-y-4 text-right">
                  {/* Score */}
                  {pronunciationScore !== null && (
                    <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center font-mono font-bold text-lg">
                        {pronunciationScore}
                      </div>
                      <div className="text-xs">
                        <span className="text-slate-400 block">نمره فلوئنسی تلفظ:</span>
                        <span className="font-semibold text-emerald-400">کوشش عالی!</span>
                      </div>
                    </div>
                  )}

                  {/* Missing/Mispronounced words */}
                  {missingWords.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold text-red-400 block">کلمات نیازمند تکرار و دقت بیشتر:</span>
                      <div className="flex flex-wrap gap-1.5" dir="ltr">
                        {missingWords.map((word, idx) => (
                          <span key={idx} className="bg-red-950/20 border border-red-900/30 text-red-400 text-xs px-2 py-0.5 rounded font-medium">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General Coaching Comment */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 block">بازخورد کلیدی مربی:</span>
                    <p className="text-xs text-slate-200 leading-relaxed italic">{coachingAdvice}</p>
                  </div>

                  {/* Specific tips */}
                  {phoneticTips.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-850">
                      <span className="text-[10px] font-semibold text-emerald-400 block">راهنمای تولید صدا در دهان:</span>
                      <ul className="space-y-1.5 text-slate-300">
                        {phoneticTips.map((tip, idx) => (
                          <li key={idx} className="flex gap-1.5 items-start bg-slate-950/30 p-2 rounded border border-slate-850">
                            <span className="text-emerald-400 mt-1">•</span>
                            <span className="text-[11px] leading-relaxed">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Disclaimer */}
            <div className="text-[9px] text-slate-600 bg-slate-950/40 border border-slate-850 p-2.5 rounded-lg mt-4 flex items-start gap-1.5">
              <Info size={11} className="shrink-0 text-slate-500 mt-0.5" />
              <p className="leading-relaxed">این سیستم تحلیل از تلفظ بومی بریتانیایی (RP Accent) به عنوان استاندارد صوتی طلایی در آواشناسی استفاده می‌کند.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
