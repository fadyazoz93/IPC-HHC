import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import * as XLSX from 'xlsx';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface OpportunityRecord {
  id?: string | number;
  number: number | string;
  indications: string[];
  action: string;
  gloves: boolean;
}

export interface ProfessionalRecord {
  id?: string | number;
  categoryCode: string;
  categoryName: string;
  _colNo?: number;
  _originalIndex?: number;
  opportunities: OpportunityRecord[];
}

export interface SessionInfoRecord {
  sessionId: string;
  facility?: string;
  service?: string;
  ward?: string;
  department?: string;
  country?: string;
  city?: string;
  periodNumber?: string | number;
  date?: string;
  startTime?: string;
  endTime?: string;
  duration?: string | number;
  sessionNumber?: string | number;
  pageNumber?: string | number;
  observer?: string;
}

export interface SessionDataRecord {
  sessionInfo: SessionInfoRecord;
  professionals: ProfessionalRecord[];
  rawRows?: RawObservationRow[];
}

export interface RawObservationRow {
  'Session ID': string;
  'Facility'?: string;
  'Service'?: string;
  'Ward'?: string;
  'Department'?: string;
  'Country'?: string;
  'City'?: string;
  'Period Number'?: string | number;
  'Session Date'?: string;
  'Start Time'?: string;
  'End Time'?: string;
  'Duration (min)'?: string | number;
  'Session No'?: string | number;
  'Page No'?: string | number;
  'Observer'?: string;
  'Column No'?: number | string;
  'Prof. Code'?: string;
  'Professional Cat.'?: string;
  'Opportunity No'?: number | string;
  'Ind: Bef. Pat'?: string;
  'Ind: Bef. Asept'?: string;
  'Ind: Aft. Body Fluid'?: string;
  'Ind: Aft. Pat'?: string;
  'Ind: Aft. Surround'?: string;
  'Action (HR/HW/Missed)'?: string;
  'Gloves Used'?: string;
  [key: string]: any;
}

export interface ProfCategoryDef {
  code: string;
  name: string;
}

export type StaffCategoryInput =
  | string
  | { id?: string | number; code?: string | number; name?: string; label?: string; title?: string };

export type DepartmentInput =
  | string
  | { id?: string | number; name?: string; label?: string; title?: string };

export interface AppSettings {
  header1?: string;
  header2?: string;
  header3?: string;
  logoRight?: string;
  logoLeft?: string;
  facilities?: string[];
  services?: string[];
  wards?: string[];
  departments?: string[];
  observers?: string[];
  cities?: string[];
  profCategories?: string[];
  [key: string]: any;
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

export interface TursoImportPayload {
  tursoUrl: string;
  tursoAuthToken: string;
  importMode: 'merge_skip_existing' | 'merge_overwrite_existing' | 'overwrite_all';
  importSettings: boolean;
}

export interface SaveSessionPayload extends SessionInfoRecord {
  professionals: ProfessionalRecord[];
}

export interface SaveResult {
  success: boolean;
  sessionId?: string;
  sessionNumber?: string;
  error?: string;
}

export interface UpdateSessionDatePayload {
  sessionId: string;
  newDate: string;
}

export interface UpdateSessionDateResult {
  success: boolean;
  newSessionNo?: string;
  error?: string;
}

export interface UpdateSessionDepartmentPayload {
  sessionId: string;
  department: string;
}

export interface SaveSettingsResult {
  success: boolean;
  settings?: AppSettings;
  token?: string;
  error?: string;
}

export interface FacilityActionResult {
  success: boolean;
  facility?: string;
  settings?: AppSettings;
  message?: string;
  error?: string;
}

export type ComplianceViewMode = 'form' | 'dashboard' | 'records' | 'settings';

export interface ComplianceHandlers {
  loadObservations?: () => Promise<RawObservationRow[] | SessionDataRecord[]>;
  saveSession?: (payload: SaveSessionPayload) => Promise<SaveResult>;
  deleteSession?: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  deleteMonths?: (monthKeys: string[]) => Promise<{ success: boolean; error?: string }>;
  updateSessionDate?: (payload: UpdateSessionDatePayload) => Promise<UpdateSessionDateResult>;
  updateSessionDepartment?: (
    payload: UpdateSessionDepartmentPayload
  ) => Promise<{ success: boolean; error?: string }>;
  loadSettings?: () => Promise<AppSettings | null>;
  saveSettings?: (settings: AppSettings) => Promise<SaveSettingsResult>;
  addFacility?: (payload: { facility: string }) => Promise<FacilityActionResult>;
  deleteFacility?: (payload: { facility: string }) => Promise<FacilityActionResult>;
  testTursoConnection?: (creds: { tursoUrl: string; tursoAuthToken: string }) => Promise<TursoTestResult>;
  importTursoData?: (payload: TursoImportPayload) => Promise<TursoImportResult>;
}

export interface ComplianceProps {
  /** External structured observation sessions */
  sessions?: SessionDataRecord[];
  /** Alternative: external raw database rows (converted automatically) */
  rawObservations?: RawObservationRow[];
  /** Optional initial session to open in edit mode */
  initialSession?: SessionDataRecord | null;
  /** External staff / professional categories (strings or {code/id, name}) */
  professionals?: StaffCategoryInput[];
  /** Optional 4 prefilled column categories for new forms */
  defaultProfessionalColumns?: ProfessionalRecord[];
  /** External departments list (strings or {id, name}) */
  departments?: DepartmentInput[];
  /** Optional external dropdown lists */
  facilities?: string[];
  services?: string[];
  wards?: string[];
  observers?: string[];
  cities?: string[];
  /** External application settings (merged with external lists above) */
  settings?: AppSettings | null;
  /** Default country value for new sessions */
  defaultCountry?: string;
  /** Initial active tab */
  initialView?: ComplianceViewMode;
  /** External controlled tab */
  activeView?: ComplianceViewMode;
  /** Tab change notification */
  onViewChange?: (view: ComplianceViewMode) => void;
  /** Permissions */
  canAccessSettings?: boolean;
  canEditRecords?: boolean;
  canDeleteRecords?: boolean;
  canCopyRecords?: boolean;
  /** Separated backend handlers object */
  handlers?: ComplianceHandlers;
  /** Direct callback shortcuts (merged with handlers) */
  onSaveSession?: (payload: SaveSessionPayload) => Promise<SaveResult> | SaveResult;
  onDeleteSession?: (sessionId: string) => Promise<{ success: boolean; error?: string } | void> | void;
  onDeleteMonths?: (monthKeys: string[]) => Promise<{ success: boolean; error?: string } | void> | void;
  onUpdateSessionDate?: (
    payload: UpdateSessionDatePayload
  ) => Promise<UpdateSessionDateResult> | UpdateSessionDateResult;
  onUpdateSessionDepartment?: (
    payload: UpdateSessionDepartmentPayload
  ) => Promise<{ success: boolean; error?: string } | void> | void;
  onSaveSettings?: (settings: AppSettings) => Promise<SaveSettingsResult | void> | SaveSettingsResult | void;
  onAddFacility?: (payload: { facility: string }) => Promise<FacilityActionResult> | FacilityActionResult;
  onDeleteFacility?: (payload: { facility: string }) => Promise<FacilityActionResult> | FacilityActionResult;
  onTestTursoConnection?: (creds: { tursoUrl: string; tursoAuthToken: string }) => Promise<TursoTestResult>;
  onImportTursoData?: (payload: TursoImportPayload) => Promise<TursoImportResult>;
  onSessionsChange?: (sessions: SessionDataRecord[]) => void;
}

// ============================================================================
// CONSTANTS & EMBEDDED STYLES
// ============================================================================

const WHO_INDICATIONS = [
  { id: 'bef-pat', label: 'bef-pat.', fullLabel: 'Before touching a patient', arLabel: '1. قبل ملامسة المريض', dbCol: 'Ind: Bef. Pat' },
  { id: 'bef-asept', label: 'bef-asept.', fullLabel: 'Before clean/ aseptic procedure', arLabel: '2. قبل الإجراء النظيف/المعقم', dbCol: 'Ind: Bef. Asept' },
  { id: 'aft-bf', label: 'aft-b.f.', fullLabel: 'After body fluid exposure risk', arLabel: '3. بعد خطر التعرض لسوائل الجسم', dbCol: 'Ind: Aft. Body Fluid' },
  { id: 'aft-pat', label: 'aft-pat.', fullLabel: 'After touching a patient', arLabel: '4. بعد ملامسة المريض', dbCol: 'Ind: Aft. Pat' },
  { id: 'aft-p-surr', label: 'aft.p.surr.', fullLabel: 'After touching patient surroundings', arLabel: '5. بعد ملامسة محيط المريض', dbCol: 'Ind: Aft. Surround' },
] as const;

const INDICATIONS = WHO_INDICATIONS;

const DEFAULT_PROF_CATEGORIES: ProfCategoryDef[] = [
  { code: '1', name: 'أطباء' },
  { code: '2', name: 'تمريض' },
  { code: '3', name: 'مساعد تمريض' },
  { code: '4', name: 'عمال' },
];

const DEFAULT_SETTINGS: AppSettings = {
  header1: 'مستشفى المنيا الجامعى للعيون',
  header2: 'وحدة مكافحة العدوي',
  header3: 'إحصائية غسيل الأيدي',
  logoRight: '',
  logoLeft: '',
  facilities: [],
  services: [],
  wards: [],
  departments: [],
  observers: [],
  cities: [],
  profCategories: DEFAULT_PROF_CATEGORIES.map((c) => c.name),
};

const COMPLIANCE_STYLES = `
.who-header-bg { background-color: #F26522; }
.form-checkbox { appearance: none; width: 22px; height: 22px; border: 2px solid #334155; background: white; display: inline-flex; align-items: center; justify-content: center; margin-right: 8px; cursor: pointer; transition: all 0.2s; border-radius: 4px; }
.form-checkbox.checked { background-color: #F26522; border-color: #F26522; }
.form-checkbox.checked:after { content: '✔'; font-size: 14px; color: white; font-weight: bold; }
.form-radio { appearance: none; width: 22px; height: 22px; border: 2px solid #334155; border-radius: 50%; background: white; display: inline-flex; align-items: center; justify-content: center; margin-right: 8px; cursor: pointer; transition: all 0.2s; }
.form-radio.checked { border-color: #F26522; }
.form-radio.checked:after { content: ''; width: 12px; height: 12px; background: #F26522; border-radius: 50%; }
.form-input-bg { background-color: #fff; border: 1px solid #cbd5e1; padding: 6px 8px; width: 100%; font-weight: 600; font-family: 'Cairo', 'Inter', sans-serif; transition: all 0.2s; border-radius: 6px; font-size: 16px; text-align: center; }
.form-input-bg:focus { outline: none; border-color: #F26522; box-shadow: 0 0 0 3px rgba(242, 101, 34, 0.1); }
.prof-col { min-width: 200px; width: 100%; }
.paper-container { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border-radius: 0.5rem; }
.diagonal-split { position: relative; background-image: linear-gradient(to top right, transparent calc(50% - 1.5px), #475569 calc(50% - 1.5px), #475569 calc(50% + 1.5px), transparent calc(50% + 1.5px)); }
.report-table { border: 2px solid #1e293b; border-collapse: collapse; font-family: 'Cairo', 'Inter', sans-serif; }
.report-table th, .report-table td { border: 1px solid #475569; text-align: center; }
.report-table .header-row th { border-bottom: 2px solid #1e293b; }
.report-table .group-divider { border-right: 2px solid #1e293b !important; }
.report-table .total-row td { border-top: 2px solid #1e293b; border-bottom: 2px solid #1e293b; }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }

@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body { width: 1024px !important; min-width: 1024px !important; height: auto !important; margin: 0 !important; padding: 0 !important; background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 9pt; color: black; overflow: visible !important; }
  .no-print, nav, button, .app-header-bg, .mobile-nav, input[type="month"] { display: none !important; }
  #root { width: 100% !important; margin: 0 !important; padding: 0 !important; height: auto !important; }
  .app-container { padding: 0 !important; margin: 0 !important; min-height: 0 !important; height: auto !important; display: block !important; }
  .shadow, .shadow-xl, .shadow-md, .rounded, .rounded-lg, .p-6 { box-shadow: none !important; }
  .paper-container { border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; display: flex !important; flex-direction: column !important; }
  .print-centered-page { width: 1024px !important; max-width: 1024px !important; height: 1448px !important; max-height: 1448px !important; overflow: hidden !important; position: relative; padding: 0 !important; margin: 0 auto !important; display: block !important; page-break-after: always !important; break-after: page !important; page-break-inside: avoid !important; break-inside: avoid !important; box-sizing: border-box; background: white !important; transform-origin: top left; }
  .paper-container, .print-report-container { width: 1024px !important; max-width: 1024px !important; height: 1448px !important; max-height: 1448px !important; margin: 0 auto !important; box-shadow: none !important; border: none !important; min-height: 0 !important; display: flex !important; flex-direction: column !important; page-break-inside: avoid !important; break-inside: avoid !important; }
  .dashboard-print-container { width: 1024px !important; max-width: 1024px !important; margin: 0 auto !important; box-shadow: none !important; border: none !important; height: auto !important; min-height: 0 !important; display: block !important; }
  .recharts-responsive-container, .recharts-wrapper, tr, .bg-white.p-6.rounded-lg { page-break-inside: avoid !important; break-inside: avoid !important; }
  .print-centered-page:last-child, .print-centered-page.last-page, .print-last-page { page-break-after: auto !important; break-after: auto !important; margin-bottom: 0 !important; padding-bottom: 0 !important; }
  .print-page-break { display: none !important; }
  .who-header-bg { background-color: #F26522 !important; color: white !important; padding: 3mm 0 !important; border-bottom: 2px solid #c1501b !important; flex-shrink: 0; width: 100%; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .who-header-title { font-size: 14pt !important; line-height: 1.1 !important; margin: 0 !important; }
  .who-header-subtitle { font-size: 10pt !important; margin: 0 !important; }
  .who-header-main { font-size: 14pt !important; margin-top: 2px !important; padding-top: 2px !important; border-top-width: 1px !important; }
  .who-header-logo { max-height: 14mm !important; max-width: 25mm !important; object-fit: contain !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .print-content-wrapper { flex-grow: 1 !important; display: flex !important; flex-direction: column !important; padding: 0 !important; height: 100% !important; min-height: 0 !important; }
  h1 { font-size: 14pt !important; margin-bottom: 4px !important; }
  .grid { display: grid !important; margin-bottom: 2mm !important; }
  .gap-x-8 { column-gap: 1rem !important; }
  .gap-y-1 { row-gap: 4px !important; }
  .form-input-row { margin-bottom: 2px !important; }
  .form-input-print-text { border: 1px solid #cbd5e1 !important; border-radius: 6px !important; padding: 6px 10px !important; font-family: 'Cairo', 'Inter', sans-serif !important; font-weight: 700 !important; font-size: 13pt !important; background-color: #fff !important; color: #1e293b !important; min-height: 36px !important; display: flex !important; align-items: center; justify-content: center; text-align: center !important; line-height: 1.2 !important; }
  .form-checkbox { width: 16px !important; height: 16px !important; border: 2px solid #334155 !important; background: white !important; margin-right: 6px !important; border-radius: 4px !important; }
  .form-checkbox.checked { background-color: #F26522 !important; border-color: #F26522 !important; }
  .form-checkbox.checked:after { content: '✔'; font-size: 10px !important; color: white !important; font-weight: bold; line-height: 14px; position: static !important; }
  .form-radio { width: 16px !important; height: 16px !important; border: 2px solid #334155 !important; margin-right: 6px !important; }
  .form-radio.checked:after { background: #F26522 !important; width: 8px !important; height: 8px !important; }
  .form-checkbox + span, .form-radio + span { font-size: 12pt !important; font-weight: 700 !important; }
  .prof-main-container { border: 2px solid #334155 !important; flex-grow: 0 !important; display: flex !important; flex-direction: column !important; margin-top: 0 !important; margin-bottom: 0 !important; height: auto !important; border-radius: 6px !important; overflow: visible !important; }
  .prof-cols-row { flex-grow: 0 !important; display: flex !important; flex-direction: row !important; height: auto !important; width: 100% !important; }
  .prof-col-wrapper { width: 25% !important; flex: 0 0 25% !important; border-right: 2px solid #334155 !important; border-bottom: none !important; display: flex !important; flex-direction: column !important; height: auto !important; }
  .prof-col-wrapper:last-child { border-right: none !important; }
  .prof-col-container { height: auto !important; width: 100%; display: flex; flex-direction: column; }
  .prof-header-row { height: auto !important; min-height: 8mm; border-bottom: 2px solid #334155 !important; background-color: #ffe4cc !important; padding: 4px !important; display: flex !important; align-items: center; justify-content: center; }
  .prof-cat-val-container { border: 1px solid #94a3b8 !important; border-radius: 4px !important; height: 28px !important; display: flex !important; align-items: center; justify-content: center; font-family: 'Cairo', 'Inter', sans-serif !important; font-size: 11pt !important; font-weight: 700 !important; color: #1e293b !important; }
  .prof-col-table { width: 100%; height: auto !important; border-collapse: collapse; flex-grow: 0 !important; }
  .prof-col-table thead { height: auto; }
  .prof-col-table tbody { height: auto !important; display: table-row-group; }
  .prof-col-table th { border-right: 1px solid #94a3b8 !important; border-bottom: 2px solid #334155 !important; background-color: #ffe4cc !important; padding: 2px !important; font-size: 9pt !important; height: 6mm; }
  .prof-col-table td { border: 1px solid #cbd5e1 !important; padding: 0 !important; }
  .prof-col-table tbody tr { height: auto !important; }
  .print-opp-row:nth-child(even) { background-color: #f8fafc !important; }
  .print-footer { margin-top: auto !important; padding-top: 1mm !important; border-top: 1px solid #334155 !important; font-size: 7pt !important; font-weight: 600 !important; color: #1e293b !important; flex-shrink: 0; width: 100%; text-align: center; background-color: white !important; line-height: 1.2 !important; }
  .report-table { border: 2px solid #1e293b !important; width: 100% !important; font-size: 10pt !important; table-layout: fixed !important; border-collapse: collapse !important; font-family: 'Cairo', 'Inter', sans-serif !important; }
  .report-table th, .report-table td { border: 1px solid #475569 !important; padding: 4px 6px !important; color: #1e293b !important; text-align: center; }
  .report-table th { background-color: #ffe4cc !important; }
  .overflow-x-auto, .overflow-y-auto, .overflow-hidden, .overflow-auto { overflow: visible !important; }
  .print-hidden { display: none !important; }
}
`;

// ============================================================================
// UTILITY FUNCTIONS & DATA NORMALIZERS
// ============================================================================

export const uuidv4 = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export const normalizeStaffCategories = (
  input?: StaffCategoryInput[]
): ProfCategoryDef[] => {
  if (!input || input.length === 0) return [];
  return input
    .map((item, idx) => {
      if (typeof item === 'string') {
        return { code: String(idx + 1), name: item.trim() };
      }
      const code = String(item.code ?? item.id ?? idx + 1);
      const name = String(item.name ?? item.label ?? item.title ?? '').trim();
      return { code, name };
    })
    .filter((c) => c.name.length > 0);
};

export const normalizeDepartments = (input?: DepartmentInput[]): string[] => {
  if (!input || input.length === 0) return [];
  return input
    .map((item) =>
      typeof item === 'string'
        ? item.trim()
        : String(item.name ?? item.label ?? item.title ?? '').trim()
    )
    .filter((d) => d.length > 0);
};

export const getProfCategories = (settings?: AppSettings | null): ProfCategoryDef[] => {
  if (settings?.profCategories && settings.profCategories.length > 0) {
    return settings.profCategories.map((name, i) => ({
      code: String(i + 1),
      name,
    }));
  }
  return DEFAULT_PROF_CATEGORIES;
};

export const formatGoogleDriveUrl = (url?: string): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (
    trimmed.includes('drive.google.com/thumbnail') ||
    trimmed.includes('lh3.googleusercontent.com/d/')
  ) {
    return trimmed;
  }

  const matchD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) {
    return `https://drive.google.com/thumbnail?id=${matchD[1]}&sz=w1000`;
  }

  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://drive.google.com/thumbnail?id=${matchId[1]}&sz=w1000`;
  }

  const matchDirectD = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchDirectD && matchDirectD[1]) {
    return `https://drive.google.com/thumbnail?id=${matchDirectD[1]}&sz=w1000`;
  }

  return trimmed;
};

export const resequenceSessionsByMonth = (
  sessionsList: SessionDataRecord[]
): SessionDataRecord[] => {
  const cloned = sessionsList.map((s) => ({
    ...s,
    sessionInfo: { ...s.sessionInfo },
  }));

  const monthGroups: Record<string, SessionDataRecord[]> = {};
  cloned.forEach((s) => {
    const mKey = (s.sessionInfo.date || '').slice(0, 7) || 'unknown';
    if (!monthGroups[mKey]) monthGroups[mKey] = [];
    monthGroups[mKey].push(s);
  });

  Object.values(monthGroups).forEach((list) => {
    list.sort((a, b) => {
      const dA = a.sessionInfo.date || '';
      const dB = b.sessionInfo.date || '';
      if (dA !== dB) return dA.localeCompare(dB);
      const tA = a.sessionInfo.startTime || '99:99';
      const tB = b.sessionInfo.startTime || '99:99';
      if (tA !== tB) return tA.localeCompare(tB);
      return (a.sessionInfo.sessionId || '').localeCompare(
        b.sessionInfo.sessionId || ''
      );
    });
    list.forEach((s, idx) => {
      s.sessionInfo.sessionNumber = String(idx + 1);
    });
  });

  return cloned;
};

export const parseSessionsFromRows = (
  rows: RawObservationRow[]
): SessionDataRecord[] => {
  const map: Record<
    string,
    {
      sessionInfo: SessionInfoRecord;
      professionals: Record<string, ProfessionalRecord>;
    }
  > = {};

  rows.forEach((row) => {
    const sid = String(row['Session ID'] || '');
    if (!sid) return;
    if (!map[sid]) {
      map[sid] = {
        sessionInfo: {
          facility: row['Facility'],
          service: row['Service'],
          ward: row['Ward'],
          department: row['Department'],
          country: row['Country'],
          city: row['City'],
          periodNumber: row['Period Number'],
          date: row['Session Date'],
          startTime: row['Start Time'],
          endTime: row['End Time'],
          duration: row['Duration (min)'],
          sessionNumber: row['Session No'],
          pageNumber: row['Page No'],
          observer: row['Observer'],
          sessionId: sid,
        },
        professionals: {},
      };
    }

    const pCode = String(row['Prof. Code'] || '');
    const colNo = row['Column No'];
    let profKey = colNo ? `col_${colNo}` : `code_${pCode}`;
    if (!colNo) {
      let suffix = 0;
      while (
        map[sid].professionals[`${profKey}_${suffix}`] &&
        map[sid].professionals[`${profKey}_${suffix}`].opportunities.some(
          (o) => o.number === row['Opportunity No']
        )
      ) {
        suffix++;
      }
      profKey = `${profKey}_${suffix}`;
    }

    if (!map[sid].professionals[profKey]) {
      map[sid].professionals[profKey] = {
        categoryCode: pCode,
        categoryName: String(row['Professional Cat.'] || ''),
        opportunities: [],
        _colNo: colNo ? parseInt(String(colNo), 10) : 999,
      };
    }

    const indications: string[] = [];
    if (row['Ind: Bef. Pat'] === 'Yes') indications.push('bef-pat');
    if (row['Ind: Bef. Asept'] === 'Yes') indications.push('bef-asept');
    if (row['Ind: Aft. Body Fluid'] === 'Yes') indications.push('aft-bf');
    if (row['Ind: Aft. Pat'] === 'Yes') indications.push('aft-pat');
    if (row['Ind: Aft. Surround'] === 'Yes') indications.push('aft-p-surr');

    map[sid].professionals[profKey].opportunities.push({
      number: row['Opportunity No'] ?? '',
      indications,
      action: String(row['Action (HR/HW/Missed)'] || ''),
      gloves: row['Gloves Used'] === 'Yes',
    });
  });

  const sessionsList: SessionDataRecord[] = Object.values(map).map((s) => {
    const profs = Object.values(s.professionals);
    profs.sort((a, b) => (a._colNo || 999) - (b._colNo || 999));
    return { sessionInfo: s.sessionInfo, rawRows: [], professionals: profs };
  });

  return resequenceSessionsByMonth(sessionsList);
};

export const sessionsToRawRows = (
  sessions: SessionDataRecord[]
): RawObservationRow[] => {
  const rows: RawObservationRow[] = [];
  sessions.forEach((s) => {
    const info = s.sessionInfo;
    s.professionals.forEach((prof, pIdx) => {
      const colNo =
        prof._colNo ??
        (prof._originalIndex !== undefined ? prof._originalIndex + 1 : pIdx + 1);
      prof.opportunities.forEach((opp) => {
        if ((opp.indications && opp.indications.length > 0) || opp.action) {
          rows.push({
            'Session ID': info.sessionId,
            'Facility': info.facility || '',
            'Service': info.service || '',
            'Ward': info.ward || '',
            'Department': info.department || '',
            'Country': info.country || '',
            'City': info.city || '',
            'Period Number': info.periodNumber ?? '',
            'Session Date': info.date || '',
            'Start Time': info.startTime || '',
            'End Time': info.endTime || '',
            'Duration (min)': info.duration ?? '',
            'Session No': info.sessionNumber ?? '',
            'Page No': info.pageNumber ?? '',
            'Observer': info.observer || '',
            'Column No': colNo,
            'Prof. Code': prof.categoryCode || '',
            'Professional Cat.': prof.categoryName || '',
            'Opportunity No': opp.number,
            'Ind: Bef. Pat': opp.indications?.includes('bef-pat') ? 'Yes' : 'No',
            'Ind: Bef. Asept': opp.indications?.includes('bef-asept') ? 'Yes' : 'No',
            'Ind: Aft. Body Fluid': opp.indications?.includes('aft-bf') ? 'Yes' : 'No',
            'Ind: Aft. Pat': opp.indications?.includes('aft-pat') ? 'Yes' : 'No',
            'Ind: Aft. Surround': opp.indications?.includes('aft-p-surr') ? 'Yes' : 'No',
            'Action (HR/HW/Missed)': opp.action || 'Missed',
            'Gloves Used': opp.gloves ? 'Yes' : 'No',
          });
        }
      });
    });
  });
  return rows;
};

