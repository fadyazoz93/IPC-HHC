import * as XLSX from 'xlsx';

export interface OpportunityRecord {
  number: number | string;
  indications: string[];
  action: string;
  gloves: boolean;
}

export interface ProfessionalRecord {
  categoryCode: string;
  categoryName: string;
  _colNo?: number;
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
}

export interface AppSettings {
  header1?: string;
  header2?: string;
  header3?: string;
  profCategories?: string[];
  [key: string]: any;
}

export interface ProfCategoryDef {
  code: string;
  name: string;
}

const WHO_INDICATIONS = [
  { id: 'bef-pat', label: 'bef-pat.', fullLabel: 'Before touching a patient', arLabel: '1. قبل ملامسة المريض' },
  { id: 'bef-asept', label: 'bef-asept.', fullLabel: 'Before clean/ aseptic procedure', arLabel: '2. قبل الإجراء النظيف/المعقم' },
  { id: 'aft-bf', label: 'aft-b.f.', fullLabel: 'After body fluid exposure risk', arLabel: '3. بعد خطر التعرض لسوائل الجسم' },
  { id: 'aft-pat', label: 'aft-pat.', fullLabel: 'After touching a patient', arLabel: '4. بعد ملامسة المريض' },
  { id: 'aft-p-surr', label: 'aft.p.surr.', fullLabel: 'After touching patient surroundings', arLabel: '5. بعد ملامسة محيط المريض' },
];

const getProfCategoriesList = (settings?: AppSettings): ProfCategoryDef[] => {
  if (settings?.profCategories && settings.profCategories.length > 0) {
    return settings.profCategories.map((name, i) => ({ code: String(i + 1), name }));
  }
  return [
    { code: '1', name: 'أطباء' },
    { code: '2', name: 'تمريض' },
    { code: '3', name: 'مساعد تمريض' },
    { code: '4', name: 'عمال' },
  ];
};

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

interface ExportOptions {
  sessions: SessionDataRecord[];
  settings?: AppSettings;
  periodLabel?: string;
  fileNamePrefix?: string;
  annualSessions?: SessionDataRecord[];
  annualYear?: string | number;
}

/**
 * Generates and downloads a multi-sheet Excel (.xlsx) report entirely from in-memory client data
 * (0 extra database reads).
 */
