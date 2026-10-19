#!/usr/bin/env node

/**
 * Seed script for the Firebase emulators (Auth + Firestore).
 *
 * Talks to the emulators over their REST APIs with the `Bearer owner`
 * token, which the emulators accept as an admin bypass of the security
 * rules. The production rules (firestore.rules) forbid a user from
 * self-granting `role: 'admin'` or `isVerified: true`, so the client SDK
 * cannot seed the accounts the e2e suite needs. No firebase-admin
 * dependency is required at the repo root.
 *
 * Project id and ports mirror src/lib/firebase.ts and firebase.json:
 *   - PUBLIC_FIREBASE_PROJECT_ID   (default demo-secid-alumni)
 *   - FIREBASE_AUTH_EMULATOR_HOST  (default 127.0.0.1:9099)
 *   - FIRESTORE_EMULATOR_HOST      (default 127.0.0.1:8088)
 *
 * Idempotent: documents use fixed ids and are overwritten; existing Auth
 * users are looked up instead of re-created.
 *
 * Test credentials (also used by CI, see .github/workflows/ci.yml "e2e"):
 *   Admin:   admin@secid.mx            / admin123456
 *   Member:  member1@alumno.unam.mx    / member123456  (numeroCuenta 318000001)
 *   Member:  member2@alumno.unam.mx    / member123456  (numeroCuenta 318000002)
 *   Company: company@example.com       / company123456
 *
 * Números de cuenta: the members above are indexed in
 * numero_cuenta_index/{numeroCuenta} = { uid, displayName } (what
 * functions/src/numero-cuenta-index.ts writes), so the uniqueness check
 * behaves as in production. QA_NUMERO_CUENTA below is reserved for a fresh
 * sign-up (E2E_QA_NUMERO_CUENTA in journey-B) and is never indexed here.
 *
 * When the functions emulator runs alongside (CI does), every sign-up below
 * goes through the blocking onUserCreate trigger, which writes a default
 * users/{uid}; the profile written here then overwrites it.
 */

const PROJECT_ID =
  process.env.PUBLIC_FIREBASE_PROJECT_ID || 'demo-secid-alumni';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8088';

