/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Settings as AppSettings, Card } from "./types";
import { getStoredSettings, initDB, getAllCards } from "./lib/db";
import { 
  BookOpen, 
  Sparkles, 
  Activity, 
  Layout, 
  Settings, 
  GraduationCap, 
  BookMarked, 
  PenTool, 
  Mic, 
  Menu, 
  X,
  Flame,
  FileText
} from "lucide-react";

// Components
import Dashboard from "./components/Dashboard";
import ReviewSystem from "./components/ReviewSystem";
import CardEditor from "./components/CardEditor";
import VocabularyBrowser from "./components/VocabularyBrowser";
import ReadingWorkspace from "./components/ReadingWorkspace";
import WritingWorkspace from "./components/WritingWorkspace";
import SpeakingWorkspace from "./components/SpeakingWorkspace";
import Statistics from "./components/Statistics";
import AIIntegrationHub from "./components/AIIntegrationHub";
import SettingsPage from "./components/Settings";

type Tab = 
  | "dashboard" 
  | "review" 
  | "addCard" 
  | "browser" 
  | "reading" 
  | "writing" 
  | "speaking" 
  | "statistics" 
  | "aiHub" 
  | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [theme, setTheme] = useState<AppSettings["theme"]>("dark");
  const [cards, setCards] = useState<Card[]>([]);
  const [dueCardsCount, setDueCardsCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    bootstrap();
    
    // Live clock for Bento Grid header
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-GB", { hour12: false }));
      setCurrentDate(now.toLocaleDateString("fa-IR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update theme classes on body/html
  useEffect(() => {
    const root = document.documentElement;
    root.className = "";
    if (theme === "light") {
      root.classList.add("bg-[#f8fafc]", "text-slate-800");
      document.body.style.backgroundColor = "#f8fafc";
      document.body.style.color = "#1e293b";
    } else if (theme === "sepia") {
      root.classList.add("bg-[#fdf6e3]", "text-[#5c4033]");
      document.body.style.backgroundColor = "#fdf6e3";
      document.body.style.color = "#5c4033";
    } else {
      root.classList.add("bg-[#0A0A0B]", "text-slate-100");
      document.body.style.backgroundColor = "#0A0A0B";
      document.body.style.color = "#f8fafc";
    }
  }, [theme]);

  const bootstrap = async () => {
    // 1. Initialize IndexedDB & Seed data
    await initDB();
    
    // 2. Load stored settings
    const stored = getStoredSettings();
    setTheme(stored.theme);

    // 3. Load active cards and review queue counts
    await refreshQueue();
  };

  const refreshQueue = async () => {
    const all = await getAllCards();
    setCards(all);

    const todayStr = new Date().toISOString().split("T")[0];
    const due = all.filter((c) => c.status !== "Suspended" && c.nextReviewDate <= todayStr);
    setDueCardsCount(due.length);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    refreshQueue();
  };

  // Nav Items
  const navItems = [
    { id: "dashboard", label: "داشبورد اصلی", icon: Layout },
    { id: "review", label: `مرور لایتنر (${dueCardsCount})`, icon: GraduationCap, highlight: dueCardsCount > 0 },
    { id: "addCard", label: "افزودن لغت جدید", icon: BookMarked },
    { id: "browser", label: "دفترچه واژگان", icon: BookOpen },
    { id: "reading", label: "روان‌خوانی مقالات", icon: FileText },
    { id: "writing", label: "میز تحریر (Writing)", icon: PenTool },
    { id: "speaking", label: "مکالمه و لهجه (Speaking)", icon: Mic },
    { id: "statistics", label: "نمودار پیشرفت و آمار", icon: Activity },
    { id: "aiHub", label: "درگاه هوش مصنوعی", icon: Sparkles },
    { id: "settings", label: "تنظیمات سیستمی", icon: Settings },
  ];

  // Map theme variables to apply to overall frame wrappers safely
  const getThemeClass = () => {
    if (theme === "light") {
      return "bg-[#f1f5f9] text-slate-800 border-slate-200";
    } else if (theme === "sepia") {
      return "bg-[#f5ebd3] text-[#5c4033] border-[#e4d5b7]";
    }
    return "bg-[#0A0A0B] text-slate-100 border-slate-800/50";
  };

  const getSubContainerClass = () => {
    if (theme === "light") {
      return "bg-white border-slate-200";
    } else if (theme === "sepia") {
      return "bg-[#faf4e8] border-[#e4d5b7]";
    }
    return "bg-[#121214] border-slate-800/50 shadow-2xl rounded-3xl";
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200`} dir="rtl">
      {/* Top Header Row styled after Bento theme */}
      <header className={`px-4 md:px-8 py-5 border-b flex justify-between items-center shrink-0 ${getThemeClass()}`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-extrabold text-base tracking-widest shadow-lg shadow-blue-500/20 border border-white/10">
            VR
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tighter text-white font-display">
              VAHID<span className="text-blue-500 underline underline-offset-4 decoration-2 italic">OS</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              Workspace Terminal v2.5 • وحید-روتینگ
            </p>
          </div>
        </div>

        {/* Live stats and clock */}
        <div className="flex items-center gap-6">
          {dueCardsCount > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono">
              <Flame size={14} className="animate-pulse text-blue-500" />
              <span>{dueCardsCount} DEFERRALS</span>
            </div>
          )}

          {currentTime && (
            <div className="text-left shrink-0 font-mono hidden md:block" dir="ltr">
              <div className="text-xl font-bold leading-none text-white tracking-tight">{currentTime}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1.5">{currentDate}</div>
            </div>
          )}

          {/* Hamburger menu for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        {/* Navigation Sidebar (Right-side for RTL Persian layout) */}
        <aside
          className={`w-full md:w-64 border-l p-4 flex-col gap-1 shrink-0 ${getThemeClass()} ${
            isMobileMenuOpen ? "flex absolute inset-x-0 top-0 z-50 h-auto" : "hidden md:flex"
          }`}
        >
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              let btnClass = "";
              if (isActive) {
                if (theme === "light") {
                  btnClass = "bg-blue-600 text-white font-semibold shadow-md";
                } else if (theme === "sepia") {
                  btnClass = "bg-[#5c4033] text-[#fdf6e3] font-semibold";
                } else {
                  btnClass = "bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-semibold shadow-lg shadow-blue-600/20 border border-white/10";
                }
              } else if (item.highlight) {
                btnClass = theme === "dark"
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                  : "bg-amber-500/10 text-amber-700 border border-amber-500/20 hover:bg-amber-500/20";
              } else {
                btnClass = theme === "dark"
                  ? "text-slate-400 hover:text-white hover:bg-slate-900/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50";
              }

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as Tab)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all ${btnClass}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Central Content Workspace Pane */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {activeTab === "dashboard" && (
              <Dashboard 
                onStartReview={() => handleTabChange("review")} 
                cardsDueCount={dueCardsCount}
                onNavigateToTab={(tab) => handleTabChange(tab as Tab)}
                theme={theme}
              />
            )}

            {activeTab === "review" && (
              <ReviewSystem 
                cardsDue={cards.filter((c) => c.status !== "Suspended" && c.nextReviewDate <= new Date().toISOString().split("T")[0])}
                onReviewFinished={async () => {
                  await refreshQueue();
                  handleTabChange("dashboard");
                }} 
              />
            )}

            {activeTab === "addCard" && (
              <CardEditor 
                onSave={async (newCard) => {
                  await refreshQueue();
                  handleTabChange("browser");
                }}
                onCancel={() => handleTabChange("dashboard")}
              />
            )}

            {activeTab === "browser" && (
              <VocabularyBrowser 
                onAddCardTriggered={() => handleTabChange("addCard")}
              />
            )}

            {activeTab === "reading" && <ReadingWorkspace />}

            {activeTab === "writing" && <WritingWorkspace />}

            {activeTab === "speaking" && <SpeakingWorkspace />}

            {activeTab === "statistics" && <Statistics />}

            {activeTab === "aiHub" && <AIIntegrationHub />}

            {activeTab === "settings" && (
              <SettingsPage 
                onThemeChanged={(newTheme) => setTheme(newTheme)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Footer copyright */}
      <footer className={`py-3 text-center text-[10px] text-slate-500 border-t ${getThemeClass()}`}>
        <span>طراحی و اجرا برای مهد آموزش زبان بریتانیایی وحید-روتینگ • کاملاً آفلاین و محلی (IndexedDB)</span>
      </footer>
    </div>
  );
}
