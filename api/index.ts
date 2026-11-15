import crypto from "crypto";
import { createClient } from "@libsql/client";
import { getDb } from "./db.js";

function normalizeTursoUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url.startsWith('libsql://') && !url.startsWith('https://') && !url.startsWith('http://') && !url.startsWith('file:')) {
    url = `libsql://${url}`;
  }
  return url;
}

// ============================================================================
// IN-MEMORY CACHE-ASIDE LAYER (ZERO CLOUD ROW READS ON HIT)
// ============================================================================
interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

export type AppRole = 'admin' | 'manager' | 'user';

// TTL configuration
const OBSERVATIONS_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL for observations
const SETTINGS_TTL_MS = 15 * 60 * 1000;    // 15 minutes TTL for settings
const AUTH_SECRET = process.env.AUTH_SECRET || "who-hh-rbac-secret-2026-v1";

let cachedObservations: CacheEntry<any[]> | null = null;
let cachedSettings: CacheEntry<any> | null = null;
let dbInitialized = false;

const DEFAULT_PASSWORDS = {
  adminPassword: "admin123",
  managerPassword: "manager123",
  userPassword: "user123",
};

function getPasswordFingerprint(pwd: string): string {
  return crypto.createHash("sha256").update(String(pwd || "")).digest("hex").slice(0, 12);
}

function createAuthToken(role: AppRole, rolePassword: string): string {
  const issuedAt = Date.now().toString(36);
  const pwdFp = getPasswordFingerprint(rolePassword);
  const payload = `${role}.${issuedAt}.${pwdFp}`;
  const sig = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex").slice(0, 24);
  return `${payload}.${sig}`;
}

function verifyAuthToken(token: string | undefined | null, fullSettings: any): AppRole | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.trim().split(".");
  if (parts.length !== 4) return null;
  const [role, issuedAt, pwdFp, sig] = parts;
  if (role !== "admin" && role !== "manager" && role !== "user") return null;

  const payload = `${role}.${issuedAt}.${pwdFp}`;
  const expectedSig = crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex").slice(0, 24);
  if (sig !== expectedSig) return null;

  const currentRolePwd =
    role === "admin"
      ? (fullSettings?.adminPassword || DEFAULT_PASSWORDS.adminPassword)
      : role === "manager"
      ? (fullSettings?.managerPassword || DEFAULT_PASSWORDS.managerPassword)
      : (fullSettings?.userPassword || DEFAULT_PASSWORDS.userPassword);

  if (pwdFp !== getPasswordFingerprint(currentRolePwd)) return null;
  return role as AppRole;
}

function sanitizeSettingsForRole(fullSettings: any, role: AppRole | null) {
  const {
    adminPassword,
    managerPassword,
    userPassword,
    ...publicSettings
  } = fullSettings || getDefaultSettings();

  if (role === "admin") {
    return {
      ...publicSettings,
      rolePasswords: {
        adminPassword: adminPassword || DEFAULT_PASSWORDS.adminPassword,
        managerPassword: managerPassword || DEFAULT_PASSWORDS.managerPassword,
        userPassword: userPassword || DEFAULT_PASSWORDS.userPassword,
      },
    };
  }
  return publicSettings;
}

// Helper to return default settings structure
function getDefaultSettings() {
  return {
    header1: "مستشفى المنيا الجامعى للعيون",
    header2: "وحدة مكافحة العدوي",
    header3: "أحصائية غسيل الأيدي",
    logoRight: "",
    logoLeft: "",
    adminPassword: DEFAULT_PASSWORDS.adminPassword,
    managerPassword: DEFAULT_PASSWORDS.managerPassword,
    userPassword: DEFAULT_PASSWORDS.userPassword,
    facilities: [],
    services: [],
    wards: [],
    departments: [],
    observers: [],
    cities: [],
    profCategories: []
  };
}

// Case-insensitive database row getter
function getRowValue(row: any, columnName: string): string {
  if (!row) return '';
  const keys = Object.keys(row);
  const target = columnName.toLowerCase();
  const matchedKey = keys.find(k => k.toLowerCase() === target);
  return matchedKey ? String(row[matchedKey] || '') : '';
}

// Re-index session numbers in an in-memory array of observation rows
function reindexInMemorySessions(records: any[]): void {
  const monthMap: { [month: string]: Array<{ sessionId: string, date: string, startTime: string }> } = {};
  const seenSessions = new Set<string>();

  records.forEach(r => {
    const sid = getRowValue(r, "Session ID");
    const date = getRowValue(r, "Session Date");
    const startTime = getRowValue(r, "Start Time") || '99:99';
    if (!sid || !date || seenSessions.has(sid)) return;
    seenSessions.add(sid);
    const monthKey = date.slice(0, 7);
    if (!monthMap[monthKey]) monthMap[monthKey] = [];
    monthMap[monthKey].push({ sessionId: sid, date, startTime });
  });

  const sessionNoMap = new Map<string, string>();
  Object.keys(monthMap).forEach(monthKey => {
    const list = monthMap[monthKey];
    list.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return a.sessionId.localeCompare(b.sessionId);
    });

    list.forEach((item, idx) => {
      sessionNoMap.set(item.sessionId, String(idx + 1));
    });
  });

  records.forEach(r => {
    const sid = getRowValue(r, "Session ID");
    if (sid && sessionNoMap.has(sid)) {
      const targetKey = Object.keys(r).find(k => k.toLowerCase() === "session no") || "Session No";
      r[targetKey] = sessionNoMap.get(sid)!;
    }
  });
}

