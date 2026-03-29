#!/usr/bin/env node

/**
 * Enrich member profiles with additional CV data:
 * - portfolio.certifications
 * - portfolio.projects
 * - portfolio.achievements (awards, honors, scholarships)
 * - Education GPA scores
 *
 * Usage:
 *   node scripts/migrate-cv-enrichment.mjs --dry-run
 *   node scripts/migrate-cv-enrichment.mjs
 */

import { createRequire } from 'module';
import path from 'path';

const require = createRequire(path.resolve('functions/index.js'));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const PROJECT_ID = 'secid-org';
const isDryRun = process.argv.includes('--dry-run');

initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() });
const db = getFirestore();

// ---------------------------------------------------------------------------
// Data extracted from CVs
// ---------------------------------------------------------------------------

const MEMBERS = [
  {
    uid: 'u0ZxS9DmhdSnQxeiNswAiFuu2273',
    name: 'Sara Kenia Cisneros',
    certifications: [
      { name: 'SAP Data Intelligence for Enterprise AI', issuer: 'openSAP', issueDate: new Date(2021, 0, 1), verified: false },
      { name: 'Data Analysis Using Pyspark', issuer: 'Coursera', issueDate: new Date(2021, 0, 1), verified: false },
      { name: 'NLP with Classification and Vector Spaces', issuer: 'Coursera', issueDate: new Date(2021, 0, 1), verified: false },
      { name: 'NLP with Probabilistic Models', issuer: 'Coursera', issueDate: new Date(2021, 0, 1), verified: false },
      { name: 'Statistics 1: Intro to ANOVA, Regression and Logistics Regression', issuer: 'SAS', issueDate: new Date(2021, 0, 1), verified: false },
      { name: 'Programming 1: Essentials', issuer: 'SAS', issueDate: new Date(2021, 0, 1), verified: false },
    ],
    projects: [
      { title: 'Prediction of Genetic Risk of Breast Cancer', description: 'Compared 12 datasets with SVM, LR and XGBoost for breast cancer gene detection at patient and clonal family level.', technologies: ['Python', 'Machine Learning', 'SVM', 'XGBoost'], category: 'research', featured: true },
      { title: 'Bitcoin Price Prediction', description: 'Time series approach with LSTM bidirectional neural network for Bitcoin price prediction.', technologies: ['Python', 'Deep Learning', 'LSTM'], category: 'data-analysis', featured: false },
      { title: 'Sentiment Analysis for Mexican Tourism', description: 'Sentiment analysis with transfer learning and transformers neural networks.', technologies: ['Python', 'NLP', 'Transformers'], category: 'machine-learning', featured: false },
    ],
    achievements: [],
    educationGpa: {},
  },
  {
    uid: 'UqZVhzx6TwalNlz3NDVTKPlNtjI2',
    name: 'José Marcos Yáñez',
    certifications: [],
    projects: [
      { title: 'Topological Data Analysis for Critical Transitions in Cryptocurrency', description: 'Methodology combining topological data analysis with machine learning to detect critical transitions in cryptocurrency markets.', technologies: ['Python', 'TDA', 'Machine Learning'], category: 'research', featured: true },
      { title: 'Better Locations for Centers of Attention to Women Victims of Violence in CDMX', description: 'Algorithm based on graph theory to find areas with highest incidence of gender crime using PGJ data.', technologies: ['Python', 'Graph Theory'], category: 'data-analysis', featured: true },
    ],
    achievements: [],
    educationGpa: { 'IIMAS UNAM': 9.6 },
  },
  {
    uid: 'Rdn0RfG4TVckdt6AXw8XPTp7tV42',
    name: 'Fernando Raúl Garay',
    certifications: [],
    projects: [
      { title: 'Web Scraper', description: 'Web scraper for obtaining and storing large streams of movie data using Python.', technologies: ['Python', 'Web Scraping'], category: 'web-development', featured: false },
      { title: 'Web App and Social Network', description: 'Replica of imdb.com using SCRUM and VueJs, ExpressJs, PostgreSQL.', technologies: ['Vue.js', 'Express.js', 'PostgreSQL', 'SCRUM'], category: 'web-development', featured: true },
      { title: 'Website Generator', description: 'Automatic generator of raw HTML, CSS, and JavaScript code to summarize arbitrary texts. Developed with Java.', technologies: ['Java', 'HTML', 'CSS', 'JavaScript'], category: 'web-development', featured: false },
    ],
    achievements: [
      { title: 'Finalist in Hackathon hackmexico2024', description: 'Presented solutions for inclusive tourism in Mexico through a web app with chatbot and mobile app for people with disabilities.', category: 'technical', earnedAt: new Date(2024, 3, 1) },
    ],
    educationGpa: { 'UNAM': 9.75 },
  },
  {
    uid: 'Wamn9LLkpHbPQZQX6RubZPA7FGG3',
    name: 'Misael López Sánchez',
    certifications: [
      { name: 'SAFe 5 Scrum Master', issuer: 'Scaled Agile', issueDate: new Date(2022, 0, 1), verified: true },
      { name: 'Cloud Network Engineer Specialization', issuer: 'Coursera', issueDate: new Date(2022, 0, 1), verified: false },
      { name: 'Deep Learning Specialization', issuer: 'Coursera', issueDate: new Date(2022, 0, 1), verified: false },
      { name: 'CSSLP Preparation', issuer: 'ISC2', issueDate: new Date(2022, 0, 1), verified: false },
      { name: 'Diploma Program in Business Administration', issuer: 'Unknown', issueDate: new Date(2021, 0, 1), verified: false },
      { name: 'SAS Certified Specialist: Base Programming Using SAS 9.4', issuer: 'SAS', issueDate: new Date(2021, 0, 1), verified: true },
      { name: 'SAS Certified Associate: Programming Fundamentals Using SAS Viya', issuer: 'SAS', issueDate: new Date(2021, 0, 1), verified: true },
    ],
    projects: [],
    achievements: [],
    educationGpa: {},
  },
  {
    uid: 'TWVkrEKswJO7Y2UhaheSqVgURKt2',
    name: 'Rodrigo Alan García',
    certifications: [
      { name: 'Data Analytics Boot Camp', issuer: 'ITESM', issueDate: new Date(2023, 0, 1), verified: false },
    ],
    projects: [],
    achievements: [],
    educationGpa: {},
  },
  {
    uid: 'tdjB2mOZa1Wi5fTBf9NxR7apbMo2',
    name: 'Héctor Moisés Pech',
    certifications: [],
    projects: [],
    achievements: [],
    educationGpa: {},
  },
  {
    uid: 'By4a9q8ACHQwWFOYtGAxZJ0WHwc2',
    name: 'Ingrid Pamela Ruíz',
    certifications: [
      { name: 'TOEFL ITP', issuer: 'ETS', issueDate: new Date(2022, 0, 1), verified: false },
    ],
    projects: [],
    achievements: [
      { title: 'UN Youth Hackathon', description: 'Participated in the UN Youth Hackathon.', category: 'technical', earnedAt: new Date(2022, 0, 1) },
    ],
    educationGpa: {},
  },
  {
    uid: 'UpV4skFQQSVUEPpRLCrwtbdu7Qh2',
    name: 'Yaotzin Velázquez',
    certifications: [
      { name: 'Apache Airflow Fundamentals', issuer: 'Astronomer', issueDate: new Date(2022, 8, 1), verified: false },
      { name: 'Pentaho Data Integration Fundamentals', issuer: 'Hitachi Vantara', issueDate: new Date(2020, 5, 1), verified: false },
      { name: 'English B1 Intermediate', issuer: 'EF', issueDate: new Date(2019, 5, 1), verified: false },
      { name: 'Scrum Fundamentals', issuer: 'SCRUMstudy', issueDate: new Date(2018, 11, 1), verified: false },
      { name: 'Cloud Computing', issuer: 'Google Activate', issueDate: new Date(2018, 11, 1), verified: false },
    ],
    projects: [
      { title: 'Automatic Classification of Web Articles using Topic Modeling', description: 'System that manages web articles through a Telegram chatbot using Topic Modeling for semantic classification.', technologies: ['Python', 'MongoDB', 'Selenium', 'Telegram API', 'Docker'], category: 'machine-learning', featured: true },
      { title: 'Data Lake in AWS', description: 'AWS data lake for BI reporting using Athena and QuickSight dashboards with EMR data ingestion.', technologies: ['AWS', 'LakeFormation', 'EMR', 'S3', 'Glue', 'Athena', 'QuickSight'], category: 'data-analysis', featured: true },
      { title: 'Pipeline Change Data Capture in AWS', description: 'CDC pipeline between Aurora MySQL and S3 using AWS DMS.', technologies: ['AWS', 'DMS', 'Aurora', 'S3'], category: 'data-analysis', featured: false },
      { title: 'Data Governance and Agnostic Database Management', description: 'Multi-DBMS management using ORM with Data Governance implementation.', technologies: ['Django', 'MySQL', 'SQL Server', 'PostgreSQL'], category: 'data-analysis', featured: false },
      { title: 'Data Delivery as a Service', description: 'REST API delivering geolocalization data to third-party web services.', technologies: ['AWS API Gateway', 'Lambda', 'Python', 'Athena'], category: 'web-development', featured: false },
      { title: 'Covid Patient Management System', description: 'Web app for managing covid patients with dynamic dashboards.', technologies: ['Python', 'Flask', 'Pandas', 'MySQL', 'Vue', 'Docker'], category: 'web-development', featured: true },
      { title: 'Marketing Campaign System Management', description: 'App for managing customer database, marketing campaigns and BI reporting.', technologies: ['Python', 'Django', 'Pandas', 'PostgreSQL', 'Mailjet'], category: 'web-development', featured: false },
    ],
    achievements: [],
    educationGpa: {},
  },
  {
    uid: 'Rf0XB6eLYcgYEf76z2W70wxGMJo2',
    name: 'Fernando Avitúa',
    certifications: [],
    projects: [
      { title: 'Mozilla Common Voice Hackathon 2022 - Voice Coding Tool', description: 'Tool to write Python code using voice commands. Used STT models and NLP for keyword extraction.', technologies: ['Python', 'Hugging Face', 'NLP', 'Speech-to-Text'], category: 'machine-learning', featured: true },
    ],
    achievements: [
      { title: 'Winners - Hackathon 2022 Mozilla Common Voice', description: 'Developed a voice-to-code tool using pre-trained STT models and NLP.', category: 'technical', earnedAt: new Date(2022, 0, 1) },
    ],
    educationGpa: {},
  },
  {
    uid: 'AiED4e6buhZxeDgtqhaeOJpGq6C3',
    name: 'Santiago Licea',
    certifications: [
      { name: 'MLOps Practitioner Certificate', issuer: 'Dataiku', issueDate: new Date(2023, 0, 1), verified: true },
      { name: 'Data Science Visualization', issuer: 'HarvardX', issueDate: new Date(2021, 0, 1), verified: false },
      { name: 'Aprendizaje Supervisado', issuer: 'AMAT', issueDate: new Date(2022, 0, 1), verified: false },
    ],
    projects: [
      { title: 'Dashboard Tableau para empresa de biorracionales', description: 'Dashboard en Tableau para empresa internacional, trabajando con el cliente en KPIs y niveles de agregación.', technologies: ['Tableau'], category: 'data-analysis', featured: true },
      { title: 'Sistema de recomendación para campaña de emails', description: 'Sistema de recomendación basado en filtros colaborativos y clasificación binaria para emails personalizados.', technologies: ['Python', 'Machine Learning'], category: 'machine-learning', featured: true },
    ],
    achievements: [],
    educationGpa: {},
    publications: [
      { title: 'Análisis de métodos y modelos de pronóstico de variables económicas aplicables al estudio del empleo y de las políticas y reformas laborales', year: 2024, url: 'http://bibliodigitalibd.senado.gob.mx/handle/123456789/6283' },
    ],
  },
  {
    uid: 'MnaN9sS6fveLPnD3ZJrJGMHtyEp1',
    name: 'Jennifer Itzel García',
    certifications: [
      { name: 'Diplomado en Infraestructura en Tecnologías de la Información', issuer: 'Facultad de Ingeniería UNAM', issueDate: new Date(2021, 0, 1), verified: false },
    ],
    projects: [],
    achievements: [
      { title: '1er Lugar - Primer Datathon en Ciencia de Datos IIMAS-UNAM', description: 'Primer lugar en el primer datathon de ciencia de datos organizado por IIMAS-UNAM.', category: 'technical', earnedAt: new Date(2020, 0, 1) },
    ],
    educationGpa: {},
  },
  {
    uid: 'Ogm3tyIM5GToz8GN9LNQ97DFPB23',
    name: 'Leonardo Damián Cázares',
    certifications: [],
    projects: [],
    achievements: [
      { title: 'Medalla Gabino Barreda - Highest GPA among all UNAM high schools', description: 'Awarded to the highest GPA among all UNAM preparatory high schools.', category: 'education', earnedAt: new Date(2020, 0, 1) },
      { title: 'Gold Medal - Physics Category, University Olympiad of Knowledge', description: 'Gold Medal in the Physics Category of the University Olympiad of Knowledge, organized by UNAM.', category: 'education', earnedAt: new Date(2017, 0, 1) },
      { title: 'Nominated for University Bachelor Talent Award in Scientific Research', description: 'Nominated by UNAM for the University Bachelor Talent Award in Scientific Research.', category: 'education', earnedAt: new Date(2018, 0, 1) },
      { title: 'Visiting Student Scholarship - Northeastern University', description: 'Visiting Student Scholarship awarded by the Network Science Institute at Northeastern University.', category: 'professional', earnedAt: new Date(2023, 0, 1) },
      { title: 'Research Initiation Scholarship - UNAM', description: 'Research Initiation Scholarship awarded by UNAM.', category: 'education', earnedAt: new Date(2023, 0, 1) },
      { title: '"Bécalos" Excellence Scholarship - UNAM', description: 'Excellence Scholarship awarded by UNAM, 2020-2022.', category: 'education', earnedAt: new Date(2020, 0, 1) },
    ],
    educationGpa: { 'BS Physics UNAM': 9.93, 'BS Data Science UNAM': 9.87 },
    publications: [
      { title: 'Delta-learning force fields: Nonbonded interactions and the length scale problem', year: 2024, url: null },
      { title: 'Symmetrized Pair-Relevance Coulomb Matrix Descriptor', year: 2024, url: null },
    ],
  },
  {
    uid: 'dx49Puu7AfPIoNkqriNM0pyRjKK2',
    name: 'Sofía Ixchel Michaelian',
    certifications: [],
    projects: [
      { title: 'Conductome - Predicting Human Behavior', description: 'Collaborated with UNAM Complexity Sciences Center. Implemented Naive Bayes model to predict students eating habits with 80%+ accuracy.', technologies: ['Python', 'Machine Learning', 'Naive Bayes'], category: 'research', featured: true },
      { title: 'Wind Farm Lightning Prediction', description: 'Improved lightning prediction in wind farms with UBC Weather Forecast Research Team. Improved prediction by 20% using random forests.', technologies: ['Python', 'Random Forest', 'WRF Model'], category: 'research', featured: true },
      { title: 'Symbolic Regression for Differential Equations', description: 'Applied symbolic regression with evolutionary algorithm, achieving less than 5% model error.', technologies: ['Python', 'Genetic Algorithms'], category: 'research', featured: false },
      { title: 'Mouse Lung Cell Classification', description: 'Genetic algorithm for variable selection, achieving 88% classification accuracy.', technologies: ['Python', 'Genetic Algorithms', 'Classification'], category: 'research', featured: false },
    ],
    achievements: [
      { title: 'Visiting Research Student - University of British Columbia', description: 'Research stay at UBC Weather Forecast Research Team, March-June 2023.', category: 'professional', earnedAt: new Date(2023, 3, 1) },
      { title: 'Summer of Scientific Research - Academia Mexicana de las Ciencias', description: 'Summer research program at Facultad de Ciencias UNAM Morelia, 2018.', category: 'education', earnedAt: new Date(2018, 6, 1) },
    ],
    educationGpa: {},
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('CV Enrichment Migration Script');
  console.log('==============================\n');

  if (isDryRun) {
    console.log('*** DRY RUN MODE - No changes will be written ***\n');
  }

  let updated = 0;
  let failed = 0;

  for (const member of MEMBERS) {
    const hasData =
      member.certifications.length > 0 ||
      member.projects.length > 0 ||
      member.achievements.length > 0 ||
      Object.keys(member.educationGpa).length > 0 ||
      member.publications?.length > 0;

    if (!hasData) {
      console.log(`  SKIP: ${member.name} (no enrichment data)`);
      continue;
    }

    const updates = {};

    // Certifications
    if (member.certifications.length > 0) {
      updates['portfolio.certifications'] = member.certifications.map((c, i) => ({
        id: `cv-cert-${i}-${Date.now()}`,
        name: c.name,
        issuer: c.issuer,
        issueDate: c.issueDate,
        verified: c.verified,
      }));
    }

    // Projects
    if (member.projects.length > 0) {
      updates['portfolio.projects'] = member.projects.map((p, i) => ({
        id: `cv-proj-${i}-${Date.now()}`,
        title: p.title,
        description: p.description,
        technologies: p.technologies,
        category: p.category,
        featured: p.featured,
        createdAt: new Date(),
      }));
    }

    // Achievements (awards, honors, scholarships)
    if (member.achievements.length > 0) {
      updates['portfolio.achievements'] = member.achievements.map((a, i) => ({
        id: `cv-award-${i}-${Date.now()}`,
        title: a.title,
        description: a.description,
        category: a.category,
        earnedAt: a.earnedAt,
      }));
    }

    // Update education entries with GPA if available
    if (Object.keys(member.educationGpa).length > 0) {
      // We need to read current education, update GPA, and write back
      try {
        const docSnap = await db.doc(`users/${member.uid}`).get();
        if (docSnap.exists) {
          const data = docSnap.data();
          const educationHistory = data.educationHistory || [];
          let modified = false;

          for (const edu of educationHistory) {
            for (const [key, gpa] of Object.entries(member.educationGpa)) {
              const matchesInstitution = edu.institution?.toLowerCase().includes(key.toLowerCase()) ||
                key.toLowerCase().includes(edu.institution?.toLowerCase() || '');
              const matchesDegree = edu.degree?.toLowerCase().includes(key.toLowerCase()) ||
                key.toLowerCase().includes(edu.degree?.toLowerCase() || '');

              if ((matchesInstitution || matchesDegree) && !edu.gpa) {
                edu.gpa = gpa;
                modified = true;
              }
            }
          }

          if (modified) {
            updates.educationHistory = educationHistory;
          }
        }
      } catch (err) {
        console.error(`  Error reading education for ${member.name}:`, err.message);
      }
    }

    updates.updatedAt = FieldValue.serverTimestamp();

    if (isDryRun) {
      const parts = [];
      if (updates['portfolio.certifications']) parts.push(`${updates['portfolio.certifications'].length} certs`);
      if (updates['portfolio.projects']) parts.push(`${updates['portfolio.projects'].length} projects`);
      if (updates['portfolio.achievements']) parts.push(`${updates['portfolio.achievements'].length} achievements`);
      if (updates.educationHistory) parts.push('GPA updates');
      console.log(`  DRY RUN - Would update: ${member.name} (${member.uid}) — ${parts.join(', ')}`);
    } else {
      try {
        await db.doc(`users/${member.uid}`).update(updates);
        console.log(`  UPDATED: ${member.name} (${member.uid})`);
        updated++;
      } catch (err) {
        console.error(`  FAILED: ${member.name} — ${err.message}`);
        failed++;
      }
    }
  }

  console.log(`\nSummary: ${updated} updated, ${failed} failed`);
  console.log('Enrichment complete!');
}

main().catch(console.error);
