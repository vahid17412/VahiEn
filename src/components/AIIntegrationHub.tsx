/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AIKey, AIProviderType, Settings } from "../types";
import { getAllAIKeys, saveAIKey, deleteAIKey, getStoredSettings, saveStoredSettings } from "../lib/db";
import { testAIKeyConnection } from "../lib/ai";
import { Plus, Trash2, Edit2, Copy, ToggleLeft, ToggleRight, Sparkles, AlertCircle, CheckCircle2, RefreshCw, HelpCircle, HardDrive, Cpu } from "lucide-react";

export default function AIIntegrationHub() {
  const [keys, setKeys] = useState<AIKey[]>([]);
  const [settings, setSettings] = useState<Settings>(getStoredSettings());

  // Form states for creating/editing keys
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  
  const [provider, setProvider] = useState<AIProviderType>("gemini");
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("gemini-3.5-flash");
  const [enabled, setEnabled] = useState(true);
  const [priority, setPriority] = useState(1);
  const [notes, setNotes] = useState("");

  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, "success" | "fail" | null>>({});

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    const loaded = await getAllAIKeys();
    setKeys(loaded.sort((a, b) => a.priority - b.priority));
  };

  const handleProviderChange = (prov: AIProviderType) => {
    setProvider(prov);
    // Set typical default model names to help the user
    if (prov === "gemini") setModel("gemini-3.5-flash");
    else if (prov === "openai") setModel("gpt-4o");
    else if (prov === "claude") setModel("claude-3-5-sonnet-latest");
    else if (prov === "deepseek") setModel("deepseek-chat");
    else if (prov === "groq") setModel("llama-3.3-70b-specdec");
    else if (prov === "ollama") setModel("llama3");
    else setModel("");
  };

  const handleOpenAddForm = () => {
    setEditingKeyId(null);
    setProvider("gemini");
    setDisplayName("");
    setApiKey("");
    setBaseUrl("");
    setModel("gemini-3.5-flash");
    setEnabled(true);
    setPriority(1);
    setNotes("");
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (k: AIKey) => {
    setEditingKeyId(k.id);
    setProvider(k.provider);
    setDisplayName(k.displayName);
    setApiKey(k.apiKey);
    setBaseUrl(k.baseUrl || "");
    setModel(k.model);
    setEnabled(k.enabled);
    setPriority(k.priority);
    setNotes(k.notes || "");
    setIsFormOpen(true);
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !apiKey.trim() || !model.trim()) {
      alert("لطفاً فیلدهای ستاره‌دار را تکمیل کنید.");
      return;
    }

    const keyData: AIKey = {
      id: editingKeyId || `key-${Date.now()}`,
      provider,
      displayName: displayName.trim(),
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || undefined,
      model: model.trim(),
      enabled,
      priority,
      notes: notes.trim() || undefined,
      creationDate: editingKeyId 
        ? keys.find(k => k.id === editingKeyId)?.creationDate || new Date().toISOString()
        : new Date().toISOString(),
    };

    await saveAIKey(keyData);
    setIsFormOpen(false);
    loadKeys();
  };

  const handleDeleteKey = async (id: string) => {
    if (confirm("آیا مطمئن هستید که می‌خواهید این کلید را حذف کنید؟")) {
      await deleteAIKey(id);
      loadKeys();
    }
  };

  const handleDuplicateKey = async (k: AIKey) => {
    const duplicated: AIKey = {
      ...k,
      id: `key-dup-${Date.now()}`,
      displayName: `${k.displayName} (کپی)`,
      creationDate: new Date().toISOString(),
    };
    await saveAIKey(duplicated);
    loadKeys();
  };

  const handleToggleKey = async (k: AIKey) => {
    const updated = { ...k, enabled: !k.enabled };
    await saveAIKey(updated);
    loadKeys();
  };

  const handleTestConnection = async (k: AIKey) => {
    setTestingKeyId(k.id);
    setTestResult((prev) => ({ ...prev, [k.id]: null }));
    
    const isWorking = await testAIKeyConnection(k);
    
    setTestResult((prev) => ({
      ...prev,
      [k.id]: isWorking ? "success" : "fail",
    }));
    setTestingKeyId(null);
  };

  const handleTaskMappingChange = (taskName: keyof Settings["aiTasks"], value: string) => {
    const updatedSettings: Settings = {
      ...settings,
      aiTasks: {
        ...settings.aiTasks,
        [taskName]: value,
      },
    };
    setSettings(updatedSettings);
    saveStoredSettings(updatedSettings);
  };

  return (
    <div className="space-y-8 text-slate-100" dir="rtl">
      {/* Description Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-400">
          <Sparkles size={120} />
        </div>
        <h1 className="text-2xl font-semibold text-emerald-400 font-sans mb-3">
          مدیریت کلیدها و موتور هوش مصنوعی (AI Hub)
        </h1>
        <p className="text-slate-300 text-sm leading-relaxed max-w-4xl">
          این سیستم بر اساس فلسفه <strong className="text-emerald-400">حفظ حریم خصوصی</strong> کاملا محلی (Local-First) عمل می‌کند. کلیدهای هوش مصنوعی وارد شده فقط در مرورگر دستگاه شما ذخیره می‌شوند و هیچ‌وقت در هیچ سرور میانی ذخیره نخواهند شد. شما می‌توانید چند کلید از چندین ارائه‌دهنده (Gemini، OpenAI، Claude و حتی Ollama محلی) وارد کنید و هر کار تخصصی را به یکی از موتورها بسپارید.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Mappings and tasks configurations */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Cpu size={18} className="text-emerald-400" />
              <span>تنظیم ابزارهای تخصصی</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              انتخاب کنید که برای هر یک از قابلیت‌های برنامه، از کدام کلید هوش مصنوعی استفاده شود.
            </p>

            <div className="space-y-5">
              {/* Vocab task */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  توضیح لغت و معادل‌سازی خودکار (Vocabulary)
                </label>
                <select
                  value={settings.aiTasks.vocabularyExplanation}
                  onChange={(e) => handleTaskMappingChange("vocabularyExplanation", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="default-gemini">سیستم پیش‌فرض هوش مصنوعی (رایگان)</option>
                  {keys.filter(k => k.enabled).map(k => (
                    <option key={k.id} value={k.id}>{k.displayName} ({k.provider})</option>
                  ))}
                </select>
              </div>

              {/* Grammar task */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  تصحیح گرامر و ساختارها (Grammar)
                </label>
                <select
                  value={settings.aiTasks.grammarCorrection}
                  onChange={(e) => handleTaskMappingChange("grammarCorrection", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="default-gemini">سیستم پیش‌فرض هوش مصنوعی (رایگان)</option>
                  {keys.filter(k => k.enabled).map(k => (
                    <option key={k.id} value={k.id}>{k.displayName} ({k.provider})</option>
                  ))}
                </select>
              </div>

              {/* Writing task */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  تحلیل و فیدبک رایتینگ (Writing Practice)
                </label>
                <select
                  value={settings.aiTasks.writingFeedback}
                  onChange={(e) => handleTaskMappingChange("writingFeedback", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="default-gemini">سیستم پیش‌فرض هوش مصنوعی (رایگان)</option>
                  {keys.filter(k => k.enabled).map(k => (
                    <option key={k.id} value={k.id}>{k.displayName} ({k.provider})</option>
                  ))}
                </select>
              </div>

              {/* Pronunciation task */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  سنجش لهجه و تلفظ (Pronunciation Eval)
                </label>
                <select
                  value={settings.aiTasks.pronunciationEvaluation}
                  onChange={(e) => handleTaskMappingChange("pronunciationEvaluation", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="default-gemini">سیستم پیش‌فرض هوش مصنوعی (رایگان)</option>
                  {keys.filter(k => k.enabled).map(k => (
                    <option key={k.id} value={k.id}>{k.displayName} ({k.provider})</option>
                  ))}
                </select>
              </div>

              {/* Examples generation */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  ساخت جملات نمونه انگلیسی (Examples)
                </label>
                <select
                  value={settings.aiTasks.exampleGeneration}
                  onChange={(e) => handleTaskMappingChange("exampleGeneration", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="default-gemini">سیستم پیش‌فرض هوش مصنوعی (رایگان)</option>
                  {keys.filter(k => k.enabled).map(k => (
                    <option key={k.id} value={k.id}>{k.displayName} ({k.provider})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Keys management list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <HardDrive size={18} className="text-emerald-400" />
                <span>کلیدهای API ثبت شده ({keys.length})</span>
              </h2>
              <button
                onClick={handleOpenAddForm}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-xl text-xs transition-colors"
              >
                <Plus size={16} />
                <span>کلید جدید</span>
              </button>
            </div>

            {/* List of keys */}
            <div className="space-y-4">
              {/* Default Gemini built-in key card */}
              <div className="p-4 bg-slate-950 border border-emerald-900/30 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-semibold text-slate-200">سیستم رایگان داخلی (Google Gemini)</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                      پیش‌فرض سیستم
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mb-1">
                    Model: gemini-3.5-flash
                  </p>
                  <p className="text-[11px] text-emerald-500/75">
                    سرویس هوش مصنوعی ایمن و بهینه بدون نیاز به وارد کردن API Key.
                  </p>
                </div>
                <div className="text-xs text-emerald-400 font-medium">
                  آماده استفاده (Active)
                </div>
              </div>

              {keys.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500">
                  <HelpCircle className="mx-auto mb-2 opacity-50" size={32} />
                  <p className="text-sm">کلید هوش مصنوعی سفارشی اضافه نشده است.</p>
                  <p className="text-xs mt-1 text-slate-600">می‌توانید با دکمه بالا کلید اختصاصی خود را (مانند OpenAI یا DeepSeek) ثبت کنید.</p>
                </div>
              ) : (
                keys.map((k) => (
                  <div
                    key={k.id}
                    className={`p-4 rounded-xl border transition-all ${
                      k.enabled
                        ? "bg-slate-950 border-slate-850 hover:border-slate-700"
                        : "bg-slate-950/40 border-slate-900 opacity-60"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      {/* Left: Metadata */}
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-100">{k.displayName}</span>
                          <span className="text-[10px] uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                            {k.provider}
                          </span>
                          {k.enabled ? (
                            <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded">
                              فعال
                            </span>
                          ) : (
                            <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                              غیرفعال
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono">
                            اولویت: {k.priority}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono flex items-center gap-3">
                          <span>Model: {k.model}</span>
                          <span className="text-slate-600">|</span>
                          <span className="truncate max-w-[200px]">Key: ••••••••{k.apiKey.slice(-4)}</span>
                        </div>
                        {k.notes && (
                          <p className="text-[11px] text-slate-500 italic">
                            یادداشت: {k.notes}
                          </p>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                        <button
                          onClick={() => handleTestConnection(k)}
                          disabled={testingKeyId === k.id}
                          className="flex items-center gap-1 bg-slate-900 border border-slate-800 hover:bg-slate-850 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 transition-colors"
                        >
                          {testingKeyId === k.id ? (
                            <RefreshCw className="animate-spin text-emerald-400" size={12} />
                          ) : null}
                          <span>تست اتصال</span>
                        </button>

                        <button
                          onClick={() => handleToggleKey(k)}
                          className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
                          title={k.enabled ? "غیرفعال کردن" : "فعال کردن"}
                        >
                          {k.enabled ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} />}
                        </button>

                        <button
                          onClick={() => handleDuplicateKey(k)}
                          className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
                          title="کپی و تکثیر"
                        >
                          <Copy size={16} />
                        </button>

                        <button
                          onClick={() => handleOpenEditForm(k)}
                          className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
                          title="ویرایش"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => handleDeleteKey(k.id)}
                          className="text-red-400 hover:text-red-300 p-2 rounded-lg transition-colors"
                          title="حذف کلید"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Test result banner */}
                    {testResult[k.id] && (
                      <div className="mt-3 text-xs flex items-center gap-1.5 p-2 rounded-lg">
                        {testResult[k.id] === "success" ? (
                          <span className="flex items-center gap-1 text-green-400 bg-green-950/20 px-3 py-1.5 rounded-lg border border-green-900/30 w-full">
                            <CheckCircle2 size={14} />
                            <span>ارتباط با ارائه‌دهنده {k.provider} برقرار شد و مدل به درستی پاسخ داد!</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 bg-red-950/20 px-3 py-1.5 rounded-lg border border-red-900/30 w-full">
                            <AlertCircle size={14} />
                            <span>خطا در برقراری ارتباط. لطفاً از صحت کلید، نام مدل و دسترسی اینترنت خود اطمینان حاصل کنید.</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* API Key Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6" dir="rtl">
            <h3 className="text-lg font-semibold text-emerald-400 font-sans mb-4 border-b border-slate-800 pb-3">
              {editingKeyId ? "ویرایش کلید هوش مصنوعی" : "ثبت کلید جدید برای موتورهای هوش مصنوعی"}
            </h3>

            <form onSubmit={handleSaveKey} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  ارائه‌دهنده سرویس (AI Provider) <span className="text-red-500">*</span>
                </label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as AIProviderType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="deepseek">DeepSeek AI</option>
                  <option value="groq">Groq Cloud</option>
                  <option value="openrouter">OpenRouter (Any Model)</option>
                  <option value="ollama">Ollama (Local Running Server)</option>
                  <option value="custom">سایر ارائه‌دهنده‌های سازگار با OpenAI</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  نام نمایشی کلید (مثال: Claude Main) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="مثال: DeepSeek Pro"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  کد کلید اختصاصی (API Key) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 text-left"
                  placeholder="sk-..."
                  dir="ltr"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    نام مدل هدف (Model Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 text-left"
                    placeholder="e.g. gpt-4o-mini"
                    dir="ltr"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    اولویت فرخوانی (Priority)
                  </label>
                  <input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                    min={1}
                  />
                </div>
              </div>

              {(provider === "custom" || provider === "ollama" || provider === "openrouter") && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    آدرس بیس سرور (Base URL) - اختیاری
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 text-left"
                    placeholder="http://localhost:11434/v1"
                    dir="ltr"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  یادداشت یا توضیحات شخصی
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="این کلید دارای سهمیه ۲۰ دلاری است..."
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 py-2 px-4 rounded-xl text-sm transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-6 rounded-xl text-sm font-medium transition-colors"
                >
                  ذخیره اطلاعات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