// One-time schema & index initialization with mandatory indexes
async function initializeDatabaseOnce() {
  if (dbInitialized) return;

  try {
    // 1. Mandatory Table Definitions
    await getDb().execute(`
      CREATE TABLE IF NOT EXISTS Observations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          "Session ID" TEXT NOT NULL,
          "Timestamp" TEXT,
          "Facility" TEXT,
          "Service" TEXT,
          "Ward" TEXT,
          "Department" TEXT,
          "Country" TEXT,
          "City" TEXT,
          "Period Number" TEXT,
          "Observer" TEXT,
          "Session Date" TEXT,
          "Start Time" TEXT,
          "End Time" TEXT,
          "Duration (min)" TEXT,
          "Session No" TEXT,
          "Page No" TEXT,
          "Professional Cat." TEXT,
          "Prof. Code" TEXT,
          "Opportunity No" TEXT,
          "Ind: Bef. Pat" TEXT,
          "Ind: Bef. Asept" TEXT,
          "Ind: Aft. Body Fluid" TEXT,
          "Ind: Aft. Pat" TEXT,
          "Ind: Aft. Surround" TEXT,
          "Action (HR/HW/Missed)" TEXT,
          "Gloves Used" TEXT,
          "Column No" TEXT
      );
    `);

    await getDb().execute(`
      CREATE TABLE IF NOT EXISTS Settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          "Header 1" TEXT,
          "Header 2" TEXT,
          "Header 3" TEXT,
          "Logo Right" TEXT,
          "Logo Left" TEXT,
          "Admin Password" TEXT,
          "Manager Password" TEXT,
          "User Password" TEXT,
          "Facilities" TEXT,
          "Services" TEXT,
          "Wards" TEXT,
          "Departments" TEXT,
          "Observers" TEXT,
          "Cities" TEXT,
          "Professional Categories" TEXT
      );
    `);

    // Column migrations if upgrading from older schema
    try {
      await getDb().execute(`ALTER TABLE Settings ADD COLUMN "Logo Right" TEXT`);
    } catch (e) { /* already exists */ }
    try {
      await getDb().execute(`ALTER TABLE Settings ADD COLUMN "Logo Left" TEXT`);
    } catch (e) { /* already exists */ }
    try {
      await getDb().execute(`ALTER TABLE Settings ADD COLUMN "Admin Password" TEXT`);
    } catch (e) { /* already exists */ }
    try {
      await getDb().execute(`ALTER TABLE Settings ADD COLUMN "Manager Password" TEXT`);
    } catch (e) { /* already exists */ }
    try {
      await getDb().execute(`ALTER TABLE Settings ADD COLUMN "User Password" TEXT`);
    } catch (e) { /* already exists */ }

    // 2. Mandatory Indexing Architecture (Prevent Full Table Scans)
    await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_obs_session_id ON Observations("Session ID");`);
    await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_obs_session_date ON Observations("Session Date");`);
    await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_obs_department ON Observations("Department");`);
    await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_obs_facility ON Observations("Facility");`);
    await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_obs_service ON Observations("Service");`);
    await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_obs_ward ON Observations("Ward");`);
    await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_obs_prof_cat ON Observations("Professional Cat.");`);
    await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_obs_date_time ON Observations("Session Date", "Start Time");`);
    await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_obs_composite ON Observations("Session ID", "Opportunity No", "Column No");`);
    await getDb().execute(`CREATE INDEX IF NOT EXISTS idx_settings_id ON Settings(id);`);

    dbInitialized = true;
    console.log("[Database] Schema & Mandatory Indexes Initialized Successfully.");
  } catch (err) {
    console.error("[Database] Initialization error:", err);
  }
}

// Columns explicitly requested for Observations (NEVER SELECT *)
const OBSERVATION_EXPLICIT_COLUMNS = [
  'id',
  '"Session ID"',
  '"Timestamp"',
  '"Facility"',
  '"Service"',
  '"Ward"',
  '"Department"',
  '"Country"',
  '"City"',
  '"Period Number"',
  '"Observer"',
  '"Session Date"',
  '"Start Time"',
  '"End Time"',
  '"Duration (min)"',
  '"Session No"',
  '"Page No"',
  '"Professional Cat."',
  '"Prof. Code"',
  '"Opportunity No"',
  '"Ind: Bef. Pat"',
  '"Ind: Bef. Asept"',
  '"Ind: Aft. Body Fluid"',
  '"Ind: Aft. Pat"',
  '"Ind: Aft. Surround"',
  '"Action (HR/HW/Missed)"',
  '"Gloves Used"',
  '"Column No"'
].join(', ');

// Columns explicitly requested for Settings (NEVER SELECT *)
const SETTINGS_EXPLICIT_COLUMNS = [
  'id',
  '"Header 1"',
  '"Header 2"',
  '"Header 3"',
  '"Logo Right"',
  '"Logo Left"',
  '"Admin Password"',
  '"Manager Password"',
  '"User Password"',
  '"Facilities"',
  '"Services"',
  '"Wards"',
  '"Departments"',
  '"Observers"',
  '"Cities"',
  '"Professional Categories"'
].join(', ');

// Load full settings from In-Memory Cache first (0 DB reads on hit)
async function getFullSettingsCached(): Promise<any> {
  const now = Date.now();
  if (cachedSettings && now < cachedSettings.expiresAt) {
    return cachedSettings.data;
  }

  const result = await getDb().execute(`SELECT ${SETTINGS_EXPLICIT_COLUMNS} FROM Settings ORDER BY id ASC LIMIT 500`);
  if (result.rows.length === 0) {
    const defaults = getDefaultSettings();
    cachedSettings = {
      data: defaults,
      cachedAt: now,
      expiresAt: now + SETTINGS_TTL_MS
    };
    return defaults;
  }

  const settings: any = {
    header1: getRowValue(result.rows[0], "Header 1"),
    header2: getRowValue(result.rows[0], "Header 2"),
    header3: getRowValue(result.rows[0], "Header 3"),
    logoRight: getRowValue(result.rows[0], "Logo Right"),
    logoLeft: getRowValue(result.rows[0], "Logo Left"),
    adminPassword: getRowValue(result.rows[0], "Admin Password") || DEFAULT_PASSWORDS.adminPassword,
    managerPassword: getRowValue(result.rows[0], "Manager Password") || DEFAULT_PASSWORDS.managerPassword,
    userPassword: getRowValue(result.rows[0], "User Password") || DEFAULT_PASSWORDS.userPassword,
    facilities: [],
    services: [],
    wards: [],
    departments: [],
    observers: [],
    cities: [],
    profCategories: []
  };

  result.rows.forEach((row: any) => {
    const fac = getRowValue(row, "Facilities");
    const ser = getRowValue(row, "Services");
    const wrd = getRowValue(row, "Wards");
    const dep = getRowValue(row, "Departments");
    const obs = getRowValue(row, "Observers");
    const cit = getRowValue(row, "Cities");
    const prc = getRowValue(row, "Professional Categories");

    if (fac) settings.facilities.push(fac.trim());
    if (ser) settings.services.push(ser.trim());
    if (wrd) settings.wards.push(wrd.trim());
    if (dep) settings.departments.push(dep.trim());
    if (obs) settings.observers.push(obs.trim());
    if (cit) settings.cities.push(cit.trim());
    if (prc) settings.profCategories.push(prc.trim());
  });

  cachedSettings = {
    data: settings,
    cachedAt: now,
    expiresAt: now + SETTINGS_TTL_MS
  };

  return settings;
}

// Save settings helper
async function saveSettingsToDb(settings: any, existingSettings: any) {
  await getDb().execute("DELETE FROM Settings");

  const keys = Object.keys(settings);
  const getVal = (targetName: string) => {
    const matchedKey = keys.find(k => k.toLowerCase() === targetName.toLowerCase());
    return matchedKey ? settings[matchedKey] : [];
  };

  const facilities = getVal("facilities") || [];
  const services = getVal("services") || [];
  const wards = getVal("wards") || [];
  const departments = getVal("departments") || [];
  const observers = getVal("observers") || [];
  const cities = getVal("cities") || [];
  const profCategories = getVal("profCategories") || [];

  const maxLength = Math.max(
    1,
    facilities.length,
    services.length,
    wards.length,
    departments.length,
    observers.length,
    cities.length,
    profCategories.length
  );

  const getHeader = (headerName: string) => {
    const matchedKey = keys.find(k => k.toLowerCase() === headerName.toLowerCase());
    return matchedKey ? settings[matchedKey] : "";
  };

  const incomingPass = settings.rolePasswords || {};
  const finalAdminPwd =
    (typeof incomingPass.adminPassword === "string" && incomingPass.adminPassword.trim())
      ? incomingPass.adminPassword.trim()
      : (existingSettings?.adminPassword || DEFAULT_PASSWORDS.adminPassword);
  const finalManagerPwd =
    (typeof incomingPass.managerPassword === "string" && incomingPass.managerPassword.trim())
      ? incomingPass.managerPassword.trim()
      : (existingSettings?.managerPassword || DEFAULT_PASSWORDS.managerPassword);
  const finalUserPwd =
    (typeof incomingPass.userPassword === "string" && incomingPass.userPassword.trim())
      ? incomingPass.userPassword.trim()
      : (existingSettings?.userPassword || DEFAULT_PASSWORDS.userPassword);

  const batchStatements: any[] = [];
  for (let i = 0; i < maxLength; i++) {
    batchStatements.push({
      sql: `INSERT INTO Settings (
        "Header 1", "Header 2", "Header 3", "Logo Right", "Logo Left",
        "Admin Password", "Manager Password", "User Password",
        "Facilities", "Services", "Wards", "Departments", 
        "Observers", "Cities", "Professional Categories"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        i === 0 ? (getHeader("header1") || "") : "",
        i === 0 ? (getHeader("header2") || "") : "",
        i === 0 ? (getHeader("header3") || "") : "",
        i === 0 ? (getHeader("logoRight") || getHeader("logoright") || "") : "",
        i === 0 ? (getHeader("logoLeft") || getHeader("logoleft") || "") : "",
        i === 0 ? finalAdminPwd : "",
        i === 0 ? finalManagerPwd : "",
        i === 0 ? finalUserPwd : "",
        facilities[i] ? String(facilities[i]) : "",
        services[i] ? String(services[i]) : "",
        wards[i] ? String(wards[i]) : "",
        departments[i] ? String(departments[i]) : "",
        observers[i] ? String(observers[i]) : "",
        cities[i] ? String(cities[i]) : "",
        profCategories[i] ? String(profCategories[i]) : ""
      ]
    });
  }

  if (batchStatements.length > 0) {
    await getDb().batch(batchStatements);
  }

  // Optimistic Cache Update: Update in-memory settings cache immediately
  cachedSettings = {
    data: {
      header1: getHeader("header1") || "",
      header2: getHeader("header2") || "",
      header3: getHeader("header3") || "",
      logoRight: getHeader("logoRight") || getHeader("logoright") || "",
      logoLeft: getHeader("logoLeft") || getHeader("logoleft") || "",
      adminPassword: finalAdminPwd,
      managerPassword: finalManagerPwd,
      userPassword: finalUserPwd,
      facilities: [...facilities],
      services: [...services],
      wards: [...wards],
      departments: [...departments],
      observers: [...observers],
      cities: [...cities],
      profCategories: [...profCategories]
    },
    cachedAt: Date.now(),
    expiresAt: Date.now() + SETTINGS_TTL_MS
  };

  return cachedSettings.data;
}

