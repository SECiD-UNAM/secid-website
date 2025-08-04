#!/usr/bin/env node

/**
 * Seed script for Firebase Emulator
 * Populates the emulator with test data for development
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

// Emulator configuration
const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-secid-alumni.firebaseapp.com',
  projectId: 'demo-secid-alumni',
  storageBucket: 'demo-secid-alumni.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef123456',
};

// Initialize Firebase for emulator
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators
connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
connectFirestoreEmulator(db, 'localhost', 8080);

// Test data
const testUsers = [
  {
    email: 'admin@secid.mx',
    password: 'admin123456',
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
    }
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
      }
    }
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
      }
    }
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
    }
  }
];

const testJobs = [
  {
    title: 'Senior Data Scientist',
    company: 'TechCorp México',
    description: 'We are looking for an experienced Data Scientist to join our team and lead ML projects.',
    requirements: ['3+ years experience', 'Python', 'Machine Learning', 'SQL', 'Cloud platforms'],
    location: 'Ciudad de México, CDMX',
    locationType: 'hybrid',
    employmentType: 'full-time',
    salaryRange: {
      min: 60000,
      max: 90000,
      currency: 'MXN',
      period: 'monthly'
    },
    benefits: ['Seguro de gastos médicos mayores', 'Vales de despensa', 'Home office', 'Capacitación continua'],
    applicationMethod: 'platform',
    status: 'active',
    isApproved: true,
    tags: ['data-science', 'python', 'machine-learning', 'senior'],
    viewCount: 156,
    applicationCount: 23,
    featured: true,
  },
  {
    title: 'Data Analyst Junior',
    company: 'Startup Fintech',
    description: 'Join our growing fintech startup as a Junior Data Analyst. Great opportunity to learn and grow.',
    requirements: ['0-2 years experience', 'SQL', 'Excel', 'Basic Python', 'Statistics'],
    location: 'Guadalajara, Jalisco',
    locationType: 'onsite',
    employmentType: 'full-time',
    salaryRange: {
      min: 20000,
      max: 30000,
      currency: 'MXN',
      period: 'monthly'
    },
    benefits: ['Seguro de gastos médicos', 'Vacaciones superiores a la ley', 'Horario flexible'],
    applicationMethod: 'platform',
    status: 'active',
    isApproved: true,
    tags: ['data-analyst', 'junior', 'sql', 'entry-level'],
    viewCount: 245,
    applicationCount: 45,
    featured: false,
  },
  {
    title: 'Machine Learning Engineer',
    company: 'AI Solutions México',
    description: 'Build and deploy ML models at scale for enterprise clients.',
    requirements: ['2+ years ML experience', 'Python', 'TensorFlow/PyTorch', 'MLOps', 'Docker'],
    location: 'Remote',
    locationType: 'remote',
    employmentType: 'full-time',
    salaryRange: {
      min: 50000,
      max: 70000,
      currency: 'MXN',
      period: 'monthly'
    },
    benefits: ['100% remote', 'Equipment provided', 'Learning budget', 'Stock options'],
    applicationMethod: 'platform',
    status: 'active',
    isApproved: true,
    tags: ['machine-learning', 'mlops', 'remote', 'python'],
    viewCount: 312,
    applicationCount: 67,
    featured: true,
  }
];

const testEvents = [
  {
    title: 'Data Science Career Fair 2024',
    description: 'Annual career fair connecting UNAM data science alumni with top companies in Mexico.',
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
    title: 'Introduction to MLOps Workshop',
    description: 'Learn the fundamentals of MLOps and how to deploy ML models in production.',
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
  }
];

const testForums = [
  {
    title: 'Career Advice',
    description: 'Share and discuss career-related questions and experiences',
    category: 'career',
    visibility: 'members',
    allowedRoles: ['member', 'admin', 'moderator'],
    postCount: 234,
    rules: [
      'Keep discussions professional and respectful',
      'No spam or self-promotion without context',
      'Search before posting to avoid duplicates'
    ],
    isActive: true,
    subscriberCount: 89,
  },
  {
    title: 'Technical Discussions',
    description: 'Deep dive into technical topics, algorithms, and best practices',
    category: 'technical',
    visibility: 'members',
    allowedRoles: ['member', 'admin', 'moderator'],
    postCount: 156,
    rules: [
      'Provide context and code examples when asking questions',
      'Credit sources and respect intellectual property',
      'Be constructive in code reviews'
    ],
    isActive: true,
    subscriberCount: 124,
  }
];

// Seed function
async function seedEmulator() {
  console.log('🌱 Starting emulator seed process...');

  try {
    // Create test users
    console.log('\n👥 Creating test users...');
    for (const userData of testUsers) {
      try {
        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          userData.email,
          userData.password
        );
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          ...userData.profile,
          email: userData.email,
          isActive: true,
          membershipTier: 'free',
          notificationSettings: {
            email: true,
            push: false,
            jobMatches: true,
            events: true,
            forums: true,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          profileCompleteness: 80,
        });
        
        console.log(`✅ Created user: ${userData.email}`);
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`⚠️  User already exists: ${userData.email}`);
        } else {
          console.error(`❌ Error creating user ${userData.email}:`, error);
        }
      }
    }

    // Sign in as admin for creating other data
    console.log('\n🔐 Signing in as admin...');
    await signInWithEmailAndPassword(auth, 'admin@secid.mx', 'admin123456');

    // Create test jobs
    console.log('\n💼 Creating test jobs...');
    for (const job of testJobs) {
      const jobRef = await addDoc(collection(db, 'jobs'), {
        ...job,
        postedBy: auth.currentUser?.uid,
        postedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });
      console.log(`✅ Created job: ${job.title} (${jobRef.id})`);
    }

    // Create test events
    console.log('\n📅 Creating test events...');
    for (const event of testEvents) {
      const eventRef = await addDoc(collection(db, 'events'), {
        ...event,
        organizedBy: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`✅ Created event: ${event.title} (${eventRef.id})`);
    }

    // Create test forums
    console.log('\n💬 Creating test forums...');
    for (const forum of testForums) {
      const forumRef = await addDoc(collection(db, 'forums'), {
        ...forum,
        createdBy: auth.currentUser?.uid,
        moderators: [auth.currentUser?.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastPostAt: serverTimestamp(),
      });
      console.log(`✅ Created forum: ${forum.title} (${forumRef.id})`);

      // Add a sample post to each forum
      await addDoc(collection(db, 'forums', forumRef.id, 'posts'), {
        title: `Welcome to ${forum.title}!`,
        content: `This is the first post in the ${forum.title} forum. Feel free to start discussions and share your thoughts.`,
        authorId: auth.currentUser?.uid,
        authorName: 'Admin User',
        authorRole: 'admin',
        viewCount: 0,
        likeCount: 0,
        replyCount: 0,
        status: 'published',
        isPinned: true,
        tags: ['welcome', 'introduction'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log('\n✨ Emulator seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${testUsers.length} users created`);
    console.log(`  - ${testJobs.length} jobs created`);
    console.log(`  - ${testEvents.length} events created`);
    console.log(`  - ${testForums.length} forums created`);
    console.log('\n🎉 You can now access the emulator UI at http://localhost:4000');
    console.log('📧 Test credentials:');
    console.log('  Admin: admin@secid.mx / admin123456');
    console.log('  Member: member1@alumno.unam.mx / member123456');
    console.log('  Company: company@example.com / company123456');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seed function
seedEmulator();