import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  normalizeEvaluationDays,
  parseYMD,
  getTodayLocalYMD,
  getEvaluationDatesForMonth,
  getArabicWeekdayForDate,
  snapDateToNearestEvaluationDay,
  formatEvaluationDaysSummary,
} from '../utils/evaluationDays';

interface EvaluationDatePickerProps {
  value: string;
  onChange: (newDate: string) => void;
  evaluationDays?: number[];
  disabled?: boolean;
  lockedMonth?: string; // Optional YYYY-MM to restrict browsing to a single month
  compact?: boolean;
  className?: string;
  placeholder?: string;
}

export const EvaluationDatePicker: React.FC<EvaluationDatePickerProps> = ({
  value,
  onChange,
  evaluationDays,
  disabled = false,
  lockedMonth,
  compact = false,
  className = '',
  placeholder = 'اختر يوم التقييم...',
}) => {
  const allowedDays = useMemo(() => normalizeEvaluationDays(evaluationDays), [evaluationDays]);
  const [isOpen, setIsOpen] = useState(false);

  const resolveInitialYM = () => {
    if (lockedMonth && /^\d{4}-\d{2}$/.test(lockedMonth)) {
      const [y, m] = lockedMonth.split('-').map(Number);
      return { year: y, month: m };
    }
    const parsed = parseYMD(value);
    if (parsed) return { year: parsed.year, month: parsed.month };
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  };

  const [viewYM, setViewYM] = useState(resolveInitialYM);

  useEffect(() => {
    if (isOpen) {
      setViewYM(resolveInitialYM());
    }
  }, [isOpen, value, lockedMonth]);

  const monthDates = useMemo(
    () => getEvaluationDatesForMonth(viewYM.year, viewYM.month, allowedDays),
    [viewYM.year, viewYM.month, allowedDays]
  );

  const monthTitleAr = useMemo(() => {
    try {
      return new Date(Date.UTC(viewYM.year, viewYM.month - 1, 15)).toLocaleString('ar', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return `${viewYM.year}-${String(viewYM.month).padStart(2, '0')}`;
    }
  }, [viewYM.year, viewYM.month]);

  const currentYMString = `${viewYM.year}-${String(viewYM.month).padStart(2, '0')}`;
  const todayYMD = getTodayLocalYMD();
  const selectedWeekdayLabel = value ? getArabicWeekdayForDate(value) : '';

  const shiftMonth = (delta: number) => {
    if (lockedMonth) return;
    setViewYM(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      while (m > 12) {
        m -= 12;
        y += 1;
      }
      return { year: y, month: m };
    });
  };

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectTodayNearest = () => {
    const snapped = snapDateToNearestEvaluationDay(todayYMD, allowedDays);
    handleSelectDate(snapped);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(true)}
        className={`form-input-bg ${compact ? 'h-8 text-xs px-2' : 'w-full h-9 md:h-7 text-sm px-2.5'} flex items-center justify-between gap-1.5 cursor-pointer text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed hover:border-sky-400 transition-colors ${className}`}
        title={value ? `${value} (${selectedWeekdayLabel})` : placeholder}
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={compact ? 13 : 14}
            height={compact ? 13 : 14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-sky-600 shrink-0"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {value ? (
            <span className="flex items-center gap-1.5 truncate">
              <span className="font-mono tabular-nums font-bold">{value}</span>
              {selectedWeekdayLabel && (
                <span className="text-[10px] font-['Cairo'] font-bold bg-sky-50 text-sky-800 border border-sky-200/80 px-1.5 py-0.2 rounded-md shrink-0">
                  {selectedWeekdayLabel}
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400 font-['Cairo'] text-xs">{placeholder}</span>
          )}
        </span>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[200] bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4 no-print font-['Cairo'] overflow-y-auto"
          dir="rtl"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-sky-200/80 max-w-md w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-l from-sky-50/90 via-white to-orange-50/40 px-4 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-white border border-sky-200 text-sky-600 flex items-center justify-center shadow-2xs">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">اختيار يوم التقييم</h3>
                  <p className="text-[11px] text-slate-500">
                    أيام التقييم المحددة: <span className="font-bold text-sky-700">{formatEvaluationDaysSummary(allowedDays)}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="إغلاق"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Month Navigator */}
            <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/70 flex items-center justify-between gap-2">
              {!lockedMonth ? (
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 text-xs font-bold transition active:scale-95"
                  title="الشهر السابق"
                >
                  ‹ السابق
                </button>
              ) : (
                <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg font-bold">
                  شهر مقيد
                </span>
              )}

              <div className="flex flex-col items-center">
                <span className="text-sm font-extrabold text-slate-900">{monthTitleAr}</span>
                {!lockedMonth ? (
                  <input
                    type="month"
                    value={currentYMString}
                    onChange={e => {
                      const val = e.target.value;
                      if (/^\d{4}-\d{2}$/.test(val)) {
                        const [y, m] = val.split('-').map(Number);
                        setViewYM({ year: y, month: m });
                      }
                    }}
                    className="mt-0.5 text-[11px] font-mono tabular-nums text-sky-700 bg-transparent border border-transparent hover:border-sky-200 rounded px-1.5 py-0.5 cursor-pointer outline-none"
                  />
                ) : (
                  <span className="text-[11px] font-mono tabular-nums text-slate-500">{currentYMString}</span>
                )}
              </div>

              {!lockedMonth ? (
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 text-xs font-bold transition active:scale-95"
                  title="الشهر التالي"
                >
                  التالي ›
                </button>
              ) : (
                <span className="text-[11px] font-mono tabular-nums text-slate-500 font-bold">
                  {monthDates.length} يوم
                </span>
              )}
            </div>

            {/* Filtered Days Grid (ONLY selected evaluation days of the month) */}
            <div className="p-4 max-h-[55vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-2.5 text-[11px] text-slate-500">
                <span>الأيام المتاحة للتقييم في هذا الشهر فقط:</span>
                <span className="font-mono tabular-nums font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                  {monthDates.length} يوم
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {monthDates.map(item => {
                  const isSelected = value === item.dateStr;
                  const isToday = todayYMD === item.dateStr;
                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => handleSelectDate(item.dateStr)}
                      className={`p-2.5 rounded-xl border text-center transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#F26522] to-[#EA580C] text-white border-[#D94E0F] shadow-md'
                          : isToday
                          ? 'bg-sky-50 text-sky-900 border-sky-400 ring-1 ring-sky-200 hover:bg-sky-100'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-sky-400 hover:bg-sky-50/70'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold ${
                          isSelected ? 'text-orange-100' : 'text-slate-500'
                        }`}
                      >
                        {item.weekdayLabel}
                      </span>
                      <span className="text-lg font-mono tabular-nums font-extrabold leading-tight">
                        {String(item.day).padStart(2, '0')}
                      </span>
                      {isToday && (
                        <span
                          className={`text-[9px] font-bold px-1.5 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-700'
                          }`}
                        >
                          اليوم
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200/70 flex items-center justify-between gap-2">
              {!lockedMonth ? (
                <button
                  type="button"
                  onClick={handleSelectTodayNearest}
                  className="text-xs font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-xl transition active:scale-95"
                >
                  أقرب يوم تقييم لليوم
                </button>
              ) : (
                <span className="text-[11px] text-slate-500">اختر يوماً من أيام تقييم الشهر</span>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 px-3.5 py-1.5 rounded-xl transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