// ============================================================================
// SEPARATED HANDLERS LAYER (READY FOR EXTERNAL BACKEND WIRING)
// ============================================================================

export const createDefaultComplianceHandlers = (
  apiBaseUrl = '/api'
): Required<ComplianceHandlers> => {
  const postAction = async <T,>(action: string, data?: any): Promise<T> => {
    const resp = await fetch(apiBaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, data }),
      redirect: 'follow',
    });
    const json = await resp.json();
    if (json && json.error) throw new Error(String(json.error));
    return json as T;
  };

  const getAction = async <T,>(action: string): Promise<T> => {
    const resp = await fetch(`${apiBaseUrl}?action=${encodeURIComponent(action)}`, {
      method: 'GET',
      redirect: 'follow',
    });
    const json = await resp.json();
    if (json && json.error) throw new Error(String(json.error));
    return json as T;
  };

  return {
    loadObservations: () => getAction<RawObservationRow[]>('getObservationData'),
    saveSession: (payload) =>
      postAction<SaveResult>('saveObservationData', JSON.stringify(payload)),
    deleteSession: (sessionId) =>
      postAction<{ success: boolean; error?: string }>('deleteSession', sessionId),
    deleteMonths: (monthKeys) =>
      postAction<{ success: boolean; error?: string }>('deleteMonth', monthKeys),
    updateSessionDate: (payload) =>
      postAction<UpdateSessionDateResult>('updateSessionDate', payload),
    updateSessionDepartment: (payload) =>
      postAction<{ success: boolean; error?: string }>('updateSessionDepartment', payload),
    loadSettings: () => getAction<AppSettings | null>('getSettings'),
    saveSettings: (settingsPayload) =>
      postAction<SaveSettingsResult>('saveSettings', settingsPayload),
    addFacility: (payload) =>
      postAction<FacilityActionResult>('addFacility', payload),
    deleteFacility: (payload) =>
      postAction<FacilityActionResult>('deleteFacility', payload),
    testTursoConnection: (creds) =>
      postAction<TursoTestResult>('testTursoConnection', creds),
    importTursoData: (payload) =>
      postAction<TursoImportResult>('importTursoData', payload),
  };
};

export const defaultComplianceHandlers = createDefaultComplianceHandlers('/api');

// ============================================================================
// EXCEL EXPORT ENGINE (5 WORKSHEETS)
// ============================================================================

const formatPct = (act: number, opp: number): string => {
  if (!opp || opp <= 0) return '0.00%';
  return `${((act / opp) * 100).toFixed(2)}%`;
};

const formatMonthLabel = (monthKey: string): string => {
  if (!monthKey || monthKey === 'unknown') return 'غير محدد';
  const d = new Date(`${monthKey}-02`);
  if (isNaN(d.getTime())) return monthKey;
  const ar = d.toLocaleString('ar', { month: 'long', year: 'numeric' });
  const en = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  return `${ar} (${en})`;
};

