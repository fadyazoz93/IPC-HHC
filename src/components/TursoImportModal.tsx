import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export interface TursoFacilityStat {
  name: string;
  sessionCount: number;
  rowCount: number;
  newSessions: number;
  existingSessions: number;
}

export interface TursoTestResult {
  success: boolean;
  totalRows: number;
  totalSessions: number;
  newSessions: number;
  existingSessions: number;
  minDate: string | null;
  maxDate: string | null;
  facilities: string[];
  facilityStats?: TursoFacilityStat[];
  departments: string[];
  hasSettings: boolean;
  targetFacility?: string | null;
  message?: string;
  error?: string;
}

export interface TursoImportResult {
  success: boolean;
  targetFacility?: string;
  importedSessions: number;
  updatedSessions: number;
  skippedSessions: number;
  totalImportedRows: number;
  mergedSettingsCount?: number;
  message: string;
  error?: string;
}

interface TursoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  onNavigateToRecords?: () => void;
  currentCenter?: string | null;
}

export const TursoImportModal: React.FC<TursoImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onNavigateToRecords,
  currentCenter,
}) => {
  const [tursoUrl, setTursoUrl] = useState('');
  const [tursoAuthToken, setTursoAuthToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TursoTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [sourceFacilityFilter, setSourceFacilityFilter] = useState<string>('__ALL__');

  const [importMode, setImportMode] = useState<'merge_skip_existing' | 'merge_overwrite_existing' | 'overwrite_all'>('merge_skip_existing');
  const [importSettings, setImportSettings] = useState(true);

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<TursoImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeCenterName = (currentCenter || '').trim();

  const handleTestConnection = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = tursoUrl.trim();
    if (!cleanUrl) {
      setTestError('يرجى إدخال رابط قاعدة بيانات Turso السابقة');
      return;
    }

    setIsTesting(true);
    setTestError(null);
    setTestResult(null);
    setImportResult(null);
    setImportError(null);

    (window as any).google.script.run
      .withSuccessHandler((res: any) => {
        setIsTesting(false);
        if (res && res.success) {
          setTestResult(res);
          const remoteFacs: string[] = res.facilities || [];
          if (remoteFacs.length > 1) {
            const matched = activeCenterName
              ? remoteFacs.find(f => f.trim().toLowerCase() === activeCenterName.toLowerCase())
              : undefined;
            setSourceFacilityFilter(matched || remoteFacs[0]);
          } else {
            setSourceFacilityFilter('__ALL__');
          }
        } else {
          setTestError(res?.error || 'فشل الاتصال بقاعدة البيانات. يرجى التحقق من الرابط والرمز.');
        }
      })
      .withFailureHandler((err: any) => {
        setIsTesting(false);
        setTestError(typeof err === 'string' ? err : err?.message || 'حدث خطأ في الاتصال بالخادم');
      })
      .testTursoConnection({
        tursoUrl: cleanUrl,
        tursoAuthToken: tursoAuthToken.trim(),
        targetFacility: activeCenterName,
      });
  };

  const selectedStat =
    testResult?.facilityStats && sourceFacilityFilter !== '__ALL__'
      ? testResult.facilityStats.find(
          (f) => f.name.trim().toLowerCase() === sourceFacilityFilter.trim().toLowerCase()
        )
      : null;

  const previewTotalSessions = selectedStat ? selectedStat.sessionCount : (testResult?.totalSessions || 0);
  const previewTotalRows = selectedStat ? selectedStat.rowCount : (testResult?.totalRows || 0);
  const previewNewSessions = selectedStat ? selectedStat.newSessions : (testResult?.newSessions || 0);
  const previewExistingSessions = selectedStat ? selectedStat.existingSessions : (testResult?.existingSessions || 0);

  const handleExecuteImport = () => {
    const cleanUrl = tursoUrl.trim();
    if (!cleanUrl) {
      setImportError('يرجى إدخال رابط قاعدة بيانات Turso');
      return;
    }
    if (!activeCenterName) {
      setImportError('يرجى تحديد المركز النشط أولاً قبل استيراد البيانات.');
      return;
    }

    if (importMode === 'overwrite_all') {
      const confirmOverwrite = window.confirm(
        `تحذير: لقد اخترت "استبدال كامل لبيانات هذا المركز"، وسيتم حذف السجلات الحالية الخاصة بالمركز "${activeCenterName}" فقط واستبدالها بالسجلات المستوردة (ولن تتأثر بيانات أي مركز آخر). هل تريد الاستمرار بالتأكيد؟`
      );
      if (!confirmOverwrite) return;
    }

    setIsImporting(true);
    setImportError(null);

    (window as any).google.script.run
      .withSuccessHandler((res: any) => {
        setIsImporting(false);
        if (res && res.success) {
          setImportResult(res);
          onImportSuccess();
        } else {
          setImportError(res?.error || 'حدث خطأ أثناء استيراد البيانات.');
        }
      })
      .withFailureHandler((err: any) => {
        setIsImporting(false);
        setImportError(typeof err === 'string' ? err : err?.message || 'فشلت عملية النقل');
      })
      .importTursoData({
        tursoUrl: cleanUrl,
        tursoAuthToken: tursoAuthToken.trim(),
        importMode,
        importSettings,
        targetFacility: activeCenterName,
        sourceFacilityFilter,
      });
  };

  const resetAll = () => {
    setTestResult(null);
    setTestError(null);
    setImportResult(null);
    setImportError(null);
    setSourceFacilityFilter('__ALL__');
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 no-print overflow-y-auto font-['Cairo']"
      dir="rtl"
      onClick={() => {
        if (!isImporting) onClose();
      }}
    >
      <div
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full border border-sky-200/80 overflow-hidden text-right my-8 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — Light Futuristic Clinical Accent */}
        <div className="bg-gradient-to-l from-sky-50 via-cyan-50/80 to-white border-b border-sky-200/80 text-slate-900 p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-600 text-white flex items-center justify-center shadow-[0_8px_18px_-4px_rgba(2,132,199,0.4)] shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="8" ry="3"></ellipse>
                <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"></path>
                <path d="M4 11v6c0 1.66 3.58 3 8 3"></path>
                <path d="M18 14v7m0 0l-2.5-2.5M18 21l2.5-2.5" className="icon-anim-float" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold leading-tight text-slate-900">
                جلب السجلات السابقة للمركز من قاعدة Turso
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                استيراد السجلات الخاصة بالمركز النشط فقط بشكل معزول تماماً دون أي دمج أو تأثير على المراكز الأخرى
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!isImporting) onClose();
            }}
            disabled={isImporting}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-lg font-bold p-1.5 transition-colors disabled:opacity-40"
            title="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Active Center Isolation Banner */}
          {activeCenterName && (
            <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-600 shrink-0">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
                <span>المركز المستهدف للاستيراد:</span>
                <span className="bg-white border border-sky-200 px-2.5 py-0.5 rounded-lg text-sky-900 font-black">
                  {activeCenterName}
                </span>
              </div>
              <span className="text-[11px] text-sky-700 font-semibold hidden sm:inline">
                استيراد معزول لهذا المركز فقط
              </span>
            </div>
          )}

          {/* SUCCESS FINISH STATE */}
          {importResult && (
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-5 text-emerald-900 space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-base text-emerald-900">
                    تم استيراد سجلات المركز "{importResult.targetFacility || activeCenterName}" بنجاح!
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">{importResult.message}</p>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 text-center text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                  <div className="text-[11px] text-emerald-700 font-medium">جلسات مستوردة</div>
                  <div className="text-lg font-mono tabular-nums font-black text-emerald-900 mt-0.5">{importResult.importedSessions}</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                  <div className="text-[11px] text-emerald-700 font-medium">أسطر ملاحظات</div>
                  <div className="text-lg font-mono tabular-nums font-black text-emerald-900 mt-0.5">{importResult.totalImportedRows}</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                  <div className="text-[11px] text-emerald-700 font-medium">جلسات محدثة</div>
                  <div className="text-lg font-mono tabular-nums font-black text-emerald-900 mt-0.5">{importResult.updatedSessions}</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                  <div className="text-[11px] text-emerald-700 font-medium">جلسات مكررة تم تخطيها</div>
                  <div className="text-lg font-mono tabular-nums font-black text-emerald-900 mt-0.5">{importResult.skippedSessions}</div>
                </div>
              </div>

              {importResult.mergedSettingsCount !== undefined && importResult.mergedSettingsCount > 0 && (
                <div className="text-xs bg-emerald-100/70 text-emerald-900 p-2.5 rounded-xl flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-700 shrink-0">
                    <path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
                  </svg>
                  <span>تمت إضافة {importResult.mergedSettingsCount} عنصر إلى قوائم المركز "{importResult.targetFacility || activeCenterName}" فقط دون المساس بالمراكز الأخرى.</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateToRecords) onNavigateToRecords();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span>عرض السجلات في صفحة Records</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetAll();
                  }}
                  className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                >
                  استيراد من قاعدة أخرى
                </button>
              </div>
            </div>
          )}

          {/* CREDENTIALS FORM */}
          {!importResult && (
            <>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رابط قاعدة بيانات Turso السابقة (Database URL):
                    <span className="text-rose-500 mr-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={tursoUrl}
                    onChange={(e) => {
                      setTursoUrl(e.target.value);
                      if (testResult) setTestResult(null);
                      if (testError) setTestError(null);
                    }}
                    placeholder="libsql://your-old-db-org.turso.io"
                    className="w-full border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200/70 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono outline-none transition-all bg-white"
                    dir="ltr"
                    disabled={isTesting || isImporting}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    مثال: <code className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">libsql://my-previous-db.turso.io</code> أو من ملف <code className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">.env</code> السابق.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رمز المصادقة (Auth Token):
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={tursoAuthToken}
                      onChange={(e) => {
                        setTursoAuthToken(e.target.value);
                        if (testResult) setTestResult(null);
                        if (testError) setTestError(null);
                      }}
                      placeholder="eyJhbGciOi..."
                      className="w-full border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200/70 rounded-xl px-3.5 py-2.5 pl-16 text-xs text-slate-800 font-mono outline-none transition-all bg-white"
                      dir="ltr"
                      disabled={isTesting || isImporting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      {showToken ? 'إخفاء' : 'إظهار'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    اتركه فارغاً فقط إذا كانت القاعدة محلية (Local) بدون تشفير.
                  </p>
                </div>

                {/* Test Connection Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || isImporting || !tursoUrl.trim()}
                    className="w-full sm:w-auto bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    {isTesting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>جاري فحص الاتصال وقراءة السجلات...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <span>فحص الاتصال ومعاينة السجلات</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* TEST ERROR */}
              {testError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs font-bold flex items-start gap-2.5 animate-fade-in">
                  <span className="text-base text-rose-500">✕</span>
                  <div className="flex-1">
                    <div>{testError}</div>
                    <div className="text-[11px] font-normal text-rose-600 mt-1">
                      تأكد من صحة رابط Turso ورمز Auth Token، وأن جدول Observations موجود في قاعدة البيانات السابقة.
                    </div>
                  </div>
                </div>
              )}

              {/* TEST SUCCESS PREVIEW CARD */}
              {testResult && testResult.success && (
                <div className="bg-sky-50/50 border border-sky-200 rounded-2xl p-4.5 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-sky-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <h4 className="font-bold text-sm text-slate-900">
                        معاينة سجلات قاعدة البيانات السابقة (<span className="font-mono tabular-nums">{testResult.totalSessions}</span> جلسة)
                      </h4>
                    </div>
                    <span className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-md font-bold">
                      متصل
                    </span>
                  </div>

                  {/* Source Facility Selector when remote DB has multiple facilities */}
                  {testResult.facilities && testResult.facilities.length > 1 && (
                    <div className="bg-white p-3.5 rounded-xl border border-sky-200 space-y-2">
                      <label className="block text-xs font-bold text-slate-900">
                        تحتوي القاعدة السابقة على عدة مراكز — حدد بيانات المركز المطلوب استيرادها إلى "{activeCenterName}" فقط:
                      </label>
                      <select
                        value={sourceFacilityFilter}
                        onChange={(e) => setSourceFacilityFilter(e.target.value)}
                        disabled={isImporting}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 focus:border-sky-500 outline-none"
                      >
                        {(testResult.facilityStats || testResult.facilities.map(name => ({ name, sessionCount: 0, rowCount: 0 }))).map((f: any) => (
                          <option key={f.name} value={f.name}>
                            {f.name}{f.sessionCount ? ` (${f.sessionCount} جلسة / ${f.rowCount} سطر)` : ''}
                          </option>
                        ))}
                        <option value="__ALL__">استيراد جميع السجلات وتعيينها للمركز "{activeCenterName}" فقط</option>
                      </select>
                      <p className="text-[11px] text-slate-500">
                        لن يتم إنشاء مراكز جديدة أو دمج البيانات مع المراكز الأخرى؛ سيتم استيراد سجلات الاختيار المحدد لحساب "{activeCenterName}" فقط.
                      </p>
                    </div>
                  )}

                  {/* Stat Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-bold">إجمالي الجلسات المحددة</div>
                      <div className="text-lg font-mono tabular-nums font-black text-sky-800 mt-0.5">{previewTotalSessions}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500 font-bold">أسطر الملاحظات</div>
                      <div className="text-lg font-mono tabular-nums font-black text-slate-800 mt-0.5">{previewTotalRows}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                      <div className="text-[10px] text-emerald-700 font-bold">جلسات جديدة لهذا المركز</div>
                      <div className="text-lg font-mono tabular-nums font-black text-emerald-700 mt-0.5">+{previewNewSessions}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                      <div className="text-[10px] text-amber-700 font-bold">موجودة مسبقاً بالمركز</div>
                      <div className="text-lg font-mono tabular-nums font-black text-amber-700 mt-0.5">{previewExistingSessions}</div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="text-xs space-y-1.5 bg-white p-3 rounded-xl border border-slate-200/80 text-slate-700">
                    {testResult.minDate && testResult.maxDate && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">نطاق التواريخ:</span>
                        <span className="font-mono tabular-nums text-sky-800">من {testResult.minDate} إلى {testResult.maxDate}</span>
                      </div>
                    )}
                    {testResult.facilities.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-slate-800 shrink-0">المراكز الموجودة بالقاعدة السابقة:</span>
                        <span className="text-slate-600 truncate">{testResult.facilities.join('، ')}</span>
                      </div>
                    )}
                    {testResult.departments.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-slate-800 shrink-0">الأقسام المرصودة:</span>
                        <span className="text-slate-600 truncate">{testResult.departments.join('، ')}</span>
                      </div>
                    )}
                  </div>

                  {/* IMPORT OPTIONS */}
                  <div className="pt-2 border-t border-sky-200/80 space-y-3">
                    <div className="font-bold text-xs text-slate-800">طريقة استيراد البيانات للمركز "{activeCenterName}":</div>

                    <div className="space-y-2">
                      <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-sky-200 bg-white hover:bg-sky-50/40 cursor-pointer transition-colors text-xs">
                        <input
                          type="radio"
                          name="importMode"
                          value="merge_skip_existing"
                          checked={importMode === 'merge_skip_existing'}
                          onChange={() => setImportMode('merge_skip_existing')}
                          className="mt-0.5 text-sky-600 focus:ring-sky-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>استيراد الجلسات الجديدة لهذا المركز فقط (تخطي المكرر)</span>
                            <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-2 py-0.2 rounded-md">
                              موصى به
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            يضيف {previewNewSessions} جلسة جديدة لحساب "{activeCenterName}" فقط دون المساس بسجلات أي مركز آخر.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-sky-50/40 cursor-pointer transition-colors text-xs">
                        <input
                          type="radio"
                          name="importMode"
                          value="merge_overwrite_existing"
                          checked={importMode === 'merge_overwrite_existing'}
                          onChange={() => setImportMode('merge_overwrite_existing')}
                          className="mt-0.5 text-sky-600 focus:ring-sky-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800">
                            تحديث وإضافة جلسات هذا المركز فقط
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            يحدث الجلسات المتطابقة داخل "{activeCenterName}" فقط ويضيف الجلسات الجديدة دون التأثير على باقي المراكز.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50/40 cursor-pointer transition-colors text-xs">
                        <input
                          type="radio"
                          name="importMode"
                          value="overwrite_all"
                          checked={importMode === 'overwrite_all'}
                          onChange={() => setImportMode('overwrite_all')}
                          className="mt-0.5 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="font-bold text-rose-700">
                            استبدال كامل لسجلات "{activeCenterName}" فقط
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            يحذف السجلات الحالية لهذا المركز فقط ويستبدلها بالمستوردة، مع بقاء بيانات جميع المراكز الأخرى سليمة تماماً.
                          </div>
                        </div>
                      </label>
                    </div>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={importSettings}
                        onChange={(e) => setImportSettings(e.target.checked)}
                        className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                      />
                      <span>استيراد الأقسام والعنابر والخدمات والملاحظين لقوائم المركز "{activeCenterName}" فقط</span>
                    </label>
                  </div>

                  {/* IMPORT ERROR */}
                  {importError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-bold">
                      {importError}
                    </div>
                  )}

                  {/* EXECUTE IMPORT BUTTON */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleExecuteImport}
                      disabled={isImporting}
                      className="w-full bg-gradient-to-r from-[#F26522] to-[#EA580C] hover:from-[#EA580C] hover:to-[#D44908] disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm active:scale-98"
                    >
                      {isImporting ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>جاري استيراد سجلات المركز "{activeCenterName}"...</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="icon-anim-float">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          <span>استيراد {importMode === 'merge_skip_existing' ? previewNewSessions : previewTotalSessions} جلسة لحساب "{activeCenterName}" فقط</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50/90 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600 shrink-0">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>يتم نقل البيانات مباشرة عبر اتصال مشفر وآمن دون فقدان لأي سجلات</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="text-slate-600 hover:text-slate-800 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
