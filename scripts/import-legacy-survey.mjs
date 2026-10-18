#!/usr/bin/env node
/**
 * Import legacy member-inscription survey responses from the Google
 * Forms .xlsx export at data/legacy/member-survey.xlsx into the new
 * /member_surveys collection.
 *
 *   gcloud auth application-default login    # once
 *   node scripts/import-legacy-survey.mjs                # dry-run
 *   node scripts/import-legacy-survey.mjs --commit       # write
 *
 * Matching strategy (this form has no numeroCuenta column):
 *   1. email — exact case-insensitive
 *   2. fullName — best-effort fallback (firstName + lastName)
 *   3. Unmatched → reported to data/legacy/unmatched-report.csv
 *
 * Per-row payload semantics:
 *   - Fields that map cleanly into the new schema enums go to top-level.
 *   - Likert priorities for 7 SECiD initiatives go to `customAnswers.initiative_priorities`.
 *   - Profile-level data (gender, birthdate, social links, CV URLs)
 *     goes to `customAnswers.profile_legacy` so it can be later promoted
 *     into the users doc by a separate migration if desired — but is
 *     NOT pushed to /users by this script (we don't overwrite the
 *     authenticated user's current profile silently).
 */
import { createRequire } from 'module';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const XLSX = require('../functions/node_modules/xlsx');
const firebaseAdmin = require('../functions/node_modules/firebase-admin');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const XLSX_PATH = resolve(ROOT, 'data/legacy/member-survey.xlsx');
const UNMATCHED_REPORT_PATH = resolve(ROOT, 'data/legacy/unmatched-report.csv');

const COMMIT = process.argv.includes('--commit');

if (!existsSync(XLSX_PATH)) {
  console.error(`File not found: ${XLSX_PATH}`);
  process.exit(1);
}

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({ projectId: 'secid-org' });
}
const db = firebaseAdmin.firestore();