const triggerWorkbookDownload = (wb: XLSX.WorkBook, filename: string) => {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export interface ExportOptions {
  sessions: SessionDataRecord[];
  settings?: AppSettings | null;
  periodLabel?: string;
  fileNamePrefix?: string;
  annualSessions?: SessionDataRecord[];
  annualYear?: string | number;
}

export const exportReportsToExcel = ({
  sessions,
  settings,
  periodLabel,
  fileNamePrefix = 'Hand_Hygiene_Report',
  annualSessions,
  annualYear,
}: ExportOptions): boolean => {
  if (!sessions || sessions.length === 0) return false;

  const profCategories = getProfCategories(settings);
  const header1 = settings?.header1 || 'مستشفى المنيا الجامعى للعيون';
  const header2 = settings?.header2 || 'وحدة مكافحة العدوي';
  const header3 = settings?.header3 || 'إحصائية غسيل الأيدي';

  const sortedSessions = [...sessions].sort((a, b) => {
    const dA = a.sessionInfo.date || '';
    const dB = b.sessionInfo.date || '';
    if (dA !== dB) return dA.localeCompare(dB);
    const nA = Number(a.sessionInfo.sessionNumber) || 0;
    const nB = Number(b.sessionInfo.sessionNumber) || 0;
    return nA - nB;
  });

  const monthMap = new Map<string, SessionDataRecord[]>();
  sortedSessions.forEach((s) => {
    const mKey = (s.sessionInfo.date || '').slice(0, 7) || 'unknown';
    if (!monthMap.has(mKey)) monthMap.set(mKey, []);
    monthMap.get(mKey)!.push(s);
  });
  const sortedMonthKeys = Array.from(monthMap.keys()).sort((a, b) => b.localeCompare(a));

  const effectivePeriodLabel =
    periodLabel ||
    (sortedMonthKeys.length === 1
      ? formatMonthLabel(sortedMonthKeys[0])
      : `${sortedMonthKeys.length} أشهر (${sortedMonthKeys[sortedMonthKeys.length - 1]} إلى ${sortedMonthKeys[0]})`);

  let grandOpp = 0;
  let grandHR = 0;
  let grandHW = 0;
  let grandMissed = 0;
  let grandGloves = 0;

  const byProf: Record<string, { name: string; opp: number; hw: number; hr: number; missed: number }> = {};
  profCategories.forEach((c) => {
    byProf[c.code] = { name: c.name, opp: 0, hw: 0, hr: 0, missed: 0 };
  });

  const byMoment: Record<string, { arLabel: string; enLabel: string; opp: number; hw: number; hr: number; missed: number }> = {};
  WHO_INDICATIONS.forEach((ind) => {
    byMoment[ind.id] = { arLabel: ind.arLabel, enLabel: ind.fullLabel, opp: 0, hw: 0, hr: 0, missed: 0 };
  });

  const byDept: Record<string, { sessions: Set<string>; opp: number; hw: number; hr: number; missed: number }> = {};

  sortedSessions.forEach((s) => {
    const deptName = (s.sessionInfo.department || 'غير محدد').trim() || 'غير محدد';
    if (!byDept[deptName]) {
      byDept[deptName] = { sessions: new Set(), opp: 0, hw: 0, hr: 0, missed: 0 };
    }
    byDept[deptName].sessions.add(s.sessionInfo.sessionId);

    s.professionals.forEach((prof) => {
      const catCode = String(prof.categoryCode || '');
      const catLabel = prof.categoryName || byProf[catCode]?.name || (catCode ? `فئة ${catCode}` : 'أخرى');
      if (catCode && !byProf[catCode]) {
        byProf[catCode] = { name: catLabel, opp: 0, hw: 0, hr: 0, missed: 0 };
      }

      prof.opportunities.forEach((opp) => {
        if ((opp.indications && opp.indications.length > 0) || opp.action) {
          grandOpp++;
          byDept[deptName].opp++;
          if (catCode && byProf[catCode]) byProf[catCode].opp++;
          if (opp.gloves) grandGloves++;

          if (opp.action === 'HR') {
            grandHR++;
            byDept[deptName].hr++;
            if (catCode && byProf[catCode]) byProf[catCode].hr++;
          } else if (opp.action === 'HW') {
            grandHW++;
            byDept[deptName].hw++;
            if (catCode && byProf[catCode]) byProf[catCode].hw++;
          } else {
            grandMissed++;
            byDept[deptName].missed++;
            if (catCode && byProf[catCode]) byProf[catCode].missed++;
          }

          WHO_INDICATIONS.forEach((ind) => {
            if (opp.indications && opp.indications.includes(ind.id)) {
              byMoment[ind.id].opp++;
              if (opp.action === 'HR') byMoment[ind.id].hr++;
              else if (opp.action === 'HW') byMoment[ind.id].hw++;
              else byMoment[ind.id].missed++;
            }
          });
        }
      });
    });
  });

  const grandCompliant = grandHR + grandHW;

  // SHEET 1: Executive Summary
  const summaryRows: any[][] = [
    [header1],
    [header2],
    [`${header3} - التقرير الإحصائي الشامل`],
    [`الفترة المشمولة بالتقرير: ${effectivePeriodLabel}`, '', '', '', `تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`],
    [],
    ['أولاً: المؤشرات العامة للالتزام بغسيل الأيدي (Overall Summary)'],
    ['المؤشر', 'القيمة', 'النسبة / التفاصيل'],
    ['إجمالي عدد جلسات الملاحظة (Total Sessions)', sortedSessions.length, 'جلسة رصد'],
    ['إجمالي فرص غسيل الأيدي المرصودة (Total Opportunities)', grandOpp, 'فرصة'],
    ['إجمالي مرات الالتزام الفعلي (Compliant Actions: HR + HW)', grandCompliant, formatPct(grandCompliant, grandOpp)],
    ['الدلك بالكحول (Handrub - HR)', grandHR, formatPct(grandHR, grandOpp)],
    ['الغسيل بالماء والصابون (Handwash - HW)', grandHW, formatPct(grandHW, grandOpp)],
    ['الفرص الفائتة بدون التزام (Missed Opportunities)', grandMissed, formatPct(grandMissed, grandOpp)],
    ['مرات ارتداء القفازات المرصودة (Gloves Used)', grandGloves, formatPct(grandGloves, grandOpp)],
    ['نسبة الالتزام الإجمالية (Overall Compliance Rate)', formatPct(grandCompliant, grandOpp), grandOpp > 0 && (grandCompliant / grandOpp) * 100 >= 80 ? 'ممتاز (Excellent)' : grandOpp > 0 && (grandCompliant / grandOpp) * 100 >= 60 ? 'جيد (Good)' : 'يحتاج لتحسين (Needs Action)'],
    [],
    ['ثانياً: نسبة الالتزام حسب الفئة المهنية (Compliance by Professional Category)'],
    ['الفئة المهنية (Category)', 'إجمالي الفرص (Opp)', 'غسيل بالماء والصابون (HW)', 'دلك بالكحول (HR)', 'إجمالي الالتزام (Act)', 'الفرص الفائتة (Missed)', 'نسبة الالتزام (%)'],
  ];

  Object.keys(byProf).forEach((code) => {
    const item = byProf[code];
    const act = item.hw + item.hr;
    summaryRows.push([item.name, item.opp, item.hw, item.hr, act, item.missed, formatPct(act, item.opp)]);
  });
  summaryRows.push(['الإجمالي الكلي (Grand Total)', grandOpp, grandHW, grandHR, grandCompliant, grandMissed, formatPct(grandCompliant, grandOpp)]);
  summaryRows.push([]);
  summaryRows.push(['ثالثاً: نسبة الالتزام حسب اللحظات الخمس لمنظمة الصحة العالمية (5 Moments for Hand Hygiene)']);
  summaryRows.push(['اللحظة (الاستطباب)', 'WHO Indication', 'إجمالي الفرص (Opp)', 'غسيل (HW)', 'دلك بالكحول (HR)', 'إجمالي الالتزام (Act)', 'الفرص الفائتة (Missed)', 'نسبة الالتزام (%)']);

  WHO_INDICATIONS.forEach((ind) => {
    const m = byMoment[ind.id];
    const act = m.hw + m.hr;
    summaryRows.push([m.arLabel, m.enLabel, m.opp, m.hw, m.hr, act, m.missed, formatPct(act, m.opp)]);
  });

  summaryRows.push([]);
  summaryRows.push(['رابعاً: نسبة الالتزام حسب الأقسام والعيادات (Compliance by Department)']);
  summaryRows.push(['القسم / العيادة (Department)', 'عدد الجلسات', 'إجمالي الفرص (Opp)', 'غسيل (HW)', 'دلك بالكحول (HR)', 'إجمالي الالتزام (Act)', 'الفرص الفائتة (Missed)', 'نسبة الالتزام (%)']);

  Object.keys(byDept)
    .sort((a, b) => a.localeCompare(b, 'ar'))
    .forEach((dept) => {
      const d = byDept[dept];
      const act = d.hw + d.hr;
      summaryRows.push([dept, d.sessions.size, d.opp, d.hw, d.hr, act, d.missed, formatPct(act, d.opp)]);
    });

  const trendSource = annualSessions && annualSessions.length > 0 ? annualSessions : sortedSessions;
  const trendMap = new Map<string, { sessions: number; opp: number; hw: number; hr: number; missed: number }>();
  trendSource.forEach((s) => {
    const mKey = (s.sessionInfo.date || '').slice(0, 7) || 'unknown';
    if (!trendMap.has(mKey)) trendMap.set(mKey, { sessions: 0, opp: 0, hw: 0, hr: 0, missed: 0 });
    const entry = trendMap.get(mKey)!;
    entry.sessions++;
    s.professionals.forEach((p) => {
      p.opportunities.forEach((o) => {
        if ((o.indications && o.indications.length > 0) || o.action) {
          entry.opp++;
          if (o.action === 'HW') entry.hw++;
          else if (o.action === 'HR') entry.hr++;
          else entry.missed++;
        }
      });
    });
  });

  if (trendMap.size > 0) {
    summaryRows.push([]);
    summaryRows.push([
      annualYear
        ? `خامساً: اتجاه الالتزام الشهري خلال عام ${annualYear} (Monthly Compliance Trend)`
        : 'خامساً: ملخص مقارنة الأشهر (Monthly Summary)',
    ]);
    summaryRows.push(['الشهر (Month)', 'كود الشهر', 'عدد الجلسات', 'إجمالي الفرص (Opp)', 'غسيل (HW)', 'دلك بالكحول (HR)', 'إجمالي الالتزام (Act)', 'نسبة الالتزام (%)']);
    Array.from(trendMap.keys())
      .sort()
      .forEach((mKey) => {
        const t = trendMap.get(mKey)!;
        const act = t.hw + t.hr;
        summaryRows.push([formatMonthLabel(mKey), mKey, t.sessions, t.opp, t.hw, t.hr, act, formatPct(act, t.opp)]);
      });
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!views'] = [{ rightToLeft: true }];
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 30 }, { wch: 22 }, { wch: 24 }, { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 20 }];
  wsSummary['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 6 } },
  ];

  // SHEET 2: Basic Compliance Matrix
  const basicRows: any[][] = [];
  const basicMerges: XLSX.Range[] = [];
  const totalBasicCols = 1 + profCategories.length * 3 + 3;

  sortedMonthKeys.forEach((mKey, mIdx) => {
    const mSessions = monthMap.get(mKey)!;
    const first = mSessions[0].sessionInfo;
    const facilityStr = first.facility || 'Various';
    const periodStr = first.periodNumber || mKey;
    const settingStr = `${first.service || 'Mixed'} / ${first.ward || 'Mixed'}`;

    if (mIdx > 0) {
      basicRows.push([]);
      basicRows.push([]);
    }

    const titleRowIdx = basicRows.length;
    basicRows.push([`${header1} - ${header2} | Basic Compliance Report - ${formatMonthLabel(mKey)}`]);
    basicMerges.push({ s: { r: titleRowIdx, c: 0 }, e: { r: titleRowIdx, c: totalBasicCols - 1 } });

    const metaRowIdx = basicRows.length;
    const metaRow = new Array(totalBasicCols).fill('');
    metaRow[0] = `Facility: ${facilityStr}`;
    metaRow[4] = `Period: ${periodStr}`;
    metaRow[8] = `Setting: ${settingStr}`;
    basicRows.push(metaRow);
    if (totalBasicCols > 8) {
      basicMerges.push({ s: { r: metaRowIdx, c: 0 }, e: { r: metaRowIdx, c: 3 } });
      basicMerges.push({ s: { r: metaRowIdx, c: 4 }, e: { r: metaRowIdx, c: 7 } });
      basicMerges.push({ s: { r: metaRowIdx, c: 8 }, e: { r: metaRowIdx, c: totalBasicCols - 1 } });
    }

    const catHeaderRowIdx = basicRows.length;
    const catHeaderRow = new Array(totalBasicCols).fill('');
    catHeaderRow[0] = 'Prof. Category';
    profCategories.forEach((c, idx) => {
      const startCol = 1 + idx * 3;
      catHeaderRow[startCol] = c.name;
      basicMerges.push({ s: { r: catHeaderRowIdx, c: startCol }, e: { r: catHeaderRowIdx, c: startCol + 2 } });
    });
    const totalStartCol = 1 + profCategories.length * 3;
    catHeaderRow[totalStartCol] = 'Total per session';
    basicMerges.push({ s: { r: catHeaderRowIdx, c: totalStartCol }, e: { r: catHeaderRowIdx, c: totalStartCol + 2 } });
    basicRows.push(catHeaderRow);

    const subHeaderRow: any[] = ['Session N°'];
    profCategories.forEach(() => subHeaderRow.push('Opp', 'HW', 'HR'));
    subHeaderRow.push('Opp', 'HW', 'HR');
    basicRows.push(subHeaderRow);

    const sessionAgg: Record<string, any> = {};
    const colTotals: Record<string, { opp: number; hw: number; hr: number }> = {
      grandTotal: { opp: 0, hw: 0, hr: 0 },
    };
    profCategories.forEach((c) => {
      colTotals[c.code] = { opp: 0, hw: 0, hr: 0 };
    });

    mSessions.forEach((s) => {
      const sNo = String(s.sessionInfo.sessionNumber || 'Unknown');
      if (!sessionAgg[sNo]) {
        sessionAgg[sNo] = { total: { opp: 0, hw: 0, hr: 0 } };
        profCategories.forEach((c) => {
          sessionAgg[sNo][c.code] = { opp: 0, hw: 0, hr: 0 };
        });
      }

      s.professionals.forEach((prof) => {
        const code = String(prof.categoryCode);
        if (colTotals[code]) {
          prof.opportunities.forEach((opp) => {
            if ((opp.indications && opp.indications.length > 0) || opp.action) {
              sessionAgg[sNo][code].opp++;
              sessionAgg[sNo].total.opp++;
              colTotals[code].opp++;
              colTotals.grandTotal.opp++;
              if (opp.action === 'HW') {
                sessionAgg[sNo][code].hw++;
                sessionAgg[sNo].total.hw++;
                colTotals[code].hw++;
                colTotals.grandTotal.hw++;
              } else if (opp.action === 'HR') {
                sessionAgg[sNo][code].hr++;
                sessionAgg[sNo].total.hr++;
                colTotals[code].hr++;
                colTotals.grandTotal.hr++;
              }
            }
          });
        }
      });
    });

    const sortedSessionNos = Object.keys(sessionAgg).sort(
      (a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)
    );

    sortedSessionNos.forEach((sNo) => {
      const rowData: any[] = [Number(sNo) || sNo];
      profCategories.forEach((c) => {
        const d = sessionAgg[sNo][c.code];
        rowData.push(d.opp || 0, d.hw || 0, d.hr || 0);
      });
      const tot = sessionAgg[sNo].total;
      rowData.push(tot.opp || 0, tot.hw || 0, tot.hr || 0);
      basicRows.push(rowData);
    });

    const totCalcRowIdx = basicRows.length;
    const totCalcRow = new Array(totalBasicCols).fill('');
    totCalcRow[0] = 'Total Calculation';
    profCategories.forEach((c, idx) => {
      const startCol = 1 + idx * 3;
      const tot = colTotals[c.code];
      totCalcRow[startCol] = `Act = ${tot.hw + tot.hr} / Opp = ${tot.opp}`;
      basicMerges.push({ s: { r: totCalcRowIdx, c: startCol }, e: { r: totCalcRowIdx, c: startCol + 2 } });
    });
    const gt = colTotals.grandTotal;
    totCalcRow[totalStartCol] = `Act = ${gt.hw + gt.hr} / Opp = ${gt.opp}`;
    basicMerges.push({ s: { r: totCalcRowIdx, c: totalStartCol }, e: { r: totCalcRowIdx, c: totalStartCol + 2 } });
    basicRows.push(totCalcRow);

    const compRowIdx = basicRows.length;
    const compRow = new Array(totalBasicCols).fill('');
    compRow[0] = 'Compliance (%)';
    profCategories.forEach((c, idx) => {
      const startCol = 1 + idx * 3;
      const tot = colTotals[c.code];
      compRow[startCol] = formatPct(tot.hw + tot.hr, tot.opp);
      basicMerges.push({ s: { r: compRowIdx, c: startCol }, e: { r: compRowIdx, c: startCol + 2 } });
    });
    compRow[totalStartCol] = `Grand Total: ${formatPct(gt.hw + gt.hr, gt.opp)}`;
    basicMerges.push({ s: { r: compRowIdx, c: totalStartCol }, e: { r: compRowIdx, c: totalStartCol + 2 } });
    basicRows.push(compRow);
  });

  const wsBasic = XLSX.utils.aoa_to_sheet(basicRows);
  wsBasic['!merges'] = basicMerges;
  wsBasic['!cols'] = [{ wch: 20 }, ...Array.from({ length: totalBasicCols - 1 }, () => ({ wch: 9 }))];

  // SHEET 3: Moments Compliance Matrix
  const momentsRows: any[][] = [];
  const momentsMerges: XLSX.Range[] = [];
  const totalMomentsCols = 1 + WHO_INDICATIONS.length * 3;

  sortedMonthKeys.forEach((mKey, mIdx) => {
    const mSessions = monthMap.get(mKey)!;
    const first = mSessions[0].sessionInfo;
    const facilityStr = first.facility || 'Various';
    const periodStr = first.periodNumber || mKey;
    const settingStr = `${first.service || 'Mixed'} / ${first.ward || 'Mixed'}`;

    if (mIdx > 0) {
      momentsRows.push([]);
      momentsRows.push([]);
    }

    const titleRowIdx = momentsRows.length;
    momentsRows.push([`${header1} - ${header2} | Moments Compliance Report - ${formatMonthLabel(mKey)}`]);
    momentsMerges.push({ s: { r: titleRowIdx, c: 0 }, e: { r: titleRowIdx, c: totalMomentsCols - 1 } });

    const metaRowIdx = momentsRows.length;
    const metaRow = new Array(totalMomentsCols).fill('');
    metaRow[0] = `Facility: ${facilityStr}`;
    metaRow[4] = `Period: ${periodStr}`;
    metaRow[8] = `Setting: ${settingStr}`;
    momentsRows.push(metaRow);
    momentsMerges.push({ s: { r: metaRowIdx, c: 0 }, e: { r: metaRowIdx, c: 3 } });
    momentsMerges.push({ s: { r: metaRowIdx, c: 4 }, e: { r: metaRowIdx, c: 7 } });
    momentsMerges.push({ s: { r: metaRowIdx, c: 8 }, e: { r: metaRowIdx, c: totalMomentsCols - 1 } });

    const indHeaderRowIdx = momentsRows.length;
    const indHeaderRow = new Array(totalMomentsCols).fill('');
    indHeaderRow[0] = 'Indication';
    WHO_INDICATIONS.forEach((ind, idx) => {
      const startCol = 1 + idx * 3;
      indHeaderRow[startCol] = `${ind.label} (${ind.arLabel})`;
      momentsMerges.push({ s: { r: indHeaderRowIdx, c: startCol }, e: { r: indHeaderRowIdx, c: startCol + 2 } });
    });
    momentsRows.push(indHeaderRow);

    const subHeaderRow: any[] = ['Session N°'];
    WHO_INDICATIONS.forEach(() => subHeaderRow.push('Opp', 'HW', 'HR'));
    momentsRows.push(subHeaderRow);

    const sessionMomentsAgg: Record<string, any> = {};
    const indColTotals: Record<string, { opp: number; hw: number; hr: number }> = {};
    WHO_INDICATIONS.forEach((ind) => {
      indColTotals[ind.id] = { opp: 0, hw: 0, hr: 0 };
    });

    mSessions.forEach((s) => {
      const sNo = String(s.sessionInfo.sessionNumber || 'Unknown');
      if (!sessionMomentsAgg[sNo]) {
        sessionMomentsAgg[sNo] = {};
        WHO_INDICATIONS.forEach((ind) => {
          sessionMomentsAgg[sNo][ind.id] = { opp: 0, hw: 0, hr: 0 };
        });
      }
      s.professionals.forEach((prof) => {
        prof.opportunities.forEach((opp) => {
          WHO_INDICATIONS.forEach((ind) => {
            if (opp.indications && opp.indications.includes(ind.id)) {
              sessionMomentsAgg[sNo][ind.id].opp++;
              indColTotals[ind.id].opp++;
              if (opp.action === 'HW') {
                sessionMomentsAgg[sNo][ind.id].hw++;
                indColTotals[ind.id].hw++;
              } else if (opp.action === 'HR') {
                sessionMomentsAgg[sNo][ind.id].hr++;
                indColTotals[ind.id].hr++;
              }
            }
          });
        });
      });
    });

    const sortedSessionNos = Object.keys(sessionMomentsAgg).sort(
      (a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)
    );
    sortedSessionNos.forEach((sNo) => {
      const rowData: any[] = [Number(sNo) || sNo];
      WHO_INDICATIONS.forEach((ind) => {
        const d = sessionMomentsAgg[sNo][ind.id];
        rowData.push(d.opp || 0, d.hw || 0, d.hr || 0);
      });
      momentsRows.push(rowData);
    });

    const totCalcIdx = momentsRows.length;
    const totCalcRow = new Array(totalMomentsCols).fill('');
    totCalcRow[0] = 'Total Calculation';
    WHO_INDICATIONS.forEach((ind, idx) => {
      const startCol = 1 + idx * 3;
      const tot = indColTotals[ind.id];
      totCalcRow[startCol] = `Act = ${tot.hw + tot.hr} / Opp = ${tot.opp}`;
      momentsMerges.push({ s: { r: totCalcIdx, c: startCol }, e: { r: totCalcIdx, c: startCol + 2 } });
    });
    momentsRows.push(totCalcRow);

    const compIdx = momentsRows.length;
    const compRow = new Array(totalMomentsCols).fill('');
    compRow[0] = 'Compliance (%)';
    WHO_INDICATIONS.forEach((ind, idx) => {
      const startCol = 1 + idx * 3;
      const tot = indColTotals[ind.id];
      compRow[startCol] = formatPct(tot.hw + tot.hr, tot.opp);
      momentsMerges.push({ s: { r: compIdx, c: startCol }, e: { r: compIdx, c: startCol + 2 } });
    });
    momentsRows.push(compRow);
  });

  const wsMoments = XLSX.utils.aoa_to_sheet(momentsRows);
  wsMoments['!merges'] = momentsMerges;
  wsMoments['!cols'] = [{ wch: 20 }, ...Array.from({ length: totalMomentsCols - 1 }, () => ({ wch: 10 }))];

  // SHEET 4: Sessions Summary
  const sessionsRows: any[][] = [[
    'الشهر', 'رقم الجلسة', 'التاريخ', 'المنشأة (Facility)', 'القسم / العيادة (Department)',
    'الخدمة (Service)', 'العنبر (Ward)', 'الملاحظ (Observer)', 'وقت البدء', 'وقت الانتهاء',
    'المدة (دقيقة)', 'رقم الصفحة', 'إجمالي الفرص', 'دلك بالكحول (HR)', 'غسيل بالماء والصابون (HW)',
    'إجمالي الالتزام', 'الفرص الفائتة (Missed)', 'ارتداء قفازات', 'نسبة الالتزام (%)',
  ]];

  sortedSessions.forEach((s) => {
    const info = s.sessionInfo;
    let sOpp = 0; let sHR = 0; let sHW = 0; let sMissed = 0; let sGloves = 0;
    s.professionals.forEach((p) => {
      p.opportunities.forEach((o) => {
        if ((o.indications && o.indications.length > 0) || o.action) {
          sOpp++;
          if (o.gloves) sGloves++;
          if (o.action === 'HR') sHR++;
          else if (o.action === 'HW') sHW++;
          else sMissed++;
        }
      });
    });
    const mKey = (info.date || '').slice(0, 7) || 'unknown';
    sessionsRows.push([
      formatMonthLabel(mKey), Number(info.sessionNumber) || info.sessionNumber || '',
      info.date || '', info.facility || '', info.department || '', info.service || '',
      info.ward || '', info.observer || '', info.startTime || '', info.endTime || '',
      info.duration !== undefined && info.duration !== null ? info.duration : '',
      info.pageNumber || '', sOpp, sHR, sHW, sHR + sHW, sMissed, sGloves, formatPct(sHR + sHW, sOpp),
    ]);
  });

  const wsSessions = XLSX.utils.aoa_to_sheet(sessionsRows);
  wsSessions['!views'] = [{ rightToLeft: true }];
  wsSessions['!cols'] = [
    { wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 22 },
    { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 20 },
    { wch: 15 }, { wch: 18 }, { wch: 14 }, { wch: 16 },
  ];

  // SHEET 5: Detailed Opportunities
  const detailRows: any[][] = [[
    'الشهر', 'رقم الجلسة', 'التاريخ', 'المنشأة', 'القسم / العيادة', 'الخدمة', 'العنبر',
    'الملاحظ', 'كود الفئة', 'الفئة المهنية', 'رقم الفرصة',
    'قبل ملامسة المريض (bef-pat)', 'قبل إجراء نظيف/معقم (bef-asept)',
    'بعد خطر سوائل الجسم (aft-b.f)', 'بعد ملامسة المريض (aft-pat)',
    'بعد ملامسة محيط المريض (aft.p.surr)', 'الإجراء (HR/HW/Missed)', 'حالة الالتزام', 'ارتداء القفازات',
  ]];

  sortedSessions.forEach((s) => {
    const info = s.sessionInfo;
    const mKey = (info.date || '').slice(0, 7) || 'unknown';
    const monthStr = formatMonthLabel(mKey);
    s.professionals.forEach((prof) => {
      prof.opportunities.forEach((opp) => {
        if ((opp.indications && opp.indications.length > 0) || opp.action) {
          const isCompliant = opp.action === 'HR' || opp.action === 'HW';
          detailRows.push([
            monthStr, Number(info.sessionNumber) || info.sessionNumber || '', info.date || '',
            info.facility || '', info.department || '', info.service || '', info.ward || '',
            info.observer || '', prof.categoryCode || '', prof.categoryName || '', opp.number || '',
            opp.indications?.includes('bef-pat') ? 'نعم' : 'لا',
            opp.indications?.includes('bef-asept') ? 'نعم' : 'لا',
            opp.indications?.includes('aft-bf') ? 'نعم' : 'لا',
            opp.indications?.includes('aft-pat') ? 'نعم' : 'لا',
            opp.indications?.includes('aft-p-surr') ? 'نعم' : 'لا',
            opp.action || 'Missed', isCompliant ? 'ملتزم' : 'غير ملتزم', opp.gloves ? 'نعم' : 'لا',
          ]);
        }
      });
    });
  });

  const wsDetails = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetails['!views'] = [{ rightToLeft: true }];
  wsDetails['!cols'] = [
    { wch: 22 }, { wch: 11 }, { wch: 13 }, { wch: 22 }, { wch: 20 }, { wch: 16 },
    { wch: 15 }, { wch: 16 }, { wch: 10 }, { wch: 18 }, { wch: 11 }, { wch: 22 },
    { wch: 24 }, { wch: 22 }, { wch: 20 }, { wch: 25 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص التقرير والإحصائيات');
  XLSX.utils.book_append_sheet(wb, wsBasic, 'Basic Compliance Report');
  XLSX.utils.book_append_sheet(wb, wsMoments, 'Moments Compliance Report');
  XLSX.utils.book_append_sheet(wb, wsSessions, 'ملخص الجلسات');
  XLSX.utils.book_append_sheet(wb, wsDetails, 'البيانات التفصيلية');

  const safeSuffix =
    sortedMonthKeys.length === 1
      ? sortedMonthKeys[0]
      : `${sortedMonthKeys[sortedMonthKeys.length - 1]}_to_${sortedMonthKeys[0]}`;

  triggerWorkbookDownload(wb, `${fileNamePrefix}_${safeSuffix}.xlsx`);
  return true;
};

// ============================================================================
// STATISTICS & MATRIX REPORT RENDERERS
// ============================================================================

interface BasicStatEntry {
  opp: number;
  hw: number;
  hr: number;
}

interface BasicStatsResult {
  headerInfo: { facility: string; period: string | number; setting: string };
  sessions: Record<string, Record<string, BasicStatEntry>>;
  sortedSessionKeys: string[];
  colTotals: Record<string, BasicStatEntry>;
}

const calculateBasicStats = (
  filteredData: SessionDataRecord[],
  profCategories: ProfCategoryDef[]
): BasicStatsResult | null => {
  if (!filteredData || filteredData.length === 0) return null;
  const first = filteredData[0].sessionInfo;
  const headerInfo = {
    facility: first.facility || 'Various',
    period: first.periodNumber || 'Various',
    setting: `${first.service || 'Mixed'} / ${first.ward || 'Mixed'}`,
  };
  const sessions: Record<string, Record<string, BasicStatEntry>> = {};
  const colTotals: Record<string, BasicStatEntry> = {
    grandTotal: { opp: 0, hw: 0, hr: 0 },
  };
  profCategories.forEach((c) => {
    colTotals[c.code] = { opp: 0, hw: 0, hr: 0 };
  });

  filteredData.forEach((session) => {
    const sNo = String(session.sessionInfo.sessionNumber || 'Unknown');
    if (!sessions[sNo]) {
      sessions[sNo] = { total: { opp: 0, hw: 0, hr: 0 } };
      profCategories.forEach((c) => {
        sessions[sNo][c.code] = { opp: 0, hw: 0, hr: 0 };
      });
    }

    session.professionals.forEach((prof) => {
      const catCode = String(prof.categoryCode);
      if (profCategories.find((c) => c.code === catCode)) {
        prof.opportunities.forEach((opp) => {
          if (opp.indications.length > 0 || opp.action) {
            sessions[sNo][catCode].opp++;
            sessions[sNo].total.opp++;
            colTotals[catCode].opp++;
            colTotals.grandTotal.opp++;

            if (opp.action === 'HW') {
              sessions[sNo][catCode].hw++;
              sessions[sNo].total.hw++;
              colTotals[catCode].hw++;
              colTotals.grandTotal.hw++;
            } else if (opp.action === 'HR') {
              sessions[sNo][catCode].hr++;
              sessions[sNo].total.hr++;
              colTotals[catCode].hr++;
              colTotals.grandTotal.hr++;
            }
          }
        });
      }
    });
  });

  const sortedSessionKeys = Object.keys(sessions).sort((a, b) => {
    const nA = parseInt(a, 10);
    const nB = parseInt(b, 10);
    if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
    return a.localeCompare(b);
  });

  return { headerInfo, sessions, sortedSessionKeys, colTotals };
};

interface MomentStatEntry {
  indic: number;
  hw: number;
  hr: number;
}

interface MomentsStatsResult {
  headerInfo: { facility: string; period: string | number; setting: string };
  sessions: Record<string, Record<string, MomentStatEntry>>;
  sortedSessionKeys: string[];
  colTotals: Record<string, MomentStatEntry>;
}

const calculateMomentsStats = (
  filteredData: SessionDataRecord[]
): MomentsStatsResult | null => {
  if (!filteredData || filteredData.length === 0) return null;
  const first = filteredData[0].sessionInfo;
  const headerInfo = {
    facility: first.facility || 'Various',
    period: first.periodNumber || 'Various',
    setting: `${first.service || 'Mixed'} / ${first.ward || 'Mixed'}`,
  };
  const sessions: Record<string, Record<string, MomentStatEntry>> = {};
  const colTotals: Record<string, MomentStatEntry> = {};
  INDICATIONS.forEach((ind) => {
    colTotals[ind.id] = { indic: 0, hw: 0, hr: 0 };
  });

  filteredData.forEach((session) => {
    const sNo = String(session.sessionInfo.sessionNumber || 'Unknown');
    if (!sessions[sNo]) {
      sessions[sNo] = {};
      INDICATIONS.forEach((ind) => {
        sessions[sNo][ind.id] = { indic: 0, hw: 0, hr: 0 };
      });
    }

    session.professionals.forEach((prof) => {
      prof.opportunities.forEach((opp) => {
        INDICATIONS.forEach((ind) => {
          if (opp.indications.includes(ind.id)) {
            sessions[sNo][ind.id].indic++;
            colTotals[ind.id].indic++;
            if (opp.action === 'HW') {
              sessions[sNo][ind.id].hw++;
              colTotals[ind.id].hw++;
            }
            if (opp.action === 'HR') {
              sessions[sNo][ind.id].hr++;
              colTotals[ind.id].hr++;
            }
          }
        });
      });
    });
  });

  const sortedSessionKeys = Object.keys(sessions).sort((a, b) => {
    const nA = parseInt(a, 10);
    const nB = parseInt(b, 10);
    if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
    return a.localeCompare(b);
  });

  return { headerInfo, sessions, sortedSessionKeys, colTotals };
};

const renderBasicTable = (
  basicReportData: BasicStatsResult | null,
  profCategories: ProfCategoryDef[]
) => {
  if (!basicReportData) return null;
  const profCodes = profCategories.map((c) => c.code);
  const totalCols = 1 + profCodes.length * 3 + 3;
  const settingColSpan = Math.max(1, totalCols - 8);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden print:overflow-visible print:shadow-none print:border-none print:w-full">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center print:hidden">
        <h3 className="font-bold text-slate-700">Detailed Basic Compliance Matrix</h3>
      </div>
      <div className="overflow-x-auto pb-4 p-4 print:p-0 print:overflow-visible report-table-wrapper">
        <table className="w-full border-collapse report-table text-xs text-black shadow-sm print:shadow-none print:text-[8pt] print:w-full">
          <colgroup>
            <col style={{ width: '16.66%' }} />
            {Array.from({ length: totalCols - 1 }).map((_, i) => (
              <col key={i} style={{ width: `${83.33 / (totalCols - 1)}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-orange-100 header-row">
              <th className="p-1 text-left bg-orange-200 font-bold group-divider" colSpan={4}>
                Facility: {basicReportData.headerInfo.facility}
              </th>
              <th className="p-1 text-left bg-orange-200 font-bold group-divider" colSpan={4}>
                Period: {basicReportData.headerInfo.period}
              </th>
              <th className="p-1 text-left bg-orange-200 font-bold" colSpan={settingColSpan}>
                Setting: {basicReportData.headerInfo.setting}
              </th>
            </tr>
            <tr className="bg-orange-50">
              <th className="p-1 text-center group-divider"></th>
              {profCategories.map((c, i) => (
                <th key={i} className="p-1 text-center group-divider" colSpan={3}>
                  <div className="text-[8px] font-normal italic">Prof.cat.</div>
                  {c.name}
                </th>
              ))}
              <th className="p-1 text-center bg-orange-100 align-bottom font-bold" colSpan={3}>
                Total per session
              </th>
            </tr>
            <tr className="bg-orange-50 font-bold">
              <th className="p-1 text-center group-divider">Session N°</th>
              {profCodes.map((k) => (
                <React.Fragment key={k}>
                  <th className="p-1 text-center">Opp</th>
                  <th className="p-1 text-center">HW</th>
                  <th className="p-1 text-center group-divider">HR</th>
                </React.Fragment>
              ))}
              <th className="p-1 text-center bg-orange-100">Opp</th>
              <th className="p-1 text-center bg-orange-100">HW</th>
              <th className="p-1 text-center bg-orange-100">HR</th>
            </tr>
          </thead>
          <tbody>
            {basicReportData.sortedSessionKeys.map((sNo) => {
              const sData = basicReportData.sessions[sNo];
              return (
                <tr key={sNo} className="odd:bg-white even:bg-slate-50 hover:bg-orange-50 transition-colors">
                  <td className="p-1 text-center font-bold bg-slate-100 group-divider">{sNo}</td>
                  {profCodes.map((k) => (
                    <React.Fragment key={k}>
                      <td className="p-1 text-center">{sData[k]?.opp || ''}</td>
                      <td className="p-1 text-center">{sData[k]?.hw || ''}</td>
                      <td className="p-1 text-center group-divider">{sData[k]?.hr || ''}</td>
                    </React.Fragment>
                  ))}
                  <td className="p-1 text-center font-bold bg-orange-50">{sData.total.opp || ''}</td>
                  <td className="p-1 text-center font-bold bg-orange-50">{sData.total.hw || ''}</td>
                  <td className="p-1 text-center font-bold bg-orange-50">{sData.total.hr || ''}</td>
                </tr>
              );
            })}
            <tr className="total-row bg-slate-50">
              <td className="p-1 text-center font-bold text-[11px] leading-tight bg-slate-200 group-divider">
                Total
                <br />
                Calculation
              </td>
              {profCodes.map((k) => (
                <td key={k} className="p-0 diagonal-split group-divider" colSpan={3}>
                  <div className="h-14 w-full relative">
                    <div className="absolute top-0.5 right-0.5 text-[11px] font-bold z-10 text-slate-700">
                      Act={basicReportData.colTotals[k].hw + basicReportData.colTotals[k].hr}
                    </div>
                    <div className="absolute bottom-0.5 left-0.5 text-[11px] font-bold z-10 text-slate-700">
                      Opp={basicReportData.colTotals[k].opp}
                    </div>
                  </div>
                </td>
              ))}
              <td className="p-0 diagonal-split bg-orange-50" colSpan={3}>
                <div className="h-14 w-full relative">
                  <div className="absolute top-0.5 right-0.5 text-[11px] font-bold z-10 text-orange-900">
                    Act={basicReportData.colTotals.grandTotal.hw + basicReportData.colTotals.grandTotal.hr}
                  </div>
                  <div className="absolute bottom-0.5 left-0.5 text-[11px] font-bold z-10 text-orange-900">
                    Opp={basicReportData.colTotals.grandTotal.opp}
                  </div>
                </div>
              </td>
            </tr>
            <tr className="bg-orange-100 font-bold">
              <td className="p-1 text-center text-[12px] uppercase tracking-tighter bg-orange-200 group-divider">
                Compliance
              </td>
              {profCodes.map((k) => {
                const tot = basicReportData.colTotals[k];
                const acts = tot.hw + tot.hr;
                const pct = tot.opp > 0 ? ((acts / tot.opp) * 100).toFixed(2) : '0.00';
                return (
                  <td key={k} className="p-1 text-center text-xl font-black group-divider" colSpan={3}>
                    {pct}%
                  </td>
                );
              })}
              <td className="p-1 text-center bg-orange-200 text-black border-l-2 border-black" colSpan={3}>
                <div className="text-[11px] font-bold uppercase text-slate-700 mb-1">Grand Total</div>
                <div className="text-3xl font-black">
                  {(() => {
                    const gt = basicReportData.colTotals.grandTotal;
                    const acts = gt.hw + gt.hr;
                    return gt.opp > 0 ? ((acts / gt.opp) * 100).toFixed(2) : '0.00';
                  })()}
                  %
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const renderMomentsTable = (momentsReportData: MomentsStatsResult | null) => {
  if (!momentsReportData) return null;
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden print:overflow-visible print:shadow-none print:border-none print:w-full">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center print:hidden">
        <h3 className="font-bold text-slate-700">Detailed Moments Compliance Matrix</h3>
      </div>
      <div className="overflow-x-auto pb-4 p-4 print:p-0 print:overflow-visible report-table-wrapper">
        <table className="w-full border-collapse report-table text-xs text-black shadow-sm print:shadow-none print:text-[8pt] print:w-full">
          <colgroup>
            <col style={{ width: '16.66%' }} />
            {Array.from({ length: 15 }).map((_, i) => (
              <col key={i} style={{ width: '5.55%' }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-orange-100 header-row">
              <th className="p-1 text-left bg-orange-200 font-bold group-divider" colSpan={4}>
                Facility: {momentsReportData.headerInfo.facility}
              </th>
              <th className="p-1 text-left bg-orange-200 font-bold group-divider" colSpan={4}>
                Period: {momentsReportData.headerInfo.period}
              </th>
              <th className="p-1 text-left bg-orange-200 font-bold" colSpan={8}>
                Setting: {momentsReportData.headerInfo.setting}
              </th>
            </tr>
            <tr className="bg-orange-50">
              <th className="p-1 text-center group-divider"></th>
              {INDICATIONS.map((ind, i) => (
                <th key={i} className="p-1 text-center group-divider" colSpan={3}>
                  <div className="text-[8px] font-normal italic">Indication</div>
                  {ind.label}
                </th>
              ))}
            </tr>
            <tr className="bg-orange-50 font-bold">
              <th className="p-1 text-center group-divider">Session N°</th>
              {INDICATIONS.map((ind) => (
                <React.Fragment key={ind.id}>
                  <th className="p-1 text-center">Opp</th>
                  <th className="p-1 text-center">HW</th>
                  <th className="p-1 text-center group-divider">HR</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {momentsReportData.sortedSessionKeys.map((sNo) => {
              const sData = momentsReportData.sessions[sNo];
              return (
                <tr key={sNo} className="odd:bg-white even:bg-slate-50 hover:bg-orange-50 transition-colors">
                  <td className="p-1 text-center font-bold bg-slate-100 group-divider">{sNo}</td>
                  {INDICATIONS.map((ind) => {
                    const d = sData[ind.id];
                    return (
                      <React.Fragment key={ind.id}>
                        <td className="p-1 text-center">{d.indic || ''}</td>
                        <td className="p-1 text-center">{d.hw || ''}</td>
                        <td className="p-1 text-center group-divider">{d.hr || ''}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="total-row bg-slate-50">
              <td className="p-1 text-center font-bold text-[11px] leading-tight bg-slate-200 group-divider">
                Total
                <br />
                Calculation
              </td>
              {INDICATIONS.map((ind) => (
                <td key={ind.id} className="p-0 diagonal-split group-divider" colSpan={3}>
                  <div className="h-14 w-full relative">
                    <div className="absolute top-0.5 right-0.5 text-[11px] font-bold z-10 text-slate-700">
                      Act={momentsReportData.colTotals[ind.id].hw + momentsReportData.colTotals[ind.id].hr}
                    </div>
                    <div className="absolute bottom-0.5 left-0.5 text-[11px] font-bold z-10 text-slate-700">
                      Opp={momentsReportData.colTotals[ind.id].indic}
                    </div>
                  </div>
                </td>
              ))}
            </tr>
            <tr className="bg-orange-100 font-bold">
              <td className="p-1 text-center text-[12px] uppercase tracking-tighter bg-orange-200 group-divider">
                Compliance
              </td>
              {INDICATIONS.map((ind) => {
                const tot = momentsReportData.colTotals[ind.id];
                const acts = tot.indic > 0 ? (((tot.hw + tot.hr) / tot.indic) * 100).toFixed(2) : '0.00';
                return (
                  <td key={ind.id} className="p-1 text-center text-xl font-black group-divider" colSpan={3}>
                    {acts}%
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Print: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  Download: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Excel: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="12" y1="11" x2="12" y2="19" />
    </svg>
  ),
  Eye: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Spinner: () => (
    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  Form: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Chart: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Database: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Clipboard: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Activity: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Lock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Logout: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  WHOLogo: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" strokeWidth={2} strokeLinecap="round" />
      <path d="M10 8c4-1 6-4 6-4s0 4-4 6c-4 2-4 5-1 7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="9" strokeWidth={1} strokeDasharray="2 2" className="opacity-50" />
      <path d="M5 14c-1-2-1-5 1-7" strokeWidth={1} className="opacity-70" />
      <path d="M19 14c1-2 1-5-1-7" strokeWidth={1} className="opacity-70" />
    </svg>
  ),
};

// ============================================================================
// FORM SUB-COMPONENTS & WHO HEADER
// ============================================================================

const FormCheckbox: React.FC<{
  checked: boolean;
  onChange?: (val: boolean) => void;
  label: string;
  readOnly?: boolean;
}> = ({ checked, onChange, label, readOnly = false }) => (
  <div
    className={`flex items-center mb-0.5 print:mb-0 ${readOnly ? '' : 'cursor-pointer select-none'}`}
    onClick={() => !readOnly && onChange && onChange(!checked)}
  >
    <div className={`form-checkbox ${checked ? 'checked' : ''}`}></div>
    <span className="text-[10px] md:text-[11px] leading-tight print:text-[12pt] print:font-bold print:tracking-tight">
      {label}
    </span>
  </div>
);

const FormRadio: React.FC<{
  checked: boolean;
  onChange?: () => void;
  label: string;
  readOnly?: boolean;
}> = ({ checked, onChange, label, readOnly = false }) => (
  <div
    className={`flex items-center mb-0.5 print:mb-0 ${readOnly ? '' : 'cursor-pointer select-none'}`}
    onClick={() => !readOnly && onChange && onChange()}
  >
    <div className={`form-radio ${checked ? 'checked' : ''}`}></div>
    <span className="text-[10px] md:text-[11px] leading-tight print:text-[12pt] print:font-bold print:tracking-tight">
      {label}
    </span>
  </div>
);

const FormInputRow: React.FC<{
  label: string;
  value: string | number | undefined | null;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  type?: string;
  readOnly?: boolean;
  options?: string[] | null;
}> = ({ label, value, onChange, type = 'text', readOnly = false, options = null }) => (
  <div className="flex flex-col md:flex-row md:items-center mb-3 md:mb-1 print:mb-1 print:flex-row print:items-center form-input-row">
    <label className="text-xs font-bold text-gray-700 mb-1 md:mb-0 md:w-32 flex-shrink-0 print:w-36 print:text-[12px] print:mb-0">
      {label}
    </label>
    {readOnly ? (
      <div className="form-input-print-text w-full">
        {value !== undefined && value !== null ? value : ''}
      </div>
    ) : (
      <>
        {options && options.length > 0 ? (
          <select
            className="form-input-bg h-9 md:h-7 text-base md:text-sm print:hidden"
            value={value !== undefined && value !== null ? value : ''}
            onChange={onChange}
          >
            <option value="">Select...</option>
            {options.map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            className="form-input-bg h-9 md:h-7 text-base md:text-sm print:hidden"
            value={value !== undefined && value !== null ? value : ''}
            onChange={onChange}
          />
        )}
        <div className="hidden print:block form-input-print-text w-full">
          {value !== undefined && value !== null ? value : ''}
        </div>
      </>
    )}
  </div>
);

const OpportunityBlock: React.FC<{
  opp: OpportunityRecord;
  index: number;
  onChange: (updated: OpportunityRecord) => void;
  readOnly?: boolean;
}> = ({ opp, index, onChange, readOnly = false }) => {
  const toggleInd = (id: string) => {
    if (readOnly) return;
    const has = opp.indications.includes(id);
    onChange({
      ...opp,
      indications: has ? opp.indications.filter((x) => x !== id) : [...opp.indications, id],
    });
  };
  return (
    <tr
      className={`border-b border-gray-400 bg-white hover:bg-orange-50 transition-colors ${
        readOnly ? 'opp-row-readonly' : 'h-32 md:h-24 print-opp-row'
      }`}
    >
      <td className="bg-[#ffe4cc] text-center font-bold text-sm border-r border-gray-400 w-8 text-gray-900 print:w-[15%] print:border-r-2 print:border-black print:bg-[#ffe4cc]">
        {index + 1}
      </td>
      <td className="p-2 md:p-1 border-r border-gray-400 align-top w-32 md:w-28 print:p-0.5 print:w-[40%] print:border-r-2 print:border-black">
        <div className="flex flex-col gap-1.5 md:gap-0">
          {INDICATIONS.map((ind) => (
            <FormCheckbox
              key={ind.id}
              label={ind.label}
              checked={opp.indications.includes(ind.id)}
              onChange={() => toggleInd(ind.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      </td>
      <td className="p-2 md:p-1 align-top print:p-0.5 print:w-[45%]">
        <div className="flex flex-col gap-1.5 md:gap-0">
          <FormCheckbox
            label="HR"
            checked={opp.action === 'HR'}
            onChange={(v) => !readOnly && onChange({ ...opp, action: v ? 'HR' : '' })}
            readOnly={readOnly}
          />
          <FormCheckbox
            label="HW"
            checked={opp.action === 'HW'}
            onChange={(v) => !readOnly && onChange({ ...opp, action: v ? 'HW' : '' })}
            readOnly={readOnly}
          />
          <FormRadio
            label="missed"
            checked={opp.action === 'Missed' || opp.action === 'None'}
            onChange={() => !readOnly && onChange({ ...opp, action: 'Missed' })}
            readOnly={readOnly}
          />
          <div className="mt-1 md:mt-0.5">
            <FormRadio
              label="gloves"
              checked={opp.gloves}
              onChange={() => !readOnly && onChange({ ...opp, gloves: !opp.gloves })}
              readOnly={readOnly}
            />
          </div>
        </div>
      </td>
    </tr>
  );
};

const ProfessionalColumn: React.FC<{
  prof: ProfessionalRecord;
  pIndex: number;
  onUpdate?: (updated: ProfessionalRecord) => void;
  readOnly?: boolean;
  profCategories: ProfCategoryDef[];
}> = ({ prof, pIndex, onUpdate, readOnly = false, profCategories }) => {
  const opportunities = useMemo(() => {
    const slots: OpportunityRecord[] = [];
    for (let i = 0; i < 8; i++) {
      const existing = prof.opportunities.find((o) => parseInt(String(o.number), 10) === i + 1);
      slots.push(
        existing || {
          id: `v-${pIndex}-${i}`,
          number: i + 1,
          indications: [],
          action: '',
          gloves: false,
        }
      );
    }
    return slots;
  }, [prof.opportunities, pIndex]);

  return (
    <div className="prof-col flex flex-col h-full print:h-auto prof-col-container">
      <div className="bg-[#ffe4cc] p-1 border-b border-gray-400 print:border-b-2 print:border-black h-12 md:h-10 flex flex-col justify-center prof-header-row">
        <div className="flex justify-between items-center px-1 h-full print:h-auto w-full">
          <span className="font-bold text-xs shrink-0 mr-1 prof-cat-label text-gray-900">Prof.cat</span>
          {readOnly ? (
            <div className="text-[10px] font-bold bg-white px-2 py-0.5 border border-gray-400 truncate w-full text-center flex items-center justify-center h-6 prof-cat-val-container print:h-auto print:leading-none">
              {prof.categoryName || 'N/A'}
            </div>
          ) : (
            <React.Fragment>
              <select
                className="border border-gray-400 text-sm md:text-xs h-8 md:h-auto w-28 md:w-28 bg-white print:hidden focus:ring-1 focus:ring-orange-500 rounded"
                value={prof.categoryCode}
                onChange={(e) => {
                  const cat = profCategories.find((c) => c.code === e.target.value);
                  onUpdate &&
                    onUpdate({
                      ...prof,
                      categoryCode: e.target.value,
                      categoryName: cat ? cat.name : '',
                    });
                }}
              >
                <option value="">Select...</option>
                {profCategories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="hidden print:flex text-[10px] font-bold bg-white px-2 py-0.5 border border-gray-400 truncate w-full text-center items-center justify-center h-auto leading-none prof-cat-val-container">
                {prof.categoryName || ''}
              </div>
            </React.Fragment>
          )}
        </div>
      </div>
      <table className="w-full text-left border-collapse prof-col-table">
        <thead className="opp-header">
          <tr className="bg-[#ffe4cc] border-b border-gray-800 print:border-b-2 print:border-black text-[10px] font-bold text-gray-900">
            <th className="border-r border-gray-400 text-center w-8 py-1 print:w-[15%] print:text-center print:border-r-2 print:border-black">
              Opp.
            </th>
            <th className="border-r border-gray-400 pl-2 print:w-[40%] print:border-r-2 print:border-black print:text-left">
              Indication
            </th>
            <th className="pl-2 print:w-[45%] print:text-left">HH Action</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opp, idx) => (
            <OpportunityBlock
              key={idx}
              index={idx}
              opp={opp}
              readOnly={readOnly}
              onChange={(u) =>
                !readOnly &&
                onUpdate &&
                onUpdate({
                  ...prof,
                  opportunities: opportunities.map((o, i) => (i === idx ? u : o)),
                })
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const WHOHeader: React.FC<{ small?: boolean; settings?: AppSettings | null }> = ({
  small = false,
  settings,
}) => {
  const leftLogo = formatGoogleDriveUrl(settings?.logoLeft);
  const rightLogo = formatGoogleDriveUrl(settings?.logoRight);

  return (
    <div
      className={`who-header-bg text-white border-b-4 border-[#c1501b] transition-all duration-300 ${
        small ? 'py-1.5 px-3 md:py-2 md:px-4' : 'py-2 px-4 md:py-3 md:px-6'
      } print:px-4 print:py-1.5 print:border-[#c1501b] flex items-center justify-center relative overflow-hidden`}
    >
      <div className="w-full flex items-center justify-between" dir="ltr">
        <div className="w-20 md:w-28 print:w-20 shrink-0 flex items-center justify-start overflow-hidden">
          {leftLogo ? (
            <img
              src={leftLogo}
              alt="Logo Left"
              className="who-header-logo max-h-12 md:max-h-14 print:max-h-11 w-auto max-w-full object-contain drop-shadow-sm select-none"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
          <div
            className={`${
              small ? 'text-sm md:text-lg' : 'text-base md:text-2xl'
            } font-bold font-['Cairo'] leading-tight transition-all duration-300 who-header-title`}
          >
            {settings?.header1 || 'مستشفى المنيا الجامعى للعيون'}
          </div>
          <div
            className={`${
              small ? 'text-xs md:text-sm' : 'text-sm md:text-lg'
            } font-medium font-['Cairo'] opacity-90 mt-0.5 transition-all duration-300 who-header-subtitle`}
          >
            {settings?.header2 || 'وحدة مكافحة العدوي'}
          </div>
          <div
            className={`${
              small ? 'text-sm md:text-lg' : 'text-lg md:text-2xl'
            } font-bold font-['Cairo'] mt-1 border-t border-white/30 pt-1 w-full transition-all duration-300 who-header-main`}
          >
            {settings?.header3 || 'إحصائية غسيل الأيدي'}
          </div>
        </div>

        <div className="w-20 md:w-28 print:w-20 shrink-0 flex items-center justify-end overflow-hidden">
          {rightLogo ? (
            <img
              src={rightLogo}
              alt="Logo Right"
              className="who-header-logo max-h-12 md:max-h-14 print:max-h-11 w-auto max-w-full object-contain drop-shadow-sm select-none"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const ReadOnlyObservationForm: React.FC<{
  sessionData: SessionDataRecord;
  sessionIndex: number;
  totalSessions: number;
  settings?: AppSettings | null;
}> = ({ sessionData, sessionIndex, totalSessions, settings }) => {
  const { sessionInfo, professionals } = sessionData;
  const fullProfessionals = useMemo(() => {
    const lp: ProfessionalRecord[] = [];
    for (let i = 0; i < 4; i++) {
      const found = professionals.find((p) => p._colNo === i + 1);
      if (found) {
        lp.push({ ...found, id: Math.random() });
      } else {
        lp.push({ id: Math.random(), categoryCode: '', categoryName: '', opportunities: [] });
      }
    }
    professionals.forEach((p) => {
      if ((p._colNo && p._colNo > 4) || !p._colNo) {
        const emptyIdx = lp.findIndex((empty) => !empty.categoryCode && empty.opportunities.length === 0);
        if (emptyIdx !== -1) {
          lp[emptyIdx] = { ...p, id: Math.random() };
        } else {
          lp.push({ ...p, id: Math.random() });
        }
      }
    });
    return lp.slice(0, Math.max(4, lp.length));
  }, [professionals]);

  return (
    <div className="bg-white mx-auto max-w-[1000px] paper-container shadow-none border border-gray-100 overflow-hidden">
      <WHOHeader small={true} settings={settings} />
      <div className="px-3 pb-3 pt-1 md:px-5 md:pb-5 md:pt-2 flex-1 flex flex-col min-h-[calc(100vh-150px)] print:min-h-0 print-content-wrapper">
        <h1 className="text-lg md:text-xl font-bold text-gray-500 mb-2 border-b-2 border-gray-200 pb-0.5 flex justify-between items-center print:mb-1">
          <span>Observation Form</span>
          <div className="flex flex-col text-right">
            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">
              SESSION {sessionIndex + 1} OF {totalSessions}
            </span>
            <span className="text-[8px] text-slate-300 font-normal">
              Form Ref: {sessionInfo.sessionId ? sessionInfo.sessionId.slice(0, 8) : ''}
            </span>
          </div>
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-x-6 gap-y-1 mb-3 text-[11px] print:mb-2 print:gap-y-1 print:gap-x-6">
          <div>
            <FormInputRow label="Facility:" value={sessionInfo.facility} readOnly />
            <FormInputRow label="Service:" value={sessionInfo.service} readOnly />
            <FormInputRow label="Ward:" value={sessionInfo.ward} readOnly />
            <FormInputRow label="Department:" value={sessionInfo.department} readOnly />
            <FormInputRow label="Country**:" value={sessionInfo.country} readOnly />
          </div>
          <div>
            <FormInputRow label="Period Number*:" value={sessionInfo.periodNumber} readOnly />
            <FormInputRow label="Date (dd/mm/yy):" value={sessionInfo.date} readOnly />
            <div className="flex mb-1 items-center print:mb-1">
              <label className="w-32 text-[11px] font-bold text-gray-800 shrink-0 print:w-36 print:text-[12px] print:mb-0">
                Time:
              </label>
              <div className="form-input-print-text w-full">
                <span className="mr-1">{sessionInfo.startTime}</span>
                <span className="text-gray-400 mx-1">-</span>
                <span>{sessionInfo.endTime}</span>
              </div>
            </div>
            <FormInputRow label="Session duration (mm):" value={sessionInfo.duration} readOnly />
          </div>
          <div>
            <FormInputRow label="Session Number*:" value={sessionInfo.sessionNumber} readOnly />
            <FormInputRow label="Observer (initials):" value={sessionInfo.observer} readOnly />
            <FormInputRow label="Page N°:" value={sessionInfo.pageNumber} readOnly />
            <FormInputRow label="City**:" value={sessionInfo.city} readOnly />
          </div>
        </div>

        <div className="border-2 border-gray-800 overflow-hidden flex-1 prof-main-container print:mt-1">
          <div className="flex flex-col md:flex-row print:flex-row w-full prof-cols-row">
            {fullProfessionals.map((prof, idx) => (
              <div
                key={idx}
                className="w-full md:w-1/4 print:w-1/4 shrink-0 border-b-4 border-gray-800 md:border-b-0 md:border-r-2 last:border-b-0 md:last:border-r-0 print:border-r-2 print:border-b-0 print:last:border-r-0 prof-col-wrapper"
              >
                <ProfessionalColumn
                  prof={prof}
                  pIndex={idx}
                  readOnly
                  profCategories={getProfCategories(settings)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="print-footer">
          <div className="mb-0.5">
            {settings?.header1 || 'مستشفى المنيا الجامعى للعيون'} -{' '}
            {settings?.header2 || 'وحدة مكافحة العدوي'}
          </div>
          <div className="flex justify-between items-center w-full px-4 font-normal text-[7pt] italic text-slate-500">
            <span>Based on WHO's Hand Hygiene Compliance Observation Form</span>
            <span>
              Record ID: {sessionInfo.sessionId ? sessionInfo.sessionId.slice(0, 8) : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// OBSERVATION FORM COMPONENT
// ============================================================================

const createDefaultColumns = (
  defaults?: ProfessionalRecord[]
): ProfessionalRecord[] => {
  if (defaults && defaults.length > 0) {
    return Array.from({ length: 4 }, (_, i) => {
      const match = defaults[i];
      return match
        ? { ...match, id: match.id ?? i + 1, opportunities: [...(match.opportunities || [])] }
        : { id: i + 1, categoryCode: '', categoryName: '', opportunities: [] };
    });
  }
  return [
    { id: 1, categoryCode: '', categoryName: '', opportunities: [] },
    { id: 2, categoryCode: '', categoryName: '', opportunities: [] },
    { id: 3, categoryCode: '', categoryName: '', opportunities: [] },
    { id: 4, categoryCode: '', categoryName: '', opportunities: [] },
  ];
};

const ObservationForm: React.FC<{
  initialData?: SessionDataRecord | null;
  allSessions: SessionDataRecord[];
  onSaveSession: (payload: SaveSessionPayload) => Promise<SaveResult>;
  onSubmitSuccess?: () => void;
  settings?: AppSettings | null;
  defaultCountry?: string;
  defaultProfessionalColumns?: ProfessionalRecord[];
}> = ({
  initialData,
  allSessions,
  onSaveSession,
  onSubmitSuccess,
  settings,
  defaultCountry = 'جمهورية مصر العربية',
  defaultProfessionalColumns,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [formSaved, setFormSaved] = useState(false);

  const [session, setSession] = useState<SessionInfoRecord>({
    facility: '',
    service: '',
    ward: '',
    department: '',
    country: defaultCountry,
    periodNumber: new Date().getMonth() + 1,
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    duration: '',
    sessionNumber: '',
    observer: '',
    pageNumber: '1',
    city: '',
    sessionId: uuidv4(),
  });

  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>(() =>
    createDefaultColumns(defaultProfessionalColumns)
  );

  useEffect(() => {
    if (initialData) {
      setSession({ ...initialData.sessionInfo });
      const lp: ProfessionalRecord[] = [];
      for (let i = 0; i < 4; i++) {
        const found = initialData.professionals.find((p) => p._colNo === i + 1);
        if (found) {
          lp.push({ ...found, id: Math.random() });
        } else {
          lp.push({ id: Math.random(), categoryCode: '', categoryName: '', opportunities: [] });
        }
      }
      initialData.professionals.forEach((p) => {
        if ((p._colNo && p._colNo > 4) || !p._colNo) {
          const emptyIdx = lp.findIndex((empty) => !empty.categoryCode && empty.opportunities.length === 0);
          if (emptyIdx !== -1) {
            lp[emptyIdx] = { ...p, id: Math.random() };
          } else {
            lp.push({ ...p, id: Math.random() });
          }
        }
      });
      setProfessionals(lp.slice(0, Math.max(4, lp.length)));
      setFormSaved(false);
      setMessage(null);
    }
  }, [initialData]);

  useEffect(() => {
    if (session.startTime && session.endTime && !formSaved) {
      const [h1, m1] = session.startTime.split(':').map(Number);
      const [h2, m2] = session.endTime.split(':').map(Number);
      if (!isNaN(h1) && !isNaN(h2)) {
        let diff = h2 * 60 + m2 - (h1 * 60 + m1);
        if (diff < 0) diff += 1440;
        if (session.duration !== diff) {
          setSession((prev) => ({ ...prev, duration: diff }));
        }
      }
    } else if ((!session.startTime || !session.endTime) && session.duration !== '' && !formSaved) {
      setSession((prev) => ({ ...prev, duration: '' }));
    }
  }, [session.startTime, session.endTime, session.duration, formSaved]);

  useEffect(() => {
    if (!formSaved) {
      const currentMonthPrefix = (session.date || '').slice(0, 7);
      if (!currentMonthPrefix) return;

      const monthSessions = allSessions.filter((s) =>
        String(s.sessionInfo?.date || '').startsWith(currentMonthPrefix)
      );

      const tempSessions: { sessionInfo: { sessionId: string; date: string; startTime: string } }[] = [];
      let foundCurrent = false;
      monthSessions.forEach((s) => {
        if (s.sessionInfo?.sessionId === session.sessionId) {
          foundCurrent = true;
          tempSessions.push({
            sessionInfo: {
              sessionId: s.sessionInfo.sessionId,
              date: session.date || '',
              startTime: session.startTime || '',
            },
          });
        } else {
          tempSessions.push({
            sessionInfo: {
              sessionId: s.sessionInfo.sessionId,
              date: s.sessionInfo.date || '',
              startTime: s.sessionInfo.startTime || '',
            },
          });
        }
      });

      if (!foundCurrent) {
        tempSessions.push({
          sessionInfo: {
            sessionId: session.sessionId,
            date: session.date || '',
            startTime: session.startTime || '',
          },
        });
      }

      tempSessions.sort((a, b) => {
        const dA = a.sessionInfo.date || '';
        const dB = b.sessionInfo.date || '';
        if (dA !== dB) return dA.localeCompare(dB);
        const tA = a.sessionInfo.startTime || '99:99';
        const tB = b.sessionInfo.startTime || '99:99';
        if (tA !== tB) return tA.localeCompare(tB);
        return (a.sessionInfo.sessionId || '').localeCompare(b.sessionInfo.sessionId || '');
      });

      const myIndex = tempSessions.findIndex((s) => s.sessionInfo.sessionId === session.sessionId);
      if (myIndex !== -1) {
        const calcNo = String(myIndex + 1);
        if (String(session.sessionNumber || '') !== calcNo) {
          setSession((prev) => ({ ...prev, sessionNumber: calcNo }));
        }
      }
    }
  }, [session.date, session.startTime, allSessions, formSaved, session.sessionId, session.sessionNumber]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newDate = e.target.value;
    let newPeriod = session.periodNumber;
    if (newDate) {
      const d = new Date(newDate);
      if (!isNaN(d.getTime())) {
        newPeriod = d.getMonth() + 1;
      }
    }
    setSession((prev) => ({ ...prev, date: newDate, periodNumber: newPeriod }));
  };

  const handleReset = (type: 'next_page' | 'new_session') => {
    const isNextPage = type === 'next_page';
    setSession((prev) => ({
      facility: prev.facility,
      service: prev.service,
      ward: prev.ward,
      department: prev.department,
      country: prev.country,
      periodNumber: prev.periodNumber,
      date: prev.date,
      observer: prev.observer,
      city: prev.city,
      sessionNumber: isNextPage ? prev.sessionNumber : '',
      pageNumber: isNextPage
        ? prev.pageNumber && !isNaN(Number(prev.pageNumber))
          ? String(parseInt(String(prev.pageNumber), 10) + 1)
          : '2'
        : '1',
      startTime: isNextPage ? prev.startTime : '',
      endTime: isNextPage ? prev.endTime : '',
      duration: isNextPage ? prev.duration : '',
      sessionId: uuidv4(),
    }));
    setProfessionals(createDefaultColumns(defaultProfessionalColumns));
    setFormSaved(false);
    setMessage(null);
    if (onSubmitSuccess) onSubmitSuccess();
  };

  const handleSubmit = async () => {
    if (!session.facility || !session.observer) {
      setMessage({ type: 'error', text: 'Facility & Observer required' });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    const finalSession = { ...session };
    const cleanedPros: ProfessionalRecord[] = professionals
      .map((p, index) => ({
        ...p,
        _colNo: index + 1,
        _originalIndex: index,
        opportunities: p.opportunities.filter(
          (o) => (o.indications && o.indications.length > 0) || o.action
        ),
      }))
      .filter((p) => p.categoryCode || p.opportunities.length > 0);

    try {
      const res = await onSaveSession({ ...finalSession, professionals: cleanedPros });
      setIsSubmitting(false);
      if (res && res.error) {
        setMessage({ type: 'error', text: 'خطأ: ' + res.error });
      } else if (res && res.success) {
        setMessage({ type: 'success', text: 'Form Saved Successfully!' });
        setSession(finalSession);
        setFormSaved(true);
      } else {
        setMessage({ type: 'error', text: 'Unknown error occurred' });
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setMessage({ type: 'error', text: err?.message || String(err) });
    }
  };

  const isReadOnly = formSaved || isSubmitting;

  return (
    <div className="bg-white mx-auto max-w-[1000px] paper-container shadow-xl min-h-screen print:min-h-0 mb-8 print:shadow-none print:m-0 print:w-full transition-all duration-300 print-centered-page print-last-page">
      <WHOHeader small={true} settings={settings} />
      <div className="p-4 md:p-6 print:p-0">
        <div className="flex justify-between items-end border-b-2 border-gray-200 pb-1 mb-4 print:mb-2">
          <h1 className="text-xl md:text-2xl font-bold text-gray-500 print:mb-1">Observation Form</h1>
          <div className="flex items-center gap-3">
            {formSaved && (
              <div className="text-green-600 font-bold text-sm bg-green-50 px-2 py-1 rounded border border-green-200 no-print flex items-center gap-1">
                <span className="text-lg">✓</span> Saved
              </div>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="no-print text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors"
            >
              <Icons.Download /> <span className="hidden md:inline">Save PDF</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-x-8 gap-y-0 mb-6 print:mb-2 text-sm print:gap-y-1 print:gap-x-6">
          <div>
            <FormInputRow
              label="Facility:"
              value={session.facility}
              onChange={(e) => setSession({ ...session, facility: e.target.value })}
              readOnly={isReadOnly}
              options={settings?.facilities}
            />
            <FormInputRow
              label="Service:"
              value={session.service}
              onChange={(e) => setSession({ ...session, service: e.target.value })}
              readOnly={isReadOnly}
              options={settings?.services}
            />
            <FormInputRow
              label="Ward:"
              value={session.ward}
              onChange={(e) => setSession({ ...session, ward: e.target.value })}
              readOnly={isReadOnly}
              options={settings?.wards}
            />
            <FormInputRow
              label="Department:"
              value={session.department}
              onChange={(e) => setSession({ ...session, department: e.target.value })}
              readOnly={isReadOnly}
              options={settings?.departments}
            />
            <FormInputRow
              label="Country**:"
              value={session.country}
              onChange={(e) => setSession({ ...session, country: e.target.value })}
              readOnly={isReadOnly}
            />
          </div>
          <div>
            <FormInputRow
              label="Period Number*:"
              value={session.periodNumber}
              onChange={(e) => setSession({ ...session, periodNumber: e.target.value })}
              readOnly={isReadOnly}
            />
            <FormInputRow
              label="Date (dd/mm/yy):"
              type="date"
              value={session.date}
              onChange={handleDateChange}
              readOnly={isReadOnly}
            />
            <div className="flex flex-col md:flex-row md:items-center mb-3 md:mb-1 print:mb-1 print:flex-row print:items-center">
              <label className="text-xs font-bold text-gray-700 mb-1 md:mb-0 md:w-32 flex-shrink-0 print:w-36 print:text-[12px] print:mb-0">
                Time:
              </label>
              {isReadOnly ? (
                <div className="form-input-print-text w-full">
                  <span className="mr-1">{session.startTime}</span>
                  <span className="text-gray-400 mx-1">-</span>
                  <span>{session.endTime}</span>
                </div>
              ) : (
                <div className="flex items-center w-full">
                  <input
                    type="time"
                    className="form-input-bg h-9 md:h-7 text-sm w-full md:w-20 mr-2 print:hidden"
                    value={session.startTime}
                    onChange={(e) => setSession({ ...session, startTime: e.target.value })}
                  />
                  <span className="mr-2 text-gray-400 hidden md:inline print:hidden">/</span>
                  <input
                    type="time"
                    className="form-input-bg h-9 md:h-7 text-sm w-full md:w-20 print:hidden"
                    value={session.endTime}
                    onChange={(e) => setSession({ ...session, endTime: e.target.value })}
                  />
                  <div className="hidden print:block form-input-print-text w-full">
                    <span className="mr-1">{session.startTime}</span>
                    <span className="text-gray-400 mx-1">-</span>
                    <span>{session.endTime}</span>
                  </div>
                </div>
              )}
            </div>
            <FormInputRow label="Session duration (mm):" type="number" value={session.duration} readOnly={true} />
          </div>
          <div>
            <FormInputRow label="Session Number*:" value={session.sessionNumber} readOnly={true} />
            <FormInputRow
              label="Observer (initials):"
              value={session.observer}
              onChange={(e) => setSession({ ...session, observer: e.target.value })}
              readOnly={isReadOnly}
              options={settings?.observers}
            />
            <FormInputRow
              label="Page N°:"
              value={session.pageNumber}
              onChange={(e) => setSession({ ...session, pageNumber: e.target.value })}
              readOnly={isReadOnly}
            />
            <FormInputRow
              label="City**:"
              value={session.city}
              onChange={(e) => setSession({ ...session, city: e.target.value })}
              readOnly={isReadOnly}
              options={settings?.cities}
            />
          </div>
        </div>

        <div className="border-2 border-gray-800 rounded-lg md:rounded-none overflow-hidden relative print:border-none prof-main-container">
          <div className="flex flex-col md:flex-row print:flex-row w-full prof-cols-row">
            {professionals.map((prof, idx) => (
              <div
                key={prof.id ?? idx}
                className="w-full md:w-1/4 print:w-1/4 shrink-0 border-b-4 border-gray-800 md:border-b-0 md:border-r-2 last:border-b-0 md:last:border-r-0 print:border-r-2 print:border-b-0 print:last:border-r-0 prof-col-wrapper"
              >
                <ProfessionalColumn
                  prof={prof}
                  pIndex={idx}
                  readOnly={isReadOnly}
                  onUpdate={(u) => {
                    const n = [...professionals];
                    n[idx] = u;
                    setProfessionals(n);
                  }}
                  profCategories={getProfCategories(settings)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="hidden print:flex print-footer">
          <div className="mb-0.5">
            {settings?.header1 || 'مستشفى المنيا الجامعى للعيون'} -{' '}
            {settings?.header2 || 'وحدة مكافحة العدوي'}
          </div>
          <div className="flex justify-between items-center w-full px-4 font-normal text-[7pt] italic text-slate-500">
            <span>Based on WHO's Hand Hygiene Compliance Observation Form</span>
            <span>Record ID: {session.sessionId ? session.sessionId.slice(0, 8) : ''}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row justify-between items-center no-print bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div className="text-[11px] text-gray-500 leading-tight hidden md:block">
            ** Optional data fields.
          </div>
          <div className="flex flex-col md:flex-row gap-3 items-center w-full md:w-auto justify-end">
            {message && (
              <span
                className={`font-bold text-sm font-['Cairo'] ${
                  message.type === 'error' ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {message.text}
              </span>
            )}

            {!formSaved ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full md:w-auto bg-[#F26522] hover:bg-[#d9531e] text-white px-8 py-3 md:py-2 rounded-lg font-bold shadow-md hover:shadow-lg flex items-center justify-center text-base md:text-sm disabled:opacity-50 transition-all transform active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Icons.Spinner /> Saving...
                  </>
                ) : initialData ? (
                  'Update Form'
                ) : (
                  'Save Form'
                )}
              </button>
            ) : (
              <>
                {initialData ? (
                  <button
                    type="button"
                    onClick={() => onSubmitSuccess && onSubmitSuccess()}
                    className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 md:py-2 rounded-lg font-bold shadow-sm flex items-center justify-center text-sm transition-colors active:scale-95"
                  >
                    Back to Records
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReset('next_page')}
                      className="w-full md:w-auto bg-[#F26522] hover:bg-[#d9531e] text-white px-6 py-3 md:py-2 rounded-lg font-bold shadow-sm flex items-center justify-center text-sm transition-colors active:scale-95"
                    >
                      Next Page (Same Session)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReset('new_session')}
                      className="w-full md:w-auto bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-6 py-3 md:py-2 rounded-lg font-bold shadow-sm flex items-center justify-center text-sm transition-colors active:scale-95"
                    >
                      New Session
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DASHBOARD & MODALS
// ============================================================================

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  colorClass: string;
}> = ({ title, value, subtext, icon, colorClass }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
      {subtext && <p className="text-slate-400 text-xs mt-1">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-full ${colorClass} bg-opacity-10 text-opacity-100`}>{icon}</div>
  </div>
);

const Dashboard: React.FC<{
  sessions: SessionDataRecord[];
  loading: boolean;
  settings?: AppSettings | null;
}> = ({ sessions, loading, settings }) => {
  const data = useMemo(() => sessionsToRawRows(sessions), [sessions]);
  const [filterMonth, setFilterMonth] = useState(() => {
    if (sessions.length > 0 && sessions[0].sessionInfo?.date) {
      return String(sessions[0].sessionInfo.date).slice(0, 7);
    }
    return new Date().toISOString().slice(0, 7);
  });

  useEffect(() => {
    if (sessions.length > 0) {
      const hasCurrentMonth = sessions.some((s) =>
        String(s.sessionInfo?.date || '').startsWith(filterMonth)
      );
      if (!hasCurrentMonth && sessions[0].sessionInfo?.date) {
        setFilterMonth(String(sessions[0].sessionInfo.date).slice(0, 7));
      }
    }
  }, [sessions, filterMonth]);

  if (!BarChart || !XAxis || !YAxis) {
    return (
      <div className="p-10 text-center text-red-500 border border-red-200 bg-red-50 rounded-lg m-4">
        Charts library failed to load. Please check your internet connection or try again.
      </div>
    );
  }

  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const monthData = data.filter((r) => String(r['Session Date'] || '').startsWith(filterMonth));
    const selectedYear = filterMonth ? filterMonth.split('-')[0] : String(new Date().getFullYear());
    const yearData = data.filter((r) => String(r['Session Date'] || '').startsWith(String(selectedYear)));

    let totalOpp = 0;
    let totalAct = 0;
    const sessionIds = new Set<string>();

    const profCategories = getProfCategories(settings);
    const byProf: Record<string, { name: string; opp: number; act: number }> = {};
    profCategories.forEach((p) => {
      byProf[p.code] = { name: p.name, opp: 0, act: 0 };
    });

    const byInd: Record<string, { opp: number; act: number }> = {};
    INDICATIONS.forEach((i) => {
      byInd[i.fullLabel] = { opp: 0, act: 0 };
    });

    monthData.forEach((row) => {
      sessionIds.add(String(row['Session ID']));
      const action = row['Action (HR/HW/Missed)'];
      const isCompliance = action === 'HW' || action === 'HR';

      const profCode = String(row['Prof. Code'] || '');
      if (byProf[profCode]) {
        byProf[profCode].opp++;
        if (isCompliance) byProf[profCode].act++;
      }

      totalOpp++;
      if (isCompliance) totalAct++;

      INDICATIONS.forEach((ind) => {
        if (row[ind.dbCol] === 'Yes') {
          if (!byInd[ind.fullLabel]) byInd[ind.fullLabel] = { opp: 0, act: 0 };
          byInd[ind.fullLabel].opp++;
          if (isCompliance) byInd[ind.fullLabel].act++;
        }
      });
    });

    const monthlyDataMap: Record<string, { name: string; opp: number; act: number }> = {};
    let annualOpp = 0;
    let annualAct = 0;

    yearData.forEach((row) => {
      const action = row['Action (HR/HW/Missed)'];
      const isCompliance = action === 'HW' || action === 'HR';
      annualOpp++;
      if (isCompliance) annualAct++;

      const dateStr = row['Session Date'];
      if (dateStr) {
        const sortKey = String(dateStr).slice(0, 7);
        const d = new Date(String(dateStr));
        const displayLabel = d.toLocaleString('default', { month: 'short' });
        if (!monthlyDataMap[sortKey]) monthlyDataMap[sortKey] = { name: displayLabel, opp: 0, act: 0 };
        monthlyDataMap[sortKey].opp++;
        if (isCompliance) monthlyDataMap[sortKey].act++;
      }
    });

    const annualAverage = annualOpp > 0 ? Number(((annualAct / annualOpp) * 100).toFixed(2)) : 0;

    const profData = Object.keys(byProf).map((code) => ({
      name: byProf[code].name,
      compliance: byProf[code].opp > 0 ? Number(((byProf[code].act / byProf[code].opp) * 100).toFixed(2)) : 0,
    }));

    const indData = Object.keys(byInd).map((k) => ({
      name: k,
      compliance: byInd[k].opp > 0 ? Number(((byInd[k].act / byInd[k].opp) * 100).toFixed(2)) : 0,
    }));

    const monthlyTrend = Object.keys(monthlyDataMap)
      .sort()
      .map((k) => ({
        name: monthlyDataMap[k].name,
        compliance:
          monthlyDataMap[k].opp > 0
            ? Number(((monthlyDataMap[k].act / monthlyDataMap[k].opp) * 100).toFixed(2))
            : 0,
      }));

    return {
      overall: totalOpp > 0 ? Number(((totalAct / totalOpp) * 100).toFixed(2)) : 0,
      totalOpp,
      totalSessions: sessionIds.size,
      profData,
      indData,
      monthlyTrend,
      year: selectedYear,
      annualAverage,
    };
  }, [data, filterMonth, settings]);

  if (loading) {
    return (
      <div className="p-20 text-center">
        <Icons.Spinner />
        <span className="text-gray-500 font-medium">Loading Dashboard...</span>
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="p-10 text-center text-gray-500">
        No data available. Please record some observations first.
      </div>
    );
  }

  const readableDate = filterMonth
    ? new Date(filterMonth + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })
    : 'All Time';
  const monthSessionsForExport = sessions.filter((s) =>
    String(s.sessionInfo.date || '').startsWith(filterMonth)
  );
  const yearSessionsForExport = sessions.filter((s) =>
    String(s.sessionInfo.date || '').startsWith(String(stats.year))
  );

  const handleExportDashboardMonthExcel = () => {
    const target = monthSessionsForExport.length > 0 ? monthSessionsForExport : yearSessionsForExport;
    exportReportsToExcel({
      sessions: target,
      settings,
      annualSessions: yearSessionsForExport,
      annualYear: stats.year,
      fileNamePrefix:
        monthSessionsForExport.length > 0
          ? 'Dashboard_Monthly_Report'
          : `Dashboard_Annual_${stats.year}`,
    });
  };

  const handleExportDashboardYearExcel = () => {
    exportReportsToExcel({
      sessions: yearSessionsForExport,
      settings,
      annualSessions: yearSessionsForExport,
      annualYear: stats.year,
      periodLabel: `التقرير السنوي الشامل لعام ${stats.year}`,
      fileNamePrefix: `Annual_Hand_Hygiene_Report_${stats.year}`,
    });
  };

  return (
    <div className="max-w-full mx-auto mt-4 print:mt-0 space-y-6 print:space-y-4 dashboard-print-container">
      <div className="flex flex-col md:flex-row justify-between items-center no-print gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
          <input
            type="month"
            className="border border-slate-300 p-2 rounded-md text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end font-['Cairo']">
          <button
            type="button"
            onClick={handleExportDashboardMonthExcel}
            disabled={monthSessionsForExport.length === 0 && yearSessionsForExport.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm justify-center"
            title="تنزيل تقرير الشهر المحدد في شيت إكسيل شامل"
          >
            <Icons.Excel />
            <span>تنزيل تقرير الشهر (Excel)</span>
          </button>
          <button
            type="button"
            onClick={handleExportDashboardYearExcel}
            disabled={yearSessionsForExport.length === 0}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 disabled:opacity-50 px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm justify-center"
            title="تنزيل التقرير السنوي المجمع في شيت إكسيل"
          >
            <Icons.Excel />
            <span>التقرير السنوي {stats.year} (Excel)</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-slate-800 text-white px-4 py-2 rounded-md text-xs font-bold flex items-center hover:bg-slate-900 transition-colors shadow-sm justify-center font-sans"
          >
            <span className="mr-1.5">
              <Icons.Download />
            </span>{' '}
            Save as PDF
          </button>
        </div>
      </div>

      <div className="hidden print:block w-full mb-6">
        <div className="flex justify-between items-center border-b-4 border-[#F26522] pb-4 mb-4">
          <div className="flex flex-col text-left">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase">
              Compliance
              <br />
              <span className="text-[#F26522]">Dashboard</span>
            </h1>
            <p className="text-sm text-slate-500 font-bold mt-2 uppercase tracking-widest">
              Hand Hygiene Monitoring
            </p>
          </div>
          <div className="text-right">
            <div className="font-['Cairo'] text-xl font-bold text-slate-800 leading-tight">
              {settings?.header1 || 'مستشفى المنيا الجامعى للعيون'}
            </div>
            <div className="font-['Cairo'] text-base text-slate-600 font-medium">
              {settings?.header2 || 'وحدة مكافحة العدوي'}
            </div>
            <div className="mt-3 text-xs bg-slate-100 inline-block px-2 py-1 rounded border border-slate-200">
              Report Date: <span className="font-mono font-bold">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center bg-orange-50 border border-orange-100 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="bg-[#F26522] text-white p-1 rounded">
              <Icons.Activity />
            </div>
            <span className="text-sm font-bold text-slate-700 uppercase">Period Analysis</span>
          </div>
          <div className="text-xl font-black text-slate-800">{readableDate}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 w-full">
        <StatCard
          title="Overall Compliance"
          value={`${stats.overall.toFixed(2)}%`}
          icon={<Icons.Activity />}
          colorClass="bg-blue-500 text-blue-600"
        />
        <StatCard
          title="Total Observations"
          value={stats.totalOpp}
          subtext="Opportunities recorded"
          icon={<Icons.Clipboard />}
          colorClass="bg-orange-500 text-orange-600"
        />
        <StatCard
          title="Sessions"
          value={stats.totalSessions}
          subtext="Unique sessions"
          icon={<Icons.Users />}
          colorClass="bg-emerald-500 text-emerald-600"
        />
        <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white p-6 rounded-lg shadow-md flex flex-col justify-center print:shadow-none print:border print:border-slate-200 print:text-black print:bg-none">
          <h4 className="font-bold text-white/90 uppercase text-xs tracking-wider print:text-slate-500">Status</h4>
          <div className="text-2xl font-bold mt-1">
            {stats.overall >= 80 ? 'Excellent' : stats.overall >= 60 ? 'Good' : 'Needs Action'}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-80 print:h-[220px] print:border-none print:shadow-none w-full">
        <h3 className="text-sm font-bold text-slate-500 uppercase mb-6 tracking-wide border-b pb-2 flex justify-between items-center">
          <span>Annual Compliance Trend ({stats.year})</span>
          <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs normal-case">
            Avg: {stats.annualAverage.toFixed(2)}%
          </span>
        </h3>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={stats.monthlyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'Compliance %']}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="compliance"
              stroke="#F26522"
              strokeWidth={3}
              name="Compliance %"
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            >
              <LabelList
                dataKey="compliance"
                position="top"
                offset={10}
                formatter={(v: any) => `${Number(v).toFixed(2)}%`}
                style={{ fontSize: '11px', fontWeight: 'bold', fill: '#c2410c' }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 w-full">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-96 print:h-[220px] print:border-none print:shadow-none">
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-6 tracking-wide border-b pb-2">
            Compliance by Profession
          </h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={stats.profData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'Compliance %']}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="compliance" fill="#F26522" name="Compliance %" radius={[0, 4, 4, 0]} barSize={24}>
                <LabelList
                  dataKey="compliance"
                  position="right"
                  formatter={(v: any) => `${Number(v).toFixed(2)}%`}
                  style={{ fontSize: '11px', fontWeight: 'bold', fill: '#64748b' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-96 print:h-[220px] print:border-none print:shadow-none">
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-6 tracking-wide border-b pb-2">
            Compliance by Indication
          </h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={stats.indData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'Compliance %']}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="compliance" fill="#0093d5" name="Compliance %" radius={[0, 4, 4, 0]} barSize={24}>
                <LabelList
                  dataKey="compliance"
                  position="right"
                  formatter={(v: any) => `${Number(v).toFixed(2)}%`}
                  style={{ fontSize: '11px', fontWeight: 'bold', fill: '#64748b' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="hidden print:flex flex-col items-center justify-center print-footer mt-10 print:mt-0">
        <div className="mb-0.5">
          {settings?.header1 || 'مستشفى المنيا الجامعى للعيون'} -{' '}
          {settings?.header2 || 'وحدة مكافحة العدوي'}
        </div>
        <div className="text-[7pt] font-medium italic text-slate-500">
          Based on WHO's Hand Hygiene Compliance Observation Form
        </div>
      </div>
    </div>
  );
};

const HeaderLogoModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  settings?: AppSettings | null;
  onSave: (payload: { logoRight: string; logoLeft: string }) => void;
  isSaving: boolean;
}> = ({ isOpen, onClose, settings, onSave, isSaving }) => {
  const [logoRight, setLogoRight] = useState(settings?.logoRight || '');
  const [logoLeft, setLogoLeft] = useState(settings?.logoLeft || '');

  useEffect(() => {
    if (isOpen) {
      setLogoRight(settings?.logoRight || '');
      setLogoLeft(settings?.logoLeft || '');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fade-in font-['Cairo']"
      dir="rtl"
      onClick={() => !isSaving && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🖼️</span>
            <h3 className="text-lg font-bold text-slate-800">شعارات الترويسة لملفات الطباعة</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          ضع رابط Google Drive للصورة المراد وضعها جهة اليمين وجهة اليسار. يتم ضبط حجم الشعارين تلقائياً ليلائم الترويسة، مع الحفاظ الكامل على نصوص الترويسة في المنتصف دون تغيير.
        </p>

        <div className="space-y-4 mb-4">
          <div className="bg-orange-50/60 p-3.5 rounded-xl border border-orange-200">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-800">شعار جهة اليمين (رابط Google Drive):</label>
              {logoRight && (
                <button
                  type="button"
                  onClick={() => setLogoRight('')}
                  className="text-[11px] text-red-500 hover:text-red-700"
                >
                  مسح ✕
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="https://drive.google.com/file/d/.../view"
              className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none"
              value={logoRight}
              onChange={(e) => setLogoRight(e.target.value)}
              dir="ltr"
            />
            <div className="mt-2 flex items-center gap-2">
              <div className="w-14 h-10 bg-white border border-dashed border-slate-300 rounded flex items-center justify-center overflow-hidden shrink-0">
                {logoRight ? (
                  <img
                    src={formatGoogleDriveUrl(logoRight)}
                    alt="معاينة اليمين"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-[10px] text-slate-400">فارغ</span>
                )}
              </div>
              <span className="text-[11px] text-slate-500">معاينة شعار جهة اليمين</span>
            </div>
          </div>

          <div className="bg-orange-50/60 p-3.5 rounded-xl border border-orange-200">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-800">شعار جهة اليسار (رابط Google Drive):</label>
              {logoLeft && (
                <button
                  type="button"
                  onClick={() => setLogoLeft('')}
                  className="text-[11px] text-red-500 hover:text-red-700"
                >
                  مسح ✕
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="https://drive.google.com/file/d/.../view"
              className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none"
              value={logoLeft}
              onChange={(e) => setLogoLeft(e.target.value)}
              dir="ltr"
            />
            <div className="mt-2 flex items-center gap-2">
              <div className="w-14 h-10 bg-white border border-dashed border-slate-300 rounded flex items-center justify-center overflow-hidden shrink-0">
                {logoLeft ? (
                  <img
                    src={formatGoogleDriveUrl(logoLeft)}
                    alt="معاينة اليسار"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-[10px] text-slate-400">فارغ</span>
                )}
              </div>
              <span className="text-[11px] text-slate-500">معاينة شعار جهة اليسار</span>
            </div>
          </div>

          <div className="bg-amber-100/70 text-amber-900 border border-amber-300 rounded-lg p-2.5 text-xs flex items-start gap-2">
            <span className="text-sm">💡</span>
            <span>
              تأكد أن إذن مشاركة الصورة في Google Drive هو{' '}
              <strong>"أي شخص لديه الرابط يمكنه العرض" (Anyone with the link)</strong> لكي تظهر الصورة وتُطبع بشكل صحيح.
            </span>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-700 mb-1">معاينة حية لشكل الترويسة:</div>
            <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
              <WHOHeader small={true} settings={{ ...(settings || {}), logoRight, logoLeft }} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-bold text-xs"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onSave({ logoRight, logoLeft })}
            disabled={isSaving}
            className={`px-5 py-2 rounded-lg text-white font-bold text-xs shadow-md ${
              isSaving ? 'bg-orange-400 cursor-not-allowed' : 'bg-[#F26522] hover:bg-[#d9531e]'
            }`}
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ وتطبيق على الطباعة ✓'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const TursoImportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  onNavigateToRecords?: () => void;
  onTestConnection: (creds: { tursoUrl: string; tursoAuthToken: string }) => Promise<TursoTestResult>;
  onImportData: (payload: TursoImportPayload) => Promise<TursoImportResult>;
}> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onNavigateToRecords,
  onTestConnection,
  onImportData,
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

  const handleTestConnection = async (e?: React.FormEvent) => {
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

    try {
      const res = await onTestConnection({
        tursoUrl: cleanUrl,
        tursoAuthToken: tursoAuthToken.trim(),
      });
      setIsTesting(false);
      if (res && res.success) {
        setTestResult(res);
      } else {
        setTestError(res?.error || 'فشل الاتصال بقاعدة البيانات. يرجى التحقق من الرابط والرمز.');
      }
    } catch (err: any) {
      setIsTesting(false);
      setTestError(typeof err === 'string' ? err : err?.message || 'حدث خطأ في الاتصال بالخادم');
    }
  };

  const handleExecuteImport = async () => {
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

    try {
      const res = await onImportData({
        tursoUrl: cleanUrl,
        tursoAuthToken: tursoAuthToken.trim(),
        importMode,
        importSettings,
      });
      setIsImporting(false);
      if (res && res.success) {
        setImportResult(res);
        onImportSuccess();
      } else {
        setImportError(res?.error || 'حدث خطأ أثناء استيراد البيانات.');
      }
    } catch (err: any) {
      setIsImporting(false);
      setImportError(typeof err === 'string' ? err : err?.message || 'فشلت عملية النقل');
    }
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
            type="button"
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

        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {importResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-900 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-base text-emerald-800">تم استيراد سجلات المركز بنجاح!</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">{importResult.message}</p>
                </div>
              </div>

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
                  <span>
                    تم دمج {importResult.mergedSettingsCount} عنصر جديد (مرافق وأقسام وملاحظين) في قوائم الإعدادات.
                  </span>
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
                  onClick={resetAll}
                  className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                >
                  استيراد من قاعدة أخرى
                </button>
              </div>
            </div>
          )}

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
                    مثال: <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">libsql://my-previous-db.turso.io</code> أو من ملف{' '}
                    <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">.env</code> السابق.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رمز المصادقة (Auth Token):</label>
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

                <div>
                  <button
                    type="button"
                    onClick={() => handleTestConnection()}
                    disabled={isTesting || isImporting || !tursoUrl.trim()}
                    className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    {isTesting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>جاري فحص الاتصال وقراءة السجلات...</span>
                      </>
                    ) : (
                      <span>🔍 فحص الاتصال ومعاينة السجلات</span>
                    )}
                  </button>
                </div>
              </div>

              {testError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3.5 text-xs font-bold flex items-start gap-2.5">
                  <span className="text-base text-red-500">✕</span>
                  <div className="flex-1">
                    <div>{testError}</div>
                    <div className="text-[11px] font-normal text-red-600 mt-1">
                      تأكد من صحة رابط Turso ورمز Auth Token، وأن جدول Observations موجود في قاعدة البيانات السابقة.
                    </div>
                  </div>
                </div>
              )}

              {testResult && testResult.success && (
                <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4.5 space-y-4">
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

                  <div className="text-xs space-y-1.5 bg-white/70 p-3 rounded-xl border border-purple-100 text-slate-700">
                    {testResult.minDate && testResult.maxDate && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">📅 نطاق التواريخ:</span>
                        <span className="font-mono text-purple-900">
                          من {testResult.minDate} إلى {testResult.maxDate}
                        </span>
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

                  {importError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs font-bold">
                      {importError}
                    </div>
                  )}

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
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>جاري جلب السجلات ونقلها إلى القاعدة الحالية...</span>
                        </>
                      ) : (
                        <span>
                          🚀 بدء استيراد{' '}
                          {importMode === 'merge_skip_existing'
                            ? testResult.newSessions
                            : testResult.totalSessions}{' '}
                          جلسة إلى القاعدة الحالية
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

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

// ============================================================================
// DATA MANAGER (RECORDS, REPORTS, BULK PRINT, COPY, EDIT, DELETE)
// ============================================================================

interface MonthGroup {
  monthKey: string;
  sessions: SessionDataRecord[];
  totalOpp: number;
  totalAct: number;
}

const DataManager: React.FC<{
  sessions: SessionDataRecord[];
  loading: boolean;
  onRefresh: () => void;
  onEdit: (session: SessionDataRecord) => void;
  settings?: AppSettings | null;
  canCopy?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canAccessSettings?: boolean;
  onSaveSession: (payload: SaveSessionPayload) => Promise<SaveResult>;
  onDeleteSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteMonths: (monthKeys: string[]) => Promise<{ success: boolean; error?: string }>;
  onUpdateSessionDate: (payload: UpdateSessionDatePayload) => Promise<UpdateSessionDateResult>;
  onUpdateSessionDepartment: (
    payload: UpdateSessionDepartmentPayload
  ) => Promise<{ success: boolean; error?: string }>;
  onSaveSettings: (settings: AppSettings) => Promise<SaveSettingsResult>;
  onTestTursoConnection: (creds: { tursoUrl: string; tursoAuthToken: string }) => Promise<TursoTestResult>;
  onImportTursoData: (payload: TursoImportPayload) => Promise<TursoImportResult>;
  onRefreshSettings?: () => void;
}> = ({
  sessions,
  loading,
  onRefresh,
  onEdit,
  settings,
  canCopy = true,
  canEdit = true,
  canDelete = true,
  canAccessSettings = true,
  onSaveSession,
  onDeleteSession,
  onDeleteMonths,
  onUpdateSessionDate,
  onUpdateSessionDepartment,
  onSaveSettings,
  onTestTursoConnection,
  onImportTursoData,
  onRefreshSettings,
}) => {
  const isAdmin = canAccessSettings;
  const [viewMode, setViewMode] = useState<'list' | 'folder'>('list');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedMonthsForPrint, setSelectedMonthsForPrint] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState(false);
  const [viewingSession, setViewingSession] = useState<SessionDataRecord | null>(null);

  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showTursoImportModal, setShowTursoImportModal] = useState(false);
  const [savingLogoModal, setSavingLogoModal] = useState(false);

  const [copyingMonthGroup, setCopyingMonthGroup] = useState<MonthGroup | null>(null);
  const [copyTargetMonth, setCopyTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [copyProgress, setCopyProgress] = useState<{
    current: number;
    total: number;
    status: 'copying' | 'success' | 'error';
  } | null>(null);
  const [copyErrorMessage, setCopyErrorMessage] = useState<string | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteMonthsConfirm, setDeleteMonthsConfirm] = useState<string[] | null>(null);
  const [deletingMonthLoading, setDeletingMonthLoading] = useState(false);

  const [editingDateSession, setEditingDateSession] = useState<SessionDataRecord | null>(null);
  const [modalDateValue, setModalDateValue] = useState('');
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineDateValue, setInlineDateValue] = useState('');
  const [savingDateSessionId, setSavingDateSessionId] = useState<string | null>(null);
  const [dateToast, setDateToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formFilterQuery, setFormFilterQuery] = useState('');

  const [copyingSession, setCopyingSession] = useState<SessionDataRecord | null>(null);
  const [copySessionDate, setCopySessionDate] = useState('');
  const [copyingSessionLoading, setCopyingSessionLoading] = useState(false);

  const [inlineEditingDeptId, setInlineEditingDeptId] = useState<string | null>(null);
  const [inlineDeptValue, setInlineDeptValue] = useState('');
  const [savingDeptSessionId, setSavingDeptSessionId] = useState<string | null>(null);

  const groupedMonths = useMemo<MonthGroup[]>(() => {
    const groups: Record<string, MonthGroup> = {};
    sessions.forEach((session) => {
      const date = session.sessionInfo.date;
      if (!date) return;
      const monthKey = date.slice(0, 7);
      if (!groups[monthKey]) {
        groups[monthKey] = { monthKey, sessions: [], totalOpp: 0, totalAct: 0 };
      }
      groups[monthKey].sessions.push(session);
      session.professionals.forEach((p) => {
        p.opportunities.forEach((o) => {
          if (o.indications.length > 0 || o.action) {
            groups[monthKey].totalOpp++;
            if (o.action === 'HW' || o.action === 'HR') {
              groups[monthKey].totalAct++;
            }
          }
        });
      });
    });

    Object.values(groups).forEach((g) => {
      g.sessions.sort((a, b) => {
        const dA = a.sessionInfo.date || '';
        const dB = b.sessionInfo.date || '';
        if (dA !== dB) return dA.localeCompare(dB);
        const tA = a.sessionInfo.startTime || '99:99';
        const tB = b.sessionInfo.startTime || '99:99';
        if (tA !== tB) return tA.localeCompare(tB);
        return (a.sessionInfo.sessionId || '').localeCompare(b.sessionInfo.sessionId || '');
      });
      g.sessions.forEach((s, idx) => {
        s.sessionInfo.sessionNumber = String(idx + 1);
      });
    });

    return Object.values(groups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [sessions]);

  const openLogoModal = () => {
    if (!isAdmin) return;
    setShowLogoModal(true);
  };

  const handleSaveLogoModal = async (logoPayload: { logoRight: string; logoLeft: string }) => {
    if (!isAdmin) return;
    setSavingLogoModal(true);
    const updated: AppSettings = {
      ...(settings || {}),
      logoRight: String(logoPayload.logoRight || '').trim(),
      logoLeft: String(logoPayload.logoLeft || '').trim(),
    };
    try {
      await onSaveSettings(updated);
      setSavingLogoModal(false);
      setShowLogoModal(false);
    } catch (err: any) {
      setSavingLogoModal(false);
      setDateToast({ message: 'حدث خطأ أثناء حفظ الشعارات: ' + (err?.message || String(err)), type: 'error' });
    }
  };

  const toggleMonthSelection = (monthKey: string) => {
    setSelectedMonthsForPrint((prev) =>
      prev.includes(monthKey) ? prev.filter((m) => m !== monthKey) : [...prev, monthKey]
    );
  };

  const selectAllMonths = () => setSelectedMonthsForPrint(groupedMonths.map((g) => g.monthKey));
  const deselectAllMonths = () => setSelectedMonthsForPrint([]);

  const handlePrintMonths = (monthKeys: string[] | string) => {
    const keysToPrint = Array.isArray(monthKeys)
      ? monthKeys
      : typeof monthKeys === 'string'
      ? [monthKeys]
      : selectedMonthsForPrint;
    if (keysToPrint.length === 0) return;
    setSelectedMonthsForPrint(keysToPrint);
    setPrintMode(true);
    setTimeout(() => {
      window.print();
    }, 800);
  };

  const handleExportExcelMonths = (monthKeys: 'all' | string[] | string) => {
    let keysToExport: string[] = [];
    if (monthKeys === 'all') {
      keysToExport = groupedMonths.map((g) => g.monthKey);
    } else if (Array.isArray(monthKeys)) {
      keysToExport = monthKeys;
    } else if (typeof monthKeys === 'string') {
      keysToExport = [monthKeys];
    } else {
      keysToExport = selectedMonthsForPrint;
    }
    if (keysToExport.length === 0) return;

    const targetSessions: SessionDataRecord[] = [];
    keysToExport.forEach((mKey) => {
      const group = groupedMonths.find((g) => g.monthKey === mKey);
      if (group && group.sessions) targetSessions.push(...group.sessions);
    });
    if (targetSessions.length === 0) return;

    exportReportsToExcel({
      sessions: targetSessions,
      settings,
      fileNamePrefix:
        keysToExport.length === 1 ? 'Monthly_Hand_Hygiene_Report' : 'MultiMonth_Hand_Hygiene_Report',
    });
  };

  const handleConfirmCopy = async () => {
    if (!copyingMonthGroup || !copyTargetMonth) return;
    const [targetYear, targetMonth] = copyTargetMonth.split('-').map(Number);
    const sessionsToCopy = copyingMonthGroup.sessions;
    const total = sessionsToCopy.length;

    setCopyProgress({ current: 0, total, status: 'copying' });
    setCopyErrorMessage(null);

    try {
      for (let i = 0; i < total; i++) {
        const originalSession = sessionsToCopy[i];
        let newDateStr = '';
        if (originalSession.sessionInfo.date) {
          const originalDate = new Date(originalSession.sessionInfo.date);
          const day = originalDate.getDate();
          const newDateObj = new Date(targetYear, targetMonth - 1, 1);
          const maxDays = new Date(targetYear, targetMonth, 0).getDate();
          newDateObj.setDate(Math.min(day, maxDays));
          newDateStr = newDateObj.toISOString().split('T')[0];
        } else {
          newDateStr = `${copyTargetMonth}-01`;
        }

        const copiedSession: SessionInfoRecord = {
          ...originalSession.sessionInfo,
          sessionId: uuidv4(),
          periodNumber: String(targetMonth),
          date: newDateStr,
        };

        const copiedProfessionals: ProfessionalRecord[] = originalSession.professionals.map((p, idx) => ({
          categoryCode: p.categoryCode,
          categoryName: p.categoryName,
          _colNo: p._colNo ?? idx + 1,
          _originalIndex: p._colNo !== undefined ? p._colNo - 1 : idx,
          opportunities: p.opportunities.map((o) => ({
            number: o.number,
            indications: [...o.indications],
            action: o.action,
            gloves: o.gloves,
          })),
        }));

        setCopyProgress({ current: i + 1, total, status: 'copying' });
        const res = await onSaveSession({ ...copiedSession, professionals: copiedProfessionals });
        if (res && res.error) throw new Error(res.error);
        if (res && res.success === false) throw new Error('Unknown error saving session');
      }

      setCopyProgress({ current: total, total, status: 'success' });
      setTimeout(() => {
        setCopyingMonthGroup(null);
        setCopyProgress(null);
        onRefresh();
      }, 1500);
    } catch (err: any) {
      setCopyErrorMessage(err?.message || String(err));
      setCopyProgress((prev) => ({
        current: prev?.current || 0,
        total: prev?.total || total,
        status: 'error',
      }));
    }
  };

  const handleOpenCopySessionModal = (session: SessionDataRecord) => {
    setCopyingSession(session);
    setCopySessionDate(
      session.sessionInfo.date ||
        (selectedMonth ? `${selectedMonth}-01` : new Date().toISOString().split('T')[0])
    );
  };

  const handleConfirmCopySession = async () => {
    if (!copyingSession || !copySessionDate) return;
    setCopyingSessionLoading(true);
    const originalSession = copyingSession;
    const newSessionId = uuidv4();
    const [, targetMonth] = copySessionDate.split('-').map(Number);

    const copiedSession: SessionInfoRecord = {
      ...originalSession.sessionInfo,
      sessionId: newSessionId,
      periodNumber: String(targetMonth || new Date(copySessionDate).getMonth() + 1),
      date: copySessionDate,
      sessionNumber: '',
    };

    const copiedProfessionals: ProfessionalRecord[] = originalSession.professionals.map((p, idx) => ({
      categoryCode: p.categoryCode,
      categoryName: p.categoryName,
      _colNo: p._colNo ?? idx + 1,
      _originalIndex: p._colNo !== undefined ? p._colNo - 1 : p._originalIndex ?? idx,
      opportunities: p.opportunities.map((o) => ({
        number: o.number,
        indications: [...o.indications],
        action: o.action,
        gloves: o.gloves,
      })),
    }));

    try {
      const res = await onSaveSession({ ...copiedSession, professionals: copiedProfessionals });
      if (res && res.error) throw new Error(res.error);
      setCopyingSessionLoading(false);
      setCopyingSession(null);
      setDateToast({
        message: `تم نسخ الجلسة بنجاح في نفس الشهر بتاريخ (${copySessionDate})! وتم تحديث أرقام الجلسات تلقائياً.`,
        type: 'success',
      });
      setTimeout(() => setDateToast(null), 6000);
    } catch (err: any) {
      setCopyingSessionLoading(false);
      setDateToast({
        message: `فشل نسخ الجلسة: ${err?.message || String(err)}`,
        type: 'error',
      });
      setTimeout(() => setDateToast(null), 6000);
    }
  };

  const handleUpdateDepartment = async (
    sessionId: string,
    newDept: string,
    oldDept?: string
  ) => {
    if (!sessionId || newDept === undefined) return;
    const trimmed = String(newDept).trim();
    if (trimmed === (oldDept || '').trim()) {
      setInlineEditingDeptId(null);
      return;
    }

    setSavingDeptSessionId(sessionId);
    setDateToast(null);
    try {
      const res = await onUpdateSessionDepartment({ sessionId, department: trimmed });
      if (res && res.error) throw new Error(res.error);
      setSavingDeptSessionId(null);
      setInlineEditingDeptId(null);
      setDateToast({
        message: `تم تحديث القسم بنجاح إلى "${trimmed || 'بدون قسم'}"!`,
        type: 'success',
      });
      setTimeout(() => setDateToast(null), 5000);
    } catch (err: any) {
      setSavingDeptSessionId(null);
      setDateToast({
        message: `فشل تحديث القسم: ${err?.message || String(err)}`,
        type: 'error',
      });
      setTimeout(() => setDateToast(null), 5000);
    }
  };

  const handleUpdateDate = async (sessionId: string, newDate: string, oldDate?: string) => {
    if (!sessionId || !newDate) return;
    if (newDate === oldDate) {
      setInlineEditingId(null);
      setEditingDateSession(null);
      return;
    }

    setSavingDateSessionId(sessionId);
    setDateToast(null);
    try {
      const res = await onUpdateSessionDate({ sessionId, newDate });
      if (res && res.error) throw new Error(res.error);
      setSavingDateSessionId(null);
      setInlineEditingId(null);
      setEditingDateSession(null);

      const oldMonth = (oldDate || '').slice(0, 7);
      const newMonth = newDate.slice(0, 7);
      const newMonthAr = new Date(newMonth + '-02').toLocaleString('ar', {
        month: 'long',
        year: 'numeric',
      });

      let msg = `تم تعديل التاريخ بنجاح إلى (${newDate})، وتم تحديث رقم الجلسة تلقائياً إلى: #${res?.newSessionNo || '1'}`;
      if (oldMonth && newMonth && oldMonth !== newMonth) {
        msg += ` (تم نقل الجلسة إلى مجلد شهر ${newMonthAr})`;
      }
      setDateToast({ message: msg, type: 'success' });
      setTimeout(() => setDateToast(null), 6000);
    } catch (err: any) {
      setSavingDateSessionId(null);
      setDateToast({ message: `فشل تعديل التاريخ: ${err?.message || String(err)}`, type: 'error' });
      setTimeout(() => setDateToast(null), 6000);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const targetSid = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      await onDeleteSession(targetSid);
    } catch (err: any) {
      setDateToast({ message: `فشل حذف الجلسة: ${err?.message || String(err)}`, type: 'error' });
    }
  };

  const confirmDeleteMonths = async () => {
    if (!deleteMonthsConfirm || deleteMonthsConfirm.length === 0) return;
    setDeletingMonthLoading(true);
    const deletedKeys = [...deleteMonthsConfirm];
    try {
      await onDeleteMonths(deletedKeys);
      setDeletingMonthLoading(false);
      setDeleteMonthsConfirm(null);
      setSelectedMonthsForPrint((prev) => prev.filter((m) => !deletedKeys.includes(m)));
      if (selectedMonth && deletedKeys.includes(selectedMonth)) {
        setSelectedMonth(null);
        setViewMode('list');
      }
    } catch (err: any) {
      setDeletingMonthLoading(false);
      setDateToast({
        message: 'حدث خطأ أثناء حذف البيانات: ' + (err?.message || String(err)),
        type: 'error',
      });
    }
  };

  const openMonth = (monthKey: string) => {
    setSelectedMonth(monthKey);
    setViewMode('folder');
  };

  const printDataForMonths = useMemo(() => {
    if (!printMode) return [];
    let targetKeys = selectedMonthsForPrint;
    if (targetKeys.length === 0 && selectedMonth) targetKeys = [selectedMonth];
    if (targetKeys.length === 0 && groupedMonths.length > 0) targetKeys = [groupedMonths[0].monthKey];

    const profCategories = getProfCategories(settings);
    const sortedKeys = [...new Set(targetKeys)].sort((a, b) => b.localeCompare(a));

    return sortedKeys
      .map((mKey) => {
        const group = groupedMonths.find((g) => g.monthKey === mKey);
        if (!group) return null;
        const sortedSessions = [...group.sessions].sort(
          (a, b) =>
            new Date(b.sessionInfo.date || 0).getTime() -
            new Date(a.sessionInfo.date || 0).getTime()
        );
        const basicStats = calculateBasicStats(sortedSessions, profCategories);
        const momentsStats = calculateMomentsStats(sortedSessions);
        const monthNameAr = new Date(mKey + '-02').toLocaleString('ar', {
          month: 'long',
          year: 'numeric',
        });
        const monthNameEn = new Date(mKey + '-02').toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        });

        return {
          monthKey: mKey,
          monthName: `${monthNameAr} (${monthNameEn})`,
          sessions: sortedSessions,
          basicStats,
          momentsStats,
          profCategories,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [printMode, selectedMonthsForPrint, selectedMonth, groupedMonths, settings]);

  const activeFolderData = useMemo(() => {
    if (!selectedMonth) return null;
    const group = groupedMonths.find((g) => g.monthKey === selectedMonth);
    if (!group) return null;
    const sortedSessions = [...group.sessions].sort(
      (a, b) =>
        new Date(b.sessionInfo.date || 0).getTime() -
        new Date(a.sessionInfo.date || 0).getTime()
    );
    const profCategories = getProfCategories(settings);
    const basicStats = calculateBasicStats(sortedSessions, profCategories);
    const momentsStats = calculateMomentsStats(sortedSessions);
    const monthName = new Date(selectedMonth + '-02').toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    return { monthName, sessions: sortedSessions, basicStats, momentsStats, profCategories };
  }, [selectedMonth, groupedMonths, settings]);

  const handlePrintAll = () => {
    if (selectedMonth) setSelectedMonthsForPrint([selectedMonth]);
    setPrintMode(true);
    setTimeout(() => {
      window.print();
    }, 800);
  };

  if (viewingSession) {
    return (
      <div className="bg-white p-0 m-0 w-full relative block">
        <div className="fixed top-4 right-4 z-50 no-print flex items-center gap-2 font-['Cairo']" dir="rtl">
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-full shadow-lg font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <span>🖨️ طباعة النموذج</span>
          </button>
          <button
            type="button"
            onClick={() => setViewingSession(null)}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg font-bold text-xs flex items-center gap-2 transition-transform active:scale-95"
          >
            <span>العودة للسجلات ✕</span>
          </button>
        </div>
        <div className="print-centered-page last-page">
          <ReadOnlyObservationForm
            sessionData={viewingSession}
            sessionIndex={0}
            totalSessions={1}
            settings={settings}
          />
        </div>
      </div>
    );
  }

  if (printMode && printDataForMonths.length > 0) {
    return (
      <div className="bg-white p-0 m-0 w-full relative block">
        <div className="fixed top-4 right-4 z-50 no-print flex items-center gap-2 font-['Cairo']" dir="rtl">
          {isAdmin && (
            <button
              type="button"
              onClick={openLogoModal}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-full shadow-lg font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95"
              title="تعديل شعارات الترويسة من Google Drive"
            >
              <span>🖼️ شعارات الترويسة</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleExportExcelMonths(printDataForMonths.map((m) => m.monthKey))}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-full shadow-lg font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95"
            title="تنزيل التقرير الحالي في شيت إكسيل"
          >
            <Icons.Excel />
            <span>تنزيل Excel</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-full shadow-lg font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95"
            title="إعادة فتح نافذة الطباعة"
          >
            <span>🖨️ طباعة الآن</span>
          </button>
          <button
            type="button"
            onClick={() => setPrintMode(false)}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg font-bold text-xs flex items-center gap-2 transition-transform active:scale-95"
          >
            <span>إغلاق المعاينة ✕</span>
          </button>
        </div>

        {printDataForMonths.map((mMonth, monthIdx) => (
          <React.Fragment key={mMonth.monthKey}>
            <div className="print-centered-page">
              <div className="print-report-container">
                <WHOHeader small={true} settings={settings} />
                <div className="text-center font-bold text-xl mb-3 mt-4">Basic Compliance Report</div>
                <div className="text-center text-sm font-bold text-gray-700 mb-6">{mMonth.monthName}</div>
                {renderBasicTable(mMonth.basicStats, mMonth.profCategories)}
                <div className="print-footer">
                  <div className="mb-0.5">
                    {settings?.header1 || 'مستشفى المنيا الجامعى للعيون'} -{' '}
                    {settings?.header2 || 'وحدة مكافحة العدوي'}
                  </div>
                  <div className="text-[7pt] font-normal italic text-slate-500">
                    Based on WHO's Hand Hygiene Compliance Observation Form
                  </div>
                </div>
              </div>
            </div>

            <div className="print-centered-page">
              <div className="print-report-container">
                <WHOHeader small={true} settings={settings} />
                <div className="text-center font-bold text-xl mb-3 mt-4">Moments Compliance Report</div>
                <div className="text-center text-sm font-bold text-gray-700 mb-6">{mMonth.monthName}</div>
                {renderMomentsTable(mMonth.momentsStats)}
                <div className="print-footer">
                  <div className="mb-0.5">
                    {settings?.header1 || 'مستشفى المنيا الجامعى للعيون'} -{' '}
                    {settings?.header2 || 'وحدة مكافحة العدوي'}
                  </div>
                  <div className="text-[7pt] font-normal italic text-slate-500">
                    Based on WHO's Hand Hygiene Compliance Observation Form
                  </div>
                </div>
              </div>
            </div>

            {mMonth.sessions.map((session, idx) => {
              const isAbsoluteLast =
                monthIdx === printDataForMonths.length - 1 && idx === mMonth.sessions.length - 1;
              return (
                <div
                  key={session.sessionInfo.sessionId}
                  className={`print-centered-page ${isAbsoluteLast ? 'last-page' : ''}`}
                >
                  <ReadOnlyObservationForm
                    sessionData={session}
                    sessionIndex={idx}
                    totalSessions={mMonth.sessions.length}
                    settings={settings}
                  />
                </div>
              );
            })}
          </React.Fragment>
        ))}

        <HeaderLogoModal
          isOpen={showLogoModal}
          onClose={() => setShowLogoModal(false)}
          settings={settings}
          onSave={handleSaveLogoModal}
          isSaving={savingLogoModal}
        />
      </div>
    );
  }

  if (viewMode === 'folder' && activeFolderData) {
    const filteredSessions = activeFolderData.sessions.filter((s) => {
      if (!formFilterQuery.trim()) return true;
      const q = formFilterQuery.trim().toLowerCase();
      const d = (s.sessionInfo.date || '').toLowerCase();
      const f = (s.sessionInfo.facility || '').toLowerCase();
      const dep = (s.sessionInfo.department || '').toLowerCase();
      const obs = (s.sessionInfo.observer || '').toLowerCase();
      const no = String(s.sessionInfo.sessionNumber || '').toLowerCase();
      return d.includes(q) || f.includes(q) || dep.includes(q) || obs.includes(q) || no.includes(q);
    });

    return (
      <div className="max-w-6xl mx-auto mt-4 no-print">
        {dateToast && (
          <div
            className={`mb-4 p-3.5 rounded-xl border shadow-sm flex items-center justify-between font-['Cairo'] text-sm font-bold transition-all ${
              dateToast.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-300'
                : 'bg-red-50 text-red-800 border-red-300'
            }`}
            dir="rtl"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{dateToast.type === 'success' ? '✓' : '✕'}</span>
              <span>{dateToast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setDateToast(null)}
              className="text-slate-400 hover:text-slate-700 px-2 py-1 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6 flex justify-between items-center sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
              title="العودة لقائمة الشهور"
            >
              <span className="text-lg">←</span>
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{activeFolderData.monthName}</h2>
              <p className="text-xs text-slate-500">{activeFolderData.sessions.length} Forms Saved</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {isAdmin && (
              <button
                type="button"
                onClick={openLogoModal}
                className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-2 rounded-lg font-bold shadow-sm flex items-center gap-1.5 transition-all text-xs font-['Cairo']"
                title="تعديل شعارات الترويسة للطباعة من Google Drive"
              >
                <span>🖼️ شعارات الترويسة</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => selectedMonth && handleExportExcelMonths([selectedMonth])}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 text-xs font-['Cairo']"
              title="تنزيل تقارير هذا الشهر في شيت إكسيل"
            >
              <Icons.Excel />
              <span>تنزيل التقرير (Excel)</span>
            </button>
            <button
              type="button"
              onClick={handlePrintAll}
              className="bg-[#F26522] hover:bg-[#d9531e] text-white px-4 py-2 rounded-lg font-bold shadow-sm flex items-center transition-all active:scale-95 text-xs"
            >
              <span className="mr-1.5">
                <Icons.Download />
              </span>{' '}
              Save as PDF (Reports + Forms)
            </button>
            {canDelete && selectedMonth && (
              <button
                type="button"
                onClick={() => setDeleteMonthsConfirm([selectedMonth])}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded-lg font-bold text-xs shadow-sm flex items-center gap-1 transition-all active:scale-95"
                title="حذف هذا الشهر بكل سجلاته"
              >
                <Icons.Trash /> Delete Month / حذف
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Icons.Chart /> Basic Report
            </h3>
            {renderBasicTable(activeFolderData.basicStats, activeFolderData.profCategories)}
          </div>
          <div>
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Icons.Chart /> Moments Report
            </h3>
            {renderMomentsTable(activeFolderData.momentsStats)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-700">
                Observation Forms ({activeFolderData.sessions.length})
              </h3>
              {canEdit && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">
                  تعديل التاريخ يعيد ترقيم الجلسة تلقائياً
                </span>
              )}
            </div>
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="بحث بالتاريخ، العيادة، أو الملاحظ..."
                value={formFilterQuery}
                onChange={(e) => setFormFilterQuery(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Date / التاريخ {canEdit ? '(انقر للتعديل)' : ''}</th>
                  <th className="px-6 py-4">Facility</th>
                  <th className="px-6 py-4">Department / القسم {canEdit ? '(انقر للتعديل)' : ''}</th>
                  <th className="px-6 py-4 text-center">Session No / رقم الجلسة</th>
                  <th className="px-6 py-4 text-center">Page No</th>
                  <th className="px-6 py-4 text-right">Actions / إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                      لا توجد نماذج مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((s) => {
                    const isInlineEditing = canEdit && inlineEditingId === s.sessionInfo.sessionId;
                    const isSavingThis = savingDateSessionId === s.sessionInfo.sessionId;
                    const isEditingDept = canEdit && inlineEditingDeptId === s.sessionInfo.sessionId;
                    const isSavingDept = savingDeptSessionId === s.sessionInfo.sessionId;
                    return (
                      <tr key={s.sessionInfo.sessionId} className="bg-white hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-900 whitespace-nowrap">
                          {isInlineEditing ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="date"
                                value={inlineDateValue}
                                onChange={(e) => setInlineDateValue(e.target.value)}
                                disabled={isSavingThis}
                                autoFocus
                                className="border border-[#F26522] rounded px-2 py-1 text-xs font-bold text-slate-800 bg-white shadow-xs focus:ring-2 focus:ring-orange-400 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateDate(s.sessionInfo.sessionId, inlineDateValue, s.sessionInfo.date)
                                }
                                disabled={isSavingThis || !inlineDateValue}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white p-1 rounded font-bold text-xs flex items-center justify-center transition-all active:scale-95 shadow-xs w-7 h-7"
                                title="حفظ التاريخ وتحديث رقم الجلسة تلقائياً"
                              >
                                {isSavingThis ? <Icons.Spinner /> : <Icons.Check />}
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineEditingId(null)}
                                disabled={isSavingThis}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-1 rounded font-bold text-xs flex items-center justify-center transition-colors w-7 h-7"
                                title="إلغاء التعديل"
                              >
                                <Icons.X />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <span className="font-bold text-slate-900">{s.sessionInfo.date || 'No Date'}</span>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlineEditingId(s.sessionInfo.sessionId);
                                    setInlineDateValue(s.sessionInfo.date || '');
                                  }}
                                  className="text-[#F26522] hover:text-[#d9531e] bg-orange-50 hover:bg-orange-100 p-1 rounded text-xs transition-colors flex items-center gap-1 border border-orange-200"
                                  title="انقر لتعديل التاريخ مباشرة"
                                >
                                  <Icons.Calendar />
                                  <span className="text-[11px] font-semibold hidden md:inline">تعديل</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">{s.sessionInfo.facility}</td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {isEditingDept ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                list="dept-options-list"
                                value={inlineDeptValue}
                                onChange={(e) => setInlineDeptValue(e.target.value)}
                                disabled={isSavingDept}
                                placeholder="اختر أو اكتب القسم..."
                                autoFocus
                                className="border border-[#F26522] rounded px-2 py-1 text-xs font-bold text-slate-800 bg-white shadow-xs focus:ring-2 focus:ring-orange-400 outline-none w-36 sm:w-44"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateDepartment(
                                    s.sessionInfo.sessionId,
                                    inlineDeptValue,
                                    s.sessionInfo.department
                                  )
                                }
                                disabled={isSavingDept}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white p-1 rounded font-bold text-xs flex items-center justify-center transition-all active:scale-95 shadow-xs w-7 h-7"
                                title="حفظ القسم"
                              >
                                {isSavingDept ? <Icons.Spinner /> : <Icons.Check />}
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineEditingDeptId(null)}
                                disabled={isSavingDept}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-1 rounded font-bold text-xs flex items-center justify-center transition-colors w-7 h-7"
                                title="إلغاء التعديل"
                              >
                                <Icons.X />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <span className="font-bold text-slate-800">{s.sessionInfo.department || '-'}</span>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlineEditingDeptId(s.sessionInfo.sessionId);
                                    setInlineDeptValue(s.sessionInfo.department || '');
                                  }}
                                  className="text-[#F26522] hover:text-[#d9531e] bg-orange-50 hover:bg-orange-100 p-1 rounded text-xs transition-colors flex items-center gap-1 border border-orange-200"
                                  title="انقر لتعديل القسم"
                                >
                                  <Icons.Edit />
                                  <span className="text-[11px] font-semibold hidden md:inline">تعديل</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <div
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-200 shadow-xs"
                            title="رقم الجلسة يتم ترتيبه زمنياً تلقائياً"
                          >
                            <span>#{s.sessionInfo.sessionNumber || '-'}</span>
                            <span className="text-[10px] text-orange-600 font-normal hidden lg:inline">
                              (تلقائي)
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">{s.sessionInfo.pageNumber || '-'}</td>
                        <td className="px-6 py-3 text-right flex justify-end items-center gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setViewingSession(s)}
                            title="عرض ومعاينة النموذج للقراءة فقط"
                            className="text-slate-700 hover:text-slate-900 font-semibold text-xs bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded transition-colors flex items-center gap-1 border border-slate-200 font-['Cairo']"
                          >
                            <Icons.Eye />
                            <span>عرض</span>
                          </button>
                          {canCopy && (
                            <button
                              type="button"
                              onClick={() => handleOpenCopySessionModal(s)}
                              title="نسخ هذه الجلسة وتكرارها في نفس الشهر"
                              className="text-amber-700 hover:text-amber-900 font-semibold text-xs bg-amber-50 hover:bg-amber-100 px-2 py-1.5 rounded transition-colors flex items-center gap-1 border border-amber-200"
                            >
                              <Icons.Clipboard />
                              <span className="hidden sm:inline">نسخ الجلسة</span>
                            </button>
                          )}
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDateSession(s);
                                  setModalDateValue(s.sessionInfo.date || '');
                                }}
                                title="تعديل تاريخ الجلسة ورقمها في نافذة مخصصة"
                                className="text-[#F26522] hover:text-[#d9531e] font-semibold text-xs bg-orange-50 hover:bg-orange-100 px-2 py-1.5 rounded transition-colors flex items-center gap-1 border border-orange-200"
                              >
                                <Icons.Calendar />
                                <span className="hidden sm:inline">تعديل التاريخ</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onEdit(s)}
                                title="تعديل كامل تفاصيل النموذج"
                                className="text-orange-500 hover:text-orange-600 p-1.5 hover:bg-orange-50 rounded transition-colors flex items-center gap-1 font-semibold text-xs border border-transparent hover:border-orange-200"
                              >
                                <Icons.Edit />
                                <span>Edit</span>
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(s.sessionInfo.sessionId)}
                              title="حذف الجلسة"
                              className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"
                            >
                              <Icons.Trash />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <datalist id="dept-options-list">
            {(settings?.departments || []).map((dep, idx) => (
              <option key={idx} value={dep} />
            ))}
          </datalist>
        </div>

        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Session</h3>
              <p className="text-slate-600 mb-6">
                Are you sure you want to delete this session? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {editingDateSession && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-['Cairo']"
            dir="rtl"
            onClick={() => !savingDateSessionId && setEditingDateSession(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-right border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 border-b pb-3 mb-4">
                <div className="p-2 bg-orange-100 text-[#F26522] rounded-lg">
                  <Icons.Calendar />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">تعديل تاريخ الجلسة</h3>
                  <p className="text-xs text-slate-500">سيتم تلقائياً تحديث رقم الجلسة بناءً على الترتيب الزمني</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3.5 mb-4 border border-slate-200 text-xs text-slate-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">المنشأة والعيادة:</span>
                  <span className="font-bold text-slate-800">
                    {editingDateSession.sessionInfo.facility || '-'} /{' '}
                    {editingDateSession.sessionInfo.department || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">التاريخ الحالي:</span>
                  <span className="font-bold text-slate-800">
                    {editingDateSession.sessionInfo.date || 'غير محدد'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">رقم الجلسة الحالي:</span>
                  <span className="font-bold text-[#F26522]">
                    #{editingDateSession.sessionInfo.sessionNumber || '-'}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">اختر التاريخ الجديد:</label>
                <input
                  type="date"
                  value={modalDateValue}
                  onChange={(e) => setModalDateValue(e.target.value)}
                  disabled={savingDateSessionId === editingDateSession.sessionInfo.sessionId}
                  className="w-full border-2 border-slate-300 focus:border-[#F26522] rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-colors"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-amber-800 text-xs leading-relaxed">
                ℹ️ <strong>ملاحظة:</strong> عند تغيير التاريخ، يقوم البرنامج تلقائياً بإعادة ترتيب جميع جلسات الشهر زمنياً من الأقدم إلى الأحدث، وتحديث رقم الجلسة (Session No) تلقائياً (#1, #2, #3...).
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={savingDateSessionId === editingDateSession.sessionInfo.sessionId}
                  onClick={() => setEditingDateSession(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-xs transition-colors border border-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={savingDateSessionId === editingDateSession.sessionInfo.sessionId || !modalDateValue}
                  onClick={() =>
                    handleUpdateDate(
                      editingDateSession.sessionInfo.sessionId,
                      modalDateValue,
                      editingDateSession.sessionInfo.date
                    )
                  }
                  className="px-5 py-2 bg-[#F26522] hover:bg-[#d9531e] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
                >
                  {savingDateSessionId === editingDateSession.sessionInfo.sessionId ? (
                    <Icons.Spinner />
                  ) : (
                    <Icons.Check />
                  )}
                  <span>
                    {savingDateSessionId === editingDateSession.sessionInfo.sessionId
                      ? 'جاري الحفظ والتحديث...'
                      : 'حفظ وتحديث رقم الجلسة تلقائياً'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {copyingSession && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-['Cairo']"
            dir="rtl"
            onClick={() => !copyingSessionLoading && setCopyingSession(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-right border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 border-b pb-3 mb-4">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <Icons.Clipboard />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">نسخ الجلسة في نفس الشهر</h3>
                  <p className="text-xs text-slate-500">{activeFolderData.monthName}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3.5 mb-4 border border-slate-200 text-xs text-slate-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">المنشأة والعيادة:</span>
                  <span className="font-bold text-slate-800">
                    {copyingSession.sessionInfo.facility || '-'} /{' '}
                    {copyingSession.sessionInfo.department || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">تاريخ الجلسة الأصلية:</span>
                  <span className="font-bold text-slate-800">
                    {copyingSession.sessionInfo.date || 'غير محدد'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">رقم الجلسة الأصلية:</span>
                  <span className="font-bold text-[#F26522]">
                    #{copyingSession.sessionInfo.sessionNumber || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">عدد الفرص المسجلة:</span>
                  <span className="font-bold text-slate-800">
                    {copyingSession.professionals.reduce(
                      (sum, p) =>
                        sum +
                        (p.opportunities
                          ? p.opportunities.filter((o) => o.indications.length > 0 || o.action).length
                          : 0),
                      0
                    )}{' '}
                    فرصة
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-bold text-slate-700">تاريخ النسخة الجديدة:</label>
                  <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    ضمن شهر {activeFolderData.monthName}
                  </span>
                </div>
                <input
                  type="date"
                  value={copySessionDate}
                  onChange={(e) => setCopySessionDate(e.target.value)}
                  disabled={copyingSessionLoading}
                  className="w-full border-2 border-slate-300 focus:border-[#F26522] rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-colors"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    disabled={copyingSessionLoading}
                    onClick={() => setCopySessionDate(copyingSession.sessionInfo.date || '')}
                    className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded transition-colors"
                  >
                    نفس تاريخ الأصل ({copyingSession.sessionInfo.date})
                  </button>
                  {(() => {
                    if (!copyingSession.sessionInfo.date || !selectedMonth) return null;
                    const d = new Date(copyingSession.sessionInfo.date);
                    d.setDate(d.getDate() + 1);
                    const nextDayStr = d.toISOString().split('T')[0];
                    if (!nextDayStr.startsWith(selectedMonth)) return null;
                    return (
                      <button
                        type="button"
                        disabled={copyingSessionLoading}
                        onClick={() => setCopySessionDate(nextDayStr)}
                        className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded transition-colors"
                      >
                        اليوم التالي ({nextDayStr})
                      </button>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-amber-800 text-xs leading-relaxed">
                📋 سيتم نسخ كافة بيانات الجلسة والفئات والفرص بالكامل، مع توليد معرّف فريد جديد، وسيتم تلقائياً إعادة ترقيم جلسات هذا الشهر زمنياً وإعطاء الجلسة المنسوخة رقمها الصحيح.
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={copyingSessionLoading}
                  onClick={() => setCopyingSession(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-xs transition-colors border border-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={copyingSessionLoading || !copySessionDate}
                  onClick={handleConfirmCopySession}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
                >
                  {copyingSessionLoading ? <Icons.Spinner /> : <Icons.Clipboard />}
                  <span>
                    {copyingSessionLoading ? 'جاري نسخ الجلسة والترقيم...' : 'تأكيد نسخ الجلسة في نفس الشهر'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto no-print mt-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Records Database</h2>
            <p className="text-sm text-slate-500">Monthly Archives & Reports</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowTursoImportModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded shadow-sm text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 font-['Cairo']"
              title="جلب واستيراد سجلات المركز السابقة من قاعدة بيانات Turso"
            >
              <span>📥 استيراد من Turso سابقة</span>
            </button>
            {groupedMonths.length > 0 && (
              <button
                type="button"
                onClick={() => handleExportExcelMonths('all')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded shadow-sm text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 font-['Cairo']"
                title="تصدير جميع الأشهر والسجلات في ملف إكسيل واحد"
              >
                <Icons.Excel />
                <span>تصدير كل التقارير (Excel)</span>
              </button>
            )}
            <button
              type="button"
              onClick={onRefresh}
              className="text-slate-500 hover:text-slate-800 p-2 bg-white border border-slate-300 rounded shadow-sm text-xs font-bold transition-colors"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {groupedMonths.length > 0 && (
          <div className="px-6 py-4 bg-orange-50/90 border-b border-orange-200/80 font-['Cairo']" dir="rtl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[#F26522] text-lg">
                  <Icons.Print />
                </span>
                <span className="font-bold text-sm text-slate-800">
                  {canDelete
                    ? 'تحديد الأشهر للطباعة أو تنزيل Excel أو الحذف:'
                    : 'تحديد الأشهر للطباعة أو تنزيل Excel:'}
                </span>
                <span className="text-xs bg-orange-100 text-orange-800 font-bold px-2.5 py-0.5 rounded-full border border-orange-200">
                  محدد: {selectedMonthsForPrint.length} من {groupedMonths.length} شهر
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={selectAllMonths}
                  className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={deselectAllMonths}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  إلغاء التحديد
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openLogoModal}
                    className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1 font-['Cairo']"
                    title="تعديل شعارات الترويسة للطباعة من Google Drive"
                  >
                    <span>🖼️ شعارات الترويسة</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={selectedMonthsForPrint.length === 0}
                  onClick={() => handleExportExcelMonths(selectedMonthsForPrint)}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                  title="تنزيل تقارير الأشهر المحددة في شيت إكسيل واحد"
                >
                  <Icons.Excel />
                  <span>تنزيل Excel ({selectedMonthsForPrint.length})</span>
                </button>
                <button
                  type="button"
                  disabled={selectedMonthsForPrint.length === 0}
                  onClick={() => handlePrintMonths(selectedMonthsForPrint)}
                  className="bg-[#F26522] hover:bg-[#d9531e] disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                  title="طباعة تقارير ونماذج الأشهر المحددة في ملف واحد"
                >
                  <Icons.Print />
                  <span>طباعة ({selectedMonthsForPrint.length})</span>
                </button>
                {canDelete && (
                  <button
                    type="button"
                    disabled={selectedMonthsForPrint.length === 0}
                    onClick={() => setDeleteMonthsConfirm(selectedMonthsForPrint)}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                    title="حذف الأشهر المحددة وسجلاتها نهائياً"
                  >
                    <Icons.Trash />
                    <span>حذف الأشهر المحددة ({selectedMonthsForPrint.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Icons.Spinner /> Loading database...
          </div>
        ) : groupedMonths.length === 0 ? (
          <div className="text-center text-slate-500 py-12 px-4 flex flex-col items-center font-['Cairo']" dir="rtl">
            <div className="opacity-25 mb-3 text-4xl">📁</div>
            <h3 className="font-bold text-base text-slate-800 mb-1">لا توجد سجلات محفوظة حالياً</h3>
            <p className="text-xs text-slate-500 max-w-md mb-5 leading-relaxed">
              يمكنك البدء بإدخال نماذج ملاحظة جديدة، أو جلب ونقل سجلات المركز السابقة مباشرة من قاعدة بيانات Turso القديمة.
            </p>
            <button
              type="button"
              onClick={() => setShowTursoImportModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <span>📥 جلب سجلات المركز من Turso سابقة</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={groupedMonths.length > 0 && selectedMonthsForPrint.length === groupedMonths.length}
                      onChange={(e) => {
                        if (e.target.checked) selectAllMonths();
                        else deselectAllMonths();
                      }}
                      className="rounded accent-[#F26522] w-4 h-4 cursor-pointer"
                      title="تحديد / إلغاء تحديد جميع الأشهر"
                    />
                  </th>
                  <th className="px-6 py-4">Month / الشهر</th>
                  <th className="px-6 py-4 text-center">Forms</th>
                  <th className="px-6 py-4 text-center">Compliance</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedMonths.map((group) => {
                  const isSelected = selectedMonthsForPrint.includes(group.monthKey);
                  const complianceNum = group.totalOpp > 0 ? (group.totalAct / group.totalOpp) * 100 : 0;
                  const compliance = complianceNum.toFixed(2);
                  const monthDisplay = new Date(group.monthKey + '-02').toLocaleString('default', {
                    month: 'long',
                    year: 'numeric',
                  });
                  const arMonthDisplay = new Date(group.monthKey + '-02').toLocaleString('ar', {
                    month: 'long',
                    year: 'numeric',
                  });
                  return (
                    <tr
                      key={group.monthKey}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-orange-50/70 hover:bg-orange-100/80' : 'bg-white hover:bg-orange-50/40'
                      }`}
                      onClick={() => openMonth(group.monthKey)}
                    >
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMonthSelection(group.monthKey)}
                          className="rounded accent-[#F26522] w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-base">{arMonthDisplay}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {monthDisplay} ({group.monthKey})
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-medium">
                        <span className="bg-slate-100 text-slate-700 py-1 px-3 rounded-full font-bold">
                          {group.sessions.length}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            complianceNum >= 80
                              ? 'bg-green-100 text-green-800'
                              : complianceNum >= 60
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {compliance}%
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleExportExcelMonths([group.monthKey])}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded transition-all active:scale-95 flex items-center gap-1 shadow-sm font-['Cairo']"
                          title="تنزيل تقرير هذا الشهر في شيت إكسيل"
                        >
                          <Icons.Excel /> Excel / إكسيل
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintMonths([group.monthKey])}
                          className="bg-[#F26522] hover:bg-[#d9531e] text-white font-bold text-xs px-3 py-2 rounded transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                          title="طباعة هذا الشهر مباشرة"
                        >
                          <Icons.Print /> Print / طباعة
                        </button>
                        {canCopy && (
                          <button
                            type="button"
                            onClick={() => {
                              setCopyingMonthGroup(group);
                              setCopyTargetMonth(group.monthKey);
                              setCopyProgress(null);
                              setCopyErrorMessage(null);
                            }}
                            className="text-orange-600 hover:text-orange-850 font-bold text-xs bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded transition-colors flex items-center gap-1 border border-orange-200"
                          >
                            <Icons.Clipboard /> Copy
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openMonth(group.monthKey)}
                          className="text-slate-700 hover:text-slate-900 font-bold text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded transition-colors"
                        >
                          Open Folder →
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteMonthsConfirm([group.monthKey])}
                            className="text-red-600 hover:text-red-800 font-bold text-xs bg-red-50 hover:bg-red-100 px-3 py-2 rounded transition-colors flex items-center gap-1 border border-red-200"
                            title="حذف هذا الشهر بكل نماذجه"
                          >
                            <Icons.Trash /> Delete / حذف
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {copyingMonthGroup && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 font-['Cairo']"
          onClick={() => !copyProgress && setCopyingMonthGroup(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-right"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-slate-800 mb-3 border-b pb-2 flex items-center gap-2">
              <span>نسخ سجلات شهر</span>
              <span className="text-[#F26522]">
                {new Date(copyingMonthGroup.monthKey + '-02').toLocaleString('ar', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </h3>

            {(!copyProgress || copyProgress.status !== 'success') && (
              <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                سيتم نسخ جميع جلسات هذا الشهر ({copyingMonthGroup.sessions.length} جلسة) وتكرارها في شهر آخر من اختيارك مع توليد معرّفات فريدة جديدة لكل جلسة تلقائياً.
              </p>
            )}

            {(!copyProgress || copyProgress.status === 'error') && (
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">اختر الشهر الجديد (الهدف):</label>
                <input
                  type="month"
                  className="w-full border border-slate-300 p-2.5 rounded-lg text-base focus:ring-2 focus:ring-orange-500 outline-none text-center font-bold"
                  value={copyTargetMonth}
                  onChange={(e) => setCopyTargetMonth(e.target.value)}
                  disabled={copyProgress?.status === 'copying'}
                />
              </div>
            )}

            {copyProgress && (
              <div className="my-5 bg-slate-50 p-4 rounded-lg border border-slate-200">
                {copyProgress.status === 'copying' && (
                  <div className="flex flex-col items-center justify-center py-2">
                    <Icons.Spinner />
                    <div className="text-sm font-bold text-slate-700 mt-3">
                      جاري نسخ الجلسة {copyProgress.current} من {copyProgress.total}...
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 mt-3 overflow-hidden">
                      <div
                        className="bg-[#F26522] h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${(copyProgress.current / copyProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {copyProgress.status === 'success' && (
                  <div className="text-center py-2 text-green-600 font-bold flex flex-col items-center">
                    <span className="text-3xl mb-1">✓</span>
                    <span>
                      تم نسخ جميع البيانات بنجاح إلى شهر{' '}
                      {new Date(copyTargetMonth + '-02').toLocaleString('ar', {
                        month: 'long',
                        year: 'numeric',
                      })}
                      !
                    </span>
                  </div>
                )}
                {copyProgress.status === 'error' && (
                  <div className="text-center py-2 text-red-600 font-bold">
                    <span className="text-3xl mb-1">✕</span>
                    <div className="text-sm font-bold">فشلت عملية النسخ:</div>
                    <div className="text-xs font-mono font-normal mt-2 text-left bg-red-50 p-2 rounded border border-red-200 break-words">
                      {copyErrorMessage}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(!copyProgress || copyProgress.status === 'error') && (
              <div className="flex justify-start gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setCopyingMonthGroup(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg font-bold text-sm transition-colors active:scale-95"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCopy}
                  className="px-6 py-2 bg-[#F26522] hover:bg-[#d9531e] text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  بدء نسخ البيانات
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteMonthsConfirm && deleteMonthsConfirm.length > 0 && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-['Cairo']"
          dir="rtl"
          onClick={() => !deletingMonthLoading && setDeleteMonthsConfirm(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-right border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto">
              <Icons.Trash />
            </div>
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">تأكيد حذف الشهر / الأشهر</h3>
            <p className="text-slate-600 text-sm text-center mb-4 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف البيانات والسجلات المندرجة تحت{' '}
              <span className="font-bold text-red-600">({deleteMonthsConfirm.length})</span> شهر؟
            </p>

            <div className="bg-red-50/80 border border-red-200/80 rounded-lg p-3 mb-4 max-h-36 overflow-y-auto">
              <div className="text-xs font-bold text-red-800 mb-1.5">قائمة الأشهر التي سيتم حذفها نهائياً:</div>
              <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                {deleteMonthsConfirm.map((mKey) => {
                  const arName = new Date(mKey + '-02').toLocaleString('ar', {
                    month: 'long',
                    year: 'numeric',
                  });
                  const matchingGroup = groupedMonths.find((g) => g.monthKey === mKey);
                  const count = matchingGroup ? matchingGroup.sessions.length : 0;
                  return (
                    <li key={mKey} className="font-medium">
                      <span className="font-bold text-slate-900">{arName}</span> ({mKey}) -{' '}
                      <span className="font-bold text-red-700">{count} نموذج</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <p className="text-[11px] text-slate-500 text-center mb-6">
              ⚠️ تنبيه: لا يمكن التراجع عن هذه العملية لاحقاً وسيتم مسح جميع نماذج هذه الأشهر من قاعدة البيانات.
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deletingMonthLoading}
                onClick={() => setDeleteMonthsConfirm(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-xs transition-colors border border-slate-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deletingMonthLoading}
                onClick={confirmDeleteMonths}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {deletingMonthLoading ? <Icons.Spinner /> : <Icons.Trash />}
                <span>{deletingMonthLoading ? 'جاري الحذف...' : 'نعم، أؤكد الحذف النهائي'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <HeaderLogoModal
        isOpen={showLogoModal}
        onClose={() => setShowLogoModal(false)}
        settings={settings}
        onSave={handleSaveLogoModal}
        isSaving={savingLogoModal}
      />

      <TursoImportModal
        isOpen={showTursoImportModal}
        onClose={() => setShowTursoImportModal(false)}
        onImportSuccess={() => {
          onRefresh();
          if (onRefreshSettings) onRefreshSettings();
        }}
        onTestConnection={onTestTursoConnection}
        onImportData={onImportTursoData}
      />
    </div>
  );
};

// ============================================================================
// NAVIGATION, SETTINGS & ERROR BOUNDARY
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    console.error(error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 text-red-800 rounded m-4 border border-red-200">
          <h3 className="font-bold mb-2">Something went wrong.</h3>
          <pre className="text-xs overflow-auto">{this.state.error && this.state.error.toString()}</pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-800 text-white px-3 py-1 rounded text-sm"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const NavLink: React.FC<{
  id: ComplianceViewMode;
  label: string;
  icon: React.ReactNode;
  currentView: ComplianceViewMode;
  setView: (v: ComplianceViewMode) => void;
}> = ({ id, label, icon, currentView, setView }) => {
  const isActive = currentView === id;
  return (
    <button
      type="button"
      onClick={() => setView(id)}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all active:scale-95 ${
        isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span className={isActive ? 'opacity-100' : 'opacity-70'}>{icon}</span>
      {label}
    </button>
  );
};

const NavButton: React.FC<{
  id: ComplianceViewMode;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  setView: (v: ComplianceViewMode) => void;
}> = ({ id, label, icon, active, setView }) => (
  <button
    type="button"
    onClick={() => setView(id)}
    className={`flex flex-col items-center justify-center w-full py-1 active:scale-90 transition-transform duration-200 ${
      active ? 'text-[#F26522]' : 'text-slate-400'
    }`}
  >
    <div className={`mb-1 ${active ? 'opacity-100' : 'opacity-70'}`}>{icon}</div>
    <span className="text-[10px] font-medium leading-none">{label}</span>
  </button>
);

const MobileBottomNav: React.FC<{
  currentView: ComplianceViewMode;
  setView: (v: ComplianceViewMode) => void;
  canAccessSettings?: boolean;
}> = ({ currentView, setView, canAccessSettings = true }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center px-2 py-2 pb-safe z-50 md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.03)] backdrop-blur-lg bg-white/90">
    <NavButton id="form" label="Form" icon={<Icons.Form />} active={currentView === 'form'} setView={setView} />
    <NavButton id="dashboard" label="Dash" icon={<Icons.Activity />} active={currentView === 'dashboard'} setView={setView} />
    <NavButton id="records" label="Records" icon={<Icons.Database />} active={currentView === 'records'} setView={setView} />
    {canAccessSettings && (
      <NavButton id="settings" label="Settings" icon={<Icons.Settings />} active={currentView === 'settings'} setView={setView} />
    )}
  </div>
);

const ListEditor: React.FC<{
  label: string;
  items?: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  readOnly?: boolean;
}> = ({ label, items, onChange, placeholder, readOnly = false }) => {
  const [newItem, setNewItem] = useState('');
  const handleAdd = () => {
    if (readOnly) return;
    if (newItem.trim()) {
      onChange([...(items || []), newItem.trim()]);
      setNewItem('');
    }
  };
  const handleRemove = (index: number) => {
    if (readOnly) return;
    const newItems = [...(items || [])];
    newItems.splice(index, 1);
    onChange(newItems);
  };
  return (
    <div className="border border-gray-200 rounded-md p-3 bg-slate-50">
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      {!readOnly && (
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            className="flex-1 form-input-bg h-9 px-3 rounded border border-gray-300 text-sm"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={handleAdd}
            className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
      )}
      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
        {(!items || items.length === 0) && (
          <div className="text-xs text-gray-400 italic">No items added yet.</div>
        )}
        {items &&
          items.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center bg-white border border-gray-200 px-2 py-1.5 rounded text-sm"
            >
              <span className="truncate mr-2">{item}</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

const SettingsPanel: React.FC<{
  settings?: AppSettings | null;
  onSaveSettings: (next: AppSettings) => Promise<SaveSettingsResult>;
  onAddFacility?: (payload: { facility: string }) => Promise<FacilityActionResult>;
  onDeleteFacility?: (payload: { facility: string }) => Promise<FacilityActionResult>;
  onTestTursoConnection: (creds: { tursoUrl: string; tursoAuthToken: string }) => Promise<TursoTestResult>;
  onImportTursoData: (payload: TursoImportPayload) => Promise<TursoImportResult>;
  onImportSuccess?: () => void;
  onNavigateToRecords?: () => void;
}> = ({
  settings,
  onSaveSettings,
  onAddFacility,
  onDeleteFacility,
  onTestTursoConnection,
  onImportTursoData,
  onImportSuccess,
  onNavigateToRecords,
}) => {
  const isReadOnly = false;
  const [showTursoImportModal, setShowTursoImportModal] = useState(false);
  const [centerToDeleteInSettings, setCenterToDeleteInSettings] = useState<string | null>(null);
  const [deletingCenterLoading, setDeletingCenterLoading] = useState(false);
  const [newCenterInput, setNewCenterInput] = useState('');
  const [addingCenterLoading, setAddingCenterLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings || { ...DEFAULT_SETTINGS });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAddNewCenterInSettings = async () => {
    const name = newCenterInput.trim();
    if (!name || !onAddFacility) return;
    setAddingCenterLoading(true);
    try {
      const res = await onAddFacility({ facility: name });
      setAddingCenterLoading(false);
      setNewCenterInput('');
      if (res && res.success) {
        setMessage({ type: 'success', text: res.message || `تمت إضافة المركز "${name}" بنجاح` });
        if (res.settings) {
          setLocalSettings(res.settings);
        }
      } else {
        setMessage({ type: 'error', text: res?.error || 'حدث خطأ أثناء إضافة المركز' });
      }
    } catch (err: any) {
      setAddingCenterLoading(false);
      setMessage({ type: 'error', text: 'فشل إضافة المركز: ' + (err?.message || String(err)) });
    }
  };

  const handleDeleteCenterCascadeInSettings = async () => {
    if (!centerToDeleteInSettings || !onDeleteFacility) return;
    const name = centerToDeleteInSettings;
    setDeletingCenterLoading(true);
    try {
      const res = await onDeleteFacility({ facility: name });
      setDeletingCenterLoading(false);
      setCenterToDeleteInSettings(null);
      if (res && res.success) {
        setMessage({ type: 'success', text: res.message || `تم حذف المركز "${name}" وكافة بياناته بنجاح` });
        if (res.settings) {
          setLocalSettings(res.settings);
        }
      } else {
        setMessage({ type: 'error', text: res?.error || 'حدث خطأ أثناء حذف المركز' });
      }
    } catch (err: any) {
      setDeletingCenterLoading(false);
      setCenterToDeleteInSettings(null);
      setMessage({ type: 'error', text: 'فشل حذف المركز: ' + (err?.message || String(err)) });
    }
  };

  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  const handleChange = (field: keyof AppSettings, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: keyof AppSettings, value: string[]) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await onSaveSettings(localSettings);
      setIsSaving(false);
      if (res && res.success === false) {
        setMessage({ type: 'error', text: res.error || 'تعذر حفظ الإعدادات' });
        return;
      }
      setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (error: any) {
      setIsSaving(false);
      setMessage({ type: 'error', text: 'تعذر حفظ الإعدادات: ' + (error?.message || String(error)) });
    }
  };

  return (
    <div className="bg-white mx-auto max-w-[850px] paper-container shadow-xl min-h-[calc(100vh-150px)] print:min-h-0 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 mb-6 gap-2">
        <h1 className="text-2xl font-bold text-gray-800">Application Settings</h1>
      </div>

      {message && (
        <div
          className={`p-3 mb-4 rounded-lg text-sm font-bold font-['Cairo'] ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
          dir="rtl"
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3 font-['Cairo']">نصوص الترويسة (Headers)</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Header 1 (Main Title)</label>
              <input
                type="text"
                className="w-full form-input-bg h-10 px-3 rounded border border-gray-300"
                value={localSettings.header1 || ''}
                onChange={(e) => handleChange('header1', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Header 2 (Subtitle)</label>
              <input
                type="text"
                className="w-full form-input-bg h-10 px-3 rounded border border-gray-300"
                value={localSettings.header2 || ''}
                onChange={(e) => handleChange('header2', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Header 3 (Form Title)</label>
              <input
                type="text"
                className="w-full form-input-bg h-10 px-3 rounded border border-gray-300"
                value={localSettings.header3 || ''}
                onChange={(e) => handleChange('header3', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="bg-orange-50/60 p-4 rounded-xl border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-orange-900 font-['Cairo'] flex items-center gap-2">
              <span>🖼️ شعارات الترويسة للطباعة (Header Logos)</span>
            </h2>
            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">
              Google Drive
            </span>
          </div>

          <p className="text-xs text-gray-600 mb-4 leading-relaxed font-['Cairo']" dir="rtl">
            يمكنك إضافة شعارين في ترويسة ملفات الطباعة (واحد جهة اليمين والآخر جهة اليسار) عبر لصق رابط Google Drive للصورة. يتم ضبط حجم الشعارين تلقائياً ليلائم الترويسة مع بقاء النصوص في الوسط دون تغيير.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-3 rounded-lg border border-orange-200 shadow-sm">
              <label className="text-sm font-bold text-gray-800 mb-1 font-['Cairo'] flex items-center justify-between">
                <span>شعار جهة اليمين (Right Logo)</span>
                {!isReadOnly && localSettings.logoRight && (
                  <button
                    type="button"
                    onClick={() => handleChange('logoRight', '')}
                    className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                  >
                    مسح الشعار ✕
                  </button>
                )}
              </label>
              <input
                type="text"
                disabled={isReadOnly}
                placeholder="https://drive.google.com/file/d/.../view"
                className="w-full form-input-bg h-9 px-3 rounded border border-gray-300 text-xs font-mono disabled:bg-slate-100 disabled:text-slate-500"
                value={localSettings.logoRight || ''}
                onChange={(e) => handleChange('logoRight', e.target.value)}
              />
              <div className="mt-2 flex items-center gap-3">
                <div className="w-16 h-12 bg-slate-100 border border-dashed border-slate-300 rounded flex items-center justify-center overflow-hidden shrink-0">
                  {localSettings.logoRight ? (
                    <img
                      src={formatGoogleDriveUrl(localSettings.logoRight)}
                      alt="Right Logo Preview"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400">لا يوجد</span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 font-['Cairo']">معاينة شعار اليمين</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-orange-200 shadow-sm">
              <label className="text-sm font-bold text-gray-800 mb-1 font-['Cairo'] flex items-center justify-between">
                <span>شعار جهة اليسار (Left Logo)</span>
                {!isReadOnly && localSettings.logoLeft && (
                  <button
                    type="button"
                    onClick={() => handleChange('logoLeft', '')}
                    className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                  >
                    مسح الشعار ✕
                  </button>
                )}
              </label>
              <input
                type="text"
                disabled={isReadOnly}
                placeholder="https://drive.google.com/file/d/.../view"
                className="w-full form-input-bg h-9 px-3 rounded border border-gray-300 text-xs font-mono disabled:bg-slate-100 disabled:text-slate-500"
                value={localSettings.logoLeft || ''}
                onChange={(e) => handleChange('logoLeft', e.target.value)}
              />
              <div className="mt-2 flex items-center gap-3">
                <div className="w-16 h-12 bg-slate-100 border border-dashed border-slate-300 rounded flex items-center justify-center overflow-hidden shrink-0">
                  {localSettings.logoLeft ? (
                    <img
                      src={formatGoogleDriveUrl(localSettings.logoLeft)}
                      alt="Left Logo Preview"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400">لا يوجد</span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 font-['Cairo']">معاينة شعار اليسار</span>
              </div>
            </div>
          </div>

          <div
            className="bg-amber-100/70 text-amber-900 border border-amber-300 rounded-lg p-2.5 text-xs font-['Cairo'] flex items-start gap-2 mb-4"
            dir="rtl"
          >
            <span className="text-base leading-none">💡</span>
            <div>
              <span className="font-bold">تنبيه هام لرابط Google Drive:</span> تأكد من ضبط إذن مشاركة الصورة في Google Drive على{' '}
              <strong>"أي شخص لديه الرابط يمكنه العرض" (Anyone with the link)</strong> لكي تظهر الصورة وتُطبع دون عوائق.
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xs font-bold text-gray-700 mb-1 font-['Cairo'] flex items-center justify-between">
              <span>معاينة حية لشكل الترويسة عند الطباعة:</span>
              <span className="text-[10px] text-gray-500 font-normal">
                النصوص في المنتصف والشعارات على اليمين واليسار
              </span>
            </div>
            <div className="rounded-lg overflow-hidden border border-gray-300 shadow-sm">
              <WHOHeader small={true} settings={localSettings} />
            </div>
          </div>
        </section>

        <section
          className="bg-gradient-to-r from-orange-50/90 via-amber-50/70 to-orange-50/90 p-5 rounded-xl border border-orange-200 font-['Cairo'] shadow-xs"
          dir="rtl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                <span>إدارة المراكز والمنشآت الصحية (Centers)</span>
                <span className="text-[10px] bg-orange-200 text-orange-900 font-bold px-2 py-0.5 rounded-full">
                  {(localSettings?.facilities || []).length} مركز مسجل
                </span>
              </h2>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-4 bg-white p-3 rounded-xl border border-orange-200/80 shadow-2xs">
            <input
              type="text"
              placeholder="أدخل اسم المركز أو المستشفى الجديد..."
              value={newCenterInput}
              onChange={(e) => setNewCenterInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNewCenterInSettings();
                }
              }}
              disabled={addingCenterLoading}
              className="flex-1 form-input-bg text-right px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none"
            />
            <button
              type="button"
              onClick={handleAddNewCenterInSettings}
              disabled={addingCenterLoading || !newCenterInput.trim()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
            >
              {addingCenterLoading ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span>+ إضافة المركز</span>
              )}
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {(!localSettings?.facilities || localSettings.facilities.length === 0) && (
              <div className="text-xs text-slate-400 italic text-center py-4 bg-white rounded-lg border border-slate-200">
                لا توجد مراكز مضافة بعد.
              </div>
            )}
            {localSettings?.facilities &&
              localSettings.facilities.map((facName: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border transition-all text-xs font-semibold bg-white border-slate-200 hover:border-orange-200"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                    <span className="text-slate-800 font-bold text-sm">{facName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCenterToDeleteInSettings(facName)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition"
                      title={`حذف المركز "${facName}" وكافة بياناته نهائياً`}
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Dropdown Lists</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ListEditor
              label="Facilities"
              items={localSettings.facilities}
              onChange={(v) => handleArrayChange('facilities', v)}
              placeholder="Add Facility"
              readOnly={isReadOnly}
            />
            <ListEditor
              label="Services"
              items={localSettings.services}
              onChange={(v) => handleArrayChange('services', v)}
              placeholder="Add Service"
              readOnly={isReadOnly}
            />
            <ListEditor
              label="Wards"
              items={localSettings.wards}
              onChange={(v) => handleArrayChange('wards', v)}
              placeholder="Add Ward"
              readOnly={isReadOnly}
            />
            <ListEditor
              label="Departments"
              items={localSettings.departments}
              onChange={(v) => handleArrayChange('departments', v)}
              placeholder="Add Department"
              readOnly={isReadOnly}
            />
            <ListEditor
              label="Observers (Initials)"
              items={localSettings.observers}
              onChange={(v) => handleArrayChange('observers', v)}
              placeholder="Add Observer"
              readOnly={isReadOnly}
            />
            <ListEditor
              label="Cities"
              items={localSettings.cities}
              onChange={(v) => handleArrayChange('cities', v)}
              placeholder="Add City"
              readOnly={isReadOnly}
            />
            <ListEditor
              label="Professional Categories"
              items={localSettings.profCategories}
              onChange={(v) => handleArrayChange('profCategories', v)}
              placeholder="Add Category"
              readOnly={isReadOnly}
            />
          </div>
        </section>

        <section
          className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50/70 p-5 rounded-xl border border-purple-200 font-['Cairo'] shadow-xs"
          dir="rtl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
                📥
              </div>
              <div>
                <h2 className="text-base font-bold text-purple-950 flex items-center gap-2">
                  <span>جلب السجلات من قاعدة بيانات Turso سابقة للمركز</span>
                  <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                    ترحيل البيانات
                  </span>
                </h2>
                <p className="text-xs text-purple-700 mt-1 leading-relaxed">
                  يمكنك ربط قاعدة بيانات Turso القديمة لجلب كافة نماذج وسجلات المركز السابقة ودمج القوائم المنسدلة في هذه القاعدة مباشرة بدون فقدان أو تكرار.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTursoImportModal(true)}
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 shrink-0 flex items-center justify-center gap-1.5"
            >
              <span>فتح أداة جلب السجلات</span>
            </button>
          </div>
        </section>

        <div className="pt-4 border-t flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`px-6 py-2.5 rounded-lg font-bold text-white transition-colors font-['Cairo'] ${
              isSaving ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 shadow-md'
            }`}
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      <TursoImportModal
        isOpen={showTursoImportModal}
        onClose={() => setShowTursoImportModal(false)}
        onImportSuccess={() => {
          if (onImportSuccess) onImportSuccess();
        }}
        onNavigateToRecords={onNavigateToRecords}
        onTestConnection={onTestTursoConnection}
        onImportData={onImportTursoData}
      />

      {centerToDeleteInSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
          dir="rtl"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 font-['Cairo']">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">تأكيد حذف المركز نهائياً</h3>
                <p className="text-xs text-rose-600 font-semibold">تحذير لا رجعة فيه!</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4 text-xs text-slate-700 space-y-2">
              <p className="font-bold text-slate-900 text-sm">
                هل أنت متأكد من حذف المركز:
                <span className="block text-rose-700 text-base font-black mt-1">
                  "{centerToDeleteInSettings}"
                </span>
              </p>
              <div className="border-t border-rose-200 pt-2 text-rose-900">
                ⚠️ <strong>تنبيه صارم:</strong> سيتم حذف المركز من الإعدادات و
                <span className="underline font-bold">
                  حذف جميع جلسات الرصد والملاحظات والإحصائيات التابعة له نهائياً
                </span>{' '}
                من قاعدة البيانات!
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeleteCenterCascadeInSettings}
                disabled={deletingCenterLoading}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                {deletingCenterLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <span>نعم، احذف المركز وجميع بياناته نهائياً</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setCenterToDeleteInSettings(null)}
                disabled={deletingCenterLoading}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN STANDALONE COMPLIANCE COMPONENT
// ============================================================================

export const Compliance: React.FC<ComplianceProps> = ({
  sessions: externalSessions,
  rawObservations,
  initialSession = null,
  professionals: externalProfessionals,
  defaultProfessionalColumns,
  departments: externalDepartments,
  facilities: externalFacilities,
  services: externalServices,
  wards: externalWards,
  observers: externalObservers,
  cities: externalCities,
  settings: externalSettings,
  defaultCountry = 'جمهورية مصر العربية',
  initialView = 'form',
  activeView,
  onViewChange,
  canAccessSettings = true,
  canEditRecords = true,
  canDeleteRecords = true,
  canCopyRecords = true,
  handlers,
  onSaveSession,
  onDeleteSession,
  onDeleteMonths,
  onUpdateSessionDate,
  onUpdateSessionDepartment,
  onSaveSettings,
  onAddFacility,
  onDeleteFacility,
  onTestTursoConnection,
  onImportTursoData,
  onSessionsChange,
}) => {
  const [internalView, setInternalView] = useState<ComplianceViewMode>(initialView);
  const view = activeView ?? internalView;

  const [editData, setEditData] = useState<SessionDataRecord | null>(initialSession);
  const [sessionsState, setSessionsState] = useState<SessionDataRecord[]>(() => {
    if (externalSessions) return resequenceSessionsByMonth(externalSessions);
    if (rawObservations) return parseSessionsFromRows(rawObservations);
    return [];
  });
  const [loadingSessions, setLoadingSessions] = useState<boolean>(
    externalSessions === undefined && rawObservations === undefined
  );
  const [internalSettings, setInternalSettings] = useState<AppSettings | null>(
    externalSettings ?? null
  );

  // Sync external sessions / rawObservations props
  useEffect(() => {
    if (externalSessions !== undefined) {
      setSessionsState(resequenceSessionsByMonth(externalSessions));
      setLoadingSessions(false);
    } else if (rawObservations !== undefined) {
      setSessionsState(parseSessionsFromRows(rawObservations));
      setLoadingSessions(false);
    }
  }, [externalSessions, rawObservations]);

  useEffect(() => {
    if (initialSession !== undefined) setEditData(initialSession);
  }, [initialSession]);

  useEffect(() => {
    if (externalSettings !== undefined) setInternalSettings(externalSettings);
  }, [externalSettings]);

  // Merge external lists (professionals, departments, facilities, etc.) with settings
  const mergedSettings = useMemo<AppSettings>(() => {
    const base: AppSettings = { ...DEFAULT_SETTINGS, ...(internalSettings || {}) };
    const normalizedProfs = normalizeStaffCategories(externalProfessionals);
    if (normalizedProfs.length > 0) {
      base.profCategories = normalizedProfs.map((p) => p.name);
    }
    const normalizedDepts = normalizeDepartments(externalDepartments);
    if (normalizedDepts.length > 0) {
      base.departments = normalizedDepts;
    }
    if (externalFacilities && externalFacilities.length > 0) base.facilities = externalFacilities;
    if (externalServices && externalServices.length > 0) base.services = externalServices;
    if (externalWards && externalWards.length > 0) base.wards = externalWards;
    if (externalObservers && externalObservers.length > 0) base.observers = externalObservers;
    if (externalCities && externalCities.length > 0) base.cities = externalCities;
    return base;
  }, [
    internalSettings,
    externalProfessionals,
    externalDepartments,
    externalFacilities,
    externalServices,
    externalWards,
    externalObservers,
    externalCities,
  ]);

  const loadObservations = async () => {
    setLoadingSessions(true);
    try {
      const loader = handlers?.loadObservations ?? defaultComplianceHandlers.loadObservations;
      const result = await loader();
      if (Array.isArray(result)) {
        const isStructured = result.length > 0 && 'sessionInfo' in result[0];
        const parsed = isStructured
          ? resequenceSessionsByMonth(result as SessionDataRecord[])
          : parseSessionsFromRows(result as RawObservationRow[]);
        setSessionsState(parsed);
        if (onSessionsChange) onSessionsChange(parsed);
      }
    } catch (err) {
      console.error('Failed to load observations:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSettings = async () => {
    try {
      const loader = handlers?.loadSettings ?? defaultComplianceHandlers.loadSettings;
      const res = await loader();
      if (res) setInternalSettings(res);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  // Auto-load on mount only if no external sessions/settings were provided
  useEffect(() => {
    if (externalSessions === undefined && rawObservations === undefined) {
      loadObservations();
    }
    if (externalSettings === undefined) {
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetView = (nextView: ComplianceViewMode) => {
    if (nextView !== 'form') setEditData(null);
    if (onViewChange) onViewChange(nextView);
    if (activeView === undefined) setInternalView(nextView);
  };

  const updateLocalSessions = (updater: (prev: SessionDataRecord[]) => SessionDataRecord[]) => {
    setSessionsState((prev) => {
      const next = resequenceSessionsByMonth(updater(prev));
      if (onSessionsChange) onSessionsChange(next);
      return next;
    });
  };

  // Separated Save Session Handler
  const handleSaveSession = async (payload: SaveSessionPayload): Promise<SaveResult> => {
    let result: SaveResult = { success: true, sessionId: payload.sessionId };

    if (onSaveSession) {
      const res = await onSaveSession(payload);
      if (res) result = res;
    } else if (handlers?.saveSession) {
      result = await handlers.saveSession(payload);
    } else {
      result = await defaultComplianceHandlers.saveSession(payload);
    }

    if (result && result.success !== false && !result.error) {
      const { professionals: pros, ...info } = payload;
      const normalizedRecord: SessionDataRecord = {
        sessionInfo: { ...info },
        professionals: pros.map((p, idx) => ({
          ...p,
          _colNo: p._colNo ?? (p._originalIndex !== undefined ? p._originalIndex + 1 : idx + 1),
        })),
      };

      updateLocalSessions((prev) => {
        const exists = prev.some((s) => s.sessionInfo.sessionId === payload.sessionId);
        if (exists) {
          return prev.map((s) =>
            s.sessionInfo.sessionId === payload.sessionId ? normalizedRecord : s
          );
        }
        return [normalizedRecord, ...prev];
      });
    }

    return result;
  };

  // Separated Delete Session Handler
  const handleDeleteSession = async (
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const previous = sessionsState;
    updateLocalSessions((prev) => prev.filter((s) => s.sessionInfo.sessionId !== sessionId));

    try {
      if (onDeleteSession) {
        const res = await onDeleteSession(sessionId);
        return res || { success: true };
      }
      if (handlers?.deleteSession) {
        return await handlers.deleteSession(sessionId);
      }
      return await defaultComplianceHandlers.deleteSession(sessionId);
    } catch (err: any) {
      setSessionsState(previous);
      throw err;
    }
  };

  // Separated Delete Months Handler
  const handleDeleteMonths = async (
    monthKeys: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    let res: { success: boolean; error?: string } = { success: true };
    if (onDeleteMonths) {
      const r = await onDeleteMonths(monthKeys);
      if (r) res = r;
    } else if (handlers?.deleteMonths) {
      res = await handlers.deleteMonths(monthKeys);
    } else {
      res = await defaultComplianceHandlers.deleteMonths(monthKeys);
    }

    updateLocalSessions((prev) =>
      prev.filter((s) => !monthKeys.includes(String(s.sessionInfo.date || '').slice(0, 7)))
    );
    return res;
  };

  // Separated Update Session Date Handler
  const handleUpdateSessionDate = async (
    payload: UpdateSessionDatePayload
  ): Promise<UpdateSessionDateResult> => {
    let res: UpdateSessionDateResult = { success: true };
    if (onUpdateSessionDate) {
      res = await onUpdateSessionDate(payload);
    } else if (handlers?.updateSessionDate) {
      res = await handlers.updateSessionDate(payload);
    } else {
      res = await defaultComplianceHandlers.updateSessionDate(payload);
    }

    updateLocalSessions((prev) =>
      prev.map((s) => {
        if (s.sessionInfo.sessionId !== payload.sessionId) return s;
        const d = new Date(payload.newDate);
        const periodNumber = !isNaN(d.getTime())
          ? String(d.getMonth() + 1)
          : s.sessionInfo.periodNumber;
        return {
          ...s,
          sessionInfo: {
            ...s.sessionInfo,
            date: payload.newDate,
            periodNumber,
            sessionNumber: res?.newSessionNo || s.sessionInfo.sessionNumber,
          },
        };
      })
    );

    return res;
  };

  // Separated Update Session Department Handler
  const handleUpdateSessionDepartment = async (
    payload: UpdateSessionDepartmentPayload
  ): Promise<{ success: boolean; error?: string }> => {
    const previous = sessionsState;
    updateLocalSessions((prev) =>
      prev.map((s) =>
        s.sessionInfo.sessionId === payload.sessionId
          ? { ...s, sessionInfo: { ...s.sessionInfo, department: payload.department } }
          : s
      )
    );

    try {
      if (onUpdateSessionDepartment) {
        const r = await onUpdateSessionDepartment(payload);
        return r || { success: true };
      }
      if (handlers?.updateSessionDepartment) {
        return await handlers.updateSessionDepartment(payload);
      }
      return await defaultComplianceHandlers.updateSessionDepartment(payload);
    } catch (err) {
      setSessionsState(previous);
      throw err;
    }
  };

  // Separated Save Settings Handler
  const handleSaveSettings = async (nextSettings: AppSettings): Promise<SaveSettingsResult> => {
    let res: SaveSettingsResult = { success: true, settings: nextSettings };
    if (onSaveSettings) {
      const r = await onSaveSettings(nextSettings);
      if (r) res = r;
    } else if (handlers?.saveSettings) {
      res = await handlers.saveSettings(nextSettings);
    } else {
      res = await defaultComplianceHandlers.saveSettings(nextSettings);
    }

    if (res && res.success !== false) {
      setInternalSettings(res.settings || nextSettings);
    }
    return res;
  };

  // Separated Facility Handlers
  const handleAddFacility = async (payload: { facility: string }): Promise<FacilityActionResult> => {
    let res: FacilityActionResult;
    if (onAddFacility) {
      res = await onAddFacility(payload);
    } else if (handlers?.addFacility) {
      res = await handlers.addFacility(payload);
    } else {
      res = await defaultComplianceHandlers.addFacility(payload);
    }
    if (res && res.success && res.settings) {
      setInternalSettings(res.settings);
    }
    return res;
  };

  const handleDeleteFacility = async (payload: { facility: string }): Promise<FacilityActionResult> => {
    let res: FacilityActionResult;
    if (onDeleteFacility) {
      res = await onDeleteFacility(payload);
    } else if (handlers?.deleteFacility) {
      res = await handlers.deleteFacility(payload);
    } else {
      res = await defaultComplianceHandlers.deleteFacility(payload);
    }
    if (res && res.success) {
      if (res.settings) setInternalSettings(res.settings);
      updateLocalSessions((prev) =>
        prev.filter(
          (s) =>
            (s.sessionInfo.facility || '').trim().toLowerCase() !==
            payload.facility.trim().toLowerCase()
        )
      );
    }
    return res;
  };

  // Separated Turso Handlers
  const handleTestTurso = (creds: { tursoUrl: string; tursoAuthToken: string }) => {
    if (onTestTursoConnection) return onTestTursoConnection(creds);
    if (handlers?.testTursoConnection) return handlers.testTursoConnection(creds);
    return defaultComplianceHandlers.testTursoConnection(creds);
  };

  const handleImportTurso = (payload: TursoImportPayload) => {
    if (onImportTursoData) return onImportTursoData(payload);
    if (handlers?.importTursoData) return handlers.importTursoData(payload);
    return defaultComplianceHandlers.importTursoData(payload);
  };

  return (
    <div className="min-h-screen print:min-h-0 bg-slate-50/50 pb-24 md:pb-10 app-container flex flex-col">
      <style>{COMPLIANCE_STYLES}</style>

      {/* Desktop Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 md:px-6 py-2 no-print shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg shadow-sm bg-[#F26522] text-white flex items-center justify-center p-1">
                <Icons.WHOLogo />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 text-sm leading-tight">WHO Hand Hygiene</span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                  Compliance Tool
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 hide-scrollbar md:justify-end">
            <div className="flex gap-1">
              <NavLink id="form" label="Form" icon={<Icons.Form />} currentView={view} setView={handleSetView} />
              <NavLink
                id="dashboard"
                label="Dashboard"
                icon={<Icons.Activity />}
                currentView={view}
                setView={handleSetView}
              />
              <NavLink
                id="records"
                label="Records"
                icon={<Icons.Database />}
                currentView={view}
                setView={handleSetView}
              />
              {canAccessSettings && (
                <NavLink
                  id="settings"
                  label="Settings"
                  icon={<Icons.Settings />}
                  currentView={view}
                  setView={handleSetView}
                />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-2 md:p-6 w-full mx-auto flex-1">
        <ErrorBoundary>
          {view === 'form' && (
            <ObservationForm
              initialData={editData}
              allSessions={sessionsState}
              onSaveSession={handleSaveSession}
              onSubmitSuccess={() => {
                setEditData(null);
                handleSetView('records');
              }}
              settings={mergedSettings}
              defaultCountry={defaultCountry}
              defaultProfessionalColumns={defaultProfessionalColumns}
            />
          )}
          {view === 'dashboard' && (
            <Dashboard sessions={sessionsState} loading={loadingSessions} settings={mergedSettings} />
          )}
          {view === 'records' && (
            <DataManager
              sessions={sessionsState}
              loading={loadingSessions}
              onRefresh={loadObservations}
              onEdit={(d) => {
                setEditData(d);
                handleSetView('form');
              }}
              settings={mergedSettings}
              canCopy={canCopyRecords}
              canEdit={canEditRecords}
              canDelete={canDeleteRecords}
              canAccessSettings={canAccessSettings}
              onSaveSession={handleSaveSession}
              onDeleteSession={handleDeleteSession}
              onDeleteMonths={handleDeleteMonths}
              onUpdateSessionDate={handleUpdateSessionDate}
              onUpdateSessionDepartment={handleUpdateSessionDepartment}
              onSaveSettings={handleSaveSettings}
              onTestTursoConnection={handleTestTurso}
              onImportTursoData={handleImportTurso}
              onRefreshSettings={loadSettings}
            />
          )}
          {view === 'settings' && canAccessSettings && (
            <SettingsPanel
              settings={mergedSettings}
              onSaveSettings={handleSaveSettings}
              onAddFacility={handleAddFacility}
              onDeleteFacility={handleDeleteFacility}
              onTestTursoConnection={handleTestTurso}
              onImportTursoData={handleImportTurso}
              onImportSuccess={() => {
                loadObservations();
                loadSettings();
              }}
              onNavigateToRecords={() => handleSetView('records')}
            />
          )}
        </ErrorBoundary>
      </div>

      <footer className="w-full text-center py-4 text-xs font-medium text-slate-400 no-print mt-auto">
        <div>Based on WHO Hand Hygiene Compliance Observation Form</div>
        <div className="mt-1">&copy; 2026 Dr. Fady Ezzat. All Rights Reserved</div>
      </footer>

      <MobileBottomNav
        currentView={view}
        setView={handleSetView}
        canAccessSettings={canAccessSettings}
      />
    </div>
  );
};

export default Compliance;
