/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Settings, Card } from "../types";
import { getStoredSettings, saveStoredSettings, exportBackupData, importBackupData, getAllCards, saveCard, initDB } from "../lib/db";
import { Download, Upload, ShieldAlert, Sparkles, RefreshCw, Check, Clipboard, FileText, Layout, Info, AlertTriangle, Eye } from "lucide-react";

interface SettingsPageProps {
  onThemeChanged: (theme: Settings["theme"]) => void;
}

export default function SettingsPage({ onThemeChanged }: SettingsPageProps) {
  const [settings, setSettings] = useState<Settings>(getStoredSettings());
  const [cardsCount, setCardsCount] = useState(0);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // CSV paste/import states
  const [csvInput, setCsvInput] = useState("");
  const [importPreview, setImportPreview] = useState<Array<{ word: string; definition: string; translation: string; isDuplicate: boolean }>>([]);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCardsCount();
  }, []);

  const loadCardsCount = async () => {
    const list = await getAllCards();
    setCardsCount(list.length);
  };

  const handleSaveSettings = (updated: Settings) => {
    setSettings(updated);
    saveStoredSettings(updated);
    onThemeChanged(updated.theme);
    showSuccess("تنظیمات با موفقیت ذخیره شدند.");
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 5000);
  };

  // 1. JSON Export
  const handleExportBackup = async () => {
    try {
      const backupStr = await exportBackupData();
      const blob = new Blob([backupStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Vahid_Routing_English_Backup_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showSuccess("فایل بک‌آپ با موفقیت دانلود شد.");
    } catch (e: any) {
      showError("خروجی گرفتن از فایل پشتیبان ناموفق بود.");
    }
  };

  // 2. JSON Import
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const res = await importBackupData(text);
        if (res.success) {
          showSuccess(`بک‌آپ با موفقیت بازیابی شد. تعداد ${res.cardsAdded} لغت بازیابی شد.`);
          setSettings(getStoredSettings());
          onThemeChanged(getStoredSettings().theme);
          loadCardsCount();
        } else {
          showError(res.error || "فرمت فایل بک‌آپ نامعتبر است.");
        }
      } catch (err) {
        showError("خطا در خواندن فایل بک‌آپ.");
      }
    };
    reader.readAsText(file);
  };

  // 3. Export to CSV file
  const handleExportCSV = async () => {
    try {
      const cards = await getAllCards();
      let csvContent = "Word,IPA,Definition,Translation,Difficulty,Status\n";
      
      cards.forEach((c) => {
        // Sanitize values to prevent breaking CSV cells
        const cleanWord = `"${c.word.replace(/"/g, '""')}"`;
        const cleanIpa = `"${c.ipa.replace(/"/g, '""')}"`;
        const cleanDef = `"${c.definition.replace(/"/g, '""')}"`;
        const cleanTrans = `"${c.translation.replace(/"/g, '""')}"`;
        
        csvContent += `${cleanWord},${cleanIpa},${cleanDef},${cleanTrans},${c.difficulty},${c.status}\n`;
      });

      // Encode for UTF-8 with BOM to support Persian characters in Excel
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Vahid_English_Vocabulary_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showSuccess("فایل اکسل/CSV با موفقیت دانلود شد.");
    } catch (err) {
      showError("خطا در ساخت فایل CSV.");
    }
  };

  // 4. CSV Importer Parser & Previewer
  const handleParseCsvInput = async () => {
    if (!csvInput.trim()) {
      showError("لطفاً داده‌های متنی CSV را وارد کنید.");
      return;
    }

    const lines = csvInput.split("\n");
    const previewList: typeof importPreview = [];
    const existingCards = await getAllCards();
    const existingWordsSet = new Set(existingCards.map((c) => c.word.toLowerCase().trim()));

    lines.forEach((line) => {
      if (!line.trim()) return;
      
      // Basic CSV comma/semicolon splitter or simple tab separated split
      let parts = line.split(",");
      if (parts.length < 2) {
        parts = line.split("\t"); // Try tab
      }
      if (parts.length < 2) {
        parts = line.split(";"); // Try semicolon
      }

      if (parts.length >= 2) {
        const rawWord = parts[0]?.trim().replace(/^["']|["']$/g, "") || "";
        const rawDef = parts[1]?.trim().replace(/^["']|["']$/g, "") || "";
        const rawTrans = parts[2]?.trim().replace(/^["']|["']$/g, "") || "";

        if (rawWord) {
          previewList.push({
            word: rawWord,
            definition: rawDef || "No definition specified.",
            translation: rawTrans || "ترجمه‌ای وارد نشده است.",
            isDuplicate: existingWordsSet.has(rawWord.toLowerCase().trim()),
          });
        }
      }
    });

    setImportPreview(previewList);
    setShowPreview(true);
  };

  // 5. Commit parsed CSV to IndexedDB
  const handleCommitCsvImport = async () => {
    if (importPreview.length === 0) return;

    let addedCount = 0;
    const nowStr = new Date().toISOString();

    for (const item of importPreview) {
      // Create new Card entry
      const newCard: Card = {
        id: `card-csv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        word: item.word,
        ipa: "",
        definition: item.definition,
        translation: item.translation,
        examples: [],
        notes: "ثبت گروهی از طریق CSV/متن تفکیک‌شده.",
        grammarNotes: "",
        pronunciationNotes: "",
        difficulty: "Medium",
        tags: ["Imported"],
        status: "New",
        easeFactor: 2.5,
        repetitions: 0,
        interval: 0,
        nextReviewDate: nowStr.split("T")[0],
        createdAt: nowStr,
      };

      await saveCard(newCard);
      addedCount++;
    }

    showSuccess(`تعداد ${addedCount} لغت جدید با موفقیت به بانک اطلاعاتی اضافه شدند.`);
    setCsvInput("");
    setImportPreview([]);
    setShowPreview(false);
    loadCardsCount();
  };

  // Clear all Database
  const handleFactoryReset = async () => {
    if (confirm("⚠️ هشدار جدی:\nآیا مطمئن هستید که می‌خواهید کل پایگاه داده را بازنشانی کنید؟ تمام لغت‌ها، گزارش‌های مرور، کلیدهای ثبت شده و مقالات خوانده شده برای همیشه پاک خواهند شد و این عملیات غیرقابل بازگشت است!")) {
      const dbRequest = indexedDB.deleteDatabase("VahidRoutingDB");
      dbRequest.onsuccess = () => {
        localStorage.clear();
        alert("پایگاه داده به طور کامل پاک شد. برنامه ریستارت می‌شود.");
        window.location.reload();
      };
      dbRequest.onerror = () => {
        showError("امکان حذف پایگاه داده وجود نداشت.");
      };
    }
  };

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* Alert banners */}
      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 p-4 rounded-xl text-sm flex items-center gap-2">
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-950/40 border border-red-900 text-red-400 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: General preferences & Themes */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Layout size={18} className="text-emerald-400" />
              <span>تنظیمات ظاهری و ترجیحات مطالعه</span>
            </h2>

            {/* Theme Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400">پوسته بصری برنامه (Appearance Theme)</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-850">
                {(["dark", "light", "sepia"] as Settings["theme"][]).map((themeName) => (
                  <button
                    key={themeName}
                    onClick={() => handleSaveSettings({ ...settings, theme: themeName })}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      settings.theme === themeName
                        ? "bg-emerald-600 text-white font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {themeName === "dark" ? "تاریک (کاسمو)" : themeName === "light" ? "روشن" : "نوستالژی (سپیا)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedulers limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">حداکثر کارت جدید روزانه</label>
                <input
                  type="number"
                  value={settings.newCardsLimit}
                  onChange={(e) => handleSaveSettings({ ...settings, newCardsLimit: parseInt(e.target.value) || 5 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">حداکثر مرور روزانه</label>
                <input
                  type="number"
                  value={settings.reviewLimit}
                  onChange={(e) => handleSaveSettings({ ...settings, reviewLimit: parseInt(e.target.value) || 20 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                  min={1}
                />
              </div>
            </div>

            {/* Pronunciation Gender */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400">جنسیت لهجه سخنگوی صوتی (British TTS)</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-850">
                {(["female", "male"] as Settings["voiceGender"][]).map((gender) => (
                  <button
                    key={gender}
                    onClick={() => handleSaveSettings({ ...settings, voiceGender: gender })}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      settings.voiceGender === gender
                        ? "bg-emerald-600 text-white font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {gender === "female" ? "صدای خانم بریتانیایی" : "صدای آقا بریتانیایی"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Backup Restore Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
              <ShieldAlert size={18} className="text-emerald-400" />
              <span>پشتیبان‌گیری و انتقال اطلاعات (Backup & Restore)</span>
            </h2>

            <p className="text-xs text-slate-400 leading-relaxed">
              بانک لغات، پیشرفت‌های یادگیری، یادداشت‌ها و تگ‌های خود را در قالب یک فایل پشتیبان با ساختار ایمن نگه‌داری کنید. شما می‌توانید در هر زمان اطلاعات خود را در مرورگری دیگر یا در دستگاهی متفاوت بازیابی کنید.
            </p>

            {/* Backup buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-200 py-3 px-4 rounded-xl text-xs font-medium transition-colors"
              >
                <Download size={14} className="text-emerald-400" />
                <span>دانلود بک‌آپ کامل (JSON)</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-200 py-3 px-4 rounded-xl text-xs font-medium transition-colors"
              >
                <FileText size={14} className="text-emerald-400" />
                <span>خروجی تمام لغت‌ها برای اکسل (CSV)</span>
              </button>
            </div>

            {/* Restore upload */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-slate-400 mb-2">بازیابی فایل پشتیبان لایتنر (فایل JSON):</label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleImportBackup}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-4 rounded-xl text-xs font-medium transition-colors"
                >
                  <Upload size={14} />
                  <span>بارگذاری و بازیابی دیتای کامل لایتنر</span>
                </button>
              </div>
            </div>

            {/* Dangerous Factory Reset Zone */}
            <div className="pt-4 border-t border-slate-800/85">
              <h4 className="text-xs font-semibold text-red-500 mb-1">منطقه فوق امنیتی</h4>
              <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">با فعال‌سازی این دکمه کل پایگاه داده در این مرورگر به کلی فرمت و پاک می‌شود.</p>
              <button
                onClick={handleFactoryReset}
                className="w-full bg-red-950/20 border border-red-900/40 hover:bg-red-950/60 text-red-400 text-xs py-2.5 px-4 rounded-xl transition-all"
              >
                فرمت و حذف دائمی کل پایگاه داده (Factory Reset)
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: CSV Bulk Words Importer */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Clipboard size={18} className="text-emerald-400" />
              <span>وارد کردن انبوه لغات (Bulk Importer)</span>
            </h2>

            <p className="text-xs text-slate-400 leading-relaxed">
              می‌توانید کلمات و معانی خود را از اکسل کپی کرده و در کادر زیر قرار دهید. سیستم به طور خودکار <strong className="text-emerald-400">تکراری‌ها</strong> را تشخیص داده و قبل از اضافه شدن نهایی، لیست لغت‌ها را برای تایید به شما نمایش می‌دهد.
            </p>

            <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5 text-xs text-slate-300">
              <span className="font-semibold text-slate-200 block">ساختار صحیح نگارش هر سطر:</span>
              <p className="font-mono text-[10px] text-slate-400" dir="ltr">Word, English Meaning, Persian translation</p>
              <p className="text-[10px] text-slate-400">مثال: <code className="font-mono bg-slate-900 px-1 py-0.5 rounded text-slate-300" dir="ltr">Abound, To exist in large numbers, فراوان بودن</code></p>
            </div>

            <textarea
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              rows={6}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-slate-200 font-sans leading-relaxed focus:outline-none focus:border-emerald-500"
              placeholder="کلمات خود را در این کادر قرار دهید..."
            />

            <button
              onClick={handleParseCsvInput}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
            >
              پردازش و نمایش پیش‌نمایش لغات
            </button>

            {/* Importer Preview Table */}
            {showPreview && importPreview.length > 0 && (
              <div className="space-y-4 pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>لغات پردازش شده: <strong className="text-emerald-400">{importPreview.length}</strong> لغت</span>
                  <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded text-[10px]">
                    {importPreview.filter((i) => i.isDuplicate).length} لغت تکراری
                  </span>
                </div>

                <div className="max-h-[220px] overflow-y-auto border border-slate-850 rounded-xl bg-slate-950/40">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-850">
                        <th className="p-2">کلمه انگلیسی</th>
                        <th className="p-2">ترجمه فارسی</th>
                        <th className="p-2">وضعیت تکرار</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-900/60 hover:bg-slate-900/30">
                          <td className="p-2 font-semibold font-sans text-slate-100 text-left" dir="ltr">{item.word}</td>
                          <td className="p-2 text-slate-300">{item.translation}</td>
                          <td className="p-2">
                            {item.isDuplicate ? (
                              <span className="text-red-400 font-medium">موجود در سیستم</span>
                            ) : (
                              <span className="text-emerald-400 font-medium">جدید</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="flex-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 py-2.5 rounded-xl text-xs transition-all"
                  >
                    لغو عملیات
                  </button>
                  <button
                    onClick={handleCommitCsvImport}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-semibold transition-all shadow-lg shadow-emerald-950/10"
                  >
                    تایید و ثبت لغات جدید
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
