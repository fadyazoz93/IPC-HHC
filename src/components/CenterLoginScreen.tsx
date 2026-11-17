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
  }, []);

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
    <div className="min-h-screen clinical-futuristic-bg flex flex-col justify-between p-4 md:p-8" dir="rtl">
      {/* Top Bar with Futuristic Clinical Hand Hygiene Branding */}
      <header className="max-w-5xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4 py-4 border-b border-sky-200/70 pb-6 mb-6">
        <div className="flex items-center gap-4">
          {/* Animated Hand Hygiene Droplet + Clinical Shield Emblem */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-600 to-teal-600 flex items-center justify-center text-white shadow-[0_10px_25px_-6px_rgba(2,132,199,0.45)] relative overflow-hidden shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="13.5" stroke="rgba(255,255,255,0.28)" strokeWidth="1" strokeDasharray="3 3" className="icon-anim-orbit" />
              <g className="icon-anim-droplet">
                <path d="M16 4.5C16 4.5 11.2 10.6 11.2 13.6C11.2 16.25 13.35 18.4 16 18.4C18.65 18.4 20.8 16.25 20.8 13.6C20.8 10.6 16 4.5 16 4.5Z" fill="#E0F2FE" stroke="#FFFFFF" strokeWidth="1.2" />
                <path d="M16 10.8V15.2M13.8 13H18.2" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" />
              </g>
              <path d="M5.5 21.5C6.8 19.2 9.4 18.8 12.2 20L15.4 21.4C16 21.7 15.7 23 14.8 23L11.2 22.3C10 22 8.6 22.9 7.8 24.3C7 25.7 8.8 26.8 11 26.5L16.5 25.8" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M26.5 21.5C25.2 19.2 22.6 18.8 19.8 20L16.6 21.4C16 21.7 16.3 23 17.2 23L20.8 22.3C22 22 23.4 22.9 24.2 24.3C25 25.7 23.2 26.8 21 26.5L15.5 25.8" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                بوابة المراكز والمنشآت الصحية
              </h1>
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200/80 px-2.5 py-0.5 rounded-md font-bold">
                WHO Hand Hygiene
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              النظام السريري الذكي لرصد الامتثال لنظافة الأيدي ومكافحة العدوى
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2.5 text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600 icon-anim-float">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M9 12l2 2 4-4" stroke="#0D9488" strokeWidth="2.2"/>
          </svg>
          <span>بيئة معزولة لكل مركز صحي</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full flex-1">
        {/* Banner Alert if any */}
        {actionMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-semibold shadow-sm animate-fade-in backdrop-blur-md ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50/90 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50/90 text-rose-900 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {actionMessage.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-black/5 transition"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Action Panel: Add Center & Search */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-7">
          {/* Add New Center Card */}
          <div className="md:col-span-7 glass-panel rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200/80 text-[#F26522] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="icon-anim-float">
                  <path d="M3 21h18"/>
                  <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
                  <path d="M12 7v4M10 9h4"/>
                </svg>
              </span>
              <span>إضافة مركز أو منشأة صحية جديدة</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-2.5">
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
                className="flex-1 form-input-bg text-right px-3.5 py-2.5 rounded-xl border border-slate-300/90 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200/70 outline-none transition"
              />
              <button
                type="button"
                onClick={() => handleAddCenter(true)}
                disabled={isAdding || !newCenterName.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-[#F26522] to-[#EA580C] hover:from-[#EA580C] hover:to-[#D44908] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-[0_6px_16px_-4px_rgba(242,101,34,0.45)] whitespace-nowrap active:scale-95"
              >
                {isAdding ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="icon-hover-spin">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                )}
                <span>إضافة ودخول</span>
              </button>
            </div>
            <div className="mt-2.5 text-[11px] text-slate-500 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-600 shrink-0">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>يتم حفظ المركز تلقائياً وفصل سجلاته وإعداداته بالكامل عن المراكز الأخرى.</span>
            </div>
          </div>

          {/* Search Centers Card */}
          <div className="md:col-span-5 glass-panel rounded-2xl p-5 flex flex-col justify-between">
            <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200/80 text-sky-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7.5"></circle>
                    <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
                  </svg>
                </span>
                <span>البحث في المراكز المسجلة</span>
              </span>
              <span className="font-mono tabular-nums text-xs text-sky-700 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded-md font-bold">
                {facilities.length}
              </span>
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث باسم المركز..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full form-input-bg text-right px-3.5 py-2.5 rounded-xl border border-slate-300/90 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200/70 outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-slate-100"
                >
                  مسح
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Centers Grid Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-extrabold text-slate-800">اختر المركز للمتابعة</h2>
            <span className="text-xs font-mono tabular-nums bg-white border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-md font-bold shadow-2xs">
              {filteredFacilities.length} مركز
            </span>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="py-16 text-center glass-panel rounded-2xl">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 items-center justify-center mb-3 text-sky-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-anim-orbit">
                <circle cx="12" cy="12" r="9" strokeDasharray="16 8" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-slate-600">جاري تحميل قائمة المراكز والبيانات...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredFacilities.length === 0 && (
          <div className="py-14 px-6 text-center glass-panel rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-50 to-teal-50 border border-sky-200/80 text-sky-600 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="icon-anim-float">
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
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
                      className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold transition"
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
                  className={`glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between relative group ${
                    isSelected
                      ? 'border-sky-400 ring-2 ring-sky-200/70'
                      : ''
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm'
                              : 'bg-sky-50 border border-sky-200/70 text-sky-700 group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-anim-float">
                            <path d="M3 21h18"/>
                            <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
                            <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/>
                            <path d="M12 7.5v3M10.5 9h3" className="icon-anim-sparkle"/>
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900 leading-snug truncate" title={fac.name}>
                            {fac.name}
                          </h3>
                          <span className="text-[11px] font-medium text-slate-400">
                            {isSelected ? 'المركز النشط حالياً' : 'منشأة رصد معزولة'}
                          </span>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFacilityToDelete(fac);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                        title={`حذف المركز "${fac.name}" وجميع بياناته`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>

                    {/* Clean Telemetry Stats Row (No pill sandwiches) */}
                    <div className="grid grid-cols-2 gap-2.5 py-2.5 px-3 rounded-xl bg-slate-50/90 border border-slate-200/70 mb-4 text-xs">
                      <div className="flex items-center gap-2 text-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-600 shrink-0">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <path d="M9 14l2 2 4-4"/>
                        </svg>
                        <div className="leading-tight">
                          <div className="font-mono tabular-nums font-bold text-slate-900">{fac.sessionCount}</div>
                          <div className="text-[10px] text-slate-500">جلسة رصد</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 border-r border-slate-200/80 pr-2.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600 shrink-0">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" className="icon-anim-ecg"></polyline>
                        </svg>
                        <div className="leading-tight">
                          <div className="font-mono tabular-nums font-bold text-slate-900">{fac.rowCount}</div>
                          <div className="text-[10px] text-slate-500">ملاحظة مسجلة</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Primary Enter Button */}
                  <button
                    onClick={() => onSelectCenter(fac.name)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 ${
                      isSelected
                        ? 'bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white'
                        : 'bg-gradient-to-r from-[#F26522] to-[#EA580C] hover:from-[#EA580C] hover:to-[#D44908] text-white'
                    }`}
                  >
                    <span>{isSelected ? 'متابعة العمل في هذا المركز' : 'دخول المركز'}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="icon-hover-shift">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4 animate-fade-in" dir="rtl">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
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

            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 mb-4 text-xs text-slate-700 space-y-2">
              <p className="font-bold text-slate-900 text-sm">
                هل أنت متأكد من رغبتك في حذف:
                <span className="block text-rose-700 text-base font-black mt-1">"{facilityToDelete.name}"</span>
              </p>
              <div className="border-t border-rose-200/80 pt-2 text-rose-900">
                <strong>تنبيه صارم:</strong> سيتم حذف المركز من الإعدادات، و<span className="underline font-bold">حذف جميع جلسات الرصد والملاحظات والإحصائيات التابعة له نهائياً</span> من قاعدة البيانات (<span className="font-mono tabular-nums">{facilityToDelete.sessionCount}</span> جلسة، <span className="font-mono tabular-nums">{facilityToDelete.rowCount}</span> سطر رصد).
              </div>
            </div>

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
      <footer className="max-w-5xl mx-auto w-full text-center py-6 text-xs text-slate-400 border-t border-sky-200/50 mt-8">
        <div>نظام رصد نظافة اليدين طبقاً لمنهجية منظمة الصحة العالمية (WHO)</div>
        <div className="mt-1">&copy; 2026 د. فادي عزت. جميع الحقوق محفوظة</div>
      </footer>
    </div>
  );
};
