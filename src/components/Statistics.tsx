/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Card, ReviewLog, StudySession } from "../types";
import { getAllCards, getAllReviewLogs, getAllStudySessions } from "../lib/db";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Award, Clock, BookOpen, CheckCircle, Flame, Calendar, HelpCircle } from "lucide-react";

export default function Statistics() {
  const [cards, setCards] = useState<Card[]>([]);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const c = await getAllCards();
    const l = await getAllReviewLogs();
    const s = await getAllStudySessions();
    setCards(c);
    setLogs(l);
    setSessions(s.sort((a, b) => a.date.localeCompare(b.date)));
  };

  // 1. Calculate general stats
  const totalCards = cards.length;
  const cardsLearned = cards.filter((c) => c.status === "Review").length;
  const cardsLearning = cards.filter((c) => c.status === "Learning").length;
  const cardsNew = cards.filter((c) => c.status === "New").length;
  const cardsSuspended = cards.filter((c) => c.status === "Suspended").length;

  // Study stats
  const totalReviewsCount = sessions.reduce((sum, s) => sum + s.cardsReviewed, 0);
  const totalTimeSpentSec = sessions.reduce((sum, s) => sum + s.timeSpentSec, 0);
  const totalTimeMin = Math.round(totalTimeSpentSec / 60);

  // Calculate Overall Accuracy: (correctReviews / cardsReviewed) * 100
  const overallAccuracy = totalReviewsCount > 0
    ? Math.round((sessions.reduce((sum, s) => sum + s.correctReviews, 0) / totalReviewsCount) * 100)
    : 0;

  // Streak calculation (consecutive daily sessions)
  const calculateStreak = () => {
    if (sessions.length === 0) return 0;
    const sortedDates = Array.from(new Set(sessions.map(s => s.date))).sort();
    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Check if studied today or yesterday to continue streak
    if (!sortedDates.includes(today) && !sortedDates.includes(yesterday)) {
      return 0;
    }

    let checkDate = sortedDates.includes(today) ? new Date(today) : new Date(yesterday);
    
    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (sortedDates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  // Pie chart data
  const pieData = [
    { name: "لغات تازه (New)", value: cardsNew, color: "#60a5fa" },
    { name: "در حال یادگیری", value: cardsLearning, color: "#f59e0b" },
    { name: "تثبیت‌شده (Review)", value: cardsLearned, color: "#10b981" },
    { name: "تعلیق‌شده (Suspended)", value: cardsSuspended, color: "#ef4444" },
  ].filter(item => item.value > 0);

  // 7-Day learning trend graph data
  const getLast7DaysData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      
      const session = sessions.find((s) => s.date === dateStr);
      const formattedDate = d.toLocaleDateString("fa-IR", { month: "short", day: "numeric" });

      data.push({
        name: formattedDate,
        date: dateStr,
        "مرورها": session ? session.cardsReviewed : 0,
        "دقایق مطالعه": session ? Math.round(session.timeSpentSec / 60) : 0,
        "دقت پاسخ": session && session.cardsReviewed > 0 
          ? Math.round((session.correctReviews / session.cardsReviewed) * 100) 
          : 0,
      });
    }
    return data;
  };

  const trendData = getLast7DaysData();

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-bold">
        {percent > 0 ? `${(percent * 100).toFixed(0)}%` : ""}
      </text>
    );
  };

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Cards */}
        <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center justify-center shrink-0">
            <BookOpen size={22} />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">کل واژگان</span>
            <span className="text-xl font-bold font-mono text-slate-100">{totalCards}</span>
          </div>
        </div>

        {/* Study Time */}
        <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">کل زمان مطالعه</span>
            <span className="text-xl font-bold font-mono text-slate-100">{totalTimeMin} دقیقه</span>
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle size={22} />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">دقت متوسط پاسخ</span>
            <span className="text-xl font-bold font-mono text-slate-100">{overallAccuracy}%</span>
          </div>
        </div>

        {/* Streak */}
        <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full flex items-center justify-center shrink-0">
            <Flame size={22} />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">زنجیره مطالعه (Streak)</span>
            <span className="text-xl font-bold font-mono text-slate-100">{streak} روز متوالی</span>
          </div>
        </div>
      </div>

      {totalReviewsCount === 0 && totalCards === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 max-w-xl mx-auto">
          <TrendingUp className="mx-auto mb-3 opacity-30 text-slate-400" size={48} />
          <h3 className="font-semibold text-slate-300 text-sm mb-1">دیتای آمادگی یافت نشد</h3>
          <p className="text-xs leading-relaxed max-w-[280px] mx-auto">برای دریافت نمودارهای گرافیکی، ابتدا تعدادی لغت ثبت کرده و حداقل یک دور جلسه مرور لغت را سپری کنید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Study trend volume (Bar chart, Left/Center 2 cols) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" />
              <span>روند مرور لغت و حجم مطالعه (۷ روز گذشته)</span>
            </h3>

            <div className="h-[280px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", color: "#f8fafc" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Bar dataKey="مرورها" fill="#10b981" radius={[4, 4, 0, 0]} name="تعداد لغت‌های مرورشده" />
                  <Bar dataKey="دقایق مطالعه" fill="#f59e0b" radius={[4, 4, 0, 0]} name="زمان مطالعه (دقیقه)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Cards distribution (Pie chart, Right 1 col) */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Award size={16} className="text-emerald-400" />
              <span>پراکندگی و تسلط لغات جعبه لایتنر</span>
            </h3>

            {pieData.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">هیچ کارتی در حافظه ثبت نشده است.</p>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-[180px] w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={75}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom legend in Farsi */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-300 w-full pt-3 border-t border-slate-850">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#60a5fa" }}></span>
                    <span>تازه ({cardsNew})</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-start">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#f59e0b" }}></span>
                    <span>یادگیری ({cardsLearning})</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-start">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#10b981" }}></span>
                    <span>تثبیت ({cardsLearned})</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-start">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#ef4444" }}></span>
                    <span>معلق ({cardsSuspended})</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Line Chart: Accuracy history over last 7 days */}
      {totalReviewsCount > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <span>روند بازخورد و دقت یادآوری لغات (Accuracy Trend)</span>
          </h3>
          <div className="h-[180px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", color: "#f8fafc" }} />
                <Line type="monotone" dataKey="دقت پاسخ" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} name="درصد پاسخ صحیح" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
