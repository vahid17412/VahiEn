/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Card } from "../types";
import { getAllCards, saveCard, deleteCard } from "../lib/db";
import { Search, Filter, ArrowUpDown, Edit3, Copy, Trash2, ShieldAlert, Sparkles, Plus, AlertCircle, FileEdit, Volume2 } from "lucide-react";
import CardEditor from "./CardEditor";

interface VocabularyBrowserProps {
  onAddCardTriggered?: () => void;
}

export default function VocabularyBrowser({ onAddCardTriggered }: VocabularyBrowserProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"createdAt" | "word" | "nextReviewDate">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Edit states
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    const all = await getAllCards();
    setCards(all);
  };

  const handleEditCard = (card: Card) => {
    setEditingCard(card);
    setIsEditorOpen(true);
  };

  const handleDuplicateCard = async (card: Card) => {
    const duplicated: Card = {
      ...card,
      id: `card-dup-${Date.now()}`,
      word: `${card.word} (Copy)`,
      createdAt: new Date().toISOString(),
      repetitions: 0,
      interval: 0,
      status: "New",
      nextReviewDate: new Date().toISOString().split("T")[0],
    };
    await saveCard(duplicated);
    loadCards();
  };

  const handleDeleteCard = async (cardId: string) => {
    if (confirm("آیا مطمئن هستید که می‌خواهید این کارت را حذف کنید؟")) {
      await deleteCard(cardId);
      loadCards();
    }
  };

  const handleToggleSuspendCard = async (card: Card) => {
    const isCurrentlySuspended = card.status === "Suspended";
    const updated: Card = {
      ...card,
      status: isCurrentlySuspended ? "New" : "Suspended",
    };
    await saveCard(updated);
    loadCards();
  };

  const handleSaveEditedCard = async (updatedCard: Card) => {
    await saveCard(updatedCard);
    setIsEditorOpen(false);
    setEditingCard(null);
    loadCards();
  };

  const speakWord = (text: string) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const gbVoice = voices.find(
      (v) => v.lang.includes("en-GB") || v.name.toLowerCase().includes("british")
    ) || voices.find((v) => v.lang.startsWith("en"));
    if (gbVoice) utterance.voice = gbVoice;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Get all unique tags from cards
  const allTags = Array.from(new Set(cards.flatMap((c) => c.tags))).filter(Boolean);

  // Filter & Sort cards
  const filteredCards = cards
    .filter((card) => {
      // Search matching
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        card.word.toLowerCase().includes(query) ||
        card.definition.toLowerCase().includes(query) ||
        card.translation.toLowerCase().includes(query) ||
        card.tags.some((t) => t.toLowerCase().includes(query));

      // Difficulty matching
      const matchesDifficulty = selectedDifficulty === "All" || card.difficulty === selectedDifficulty;

      // Status matching
      const matchesStatus = selectedStatus === "All" || card.status === selectedStatus;

      // Tag matching
      const matchesTag = selectedTag === "All" || card.tags.includes(selectedTag);

      return matchesSearch && matchesDifficulty && matchesStatus && matchesTag;
    })
    .sort((a, b) => {
      let fieldA: any = a[sortBy] || "";
      let fieldB: any = b[sortBy] || "";

      if (typeof fieldA === "string") {
        fieldA = fieldA.toLowerCase();
        fieldB = fieldB.toLowerCase();
      }

      if (fieldA < fieldB) return sortOrder === "asc" ? -1 : 1;
      if (fieldA > fieldB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  if (isEditorOpen) {
    return (
      <div className="space-y-4">
        <CardEditor
          card={editingCard || undefined}
          onSave={handleSaveEditedCard}
          onCancel={() => {
            setIsEditorOpen(false);
            setEditingCard(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* Top Controls Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-right bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl pr-12 pl-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              placeholder="جستجو در واژگان انگلیسی، معنی، معادل فارسی یا تگ‌ها..."
            />
          </div>
          {onAddCardTriggered && (
            <button
              onClick={onAddCardTriggered}
              className="w-full md:w-auto flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-5 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-950/20"
            >
              <Plus size={16} />
              <span>افزودن کارت لغت</span>
            </button>
          )}
        </div>

        {/* Filters and Sorting selectors */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-800/80">
          {/* Difficulty Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">سختی لغت</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="All">همه‌ سختی‌ها</option>
              <option value="Easy">آسان</option>
              <option value="Medium">متوسط</option>
              <option value="Hard">سخت</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">وضعیت مرور</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="All">همه‌ وضعیت‌ها</option>
              <option value="New">جدید (New)</option>
              <option value="Learning">در حال یادگیری</option>
              <option value="Review">آماده مرور (Review)</option>
              <option value="Suspended">تعلیق شده (Suspended)</option>
            </select>
          </div>

          {/* Tag Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">فیلتر تگ‌ها</label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none text-right"
            >
              <option value="All">همه‌ تگ‌ها</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* Sort By Field */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">مرتب‌سازی بر اساس</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="createdAt">تاریخ ثبت لغت</option>
              <option value="word">حروف الفبا (A-Z)</option>
              <option value="nextReviewDate">نوبت مرور بعدی</option>
            </select>
          </div>

          {/* Sort Direction Toggle */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">جهت ترتیب</label>
            <button
              type="button"
              onClick={toggleSortOrder}
              className="w-full flex items-center justify-between bg-slate-950 border border-slate-800 hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-300 transition-colors"
            >
              <span>{sortOrder === "asc" ? "صعودی (قدیم به جدید/الفبا)" : "نزولی (جدید به قدیم)"}</span>
              <ArrowUpDown size={14} className="text-emerald-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards Count Header */}
      <div className="flex justify-between items-center text-xs text-slate-400 px-1">
        <span>یافته‌ها: <strong className="text-emerald-400">{filteredCards.length}</strong> لغت (از کل {cards.length} لغت)</span>
      </div>

      {/* Cards List Grid */}
      {filteredCards.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <AlertCircle className="mx-auto mb-2 opacity-40" size={36} />
          <p className="text-sm">کارت لغتی با معیارهای جستجوی شما یافت نشد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              className="bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <div>
                {/* Header Row (Tag Chips & Difficulty) */}
                <div className="flex justify-between items-center gap-2 mb-3">
                  <div className="flex flex-wrap gap-1">
                    {card.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] bg-slate-950 text-slate-400 border border-slate-850 px-1.5 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                      card.difficulty === "Easy"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : card.difficulty === "Medium"
                        ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {card.difficulty === "Easy" ? "آسان" : card.difficulty === "Medium" ? "متوسط" : "سخت"}
                  </span>
                </div>

                {/* Word & IPA */}
                <div className="flex items-center justify-between text-left mb-2" dir="ltr">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-wide font-sans select-all">{card.word}</h3>
                    {card.ipa && (
                      <p className="text-xs text-slate-400 font-mono tracking-wider select-all">{card.ipa}</p>
                    )}
                  </div>
                  <button
                    onClick={() => speakWord(card.word)}
                    className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-lg text-emerald-400 transition-colors"
                    title="شنیدن تلفظ"
                  >
                    <Volume2 size={14} />
                  </button>
                </div>

                {/* English Definition */}
                <div className="text-left font-sans text-xs text-slate-300 leading-relaxed border-t border-slate-850 pt-2 mb-2 select-all" dir="ltr">
                  {card.definition}
                </div>

                {/* Persian Translation */}
                <div className="text-right text-xs text-emerald-400 leading-relaxed font-medium select-all">
                  {card.translation}
                </div>
              </div>

              {/* Footer Row with Meta and Actions */}
              <div className="border-t border-slate-850/80 pt-3 flex justify-between items-center text-[10px] text-slate-500">
                <div className="flex flex-col text-right">
                  <span>وضعیت: <strong className="text-slate-300">{card.status}</strong></span>
                  <span>مرور بعدی: <span className="font-mono text-slate-400">{card.nextReviewDate}</span></span>
                </div>

                {/* Actions group */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleSuspendCard(card)}
                    className={`p-1.5 rounded transition-colors ${
                      card.status === "Suspended"
                        ? "bg-red-950/40 hover:bg-red-900/30 text-red-400"
                        : "bg-slate-950 hover:bg-slate-800 text-slate-400"
                    }`}
                    title={card.status === "Suspended" ? "لغو تعلیق کارت" : "تعلیق کارت (Suspend)"}
                  >
                    <ShieldAlert size={14} />
                  </button>

                  <button
                    onClick={() => handleDuplicateCard(card)}
                    className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                    title="کپی کارت"
                  >
                    <Copy size={14} />
                  </button>

                  <button
                    onClick={() => handleEditCard(card)}
                    className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                    title="ویرایش کارت"
                  >
                    <FileEdit size={14} />
                  </button>

                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="p-1.5 bg-slate-950 hover:bg-slate-800 text-red-400 hover:text-red-300 rounded transition-colors"
                    title="حذف کارت"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