// === Column mapping for THIS specific Google Forms export ===
const C = {
  TIMESTAMP: 'Marca temporal',
  EMAIL: 'Dirección de correo electrónico',
  FIRST_NAME: 'Nombre(s)',
  LAST_NAME_P: 'Apellido Paterno',
  LAST_NAME_M: 'Apellido Materno',
  GENDER: 'Indica el género con el que te identificas.',
  REGISTRATION_TYPE: 'Tipo de registro',
  ACADEMIC_LEVEL:
    'Indica el nivel académico en el que cursaste estudios de ciencia de datos en la UNAM.',
  WHATSAPP_OPT_IN:
    '¿Autorizas que añadamos tu número de teléfono a la comunidad de WhatsApp de egresados de la SECiD?',
  CAMPUS: 'Indica tu sede de estudios',
  GENERATION: 'Elige la generación a la que perteneces.',
  ID_VERIFICATION_DS:
    'Para verificar tu identidad, compártenos tu credencial de estudiante, título, tira de materias o credencial de egresado de la Lic. en Ciencia de Datos.',
  PROGRAM_TITLE: 'Escribe el título del programa académico.',
  PROGRAM_YEAR_START: 'Indica en qué año ingresaste al programa académico.',
  ID_VERIFICATION_PROGRAM:
    'Para verificar tu identidad, compártenos tu constancia,  diploma o algún documento que acredite tu inscripción al programa académico.',
  COURSE_END_DATE:
    'Indica en qué fecha terminaste el curso especializado o de actualización.',
  COURSE_NAME: 'Escribe el nombre del curso',
  ID_VERIFICATION_COURSE:
    'Para verificar tu identidad, compártenos tu constancia,  diploma o algún documento que acredite tu inscripción al curso.',
  EXPERIENCE_LEVEL:
    'Indica el nivel de experiencia que tienes en el área de ciencia de datos',
  OBJECTIVES:
    '¿Cuáles son los principales objetivos de tu acercamiento a SECiD?',
  EXPECTATIONS:
    'Describe a mayor detalle cuáles son tus expectativas al colaborar con SECiD.',
  PROFESSIONAL_STATUS: 'Situación profesional',
  COMPANY: 'Última empresa o institución en la que laboras / laboraste',
  POSITION: 'Puesto de trabajo',
  IS_STUDENT: '¿Estudias actualmente?',
  EXPECTED_GRADUATION:
    'Si estudias actualmente, indica la fechas estimada de graduación.',
  AREAS_OF_INTEREST: 'Intereses / área de expertise',
  CV_URL: 'Currículum vitae',
  RESUME_URL: 'Resumé (CV highlights)',
  MAX_DEGREE: 'Máximo grado de estudios',
  MAX_DEGREE_INSTITUTION:
    'Institución en la que cursaste el máximo grado de estudios',
  MAX_DEGREE_PROGRAM: 'Nombre del programa del máximo grado de estudios',
  PHONE: 'Teléfono',
  LINKEDIN: 'LinkedIn',
  INSTAGRAM: 'Instagram',
  TWITTER: 'Twitter',
  FACEBOOK: 'Facebook',
  OTHER_CONTACT: 'Otros medios de contacto que te gustaría compartir',
  PRIO_JOBS:
    'Selecciona el nivel de prioridad que le asignas a cada una de las siguientes iniciativas: [Bolsa Trabajo]',
  PRIO_HACKATHONS:
    'Selecciona el nivel de prioridad que le asignas a cada una de las siguientes iniciativas: [Hackatones]',
  PRIO_COURSES:
    'Selecciona el nivel de prioridad que le asignas a cada una de las siguientes iniciativas: [Cursos especializados]',
  PRIO_SEMINARS:
    'Selecciona el nivel de prioridad que le asignas a cada una de las siguientes iniciativas: [Seminarios]',
  PRIO_CONSULTING:
    'Selecciona el nivel de prioridad que le asignas a cada una de las siguientes iniciativas: [Asesorías]',
  PRIO_MENTORSHIP:
    'Selecciona el nivel de prioridad que le asignas a cada una de las siguientes iniciativas: [Mentoría]',
  PRIO_NEWSLETTER:
    'Selecciona el nivel de prioridad que le asignas a cada una de las siguientes iniciativas: [Newsletter]',
  ADDITIONAL_COMMENTS:
    'Comparte tus recomendaciones adicionales, comentarios, y sugerencias sobre cómo podríamos colaborar y mejorar.',
  BIRTH_DATE: 'Fecha de Nacimiento',
};

// === Value normalization tables ===
function normLower(s) {
  return typeof s === 'string' ? s.trim().toLowerCase() : '';
}

const ACADEMIC_LEVEL_MAP = {
  licenciatura: 'licenciatura',
  'licenciatura en ciencia de datos — unam': 'licenciatura',
  'curso especializado o actualización': 'curso',
};

const SENIORITY_MAP = {
  'recién iniciando en el área': 'student',
  'experiencia en proyectos individuales o educativos': 'junior',
  'experiencia en proyectos profesionales': 'mid',
};

// "Intereses / área de expertise" is free-text. Best-effort mapping to the
// new AreaOfInterest enum + TechTool enum. Unrecognized values are kept
// raw in customAnswers.legacy_areas_raw.
const AREA_MAP = {
  'machine learning': 'ml',
  'aprendizaje de máquina': 'ml',
  'aprendizaje automático': 'ml',
  'aprendizaje automatico': 'ml',
  'machine-learning': 'ml',
  ml: 'ml',
  'deep learning': 'dl',
  'aprendizaje profundo': 'dl',
  dl: 'dl',
  nlp: 'nlp',
  'natural language processing': 'nlp',
  'procesamiento de lenguaje natural': 'nlp',
  'computer vision': 'cv',
  'visión por computadora': 'cv',
  'reinforcement learning': 'rl',
  'aprendizaje por refuerzo': 'rl',
  'generative ai': 'gen-ai',
  'gen ai': 'gen-ai',
  llms: 'gen-ai',
  mlops: 'mlops',
  'data engineering': 'data-eng',
  'ingeniería de datos': 'data-eng',
  'ingenieria de datos': 'data-eng',
  analytics: 'analytics',
  analítica: 'analytics',
  analitica: 'analytics',
  'business intelligence': 'bi',
  bi: 'bi',
  statistics: 'statistics',
  estadística: 'statistics',
  estadistica: 'statistics',
  research: 'research',
  investigación: 'research',
  investigacion: 'research',
  ethics: 'ethics',
  ética: 'ethics',
  product: 'product',
  producto: 'product',
  leadership: 'leadership',
  liderazgo: 'leadership',
};

