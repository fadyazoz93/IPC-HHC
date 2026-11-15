import React, { useState } from 'react';

export type UserRole = 'admin' | 'manager' | 'user';

export interface RoleMeta {
  id: UserRole;
  titleAr: string;
  titleEn: string;
  descAr: string;
  badgeClass: string;
}

export const ROLES_META: Record<UserRole, RoleMeta> = {
  user: {
    id: 'user',
    titleAr: 'مستخدم',
    titleEn: 'User',
    descAr: 'الدخول لجميع الصفحات وتعديل الإعدادات العامة وإدخال النماذج الجديدة (بدون نسخ أو تعديل أو حذف السجلات، وكلمات المرور للـ Admin فقط)',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  manager: {
    id: 'manager',
    titleAr: 'مدير',
    titleEn: 'Manager',
    descAr: 'صلاحية التصفح وعرض التقارير فقط (بدون الدخول لصفحة الإعدادات)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  admin: {
    id: 'admin',
    titleAr: 'مسؤول النظام',
    titleEn: 'Admin',
    descAr: 'كامل الصلاحيات في التطبيق مع إدارة الإعدادات وكلمات المرور',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
  },
};

interface LoginScreenProps {
  settings: any;
  onLoginSuccess: (role: UserRole, token: string, updatedSettings: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ settings, onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    setLoading(true);
    setError(null);

    (window as any).google.script.run
      .withSuccessHandler((res: any) => {
        setLoading(false);
        if (res && res.success && res.token && res.role) {
          onLoginSuccess(res.role as UserRole, res.token, res.settings);
        } else {
          setError(res?.error || 'كلمة المرور غير صحيحة');
        }
      })
      .withFailureHandler((err: any) => {
        setLoading(false);
        setError(typeof err === 'string' ? err : err?.message || 'حدث خطأ أثناء الاتصال بالخادم');
      })
      .login({ password });
  };

  const header1 = settings?.header1 || 'مستشفى المنيا الجامعى للعيون';
  const header2 = settings?.header2 || 'وحدة مكافحة العدوي';
  const header3 = settings?.header3 || 'إحصائية غسيل الأيدي';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 font-['Cairo']" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Top Hospital Banner */}
        <div className="who-header-bg text-white px-6 py-5 border-b-4 border-[#c1501b] text-center">
          <div className="flex justify-center mb-2">
            <img src="/favicon.svg" alt="Logo" className="w-11 h-11 rounded-xl bg-white/15 p-1 shadow-sm" />
          </div>
          <h1 className="text-xl font-bold leading-snug">{header1}</h1>
          <p className="text-sm opacity-90 mt-0.5">{header2}</p>
          <div className="mt-2 pt-2 border-t border-white/25 text-sm font-bold">{header3}</div>
        </div>

        {/* Login Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-800">تسجيل الدخول</h2>
            <p className="text-xs text-slate-500 mt-1">أدخل كلمة المرور للمتابعة</p>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              كلمة المرور:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="أدخل كلمة المرور..."
                autoFocus
                className="w-full border-2 border-slate-300 focus:border-[#F26522] rounded-xl px-3.5 py-2.5 pl-16 text-sm text-slate-800 outline-none transition-colors"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {showPassword ? 'إخفاء' : 'إظهار'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3.5 py-2.5 text-xs font-bold flex items-center gap-2">
              <span>✕</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F26522] hover:bg-[#d9531e] disabled:bg-orange-300 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] text-sm flex items-center justify-center gap-2"
          >
            {loading ? <span>جاري تسجيل الدخول...</span> : <span>دخول للتطبيق</span>}
          </button>
        </form>
      </div>

      <div className="mt-5 text-center text-xs text-slate-400 font-sans">
        Based on WHO Hand Hygiene Compliance Observation Form
      </div>
    </div>
  );
};