export default async function handler(req: any, res: any) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Initialize schema & mandatory indexes once
    await initializeDatabaseOnce();

    // Read and parse request body (handles JSON and raw text)
    let body: any = {};
    if (req.method === 'POST') {
      if (typeof req.body === 'string') {
        try {
          body = JSON.parse(req.body);
        } catch (e) {
          body = {};
        }
      } else if (req.body && typeof req.body === 'object') {
        body = req.body;
      } else {
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const rawBody = Buffer.concat(buffers).toString('utf-8');
        try {
          body = JSON.parse(rawBody);
        } catch (e) {
          body = {};
        }
      }
    }

    const action = req.method === 'GET' ? req.query.action : body.action;
    const bodyData = req.method === 'POST' ? body.data : null;

    if (!action) {
      return res.status(400).json({ error: "Missing action parameter" });
    }

    // Load settings from in-memory cache (0 DB reads on hit)
    const fullSettings = await getFullSettingsCached();
    const callerRole: AppRole = 'admin'; // Open mode: full access for all requests

    // =========================================================================
    // GET ACTIONS (WITH IN-MEMORY CACHE-ASIDE PATTERN)
    // =========================================================================
    if (req.method === 'GET') {
      if (action === 'verifySession') {
        return res.status(200).json({
          authenticated: true,
          role: 'admin',
          settings: sanitizeSettingsForRole(fullSettings, 'admin')
        });
      }

      if (action === 'getSettings') {
        return res.status(200).json(sanitizeSettingsForRole(fullSettings, 'admin'));
      }

      if (action === 'getObservationData') {
        const now = Date.now();
        const limitParam = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
        const offsetParam = req.query.offset ? parseInt(req.query.offset, 10) : 0;

        // 1. Check In-Memory Cache first (0 Cloud Row Reads on Hit)
        if (cachedObservations && now < cachedObservations.expiresAt) {
          let records = cachedObservations.data;
          const facilityParam = req.query.facility ? String(req.query.facility).trim() : '';
          if (facilityParam) {
            records = records.filter(r => (getRowValue(r, "Facility") || '').trim().toLowerCase() === facilityParam.toLowerCase());
          }
          if (limitParam && limitParam > 0) {
            records = records.slice(offsetParam, offsetParam + limitParam);
          }
          return res.status(200).json(records);
        }

        // 2. Cache Miss: Query Cloud DB with explicit columns and indexed sorting
        const queryLimit = limitParam && limitParam > 0 ? limitParam : 2500;
        const queryOffset = offsetParam || 0;

        const result = await getDb().execute({
          sql: `SELECT ${OBSERVATION_EXPLICIT_COLUMNS} FROM Observations ORDER BY id DESC LIMIT ? OFFSET ?`,
          args: [queryLimit, queryOffset]
        });

        // Parse rows using exact column names
        const records = result.rows.map((row: any) => {
          const record: any = {};
          result.columns.forEach((col: string) => {
            record[col] = getRowValue(row, col);
          });
          return record;
        });

        // Reindex session numbers in memory
        reindexInMemorySessions(records);

        // Populate in-memory cache
        cachedObservations = {
          data: records,
          cachedAt: now,
          expiresAt: now + OBSERVATIONS_TTL_MS
        };

        const facilityParam = req.query.facility ? String(req.query.facility).trim() : '';
        let filteredRecords = records;
        if (facilityParam) {
          filteredRecords = filteredRecords.filter(r => (getRowValue(r, "Facility") || '').trim().toLowerCase() === facilityParam.toLowerCase());
        }

        return res.status(200).json(filteredRecords);
      } 

      if (action === 'getFacilitiesSummary') {
        const currentSettings = await getFullSettingsCached();
        const configuredFacilities: string[] = currentSettings.facilities || [];

        // Count sessions and rows per facility in DB
        let countsRes: any = { rows: [] };
        try {
          countsRes = await getDb().execute(`
            SELECT "Facility" as fac, COUNT(DISTINCT "Session ID") as sessionCount, COUNT(*) as rowCount
            FROM Observations
            GROUP BY "Facility"
          `);
        } catch (e) {
          console.error("Error reading facilities counts:", e);
        }

        const summaryMap: Record<string, { sessionCount: number; rowCount: number }> = {};
        countsRes.rows.forEach((r: any) => {
          const f = getRowValue(r, "Facility") || getRowValue(r, "fac");
          if (f && f.trim()) {
            summaryMap[f.trim().toLowerCase()] = {
              sessionCount: Number(getRowValue(r, "sessionCount") || 0),
              rowCount: Number(getRowValue(r, "rowCount") || 0)
            };
          }
        });

        const list: Array<{ name: string; sessionCount: number; rowCount: number }> = [];
        const seen = new Set<string>();

        // 1. Add configured facilities first
        configuredFacilities.forEach(name => {
          const trimmed = String(name || '').trim();
          if (trimmed && !seen.has(trimmed.toLowerCase())) {
            seen.add(trimmed.toLowerCase());
            const stat = summaryMap[trimmed.toLowerCase()] || { sessionCount: 0, rowCount: 0 };
            list.push({
              name: trimmed,
              sessionCount: stat.sessionCount,
              rowCount: stat.rowCount
            });
          }
        });

        // 2. Also include any facilities discovered in Observations that weren't in Settings list
        countsRes.rows.forEach((r: any) => {
          const f = (getRowValue(r, "Facility") || getRowValue(r, "fac")).trim();
          if (f && !seen.has(f.toLowerCase())) {
            seen.add(f.toLowerCase());
            list.push({
              name: f,
              sessionCount: Number(getRowValue(r, "sessionCount") || 0),
              rowCount: Number(getRowValue(r, "rowCount") || 0)
            });
          }
        });

        return res.status(200).json({
          facilities: list,
          settings: sanitizeSettingsForRole(currentSettings, 'admin')
        });
      }

      return res.status(400).json({ error: `Unknown GET action: ${action}` });
    }

    // =========================================================================
    // POST ACTIONS (OPTIMISTIC UPDATES & LOCAL CACHE MUTATIONS)
    // =========================================================================
    if (req.method === 'POST') {
      if (action === 'login') {
        return res.status(200).json({
          success: true,
          role: 'admin',
          token: 'open-access-token',
          settings: sanitizeSettingsForRole(fullSettings, 'admin')
        });
      }

      if (action === 'saveObservationData') {
        if (!callerRole) {
          return res.status(401).json({ success: false, error: "يرجى تسجيل الدخول أولاً" });
        }
        if (callerRole === 'manager') {
          return res.status(403).json({ success: false, error: "صلاحية المدير مخصصة للتصفح فقط ولا تسمح بإضافة أو تعديل النماذج" });
        }

        const sessionData = typeof bodyData === 'string' ? JSON.parse(bodyData) : bodyData;
        if (!sessionData || !sessionData.sessionId) {
          return res.status(400).json({ success: false, error: "Missing session data or sessionId" });
        }

        const targetId = String(sessionData.sessionId).trim();

        await getDb().execute({
          sql: 'DELETE FROM Observations WHERE "Session ID" = ?',
          args: [targetId]
        });

        const timestamp = new Date().toISOString();
        let rowsInserted = 0;
        const newInsertedRows: any[] = [];

        const batchStatements: any[] = [];
        for (const prof of sessionData.professionals || []) {
          for (const opp of prof.opportunities || []) {
            if ((opp.indications && opp.indications.length > 0) || opp.action) {
              const colNoStr = String(prof._originalIndex !== undefined ? prof._originalIndex + 1 : 1);
              const rowValues = [
                sessionData.sessionId,
                timestamp,
                sessionData.facility || '',
                sessionData.service || '',
                sessionData.ward || '',
                sessionData.department || '',
                sessionData.country || '',
                sessionData.city || '',
                String(sessionData.periodNumber || ''),
                sessionData.observer || '',
                sessionData.date || '',
                sessionData.startTime || '',
                sessionData.endTime || '',
                String(sessionData.duration || ''),
                String(sessionData.sessionNumber || ''),
                String(sessionData.pageNumber || ''),
                prof.categoryName || '',
                prof.categoryCode || '',
                String(opp.number || ''),
                opp.indications?.includes('bef-pat') ? 'Yes' : 'No',
                opp.indications?.includes('bef-asept') ? 'Yes' : 'No',
                opp.indications?.includes('aft-bf') ? 'Yes' : 'No',
                opp.indications?.includes('aft-pat') ? 'Yes' : 'No',
                opp.indications?.includes('aft-p-surr') ? 'Yes' : 'No',
                opp.action || 'None',
                opp.gloves ? 'Yes' : 'No',
                colNoStr
              ];

              batchStatements.push({
                sql: `INSERT INTO Observations (
                    "Session ID", "Timestamp", "Facility", "Service", "Ward", "Department",
                    "Country", "City", "Period Number", "Observer", "Session Date",
                    "Start Time", "End Time", "Duration (min)", "Session No", "Page No",
                    "Professional Cat.", "Prof. Code", "Opportunity No",
                    "Ind: Bef. Pat", "Ind: Bef. Asept", "Ind: Aft. Body Fluid", "Ind: Aft. Pat", "Ind: Aft. Surround",
                    "Action (HR/HW/Missed)", "Gloves Used", "Column No"
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: rowValues
              });

              newInsertedRows.push({
                "Session ID": sessionData.sessionId,
                "Timestamp": timestamp,
                "Facility": sessionData.facility || '',
                "Service": sessionData.service || '',
                "Ward": sessionData.ward || '',
                "Department": sessionData.department || '',
                "Country": sessionData.country || '',
                "City": sessionData.city || '',
                "Period Number": String(sessionData.periodNumber || ''),
                "Observer": sessionData.observer || '',
                "Session Date": sessionData.date || '',
                "Start Time": sessionData.startTime || '',
                "End Time": sessionData.endTime || '',
                "Duration (min)": String(sessionData.duration || ''),
                "Session No": String(sessionData.sessionNumber || ''),
                "Page No": String(sessionData.pageNumber || ''),
                "Professional Cat.": prof.categoryName || '',
                "Prof. Code": prof.categoryCode || '',
                "Opportunity No": String(opp.number || ''),
                "Ind: Bef. Pat": opp.indications?.includes('bef-pat') ? 'Yes' : 'No',
                "Ind: Bef. Asept": opp.indications?.includes('bef-asept') ? 'Yes' : 'No',
                "Ind: Aft. Body Fluid": opp.indications?.includes('aft-bf') ? 'Yes' : 'No',
                "Ind: Aft. Pat": opp.indications?.includes('aft-pat') ? 'Yes' : 'No',
                "Ind: Aft. Surround": opp.indications?.includes('aft-p-surr') ? 'Yes' : 'No',
                "Action (HR/HW/Missed)": opp.action || 'None',
                "Gloves Used": opp.gloves ? 'Yes' : 'No',
                "Column No": colNoStr
              });
              rowsInserted++;
            }
          }
        }

        if (batchStatements.length > 0) {
          await getDb().batch(batchStatements);
        }

        // Optimistic In-Memory Cache Mutation (NO SELECT * AFTER WRITE)
        if (cachedObservations) {
          const filtered = cachedObservations.data.filter(
            r => getRowValue(r, "Session ID") !== targetId
          );
          cachedObservations.data = [...newInsertedRows, ...filtered];
          reindexInMemorySessions(cachedObservations.data);
          cachedObservations.cachedAt = Date.now();
          cachedObservations.expiresAt = Date.now() + OBSERVATIONS_TTL_MS;
        }

        return res.status(200).json({ success: true, count: rowsInserted, sessionId: targetId });
      }

      if (action === 'saveSettings') {
        const settingsData = typeof bodyData === 'string' ? JSON.parse(bodyData) : bodyData;
        if (!settingsData) {
          return res.status(400).json({ success: false, error: "Missing settings data" });
        }

        const sanitizedPayload = { ...settingsData };
        delete sanitizedPayload.rolePasswords;

        const updatedFullSettings = await saveSettingsToDb(sanitizedPayload, fullSettings);

        return res.status(200).json({
          success: true,
          token: 'open-access-token',
          settings: sanitizeSettingsForRole(updatedFullSettings, 'admin')
        });
      }

      if (action === 'deleteSession') {
        const targetId = String(bodyData).trim();
        const deleteRes = await getDb().execute({
          sql: 'DELETE FROM Observations WHERE "Session ID" = ?',
          args: [targetId]
        });

        // Optimistic In-Memory Cache Mutation (NO SELECT AFTER DELETE)
        if (cachedObservations) {
          cachedObservations.data = cachedObservations.data.filter(
            r => getRowValue(r, "Session ID") !== targetId
          );
          reindexInMemorySessions(cachedObservations.data);
          cachedObservations.cachedAt = Date.now();
          cachedObservations.expiresAt = Date.now() + OBSERVATIONS_TTL_MS;
        }

        return res.status(200).json({ success: true, count: deleteRes.rowsAffected, sessionId: targetId });
      }

      if (action === 'deleteMonth') {
        const targetMonths = Array.isArray(bodyData) ? bodyData : [String(bodyData)];
        let totalCount = 0;
        for (const mKey of targetMonths) {
          const deleteRes = await getDb().execute({
            sql: 'DELETE FROM Observations WHERE "Session Date" LIKE ?',
            args: [`${mKey}%`]
          });
          totalCount += (deleteRes.rowsAffected || 0);
        }

        // Optimistic In-Memory Cache Mutation (NO SELECT AFTER DELETE)
        if (cachedObservations) {
          cachedObservations.data = cachedObservations.data.filter(r => {
            const date = getRowValue(r, "Session Date");
            return !targetMonths.some(m => date.startsWith(m));
          });
          reindexInMemorySessions(cachedObservations.data);
          cachedObservations.cachedAt = Date.now();
          cachedObservations.expiresAt = Date.now() + OBSERVATIONS_TTL_MS;
        }

        return res.status(200).json({ success: true, count: totalCount, months: targetMonths });
      }

      if (action === 'updateSessionDate') {
        const payload = typeof bodyData === 'string' ? JSON.parse(bodyData) : bodyData;
        if (!payload || !payload.sessionId || !payload.newDate) {
          return res.status(400).json({ success: false, error: "Missing sessionId or newDate" });
        }

        const targetId = String(payload.sessionId).trim();
        const newDate = String(payload.newDate).trim();

        let periodNumber = '';
        try {
          const d = new Date(newDate);
          if (!isNaN(d.getTime())) {
            periodNumber = String(d.getMonth() + 1);
          }
        } catch (e) {}

        if (periodNumber) {
          await getDb().execute({
            sql: 'UPDATE Observations SET "Session Date" = ?, "Period Number" = ? WHERE "Session ID" = ?',
            args: [newDate, periodNumber, targetId]
          });
        } else {
          await getDb().execute({
            sql: 'UPDATE Observations SET "Session Date" = ? WHERE "Session ID" = ?',
            args: [newDate, targetId]
          });
        }

        // Optimistic In-Memory Cache Mutation (NO SELECT AFTER UPDATE)
        let newSessionNo = '1';
        if (cachedObservations) {
          cachedObservations.data.forEach(r => {
            if (getRowValue(r, "Session ID") === targetId) {
              const dateKey = Object.keys(r).find(k => k.toLowerCase() === "session date") || "Session Date";
              r[dateKey] = newDate;
              if (periodNumber) {
                const pKey = Object.keys(r).find(k => k.toLowerCase() === "period number") || "Period Number";
                r[pKey] = periodNumber;
              }
            }
          });
          reindexInMemorySessions(cachedObservations.data);
          const updatedRow = cachedObservations.data.find(r => getRowValue(r, "Session ID") === targetId);
          if (updatedRow) {
            newSessionNo = getRowValue(updatedRow, "Session No") || '1';
          }
          cachedObservations.cachedAt = Date.now();
          cachedObservations.expiresAt = Date.now() + OBSERVATIONS_TTL_MS;
        }

        return res.status(200).json({
          success: true,
          sessionId: targetId,
          newDate,
          newSessionNo
        });
      }

      if (action === 'updateSessionDepartment') {
        const payload = typeof bodyData === 'string' ? JSON.parse(bodyData) : bodyData;
        if (!payload || !payload.sessionId || payload.department === undefined) {
          return res.status(400).json({ success: false, error: "Missing sessionId or department" });
        }

        const targetId = String(payload.sessionId).trim();
        const newDept = String(payload.department).trim();

        // 1. Direct indexed update on Cloud DB
        await getDb().execute({
          sql: 'UPDATE Observations SET "Department" = ? WHERE "Session ID" = ?',
          args: [newDept, targetId]
        });

        // 2. Optimistic In-Memory Cache Mutation (0 SELECTs)
        if (cachedObservations) {
          cachedObservations.data.forEach(r => {
            if (getRowValue(r, "Session ID") === targetId) {
              const deptKey = Object.keys(r).find(k => k.toLowerCase() === "department") || "Department";
              r[deptKey] = newDept;
            }
          });
          cachedObservations.cachedAt = Date.now();
          cachedObservations.expiresAt = Date.now() + OBSERVATIONS_TTL_MS;
        }

        return res.status(200).json({
          success: true,
          sessionId: targetId,
          department: newDept
        });
      }

      if (action === 'testTursoConnection') {
        const payload = typeof bodyData === 'string' ? JSON.parse(bodyData) : (bodyData || {});
        const rawUrl = String(payload.tursoUrl || payload.url || '').trim();
        const rawToken = String(payload.tursoAuthToken || payload.authToken || '').trim();

        if (!rawUrl) {
          return res.status(200).json({ success: false, error: "يرجى إدخال رابط قاعدة بيانات Turso" });
        }

        const cleanUrl = normalizeTursoUrl(rawUrl);
        let remoteDb: any = null;
        try {
          remoteDb = createClient({
            url: cleanUrl,
            authToken: rawToken || undefined,
          });
        } catch (clientErr: any) {
          return res.status(200).json({
            success: false,
            error: "تعذر تكوين اتصال قاعدة البيانات: " + (clientErr?.message || String(clientErr))
          });
        }

        try {
          // Check if Observations table exists
          const tablesCheck = await remoteDb.execute(`
            SELECT name FROM sqlite_master WHERE type='table' AND LOWER(name)='observations'
          `);

          if (!tablesCheck.rows || tablesCheck.rows.length === 0) {
            const allTables = await remoteDb.execute(`SELECT name FROM sqlite_master WHERE type='table'`);
            const tableNames = allTables.rows.map((r: any) => r.name || r[0]).filter(Boolean).join(', ');
            return res.status(200).json({
              success: false,
              error: `تم الاتصال بنجاح ولكن لم يتم العثور على جدول السجلات (Observations). الجداول المتوفرة: ${tableNames || 'لا توجد جداول'}`
            });
          }

          // Count rows in Observations
          const countRes = await remoteDb.execute(`SELECT COUNT(*) as cnt FROM Observations`);
          const totalRows = Number(countRes.rows[0]?.cnt ?? countRes.rows[0]?.[0] ?? 0);

          if (totalRows === 0) {
            return res.status(200).json({
              success: true,
              totalRows: 0,
              totalSessions: 0,
              newSessions: 0,
              existingSessions: 0,
              minDate: null,
              maxDate: null,
              facilities: [],
              departments: [],
              hasSettings: false,
              message: "تم الاتصال بنجاح، لكن جدول السجلات فارغ حالياً في القاعدة السابقة."
            });
          }

          // Read distinct sessions metadata
          const sessionsMeta = await remoteDb.execute(`
            SELECT DISTINCT "Session ID" as sid, "Session Date" as sdate, "Facility" as fac, "Department" as dept
            FROM Observations
          `);

          const remoteSessionIds = new Set<string>();
          const facilitiesSet = new Set<string>();
          const departmentsSet = new Set<string>();
          const dates: string[] = [];

          sessionsMeta.rows.forEach((row: any) => {
            const sid = getRowValue(row, "Session ID") || getRowValue(row, "sid");
            const sdate = getRowValue(row, "Session Date") || getRowValue(row, "sdate");
            const fac = getRowValue(row, "Facility") || getRowValue(row, "fac");
            const dept = getRowValue(row, "Department") || getRowValue(row, "dept");

            if (sid) remoteSessionIds.add(sid);
            if (sdate && sdate.length >= 7) dates.push(sdate);
            if (fac) facilitiesSet.add(fac.trim());
            if (dept) departmentsSet.add(dept.trim());
          });

          // Check how many exist in current DB
          const currentSidsRes = await getDb().execute(`SELECT DISTINCT "Session ID" as sid FROM Observations`);
          const currentSids = new Set(
            currentSidsRes.rows.map((r: any) => getRowValue(r, "Session ID") || getRowValue(r, "sid")).filter(Boolean)
          );

          let newSessionsCount = 0;
          let existingSessionsCount = 0;
          remoteSessionIds.forEach(sid => {
            if (currentSids.has(sid)) existingSessionsCount++;
            else newSessionsCount++;
          });

          dates.sort();
          const minDate = dates[0] || null;
          const maxDate = dates[dates.length - 1] || null;

          // Check if Settings table exists in remote
          let hasSettings = false;
          try {
            const setCheck = await remoteDb.execute(`
              SELECT name FROM sqlite_master WHERE type='table' AND LOWER(name)='settings'
            `);
            hasSettings = setCheck.rows.length > 0;
          } catch (e) {}

          return res.status(200).json({
            success: true,
            totalRows,
            totalSessions: remoteSessionIds.size,
            newSessions: newSessionsCount,
            existingSessions: existingSessionsCount,
            minDate,
            maxDate,
            facilities: Array.from(facilitiesSet).filter(Boolean),
            departments: Array.from(departmentsSet).filter(Boolean),
            hasSettings
          });
        } catch (dbErr: any) {
          console.error("Test remote Turso error:", dbErr);
          return res.status(200).json({
            success: false,
            error: "خطأ في قراءة بيانات Turso: " + (dbErr?.message || String(dbErr))
          });
        }
      }

      if (action === 'importTursoData') {
        const payload = typeof bodyData === 'string' ? JSON.parse(bodyData) : (bodyData || {});
        const rawUrl = String(payload.tursoUrl || payload.url || '').trim();
        const rawToken = String(payload.tursoAuthToken || payload.authToken || '').trim();
        const importMode = payload.importMode || 'merge_skip_existing';
        const importSettings = Boolean(payload.importSettings);

        if (!rawUrl) {
          return res.status(200).json({ success: false, error: "يرجى إدخال رابط قاعدة بيانات Turso" });
        }

        const cleanUrl = normalizeTursoUrl(rawUrl);
        let remoteDb: any = null;
        try {
          remoteDb = createClient({
            url: cleanUrl,
            authToken: rawToken || undefined,
          });
        } catch (clientErr: any) {
          return res.status(200).json({
            success: false,
            error: "تعذر تكوين اتصال قاعدة البيانات: " + (clientErr?.message || String(clientErr))
          });
        }

        // 1. Fetch remote rows from Observations
        let remoteResult: any = null;
        try {
          remoteResult = await remoteDb.execute(`SELECT * FROM Observations`);
        } catch (fetchErr: any) {
          return res.status(200).json({
            success: false,
            error: "تعذر استخراج السجلات من قاعدة Turso: " + (fetchErr?.message || String(fetchErr))
          });
        }

        if (!remoteResult.rows || remoteResult.rows.length === 0) {
          return res.status(200).json({
            success: true,
            importedRows: 0,
            importedSessions: 0,
            skippedSessions: 0,
            updatedSessions: 0,
            message: "لا توجد سجلات في قاعدة البيانات السابقة لاستيرادها."
          });
        }

        // 2. Group remote rows by Session ID
        const remoteSessionsMap = new Map<string, any[]>();
        remoteResult.rows.forEach((row: any) => {
          const sid = getRowValue(row, "Session ID");
          if (!sid) return;
          if (!remoteSessionsMap.has(sid)) remoteSessionsMap.set(sid, []);
          remoteSessionsMap.get(sid)!.push(row);
        });

        // 3. Check current Session IDs
        const currentSidsRes = await getDb().execute(`SELECT DISTINCT "Session ID" as sid FROM Observations`);
        const currentSids = new Set(
          currentSidsRes.rows.map((r: any) => getRowValue(r, "Session ID") || getRowValue(r, "sid")).filter(Boolean)
        );

        let importedSessions = 0;
        let skippedSessions = 0;
        let updatedSessions = 0;
        let totalImportedRows = 0;

        if (importMode === 'overwrite_all') {
          // Clear current observations
          await getDb().execute("DELETE FROM Observations");
        }

        // Prepare batch statements
        const batchStatements: any[] = [];
        const executeBatchLimit = 150;

        for (const [sid, rows] of remoteSessionsMap.entries()) {
          const exists = currentSids.has(sid);

          if (exists) {
            if (importMode === 'merge_skip_existing') {
              skippedSessions++;
              continue; // Skip this session
            } else if (importMode === 'merge_overwrite_existing') {
              // Delete existing session in local DB first
              batchStatements.push({
                sql: 'DELETE FROM Observations WHERE "Session ID" = ?',
                args: [sid]
              });
              updatedSessions++;
            }
          } else {
            importedSessions++;
          }

          // Insert rows for this session
          for (const row of rows) {
            const oppIndBefPat = getRowValue(row, "Ind: Bef. Pat") || (getRowValue(row, "bef-pat") === 'Yes' ? 'Yes' : 'No');
            const oppIndBefAsept = getRowValue(row, "Ind: Bef. Asept") || (getRowValue(row, "bef-asept") === 'Yes' ? 'Yes' : 'No');
            const oppIndAftBf = getRowValue(row, "Ind: Aft. Body Fluid") || (getRowValue(row, "aft-bf") === 'Yes' ? 'Yes' : 'No');
            const oppIndAftPat = getRowValue(row, "Ind: Aft. Pat") || (getRowValue(row, "aft-pat") === 'Yes' ? 'Yes' : 'No');
            const oppIndAftSurr = getRowValue(row, "Ind: Aft. Surround") || (getRowValue(row, "aft-p-surr") === 'Yes' ? 'Yes' : 'No');

            batchStatements.push({
              sql: `INSERT INTO Observations (
                  "Session ID", "Timestamp", "Facility", "Service", "Ward", "Department",
                  "Country", "City", "Period Number", "Observer", "Session Date",
                  "Start Time", "End Time", "Duration (min)", "Session No", "Page No",
                  "Professional Cat.", "Prof. Code", "Opportunity No",
                  "Ind: Bef. Pat", "Ind: Bef. Asept", "Ind: Aft. Body Fluid", "Ind: Aft. Pat", "Ind: Aft. Surround",
                  "Action (HR/HW/Missed)", "Gloves Used", "Column No"
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                sid,
                getRowValue(row, "Timestamp") || new Date().toISOString(),
                getRowValue(row, "Facility"),
                getRowValue(row, "Service"),
                getRowValue(row, "Ward"),
                getRowValue(row, "Department"),
                getRowValue(row, "Country"),
                getRowValue(row, "City"),
                getRowValue(row, "Period Number"),
                getRowValue(row, "Observer"),
                getRowValue(row, "Session Date"),
                getRowValue(row, "Start Time"),
                getRowValue(row, "End Time"),
                getRowValue(row, "Duration (min)"),
                getRowValue(row, "Session No"),
                getRowValue(row, "Page No"),
                getRowValue(row, "Professional Cat."),
                getRowValue(row, "Prof. Code"),
                getRowValue(row, "Opportunity No"),
                oppIndBefPat,
                oppIndBefAsept,
                oppIndAftBf,
                oppIndAftPat,
                oppIndAftSurr,
                getRowValue(row, "Action (HR/HW/Missed)"),
                getRowValue(row, "Gloves Used"),
                getRowValue(row, "Column No") || '1'
              ]
            });
            totalImportedRows++;
          }

          if (batchStatements.length >= executeBatchLimit) {
            const chunk = batchStatements.splice(0, batchStatements.length);
            await getDb().batch(chunk);
          }
        }

        if (batchStatements.length > 0) {
          await getDb().batch(batchStatements);
        }

        // 4. Optionally import settings / dropdown lists
        let mergedSettingsCount = 0;
        if (importSettings) {
          try {
            const remoteSettingsRes = await remoteDb.execute(`SELECT * FROM Settings LIMIT 500`);
            if (remoteSettingsRes.rows && remoteSettingsRes.rows.length > 0) {
              const currentSettings = await getFullSettingsCached();
              const uniqueAdd = (list: string[], val: string) => {
                const t = String(val || '').trim();
                if (t && !list.some(x => x.toLowerCase() === t.toLowerCase())) {
                  list.push(t);
                  mergedSettingsCount++;
                }
              };

              remoteSettingsRes.rows.forEach((r: any) => {
                const fac = getRowValue(r, "Facilities");
                const ser = getRowValue(r, "Services");
                const wrd = getRowValue(r, "Wards");
                const dep = getRowValue(r, "Departments");
                const obs = getRowValue(r, "Observers");
                const cit = getRowValue(r, "Cities");
                const prc = getRowValue(r, "Professional Categories");

                if (fac) uniqueAdd(currentSettings.facilities, fac);
                if (ser) uniqueAdd(currentSettings.services, ser);
                if (wrd) uniqueAdd(currentSettings.wards, wrd);
                if (dep) uniqueAdd(currentSettings.departments, dep);
                if (obs) uniqueAdd(currentSettings.observers, obs);
                if (cit) uniqueAdd(currentSettings.cities, cit);
                if (prc) uniqueAdd(currentSettings.profCategories, prc);
              });

              if (mergedSettingsCount > 0) {
                await saveSettingsToDb(currentSettings, currentSettings);
              }
            }
          } catch (setErr) {
            console.error("Warning: Could not merge settings from remote:", setErr);
          }
        }

        // 5. Invalidate In-Memory Cache so observations are fresh on next load
        cachedObservations = null;

        return res.status(200).json({
          success: true,
          importedSessions,
          updatedSessions,
          skippedSessions,
          totalImportedRows,
          mergedSettingsCount,
          message: `تم استيراد ${importedSessions} جلسة بنجاح (${totalImportedRows} سطر ملاحظة)${updatedSessions > 0 ? ` وتحديث ${updatedSessions} جلسة` : ''}${skippedSessions > 0 ? ` وتخطي ${skippedSessions} جلسة سابقة` : ''}.`
        });
      }

      if (action === 'addFacility') {
        const facility = String(bodyData?.facility || bodyData?.facilityName || bodyData || '').trim();
        if (!facility) {
          return res.status(400).json({ success: false, error: "يرجى إدخال اسم المركز" });
        }

        const currentSettings = await getFullSettingsCached();
        const existing: string[] = currentSettings.facilities || [];
        const alreadyExists = existing.some((f: string) => f.trim().toLowerCase() === facility.toLowerCase());

        if (!alreadyExists) {
          existing.push(facility);
          currentSettings.facilities = existing;
          const updated = await saveSettingsToDb(currentSettings, currentSettings);
          return res.status(200).json({
            success: true,
            facility,
            settings: sanitizeSettingsForRole(updated, 'admin'),
            message: `تمت إضافة المركز "${facility}" بنجاح`
          });
        }

        return res.status(200).json({
          success: true,
          facility,
          settings: sanitizeSettingsForRole(currentSettings, 'admin'),
          alreadyExists: true,
          message: `المركز "${facility}" موجود بالفعل`
        });
      }

      if (action === 'deleteFacility') {
        const facility = String(bodyData?.facility || bodyData?.facilityName || bodyData || '').trim();
        if (!facility) {
          return res.status(400).json({ success: false, error: "يرجى تحديد اسم المركز المراد حذفه" });
        }

        // 1. Permanently delete all observations belonging to this center
        const deleteRes = await getDb().execute({
          sql: 'DELETE FROM Observations WHERE LOWER(TRIM("Facility")) = LOWER(TRIM(?))',
          args: [facility]
        });
        const deletedCount = Number(deleteRes.rowsAffected || 0);

        // 2. Remove facility from Settings
        const currentSettings = await getFullSettingsCached();
        currentSettings.facilities = (currentSettings.facilities || []).filter(
          (f: string) => f.trim().toLowerCase() !== facility.toLowerCase()
        );
        const updatedSettings = await saveSettingsToDb(currentSettings, currentSettings);

        // 3. Invalidate in-memory cache so fresh queries do not serve deleted records
        cachedObservations = null;

        console.log(`[Database] Deleted facility "${facility}" and ${deletedCount} associated observation rows.`);

        return res.status(200).json({
          success: true,
          facility,
          deletedObservationsCount: deletedCount,
          settings: sanitizeSettingsForRole(updatedSettings, 'admin'),
          message: `تم حذف المركز "${facility}" وحذف جميع البيانات والسجلات التابعة له (${deletedCount} سطر ملاحظة) بنجاح.`
        });
      }

      return res.status(400).json({ error: `Unknown POST action: ${action}` });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("API error:", err);
    return res.status(500).json({ error: err.message || err.toString() });
  }
}