const AUTH_BASE = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1`;
const FIRESTORE_BASE = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const OWNER_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer owner',
};

// 9 digits (completeRegistration validates /^\d{9}$/), reserved for a fresh
// sign-up: nothing seeded below claims it in numero_cuenta_index.
const QA_NUMERO_CUENTA = process.env.E2E_QA_NUMERO_CUENTA || '300000001';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const testUsers = [
  {
    email: 'admin@secid.mx',
    password: 'admin123456',
    // Custom claims: full RBAC allow (firestore.rules hasRBACAllow*).
    claims: { rbac: { p: '*:*.a' } },
    profile: {
      displayName: 'Admin User',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isVerified: true,
      unamEmail: 'admin@unam.mx',
      graduationYear: 2020,
      program: 'Data Science',
      skills: ['Python', 'Machine Learning', 'SQL', 'Data Visualization'],
      currentPosition: 'Platform Administrator',
      currentCompany: 'SECiD',
    },
  },
  {
    email: 'member1@alumno.unam.mx',
    password: 'member123456',
    profile: {
      displayName: 'María García',
      firstName: 'María',
      lastName: 'García',
      role: 'member',
      isVerified: true,
      unamEmail: 'maria.garcia@alumno.unam.mx',
      numeroCuenta: '318000001',
      graduationYear: 2022,
      program: 'Data Science',
      skills: ['Python', 'R', 'TensorFlow', 'AWS'],
      currentPosition: 'Data Scientist',
      currentCompany: 'Tech Corp',
      privacySettings: {
        profileVisible: true,
        contactVisible: true,
        jobSearching: true,
        mentorshipAvailable: true,
      },
    },
  },
  {
    email: 'member2@alumno.unam.mx',
    password: 'member123456',
    profile: {
      displayName: 'Carlos Rodríguez',
      firstName: 'Carlos',
      lastName: 'Rodríguez',
      role: 'member',
      isVerified: true,
      unamEmail: 'carlos.rodriguez@alumno.unam.mx',
      numeroCuenta: '318000002',
      graduationYear: 2021,
      program: 'Data Science',
      skills: ['Python', 'Spark', 'Docker', 'Kubernetes'],
      currentPosition: 'ML Engineer',
      currentCompany: 'Data Solutions Inc',
      privacySettings: {
        profileVisible: true,
        contactVisible: false,
        jobSearching: false,
        mentorshipAvailable: true,
      },
    },
  },
  {
    email: 'company@example.com',
    password: 'company123456',
    profile: {
      displayName: 'HR TechCorp',
      firstName: 'Human',
      lastName: 'Resources',
      role: 'company',
      isVerified: true,
      currentCompany: 'TechCorp México',
      companyDescription: 'Leading technology company in Mexico',
    },
  },
];

const testJobs = [
  {
    id: 'seed-job-senior-data-scientist',
    title: 'Senior Data Scientist',
    company: 'TechCorp México',
    description:
      'We are looking for an experienced Data Scientist to join our team and lead ML projects.',
    requirements: [
      '3+ years experience',
      'Python',
      'Machine Learning',
      'SQL',
      'Cloud platforms',
    ],
    location: 'Ciudad de México, CDMX',
    locationType: 'hybrid',
    employmentType: 'full-time',
    salaryRange: { min: 60000, max: 90000, currency: 'MXN', period: 'monthly' },
    benefits: [
      'Seguro de gastos médicos mayores',
      'Vales de despensa',
      'Home office',
      'Capacitación continua',
    ],
    applicationMethod: 'platform',
    status: 'active',
    isApproved: true,
    tags: ['data-science', 'python', 'machine-learning', 'senior'],
    viewCount: 156,
    applicationCount: 23,
    featured: true,
  },
  {
    id: 'seed-job-data-analyst-junior',
    title: 'Data Analyst Junior',
    company: 'Startup Fintech',
    description:
      'Join our growing fintech startup as a Junior Data Analyst. Great opportunity to learn and grow.',
    requirements: [
      '0-2 years experience',
      'SQL',
      'Excel',
      'Basic Python',
      'Statistics',
    ],
    location: 'Guadalajara, Jalisco',
    locationType: 'onsite',
    employmentType: 'full-time',
    salaryRange: { min: 20000, max: 30000, currency: 'MXN', period: 'monthly' },
    benefits: [
      'Seguro de gastos médicos',
      'Vacaciones superiores a la ley',
      'Horario flexible',
    ],
    applicationMethod: 'platform',
    status: 'active',
    isApproved: true,
    tags: ['data-analyst', 'junior', 'sql', 'entry-level'],
    viewCount: 245,
    applicationCount: 45,
    featured: false,
  },
  {
    id: 'seed-job-ml-engineer',
    title: 'Machine Learning Engineer',
    company: 'AI Solutions México',
    description: 'Build and deploy ML models at scale for enterprise clients.',
    requirements: [
      '2+ years ML experience',
      'Python',
      'TensorFlow/PyTorch',
      'MLOps',
      'Docker',
    ],
    location: 'Remote',
    locationType: 'remote',
    employmentType: 'full-time',
    salaryRange: { min: 50000, max: 70000, currency: 'MXN', period: 'monthly' },
    benefits: [
      '100% remote',
      'Equipment provided',
      'Learning budget',
      'Stock options',
    ],
    applicationMethod: 'platform',
    status: 'active',
    isApproved: true,
    tags: ['machine-learning', 'mlops', 'remote', 'python'],
    viewCount: 312,
    applicationCount: 67,
    featured: true,
  },
];

const testEvents = [
  {
    id: 'seed-event-career-fair',
    title: 'Data Science Career Fair 2024',
    description:
      'Annual career fair connecting UNAM data science alumni with top companies in Mexico.',
    type: 'career-fair',
    startDate: new Date('2024-03-15T10:00:00'),
    endDate: new Date('2024-03-15T18:00:00'),
    timezone: 'America/Mexico_City',
    duration: 480,
    location: {
      type: 'physical',
      venue: 'UNAM Campus Ciudad Universitaria',
      address: 'Avenida Universidad 3000, CDMX',
    },
    registrationRequired: true,
    registrationDeadline: new Date('2024-03-10'),
    maxAttendees: 200,
    currentAttendees: 45,
    registrationFee: 0,
    status: 'published',
    tags: ['career', 'networking', 'professional-development'],
    viewCount: 445,
    registrationCount: 45,
  },
  {
    id: 'seed-event-mlops-workshop',
    title: 'Introduction to MLOps Workshop',
    description:
      'Learn the fundamentals of MLOps and how to deploy ML models in production.',
    type: 'workshop',
    startDate: new Date('2024-02-20T18:00:00'),
    endDate: new Date('2024-02-20T20:00:00'),
    timezone: 'America/Mexico_City',
    duration: 120,
    location: {
      type: 'virtual',
      virtualPlatform: 'zoom',
      virtualLink: 'https://zoom.us/j/123456789',
    },
    registrationRequired: true,
    registrationDeadline: new Date('2024-02-19'),
    maxAttendees: 100,
    currentAttendees: 67,
    registrationFee: 0,
    status: 'published',
    tags: ['workshop', 'mlops', 'technical', 'online'],
    viewCount: 234,
    registrationCount: 67,
  },
];

const testForums = [
  {
    id: 'seed-forum-career',
    title: 'Career Advice',
    description: 'Share and discuss career-related questions and experiences',
    category: 'career',
    visibility: 'members',
    allowedRoles: ['member', 'admin', 'moderator'],
    postCount: 234,
    rules: [
      'Keep discussions professional and respectful',
      'No spam or self-promotion without context',
      'Search before posting to avoid duplicates',
    ],
    isActive: true,
    subscriberCount: 89,
  },
  {
    id: 'seed-forum-technical',
    title: 'Technical Discussions',
    description:
      'Deep dive into technical topics, algorithms, and best practices',
    category: 'technical',
    visibility: 'members',
    allowedRoles: ['member', 'admin', 'moderator'],
    postCount: 156,
    rules: [
      'Provide context and code examples when asking questions',
      'Credit sources and respect intellectual property',
      'Be constructive in code reviews',
    ],
    isActive: true,
    subscriberCount: 124,
  },
];

// ---------------------------------------------------------------------------
// Emulator REST helpers
// ---------------------------------------------------------------------------

async function request(url, { method = 'POST', body, headers } = {}) {
  const response = await fetch(url, {
    method,
    headers: headers || OWNER_HEADERS,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message =
      json.error?.message || `${response.status} ${response.statusText}`;
    throw new Error(`${method} ${url} → ${message}`);
  }
  return json;
}

/** Encode a JS value as a Firestore REST `Value`. */
function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  if (typeof value === 'object') {
    return { mapValue: { fields: encodeFields(value) } };
  }
  throw new Error(`Unsupported Firestore value: ${typeof value}`);
}

function encodeFields(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) fields[key] = encodeValue(value);
  }
  return fields;
}

/** setDoc semantics: create or fully overwrite `collection/id`. */
async function setDoc(path, data) {
  await request(`${FIRESTORE_BASE}/${path}`, {
    method: 'PATCH',
    body: { fields: encodeFields(data) },
  });
}

/** Create the Auth user (or look it up), mark it verified, set claims. */
async function ensureAuthUser({ email, password, profile, claims }) {
  let localId;
  try {
    const created = await request(`${AUTH_BASE}/accounts:signUp?key=seed`, {
      headers: { 'Content-Type': 'application/json' },
      body: { email, password, returnSecureToken: true },
    });
    localId = created.localId;
  } catch (error) {
    if (!String(error.message).includes('EMAIL_EXISTS')) throw error;
    const found = await request(`${AUTH_BASE}/accounts:lookup`, {
      body: { email: [email] },
    });
    localId = found.users?.[0]?.localId;
    if (!localId) throw new Error(`Could not look up ${email}`);
    console.log(`⚠️  User already exists: ${email}`);
  }

  await request(`${AUTH_BASE}/accounts:update`, {
    body: {
      localId,
      emailVerified: true,
      displayName: profile.displayName,
      ...(claims ? { customAttributes: JSON.stringify(claims) } : {}),
    },
  });

  return localId;
}

/** users/{uid} document, mirroring what functions/src/index.ts onUserCreate writes. */
function buildUserDoc(email, profile, now) {
  return {
    email,
    photoURL: '',
    registrationType: profile.role === 'company' ? 'recruiter' : 'alumni',
    verificationStatus: profile.isVerified ? 'approved' : 'none',
    isActive: true,
    membershipTier: 'free',
    skills: [],
    lifecycle: {
      status: profile.isVerified ? 'active' : 'collaborator',
      statusChangedAt: now,
      statusHistory: [],
      lastActiveDate: now,
    },
    privacySettings: {
      profileVisible: true,
      contactVisible: false,
      jobSearching: false,
      mentorshipAvailable: false,
    },
    notificationSettings: {
      email: true,
      push: false,
      jobMatches: true,
      events: true,
      forums: true,
    },
    createdAt: now,
    updatedAt: now,
    profileCompleteness: 80,
    ...profile,
  };
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seedEmulator() {
  console.log('🌱 Starting emulator seed process...');
  console.log(
    `   project=${PROJECT_ID} auth=${AUTH_HOST} firestore=${FIRESTORE_HOST}`
  );
  const now = new Date();
  const uids = {};

  console.log('\n👥 Creating test users...');
  for (const user of testUsers) {
    const uid = await ensureAuthUser(user);
    uids[user.email] = uid;
    await setDoc(`users/${uid}`, buildUserDoc(user.email, user.profile, now));
    console.log(`✅ User ready: ${user.email} (${uid})`);
  }
  const adminUid = uids['admin@secid.mx'];

  console.log('\n🔢 Indexing números de cuenta...');
  for (const user of testUsers) {
    const numero = user.profile.numeroCuenta;
    if (!numero) continue;
    if (numero === QA_NUMERO_CUENTA) {
      throw new Error(
        `${user.email} uses the reserved QA numeroCuenta ${QA_NUMERO_CUENTA}`
      );
    }
    await setDoc(`numero_cuenta_index/${numero}`, {
      uid: uids[user.email],
      displayName: user.profile.displayName,
    });
    console.log(`✅ Indexed numeroCuenta ${numero} → ${user.email}`);
  }
  console.log(`ℹ️  Reserved for a fresh sign-up: ${QA_NUMERO_CUENTA}`);

  console.log('\n💼 Creating test jobs...');
  for (const { id, ...job } of testJobs) {
    await setDoc(`jobs/${id}`, {
      ...job,
      postedBy: adminUid,
      postedAt: now,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    console.log(`✅ Created job: ${job.title} (${id})`);
  }

  console.log('\n📅 Creating test events...');
  for (const { id, ...event } of testEvents) {
    await setDoc(`events/${id}`, {
      ...event,
      organizedBy: adminUid,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`✅ Created event: ${event.title} (${id})`);
  }

  console.log('\n💬 Creating test forums...');
  for (const { id, ...forum } of testForums) {
    await setDoc(`forums/${id}`, {
      ...forum,
      createdBy: adminUid,
      moderators: [adminUid],
      createdAt: now,
      updatedAt: now,
      lastPostAt: now,
    });
    await setDoc(`forums/${id}/posts/welcome`, {
      title: `Welcome to ${forum.title}!`,
      content: `This is the first post in the ${forum.title} forum. Feel free to start discussions and share your thoughts.`,
      authorId: adminUid,
      authorName: 'Admin User',
      authorRole: 'admin',
      viewCount: 0,
      likeCount: 0,
      replyCount: 0,
      status: 'published',
      isPinned: true,
      tags: ['welcome', 'introduction'],
      createdAt: now,
      updatedAt: now,
    });
    console.log(`✅ Created forum: ${forum.title} (${id})`);
  }

  console.log('\n✨ Emulator seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - ${testUsers.length} users`);
  console.log(`  - ${testJobs.length} jobs`);
  console.log(`  - ${testEvents.length} events`);
  console.log(`  - ${testForums.length} forums`);
  console.log('\n📧 Test credentials:');
  console.log('  Admin:   admin@secid.mx / admin123456');
  console.log('  Member:  member1@alumno.unam.mx / member123456');
  console.log('  Company: company@example.com / company123456');
}

seedEmulator().catch((error) => {
  console.error('❌ Error during seeding:', error.message || error);
  process.exit(1);
});
