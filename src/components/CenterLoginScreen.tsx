import React, { useState, useEffect } from 'react';

interface FacilitySummary {
  name: string;
  sessionCount: number;
  rowCount: number;
}

interface CenterLoginScreenProps {
  onSelectCenter: (centerName: string) => void;
  currentCenter: string | null;
  settings: any;
  setSettings?: (settings: any) => void;
}

export const CenterLoginScreen: React.FC<CenterLoginScreenProps> = ({
  onSelectCenter,
  currentCenter,
  settings,
  setSettings
}) => {
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCenterName, setNewCenterName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Deletion modal state
  const [facilityToDelete, setFacilityToDelete] = useState<FacilitySummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch facilities summary
  const fetchFacilities = () => {
    setLoading(true);
    const runner = (window as any).google?.script?.run;
    if (!runner) {
      setLoading(false);
      return;
    }

    runner
      .withSuccessHandler((res: any) => {
        setLoading(false);
        if (res && res.facilities) {
          setFacilities(res.facilities);
          if (res.settings && setSettings) {
            setSettings(res.settings);
          }
        } else if (settings?.facilities) {
          // Fallback to settings
          setFacilities(
            settings.facilities.map((f: string) => ({
              name: f,
              sessionCount: 0,
              rowCount: 0
            }))
          );
        }
      })
      .withFailureHandler((err: any) => {
        setLoading(false);
        console.error("Error fetching facilities:", err);
        // Fallback to settings
        if (settings?.facilities) {
          setFacilities(
            settings.facilities.map((f: string) => ({
              name: f,
              sessionCount: 0,
              rowCount: 0
            }))
          );
        }
      })
      .getFacilitiesSummary();
  };

  useEffect(() => {
    fetchFacilities();
  }, [settings]);

  // Handle Add Facility
  const handleAddCenter = (enterImmediately: boolean = true) => {
    const trimmed = newCenterName.trim();
    if (!trimmed) {
      setActionMessage({ text: 'يرجى إدخال اسم المركز أولاً', type: 'error' });
      return;
    }

    setIsAdding(true);
    setActionMessage(null);

    const runner = (window as any).google?.script?.run;
    runner
      .withSuccessHandler((res: any) => {
        setIsAdding(false);
        if (res && res.success) {
          setNewCenterName('');
          setActionMessage({
            text: res.message || `تمت إضافة المركز "${trimmed}" بنجاح`,
            type: 'success'
          });
          if (res.settings && setSettings) {
            setSettings(res.settings);
          }
          fetchFacilities();

          if (enterImmediately) {
            onSelectCenter(trimmed);
          }
        } else {
          setActionMessage({
            text: res?.error || 'حدث خطأ أثناء إضافة المركز',
            type: 'error'
          });
        }
      })
      .withFailureHandler((err: any) => {
        setIsAdding(false);
        setActionMessage({
          text: 'فشل الاتصال بالخادم: ' + String(err),
          type: 'error'
        });
      })
      .addFacility({ facility: trimmed });
  };

  // Handle Delete Facility
  const confirmDeleteFacility = () => {
    if (!facilityToDelete) return;
    setIsDeleting(true);

    const targetName = facilityToDelete.name;
    const runner = (window as any).google?.script?.run;

    runner
      .withSuccessHandler((res: any) => {
        setIsDeleting(false);
        setFacilityToDelete(null);
        if (res && res.success) {
          setActionMessage({
            text: res.message || `تم حذف المركز "${targetName}" وجميع بياناته بنجاح`,
            type: 'success'
          });
          if (res.settings && setSettings) {
            setSettings(res.settings);
          }
          // If the deleted center was active, clear it
          if (currentCenter && currentCenter.trim().toLowerCase() === targetName.trim().toLowerCase()) {
            localStorage.removeItem('who_hh_active_center');
          }
          fetchFacilities();
        } else {
          setActionMessage({
            text: res?.error || 'حدث خطأ أثناء حذف المركز',
            type: 'error'
          });
        }
      })
      .withFailureHandler((err: any) => {
        setIsDeleting(false);
        setFacilityToDelete(null);
        setActionMessage({
          text: 'فشل الاتصال بالخادم أثناء الحذف: ' + String(err),
          type: 'error'
        });
      })
      .deleteFacility({ facility: targetName });
  };

  // Filter facilities
  const filteredFacilities = facilities.filter(f =>
    f.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50/30 to-slate-100 flex flex-col justify-between p-4 md:p-8" dir="rtl">
      {/* Top Bar with WHO Branding */}
      <header className="max-w-5xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4 py-4 border-b border-orange-200/60 pb-6 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18"/>
              <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
              <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/>
              <line x1="10" y1="9" x2="14" y2="9"/>
              <line x1="12" y1="7" x2="12" y2="11"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span>تسجيل الدخول للمراكز الصحية</span>
              <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full font-bold">WHO Tools</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium">
              نظام رصد الامتثال لنظافة الأيدي - منظمة الصحة العالمية
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full flex-1">
        {/* Banner Alert if any */}
        {actionMessage && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-semibold shadow-sm animate-fade-in ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs underline hover:opacity-80"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Action Panel: Add Center & Search */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
          {/* Add New Center Card */}
          <div className="md:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-2.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>إضافة مركز أو مستشفى جديد</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="أدخل اسم المركز أو المستشفى الجديد..."
                value={newCenterName}
                onChange={(e) => setNewCenterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCenter(true);
                  }
                }}
                disabled={isAdding}
                className="flex-1 form-input-bg text-right px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAddCenter(true)}
                  disabled={isAdding || !newCenterName.trim()}
                  className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap"
                >
                  {isAdding ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  )}
                  <span>إضافة ودخول</span>
                </button>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              * يتم حفظ المركز تلقائياً وفصل بياناته وجلساته وإحصائياته عن المراكز الأخرى.
            </div>
          </div>

          {/* Search Centers Card */}
          <div className="md:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <h2 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>البحث في المراكز المسجلة ({facilities.length})</span>
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث باسم المركز..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full form-input-bg text-right px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  مسح
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Centers Grid Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">اختر المركز للمتابعة:</h2>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-bold">
              {filteredFacilities.length} مركز
            </span>
          </div>
          <button
            onClick={fetchFacilities}
            disabled={loading}
            className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 font-semibold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}>
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>تحديث القائمة</span>
          </button>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="inline-block w-8 h-8 border-3 border-orange-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <div className="text-sm font-semibold text-slate-600">جاري تحميل قائمة المراكز والبيانات...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredFacilities.length === 0 && (
          <div className="py-14 px-6 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18"/>
                <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
                <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/>
                <line x1="10" y1="9" x2="14" y2="9"/>
                <line x1="12" y1="7" x2="12" y2="11"/>
              </svg>
            </div>
            {searchQuery ? (
              <>
                <h3 className="text-base font-bold text-slate-800 mb-1">لا توجد مراكز تطابق البحث "{searchQuery}"</h3>
                <p className="text-xs text-slate-500 mb-4">يرجى التأكد من كتابة الاسم بالشكل الصحيح أو مسح البحث</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  عرض جميع المراكز
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-slate-800 mb-1">لا توجد مراكز مضافة بعد</h3>
                <p className="text-xs text-slate-500 mb-4">ابدأ بإضافة أول مركز صحي أو مستشفى باستخدام النموذج أعلاه</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['مستشفى المنيا الجامعي للعيون', 'مركز طب وجراحة العيون', 'مستشفى التأمين الصحي'].map(sugg => (
                    <button
                      key={sugg}
                      onClick={() => {
                        setNewCenterName(sugg);
                      }}
                      className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-semibold transition"
                    >
                      + {sugg}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Facilities Grid */}
        {!loading && filteredFacilities.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFacilities.map((fac) => {
              const isSelected = currentCenter && currentCenter.trim().toLowerCase() === fac.name.trim().toLowerCase();

              return (
                <div
                  key={fac.name}
                  className={`bg-white rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between hover:shadow-md relative group ${
                    isSelected
                      ? 'border-orange-500 ring-2 ring-orange-200 bg-orange-50/20'
                      : 'border-slate-200/90 hover:border-orange-300'
                  }`}
                >
                  {/* Top Bar: Center Icon, Name, and Delete Button */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isSelected
                              ? 'bg-orange-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700 group-hover:bg-orange-100 group-hover:text-orange-700'
                          } transition-colors`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 21h18"/>
                            <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
                            <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-1" title={fac.name}>
                            {fac.name}
                          </h3>
                          {isSelected && (
                            <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full inline-block mt-0.5">
                              المركز النشط حالياً
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFacilityToDelete(fac);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title={`حذف المركز "${fac.name}" وجميع بياناته`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>

                    {/* Stats Badges */}
                    <div className="flex items-center gap-2 mb-4 text-xs font-semibold">
                      <div className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <span>{fac.sessionCount} جلسة رصد</span>
                      </div>
                      <div className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                        <span>{fac.rowCount} ملاحظة</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Enter Button */}
                  <button
                    onClick={() => onSelectCenter(fac.name)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${
                      isSelected
                        ? 'bg-slate-800 hover:bg-slate-900 text-white'
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                    }`}
                  >
                    <span>{isSelected ? 'متابعة العمل في هذا المركز' : 'دخول المركز'}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {facilityToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200">
            {/* Modal Header */}
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">تأكيد حذف المركز نهائياً</h3>
                <p className="text-xs text-rose-600 font-semibold">تحذير: هذا الإجراء لا يمكن الرجوع عنه!</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 mb-4 text-xs text-slate-700 space-y-2">
              <p className="font-bold text-slate-900 text-sm">
                هل أنت متأكد من رغبتك في حذف:
                <span className="block text-rose-700 text-base font-black mt-1">"{facilityToDelete.name}"</span>
              </p>
              <div className="border-t border-rose-200/80 pt-2 text-rose-900">
                ⚠️ <strong>تنبيه صارم:</strong> سيتم حذف المركز من الإعدادات، و<span className="underline font-bold">حذف جميع جلسات الرصد والملاحظات والإحصائيات التابعة له نهائياً</span> من قاعدة البيانات ({facilityToDelete.sessionCount} جلسة، {facilityToDelete.rowCount} سطر رصد).
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2">
              <button
                onClick={confirmDeleteFacility}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>جاري حذف المركز وبياناته...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    <span>نعم، احذف المركز وكافة بياناته نهائياً</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setFacilityToDelete(null)}
                disabled={isDeleting}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center py-6 text-xs text-slate-400 border-t border-slate-200/60 mt-8">
        <div>نظام رصد نظافة اليدين طبقاً لمنهجية منظمة الصحة العالمية (WHO)</div>
        <div className="mt-1">&copy; 2026 د. فادي عزت. جميع الحقوق محفوظة</div>
      </footer>
    </div>
  );
};