export const exportReportsToExcel = ({
  sessions,
  settings,
  periodLabel,
  fileNamePrefix = 'Hand_Hygiene_Report',
  annualSessions,
  annualYear,
}: ExportOptions): boolean => {
  if (!sessions || sessions.length === 0) {
    return false;
  }

  const profCategories = getProfCategoriesList(settings);
  const header1 = settings?.header1 || 'مستشفى المنيا الجامعى للعيون';
  const header2 = settings?.header2 || 'وحدة مكافحة العدوي';
  const header3 = settings?.header3 || 'إحصائية غسيل الأيدي';

  // Sort sessions chronologically by date then sessionNumber
  const sortedSessions = [...sessions].sort((a, b) => {
    const dA = a.sessionInfo.date || '';
    const dB = b.sessionInfo.date || '';
    if (dA !== dB) return dA.localeCompare(dB);
    const nA = Number(a.sessionInfo.sessionNumber) || 0;
    const nB = Number(b.sessionInfo.sessionNumber) || 0;
    return nA - nB;
  });

  // Group sessions by month (YYYY-MM)
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

  // =========================================================================
  // AGGREGATE SUMMARY METRICS
  // =========================================================================
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

  // =========================================================================
  // SHEET 1: ملخص التقرير والإحصائيات (Executive Summary - RTL)
  // =========================================================================
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
    summaryRows.push([
      item.name,
      item.opp,
      item.hw,
      item.hr,
      act,
      item.missed,
      formatPct(act, item.opp),
    ]);
  });
  summaryRows.push([
    'الإجمالي الكلي (Grand Total)',
    grandOpp,
    grandHW,
    grandHR,
    grandCompliant,
    grandMissed,
    formatPct(grandCompliant, grandOpp),
  ]);

  summaryRows.push([]);
  summaryRows.push(['ثالثاً: نسبة الالتزام حسب اللحظات الخمس لمنظمة الصحة العالمية (5 Moments for Hand Hygiene)']);
  summaryRows.push(['اللحظة (الاستطباب)', 'WHO Indication', 'إجمالي الفرص (Opp)', 'غسيل (HW)', 'دلك بالكحول (HR)', 'إجمالي الالتزام (Act)', 'الفرص الفائتة (Missed)', 'نسبة الالتزام (%)']);

  WHO_INDICATIONS.forEach((ind) => {
    const m = byMoment[ind.id];
    const act = m.hw + m.hr;
    summaryRows.push([
      m.arLabel,
      m.enLabel,
      m.opp,
      m.hw,
      m.hr,
      act,
      m.missed,
      formatPct(act, m.opp),
    ]);
  });

  summaryRows.push([]);
  summaryRows.push(['رابعاً: نسبة الالتزام حسب الأقسام والعيادات (Compliance by Department)']);
  summaryRows.push(['القسم / العيادة (Department)', 'عدد الجلسات', 'إجمالي الفرص (Opp)', 'غسيل (HW)', 'دلك بالكحول (HR)', 'إجمالي الالتزام (Act)', 'الفرص الفائتة (Missed)', 'نسبة الالتزام (%)']);

  Object.keys(byDept)
    .sort((a, b) => a.localeCompare(b, 'ar'))
    .forEach((dept) => {
      const d = byDept[dept];
      const act = d.hw + d.hr;
      summaryRows.push([
        dept,
        d.sessions.size,
        d.opp,
        d.hw,
        d.hr,
        act,
        d.missed,
        formatPct(act, d.opp),
      ]);
    });

  // Monthly breakdown (either from selected months or annualSessions if provided)
  const trendSource = annualSessions && annualSessions.length > 0 ? annualSessions : sortedSessions;
  const trendMap = new Map<string, { sessions: number; opp: number; hw: number; hr: number; missed: number }>();
  trendSource.forEach((s) => {
    const mKey = (s.sessionInfo.date || '').slice(0, 7) || 'unknown';
    if (!trendMap.has(mKey)) {
      trendMap.set(mKey, { sessions: 0, opp: 0, hw: 0, hr: 0, missed: 0 });
    }
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
        summaryRows.push([
          formatMonthLabel(mKey),
          mKey,
          t.sessions,
          t.opp,
          t.hw,
          t.hr,
          act,
          formatPct(act, t.opp),
        ]);
      });
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!views'] = [{ rightToLeft: true }];
  wsSummary['!cols'] = [
    { wch: 36 },
    { wch: 30 },
    { wch: 22 },
    { wch: 24 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
  ];
  wsSummary['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 6 } },
  ];

  // =========================================================================
  // SHEET 2: Basic Compliance Matrix (WHO Standard Table)
  // =========================================================================
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

    // Banner rows for this month
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

    // Category group header row
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

    // Sub-header row (Session N° | Opp | HW | HR ...)
    const subHeaderRow: any[] = ['Session N°'];
    profCategories.forEach(() => {
      subHeaderRow.push('Opp', 'HW', 'HR');
    });
    subHeaderRow.push('Opp', 'HW', 'HR');
    basicRows.push(subHeaderRow);

    // Aggregate per session number
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

    // Total Calculation Row
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

    // Compliance % Row
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
  wsBasic['!cols'] = [
    { wch: 20 },
    ...Array.from({ length: totalBasicCols - 1 }, () => ({ wch: 9 })),
  ];

  // =========================================================================
  // SHEET 3: Moments Compliance Matrix (WHO 5 Indications Table)
  // =========================================================================
  const momentsRows: any[][] = [];
  const momentsMerges: XLSX.Range[] = [];
  const totalMomentsCols = 1 + WHO_INDICATIONS.length * 3; // 16 columns

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
    WHO_INDICATIONS.forEach(() => {
      subHeaderRow.push('Opp', 'HW', 'HR');
    });
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

    // Total Calculation Row
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

    // Compliance Row
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
  wsMoments['!cols'] = [
    { wch: 20 },
    ...Array.from({ length: totalMomentsCols - 1 }, () => ({ wch: 10 })),
  ];

  // =========================================================================
  // SHEET 4: سجل الجلسات (Sessions Summary - RTL)
  // =========================================================================
  const sessionsHeader = [
    'الشهر',
    'رقم الجلسة',
    'التاريخ',
    'المنشأة (Facility)',
    'القسم / العيادة (Department)',
    'الخدمة (Service)',
    'العنبر (Ward)',
    'الملاحظ (Observer)',
    'وقت البدء',
    'وقت الانتهاء',
    'المدة (دقيقة)',
    'رقم الصفحة',
    'إجمالي الفرص',
    'دلك بالكحول (HR)',
    'غسيل بالماء والصابون (HW)',
    'إجمالي الالتزام',
    'الفرص الفائتة (Missed)',
    'ارتداء قفازات',
    'نسبة الالتزام (%)',
  ];

  const sessionsRows: any[][] = [sessionsHeader];

  sortedSessions.forEach((s) => {
    const info = s.sessionInfo;
    let sOpp = 0;
    let sHR = 0;
    let sHW = 0;
    let sMissed = 0;
    let sGloves = 0;

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
      formatMonthLabel(mKey),
      Number(info.sessionNumber) || info.sessionNumber || '',
      info.date || '',
      info.facility || '',
      info.department || '',
      info.service || '',
      info.ward || '',
      info.observer || '',
      info.startTime || '',
      info.endTime || '',
      info.duration !== undefined && info.duration !== null ? info.duration : '',
      info.pageNumber || '',
      sOpp,
      sHR,
      sHW,
      sHR + sHW,
      sMissed,
      sGloves,
      formatPct(sHR + sHW, sOpp),
    ]);
  });

  const wsSessions = XLSX.utils.aoa_to_sheet(sessionsRows);
  wsSessions['!views'] = [{ rightToLeft: true }];
  wsSessions['!cols'] = [
    { wch: 24 },
    { wch: 12 },
    { wch: 14 },
    { wch: 24 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 20 },
    { wch: 15 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
  ];

  // =========================================================================
  // SHEET 5: البيانات التفصيلية للفرص (Detailed Opportunities - RTL)
  // =========================================================================
  const detailHeader = [
    'الشهر',
    'رقم الجلسة',
    'التاريخ',
    'المنشأة',
    'القسم / العيادة',
    'الخدمة',
    'العنبر',
    'الملاحظ',
    'كود الفئة',
    'الفئة المهنية',
    'رقم الفرصة',
    'قبل ملامسة المريض (bef-pat)',
    'قبل إجراء نظيف/معقم (bef-asept)',
    'بعد خطر سوائل الجسم (aft-b.f)',
    'بعد ملامسة المريض (aft-pat)',
    'بعد ملامسة محيط المريض (aft.p.surr)',
    'الإجراء (HR/HW/Missed)',
    'حالة الالتزام',
    'ارتداء القفازات',
  ];

  const detailRows: any[][] = [detailHeader];

  sortedSessions.forEach((s) => {
    const info = s.sessionInfo;
    const mKey = (info.date || '').slice(0, 7) || 'unknown';
    const monthStr = formatMonthLabel(mKey);

    s.professionals.forEach((prof) => {
      prof.opportunities.forEach((opp) => {
        if ((opp.indications && opp.indications.length > 0) || opp.action) {
          const isCompliant = opp.action === 'HR' || opp.action === 'HW';
          detailRows.push([
            monthStr,
            Number(info.sessionNumber) || info.sessionNumber || '',
            info.date || '',
            info.facility || '',
            info.department || '',
            info.service || '',
            info.ward || '',
            info.observer || '',
            prof.categoryCode || '',
            prof.categoryName || '',
            opp.number || '',
            opp.indications?.includes('bef-pat') ? 'نعم' : 'لا',
            opp.indications?.includes('bef-asept') ? 'نعم' : 'لا',
            opp.indications?.includes('aft-bf') ? 'نعم' : 'لا',
            opp.indications?.includes('aft-pat') ? 'نعم' : 'لا',
            opp.indications?.includes('aft-p-surr') ? 'نعم' : 'لا',
            opp.action || 'Missed',
            isCompliant ? 'ملتزم' : 'غير ملتزم',
            opp.gloves ? 'نعم' : 'لا',
          ]);
        }
      });
    });
  });

  const wsDetails = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetails['!views'] = [{ rightToLeft: true }];
  wsDetails['!cols'] = [
    { wch: 22 },
    { wch: 11 },
    { wch: 13 },
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 15 },
    { wch: 16 },
    { wch: 10 },
    { wch: 18 },
    { wch: 11 },
    { wch: 22 },
    { wch: 24 },
    { wch: 22 },
    { wch: 20 },
    { wch: 25 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
  ];

  // =========================================================================
  // BUILD WORKBOOK & DOWNLOAD
  // =========================================================================
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