// Multi-select "objectives" → reasonsForJoining
const OBJECTIVE_MAP = {
  'publicar vacantes en la bolsa de trabajo de secid': 'recruiting',
  'participar en proyectos colaborativos o de investigación':
    'community-building',
  'explorar oportunidades de networking y eventos': 'networking',
  'ofrecer servicios de mentoría o capacitación': 'mentorship',
  'buscar oportunidades de mentoría': 'mentorship',
  'buscar empleo': 'job-opportunities',
  'mantenerme actualizado': 'stay-updated',
  aprender: 'learning',
  'dar charlas': 'speaking',
};

const PRIORITY_MAP = {
  'muy alto': 5,
  alto: 4,
  moderado: 3,
  bajo: 2,
  'muy bajo': 1,
};

const REGISTRATION_TYPE_MAP = {
  'miembro (egresado unam)': 'member',
  'egresado unam': 'member',
  'colaborador externo': 'collaborator',
};

// === Load xlsx ===
const wb = XLSX.readFile(XLSX_PATH);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
console.log(`Loaded ${rows.length} rows`);

// === Index /users by email + alternate emails + display name ===
console.log('Indexing /users...');
const usersByEmail = new Map();
const usersByName = new Map();
const usersSnap = await db.collection('users').get();
for (const u of usersSnap.docs) {
  const d = u.data();
  const emails = [d.email];
  if (Array.isArray(d.alternateEmails)) {
    for (const ae of d.alternateEmails) if (ae?.email) emails.push(ae.email);
  }
  for (const e of emails) {
    if (e) usersByEmail.set(String(e).trim().toLowerCase(), u.id);
  }
  const fullName = `${d.firstName || ''} ${d.lastName || ''}`
    .trim()
    .toLowerCase();
  if (fullName) {
    const existingUid = usersByName.get(fullName);
    if (existingUid && existingUid !== u.id) {
      console.warn(
        `  ⚠ name collision: "${fullName}" maps to multiple users ` +
          `(${existingUid}, ${u.id}) — keeping first; name-based matching is ambiguous for this name`
      );
    } else {
      usersByName.set(fullName, u.id);
    }
  }
}
console.log(`  ${usersByEmail.size} emails, ${usersByName.size} names indexed`);

// === Transform helpers ===
function splitMulti(s) {
  if (!s || typeof s !== 'string') return [];
  return s
    .split(/,\s*(?=[A-Z¿])/u)
    .map((v) => v.trim())
    .filter(Boolean);
}

function mapAreas(raw) {
  if (!raw) return { mapped: undefined, unmapped: [] };
  const parts = splitMulti(String(raw));
  const mapped = new Set();
  const unmapped = [];
  for (const p of parts) {
    const norm = normLower(p);
    if (AREA_MAP[norm]) mapped.add(AREA_MAP[norm]);
    else unmapped.push(p);
  }
  return {
    mapped: mapped.size > 0 ? [...mapped] : undefined,
    unmapped,
  };
}

function mapObjectives(raw) {
  if (!raw) return { mapped: undefined, unmapped: [] };
  const parts = splitMulti(String(raw));
  const mapped = new Set();
  const unmapped = [];
  for (const p of parts) {
    const norm = normLower(p);
    if (OBJECTIVE_MAP[norm]) mapped.add(OBJECTIVE_MAP[norm]);
    else unmapped.push(p);
  }
  return {
    mapped: mapped.size > 0 ? [...mapped] : undefined,
    unmapped,
  };
}

