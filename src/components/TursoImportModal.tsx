import React, { useState } from 'react';

export interface TursoTestResult {
  success: boolean;
  totalRows: number;
  totalSessions: number;
  newSessions: number;
  existingSessions: number;
  minDate: string | null;
  maxDate: string | null;
  facilities: string[];
  departments: string[];
  hasSettings: boolean;
  message?: string;
  error?: string;
}

export interface TursoImportResult {
  success: boolean;
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
}

export const TursoImportModal: React.FC<TursoImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onNavigateToRecords,
}) => {
  const [tursoUrl, setTursoUrl] = useState('');
  const [tursoAuthToken, setTursoAuthToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TursoTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [importMode, setImportMode] = useState<'merge_skip_existing' | 'merge_overwrite_existing' | 'overwrite_all'>('merge_skip_existing');
  const [importSettings, setImportSettings] = useState(true);

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<TursoImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

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
      });
  };

  const handleExecuteImport = () => {
    const cleanUrl = tursoUrl.trim();
    if (!cleanUrl) {
      setImportError('يرجى إدخال رابط قاعدة بيانات Turso');
      return;
    }

    if (importMode === 'overwrite_all') {
      const confirmOverwrite = window.confirm(
        'تحذير: لقد اخترت "استبدال شامل"، وسيتم حذف كافة السجلات الموجودة في القاعدة الحالية واستبدالها بسجلات القاعدة السابقة. هل تريد الاستمرار بالتأكيد؟'
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
      });
  };

  const resetAll = () => {
    setTestResult(null);
    setTestError(null);
    setImportResult(null);
    setImportError(null);
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print overflow-y-auto font-['Cairo']"
      dir="rtl"
      onClick={() => {
        if (!isImporting) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden text-right my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-2xl shadow-inner shrink-0">
              📥
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold leading-tight">
                جلب السجلات من قاعدة بيانات Turso سابقة
              </h3>
              <p className="text-xs text-purple-200 mt-1 leading-relaxed">
                استيراد سجلات المركز السابقة والملاحظات القديمة ودمجها مع القاعدة الحالية دون تكرار
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!isImporting) onClose();
            }}
            disabled={isImporting}
            className="text-white/70 hover:text-white text-xl font-bold p-1 transition-colors disabled:opacity-40"
            title="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* SUCCESS FINISH STATE */}
          {importResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-900 space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-base text-emerald-800">
                    تم استيراد سجلات المركز بنجاح!
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">{importResult.message}</p>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 text-center text-xs">
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                  <div className="text-[11px] text-emerald-600 font-medium">جلسات مستوردة</div>
                  <div className="text-lg font-black text-emerald-900 mt-0.5">{importResult.importedSessions}</div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                  <div className="text-[11px] text-emerald-600 font-medium">أسطر ملاحظات</div>
                  <div className="text-lg font-black text-emerald-900 mt-0.5">{importResult.totalImportedRows}</div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                  <div className="text-[11px] text-emerald-600 font-medium">جلسات محدثة</div>
                  <div className="text-lg font-black text-emerald-900 mt-0.5">{importResult.updatedSessions}</div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                  <div className="text-[11px] text-emerald-600 font-medium">جلسات سابقة مكررة</div>
                  <div className="text-lg font-black text-emerald-900 mt-0.5">{importResult.skippedSessions}</div>
                </div>
              </div>

              {importResult.mergedSettingsCount !== undefined && importResult.mergedSettingsCount > 0 && (
                <div className="text-xs bg-emerald-100/60 text-emerald-800 p-2.5 rounded-lg flex items-center gap-2">
                  <span>🏢</span>
                  <span>تم دمج {importResult.mergedSettingsCount} عنصر جديد (مرافق وأقسام وملاحظين) في قوائم الإعدادات.</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateToRecords) onNavigateToRecords();
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span>عرض السجلات في صفحة Records 📁</span>
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
                    <span className="text-red-500 mr-1">*</span>
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
                    className="w-full border-2 border-slate-300 focus:border-purple-600 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono outline-none transition-colors"
                    dir="ltr"
                    disabled={isTesting || isImporting}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    مثال: <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">libsql://my-previous-db.turso.io</code> أو من ملف <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">.env</code> السابق.
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
                      className="w-full border-2 border-slate-300 focus:border-purple-600 rounded-xl px-3.5 py-2.5 pl-16 text-xs text-slate-800 font-mono outline-none transition-colors"
                      dir="ltr"
                      disabled={isTesting || isImporting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
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
                    className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-95"
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
                        <span>🔍 فحص الاتصال ومعاينة السجلات</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* TEST ERROR */}
              {testError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3.5 text-xs font-bold flex items-start gap-2.5 animate-fade-in">
                  <span className="text-base text-red-500">✕</span>
                  <div className="flex-1">
                    <div>{testError}</div>
                    <div className="text-[11px] font-normal text-red-600 mt-1">
                      تأكد من صحة رابط Turso ورمز Auth Token، وأن جدول Observations موجود في قاعدة البيانات السابقة.
                    </div>
                  </div>
                </div>
              )}

              {/* TEST SUCCESS PREVIEW CARD */}
              {testResult && testResult.success && (
                <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4.5 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-purple-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                      <h4 className="font-bold text-sm text-purple-950">
                        معاينة سجلات قاعدة البيانات السابقة ({testResult.totalSessions} جلسة)
                      </h4>
                    </div>
                    <span className="text-[11px] bg-purple-200/60 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                      تم الاتصال بنجاح ✓
                    </span>
                  </div>

                  {/* Stat Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2.5 rounded-xl border border-purple-200/80 shadow-xs">
                      <div className="text-[10px] text-slate-500 font-bold">إجمالي الجلسات</div>
                      <div className="text-lg font-black text-purple-900 mt-0.5">{testResult.totalSessions}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-purple-200/80 shadow-xs">
                      <div className="text-[10px] text-slate-500 font-bold">أسطر الملاحظات</div>
                      <div className="text-lg font-black text-purple-900 mt-0.5">{testResult.totalRows}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-green-200 shadow-xs">
                      <div className="text-[10px] text-green-700 font-bold">جلسات جديدة تماماً</div>
                      <div className="text-lg font-black text-green-700 mt-0.5">+{testResult.newSessions}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-xs">
                      <div className="text-[10px] text-amber-700 font-bold">جلسات موجودة مسبقاً</div>
                      <div className="text-lg font-black text-amber-700 mt-0.5">{testResult.existingSessions}</div>
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="text-xs space-y-1.5 bg-white/70 p-3 rounded-xl border border-purple-100 text-slate-700">
                    {testResult.minDate && testResult.maxDate && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">📅 نطاق التواريخ:</span>
                        <span className="font-mono text-purple-900">من {testResult.minDate} إلى {testResult.maxDate}</span>
                      </div>
                    )}
                    {testResult.facilities.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-slate-800 shrink-0">🏥 المراكز / المستشفيات:</span>
                        <span className="text-slate-600 truncate">{testResult.facilities.join('، ')}</span>
                      </div>
                    )}
                    {testResult.departments.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-slate-800 shrink-0">🏢 الأقسام المرصودة:</span>
                        <span className="text-slate-600 truncate">{testResult.departments.join('، ')}</span>
                      </div>
                    )}
                  </div>

                  {/* IMPORT OPTIONS */}
                  <div className="pt-2 border-t border-purple-200/80 space-y-3">
                    <div className="font-bold text-xs text-slate-800">خيارات الدمج والاستيراد:</div>

                    <div className="space-y-2">
                      <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50/40 cursor-pointer transition-colors text-xs">
                        <input
                          type="radio"
                          name="importMode"
                          value="merge_skip_existing"
                          checked={importMode === 'merge_skip_existing'}
                          onChange={() => setImportMode('merge_skip_existing')}
                          className="mt-0.5 text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>دمج السجلات وإضافة الجلسات الجديدة فقط</span>
                            <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.2 rounded-full">
                              موصى به
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            يتم إضافة {testResult.newSessions} جلسة جديدة للقاعدة الحالية، وتخطي الجلسات المكررة منعاً لأي تعارض.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50/40 cursor-pointer transition-colors text-xs">
                        <input
                          type="radio"
                          name="importMode"
                          value="merge_overwrite_existing"
                          checked={importMode === 'merge_overwrite_existing'}
                          onChange={() => setImportMode('merge_overwrite_existing')}
                          className="mt-0.5 text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800">
                            تحديث وإضافة (استبدال الجلسات المتطابقة بالبيانات السابقة + إضافة الجديدة)
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            مفيد إذا كانت بيانات القاعدة السابقة أحدث أو تود إعادة مزامنة الجلسات المتطابقة.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-red-200 bg-white hover:bg-red-50/40 cursor-pointer transition-colors text-xs">
                        <input
                          type="radio"
                          name="importMode"
                          value="overwrite_all"
                          checked={importMode === 'overwrite_all'}
                          onChange={() => setImportMode('overwrite_all')}
                          className="mt-0.5 text-red-600 focus:ring-red-500"
                        />
                        <div>
                          <div className="font-bold text-red-700">
                            استبدال كامل (حذف السجلات الحالية واستبدالها بسجلات القاعدة السابقة)
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            يفرغ جدول السجلات الحالي بالكامل ويضع مكانه سجلات القاعدة السابقة.
                          </div>
                        </div>
                      </label>
                    </div>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-purple-200 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={importSettings}
                        onChange={(e) => setImportSettings(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <span>دمج المرافق والأقسام والخدمات والملاحظين في القوائم المنسدلة للإعدادات تلقائياً</span>
                    </label>
                  </div>

                  {/* IMPORT ERROR */}
                  {importError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs font-bold">
                      {importError}
                    </div>
                  )}

                  {/* EXECUTE IMPORT BUTTON */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleExecuteImport}
                      disabled={isImporting}
                      className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 disabled:from-purple-300 disabled:to-indigo-300 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-98"
                    >
                      {isImporting ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>جاري جلب السجلات ونقلها إلى القاعدة الحالية...</span>
                        </>
                      ) : (
                        <>
                          <span>🚀 بدء استيراد {importMode === 'merge_skip_existing' ? testResult.newSessions : testResult.totalSessions} جلسة إلى القاعدة الحالية</span>
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
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>🛡️</span>
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
    </div>
  );
};
