
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
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
  Cell
} from 'recharts';
import { exportReportsToExcel } from './src/utils/excelExport';
import { TursoImportModal } from './src/components/TursoImportModal';
import { CenterLoginScreen } from './src/components/CenterLoginScreen';

(window as any).React = React;
(window as any).ReactDOM = ReactDOM;

      // =========================================================================
      // AUTH TOKEN STORAGE HELPERS
      // =========================================================================
      const AUTH_TOKEN_KEY = 'who_hh_auth_token';
      const getStoredAuthToken = (): string => {
          try { return localStorage.getItem(AUTH_TOKEN_KEY) || ''; } catch { return ''; }
      };
      const setStoredAuthToken = (token: string) => {
          try {
              if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
              else localStorage.removeItem(AUTH_TOKEN_KEY);
          } catch {}
      };
      const clearStoredAuthToken = () => {
          try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch {}
      };

      // =========================================================================
      // DATABASE CONFIGURATION (TURSO SQLITE BACKEND via VERCEL API)
      // =========================================================================
      let GAS_WEB_APP_URL = "/api"; 
      
      console.log("🔗 API Endpoint: ", GAS_WEB_APP_URL);

      if (typeof google === 'undefined') {
        const createRunner = (onSuccess, onFailure) => {
          const execute = (action, data) => {
             const isGetAction = action === 'getObservationData' || action === 'getSettings' || action === 'verifySession' || action === 'getFacilitiesSummary';
             const token = getStoredAuthToken();
             const headers: Record<string, string> = {};
             if (token) {
                headers['Authorization'] = `Bearer ${token}`;
             }
             
             let fetchPromise;
             
             if (isGetAction) {
                // Use GET request for fetching data
                let extraParams = '';
                if (data && typeof data === 'object') {
                   Object.keys(data).forEach(k => {
                      if (data[k] !== undefined && data[k] !== null) {
                         extraParams += `&${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`;
                      }
                   });
                }
                const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
                const urlWithParams = `${GAS_WEB_APP_URL}?action=${action}${tokenParam}${extraParams}`;
                fetchPromise = fetch(urlWithParams, {
                   method: 'GET',
                   headers,
                   redirect: 'follow'
                });
             } else {
                // Use POST request for saving/deleting/login
                headers['Content-Type'] = 'text/plain;charset=utf-8';
                fetchPromise = fetch(GAS_WEB_APP_URL, {
                   method: 'POST',
                   body: JSON.stringify({ action: action, data: data, token }),
                   headers,
                   redirect: 'follow'
                });
             }
             
             fetchPromise
             .then(resp => resp.json())
             .then(result => {
                if (result && result.error && action !== 'login') { if (onFailure) onFailure(result.error); }
                else { if (onSuccess) onSuccess(result); }
             })
             .catch(err => {
                console.error("Fetch error:", err);
                if (onFailure) onFailure(err);
             });
          };

          return {
            withSuccessHandler: (fn) => createRunner(fn, onFailure),
            withFailureHandler: (fn) => createRunner(onSuccess, fn),
            login: (d) => execute('login', d),
            verifySession: () => execute('verifySession'),
            saveObservationData: (d) => execute('saveObservationData', d),
            getObservationData: (d) => execute('getObservationData', d),
            deleteSession: (d) => execute('deleteSession', d),
            deleteMonth: (d) => execute('deleteMonth', d),
            updateSessionDate: (d) => execute('updateSessionDate', d),
            updateSessionDepartment: (d) => execute('updateSessionDepartment', d),
            getSettings: (d) => execute('getSettings', d),
            saveSettings: (d) => execute('saveSettings', d),
            testTursoConnection: (d) => execute('testTursoConnection', d),
            importTursoData: (d) => execute('importTursoData', d),
            getFacilitiesSummary: () => execute('getFacilitiesSummary'),
            addFacility: (d) => execute('addFacility', d),
            deleteFacility: (d) => execute('deleteFacility', d)
          };
        };
        window.google = { script: { run: createRunner(null, null) } };
      }


      
      const getProfCategories = (settings) => {
          if (settings && settings.profCategories && settings.profCategories.length > 0) {
              return settings.profCategories.map((name, i) => ({ code: String(i + 1), name }));
          }
          return [
            {code:"1",name:"أطباء"},
            {code:"2",name:"تمريض"},
            {code:"3",name:"مساعد تمريض"},
            {code:"4",name:"عمال"}
          ];
      };
      
      const INDICATIONS = [{id:'bef-pat',label:'bef-pat.', fullLabel: 'Before touching a patient', dbCol: 'Ind: Bef. Pat'},{id:'bef-asept',label:'bef-asept.', fullLabel: 'Before clean/ aseptic procedure', dbCol: 'Ind: Bef. Asept'},{id:'aft-bf',label:'aft-b.f.', fullLabel: 'After body fluid exposure risk', dbCol: 'Ind: Aft. Body Fluid'},{id:'aft-pat',label:'aft-pat.', fullLabel: 'After touching a patient', dbCol: 'Ind: Aft. Pat'},{id:'aft-p-surr',label:'aft.p.surr.', fullLabel: 'After touching patient surroundings', dbCol: 'Ind: Aft. Surround'}];
      const uuidv4 = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { var r=Math.random()*16|0,v=c=='x'?r:(r&0x3|0x8);return v.toString(16); });

      const Icons = {
        Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
        Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
        Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
        Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
        X: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
        Print: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>,
        Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
        Excel: () => <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><line x1="12" y1="11" x2="12" y2="19"></line></svg>,
        Eye: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8-11-8-11-8-11-8-11-8-11-8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
        Spinner: () => <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>,
        Form: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
        Chart: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
        Database: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>,
        Clipboard: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>,
        Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
        Activity: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
        Settings: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
        Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
        Logout: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
        WHOLogo: () => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
             <path d="M12 3v18" strokeWidth={2} strokeLinecap="round"/>
             <path d="M10 8c4-1 6-4 6-4s0 4-4 6c-4 2-4 5-1 7" strokeLinecap="round" strokeLinejoin="round"/>
             <circle cx="12" cy="12" r="9" strokeWidth={1} strokeDasharray="2 2" className="opacity-50"/>
             <path d="M5 14c-1-2-1-5 1-7" strokeWidth={1} className="opacity-70"/>
             <path d="M19 14c1-2 1-5-1-7" strokeWidth={1} className="opacity-70"/>
          </svg>
        )
      };

      const calculateBasicStats = (filteredData, profCategories) => {
          if (!filteredData || filteredData.length === 0) return null;
          const first = filteredData[0].sessionInfo;
          const headerInfo = { facility: first.facility || 'Various', period: first.periodNumber || 'Various', setting: `${first.service || 'Mixed'} / ${first.ward || 'Mixed'}` };
          const sessions = {};
          const colTotals = { grandTotal: { opp: 0, hw: 0, hr: 0 } };
          profCategories.forEach(c => colTotals[c.code] = { opp: 0, hw: 0, hr: 0 });

          filteredData.forEach(session => {
              const sNo = session.sessionInfo.sessionNumber || 'Unknown';
              // Initialize session entry if not exists
              if (!sessions[sNo]) {
                  sessions[sNo] = { total: { opp: 0, hw: 0, hr: 0 } };
                  profCategories.forEach(c => sessions[sNo][c.code] = { opp: 0, hw: 0, hr: 0 });
              }
              
              session.professionals.forEach(prof => {
                  const catCode = String(prof.categoryCode);
                  if (profCategories.find(c => c.code === catCode)) {
                      prof.opportunities.forEach(opp => {
                          // Check if opportunity has data
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
          return { headerInfo, sessions, sortedSessionKeys: Object.keys(sessions).sort((a,b) => (parseInt(a)||a) - (parseInt(b)||b)), colTotals };
      };

      const calculateMomentsStats = (filteredData) => {
          if (!filteredData || filteredData.length === 0) return null;
          const first = filteredData[0].sessionInfo;
          const headerInfo = { facility: first.facility || 'Various', period: first.periodNumber || 'Various', setting: `${first.service || 'Mixed'} / ${first.ward || 'Mixed'}` };
          const sessions = {};
          const colTotals = {};
          INDICATIONS.forEach(ind => { colTotals[ind.id] = { indic: 0, hw: 0, hr: 0 }; });

          filteredData.forEach(session => {
              const sNo = session.sessionInfo.sessionNumber || 'Unknown';
              if (!sessions[sNo]) { sessions[sNo] = {}; INDICATIONS.forEach(ind => { sessions[sNo][ind.id] = { indic: 0, hw: 0, hr: 0 }; }); }
              
              session.professionals.forEach(prof => {
                 prof.opportunities.forEach(opp => {
                     INDICATIONS.forEach(ind => {
                         if(opp.indications.includes(ind.id)) {
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
          return { headerInfo, sessions, sortedSessionKeys: Object.keys(sessions).sort((a,b) => (parseInt(a)||a) - (parseInt(b)||b)), colTotals };
      };

      const renderBasicTable = (basicReportData, profCategories) => {
          if(!basicReportData) return null;
          const profCodes = profCategories.map(c => c.code);
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
                        <col style={{width: '16.66%'}} />
                        {Array.from({length: totalCols - 1}).map((_, i) => <col key={i} style={{width: `${83.33 / (totalCols - 1)}%`}} />)}
                      </colgroup>
                      <thead>
                        <tr className="bg-orange-100 header-row">
                          <th className="p-1 text-left bg-orange-200 font-bold group-divider" colSpan="4">Facility: {basicReportData.headerInfo.facility}</th>
                          <th className="p-1 text-left bg-orange-200 font-bold group-divider" colSpan="4">Period: {basicReportData.headerInfo.period}</th>
                          <th className="p-1 text-left bg-orange-200 font-bold" colSpan={settingColSpan}>Setting: {basicReportData.headerInfo.setting}</th>
                        </tr>
                        <tr className="bg-orange-50">
                          <th className="p-1 text-center group-divider"></th>
                          {profCategories.map((c,i) => <th key={i} className={`p-1 text-center group-divider`} colSpan="3"><div className="text-[8px] font-normal italic">Prof.cat.</div>{c.name}</th>)}
                          <th className="p-1 text-center bg-orange-100 align-bottom font-bold" colSpan="3">Total per session</th>
                        </tr>
                        <tr className="bg-orange-50 font-bold">
                          <th className="p-1 text-center group-divider">Session N°</th>
                          {profCodes.map(k => (<React.Fragment key={k}><th className="p-1 text-center">Opp</th><th className="p-1 text-center">HW</th><th className="p-1 text-center group-divider">HR</th></React.Fragment>))}
                          <th className="p-1 text-center bg-orange-100">Opp</th><th className="p-1 text-center bg-orange-100">HW</th><th className="p-1 text-center bg-orange-100">HR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {basicReportData.sortedSessionKeys.map(sNo => {
                           const sData = basicReportData.sessions[sNo];
                           return (
                             <tr key={sNo} className="odd:bg-white even:bg-slate-50 hover:bg-orange-50 transition-colors">
                               <td className="p-1 text-center font-bold bg-slate-100 group-divider">{sNo}</td>
                               {profCodes.map(k => (<React.Fragment key={k}><td className="p-1 text-center">{sData[k]?.opp || ''}</td><td className="p-1 text-center">{sData[k]?.hw || ''}</td><td className="p-1 text-center group-divider">{sData[k]?.hr || ''}</td></React.Fragment>))}
                               <td className="p-1 text-center font-bold bg-orange-50">{sData.total.opp || ''}</td><td className="p-1 text-center font-bold bg-orange-50">{sData.total.hw || ''}</td><td className="p-1 text-center font-bold bg-orange-50">{sData.total.hr || ''}</td>
                             </tr>
                           );
                        })}
                        <tr className="total-row bg-slate-50">
                          <td className="p-1 text-center font-bold text-[11px] leading-tight bg-slate-200 group-divider">Total<br/>Calculation</td>
                          {profCodes.map(k => (<td key={k} className="p-0 diagonal-split group-divider" colSpan="3"><div className="h-14 w-full relative"><div className="absolute top-0.5 right-0.5 text-[11px] font-bold z-10 text-slate-700">Act={basicReportData.colTotals[k].hw+basicReportData.colTotals[k].hr}</div><div className="absolute bottom-0.5 left-0.5 text-[11px] font-bold z-10 text-slate-700">Opp={basicReportData.colTotals[k].opp}</div></div></td>))}
                          <td className="p-0 diagonal-split bg-orange-50" colSpan="3"><div className="h-14 w-full relative"><div className="absolute top-0.5 right-0.5 text-[11px] font-bold z-10 text-orange-900">Act={basicReportData.colTotals.grandTotal.hw + basicReportData.colTotals.grandTotal.hr}</div><div className="absolute bottom-0.5 left-0.5 text-[11px] font-bold z-10 text-orange-900">Opp={basicReportData.colTotals.grandTotal.opp}</div></div></td>
                        </tr>
                        <tr className="bg-orange-100 font-bold">
                           <td className="p-1 text-center text-[12px] uppercase tracking-tighter bg-orange-200 group-divider">Compliance</td>
                           {profCodes.map(k => { const tot = basicReportData.colTotals[k]; const acts = tot.hw + tot.hr; const pct = tot.opp > 0 ? ((acts / tot.opp) * 100).toFixed(2) : "0.00"; return (<td key={k} className="p-1 text-center text-xl font-black group-divider" colSpan="3">{pct}%</td>); })}
                           <td className="p-1 text-center bg-orange-200 text-black border-l-2 border-black" colSpan="3"><div className="text-[11px] font-bold uppercase text-slate-700 mb-1">Grand Total</div><div className="text-3xl font-black">{(() => { const gt = basicReportData.colTotals.grandTotal; const acts = gt.hw + gt.hr; return gt.opp > 0 ? ((acts / gt.opp) * 100).toFixed(2) : "0.00"; })()}%</div></td>
                        </tr>
                      </tbody>
                   </table>
                   </div>
                </div>
          );
      };
      
      const renderMomentsTable = (momentsReportData) => {
          if(!momentsReportData) return null;
          return (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden print:overflow-visible print:shadow-none print:border-none print:w-full">
                   <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center print:hidden">
                     <h3 className="font-bold text-slate-700">Detailed Moments Compliance Matrix</h3>
                   </div>
                   <div className="overflow-x-auto pb-4 p-4 print:p-0 print:overflow-visible report-table-wrapper">
                   <table className="w-full border-collapse report-table text-xs text-black shadow-sm print:shadow-none print:text-[8pt] print:w-full">
                      <colgroup>
                        <col style={{width: '16.66%'}} />
                        {Array.from({length: 15}).map((_, i) => <col key={i} style={{width: '5.55%'}} />)}
                      </colgroup>
                      <thead>
                        <tr className="bg-orange-100 header-row">
                          <th className="p-1 text-left bg-orange-200 font-bold group-divider" colSpan="4">Facility: {momentsReportData.headerInfo.facility}</th>
                          <th className="p-1 text-left bg-orange-200 font-bold group-divider" colSpan={4}>Period: {momentsReportData.headerInfo.period}</th>
                          <th className="p-1 text-left bg-orange-200 font-bold" colSpan={8}>Setting: {momentsReportData.headerInfo.setting}</th>
                        </tr>
                        <tr className="bg-orange-50">
                          <th className="p-1 text-center group-divider"></th>
                          {INDICATIONS.map((ind,i) => <th key={i} className={`p-1 text-center group-divider`} colSpan="3"><div className="text-[8px] font-normal italic">Indication</div>{ind.label}</th>)}
                        </tr>
                        <tr className="bg-orange-50 font-bold">
                          <th className="p-1 text-center group-divider">Session N°</th>
                          {INDICATIONS.map(ind => (<React.Fragment key={ind.id}><th className="p-1 text-center">Opp</th><th className="p-1 text-center">HW</th><th className="p-1 text-center group-divider">HR</th></React.Fragment>))}
                        </tr>
                      </thead>
                      <tbody>
                        {momentsReportData.sortedSessionKeys.map(sNo => {
                           const sData = momentsReportData.sessions[sNo];
                           return (
                             <tr key={sNo} className="odd:bg-white even:bg-slate-50 hover:bg-orange-50 transition-colors">
                               <td className="p-1 text-center font-bold bg-slate-100 group-divider">{sNo}</td>
                               {INDICATIONS.map(ind => {
                                   const d = sData[ind.id];
                                   return (<React.Fragment key={ind.id}><td className="p-1 text-center">{d.indic || ''}</td><td className="p-1 text-center">{d.hw || ''}</td><td className="p-1 text-center group-divider">{d.hr || ''}</td></React.Fragment>);
                               })}
                             </tr>
                           );
                        })}
                        <tr className="total-row bg-slate-50">
                          <td className="p-1 text-center font-bold text-[11px] leading-tight bg-slate-200 group-divider">Total<br/>Calculation</td>
                          {INDICATIONS.map(ind => (<td key={ind.id} className="p-0 diagonal-split group-divider" colSpan="3"><div className="h-14 w-full relative"><div className="absolute top-0.5 right-0.5 text-[11px] font-bold z-10 text-slate-700">Act={momentsReportData.colTotals[ind.id].hw+momentsReportData.colTotals[ind.id].hr}</div><div className="absolute bottom-0.5 left-0.5 text-[11px] font-bold z-10 text-slate-700">Opp={momentsReportData.colTotals[ind.id].indic}</div></div></td>))}
                        </tr>
                        <tr className="bg-orange-100 font-bold">
                           <td className="p-1 text-center text-[12px] uppercase tracking-tighter bg-orange-200 group-divider">Compliance</td>
                           {INDICATIONS.map(ind => { const tot = momentsReportData.colTotals[ind.id]; const acts = tot.indic > 0 ? (((tot.hw + tot.hr) / tot.indic) * 100).toFixed(2) : "0.00"; return (<td key={ind.id} className="p-1 text-center text-xl font-black group-divider" colSpan="3">{acts}%</td>); })}
                        </tr>
                      </tbody>
                   </table>
                   </div>
                </div>
          );
      };

      const FormCheckbox = ({ checked, onChange, label, readOnly = false }) => (
         <div className={`flex items-center mb-0.5 print:mb-0 ${readOnly ? '' : 'cursor-pointer select-none'}`} onClick={() => !readOnly && onChange && onChange(!checked)}>
            <div className={`form-checkbox ${checked ? 'checked' : ''}`}></div>
            <span className="text-[10px] md:text-[11px] leading-tight print:text-[12pt] print:font-bold print:tracking-tight">{label}</span>
         </div>
      );
      
      const FormRadio = ({ checked, onChange, label, readOnly = false }) => (
         <div className={`flex items-center mb-0.5 print:mb-0 ${readOnly ? '' : 'cursor-pointer select-none'}`} onClick={() => !readOnly && onChange && onChange()}>
            <div className={`form-radio ${checked ? 'checked' : ''}`}></div>
            <span className="text-[10px] md:text-[11px] leading-tight print:text-[12pt] print:font-bold print:tracking-tight">{label}</span>
         </div>
      );
      
      const FormInputRow = ({ label, value, onChange, type="text", readOnly = false, options = null }) => (
         <div className="flex flex-col md:flex-row md:items-center mb-3 md:mb-1 print:mb-1 print:flex-row print:items-center form-input-row">
            <label className="text-xs font-bold text-gray-700 mb-1 md:mb-0 md:w-32 flex-shrink-0 print:w-36 print:text-[12px] print:mb-0">{label}</label>
            {readOnly ? (
               <div className="form-input-print-text w-full">{value !== undefined && value !== null ? value : ''}</div>
            ) : (
               <>
                 {options && options.length > 0 ? (
                    <select className="form-input-bg h-9 md:h-7 text-base md:text-sm print:hidden" value={value !== undefined && value !== null ? value : ''} onChange={onChange}>
                       <option value="">Select...</option>
                       {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                    </select>
                 ) : (
                    <input type={type} className="form-input-bg h-9 md:h-7 text-base md:text-sm print:hidden" value={value !== undefined && value !== null ? value : ''} onChange={onChange} />
                 )}
                 <div className="hidden print:block form-input-print-text w-full">{value !== undefined && value !== null ? value : ''}</div>
               </>
            )}
         </div>
      );

      const OpportunityBlock = ({ opp, index, onChange, readOnly = false }) => {
         const toggleInd = (id) => {
            if (readOnly) return;
            const has = opp.indications.includes(id);
            onChange({ ...opp, indications: has ? opp.indications.filter(x => x !== id) : [...opp.indications, id] });
         };
         return (
            <tr className={`border-b border-gray-400 bg-white hover:bg-orange-50 transition-colors ${readOnly ? 'opp-row-readonly' : 'h-32 md:h-24 print-opp-row'}`}>
               <td className="bg-[#ffe4cc] text-center font-bold text-sm border-r border-gray-400 w-8 text-gray-900 print:w-[15%] print:border-r-2 print:border-black print:bg-[#ffe4cc]">{index + 1}</td>
               <td className="p-2 md:p-1 border-r border-gray-400 align-top w-32 md:w-28 print:p-0.5 print:w-[40%] print:border-r-2 print:border-black">
                  <div className="flex flex-col gap-1.5 md:gap-0">
                    {INDICATIONS.map(ind => (<FormCheckbox key={ind.id} label={ind.label} checked={opp.indications.includes(ind.id)} onChange={() => toggleInd(ind.id)} readOnly={readOnly} />))}
                  </div>
               </td>
               <td className="p-2 md:p-1 align-top print:p-0.5 print:w-[45%]">
                  <div className="flex flex-col gap-1.5 md:gap-0">
                    <FormCheckbox label="HR" checked={opp.action === 'HR'} onChange={(v) => !readOnly && onChange({ ...opp, action: v ? 'HR' : '' })} readOnly={readOnly} />
                    <FormCheckbox label="HW" checked={opp.action === 'HW'} onChange={(v) => !readOnly && onChange({ ...opp, action: v ? 'HW' : '' })} readOnly={readOnly} />
                    <FormRadio label="missed" checked={opp.action === 'Missed' || opp.action === 'None'} onChange={() => !readOnly && onChange({ ...opp, action: 'Missed' })} readOnly={readOnly} />
                    <div className="mt-1 md:mt-0.5"><FormRadio label="gloves" checked={opp.gloves} onChange={() => !readOnly && onChange({ ...opp, gloves: !opp.gloves })} readOnly={readOnly} /></div>
                  </div>
               </td>
            </tr>
         );
      };

      const ProfessionalColumn = ({ prof, pIndex, onUpdate, readOnly = false, profCategories }) => {
         const opportunities = useMemo(() => {
            const slots = [];
            for(let i=0; i<8; i++) {
                const existing = prof.opportunities.find(o => parseInt(o.number) === i + 1);
                slots.push(existing || { id: `v-${pIndex}-${i}`, number: i+1, indications: [], action: '', gloves: false });
            }
            return slots;
         }, [prof.opportunities]);

         return (
            <div className="prof-col flex flex-col h-full print:h-auto prof-col-container">
               <div className="bg-[#ffe4cc] p-1 border-b border-gray-400 print:border-b-2 print:border-black h-12 md:h-10 flex flex-col justify-center prof-header-row">
                  <div className="flex justify-between items-center px-1 h-full print:h-auto w-full">
                     <span className="font-bold text-xs shrink-0 mr-1 prof-cat-label text-gray-900">Prof.cat</span>
                     {readOnly ? (
                        <div className="text-[10px] font-bold bg-white px-2 py-0.5 border border-gray-400 truncate w-full text-center flex items-center justify-center h-6 prof-cat-val-container print:h-auto print:leading-none">{prof.categoryName || 'N/A'}</div>
                     ) : (
                        <React.Fragment>
                           <select className="border border-gray-400 text-sm md:text-xs h-8 md:h-auto w-28 md:w-28 bg-white print:hidden focus:ring-1 focus:ring-orange-500 rounded" value={prof.categoryCode} onChange={(e) => { const cat = profCategories.find(c => c.code === e.target.value); onUpdate({ ...prof, categoryCode: e.target.value, categoryName: cat ? cat.name : '' }); }}>
                             <option value="">Select...</option>{profCategories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                           </select>
                           <div className="hidden print:flex text-[10px] font-bold bg-white px-2 py-0.5 border border-gray-400 truncate w-full text-center items-center justify-center h-auto leading-none prof-cat-val-container">{prof.categoryName || ''}</div>
                        </React.Fragment>
                     )}
                  </div>
               </div>
               <table className="w-full text-left border-collapse prof-col-table">
                  <thead className="opp-header"><tr className="bg-[#ffe4cc] border-b border-gray-800 print:border-b-2 print:border-black text-[10px] font-bold text-gray-900"><th className="border-r border-gray-400 text-center w-8 py-1 print:w-[15%] print:text-center print:border-r-2 print:border-black">Opp.</th><th className="border-r border-gray-400 pl-2 print:w-[40%] print:border-r-2 print:border-black print:text-left">Indication</th><th className="pl-2 print:w-[45%] print:text-left">HH Action</th></tr></thead>
                  <tbody>{opportunities.map((opp, idx) => (<OpportunityBlock key={idx} index={idx} opp={opp} readOnly={readOnly} onChange={(u) => !readOnly && onUpdate({ ...prof, opportunities: opportunities.map((o,i) => i === idx ? u : o) })} />))}</tbody>
               </table>
            </div>
         );
      };

      const formatGoogleDriveUrl = (url) => {
         if (!url || typeof url !== 'string') return '';
         const trimmed = url.trim();
         if (!trimmed) return '';

         if (trimmed.includes('drive.google.com/thumbnail') || trimmed.includes('lh3.googleusercontent.com/d/')) {
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

      const WHOHeader = ({ small = false, settings }) => {
         const leftLogo = formatGoogleDriveUrl(settings?.logoLeft);
         const rightLogo = formatGoogleDriveUrl(settings?.logoRight);

         return (
            <div className={`who-header-bg text-white border-b-4 border-[#c1501b] transition-all duration-300 ${small ? 'py-1.5 px-3 md:py-2 md:px-4' : 'py-2 px-4 md:py-3 md:px-6'} print:px-4 print:py-1.5 print:border-[#c1501b] flex items-center justify-center relative overflow-hidden`}>
               <div className="w-full flex items-center justify-between" dir="ltr">
                  {/* Left Logo (جهة اليسار) */}
                  <div className="w-20 md:w-28 print:w-20 shrink-0 flex items-center justify-start overflow-hidden">
                     {leftLogo ? (
                        <img 
                           src={leftLogo} 
                           alt="Logo Left" 
                           className="who-header-logo max-h-12 md:max-h-14 print:max-h-11 w-auto max-w-full object-contain drop-shadow-sm select-none"
                           onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                     ) : null}
                  </div>

                  {/* Center Text (وسط ال header - unchanged) */}
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                      <div className={`${small ? 'text-sm md:text-lg' : 'text-base md:text-2xl'} font-bold font-['Cairo'] leading-tight transition-all duration-300 who-header-title`}>{settings?.header1 || "مستشفى المنيا الجامعى للعيون"}</div>
                      <div className={`${small ? 'text-xs md:text-sm' : 'text-sm md:text-lg'} font-medium font-['Cairo'] opacity-90 mt-0.5 transition-all duration-300 who-header-subtitle`}>{settings?.header2 || "وحدة مكافحة العدوي"}</div>
                      <div className={`${small ? 'text-sm md:text-lg' : 'text-lg md:text-2xl'} font-bold font-['Cairo'] mt-1 border-t border-white/30 pt-1 w-full transition-all duration-300 who-header-main`}>{settings?.header3 || "أحصائية غسيل الأيدي"}</div>
                  </div>

                  {/* Right Logo (جهة اليمين) */}
                  <div className="w-20 md:w-28 print:w-20 shrink-0 flex items-center justify-end overflow-hidden">
                     {rightLogo ? (
                        <img 
                           src={rightLogo} 
                           alt="Logo Right" 
                           className="who-header-logo max-h-12 md:max-h-14 print:max-h-11 w-auto max-w-full object-contain drop-shadow-sm select-none"
                           onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                     ) : null}
                  </div>
               </div>
            </div>
         );
      };

      const ReadOnlyObservationForm = ({ sessionData, sessionIndex, totalSessions, settings }) => {
         const { sessionInfo, professionals } = sessionData;
         const fullProfessionals = useMemo(() => {
             const lp = [];
             for(let i=0; i<4; i++) {
                 const found = professionals.find(p => p._colNo === i + 1);
                 if (found) {
                     lp.push({...found, id: Math.random()});
                 } else {
                     lp.push({ id: Math.random(), categoryCode: '', categoryName: '', opportunities: [] });
                 }
             }
             professionals.forEach(p => {
                 if (p._colNo > 4 || !p._colNo) {
                     if (lp.some(empty => !empty.categoryCode && empty.opportunities.length === 0)) {
                         const emptyIdx = lp.findIndex(empty => !empty.categoryCode && empty.opportunities.length === 0);
                         lp[emptyIdx] = {...p, id: Math.random()};
                     } else {
                         lp.push({...p, id: Math.random()});
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
                        <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">SESSION {sessionIndex + 1} OF {totalSessions}</span>
                        <span className="text-[8px] text-slate-300 font-normal">Form Ref: {sessionInfo.sessionId.slice(0, 8)}</span>
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
                           <label className="w-32 text-[11px] font-bold text-gray-800 shrink-0 print:w-36 print:text-[12px] print:mb-0">Time:</label>
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
                           <div key={idx} className="w-full md:w-1/4 print:w-1/4 shrink-0 border-b-4 border-gray-800 md:border-b-0 md:border-r-2 last:border-b-0 md:last:border-r-0 print:border-r-2 print:border-b-0 print:last:border-r-0 prof-col-wrapper">
                              <ProfessionalColumn prof={prof} pIndex={idx} readOnly profCategories={getProfCategories(settings)} />
                           </div>
                        ))}
                     </div>
                  </div>
                  
                  <div className="print-footer">
                      <div className="mb-0.5">{settings?.header1 || "مستشفى المنيا الجامعى للعيون"} - {settings?.header2 || "وحدة مكافحة العدوي"}</div>
                      <div className="flex justify-between items-center w-full px-4 font-normal text-[7pt] italic text-slate-500">
                          <span>Based on WHO's Hand Hygiene Compliance Observation Form</span>
                          <span>Record ID: {sessionInfo.sessionId.slice(0, 8)}</span>
                      </div>
                  </div>
               </div>
            </div>
         );
      };

      const parseSessionsFromRows = (rows) => {
          const map = {};
          rows.forEach(row => {
             const sid = row['Session ID'];
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
                      sessionId: sid
                   },
                   professionals: {}
                };
             }
             const pCode = row['Prof. Code'];
             const colNo = row['Column No'];
             let profKey = colNo ? `col_${colNo}` : `code_${pCode}`;
             if (!colNo) {
                 let suffix = 0;
                 while (map[sid].professionals[`${profKey}_${suffix}`] && 
                        map[sid].professionals[`${profKey}_${suffix}`].opportunities.some(o => o.number === row['Opportunity No'])) {
                     suffix++;
                 }
                 profKey = `${profKey}_${suffix}`;
             }
             if (!map[sid].professionals[profKey]) {
                map[sid].professionals[profKey] = {
                   categoryCode: pCode,
                   categoryName: row['Professional Cat.'],
                   opportunities: [],
                   _colNo: colNo ? parseInt(colNo) : 999
                };
             }
             const indications = [];
             if (row['Ind: Bef. Pat'] === 'Yes') indications.push('bef-pat');
             if (row['Ind: Bef. Asept'] === 'Yes') indications.push('bef-asept');
             if (row['Ind: Aft. Body Fluid'] === 'Yes') indications.push('aft-bf');
             if (row['Ind: Aft. Pat'] === 'Yes') indications.push('aft-pat');
             if (row['Ind: Aft. Surround'] === 'Yes') indications.push('aft-p-surr');
             map[sid].professionals[profKey].opportunities.push({
                number: row['Opportunity No'],
                indications,
                action: row['Action (HR/HW/Missed)'],
                gloves: row['Gloves Used'] === 'Yes'
             });
          });
          const sessionsList = Object.values(map).map(s => {
              const profs = Object.values(s.professionals);
              profs.sort((a, b) => a._colNo - b._colNo);
              return {...s, rawRows: [], professionals: profs};
          });

          // Group by facility + month and sort chronologically to ensure automatic sequential session numbers per center
          const monthGroups = {};
          sessionsList.forEach(s => {
              const fKey = (s.sessionInfo.facility || '').trim().toLowerCase();
              const mKey = (s.sessionInfo.date || '').slice(0, 7) || 'unknown';
              const gKey = `${fKey}__${mKey}`;
              if (!monthGroups[gKey]) monthGroups[gKey] = [];
              monthGroups[gKey].push(s);
          });

          Object.values(monthGroups).forEach(list => {
              list.sort((a, b) => {
                  const dA = a.sessionInfo.date || '';
                  const dB = b.sessionInfo.date || '';
                  if (dA !== dB) return dA.localeCompare(dB);
                  const tA = a.sessionInfo.startTime || '99:99';
                  const tB = b.sessionInfo.startTime || '99:99';
                  if (tA !== tB) return tA.localeCompare(tB);
                  return (a.sessionInfo.sessionId || '').localeCompare(b.sessionInfo.sessionId || '');
              });
              list.forEach((s, idx) => {
                  s.sessionInfo.sessionNumber = String(idx + 1);
              });
          });

          return sessionsList;
      };

      const ObservationForm = ({ initialData, onSubmitSuccess, settings, currentCenter, onSwitchCenter }) => {
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [message, setMessage] = useState(null);
        const [formSaved, setFormSaved] = useState(false);
        const [allSessions, setAllSessions] = useState([]);
        const [sessionsLoaded, setSessionsLoaded] = useState(false);

        const fetchAllSessions = () => {
            setSessionsLoaded(false);
            setAllSessions([]);
            window.google.script.run.withSuccessHandler(rows => {
                if (rows && !rows.error && Array.isArray(rows)) {
                    const scopedRows = currentCenter
                        ? rows.filter(r => (r['Facility'] || '').trim().toLowerCase() === currentCenter.trim().toLowerCase())
                        : rows;
                    setAllSessions(parseSessionsFromRows(scopedRows));
                }
                setSessionsLoaded(true);
            }).withFailureHandler(() => {
                setSessionsLoaded(true);
            }).getObservationData(currentCenter ? { facility: currentCenter } : undefined);
        };

        useEffect(() => {
            fetchAllSessions();
        }, [currentCenter]);
        
        // Initialize with requested defaults
        const [session, setSession] = useState({ 
            facility: (initialData && initialData.sessionInfo && initialData.sessionInfo.facility) || currentCenter || '', 
            service: '', 
            ward: '', 
            department: '', 
            country: 'جمهورية مصر العربية', 
            periodNumber: new Date().getMonth() + 1, // Default to current month
            date: new Date().toISOString().split('T')[0], 
            startTime: '', 
            endTime: '', 
            duration: '', 
            sessionNumber: '', 
            observer: '', 
            pageNumber: '1', 
            city: '', 
            sessionId: uuidv4() 
        });
        
        const [professionals, setProfessionals] = useState([{ id: 1, categoryCode: '', categoryName: '', opportunities: [] },{ id: 2, categoryCode: '', categoryName: '', opportunities: [] },{ id: 3, categoryCode: '', categoryName: '', opportunities: [] },{ id: 4, categoryCode: '', categoryName: '', opportunities: [] }]);

        useEffect(() => {
          if (initialData) {
             setSession({
                 ...initialData.sessionInfo,
                 facility: currentCenter || initialData.sessionInfo.facility || ''
             });
          } else if (currentCenter) {
             setSession(prev => ({ ...prev, facility: currentCenter }));
          }
          if (initialData) {
             const lp = [];
             for(let i=0; i<4; i++) {
                 const found = initialData.professionals.find(p => p._colNo === i + 1);
                 if (found) {
                     lp.push({...found, id: Math.random()});
                 } else {
                     lp.push({ id: Math.random(), categoryCode: '', categoryName: '', opportunities: [] });
                 }
             }
             // If there are more than 4 professionals (legacy data issue), append them
             initialData.professionals.forEach(p => {
                 if (p._colNo > 4 || !p._colNo) {
                     if (lp.some(empty => !empty.categoryCode && empty.opportunities.length === 0)) {
                         const emptyIdx = lp.findIndex(empty => !empty.categoryCode && empty.opportunities.length === 0);
                         lp[emptyIdx] = {...p, id: Math.random()};
                     } else {
                         lp.push({...p, id: Math.random()});
                     }
                 }
             });
             setProfessionals(lp.slice(0, Math.max(4, lp.length)));
             setFormSaved(false);
             setMessage(null);
          }
        }, [initialData, currentCenter]);

        useEffect(() => {
            if(session.startTime && session.endTime && !formSaved) {
                const [h1, m1] = session.startTime.split(':').map(Number);
                const [h2, m2] = session.endTime.split(':').map(Number);
                if(!isNaN(h1) && !isNaN(h2)) {
                    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                    if(diff < 0) diff += 1440;
                    if(session.duration !== diff) {
                        setSession(prev => ({...prev, duration: diff}));
                    }
                }
            } else if ((!session.startTime || !session.endTime) && session.duration !== '' && !formSaved) {
                setSession(prev => ({...prev, duration: ''}));
            }
        }, [session.startTime, session.endTime, formSaved]);

        useEffect(() => {
            if (!formSaved && sessionsLoaded) {
                const currentMonthPrefix = (session.date || '').slice(0, 7);
                if (!currentMonthPrefix) return;

                const monthSessions = allSessions.filter(s => {
                    const sDate = s.sessionInfo?.date || '';
                    return sDate.startsWith(currentMonthPrefix);
                });

                const tempSessions = [];
                let foundCurrent = false;
                monthSessions.forEach(s => {
                    if (s.sessionInfo?.sessionId === session.sessionId) {
                        foundCurrent = true;
                        tempSessions.push({
                            sessionInfo: {
                                ...s.sessionInfo,
                                date: session.date || '',
                                startTime: session.startTime || ''
                            }
                        });
                    } else {
                        tempSessions.push(s);
                    }
                });
                if (!foundCurrent) {
                    tempSessions.push({
                        sessionInfo: {
                            sessionId: session.sessionId,
                            date: session.date || '',
                            startTime: session.startTime || ''
                        }
                    });
                }

                tempSessions.sort((a, b) => {
                    const dA = a.sessionInfo?.date || '';
                    const dB = b.sessionInfo?.date || '';
                    if (dA !== dB) return dA.localeCompare(dB);

                    const tA = a.sessionInfo?.startTime || '99:99';
                    const tB = b.sessionInfo?.startTime || '99:99';
                    if (tA !== tB) return tA.localeCompare(tB);

                    const idA = a.sessionInfo?.sessionId || '';
                    const idB = b.sessionInfo?.sessionId || '';
                    return idA.localeCompare(idB);
                });

                const myIndex = tempSessions.findIndex(s => s.sessionInfo?.sessionId === session.sessionId);
                if (myIndex !== -1) {
                    const calcNo = String(myIndex + 1);
                    if (session.sessionNumber !== calcNo) {
                        setSession(prev => ({ ...prev, sessionNumber: calcNo }));
                    }
                }
            }
        }, [session.date, session.startTime, allSessions, sessionsLoaded, formSaved, session.sessionId, session.sessionNumber]);

        const handleDateChange = (e) => {
            const newDate = e.target.value;
            let newPeriod = session.periodNumber;
            if (newDate) {
                const d = new Date(newDate);
                if (!isNaN(d.getTime())) {
                    newPeriod = d.getMonth() + 1;
                }
            }
            setSession(prev => ({ ...prev, date: newDate, periodNumber: newPeriod }));
        };

        const handleReset = (type) => {
             const isNextPage = type === 'next_page';
             
             setSession(prev => ({ 
                 // Preserve context fields
                 facility: prev.facility, 
                 service: prev.service, 
                 ward: prev.ward, 
                 department: prev.department, 
                 country: prev.country, 
                 periodNumber: prev.periodNumber, 
                 date: prev.date, 
                 observer: prev.observer, 
                 city: prev.city,
                 
                 // Handle Page/Session Numbers
                 // For next page: keep Session Number, increment Page Number
                 // For new session: keep Page Number as 1, maybe auto-increment session number if valid, or clear it
                 sessionNumber: isNextPage ? prev.sessionNumber : '',
                 pageNumber: isNextPage ? (prev.pageNumber && !isNaN(prev.pageNumber) ? String(parseInt(prev.pageNumber) + 1) : '2') : '1',

                 // Reset specific fields
                 // Next Page usually continues the same observation time block
                 startTime: isNextPage ? prev.startTime : '', 
                 endTime: isNextPage ? prev.endTime : '', 
                 duration: isNextPage ? prev.duration : '', 
                 
                 // Always generate new ID for database row uniqueness
                 sessionId: uuidv4() 
             }));
             
             setProfessionals([{ id: Math.random(), categoryCode: '', categoryName: '', opportunities: [] },{ id: Math.random(), categoryCode: '', categoryName: '', opportunities: [] },{ id: Math.random(), categoryCode: '', categoryName: '', opportunities: [] },{ id: Math.random(), categoryCode: '', categoryName: '', opportunities: [] }]);
             setFormSaved(false);
             setMessage(null);
             if(onSubmitSuccess) onSubmitSuccess();
        };

        const handleSubmit = () => {
          const effectiveFacility = (currentCenter || session.facility || '').trim();
          if (!effectiveFacility || !session.observer) { setMessage({ type: 'error', text: 'Facility & Observer required' }); return; }
          setIsSubmitting(true);
          let finalSession = { ...session, facility: effectiveFacility };
          
          const cleanedPros = professionals.map((p, index) => ({ ...p, _originalIndex: index, opportunities: p.opportunities.filter(o => o.indications && o.indications.length > 0 || o.action) })).filter(p => p.categoryCode || p.opportunities.length > 0);
          window.google.script.run.withSuccessHandler((res) => {
             setIsSubmitting(false);
             if (res && res.error) {
                 setMessage({ type: 'error', text: 'خطأ: ' + res.error }); 
             } else if (res.success) {
                setMessage({ type: 'success', text: 'Form Saved Successfully!' });
                setSession(finalSession); setFormSaved(true); fetchAllSessions();
             } else { setMessage({ type: 'error', text: "Unknown error occurred" }); }
          }).withFailureHandler((err) => {
             setIsSubmitting(false);
             setMessage({ type: 'error', text: String(err) });
          }).saveObservationData(JSON.stringify({ ...finalSession, professionals: cleanedPros }));
        };

        const isReadOnly = formSaved || isSubmitting;

        return (
          <div className="bg-white mx-auto max-w-[1000px] paper-container shadow-xl min-h-screen print:min-h-0 mb-8 print:shadow-none print:m-0 print:w-full transition-all duration-300 print-centered-page print-last-page">
             <WHOHeader small={true} settings={settings} />
             <div className="p-4 md:p-6 print:p-0">
                <div className="flex justify-between items-end border-b-2 border-gray-200 pb-1 mb-4 print:mb-2">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-500 print:mb-1">Observation Form</h1>
                    <div className="flex items-center gap-3">
                        {formSaved && <div className="text-green-600 font-bold text-sm bg-green-50 px-2 py-1 rounded border border-green-200 no-print flex items-center gap-1"><span className="text-lg">✓</span> Saved</div>}
                        <button onClick={() => window.print()} className="no-print text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors">
                            <Icons.Download /> <span className="hidden md:inline">Save PDF</span>
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-x-8 gap-y-0 mb-6 print:mb-2 text-sm print:gap-y-1 print:gap-x-6">
                   <div>
                      <FormInputRow label="Facility:" value={currentCenter || session.facility} onChange={e=>setSession({...session, facility: e.target.value})} readOnly={isReadOnly || Boolean(currentCenter)} options={currentCenter ? null : settings?.facilities} />
                      <FormInputRow label="Service:" value={session.service} onChange={e=>setSession({...session, service: e.target.value})} readOnly={isReadOnly} options={settings?.services} />
                      <FormInputRow label="Ward:" value={session.ward} onChange={e=>setSession({...session, ward: e.target.value})} readOnly={isReadOnly} options={settings?.wards} />
                      <FormInputRow label="Department:" value={session.department} onChange={e=>setSession({...session, department: e.target.value})} readOnly={isReadOnly} options={settings?.departments} />
                      <FormInputRow label="Country**:" value={session.country} onChange={e=>setSession({...session, country: e.target.value})} readOnly={isReadOnly} />
                   </div>
                   <div>
                      <FormInputRow label="Period Number*:" value={session.periodNumber} onChange={e=>setSession({...session, periodNumber: e.target.value})} readOnly={isReadOnly} />
                      <FormInputRow label="Date (dd/mm/yy):" type="date" value={session.date} onChange={handleDateChange} readOnly={isReadOnly} />
                      <div className="flex flex-col md:flex-row md:items-center mb-3 md:mb-1 print:mb-1 print:flex-row print:items-center">
                          <label className="text-xs font-bold text-gray-700 mb-1 md:mb-0 md:w-32 flex-shrink-0 print:w-36 print:text-[12px] print:mb-0">Time:</label>
                          {isReadOnly ? (
                              <div className="form-input-print-text w-full">
                                  <span className="mr-1">{session.startTime}</span>
                                  <span className="text-gray-400 mx-1">-</span>
                                  <span>{session.endTime}</span>
                              </div>
                          ) : (
                              <div className="flex items-center w-full">
                                <input type="time" className="form-input-bg h-9 md:h-7 text-sm w-full md:w-20 mr-2 print:hidden" value={session.startTime} onChange={e=>setSession({...session, startTime: e.target.value})} />
                                <span className="mr-2 text-gray-400 hidden md:inline print:hidden">/</span>
                                <input type="time" className="form-input-bg h-9 md:h-7 text-sm w-full md:w-20 print:hidden" value={session.endTime} onChange={e=>setSession({...session, endTime: e.target.value})} />
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
                      <FormInputRow label="Observer (initials):" value={session.observer} onChange={e=>setSession({...session, observer: e.target.value})} readOnly={isReadOnly} options={settings?.observers} />
                      <FormInputRow label="Page N°:" value={session.pageNumber} onChange={e=>setSession({...session, pageNumber: e.target.value})} readOnly={isReadOnly} />
                      <FormInputRow label="City**:" value={session.city} onChange={e=>setSession({...session, city: e.target.value})} readOnly={isReadOnly} options={settings?.cities} />
                   </div>
                </div>

                <div className="border-2 border-gray-800 rounded-lg md:rounded-none overflow-hidden relative print:border-none prof-main-container">
                   <div className="flex flex-col md:flex-row print:flex-row w-full prof-cols-row">
                      {professionals.map((prof, idx) => (
                        <div key={prof.id} className="w-full md:w-1/4 print:w-1/4 shrink-0 border-b-4 border-gray-800 md:border-b-0 md:border-r-2 last:border-b-0 md:last:border-r-0 print:border-r-2 print:border-b-0 print:last:border-r-0 prof-col-wrapper">
                           <ProfessionalColumn prof={prof} pIndex={idx} readOnly={isReadOnly} onUpdate={(u) => { const n = [...professionals]; n[idx] = u; setProfessionals(n); }} profCategories={getProfCategories(settings)} />
                        </div>
                      ))}
                   </div>
                </div>
                
                <div className="hidden print:flex print-footer">
                      <div className="mb-0.5">{settings?.header1 || "مستشفى المنيا الجامعى للعيون"} - {settings?.header2 || "وحدة مكافحة العدوي"}</div>
                      <div className="flex justify-between items-center w-full px-4 font-normal text-[7pt] italic text-slate-500">
                          <span>Based on WHO's Hand Hygiene Compliance Observation Form</span>
                          <span>Record ID: {session.sessionId ? session.sessionId.slice(0, 8) : ''}</span>
                      </div>
                </div>

                <div className="mt-6 flex flex-col md:flex-row justify-between items-center no-print bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
                   <div className="text-[11px] text-gray-500 leading-tight hidden md:block">** Optional data fields.</div>
                   <div className="flex flex-col md:flex-row gap-3 items-center w-full md:w-auto justify-end">
                      {message && <span className={`font-bold text-sm font-['Cairo'] ${message.type==='error'?'text-red-600':'text-green-600'}`}>{message.text}</span>}
                      
                      {!formSaved ? (
                          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full md:w-auto bg-[#F26522] hover:bg-[#d9531e] text-white px-8 py-3 md:py-2 rounded-lg font-bold shadow-md hover:shadow-lg flex items-center justify-center text-base md:text-sm disabled:opacity-50 transition-all transform active:scale-95">
                              {isSubmitting ? <><Icons.Spinner/> Saving...</> : (initialData ? 'Update Form' : 'Save Form')}
                          </button>
                      ) : (
                          <>
                              {initialData ? (
                                  <button onClick={() => { if(onSubmitSuccess) onSubmitSuccess(); }} className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 md:py-2 rounded-lg font-bold shadow-sm flex items-center justify-center text-sm transition-colors active:scale-95">
                                      Back to Records
                                  </button>
                              ) : (
                                  <>
                                      <button onClick={() => handleReset('next_page')} className="w-full md:w-auto bg-[#F26522] hover:bg-[#d9531e] text-white px-6 py-3 md:py-2 rounded-lg font-bold shadow-sm flex items-center justify-center text-sm transition-colors active:scale-95">
                                          Next Page (Same Session)
                                      </button>
                                      <button onClick={() => handleReset('new_session')} className="w-full md:w-auto bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-6 py-3 md:py-2 rounded-lg font-bold shadow-sm flex items-center justify-center text-sm transition-colors active:scale-95">
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

      const StatCard = ({ title, value, subtext, icon, colorClass }) => (
         <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-start justify-between">
             <div>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                 <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
                 {subtext && <p className="text-slate-400 text-xs mt-1">{subtext}</p>}
             </div>
             <div className={`p-3 rounded-full ${colorClass} bg-opacity-10 text-opacity-100`}>
                 {icon}
             </div>
         </div>
      );

      const Dashboard = ({ settings, currentCenter }) => {
        const [data, setData] = useState([]);
        const [loading, setLoading] = useState(true);
        const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

        useEffect(() => {
          setLoading(true);
          window.google.script.run.withSuccessHandler(rows => { 
             const scopedRows = currentCenter
                ? (rows || []).filter(r => (r['Facility'] || '').trim().toLowerCase() === currentCenter.trim().toLowerCase())
                : (rows || []);
             setData(scopedRows); 
             if (scopedRows.length > 0 && scopedRows[0]['Session Date']) {
                setFilterMonth(String(scopedRows[0]['Session Date']).slice(0, 7));
             }
             setLoading(false); 
          }).getObservationData(currentCenter ? { facility: currentCenter } : undefined);
        }, [currentCenter]);
        
        if (!BarChart || !XAxis || !YAxis) return <div className="p-10 text-center text-red-500 border border-red-200 bg-red-50 rounded-lg m-4">Charts library failed to load. Please check your internet connection or try again.</div>;

        const stats = useMemo(() => {
           if(data.length === 0) return null;
           
           // Filter Data
           // 1. Month Data for Cards & Bar Charts
           const monthData = data.filter(r => String(r['Session Date']).startsWith(filterMonth));
           // 2. Year Data for Annual Trend (context)
           const selectedYear = filterMonth ? filterMonth.split('-')[0] : new Date().getFullYear();
           const yearData = data.filter(r => String(r['Session Date']).startsWith(String(selectedYear)));
           
           let totalOpp = 0;
           let totalAct = 0;
           const sessionIds = new Set();
           
           const profCategories = getProfCategories(settings);
           const byProf = {};
           profCategories.forEach(p => {
               byProf[p.code] = { name: p.name, opp: 0, act: 0 };
           });

           const byInd = {};
           INDICATIONS.forEach(i => byInd[i.fullLabel] = { opp: 0, act: 0 });

           // Process Month Data
           monthData.forEach(row => {
               sessionIds.add(row['Session ID']);
               const action = row['Action (HR/HW/Missed)'];
               const isCompliance = action === 'HW' || action === 'HR';
               
               const profCode = String(row['Prof. Code']);
               if(byProf[profCode]) {
                   byProf[profCode].opp++;
                   if(isCompliance) byProf[profCode].act++;
               }
               
               totalOpp++;
               if(isCompliance) totalAct++;

               INDICATIONS.forEach(ind => {
                   if(row[ind.dbCol] === 'Yes') {
                       if(!byInd[ind.fullLabel]) byInd[ind.fullLabel] = { opp: 0, act: 0 };
                       byInd[ind.fullLabel].opp++;
                       if(isCompliance) byInd[ind.fullLabel].act++;
                   }
               });
           });
           
           // Process Year Data for Trend and Annual Stats
           const monthlyDataMap = {};
           let annualOpp = 0;
           let annualAct = 0;
           
           yearData.forEach(row => {
               const action = row['Action (HR/HW/Missed)'];
               const isCompliance = action === 'HW' || action === 'HR';
               
               annualOpp++;
               if(isCompliance) annualAct++;
               
               const dateStr = row['Session Date'];
               if(dateStr) {
                   const sortKey = dateStr.slice(0, 7); // YYYY-MM
                   const d = new Date(dateStr);
                   const displayLabel = d.toLocaleString('default', { month: 'short' });
                   
                   if(!monthlyDataMap[sortKey]) monthlyDataMap[sortKey] = { name: displayLabel, opp: 0, act: 0 };
                   monthlyDataMap[sortKey].opp++;
                   if(isCompliance) monthlyDataMap[sortKey].act++;
               }
           });
           
           const annualAverage = annualOpp > 0 ? Number(((annualAct / annualOpp) * 100).toFixed(2)) : 0;

           const profData = Object.keys(byProf).map(code => ({
               name: byProf[code].name,
               compliance: byProf[code].opp > 0 ? Number(((byProf[code].act / byProf[code].opp) * 100).toFixed(2)) : 0
           }));

           const indData = Object.keys(byInd).map(k => ({
               name: k,
               compliance: byInd[k].opp > 0 ? Number(((byInd[k].act / byInd[k].opp) * 100).toFixed(2)) : 0
           }));
           
           const monthlyTrend = Object.keys(monthlyDataMap).sort().map(k => ({
               name: monthlyDataMap[k].name,
               compliance: monthlyDataMap[k].opp > 0 ? Number(((monthlyDataMap[k].act / monthlyDataMap[k].opp) * 100).toFixed(2)) : 0
           }));

           return {
               overall: totalOpp > 0 ? Number(((totalAct / totalOpp) * 100).toFixed(2)) : 0,
               totalOpp,
               totalSessions: sessionIds.size,
               profData,
               indData,
               monthlyTrend,
               year: selectedYear,
               annualAverage
           };

        }, [data, filterMonth]);

        const structuredDashboardSessions = useMemo(() => {
            if (!data || data.length === 0) return [];
            return parseSessionsFromRows(data);
        }, [data]);

        if (loading) return <div className="p-20 text-center"><Icons.Spinner /><span className="text-gray-500 font-medium">Loading Dashboard...</span></div>;
        if (!stats) return <div className="p-10 text-center text-gray-500">No data available. Please record some observations first.</div>;

        const readableDate = filterMonth ? new Date(filterMonth + "-02").toLocaleString('default', { month: 'long', year: 'numeric' }) : 'All Time';
        const monthSessionsForExport = structuredDashboardSessions.filter(s => String(s.sessionInfo.date || '').startsWith(filterMonth));
        const yearSessionsForExport = structuredDashboardSessions.filter(s => String(s.sessionInfo.date || '').startsWith(String(stats.year)));

        const handleExportDashboardMonthExcel = () => {
            const target = monthSessionsForExport.length > 0 ? monthSessionsForExport : yearSessionsForExport;
            exportReportsToExcel({
                sessions: target,
                settings,
                annualSessions: yearSessionsForExport,
                annualYear: stats.year,
                fileNamePrefix: monthSessionsForExport.length > 0 ? 'Dashboard_Monthly_Report' : `Dashboard_Annual_${stats.year}`
            });
        };

        const handleExportDashboardYearExcel = () => {
            exportReportsToExcel({
                sessions: yearSessionsForExport,
                settings,
                annualSessions: yearSessionsForExport,
                annualYear: stats.year,
                periodLabel: `التقرير السنوي الشامل لعام ${stats.year}`,
                fileNamePrefix: `Annual_Hand_Hygiene_Report_${stats.year}`
            });
        };

        return (
            <div className="max-w-full mx-auto mt-4 print:mt-0 space-y-6 print:space-y-4 dashboard-print-container">
                <div className="flex flex-col md:flex-row justify-between items-center no-print gap-4">
                   <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                       <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
                       {currentCenter && (
                           <span className="text-xs bg-orange-100 text-orange-900 border border-orange-200 font-bold px-2.5 py-1 rounded-lg font-['Cairo'] flex items-center gap-1.5 shadow-2xs">
                               <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
                               <span className="text-slate-500 font-normal">المركز:</span>
                               <span>{currentCenter}</span>
                           </span>
                       )}
                       <input type="month" className="border border-slate-300 p-2 rounded-md text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
                   </div>
                   <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end font-['Cairo']">
                       <button
                           onClick={handleExportDashboardMonthExcel}
                           disabled={monthSessionsForExport.length === 0 && yearSessionsForExport.length === 0}
                           className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm justify-center"
                           title="تنزيل تقرير الشهر المحدد في شيت إكسيل شامل"
                       >
                           <Icons.Excel />
                           <span>تنزيل تقرير الشهر (Excel)</span>
                       </button>
                       <button
                           onClick={handleExportDashboardYearExcel}
                           disabled={yearSessionsForExport.length === 0}
                           className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 disabled:opacity-50 px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm justify-center"
                           title="تنزيل التقرير السنوي المجمع في شيت إكسيل"
                       >
                           <Icons.Excel />
                           <span>التقرير السنوي {stats.year} (Excel)</span>
                       </button>
                       <button onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2 rounded-md text-xs font-bold flex items-center hover:bg-slate-900 transition-colors shadow-sm justify-center font-sans"><span className="mr-1.5"><Icons.Download/></span> Save as PDF</button>
                   </div>
                </div>
                
                <div className="hidden print:block w-full mb-6">
                    <div className="flex justify-between items-center border-b-4 border-[#F26522] pb-4 mb-4">
                        <div className="flex flex-col text-left">
                            <h1 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase">Compliance<br/><span className="text-[#F26522]">Dashboard</span></h1>
                            <p className="text-sm text-slate-500 font-bold mt-2 uppercase tracking-widest">Hand Hygiene Monitoring</p>
                        </div>
                        <div className="text-right">
                            <div className="font-['Cairo'] text-xl font-bold text-slate-800 leading-tight">{settings?.header1 || "مستشفى المنيا الجامعى للعيون"}</div>
                            <div className="font-['Cairo'] text-base text-slate-600 font-medium">{settings?.header2 || "وحدة مكافحة العدوي"}</div>
                            <div className="mt-3 text-xs bg-slate-100 inline-block px-2 py-1 rounded border border-slate-200">
                                Report Date: <span className="font-mono font-bold">{new Date().toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-orange-50 border border-orange-100 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                            <div className="bg-[#F26522] text-white p-1 rounded"><Icons.Activity/></div>
                            <span className="text-sm font-bold text-slate-700 uppercase">Period Analysis</span>
                        </div>
                        <div className="text-xl font-black text-slate-800">{readableDate}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 w-full">
                    <StatCard 
                       title="Overall Compliance" 
                       value={`${stats.overall.toFixed(2)}%`} 
                       icon={<Icons.Activity/>} 
                       colorClass="bg-blue-500 text-blue-600"
                    />
                    <StatCard 
                       title="Total Observations" 
                       value={stats.totalOpp} 
                       subtext="Opportunities recorded"
                       icon={<Icons.Clipboard/>} 
                       colorClass="bg-orange-500 text-orange-600"
                    />
                    <StatCard 
                       title="Sessions" 
                       value={stats.totalSessions} 
                       subtext="Unique sessions"
                       icon={<Icons.Users/>} 
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
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs normal-case">Avg: {stats.annualAverage.toFixed(2)}%</span>
                     </h3>
                     <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={stats.monthlyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                           <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} />
                           <YAxis domain={[0, 100]} tick={{fontSize: 11, fill: '#64748b'}} />
                           <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Compliance %']} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                           <Legend />
                           <Line type="monotone" dataKey="compliance" stroke="#F26522" strokeWidth={3} name="Compliance %" dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}}>
                               <LabelList dataKey="compliance" position="top" offset={10} formatter={(v) => `${Number(v).toFixed(2)}%`} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#c2410c' }} />
                           </Line>
                        </LineChart>
                     </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 w-full">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-96 print:h-[220px] print:border-none print:shadow-none">
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-6 tracking-wide border-b pb-2">Compliance by Profession</h3>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={stats.profData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#e2e8f0" />
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis type="category" dataKey="name" width={140} tick={{fontSize: 11, fill: '#64748b'}} />
                                <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Compliance %']} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                                <Bar dataKey="compliance" fill="#F26522" name="Compliance %" radius={[0, 4, 4, 0]} barSize={24}>
                                    <LabelList dataKey="compliance" position="right" formatter={(v) => `${Number(v).toFixed(2)}%`} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#64748b' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                     <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-96 print:h-[220px] print:border-none print:shadow-none">
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-6 tracking-wide border-b pb-2">Compliance by Indication</h3>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={stats.indData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#e2e8f0" />
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis type="category" dataKey="name" width={180} tick={{fontSize: 11, fill: '#64748b'}} />
                                <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Compliance %']} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                                <Bar dataKey="compliance" fill="#0093d5" name="Compliance %" radius={[0, 4, 4, 0]} barSize={24}>
                                    <LabelList dataKey="compliance" position="right" formatter={(v) => `${Number(v).toFixed(2)}%`} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#64748b' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                <div className="hidden print:flex flex-col items-center justify-center print-footer mt-10 print:mt-0">
                     <div className="mb-0.5">{settings?.header1 || "مستشفى المنيا الجامعى للعيون"} - {settings?.header2 || "وحدة مكافحة العدوي"}</div>
                     <div className="text-[7pt] font-medium italic text-slate-500">Based on WHO's Hand Hygiene Compliance Observation Form</div>
                </div>
            </div>
        );
      };

      const HeaderLogoModal = ({ isOpen, onClose, settings, onSave, isSaving }) => {
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
              <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fade-in font-['Cairo']" dir="rtl" onClick={() => !isSaving && onClose()}>
                  <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between border-b pb-3 mb-4">
                          <div className="flex items-center gap-2">
                              <span className="text-xl">🖼️</span>
                              <h3 className="text-lg font-bold text-slate-800">شعارات الترويسة لملفات الطباعة</h3>
                          </div>
                          <button onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1">✕</button>
                      </div>

                      <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                          ضع رابط Google Drive للصورة المراد وضعها جهة اليمين وجهة اليسار. يتم ضبط حجم الشعارين تلقائياً ليلائم الترويسة، مع الحفاظ الكامل على نصوص الترويسة في المنتصف دون تغيير.
                      </p>

                      <div className="space-y-4 mb-4">
                          {/* Right Logo */}
                          <div className="bg-orange-50/60 p-3.5 rounded-xl border border-orange-200">
                              <div className="flex justify-between items-center mb-1">
                                  <label className="text-xs font-bold text-slate-800">شعار جهة اليمين (رابط Google Drive):</label>
                                  {logoRight && (
                                      <button type="button" onClick={() => setLogoRight('')} className="text-[11px] text-red-500 hover:text-red-700">مسح ✕</button>
                                  )}
                              </div>
                              <input 
                                  type="text" 
                                  placeholder="https://drive.google.com/file/d/.../view" 
                                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none" 
                                  value={logoRight}
                                  onChange={e => setLogoRight(e.target.value)}
                                  dir="ltr"
                              />
                              <div className="mt-2 flex items-center gap-2">
                                  <div className="w-14 h-10 bg-white border border-dashed border-slate-300 rounded flex items-center justify-center overflow-hidden shrink-0">
                                      {logoRight ? (
                                          <img 
                                              src={formatGoogleDriveUrl(logoRight)} 
                                              alt="معاينة اليمين" 
                                              className="max-h-full max-w-full object-contain"
                                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                          />
                                      ) : <span className="text-[10px] text-slate-400">فارغ</span>}
                                  </div>
                                  <span className="text-[11px] text-slate-500">معاينة شعار جهة اليمين</span>
                              </div>
                          </div>

                          {/* Left Logo */}
                          <div className="bg-orange-50/60 p-3.5 rounded-xl border border-orange-200">
                              <div className="flex justify-between items-center mb-1">
                                  <label className="text-xs font-bold text-slate-800">شعار جهة اليسار (رابط Google Drive):</label>
                                  {logoLeft && (
                                      <button type="button" onClick={() => setLogoLeft('')} className="text-[11px] text-red-500 hover:text-red-700">مسح ✕</button>
                                  )}
                              </div>
                              <input 
                                  type="text" 
                                  placeholder="https://drive.google.com/file/d/.../view" 
                                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none" 
                                  value={logoLeft}
                                  onChange={e => setLogoLeft(e.target.value)}
                                  dir="ltr"
                              />
                              <div className="mt-2 flex items-center gap-2">
                                  <div className="w-14 h-10 bg-white border border-dashed border-slate-300 rounded flex items-center justify-center overflow-hidden shrink-0">
                                      {logoLeft ? (
                                          <img 
                                              src={formatGoogleDriveUrl(logoLeft)} 
                                              alt="معاينة اليسار" 
                                              className="max-h-full max-w-full object-contain"
                                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                          />
                                      ) : <span className="text-[10px] text-slate-400">فارغ</span>}
                                  </div>
                                  <span className="text-[11px] text-slate-500">معاينة شعار جهة اليسار</span>
                              </div>
                          </div>

                          {/* Google Drive Tip */}
                          <div className="bg-amber-100/70 text-amber-900 border border-amber-300 rounded-lg p-2.5 text-xs flex items-start gap-2">
                              <span className="text-sm">💡</span>
                              <span>تأكد أن إذن مشاركة الصورة في Google Drive هو <strong>"أي شخص لديه الرابط يمكنه العرض" (Anyone with the link)</strong> لكي تظهر الصورة وتُطبع بشكل صحيح.</span>
                          </div>

                          {/* Live Preview */}
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

      const DataManager = ({ onEdit, settings, setSettings, currentCenter, onSwitchCenter }) => {
        const isAdmin = true;
        const canCopy = true;
        const canEdit = true;
        const canDelete = true;

        const [sessions, setSessions] = useState([]);
        const [groupedMonths, setGroupedMonths] = useState([]);
        const [viewMode, setViewMode] = useState('list'); // 'list' | 'folder'
        const [selectedMonth, setSelectedMonth] = useState(null);
        const [selectedMonthsForPrint, setSelectedMonthsForPrint] = useState([]);
        const [quickSelectMonth, setQuickSelectMonth] = useState('');
        const [loading, setLoading] = useState(true);
        const [printMode, setPrintMode] = useState(false);
        const [viewingSession, setViewingSession] = useState(null);

        // Header Logos Modal State
        const [showLogoModal, setShowLogoModal] = useState(false);
        const [showTursoImportModal, setShowTursoImportModal] = useState(false);
        const [logoModalRight, setLogoModalRight] = useState('');
        const [logoModalLeft, setLogoModalLeft] = useState('');
        const [savingLogoModal, setSavingLogoModal] = useState(false);

        const openLogoModal = () => {
            if (!isAdmin) return;
            setLogoModalRight(settings?.logoRight || '');
            setLogoModalLeft(settings?.logoLeft || '');
            setShowLogoModal(true);
        };

        const handleSaveLogoModal = (logoPayload) => {
            if (!isAdmin) return;
            setSavingLogoModal(true);
            const rightVal = logoPayload && logoPayload.logoRight !== undefined ? logoPayload.logoRight : logoModalRight;
            const leftVal = logoPayload && logoPayload.logoLeft !== undefined ? logoPayload.logoLeft : logoModalLeft;
            const updated = {
                ...(settings || {}),
                facility: currentCenter || undefined,
                logoRight: String(rightVal || '').trim(),
                logoLeft: String(leftVal || '').trim()
            };
            window.google.script.run
                .withSuccessHandler((res) => {
                    setSavingLogoModal(false);
                    if (res && res.token) setStoredAuthToken(res.token);
                    if (setSettings) setSettings(res && res.settings ? res.settings : updated);
                    setShowLogoModal(false);
                })
                .withFailureHandler((err) => {
                    setSavingLogoModal(false);
                    setDateToast({ message: "حدث خطأ أثناء حفظ الشعارات: " + String(err), type: 'error' });
                })
                .saveSettings(updated);
        };

        const toggleMonthSelection = (monthKey) => {
            setSelectedMonthsForPrint(prev => 
                prev.includes(monthKey) 
                    ? prev.filter(m => m !== monthKey)
                    : [...prev, monthKey]
            );
        };

        const selectAllMonths = () => {
            setSelectedMonthsForPrint(groupedMonths.map(g => g.monthKey));
        };

        const deselectAllMonths = () => {
            setSelectedMonthsForPrint([]);
        };

        const handlePrintMonths = (monthKeys) => {
            let keysToPrint = [];
            if (Array.isArray(monthKeys)) {
                keysToPrint = monthKeys;
            } else if (typeof monthKeys === 'string') {
                keysToPrint = [monthKeys];
            } else {
                keysToPrint = selectedMonthsForPrint;
            }

            if (keysToPrint.length === 0) return;

            setSelectedMonthsForPrint(keysToPrint);
            setPrintMode(true);
            setTimeout(() => {
                window.print();
            }, 800);
        };

        const handlePrintMonth = (monthKey) => {
            if (!monthKey) return;
            handlePrintMonths([monthKey]);
        };

        const handleExportExcelMonths = (monthKeys) => {
            let keysToExport = [];
            if (monthKeys === 'all') {
                keysToExport = groupedMonths.map(g => g.monthKey);
            } else if (Array.isArray(monthKeys)) {
                keysToExport = monthKeys;
            } else if (typeof monthKeys === 'string') {
                keysToExport = [monthKeys];
            } else {
                keysToExport = selectedMonthsForPrint;
            }

            if (keysToExport.length === 0) return;

            const targetSessions = [];
            keysToExport.forEach(mKey => {
                const group = groupedMonths.find(g => g.monthKey === mKey);
                if (group && group.sessions) {
                    targetSessions.push(...group.sessions);
                }
            });

            if (targetSessions.length === 0) return;

            exportReportsToExcel({
                sessions: targetSessions,
                settings,
                fileNamePrefix: keysToExport.length === 1 ? 'Monthly_Hand_Hygiene_Report' : 'MultiMonth_Hand_Hygiene_Report'
            });
        };

        // Copy Month states
        const [copyingMonthGroup, setCopyingMonthGroup] = useState(null);
        const [copyTargetMonth, setCopyTargetMonth] = useState(new Date().toISOString().slice(0, 7));
        const [copyProgress, setCopyProgress] = useState(null);
        const [copyErrorMessage, setCopyErrorMessage] = useState(null);

        // Group rows from raw API data into session objects
        const groupRowsBySession = parseSessionsFromRows;

        const processGroupedMonths = (structuredSessions) => {
            const groups = {};
            
            structuredSessions.forEach(session => {
                const date = session.sessionInfo.date;
                if (!date) return;
                
                const monthKey = date.slice(0, 7); // YYYY-MM
                if (!groups[monthKey]) {
                    groups[monthKey] = {
                        monthKey: monthKey,
                        sessions: [],
                        totalOpp: 0,
                        totalAct: 0
                    };
                }
                
                groups[monthKey].sessions.push(session);
                
                // Calculate compliance for this session to aggregate
                session.professionals.forEach(p => {
                    p.opportunities.forEach(o => {
                        if (o.indications.length > 0 || o.action) {
                            groups[monthKey].totalOpp++;
                            if (o.action === 'HW' || o.action === 'HR') {
                                groups[monthKey].totalAct++;
                            }
                        }
                    });
                });
            });

            Object.values(groups).forEach(g => {
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

            const sortedGroups = Object.values(groups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
            setGroupedMonths(sortedGroups);
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

                    // Generate new date keeping same day if possible
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

                    // Clone and update session
                    const newSessionId = uuidv4();
                    const copiedSession = {
                        ...originalSession.sessionInfo,
                        facility: currentCenter || originalSession.sessionInfo.facility,
                        sessionId: newSessionId,
                        periodNumber: String(targetMonth),
                        date: newDateStr
                    };

                    // Map professionals and opportunities (maintaining original column structures)
                    const copiedProfessionals = originalSession.professionals.map(p => ({
                        categoryCode: p.categoryCode,
                        categoryName: p.categoryName,
                        _originalIndex: p._colNo !== undefined ? p._colNo - 1 : undefined,
                        opportunities: p.opportunities.map(o => ({
                            number: o.number,
                            indications: [...o.indications],
                            action: o.action,
                            gloves: o.gloves
                        }))
                    }));

                    setCopyProgress({ current: i + 1, total, status: 'copying' });

                    // Promise wrapper for saveObservationData
                    await new Promise((resolve, reject) => {
                        window.google.script.run
                            .withSuccessHandler((res) => {
                                if (res && res.error) {
                                    reject(new Error(res.error));
                                } else if (res && res.success) {
                                    resolve(res);
                                } else {
                                    reject(new Error("Unknown error saving session"));
                                }
                            })
                            .withFailureHandler((err) => {
                                reject(err);
                            })
                            .saveObservationData(JSON.stringify({
                                ...copiedSession,
                                professionals: copiedProfessionals
                            }));
                    });
                }

                setCopyProgress(prev => ({ ...prev, status: 'success' }));
                setTimeout(() => {
                    setCopyingMonthGroup(null);
                    setCopyProgress(null);
                    fetchRecords(); // Refresh list
                }, 1500);

            } catch (err) {
                console.error("Copy error:", err);
                setCopyErrorMessage(String(err));
                setCopyProgress(prev => ({ ...prev, status: 'error' }));
            }
        };

        const fetchRecords = () => {
           setLoading(true);
           window.google.script.run.withSuccessHandler(data => {
              if (data && data.error) {
                  alert("خطأ أثناء جلب البيانات: " + data.error);
              } else {
                  const scopedData = currentCenter
                     ? (data || []).filter(r => (r['Facility'] || '').trim().toLowerCase() === currentCenter.trim().toLowerCase())
                     : (data || []);
                  const structured = groupRowsBySession(scopedData);
                  setSessions(structured);
                  processGroupedMonths(structured);
              }
              setLoading(false);
           }).withFailureHandler((err) => {
              console.error(err);
              alert("تعذر الاتصال بقاعدة البيانات. فضلا تأكد من الرابط (API_URL) وتأكد من نشر التحديثات فى Google Apps Script.\n\n" + String(err));
              setLoading(false);
           }).getObservationData(currentCenter ? { facility: currentCenter } : undefined);
        };

        useEffect(() => { fetchRecords(); }, [currentCenter]);
        const [deleteConfirmId, setDeleteConfirmId] = useState(null);
        const [deleteMonthsConfirm, setDeleteMonthsConfirm] = useState(null);
        const [deletingMonthLoading, setDeletingMonthLoading] = useState(false);

        // Session Date Editing state
        const [editingDateSession, setEditingDateSession] = useState(null);
        const [modalDateValue, setModalDateValue] = useState('');
        const [inlineEditingId, setInlineEditingId] = useState(null);
        const [inlineDateValue, setInlineDateValue] = useState('');
        const [savingDateSessionId, setSavingDateSessionId] = useState(null);
        const [dateToast, setDateToast] = useState(null);
        const [formFilterQuery, setFormFilterQuery] = useState('');

        // Copy Single Session state
        const [copyingSession, setCopyingSession] = useState(null);
        const [copySessionDate, setCopySessionDate] = useState('');
        const [copyingSessionLoading, setCopyingSessionLoading] = useState(false);

        const handleOpenCopySessionModal = (session) => {
            setCopyingSession(session);
            setCopySessionDate(session.sessionInfo.date || (selectedMonth ? `${selectedMonth}-01` : new Date().toISOString().split('T')[0]));
        };

        const handleConfirmCopySession = () => {
            if (!copyingSession || !copySessionDate) return;
            setCopyingSessionLoading(true);

            const originalSession = copyingSession;
            const newSessionId = uuidv4();
            const [targetYear, targetMonth] = copySessionDate.split('-').map(Number);

            const copiedSession = {
                ...originalSession.sessionInfo,
                facility: currentCenter || originalSession.sessionInfo.facility,
                sessionId: newSessionId,
                periodNumber: String(targetMonth || (new Date(copySessionDate).getMonth() + 1)),
                date: copySessionDate,
                sessionNumber: ''
            };

            const copiedProfessionals = originalSession.professionals.map(p => ({
                categoryCode: p.categoryCode,
                categoryName: p.categoryName,
                _originalIndex: p._colNo !== undefined ? p._colNo - 1 : (p._originalIndex !== undefined ? p._originalIndex : undefined),
                opportunities: p.opportunities.map(o => ({
                    number: o.number,
                    indications: [...o.indications],
                    action: o.action,
                    gloves: o.gloves
                }))
            }));

            window.google.script.run
                .withSuccessHandler(() => {
                    setCopyingSessionLoading(false);
                    setCopyingSession(null);
                    setDateToast({ 
                        message: `تم نسخ الجلسة بنجاح في نفس الشهر بتاريخ (${copySessionDate})! وتم تحديث أرقام الجلسات تلقائياً.`, 
                        type: 'success' 
                    });
                    setTimeout(() => setDateToast(null), 6000);

                    // Optimistic local state update
                    const newSessionObj = {
                        sessionInfo: copiedSession,
                        professionals: originalSession.professionals.map(p => ({
                            categoryCode: p.categoryCode,
                            categoryName: p.categoryName,
                            _colNo: p._colNo,
                            opportunities: p.opportunities.map(o => ({ ...o, indications: [...o.indications] }))
                        }))
                    };
                    setSessions(prev => {
                        const updated = [newSessionObj, ...prev];
                        processGroupedMonths(updated);
                        return updated;
                    });
                })
                .withFailureHandler((err) => {
                    setCopyingSessionLoading(false);
                    setDateToast({ 
                        message: `فشل نسخ الجلسة: ${String(err)}`, 
                        type: 'error' 
                    });
                    setTimeout(() => setDateToast(null), 6000);
                })
                .saveObservationData(JSON.stringify({
                    ...copiedSession,
                    professionals: copiedProfessionals
                }));
        };

        // Department Editing state
        const [inlineEditingDeptId, setInlineEditingDeptId] = useState(null);
        const [inlineDeptValue, setInlineDeptValue] = useState('');
        const [savingDeptSessionId, setSavingDeptSessionId] = useState(null);

        const handleUpdateDepartment = (sessionId, newDept, oldDept) => {
            if (!sessionId || newDept === undefined) return;
            const trimmed = String(newDept).trim();
            if (trimmed === (oldDept || '').trim()) {
                setInlineEditingDeptId(null);
                return;
            }

            setSavingDeptSessionId(sessionId);
            setDateToast(null);

            // 1. Optimistic update in local state immediately (0 database reads)
            setSessions(prev => {
                const updated = prev.map(s => {
                    if (s.sessionInfo.sessionId === sessionId) {
                        return {
                            ...s,
                            sessionInfo: {
                                ...s.sessionInfo,
                                department: trimmed
                            }
                        };
                    }
                    return s;
                });
                processGroupedMonths(updated);
                return updated;
            });

            window.google.script.run
                .withSuccessHandler(() => {
                    setSavingDeptSessionId(null);
                    setInlineEditingDeptId(null);
                    setDateToast({
                        message: `تم تحديث القسم بنجاح إلى "${trimmed || 'بدون قسم'}"!`,
                        type: 'success'
                    });
                    setTimeout(() => setDateToast(null), 5000);
                })
                .withFailureHandler((err) => {
                    setSavingDeptSessionId(null);
                    // Rollback on failure
                    setSessions(prev => {
                        const reverted = prev.map(s => {
                            if (s.sessionInfo.sessionId === sessionId) {
                                return {
                                    ...s,
                                    sessionInfo: {
                                        ...s.sessionInfo,
                                        department: oldDept
                                    }
                                };
                            }
                            return s;
                        });
                        processGroupedMonths(reverted);
                        return reverted;
                    });
                    setDateToast({
                        message: `فشل تحديث القسم: ${String(err)}`,
                        type: 'error'
                    });
                    setTimeout(() => setDateToast(null), 5000);
                })
                .updateSessionDepartment({ sessionId, department: trimmed });
        };

        const handleUpdateDate = (sessionId, newDate, oldDate) => {
            if (!sessionId || !newDate) return;
            if (newDate === oldDate) {
                setInlineEditingId(null);
                setEditingDateSession(null);
                return;
            }

            setSavingDateSessionId(sessionId);
            setDateToast(null);

            window.google.script.run
                .withSuccessHandler((res) => {
                    setSavingDateSessionId(null);
                    setInlineEditingId(null);
                    setEditingDateSession(null);

                    const oldMonth = (oldDate || '').slice(0, 7);
                    const newMonth = newDate.slice(0, 7);
                    const newMonthAr = new Date(newMonth + "-02").toLocaleString('ar', { month: 'long', year: 'numeric' });

                    let msg = `تم تعديل التاريخ بنجاح إلى (${newDate})، وتم تحديث رقم الجلسة تلقائياً إلى: #${res?.newSessionNo || '1'}`;
                    if (oldMonth && newMonth && oldMonth !== newMonth) {
                        msg += ` (تم نقل الجلسة إلى مجلد شهر ${newMonthAr})`;
                    }

                    setDateToast({ message: msg, type: 'success' });
                    setTimeout(() => setDateToast(null), 6000);

                    // Optimistic update without SELECT / fetchRecords()
                    setSessions(prev => {
                        const updated = prev.map(s => {
                            if (s.sessionInfo.sessionId === sessionId) {
                                const d = new Date(newDate);
                                const periodNumber = !isNaN(d.getTime()) ? String(d.getMonth() + 1) : s.sessionInfo.periodNumber;
                                return {
                                    ...s,
                                    sessionInfo: {
                                        ...s.sessionInfo,
                                        date: newDate,
                                        periodNumber: periodNumber,
                                        sessionNumber: res?.newSessionNo || s.sessionInfo.sessionNumber
                                    }
                                };
                            }
                            return s;
                        });
                        processGroupedMonths(updated);
                        return updated;
                    });
                })
                .withFailureHandler((err) => {
                    setSavingDateSessionId(null);
                    setDateToast({ message: `فشل تعديل التاريخ: ${String(err)}`, type: 'error' });
                    setTimeout(() => setDateToast(null), 6000);
                })
                .updateSessionDate({ sessionId, newDate });
        };

        const handleDeleteClick = (sid) => { 
            setDeleteConfirmId(sid);
        };

        const confirmDelete = () => {
            if (deleteConfirmId) {
                const targetSid = deleteConfirmId;
                setDeleteConfirmId(null);

                // Optimistic local update
                setSessions(prev => {
                    const updated = prev.filter(s => s.sessionInfo.sessionId !== targetSid);
                    processGroupedMonths(updated);
                    return updated;
                });

                window.google.script.run.withSuccessHandler(() => {
                    // Deleted on cloud and cached layer, no post-delete re-read required
                }).deleteSession(targetSid);
            }
        };

        const confirmDeleteMonths = () => {
            if (!deleteMonthsConfirm || deleteMonthsConfirm.length === 0) return;
            setDeletingMonthLoading(true);

            const deletedKeys = [...deleteMonthsConfirm];
            window.google.script.run
                .withSuccessHandler(() => {
                    setDeletingMonthLoading(false);
                    setDeleteMonthsConfirm(null);
                    setSelectedMonthsForPrint(prev => prev.filter(m => !deletedKeys.includes(m)));
                    if (selectedMonth && deletedKeys.includes(selectedMonth)) {
                        setSelectedMonth(null);
                        setViewMode('list');
                    }
                    // Optimistic local state update
                    setSessions(prev => {
                        const updated = prev.filter(s => !deletedKeys.includes(s.sessionInfo.date?.slice(0, 7)));
                        processGroupedMonths(updated);
                        return updated;
                    });
                })
                .withFailureHandler((err) => {
                    setDeletingMonthLoading(false);
                    alert("حدث خطأ أثناء حذف البيانات: " + String(err));
                })
                .deleteMonth({ months: deleteMonthsConfirm, facility: currentCenter || undefined });
        };

        const openMonth = (monthKey) => {
            setSelectedMonth(monthKey);
            setViewMode('folder');
        };

        // Memoize data for all selected months for printing
        const printDataForMonths = useMemo(() => {
            if (!printMode) return [];

            let targetKeys = selectedMonthsForPrint;
            if (targetKeys.length === 0 && selectedMonth) {
                targetKeys = [selectedMonth];
            }
            if (targetKeys.length === 0 && groupedMonths.length > 0) {
                targetKeys = [groupedMonths[0].monthKey];
            }

            const profCategories = getProfCategories(settings);
            // Sort selected keys (most recent first)
            const sortedKeys = [...new Set(targetKeys)].sort((a, b) => b.localeCompare(a));

            return sortedKeys.map(mKey => {
                const group = groupedMonths.find(g => g.monthKey === mKey);
                if (!group) return null;

                const sortedSessions = [...group.sessions].sort((a,b) => {
                     return new Date(b.sessionInfo.date) - new Date(a.sessionInfo.date);
                });

                const basicStats = calculateBasicStats(sortedSessions, profCategories);
                const momentsStats = calculateMomentsStats(sortedSessions);
                
                const monthNameAr = new Date(mKey + "-02").toLocaleString('ar', { month: 'long', year: 'numeric' });
                const monthNameEn = new Date(mKey + "-02").toLocaleString('default', { month: 'long', year: 'numeric' });

                return {
                    monthKey: mKey,
                    monthName: `${monthNameAr} (${monthNameEn})`,
                    sessions: sortedSessions,
                    basicStats,
                    momentsStats,
                    profCategories
                };
            }).filter(Boolean);

        }, [printMode, selectedMonthsForPrint, selectedMonth, groupedMonths, settings]);

        // Memoize data for the currently open folder
        const activeFolderData = useMemo(() => {
            if (!selectedMonth) return null;
            const group = groupedMonths.find(g => g.monthKey === selectedMonth);
            if (!group) return null;

            const sortedSessions = [...group.sessions].sort((a,b) => {
                 return new Date(b.sessionInfo.date) - new Date(a.sessionInfo.date);
            });

            const profCategories = getProfCategories(settings);
            const basicStats = calculateBasicStats(sortedSessions, profCategories);
            const momentsStats = calculateMomentsStats(sortedSessions);
            
            const monthName = new Date(selectedMonth + "-02").toLocaleString('default', { month: 'long', year: 'numeric' });

            return {
                monthName,
                sessions: sortedSessions,
                basicStats,
                momentsStats,
                profCategories
            };

        }, [selectedMonth, groupedMonths, settings]);

        const handlePrintAll = () => {
            if (selectedMonth) {
                setSelectedMonthsForPrint([selectedMonth]);
            }
            setPrintMode(true);
            setTimeout(() => {
                window.print();
            }, 800);
        };

        // SINGLE SESSION VIEW / PRINT PREVIEW
        if (viewingSession) {
            return (
                <div className="bg-white p-0 m-0 w-full relative block">
                    <div className="fixed top-4 right-4 z-50 no-print flex items-center gap-2 font-['Cairo']" dir="rtl">
                        <button
                            onClick={() => window.print()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-full shadow-lg font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95"
                        >
                            <span>🖨️ طباعة النموذج</span>
                        </button>
                        <button
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

        // PRINT MODE RENDER (Multi-Month Support)
        if (printMode && printDataForMonths.length > 0) {
            return (
                <div className="bg-white p-0 m-0 w-full relative block">
                     {/* Floating Controls for Print Preview */}
                     <div className="fixed top-4 right-4 z-50 no-print flex items-center gap-2 font-['Cairo']" dir="rtl">
                        {isAdmin && (
                            <button 
                               onClick={openLogoModal} 
                               className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-full shadow-lg font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95" 
                               title="تعديل شعارات الترويسة من Google Drive"
                            >
                               <span>🖼️ شعارات الترويسة</span>
                            </button>
                        )}
                        <button 
                           onClick={() => handleExportExcelMonths(printDataForMonths.map(m => m.monthKey))} 
                           className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-full shadow-lg font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95" 
                           title="تنزيل التقرير الحالي في شيت إكسيل"
                        >
                           <Icons.Excel />
                           <span>تنزيل Excel</span>
                        </button>
                        <button 
                           onClick={() => window.print()} 
                           className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-full shadow-lg font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95" 
                           title="إعادة فتح نافذة الطباعة"
                        >
                           <span>🖨️ طباعة الآن</span>
                        </button>
                        <button 
                           onClick={() => setPrintMode(false)} 
                           className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg font-bold text-xs flex items-center gap-2 transition-transform active:scale-95"
                        >
                           <span>إغلاق المعاينة ✕</span>
                        </button>
                     </div>

                     {printDataForMonths.map((mMonth, monthIdx) => (
                         <React.Fragment key={mMonth.monthKey}>
                             {/* Page 1: Basic Report */}
                             <div className="print-centered-page">
                                 <div className="print-report-container">
                                    <WHOHeader small={true} settings={settings} />
                                    <div className="text-center font-bold text-xl mb-3 mt-4">Basic Compliance Report</div>
                                    <div className="text-center text-sm font-bold text-gray-700 mb-6">{mMonth.monthName}</div>
                                    {renderBasicTable(mMonth.basicStats, mMonth.profCategories)}
                                    <div className="print-footer">
                                        <div className="mb-0.5">{settings?.header1 || "مستشفى المنيا الجامعى للعيون"} - {settings?.header2 || "وحدة مكافحة العدوي"}</div>
                                        <div className="text-[7pt] font-normal italic text-slate-500">Based on WHO's Hand Hygiene Compliance Observation Form</div>
                                    </div>
                                 </div>
                             </div>
                             

                             {/* Page 2: Moments Report */}
                             <div className="print-centered-page">
                                 <div className="print-report-container">
                                    <WHOHeader small={true} settings={settings} />
                                    <div className="text-center font-bold text-xl mb-3 mt-4">Moments Compliance Report</div>
                                    <div className="text-center text-sm font-bold text-gray-700 mb-6">{mMonth.monthName}</div>
                                    {renderMomentsTable(mMonth.momentsStats)}
                                    <div className="print-footer">
                                        <div className="mb-0.5">{settings?.header1 || "مستشفى المنيا الجامعى للعيون"} - {settings?.header2 || "وحدة مكافحة العدوي"}</div>
                                        <div className="text-[7pt] font-normal italic text-slate-500">Based on WHO's Hand Hygiene Compliance Observation Form</div>
                                    </div>
                                 </div>
                             </div>
                             

                             {/* Subsequent Pages: Observation Forms */}
                             {mMonth.sessions.map((session, idx) => {
                                const isAbsoluteLast = (monthIdx === printDataForMonths.length - 1) && (idx === mMonth.sessions.length - 1);
                                return (
                                    <React.Fragment key={session.sessionInfo.sessionId}>
                                        <div className={`print-centered-page ${isAbsoluteLast ? 'last-page' : ''}`}>
                                            <ReadOnlyObservationForm sessionData={session} sessionIndex={idx} totalSessions={mMonth.sessions.length} settings={settings} />
                                        </div>
                                    </React.Fragment>
                                );
                             })}
                         </React.Fragment>
                     ))}

                     {/* Logo Modal when in print preview */}
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

        // FOLDER VIEW (Detail)
        if (viewMode === 'folder' && activeFolderData) {
            const filteredSessions = activeFolderData.sessions.filter(s => {
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
                    {/* Notification Toast for Date Updates */}
                    {dateToast && (
                        <div className={`mb-4 p-3.5 rounded-xl border shadow-sm flex items-center justify-between font-['Cairo'] text-sm font-bold transition-all ${
                            dateToast.type === 'success' 
                                ? 'bg-green-50 text-green-800 border-green-300' 
                                : 'bg-red-50 text-red-800 border-red-300'
                        }`} dir="rtl">
                            <div className="flex items-center gap-2">
                                <span className="text-base">{dateToast.type === 'success' ? '✓' : '✕'}</span>
                                <span>{dateToast.message}</span>
                            </div>
                            <button onClick={() => setDateToast(null)} className="text-slate-400 hover:text-slate-700 px-2 py-1 text-sm font-bold">
                                ✕
                            </button>
                        </div>
                    )}

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6 flex justify-between items-center sticky top-0 z-40">
                         <div className="flex items-center gap-3">
                             <button onClick={() => setViewMode('list')} className="text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors" title="العودة لقائمة الشهور">
                                 <span className="text-lg">←</span>
                             </button>
                             <div>
                                 <h2 className="text-xl font-bold text-slate-800">{activeFolderData.monthName}</h2>
                                 <p className="text-xs text-slate-500">{activeFolderData.sessions.length} Forms Saved</p>
                             </div>
                         </div>
                         <div className="flex flex-wrap items-center gap-2 justify-end">
                             {isAdmin && (
                                 <button onClick={openLogoModal} className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-2 rounded-lg font-bold shadow-sm flex items-center gap-1.5 transition-all text-xs font-['Cairo']" title="تعديل شعارات الترويسة للطباعة من Google Drive">
                                     <span>🖼️ شعارات الترويسة</span>
                                 </button>
                             )}
                             <button onClick={() => handleExportExcelMonths([selectedMonth])} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 text-xs font-['Cairo']" title="تنزيل تقارير هذا الشهر في شيت إكسيل">
                                 <Icons.Excel />
                                 <span>تنزيل التقرير (Excel)</span>
                             </button>
                             <button onClick={handlePrintAll} className="bg-[#F26522] hover:bg-[#d9531e] text-white px-4 py-2 rounded-lg font-bold shadow-sm flex items-center transition-all active:scale-95 text-xs">
                                 <span className="mr-1.5"><Icons.Download/></span> Save as PDF (Reports + Forms)
                             </button>
                             {canDelete && (
                                 <button onClick={() => setDeleteMonthsConfirm([selectedMonth])} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded-lg font-bold text-xs shadow-sm flex items-center gap-1 transition-all active:scale-95" title="حذف هذا الشهر بكل سجلاته">
                                     <Icons.Trash /> Delete Month / حذف
                                 </button>
                             )}
                         </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div>
                             <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Icons.Chart/> Basic Report</h3>
                             {renderBasicTable(activeFolderData.basicStats, activeFolderData.profCategories)}
                        </div>
                        <div>
                             <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Icons.Chart/> Moments Report</h3>
                             {renderMomentsTable(activeFolderData.momentsStats)}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-700">Observation Forms ({activeFolderData.sessions.length})</h3>
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
                                filteredSessions.map(s => {
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
                                                            onClick={() => handleUpdateDate(s.sessionInfo.sessionId, inlineDateValue, s.sessionInfo.date)}
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
                                                                title="انقر لتعديل التاريخ وتحديث رقم الجلسة تلقائياً"
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
                                                            onClick={() => handleUpdateDepartment(s.sessionInfo.sessionId, inlineDeptValue, s.sessionInfo.department)}
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
                                                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-200 shadow-xs" title="رقم الجلسة يتم ترتيبة زمنياً تلقائياً">
                                                    <span>#{s.sessionInfo.sessionNumber || '-'}</span>
                                                    <span className="text-[10px] text-orange-600 font-normal hidden lg:inline">(تلقائي)</span>
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
                                                        onClick={() => handleDeleteClick(s.sessionInfo.sessionId)} 
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
                                <p className="text-slate-600 mb-6">Are you sure you want to delete this session? This action cannot be undone.</p>
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium transition-colors">Cancel</button>
                                    <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors">Delete</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Session Date Modal */}
                    {editingDateSession && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-['Cairo']" dir="rtl" onClick={() => !savingDateSessionId && setEditingDateSession(null)}>
                            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-right border border-slate-200" onClick={(e) => e.stopPropagation()}>
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
                                        <span className="font-bold text-slate-800">{editingDateSession.sessionInfo.facility || '-'} / {editingDateSession.sessionInfo.department || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">التاريخ الحالي:</span>
                                        <span className="font-bold text-slate-800">{editingDateSession.sessionInfo.date || 'غير محدد'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">رقم الجلسة الحالي:</span>
                                        <span className="font-bold text-[#F26522]">#{editingDateSession.sessionInfo.sessionNumber || '-'}</span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                        اختر التاريخ الجديد:
                                    </label>
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
                                        onClick={() => handleUpdateDate(editingDateSession.sessionInfo.sessionId, modalDateValue, editingDateSession.sessionInfo.date)}
                                        className="px-5 py-2 bg-[#F26522] hover:bg-[#d9531e] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
                                    >
                                        {savingDateSessionId === editingDateSession.sessionInfo.sessionId ? <Icons.Spinner /> : <Icons.Check />}
                                        <span>{savingDateSessionId === editingDateSession.sessionInfo.sessionId ? 'جاري الحفظ والتحديث...' : 'حفظ وتحديث رقم الجلسة تلقائياً'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Copy Session in Same Month Modal */}
                    {copyingSession && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-['Cairo']" dir="rtl" onClick={() => !copyingSessionLoading && setCopyingSession(null)}>
                            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-right border border-slate-200" onClick={(e) => e.stopPropagation()}>
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
                                        <span className="font-bold text-slate-800">{copyingSession.sessionInfo.facility || '-'} / {copyingSession.sessionInfo.department || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">تاريخ الجلسة الأصلية:</span>
                                        <span className="font-bold text-slate-800">{copyingSession.sessionInfo.date || 'غير محدد'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">رقم الجلسة الأصلية:</span>
                                        <span className="font-bold text-[#F26522]">#{copyingSession.sessionInfo.sessionNumber || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">عدد الفرص المسجلة:</span>
                                        <span className="font-bold text-slate-800">
                                            {copyingSession.professionals.reduce((sum, p) => sum + (p.opportunities ? p.opportunities.filter(o => o.indications.length > 0 || o.action).length : 0), 0)} فرصة
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-sm font-bold text-slate-700">
                                            تاريخ النسخة الجديدة:
                                        </label>
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
                                            if (!copyingSession.sessionInfo.date) return null;
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
                                        <span>{copyingSessionLoading ? 'جاري نسخ الجلسة والترقيم...' : 'تأكيد نسخ الجلسة في نفس الشهر'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // MAIN LIST VIEW (Grouped by Month)
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
                                onClick={() => handleExportExcelMonths('all')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded shadow-sm text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 font-['Cairo']"
                                title="تصدير جميع الأشهر والسجلات في ملف إكسيل واحد"
                            >
                                <Icons.Excel />
                                <span>تصدير كل التقارير (Excel)</span>
                            </button>
                        )}
                        <button onClick={fetchRecords} className="text-slate-500 hover:text-slate-800 p-2 bg-white border border-slate-300 rounded shadow-sm text-xs font-bold transition-colors">
                           Refresh Data
                        </button>
                     </div>
                 </div>
                 
                 {/* Month Selection Bar for Direct Printing & Viewing (Supports Multiple Months) */}
                 {groupedMonths.length > 0 && (
                     <div className="px-6 py-4 bg-orange-50/90 border-b border-orange-200/80 font-['Cairo']" dir="rtl">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                             <div className="flex items-center gap-2">
                                 <span className="text-[#F26522] text-lg"><Icons.Print /></span>
                                 <span className="font-bold text-sm text-slate-800">
                                     {canDelete ? 'تحديد الأشهر للطباعة أو تنزيل Excel أو الحذف:' : 'تحديد الأشهر للطباعة أو تنزيل Excel:'}
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
                     <div className="p-12 text-center text-slate-500"><Icons.Spinner/> Loading database...</div>
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
                            {groupedMonths.map(group => {
                                const isSelected = selectedMonthsForPrint.includes(group.monthKey);
                                const complianceNum = group.totalOpp > 0 ? (group.totalAct / group.totalOpp) * 100 : 0;
                                const compliance = complianceNum.toFixed(2);
                                const monthDisplay = new Date(group.monthKey + "-02").toLocaleString('default', { month: 'long', year: 'numeric' });
                                const arMonthDisplay = new Date(group.monthKey + "-02").toLocaleString('ar', { month: 'long', year: 'numeric' });
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
                                        <div className="text-xs text-slate-400 font-mono mt-0.5">{monthDisplay} ({group.monthKey})</div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-medium">
                                        <span className="bg-slate-100 text-slate-700 py-1 px-3 rounded-full font-bold">{group.sessions.length}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${complianceNum >= 80 ? 'bg-green-100 text-green-800' : complianceNum >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                            {compliance}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                            onClick={() => handleExportExcelMonths([group.monthKey])} 
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded transition-all active:scale-95 flex items-center gap-1 shadow-sm font-['Cairo']"
                                            title="تنزيل تقرير هذا الشهر في شيت إكسيل"
                                        >
                                            <Icons.Excel /> Excel / إكسيل
                                        </button>
                                        <button 
                                            onClick={() => handlePrintMonths([group.monthKey])} 
                                            className="bg-[#F26522] hover:bg-[#d9531e] text-white font-bold text-xs px-3 py-2 rounded transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                                            title="طباعة هذا الشهر مباشرة"
                                        >
                                            <Icons.Print /> Print / طباعة
                                        </button>
                                        {canCopy && (
                                            <button 
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
                                            onClick={() => openMonth(group.monthKey)} 
                                            className="text-slate-700 hover:text-slate-900 font-bold text-xs bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded transition-colors"
                                        >
                                            Open Folder →
                                        </button>
                                        {canDelete && (
                                            <button 
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
             
             {/* Copy Month Modal */}
             {copyingMonthGroup && (
                 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 font-['Cairo']" onClick={() => !copyProgress && setCopyingMonthGroup(null)}>
                     <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-right" dir="rtl" onClick={(e) => e.stopPropagation()}>
                         <h3 className="text-xl font-bold text-slate-800 mb-3 border-b pb-2 flex items-center gap-2">
                             <span>نسخ سجلات شهر</span>
                             <span className="text-[#F26522]">{new Date(copyingMonthGroup.monthKey + "-02").toLocaleString('ar', { month: 'long', year: 'numeric' })}</span>
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
                                     onChange={e => setCopyTargetMonth(e.target.value)} 
                                     disabled={copyProgress && copyProgress.status === 'copying'}
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
                                             <div className="bg-[#F26522] h-2.5 rounded-full transition-all duration-300" style={{ width: `${(copyProgress.current / copyProgress.total) * 100}%` }}></div>
                                         </div>
                                     </div>
                                 )}
                                 {copyProgress.status === 'success' && (
                                     <div className="text-center py-2 text-green-600 font-bold flex flex-col items-center">
                                         <span className="text-3xl mb-1">✓</span>
                                         <span>تم نسخ جميع البيانات بنجاح إلى شهر {new Date(copyTargetMonth + "-02").toLocaleString('ar', { month: 'long', year: 'numeric' })}!</span>
                                     </div>
                                 )}
                                 {copyProgress.status === 'error' && (
                                     <div className="text-center py-2 text-red-600 font-bold">
                                         <span className="text-3xl mb-1">✕</span>
                                         <div className="text-sm font-bold">فشلت عملية النسخ:</div>
                                         <div className="text-xs font-mono font-normal mt-2 text-left bg-red-50 p-2 rounded border border-red-200 break-words">{copyErrorMessage}</div>
                                     </div>
                                 )}
                             </div>
                         )}
                         
                         {(!copyProgress || copyProgress.status === 'error') && (
                             <div className="flex justify-start gap-3 mt-6">
                                 <button 
                                     onClick={() => setCopyingMonthGroup(null)} 
                                     className="px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg font-bold text-sm transition-colors active:scale-95"
                                 >
                                     إلغاء
                                 </button>
                                 <button 
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
              {/* Delete Month(s) Modal */}
              {deleteMonthsConfirm && deleteMonthsConfirm.length > 0 && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-['Cairo']" dir="rtl" onClick={() => !deletingMonthLoading && setDeleteMonthsConfirm(null)}>
                      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-right border border-slate-200" onClick={(e) => e.stopPropagation()}>
                          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto">
                              <Icons.Trash />
                          </div>
                          <h3 className="text-xl font-bold text-slate-800 text-center mb-2">تأكيد حذف الشهر / الأشهر</h3>
                          <p className="text-slate-600 text-sm text-center mb-4 leading-relaxed">
                              هل أنت تأكيد من رغبتك في حذف البيانات والسجلات المندرجة تحت <span className="font-bold text-red-600">({deleteMonthsConfirm.length})</span> شهر؟
                          </p>
                          
                          <div className="bg-red-50/80 border border-red-200/80 rounded-lg p-3 mb-4 max-h-36 overflow-y-auto">
                              <div className="text-xs font-bold text-red-800 mb-1.5">قائمة الأشهر التي سيتم حذفها نهائياً:</div>
                              <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                                  {deleteMonthsConfirm.map(mKey => {
                                      const arName = new Date(mKey + "-02").toLocaleString('ar', { month: 'long', year: 'numeric' });
                                      const matchingGroup = groupedMonths.find(g => g.monthKey === mKey);
                                      const count = matchingGroup ? matchingGroup.sessions.length : 0;
                                      return (
                                          <li key={mKey} className="font-medium">
                                              <span className="font-bold text-slate-900">{arName}</span> ({mKey}) - <span className="font-bold text-red-700">{count} نموذج</span>
                                          </li>
                                      );
                                  })}
                              </ul>
                          </div>

                          <p className="text-[11px] text-slate-500 text-center mb-6">⚠️ تنبيه: لا يمكن التراجع عن هذه العملية لاحقاً وسيتم مسح جميع نماذج هذه الأشهر من قاعدة البيانات.</p>

                          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                              <button 
                                  disabled={deletingMonthLoading}
                                  onClick={() => setDeleteMonthsConfirm(null)} 
                                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-xs transition-colors border border-slate-300"
                              >
                                  إلغاء
                              </button>
                              <button 
                                  disabled={deletingMonthLoading}
                                  onClick={confirmDeleteMonths} 
                                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-50"
                              >
                                  {deletingMonthLoading ? <Icons.Spinner /> : <Icons.Trash />}
                                  <span>{deletingMonthLoading ? 'جاري الحذف...' : 'نعم، أؤكد الحذف النهائى'}</span>
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {/* Header Logo Modal for Folder and List Views */}
              <HeaderLogoModal 
                  isOpen={showLogoModal} 
                  onClose={() => setShowLogoModal(false)} 
                  settings={settings}
                  onSave={handleSaveLogoModal}
                  isSaving={savingLogoModal}
              />

              {/* Turso Database Import Modal */}
              <TursoImportModal
                  isOpen={showTursoImportModal}
                  onClose={() => setShowTursoImportModal(false)}
                  onImportSuccess={() => {
                      fetchRecords();
                      if (setSettings) {
                          (window as any).google.script.run
                              .withSuccessHandler((s: any) => { if (s) setSettings(s); })
                              .getSettings(currentCenter ? { facility: currentCenter } : undefined);
                      }
                  }}
              />
           </div>
        );
      };

      class ErrorBoundary extends React.Component {
        constructor(props) { super(props); this.state = { hasError: false, error: null }; }
        static getDerivedStateFromError(error) { return { hasError: true, error }; }
        componentDidCatch(error) { console.error(error); }
        render() { 
          if (this.state.hasError) return (
            <div className="p-4 bg-red-100 text-red-800 rounded m-4 border border-red-200">
               <h3 className="font-bold mb-2">Something went wrong.</h3>
               <pre className="text-xs overflow-auto">{this.state.error && this.state.error.toString()}</pre>
               <button onClick={() => window.location.reload()} className="mt-2 bg-red-800 text-white px-3 py-1 rounded text-sm">Reload Page</button>
            </div>
          ); 
          return this.props.children; 
        }
      }
      
      const NavLink = ({ id, label, icon, currentView, setView }) => {
         const isActive = currentView === id;
         return (
             <button 
                onClick={() => setView(id)} 
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all active:scale-95 ${
                    isActive 
                    ? 'bg-orange-50 text-orange-600' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
             >
                <span className={isActive ? 'opacity-100' : 'opacity-70'}>{icon}</span>
                {label}
             </button>
         );
      }

      const NavButton = ({ id, label, icon, active, setView }) => (
          <button 
            onClick={() => setView(id)}
            className={`flex flex-col items-center justify-center w-full py-1 active:scale-90 transition-transform duration-200 ${active ? 'text-[#F26522]' : 'text-slate-400'}`}
          >
            <div className={`mb-1 ${active ? 'opacity-100' : 'opacity-70'}`}>{icon}</div>
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </button>
      );

      const MobileBottomNav = ({ currentView, setView, canAccessSettings = true, onSwitchCenter, currentCenter }) => (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center px-2 py-2 pb-safe z-50 md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.03)] backdrop-blur-lg bg-white/90">
             <NavButton id="form" label="Form" icon={<Icons.Form/>} active={currentView === 'form'} setView={setView} />
             <NavButton id="dashboard" label="Dash" icon={<Icons.Activity/>} active={currentView === 'dashboard'} setView={setView} />
             <NavButton id="records" label="Records" icon={<Icons.Database/>} active={currentView === 'records'} setView={setView} />
             {canAccessSettings && (
                 <NavButton id="settings" label="Settings" icon={<Icons.Settings/>} active={currentView === 'settings'} setView={setView} />
             )}
             {onSwitchCenter && (
                 <button 
                   onClick={onSwitchCenter}
                   className="flex flex-col items-center justify-center w-full py-1 active:scale-90 transition-transform duration-200 text-slate-500 hover:text-orange-600 font-['Cairo']"
                   title={`المركز النشط: ${currentCenter || ''} - انقر للتبديل`}
                 >
                   <div className="mb-1 opacity-80">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600">
                         <path d="M3 21h18"/>
                         <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
                      </svg>
                   </div>
                   <span className="text-[9px] font-bold leading-none truncate max-w-[65px]">{currentCenter ? 'تبديل' : 'المراكز'}</span>
                 </button>
             )}
          </div>
      );

      const ListEditor = ({ label, items, onChange, placeholder, readOnly = false }) => {
          const [newItem, setNewItem] = useState('');
          const handleAdd = () => {
              if (readOnly) return;
              if (newItem.trim()) {
                  onChange([...(items || []), newItem.trim()]);
                  setNewItem('');
              }
          };
          const handleRemove = (index) => {
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
                              onChange={e => setNewItem(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                              placeholder={placeholder}
                          />
                          <button 
                              onClick={handleAdd}
                              className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                          >
                              Add
                          </button>
                      </div>
                  )}
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {(!items || items.length === 0) && <div className="text-xs text-gray-400 italic">No items added yet.</div>}
                      {items && items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white border border-gray-200 px-2 py-1.5 rounded text-sm">
                              <span className="truncate mr-2">{item}</span>
                              {!readOnly && (
                                  <button onClick={() => handleRemove(idx)} className="text-red-500 hover:text-red-700 p-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                  </button>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          );
      };

      const Settings = ({ settings, setSettings, currentCenter, onSelectCenter, onSwitchCenter }) => {
          const isReadOnly = false;
          const [showTursoImportModal, setShowTursoImportModal] = useState(false);
          const [centerToDeleteInSettings, setCenterToDeleteInSettings] = useState<string | null>(null);
          const [deletingCenterLoading, setDeletingCenterLoading] = useState(false);
          const [newCenterInput, setNewCenterInput] = useState('');
          const [addingCenterLoading, setAddingCenterLoading] = useState(false);

          const [localSettings, setLocalSettings] = useState(settings || {
              header1: "مستشفى المنيا الجامعى للعيون",
              header2: "وحدة مكافحة العدوي",
              header3: "أحصائية غسيل الأيدي",
              logoRight: "",
              logoLeft: "",
              facilities: [],
              services: [],
              wards: [],
              departments: [],
              observers: [],
              cities: [],
              profCategories: []
          });
          const [isSaving, setIsSaving] = useState(false);
          const [message, setMessage] = useState(null);

          const handleAddNewCenterInSettings = () => {
              const name = newCenterInput.trim();
              if (!name) return;
              setAddingCenterLoading(true);
              window.google.script.run
                  .withSuccessHandler((res: any) => {
                      setAddingCenterLoading(false);
                      setNewCenterInput('');
                      if (res && res.success) {
                          setMessage({ type: 'success', text: res.message || `تمت إضافة المركز "${name}" بنجاح` });
                          if (res.settings?.facilities) {
                              const nextFacs = res.settings.facilities;
                              setLocalSettings(prev => ({ ...prev, facilities: nextFacs }));
                              if (setSettings) setSettings(prev => ({ ...(prev || {}), facilities: nextFacs }));
                          }
                      } else {
                          setMessage({ type: 'error', text: res?.error || 'حدث خطأ أثناء إضافة المركز' });
                      }
                  })
                  .withFailureHandler((err: any) => {
                      setAddingCenterLoading(false);
                      setMessage({ type: 'error', text: 'فشل إضافة المركز: ' + String(err) });
                  })
                  .addFacility({ facility: name });
          };

          const handleDeleteCenterCascadeInSettings = () => {
              if (!centerToDeleteInSettings) return;
              const name = centerToDeleteInSettings;
              setDeletingCenterLoading(true);
              window.google.script.run
                  .withSuccessHandler((res: any) => {
                      setDeletingCenterLoading(false);
                      setCenterToDeleteInSettings(null);
                      if (res && res.success) {
                          setMessage({ type: 'success', text: res.message || `تم حذف المركز "${name}" وكافة بياناته بنجاح` });
                          if (res.settings?.facilities) {
                              const nextFacs = res.settings.facilities;
                              setLocalSettings(prev => ({ ...prev, facilities: nextFacs }));
                              if (setSettings) setSettings(prev => ({ ...(prev || {}), facilities: nextFacs }));
                          }
                          if (currentCenter && currentCenter.trim().toLowerCase() === name.trim().toLowerCase()) {
                              if (onSwitchCenter) onSwitchCenter();
                          }
                      } else {
                          setMessage({ type: 'error', text: res?.error || 'حدث خطأ أثناء حذف المركز' });
                      }
                  })
                  .withFailureHandler((err: any) => {
                      setDeletingCenterLoading(false);
                      setCenterToDeleteInSettings(null);
                      setMessage({ type: 'error', text: 'فشل حذف المركز: ' + String(err) });
                  })
                  .deleteFacility({ facility: name });
          };

          useEffect(() => {
              if (settings) {
                  setLocalSettings(settings);
              }
          }, [settings]);

          const handleChange = (field, value) => {
              setLocalSettings(prev => ({ ...prev, [field]: value }));
          };

          const handleArrayChange = (field, value) => {
              setLocalSettings(prev => ({ ...prev, [field]: value }));
          };

          const handleSave = () => {
              setIsSaving(true);
              setMessage(null);

              let runner = window.google.script.run.withSuccessHandler((res) => {
                  setIsSaving(false);
                  if (res && res.success === false) {
                      setMessage({ type: 'error', text: res.error || 'تعذر حفظ الإعدادات' });
                      return;
                  }
                  setMessage({
                      type: 'success',
                      text: `تم حفظ إعدادات المركز "${currentCenter || ''}" بنجاح!`
                  });
                  setSettings(res && res.settings ? res.settings : localSettings);
                  setTimeout(() => setMessage(null), 4000);
              });
              if (typeof runner.withFailureHandler === 'function') {
                  runner = runner.withFailureHandler((error) => {
                      setIsSaving(false);
                      setMessage({ type: 'error', text: 'تعذر حفظ الإعدادات: ' + (error?.message || String(error)) });
                  });
              }
              runner.saveSettings({ ...localSettings, facility: currentCenter || undefined });
          };

          return (
              <div className="bg-white mx-auto max-w-[850px] paper-container shadow-xl min-h-[calc(100vh-150px)] print:min-h-0 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 mb-6 gap-2">
                      <h1 className="text-2xl font-bold text-gray-800">Application Settings</h1>
                  </div>

                  {message && (
                      <div className={`p-3 mb-4 rounded-lg text-sm font-bold font-['Cairo'] ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`} dir="rtl">
                          {message.text}
                      </div>
                  )}

                  <div className="space-y-6">
                      <section>
                          <h2 className="text-lg font-semibold text-gray-700 mb-3 font-['Cairo']">نصوص الترويسة (Headers)</h2>
                          <div className="space-y-3">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Header 1 (Main Title)</label>
                                  <input type="text" className="w-full form-input-bg h-10 px-3 rounded border border-gray-300" value={localSettings.header1} onChange={e => handleChange('header1', e.target.value)} />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Header 2 (Subtitle)</label>
                                  <input type="text" className="w-full form-input-bg h-10 px-3 rounded border border-gray-300" value={localSettings.header2} onChange={e => handleChange('header2', e.target.value)} />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Header 3 (Form Title)</label>
                                  <input type="text" className="w-full form-input-bg h-10 px-3 rounded border border-gray-300" value={localSettings.header3} onChange={e => handleChange('header3', e.target.value)} />
                              </div>
                          </div>
                      </section>

                      <section className="bg-orange-50/60 p-4 rounded-xl border border-orange-200">
                          <div className="flex items-center justify-between mb-3">
                              <h2 className="text-lg font-bold text-orange-900 font-['Cairo'] flex items-center gap-2">
                                  <span>🖼️ شعارات الترويسة للطباعة (Header Logos)</span>
                              </h2>
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">Google Drive</span>
                          </div>

                          <p className="text-xs text-gray-600 mb-4 leading-relaxed font-['Cairo']" dir="rtl">
                             يمكنك إضافة شعارين في ترويسة ملفات الطباعة (واحد جهة اليمين والآخر جهة اليسار) عبر لصق رابط Google Drive للصورة. يتم ضبط حجم الشعارين تلقائياً ليلائم الترويسة مع بقاء النصوص في الوسط دون تغيير.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              {/* Right Logo */}
                              <div className="bg-white p-3 rounded-lg border border-orange-200 shadow-sm">
                                  <label className="block text-sm font-bold text-gray-800 mb-1 font-['Cairo'] flex items-center justify-between">
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
                                      onChange={e => handleChange('logoRight', e.target.value)} 
                                  />
                                  <div className="mt-2 flex items-center gap-3">
                                      <div className="w-16 h-12 bg-slate-100 border border-dashed border-slate-300 rounded flex items-center justify-center overflow-hidden shrink-0">
                                          {localSettings.logoRight ? (
                                              <img 
                                                  src={formatGoogleDriveUrl(localSettings.logoRight)} 
                                                  alt="Right Logo Preview" 
                                                  className="max-h-full max-w-full object-contain"
                                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                              />
                                          ) : (
                                              <span className="text-[10px] text-slate-400">لا يوجد</span>
                                          )}
                                      </div>
                                      <span className="text-[11px] text-slate-500 font-['Cairo']">معاينة شعار اليمين</span>
                                  </div>
                              </div>

                              {/* Left Logo */}
                              <div className="bg-white p-3 rounded-lg border border-orange-200 shadow-sm">
                                  <label className="block text-sm font-bold text-gray-800 mb-1 font-['Cairo'] flex items-center justify-between">
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
                                      onChange={e => handleChange('logoLeft', e.target.value)} 
                                  />
                                  <div className="mt-2 flex items-center gap-3">
                                      <div className="w-16 h-12 bg-slate-100 border border-dashed border-slate-300 rounded flex items-center justify-center overflow-hidden shrink-0">
                                          {localSettings.logoLeft ? (
                                              <img 
                                                  src={formatGoogleDriveUrl(localSettings.logoLeft)} 
                                                  alt="Left Logo Preview" 
                                                  className="max-h-full max-w-full object-contain"
                                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                              />
                                          ) : (
                                              <span className="text-[10px] text-slate-400">لا يوجد</span>
                                          )}
                                      </div>
                                      <span className="text-[11px] text-slate-500 font-['Cairo']">معاينة شعار اليسار</span>
                                  </div>
                              </div>
                          </div>

                          {/* Info tip on Google Drive sharing */}
                          <div className="bg-amber-100/70 text-amber-900 border border-amber-300 rounded-lg p-2.5 text-xs font-['Cairo'] flex items-start gap-2 mb-4" dir="rtl">
                              <span className="text-base leading-none">💡</span>
                              <div>
                                  <span className="font-bold">تنبيه هام لرابط Google Drive:</span> تأكد من ضبط إذن مشاركة الصورة في Google Drive على <strong>"أي شخص لديه الرابط يمكنه العرض" (Anyone with the link)</strong> لكي تظهر الصورة وتُطبع دون عوائق.
                              </div>
                          </div>

                          {/* Live Header Preview */}
                          <div className="mt-3">
                              <div className="text-xs font-bold text-gray-700 mb-1 font-['Cairo'] flex items-center justify-between">
                                  <span>معاينة حية لشكل الترويسة عند الطباعة:</span>
                                  <span className="text-[10px] text-gray-500 font-normal">النصوص في المنتصف والشعارات على اليمين واليسار</span>
                              </div>
                              <div className="rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                                  <WHOHeader small={true} settings={localSettings} />
                              </div>
                          </div>
                      </section>

                      {/* Centers Management Section */}
                      <section className="bg-gradient-to-r from-orange-50/90 via-amber-50/70 to-orange-50/90 p-5 rounded-xl border border-orange-200 font-['Cairo'] shadow-xs" dir="rtl">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                              <div>
                                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                                      <span>إدارة المراكز والمنشآت الصحية (Centers)</span>
                                      <span className="text-[10px] bg-orange-200 text-orange-900 font-bold px-2 py-0.5 rounded-full">
                                          {(localSettings?.facilities || []).length} مركز مسجل
                                      </span>
                                  </h2>
                                  <p className="text-xs text-slate-600 mt-1">
                                      المركز النشط حالياً: <strong className="text-orange-950 bg-white px-2.5 py-0.5 rounded-md border border-orange-200 shadow-2xs font-bold">{currentCenter || 'لم يتم اختيار مركز'}</strong>
                                  </p>
                              </div>
                              {onSwitchCenter && (
                                  <button
                                      type="button"
                                      onClick={onSwitchCenter}
                                      className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition shrink-0 flex items-center justify-center gap-1.5 active:scale-95"
                                  >
                                      <span>شاشة تسجيل وتبديل المراكز</span>
                                      <span className="text-sm text-orange-600">⇄</span>
                                  </button>
                              )}
                          </div>

                          {/* Add Center Inline */}
                          <div className="flex flex-col sm:flex-row gap-2 mb-4 bg-white p-3 rounded-xl border border-orange-200/80 shadow-2xs">
                              <input
                                  type="text"
                                  placeholder="أدخل اسم المركز أو المستشفى الجديد..."
                                  value={newCenterInput}
                                  onChange={e => setNewCenterInput(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewCenterInSettings(); } }}
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

                          {/* Centers List */}
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                              {(!localSettings?.facilities || localSettings.facilities.length === 0) && (
                                  <div className="text-xs text-slate-400 italic text-center py-4 bg-white rounded-lg border border-slate-200">
                                      لا توجد مراكز مضافة بعد.
                                  </div>
                              )}
                              {localSettings?.facilities && localSettings.facilities.map((facName: string, idx: number) => {
                                  const isActive = currentCenter && currentCenter.trim().toLowerCase() === facName.trim().toLowerCase();
                                  return (
                                      <div
                                          key={idx}
                                          className={`flex items-center justify-between p-3 rounded-xl border transition-all text-xs font-semibold ${
                                              isActive
                                                  ? 'bg-white border-orange-400 ring-1 ring-orange-200 shadow-2xs'
                                                  : 'bg-white border-slate-200 hover:border-orange-200'
                                          }`}
                                      >
                                          <div className="flex items-center gap-2.5">
                                              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300'}`}></span>
                                              <span className="text-slate-800 font-bold text-sm">{facName}</span>
                                              {isActive && (
                                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                                      النشط حالياً
                                                  </span>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                              {!isActive && onSelectCenter && (
                                                  <button
                                                      type="button"
                                                      onClick={() => onSelectCenter(facName)}
                                                      className="text-orange-700 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition text-[11px] font-bold"
                                                  >
                                                      تفعيل المركز
                                                  </button>
                                              )}
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
                                  );
                              })}
                          </div>
                      </section>

                      <section>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <h2 className="text-lg font-semibold text-gray-700">Dropdown Lists</h2>
                              {currentCenter && (
                                  <span className="text-xs bg-orange-50 text-orange-800 border border-orange-200 px-2.5 py-1 rounded-lg font-['Cairo'] font-bold">
                                      قوائم خاصة بـ: {currentCenter}
                                  </span>
                              )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <ListEditor label="Services" items={localSettings.services} onChange={v => handleArrayChange('services', v)} placeholder="Add Service" readOnly={isReadOnly} />
                              <ListEditor label="Wards" items={localSettings.wards} onChange={v => handleArrayChange('wards', v)} placeholder="Add Ward" readOnly={isReadOnly} />
                              <ListEditor label="Departments" items={localSettings.departments} onChange={v => handleArrayChange('departments', v)} placeholder="Add Department" readOnly={isReadOnly} />
                              <ListEditor label="Observers (Initials)" items={localSettings.observers} onChange={v => handleArrayChange('observers', v)} placeholder="Add Observer" readOnly={isReadOnly} />
                              <ListEditor label="Cities" items={localSettings.cities} onChange={v => handleArrayChange('cities', v)} placeholder="Add City" readOnly={isReadOnly} />
                              <ListEditor label="Professional Categories" items={localSettings.profCategories} onChange={v => handleArrayChange('profCategories', v)} placeholder="Add Category" readOnly={isReadOnly} />
                          </div>
                      </section>

                      {/* Turso Database Migration Card */}
                      <section className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50/70 p-5 rounded-xl border border-purple-200 font-['Cairo'] shadow-xs" dir="rtl">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
                                      📥
                                  </div>
                                  <div>
                                      <h2 className="text-base font-bold text-purple-950 flex items-center gap-2">
                                          <span>جلب السجلات من قاعدة بيانات Turso سابقة للمركز</span>
                                          <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-2 py-0.5 rounded-full">ترحيل البيانات</span>
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
                              onClick={handleSave} 
                              disabled={isSaving}
                              className={`px-6 py-2.5 rounded-lg font-bold text-white transition-colors font-['Cairo'] ${isSaving ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 shadow-md'}`}
                          >
                              {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                          </button>
                      </div>
                  </div>

                  {/* Turso Import Modal */}
                  <TursoImportModal
                      isOpen={showTursoImportModal}
                      onClose={() => setShowTursoImportModal(false)}
                      onImportSuccess={() => {
                          if (setSettings) {
                              (window as any).google.script.run
                                  .withSuccessHandler((s: any) => { if (s) setSettings(s); })
                                  .getSettings(currentCenter ? { facility: currentCenter } : undefined);
                          }
                      }}
                  />

                  {/* Center Delete Confirmation Modal in Settings */}
                  {centerToDeleteInSettings && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
                          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 font-['Cairo']">
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
                                      <p className="text-xs text-rose-600 font-semibold">تحذير لا رجعة فيه!</p>
                                  </div>
                              </div>

                              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4 text-xs text-slate-700 space-y-2">
                                  <p className="font-bold text-slate-900 text-sm">
                                      هل أنت متأكد من حذف المركز:
                                      <span className="block text-rose-700 text-base font-black mt-1">"{centerToDeleteInSettings}"</span>
                                  </p>
                                  <div className="border-t border-rose-200 pt-2 text-rose-900">
                                      ⚠️ <strong>تنبيه صارم:</strong> سيتم حذف المركز من الإعدادات و<span className="underline font-bold">حذف جميع جلسات الرصد والملاحظات والإحصائيات التابعة له نهائياً</span> من قاعدة البيانات!
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

      const ACTIVE_CENTER_KEY = 'who_hh_active_center';

      const App = () => {
         const [view, setView] = useState('form');
         const [editData, setEditData] = useState(null);
         const [settings, setSettings] = useState(null);
         const [currentCenter, setCurrentCenter] = useState<string | null>(() => {
             try { return localStorage.getItem(ACTIVE_CENTER_KEY) || null; } catch { return null; }
         });

         useEffect(() => {
             let runner = window.google.script.run.withSuccessHandler((res) => {
                 setSettings(res || null);
             });
             if (typeof runner.withFailureHandler === 'function') {
                 runner = runner.withFailureHandler((err) => {
                     console.error("Failed to load settings", err);
                 });
             }
             runner.getSettings(currentCenter ? { facility: currentCenter } : undefined);
         }, [currentCenter]);

         const handleSelectCenter = (centerName: string) => {
             const clean = centerName.trim();
             try { localStorage.setItem(ACTIVE_CENTER_KEY, clean); } catch {}
             setEditData(null);
             setSettings(prev => ({
                 header1: clean,
                 header2: "وحدة مكافحة العدوي",
                 header3: "أحصائية غسيل الأيدي",
                 logoRight: "",
                 logoLeft: "",
                 facilities: prev?.facilities || [],
                 services: [],
                 wards: [],
                 departments: [],
                 observers: [],
                 cities: [],
                 profCategories: []
             }));
             setCurrentCenter(clean);
         };

         const handleSwitchCenter = () => {
             try { localStorage.removeItem(ACTIVE_CENTER_KEY); } catch {}
             setEditData(null);
             setCurrentCenter(null);
         };

         if (!currentCenter) {
             return (
                 <CenterLoginScreen
                     onSelectCenter={handleSelectCenter}
                     currentCenter={currentCenter}
                     settings={settings}
                     setSettings={setSettings}
                 />
             );
         }

         const handleSetView = (nextView: string) => {
             if (nextView !== 'form') setEditData(null);
             setView(nextView);
         };

         return (
            <div className="min-h-screen print:min-h-0 bg-slate-50/50 pb-24 md:pb-10 app-container flex flex-col">
               
               {/* Desktop Navbar */}
               <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 md:px-6 py-2 no-print shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                  <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
                      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                         <div className="flex items-center gap-2.5">
                             <img src="/favicon.svg" alt="WHO Hand Hygiene" className="w-8 h-8 rounded-lg shadow-sm" />
                             <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-sm leading-tight">WHO Hand Hygiene</span>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Compliance Tool</span>
                             </div>
                         </div>

                         {/* Active Center Badge and Switcher in Header */}
                         <div className="flex items-center gap-2 font-['Cairo']" dir="rtl">
                             <div className="bg-orange-50 border border-orange-200 text-orange-900 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs">
                                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                 <span className="text-slate-500 font-normal hidden sm:inline">المركز:</span>
                                 <span className="text-orange-950 font-black truncate max-w-[150px] md:max-w-[220px]" title={currentCenter}>{currentCenter}</span>
                             </div>
                             <button
                                 onClick={handleSwitchCenter}
                                 className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer active:scale-95"
                                 title="تبديل المركز أو تسجيل الخروج منه"
                             >
                                 <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600">
                                     <polyline points="16 3 21 3 21 8"></polyline>
                                     <line x1="4" y1="20" x2="21" y2="3"></line>
                                     <polyline points="21 16 21 21 16 21"></polyline>
                                     <line x1="15" y1="15" x2="21" y2="21"></line>
                                     <line x1="4" y1="4" x2="9" y2="9"></line>
                                 </svg>
                                 <span className="text-[11px]">تبديل المركز</span>
                             </button>
                         </div>
                      </div>
                      
                      <div className="hidden md:flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 hide-scrollbar md:justify-end">
                          <div className="flex gap-1">
                              <NavLink id="form" label="Form" icon={<Icons.Form/>} currentView={view} setView={handleSetView} />
                              <NavLink id="dashboard" label="Dashboard" icon={<Icons.Activity/>} currentView={view} setView={handleSetView} />
                              <NavLink id="records" label="Records" icon={<Icons.Database/>} currentView={view} setView={handleSetView} />
                              <NavLink id="settings" label="Settings" icon={<Icons.Settings/>} currentView={view} setView={handleSetView} />
                          </div>
                      </div>
                  </div>
               </nav>

               <div className="p-2 md:p-6 w-full mx-auto flex-1">
                  <ErrorBoundary key={currentCenter || 'no-center'}>
                     {view === 'form' && (
                         <ObservationForm
                             initialData={editData}
                             onSubmitSuccess={() => { setEditData(null); setView('records'); }}
                             settings={settings}
                             currentCenter={currentCenter}
                             onSwitchCenter={handleSwitchCenter}
                         />
                     )}
                     {view === 'dashboard' && (
                         <Dashboard
                             settings={settings}
                             currentCenter={currentCenter}
                         />
                     )}
                     {view === 'records' && (
                         <DataManager
                             onEdit={(d) => {
                                 setEditData(d);
                                 setView('form');
                             }}
                             settings={settings}
                             setSettings={setSettings}
                             currentCenter={currentCenter}
                             onSwitchCenter={handleSwitchCenter}
                         />
                     )}
                     {view === 'settings' && (
                         <Settings
                             settings={settings}
                             setSettings={setSettings}
                             currentCenter={currentCenter}
                             onSelectCenter={handleSelectCenter}
                             onSwitchCenter={handleSwitchCenter}
                         />
                     )}
                  </ErrorBoundary>
               </div>
               
               <footer className="w-full text-center py-4 text-xs font-medium text-slate-400 no-print mt-auto">
                  <div>Based on WHO Hand Hygiene Compliance Observation Form</div>
                  <div className="mt-1">&copy; 2026 Dr. Fady Ezzat. All Rights Reserved</div>
               </footer>

               {/* Mobile Bottom Navigation */}
               <MobileBottomNav currentView={view} setView={handleSetView} canAccessSettings={true} onSwitchCenter={handleSwitchCenter} currentCenter={currentCenter} />
            </div>
         );
      };

      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<App />);
    