function excelDateToISO(serial) {
  if (typeof serial !== 'number') return undefined;
  // Excel serial date: days since 1899-12-30
  const ms = (serial - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

// === Walk rows ===
const matched = [];
const unmatched = [];

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const email = row[C.EMAIL] ? String(row[C.EMAIL]).trim().toLowerCase() : null;
  const firstName = row[C.FIRST_NAME] ? String(row[C.FIRST_NAME]).trim() : null;
  const lastNameP = row[C.LAST_NAME_P]
    ? String(row[C.LAST_NAME_P]).trim()
    : null;
  const lastNameM = row[C.LAST_NAME_M]
    ? String(row[C.LAST_NAME_M]).trim()
    : null;
  const fullName = [firstName, lastNameP, lastNameM]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toLowerCase();
  const fullNameNoM = [firstName, lastNameP]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toLowerCase();

  let uid = null;
  let matchedBy = null;
  if (email && usersByEmail.has(email)) {
    uid = usersByEmail.get(email);
    matchedBy = 'email';
  } else if (fullName && usersByName.has(fullName)) {
    uid = usersByName.get(fullName);
    matchedBy = 'fullName';
  } else if (fullNameNoM && usersByName.has(fullNameNoM)) {
    uid = usersByName.get(fullNameNoM);
    matchedBy = 'fullName(no maternal)';
  }

  const areas = mapAreas(row[C.AREAS_OF_INTEREST]);
  const objectives = mapObjectives(row[C.OBJECTIVES]);
  const registrationType =
    REGISTRATION_TYPE_MAP[normLower(row[C.REGISTRATION_TYPE])];
  const academicLevel = ACADEMIC_LEVEL_MAP[normLower(row[C.ACADEMIC_LEVEL])];
  const seniority = SENIORITY_MAP[normLower(row[C.EXPERIENCE_LEVEL])];

  const initiativePriorities = {};
  const PRIO_COLS = {
    jobs: row[C.PRIO_JOBS],
    hackathons: row[C.PRIO_HACKATHONS],
    courses: row[C.PRIO_COURSES],
    seminars: row[C.PRIO_SEMINARS],
    consulting: row[C.PRIO_CONSULTING],
    mentorship: row[C.PRIO_MENTORSHIP],
    newsletter: row[C.PRIO_NEWSLETTER],
  };
  for (const [k, v] of Object.entries(PRIO_COLS)) {
    const score = PRIORITY_MAP[normLower(v)];
    if (score !== undefined) initiativePriorities[k] = score;
  }

  // Map mentorship priority → mentorshipRole if signal is strong
  let mentorshipRole;
  const mentorshipPrio = initiativePriorities.mentorship;
  if (mentorshipPrio === 5) mentorshipRole = 'both';
  else if (mentorshipPrio === 4) mentorshipRole = 'want-mentee';

  // === Build the survey payload ===
  const payload = {};
  if (academicLevel) payload.academicLevel = academicLevel;
  if (row[C.GENERATION]) payload.generation = String(row[C.GENERATION]).trim();
  if (seniority) payload.seniority = seniority;
  if (areas.mapped) payload.areasOfInterest = areas.mapped;
  if (objectives.mapped) payload.reasonsForJoining = objectives.mapped;
  if (mentorshipRole) payload.mentorshipRole = mentorshipRole;

  // Custom answers — preserve everything that doesn't fit the enum schema.
  const customAnswers = {
    initiative_priorities: initiativePriorities,
  };
  if (registrationType) customAnswers.registration_type = registrationType;
  if (row[C.GENDER]) customAnswers.gender = row[C.GENDER];
  if (row[C.WHATSAPP_OPT_IN])
    customAnswers.whatsapp_opt_in = row[C.WHATSAPP_OPT_IN];
  if (row[C.CAMPUS]) customAnswers.campus = row[C.CAMPUS];
  if (row[C.PROFESSIONAL_STATUS])
    customAnswers.professional_status = row[C.PROFESSIONAL_STATUS];
  if (row[C.COMPANY]) customAnswers.company = row[C.COMPANY];
  if (row[C.POSITION]) customAnswers.position = row[C.POSITION];
  if (row[C.IS_STUDENT]) customAnswers.is_student = row[C.IS_STUDENT];
  if (row[C.EXPECTED_GRADUATION]) {
    const iso = excelDateToISO(row[C.EXPECTED_GRADUATION]);
    if (iso) customAnswers.expected_graduation_iso = iso;
  }
  if (row[C.BIRTH_DATE]) {
    const iso = excelDateToISO(row[C.BIRTH_DATE]);
    if (iso) customAnswers.birth_date_iso = iso;
  }
  if (row[C.EXPECTATIONS]) customAnswers.expectations = row[C.EXPECTATIONS];
  if (row[C.ADDITIONAL_COMMENTS])
    customAnswers.additional_comments = row[C.ADDITIONAL_COMMENTS];
  if (row[C.MAX_DEGREE]) customAnswers.max_degree = row[C.MAX_DEGREE];
  if (row[C.MAX_DEGREE_INSTITUTION])
    customAnswers.max_degree_institution = row[C.MAX_DEGREE_INSTITUTION];
  if (row[C.MAX_DEGREE_PROGRAM])
    customAnswers.max_degree_program = row[C.MAX_DEGREE_PROGRAM];
  if (areas.unmapped.length > 0)
    customAnswers.legacy_areas_raw = areas.unmapped;
  if (objectives.unmapped.length > 0)
    customAnswers.legacy_objectives_raw = objectives.unmapped;
  payload.customAnswers = customAnswers;

  if (uid) {
    matched.push({ uid, payload, matchedBy, rowIndex: i + 2, email, fullName });
  } else {
    unmatched.push({
      rowIndex: i + 2,
      email,
      fullName,
      payload,
      registrationType,
    });
  }
}

console.log(`\nMatched:   ${matched.length}`);
console.log(`Unmatched: ${unmatched.length}`);

// === Unmatched report ===
if (unmatched.length > 0) {
  const headers = [
    'rowIndex',
    'email',
    'fullName',
    'registrationType',
    'generation',
    'seniority',
  ];
  const lines = [headers.join(',')];
  for (const u of unmatched) {
    lines.push(
      [
        u.rowIndex,
        `"${u.email || ''}"`,
        `"${u.fullName || ''}"`,
        u.registrationType || '',
        u.payload.generation || '',
        u.payload.seniority || '',
      ].join(',')
    );
  }
  writeFileSync(UNMATCHED_REPORT_PATH, lines.join('\n'));
  console.log(`Report: ${UNMATCHED_REPORT_PATH}`);
}

// === Commit or dry-run ===
if (!COMMIT) {
  console.log('\n🟡 DRY RUN — sample of first 3 matched payloads:');
  for (const m of matched.slice(0, 3)) {
    console.log(
      `  ${m.uid} (by ${m.matchedBy}): ${JSON.stringify(m.payload, null, 2)}`
    );
  }
  if (unmatched.length > 0) {
    console.log(`\n🟡 Sample of first 3 unmatched rows:`);
    for (const u of unmatched.slice(0, 3)) {
      console.log(`  row=${u.rowIndex} email=${u.email} name="${u.fullName}"`);
    }
  }
  console.log('\nRe-run with --commit to write.');
  process.exit(0);
}

console.log(`\n🟢 COMMIT — writing ${matched.length} survey docs...`);
let written = 0;
for (let i = 0; i < matched.length; i += 100) {
  const batch = db.batch();
  for (const { uid, payload, matchedBy, rowIndex } of matched.slice(
    i,
    i + 100
  )) {
    const ref = db.collection('member_surveys').doc(uid);
    batch.set(
      ref,
      {
        ...payload,
        uid,
        version: firebaseAdmin.firestore.FieldValue.increment(1),
        visibility: 'aggregate-only',
        source: 'legacy-google-forms',
        sourceRowIndex: rowIndex,
        sourceMatchedBy: matchedBy,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        completedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    written++;
  }
  await batch.commit();
  console.log(
    `  batch ${Math.floor(i / 100) + 1}: ${written}/${matched.length}`
  );
}

console.log(
  `\n✅ Done. ${written} surveys imported. Now click "Recalcular ahora" on /es/dashboard/admin/survey to refresh aggregates.`
);
process.exit(0);
