#!/usr/bin/env node

/**
 * Migrate structured CV data into Firestore member profiles.
 *
 * This script:
 * 1. Creates new company docs (with pendingReview: true) for companies not yet in Firestore
 * 2. Updates 13 member profiles with bio, skills, experience, education, and languages
 *
 * Usage:
 *   node scripts/migrate-cv-data.mjs --dry-run     # Preview changes without writing
 *   node scripts/migrate-cv-data.mjs               # Execute migration
 *
 * Prerequisites:
 *   - Firebase CLI logged in (`firebase login`) or GOOGLE_APPLICATION_CREDENTIALS set
 *   - functions/node_modules installed (`npm --prefix functions install`)
 */

import { createRequire } from 'module';
import path from 'path';

// Resolve firebase-admin from functions/node_modules
const require = createRequire(path.resolve('functions/index.js'));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// --- Config ---
const PROJECT_ID = 'secid-org';
const isDryRun = process.argv.includes('--dry-run');

initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() });
const db = getFirestore();

// ---------------------------------------------------------------------------
// Existing companies already in Firestore (name -> docId)
// ---------------------------------------------------------------------------
const EXISTING_COMPANIES = {
  'UNAM': 'vI5VTNuPadfgvDmU13pz',
  'BBVA': 'hGDGpxAvFE7WlyCa6tqC',
  'Oracle': 'v7vRcNRiN5rttZOFBi9w',
  'NielsenIQ': 'KVaOwh3EF6BHGo3L4Pzt',
  'Zendesk': 'YlO5n1n7NBuuIK8iHfwD',
  'SAS Institute': 'AB4spJLRbFYkaurJOC4A',
  'Universal Pictures International': '1STxuuJbfS0oXz7cXtBr',
  'Algorithia': 'm43w69hXc6z6B8QhjufK',
  'XalDigital': 'a9MZ1mtvtDFzlLK4nkaA',
  'El puerto de Liverpool': 'VEdiw46eAFQje52ejcnn',
  'Datateam': 'tWe6vKmuVGrcRKPxpGRY',
  'Cognodata': 'LJKgHsynHbphAOnrW6zb',
  'Secretaria de Finanzas de la CDMX': 'nTSXp1pr2pYJ9mSWOjLV',
  'SAS INSTITUTE': 'AB4spJLRbFYkaurJOC4A',
};

// ---------------------------------------------------------------------------
// New companies to create
// ---------------------------------------------------------------------------
const NEW_COMPANIES = [
  { name: 'Bluetab Solutions', industry: 'Tecnología', location: 'Ciudad de México' },
  { name: 'Santander Bank', industry: 'Finanzas', location: 'Ciudad de México' },
  { name: 'PRGX Global', industry: 'Consultoría', location: 'Global' },
  { name: 'Alldatum', industry: 'Tecnología', location: 'Ciudad de México' },
  { name: 'Banco Azteca', industry: 'Finanzas', location: 'Ciudad de México' },
  { name: 'Consejo de la Judicatura Federal', industry: 'Gobierno', location: 'Ciudad de México' },
  { name: 'SEFIRA', industry: 'Tecnología', location: 'Ciudad de México' },
  { name: 'Tecnosim', industry: 'Tecnología', location: 'Ciudad de México' },
  { name: 'Klu', industry: 'Fintech', location: 'Ciudad de México' },
  { name: 'Tycho', industry: 'Tecnología', location: 'Ciudad de México' },
  { name: 'Finvivir', industry: 'Fintech', location: 'Ciudad de México' },
  { name: 'VinkOS', industry: 'Tecnología', location: 'Ciudad de México' },
  { name: 'Insaite', industry: 'Tecnología', location: 'Ciudad de México' },
  { name: 'Ingram Micro', industry: 'Tecnología', location: 'Global' },
  { name: 'Quarksoft', industry: 'Tecnología', location: 'Ciudad de México' },
  { name: 'GFT', industry: 'Tecnología', location: 'Global' },
  { name: 'Intekglobal', industry: 'Tecnología', location: 'Tijuana' },
  { name: 'Grupo Salinas', industry: 'Conglomerado', location: 'Ciudad de México' },
  { name: 'Instituto Belisario Domínguez', industry: 'Gobierno', location: 'Ciudad de México' },
  { name: 'Unifin', industry: 'Finanzas', location: 'Ciudad de México' },
  { name: 'Harvard University', industry: 'Educación', location: 'Massachusetts, USA' },
  { name: 'Northeastern University', industry: 'Educación', location: 'Massachusetts, USA' },
  { name: 'MIT', industry: 'Educación', location: 'Massachusetts, USA' },
  { name: 'ITAM', industry: 'Educación', location: 'Ciudad de México' },
];

// ---------------------------------------------------------------------------
// Helper: build a unique ID for experience/education entries
// ---------------------------------------------------------------------------
let idCounter = 0;
function makeId(prefix, label) {
  idCounter += 1;
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `cv-${prefix}-${slug}-${idCounter}`;
}

// ---------------------------------------------------------------------------
// Member data
// ---------------------------------------------------------------------------
function buildMembers(companyIds) {
  return [
    // -----------------------------------------------------------------------
    // 1. Sofía Ixchel Michaelian
    // -----------------------------------------------------------------------
    {
      uid: 'dx49Puu7AfPIoNkqriNM0pyRjKK2',
      name: 'Sofía Ixchel Michaelian',
      bio: "Data Analyst with a background in Physics and a Master's in Computer Science. Experienced in data analysis, machine learning, predictive modeling, and data visualization with Power BI. Research experience in wind farm lightning prediction and genetic algorithms.",
      location: 'Ciudad de México',
      skills: ['Python', 'PyTorch', 'Pandas', 'SQL', 'Java', 'C++', 'Power BI', 'MATLAB', 'LaTeX', 'ELT', 'GitHub', 'Google Cloud'],
      languages: [
        { name: 'Español', proficiency: 'Nativo' },
        { name: 'Inglés', proficiency: 'Fluido' },
        { name: 'Alemán', proficiency: 'B1' },
      ],
      githubUrl: '',
      experience: [
        {
          company: 'UNAM',
          companyId: companyIds['UNAM'] || null,
          position: 'Data Analyst - Coord. de Proyectos Tecnológicos',
          startDate: new Date(2024, 1, 1),
          endDate: null,
          current: true,
          description: 'Data analysis and visualization for institutional technology projects.',
          technologies: ['Python', 'Power BI', 'APIs'],
        },
        {
          company: 'UNAM',
          companyId: companyIds['UNAM'] || null,
          position: 'Assistant Professor - Facultad de Ciencias',
          startDate: new Date(2019, 0, 1),
          endDate: new Date(2023, 11, 1),
          current: false,
          description: 'Teaching assistant in Physics and Mathematics courses.',
          technologies: [],
        },
      ],
      education: [
        {
          institution: 'IIMAS UNAM',
          degree: "Master's in Computer Science and Engineering",
          fieldOfStudy: 'Computer Science',
          startDate: new Date(2021, 7, 1),
          endDate: new Date(2024, 5, 1),
          current: false,
          gpa: null,
          description: 'Research on wind farm lightning prediction and genetic algorithms.',
        },
        {
          institution: 'Facultad de Ciencias UNAM',
          degree: "Bachelor's in Physics",
          fieldOfStudy: 'Physics',
          startDate: new Date(2014, 7, 1),
          endDate: new Date(2021, 5, 1),
          current: false,
          gpa: null,
          description: '',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 2. Sara Kenia Cisneros
    // -----------------------------------------------------------------------
    {
      uid: 'u0ZxS9DmhdSnQxeiNswAiFuu2273',
      name: 'Sara Kenia Cisneros',
      bio: 'Data scientist with Actuary background. Experience in predictive modeling with machine learning, deep learning, NLP, big data, data quality and BI. Specialized in breast cancer prediction research.',
      location: 'Guadalajara',
      skills: ['Python', 'Spark', 'R', 'Java', 'Julia', 'Azure', 'AWS', 'SQL', 'PostgreSQL', 'MySQL', 'Neo4j', 'Cassandra', 'NLP', 'Machine Learning', 'Deep Learning'],
      languages: [
        { name: 'Español', proficiency: 'Nativo' },
        { name: 'Inglés', proficiency: 'B1' },
      ],
      githubUrl: 'https://github.com/keniaCisneros',
      experience: [
        {
          company: 'Universal Pictures International',
          companyId: companyIds['Universal Pictures International'] || null,
          position: 'Business Intelligence Specialist',
          startDate: new Date(2023, 6, 1),
          endDate: null,
          current: true,
          description: 'Business intelligence analysis and reporting for international operations.',
          technologies: [],
        },
        {
          company: 'Consejo de la Judicatura Federal',
          companyId: companyIds['Consejo de la Judicatura Federal'] || null,
          position: 'Data Scientist',
          startDate: new Date(2021, 9, 1),
          endDate: new Date(2023, 5, 1),
          current: false,
          description: 'NLP and ML models for judicial data analysis.',
          technologies: ['Python', 'NLP', 'Machine Learning'],
        },
        {
          company: 'SEFIRA',
          companyId: companyIds['SEFIRA'] || null,
          position: 'Jr. Data Scientist',
          startDate: new Date(2021, 7, 1),
          endDate: new Date(2021, 8, 1),
          current: false,
          description: 'Machine learning model development.',
          technologies: ['Machine Learning'],
        },
        {
          company: 'UNAM',
          companyId: companyIds['UNAM'] || null,
          position: 'Data Scientist IIMAS',
          startDate: new Date(2020, 7, 1),
          endDate: new Date(2021, 9, 1),
          current: false,
          description: 'Research in predictive modeling and breast cancer prediction.',
          technologies: ['Python', 'Machine Learning'],
        },
      ],
      education: [
        {
          institution: 'IIMAS UNAM',
          degree: "Bachelor's in Data Science",
          fieldOfStudy: 'Ciencia de Datos',
          startDate: new Date(2018, 7, 1),
          endDate: new Date(2022, 5, 1),
          current: false,
          gpa: null,
          description: '',
        },
        {
          institution: 'Facultad de Ciencias UNAM',
          degree: 'Actuary (4 semesters completed)',
          fieldOfStudy: 'Actuaría',
          startDate: new Date(2016, 7, 1),
          endDate: new Date(2018, 5, 1),
          current: false,
          gpa: null,
          description: 'Completed four semesters before transferring to Data Science.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 3. José Marcos Yáñez
    // -----------------------------------------------------------------------
    {
      uid: 'UqZVhzx6TwalNlz3NDVTKPlNtjI2',
      name: 'José Marcos Yáñez',
      bio: 'Data Engineer with experience in Big Data, ETL pipelines, ML model productionization, and data governance. Strong background in Spark/Scala, Python/PySpark, and AWS services.',
      location: 'Ciudad de México',
      skills: ['Python', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'PySpark', 'R', 'Java', 'Git', 'Scala', 'Spark', 'AWS', 'Jenkins', 'PostgreSQL', 'MySQL', 'MongoDB', 'Cassandra', 'Redis', 'Neo4j', 'Power BI'],
      languages: [
        { name: 'Español', proficiency: 'Nativo' },
        { name: 'Inglés', proficiency: 'B2' },
      ],
      githubUrl: 'https://github.com/myespindola',
      experience: [
        {
          company: 'BBVA',
          companyId: companyIds['BBVA'] || null,
          position: 'Data Cross Expert',
          startDate: new Date(2023, 9, 1),
          endDate: null,
          current: true,
          description: 'Big Data engineering with Spark/Scala and AWS services for cross-functional data initiatives.',
          technologies: ['Spark', 'Scala', 'PySpark', 'AWS', 'EMR', 'S3', 'SageMaker'],
        },
        {
          company: 'Bluetab Solutions',
          companyId: companyIds['Bluetab Solutions'] || null,
          position: 'Big Data Engineer',
          startDate: new Date(2022, 7, 1),
          endDate: new Date(2023, 9, 1),
          current: false,
          description: 'ETL pipeline development and data governance with Spark/Scala.',
          technologies: ['Spark', 'Scala', 'PySpark', 'DevOps'],
        },
        {
          company: 'UNAM',
          companyId: companyIds['UNAM'] || null,
          position: 'Data Science Internship - Instituto de Investigaciones Económicas',
          startDate: new Date(2021, 11, 1),
          endDate: new Date(2022, 6, 1),
          current: false,
          description: 'Data analysis and ML modeling for economic research projects.',
          technologies: ['Python', 'Power BI', 'Machine Learning'],
        },
      ],
      education: [
        {
          institution: 'IIMAS UNAM',
          degree: 'Bachelor of Data Science',
          fieldOfStudy: 'Ciencia de Datos',
          startDate: new Date(2018, 7, 1),
          endDate: new Date(2022, 5, 1),
          current: false,
          gpa: 9.6,
          description: '',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 4. Fernando Raúl Garay
    // -----------------------------------------------------------------------
    {
      uid: 'Rdn0RfG4TVckdt6AXw8XPTp7tV42',
      name: 'Fernando Raúl Garay',
      bio: 'Growth Marketing Specialist with a Mathematics background. Experience as Python developer, data consultant, and teaching assistant. Skilled in web development, data analysis, and software engineering.',
      location: 'Ciudad de México',
      skills: ['Python', 'SQL', 'Java', 'JavaScript', 'Flask', 'Spring', 'Git', 'Linux', 'Docker', 'Postman', 'BS4'],
      languages: [
        { name: 'Español', proficiency: 'Nativo' },
        { name: 'Inglés', proficiency: 'Avanzado' },
      ],
      githubUrl: 'https://github.com/frgaray',
      experience: [
        {
          company: 'Zendesk',
          companyId: companyIds['Zendesk'] || null,
          position: 'Growth Marketing Specialist',
          startDate: new Date(2024, 0, 1),
          endDate: null,
          current: true,
          description: 'Growth marketing strategy and execution.',
          technologies: [],
        },
        {
          company: 'Alldatum',
          companyId: companyIds['Alldatum'] || null,
          position: 'Python Developer',
          startDate: new Date(2023, 0, 1),
          endDate: new Date(2023, 5, 1),
          current: false,
          description: 'Backend development with Python, REST APIs, and database integration.',
          technologies: ['Python', 'REST APIs', 'Databases'],
        },
        {
          company: 'Alldatum',
          companyId: companyIds['Alldatum'] || null,
          position: 'Data Consultant',
          startDate: new Date(2023, 6, 1),
          endDate: new Date(2023, 11, 1),
          current: false,
          description: 'Data consulting and analysis.',
          technologies: [],
        },
        {
          company: 'UNAM',
          companyId: companyIds['UNAM'] || null,
          position: 'Teaching Assistant',
          startDate: new Date(2024, 0, 1),
          endDate: new Date(2024, 5, 1),
          current: false,
          description: 'Teaching assistant for Mathematics courses.',
          technologies: [],
        },
      ],
      education: [
        {
          institution: 'UNAM Facultad de Ciencias',
          degree: "Bachelor's in Mathematics",
          fieldOfStudy: 'Matemáticas',
          startDate: new Date(2019, 7, 1),
          endDate: new Date(2024, 6, 1),
          current: false,
          gpa: 9.75,
          description: '',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 5. Misael López Sánchez
    // -----------------------------------------------------------------------
    {
      uid: 'Wamn9LLkpHbPQZQX6RubZPA7FGG3',
      name: 'Misael López Sánchez',
      bio: 'Mathematician and Actuary passionate about data science, data mining, business intelligence, and cloud technologies. Senior consultant with SAS expertise and multilingual skills.',
      location: 'Cuautitlán, Estado de México',
      skills: ['Python', 'R', 'Scala', 'Java', 'SAS', 'SAS Viya', 'Azure', 'GCP', 'AWS', 'Spark', 'SQL', 'NoSQL', 'Power BI', 'Tableau', 'Git', 'Jira', 'Hadoop', 'Cloudera', 'Databricks'],
      languages: [
        { name: 'Español', proficiency: 'Nativo' },
        { name: 'Inglés', proficiency: 'IELTS 6' },
        { name: 'Ruso', proficiency: 'Certificación TBU' },
        { name: 'Chino', proficiency: 'HSK4' },
      ],
      githubUrl: '',
      experience: [
        {
          company: 'SAS Institute',
          companyId: companyIds['SAS Institute'] || null,
          position: 'Sr. Associate Analytical Consultant',
          startDate: new Date(2021, 2, 1),
          endDate: null,
          current: true,
          description: 'Senior consulting with SAS Viya, Visual Analytics, ML, and BI solutions.',
          technologies: ['SAS Viya', 'SAS Visual Analytics', 'ML', 'BI'],
        },
        {
          company: 'Banco Azteca',
          companyId: companyIds['Banco Azteca'] || null,
          position: 'Sr. Analytical Consultant',
          startDate: new Date(2020, 10, 1),
          endDate: new Date(2021, 2, 1),
          current: false,
          description: 'Analytical consulting with Spark, Python, and cloud platforms.',
          technologies: ['Spark', 'Python', 'Databricks', 'Cloudera'],
        },
        {
          company: 'Bluetab Solutions',
          companyId: companyIds['Bluetab Solutions'] || null,
          position: 'Technician Consultant (IBM)',
          startDate: new Date(2021, 2, 1),
          endDate: new Date(2021, 10, 1),
          current: false,
          description: 'Technical consulting with SCRUM and DATIO methodology.',
          technologies: ['SCRUM', 'DATIO'],
        },
      ],
      education: [
        {
          institution: 'Facultad de Ciencias UNAM',
          degree: 'Licenciatura en Actuaría',
          fieldOfStudy: 'Actuaría',
          startDate: new Date(2016, 7, 1),
          endDate: new Date(2020, 4, 1),
          current: false,
          gpa: null,
          description: '',
        },
        {
          institution: 'Facultad de Ciencias UNAM',
          degree: 'Licenciatura en Matemáticas',
          fieldOfStudy: 'Matemáticas',
          startDate: new Date(2019, 7, 1),
          endDate: new Date(2021, 0, 1),
          current: false,
          gpa: null,
          description: '',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 6. Rodrigo Alan García
    // -----------------------------------------------------------------------
    {
      uid: 'TWVkrEKswJO7Y2UhaheSqVgURKt2',
      name: 'Rodrigo Alan García',
      bio: "Data Scientist with a background in Computer Engineering, pursuing a Master's in Data Science at ITAM. Experience in data analysis, ETL pipelines, infrastructure monitoring, and automation. Bilingual Spanish/English.",
      location: 'Ciudad de México',
      skills: ['Python', 'R', 'SQL', 'Machine Learning', 'Big Data', 'Time Series', 'Data Visualization', 'Statistical Analysis'],
      languages: [
        { name: 'Español', proficiency: 'Nativo' },
        { name: 'Inglés', proficiency: 'Nativo/Bilingüe' },
        { name: 'Alemán', proficiency: 'Básico' },
      ],
      githubUrl: 'https://github.com/ROrodrigp',
      experience: [
        {
          company: 'Oracle',
          companyId: companyIds['Oracle'] || null,
          position: 'Site Reliability Engineer',
          startDate: new Date(2022, 0, 1),
          endDate: null,
          current: true,
          description: 'Infrastructure monitoring, dashboards, and automation using Python.',
          technologies: ['Python', 'Monitoring', 'Dashboards'],
        },
        {
          company: 'Santander Bank',
          companyId: companyIds['Santander Bank'] || null,
          position: 'Intern',
          startDate: new Date(2021, 7, 1),
          endDate: new Date(2022, 0, 1),
          current: false,
          description: 'Data analysis with SQL Server and Excel.',
          technologies: ['SQL Server', 'Excel'],
        },
      ],
      education: [
        {
          institution: 'ITAM',
          degree: 'Master of Science in Data Science',
          fieldOfStudy: 'Data Science',
          startDate: new Date(2024, 7, 1),
          endDate: new Date(2026, 4, 1),
          current: true,
          gpa: null,
          description: 'Expected May 2026.',
        },
        {
          institution: 'UNAM',
          degree: 'Bachelor of Science in Computer Engineering',
          fieldOfStudy: 'Computer Engineering',
          startDate: new Date(2017, 7, 1),
          endDate: new Date(2021, 4, 1),
          current: false,
          gpa: null,
          description: '',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 7. Héctor Moisés Pech
    // -----------------------------------------------------------------------
    {
      uid: 'tdjB2mOZa1Wi5fTBf9NxR7apbMo2',
      name: 'Héctor Moisés Pech',
      bio: 'Data scientist and database developer with a strong aptitude for data analysis, visualization, and machine learning. Dual degree in Physics and Data Science with experience in NLP, Big Data, and statistical modeling.',
      location: 'Ciudad de México',
      skills: ['Python', 'R', 'SQL', 'Julia', 'Java', 'C++', 'MySQL', 'PostgreSQL', 'SQL Server', 'MongoDB', 'Cassandra', 'Neo4j', 'Riak', 'Pandas', 'NumPy', 'TensorFlow', 'Scikit-learn', 'PySpark', 'Keras', 'PyTorch', 'Power BI', 'Tableau', 'Qlik Sense', 'NLP', 'Machine Learning', 'Deep Learning'],
      languages: [
        { name: 'Español', proficiency: 'Nativo' },
        { name: 'Inglés', proficiency: 'C1' },
        { name: 'Alemán', proficiency: 'B1' },
      ],
      githubUrl: '',
      experience: [
        {
          company: 'NielsenIQ',
          companyId: companyIds['NielsenIQ'] || null,
          position: 'Statistician Data Scientist Jr',
          startDate: new Date(2023, 7, 1),
          endDate: null,
          current: true,
          description: 'Machine learning and statistical modeling for market research.',
          technologies: ['Machine Learning', 'Python'],
        },
        {
          company: 'PRGX Global',
          companyId: companyIds['PRGX Global'] || null,
          position: 'Audit Services Jr',
          startDate: new Date(2022, 7, 1),
          endDate: new Date(2023, 4, 1),
          current: false,
          description: 'Audit automation with SQL, Python, and AI.',
          technologies: ['SQL', 'Python', 'AI'],
        },
      ],
      education: [
        {
          institution: 'UNAM',
          degree: 'B.Sc. in Physics',
          fieldOfStudy: 'Física',
          startDate: new Date(2019, 7, 1),
          endDate: null,
          current: true,
          gpa: null,
          description: 'Degree pending.',
        },
        {
          institution: 'UNAM',
          degree: 'B.Sc. in Data Science',
          fieldOfStudy: 'Ciencia de Datos',
          startDate: new Date(2022, 7, 1),
          endDate: null,
          current: true,
          gpa: null,
          description: '',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 8. Ingrid Pamela Ruíz
    // -----------------------------------------------------------------------
    {
      uid: 'By4a9q8ACHQwWFOYtGAxZJ0WHwc2',
      name: 'Ingrid Pamela Ruíz',
      bio: 'Actuaria y Científica de Datos con casi 3 años de experiencia en análisis de datos, construcción de modelos de ML y consultoría. Apasionada de la ciencia, las matemáticas y resolver problemas de gran impacto.',
      location: 'Ciudad de México',
      skills: ['Python', 'R', 'Spark', 'Julia', 'SAS', 'Java', 'JavaScript', 'SQL', 'PostgreSQL', 'MySQL', 'Docker', 'MongoDB', 'Cassandra', 'Redis', 'Neo4j', 'Git', 'HTML', 'Bootstrap', 'Power BI', 'Tableau', 'Data Studio', 'Qlik'],
      languages: [
        { name: 'Español', proficiency: 'Nativo' },
        { name: 'Inglés', proficiency: 'B2' },
      ],
      githubUrl: 'https://github.com/Pamela-ruiz9',
      experience: [
        {
          company: 'BBVA',
          companyId: companyIds['BBVA'] || null,
          position: 'Científica de datos',
          startDate: new Date(2023, 0, 1),
          endDate: null,
          current: true,
          description: 'Data science and ML model development for banking.',
          technologies: [],
        },
        {
          company: 'Algorithia',
          companyId: companyIds['Algorithia'] || null,
          position: 'Consultora en ciencia de datos',
          startDate: new Date(2022, 0, 1),
          endDate: new Date(2023, 0, 1),
          current: false,
          description: 'Data science consulting with ML and ETL pipelines.',
          technologies: ['Python', 'Machine Learning', 'ETL'],
        },
        {
          company: 'Tecnosim',
          companyId: companyIds['Tecnosim'] || null,
          position: 'Encargada del área estadística',
          startDate: new Date(2018, 0, 1),
          endDate: new Date(2021, 11, 1),
          current: false,
          description: 'Statistical analysis, Power BI dashboards, and CRM management.',
          technologies: ['Power BI', 'CRM'],
        },
        {
          company: 'UNAM',
          companyId: companyIds['UNAM'] || null,
          position: 'Profesora asistente - Facultad de Ciencias',
          startDate: new Date(2020, 0, 1),
          endDate: new Date(2021, 11, 1),
          current: false,
          description: 'Teaching assistant in Mathematics and Statistics courses.',
          technologies: [],
        },
      ],
      education: [
        {
          institution: 'UNAM FCA',
          degree: 'Diplomado en finanzas',
          fieldOfStudy: 'Finanzas',
          startDate: new Date(2022, 7, 1),
          endDate: null,
          current: true,
          gpa: null,
          description: '',
        },
        {
          institution: 'IIMAS UNAM',
          degree: 'Licenciatura en Ciencia de Datos',
          fieldOfStudy: 'Ciencia de Datos',
          startDate: new Date(2020, 7, 1),
          endDate: new Date(2022, 5, 1),
          current: false,
          gpa: null,
          description: '',
        },
        {
          institution: 'Facultad de Ciencias UNAM',
          degree: 'Licenciatura en Actuaría',
          fieldOfStudy: 'Actuaría',
          startDate: new Date(2017, 7, 1),
          endDate: new Date(2021, 5, 1),
          current: false,
          gpa: null,
          description: '',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 9. Yaotzin Velázquez
    // -----------------------------------------------------------------------
    {
      uid: 'UpV4skFQQSVUEPpRLCrwtbdu7Qh2',
      name: 'Yaotzin Velázquez',
      bio: 'Data and backend lead with experience as team coordinator for data and software development. Understanding of Big Data, ML, cloud architecture, B2B projects, quality assurance, and business requirements analysis.',
      location: 'Ciudad de México',
      skills: ['Python', 'Java', 'Node.js', 'Django', 'Flask', 'Selenium', 'PostgreSQL', 'MySQL', 'Linux', 'Docker', 'AWS', 'PySpark', 'Kafka', 'MongoDB', 'Redis', 'Elasticsearch', 'Kibana', 'Tableau', 'Airflow', 'Serverless Framework'],
      languages: [
        { name: 'Español', proficiency: 'Nativo' },
        { name: 'Inglés', proficiency: 'B1' },
      ],
      githubUrl: '',
      experience: [
        {
          company: 'XalDigital',
          companyId: companyIds['XalDigital'] || null,
          position: 'Sr Data Engineer',
          startDate: new Date(2023, 2, 1),
          endDate: null,
          current: true,
          description: 'Senior data engineering and pipeline development.',
          technologies: [],
        },
        {
          company: 'Klu',
          companyId: companyIds['Klu'] || null,
          position: 'Data Technical Lead',
          startDate: new Date(2022, 10, 1),
          endDate: new Date(2023, 1, 1),
          current: false,
          description: 'Data governance, cloud architecture, and streaming pipelines.',
          technologies: ['Data Governance', 'Cloud', 'Streaming'],
        },
        {
          company: 'Finvivir',
          companyId: companyIds['Finvivir'] || null,
          position: 'Big Data Engineer',
          startDate: new Date(2021, 9, 1),
          endDate: new Date(2022, 9, 1),
          current: false,
          description: 'AWS data lake and BI infrastructure development.',
          technologies: ['AWS', 'Data Lake', 'BI'],
        },
        {
          company: 'Tycho',
          companyId: companyIds['Tycho'] || null,
          position: 'Data Technical Lead',
          startDate: new Date(2021, 2, 1),
          endDate: new Date(2021, 9, 1),
          current: false,
          description: 'Web scraping, BI, and data pipeline development.',
          technologies: ['Web Scraping', 'BI', 'Data Pipeline'],
        },
        {
          company: 'UNAM',
          companyId: companyIds['UNAM'] || null,
          position: 'Data Technical Lead - IIMAS',
          startDate: new Date(2020, 3, 1),
          endDate: new Date(2020, 6, 1),
          current: false,
          description: 'Data technical leadership at IIMAS UNAM.',
          technologies: [],
        },
        {
          company: 'VinkOS',
          companyId: companyIds['VinkOS'] || null,
          position: 'Big Data Engineer',
          startDate: new Date(2020, 5, 1),
          endDate: new Date(2021, 0, 1),
          current: false,
          description: 'ETL pipelines with Pentaho and Java.',
          technologies: ['Pentaho', 'Java', 'ETL'],
        },
        {
          company: 'Insaite',
          companyId: companyIds['Insaite'] || null,
          position: 'Big Data Engineer',
          startDate: new Date(2020, 0, 1),
          endDate: new Date(2020, 2, 1),
          current: false,
          description: 'AutoML and streaming data infrastructure.',
          technologies: ['AutoML', 'Streaming'],
        },
        {
          company: 'Ingram Micro',
          companyId: companyIds['Ingram Micro'] || null,
          position: 'Presales Cloud Specialist',
          startDate: new Date(2018, 10, 1),
          endDate: new Date(2019, 10, 1),
          current: false,
          description: 'Cloud presales and B2B project support.',
          technologies: ['Cloud', 'B2B'],
        },
        {
          company: 'Quarksoft',
          companyId: companyIds['Quarksoft'] || null,
          position: 'Backend & Data Lead',
          startDate: new Date(2017, 2, 1),
          endDate: new Date(2018, 10, 1),
          current: false,
          description: '.NET development, UML design, and QA coordination.',
          technologies: ['.NET', 'UML', 'QA'],
        },
        {
          company: 'GFT',
          companyId: companyIds['GFT'] || null,
          position: 'SW Quality Coordinator',
          startDate: new Date(2016, 0, 1),
          endDate: new Date(2017, 1, 1),
          current: false,
          description: 'Software quality coordination with Linux, Python, Jenkins, and CI/CD.',
          technologies: ['Linux', 'Python', 'Jenkins', 'Java', 'CI/CD'],
        },
      ],
      education: [
        {
          institution: 'UNAM FES Acatlán',
          degree: 'Data Science',
          fieldOfStudy: 'Ciencia de Datos',
          startDate: new Date(2019, 7, 1),
          endDate: new Date(2021, 5, 1),
          current: false,
          gpa: null,
          description: '',
        },
        {
          institution: 'UNAM Facultad de Ingeniería',
          degree: 'Computer Engineering',
          fieldOfStudy: 'Ingeniería en Computación',
          startDate: new Date(2011, 7, 1),
          endDate: new Date(2016, 5, 1),
          current: false,
          gpa: null,
          description: '',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 10. Fernando Avitúa
    // -----------------------------------------------------------------------
    {
      uid: 'Rf0XB6eLYcgYEf76z2W70wxGMJo2',
      name: 'Fernando Avitúa',
      bio: 'Científico de Datos y Maestro en Física. Capacidad de abstraer problemas hacia formulaciones matemáticas. Experiencia en modelos de ML, series de tiempo, MLFlow, y desarrollo de soluciones analíticas para negocios financieros.',
      location: 'Ciudad de México',
      skills: ['Python', 'R', 'SQL', 'JavaScript', 'Node.js', 'HTML/CSS', 'NumPy', 'Pandas', 'Scikit-learn', 'PyTorch', 'TensorFlow', 'MLFlow', 'Networkx', 'Statsmodels', 'PySpark', 'Seaborn', 'Power BI', 'Knime', 'Linux', 'Git'],
      languages: [
        { name: 'Español', proficiency: 'Nativo' },
        { name: 'Inglés', proficiency: 'C1' },
      ],
      githubUrl: 'https://github.com/linear-regret',
      experience: [
        {
          company: 'El puerto de Liverpool',
          companyId: companyIds['El puerto de Liverpool'] || null,
          position: 'Coordinador de Ciencia de Datos',
          startDate: new Date(2024, 5, 1),
          endDate: null,
          current: true,
          description: 'Data science coordination and analytical solutions development.',
          technologies: [],
        },
        {
          company: 'Grupo Salinas',
          companyId: companyIds['Grupo Salinas'] || null,
          position: 'Consultor en IA',
          startDate: new Date(2023, 11, 1),
          endDate: new Date(2024, 4, 1),
          current: false,
          description: 'AI consulting with ML, MLFlow, and time series analysis for financial businesses.',
          technologies: ['ML', 'MLFlow', 'Time Series'],
        },
        {
          company: 'UNAM',
          companyId: companyIds['UNAM'] || null,
          position: 'Ayudante de profesor - Facultad de Ciencias',
          startDate: new Date(2023, 0, 1),
          endDate: new Date(2024, 0, 1),
          current: false,
          description: 'Teaching assistant.',
          technologies: [],
        },
        {
          company: 'UNAM',
          companyId: companyIds['UNAM'] || null,
          position: 'Líder de datos - CUAIEED',
          startDate: new Date(2022, 0, 1),
          endDate: new Date(2023, 0, 1),
          current: false,
          description: 'Data leadership and ML model development for educational analytics.',
          technologies: ['Machine Learning'],
        },
        {
          company: 'Intekglobal',
          companyId: companyIds['Intekglobal'] || null,
          position: 'Trainee de desarrollo web',
          startDate: new Date(2019, 0, 1),
          endDate: new Date(2020, 0, 1),
          current: false,
          description: 'Web development trainee.',
          technologies: ['Web Development'],
        },
      ],
      education: [
        {
          institution: 'IIMAS UNAM',
          degree: 'Licenciatura en Ciencia de Datos',
          fieldOfStudy: 'Ciencia de Datos',
          startDate: new Date(2021, 7, 1),
          endDate: new Date(2023, 5, 1),
          current: false,
          gpa: null,
          description: '',
        },
        {
          institution: 'Facultad de Ciencias UNAM',
          degree: 'Licenciatura y Maestría en Física',
          fieldOfStudy: 'Física',
          startDate: new Date(2011, 7, 1),
          endDate: new Date(2019, 5, 1),
          current: false,
          gpa: null,
          description: '',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 11. Santiago Licea
    // -----------------------------------------------------------------------
    {
      uid: 'AiED4e6buhZxeDgtqhaeOJpGq6C3',
      name: 'Santiago Licea',
      bio: 'Científico de datos con especial interés en la economía y las finanzas. Experiencia en consultoría de datos, dashboards, sistemas de recomendación y análisis económico.',
      location: 'Ciudad de México',
      skills: ['Python', 'Tableau', 'Dataiku', 'Machine Learning'],
      languages: [
        { name: 'Español', proficiency: 'Nativo' },
        { name: 'Inglés', proficiency: 'C1' },
      ],
      githubUrl: 'https://github.com/Slicea10',
      experience: [
        {
          company: 'Datateam',
          companyId: companyIds['Datateam'] || null,
          position: 'Científico de datos',
          startDate: new Date(2023, 6, 1),
          endDate: null,
          current: true,
          description: 'Data science consulting with Tableau and Python.',
          technologies: ['Tableau', 'Python'],
        },
        {
          company: 'Instituto Belisario Domínguez',
          companyId: companyIds['Instituto Belisario Domínguez'] || null,
          position: 'Asistente de investigación',
          startDate: new Date(2022, 5, 1),
          endDate: new Date(2023, 5, 1),
          current: false,
          description: 'Economic analysis and research support at the Senate institute.',
          technologies: [],
        },
      ],
      education: [
        {
          institution: 'IIMAS UNAM',
          degree: 'Licenciatura en Ciencia de Datos',
          fieldOfStudy: 'Ciencia de Datos',
          startDate: new Date(2020, 7, 1),
          endDate: new Date(2024, 5, 1),
          current: false,
          gpa: null,
          description: '',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 12. Jennifer Itzel García
    // -----------------------------------------------------------------------
    {
      uid: 'MnaN9sS6fveLPnD3ZJrJGMHtyEp1',
      name: 'Jennifer Itzel García',
      bio: 'Actuaria y Científica de Datos de la primera generación. Experiencia en Credit Scoring, modelado con grafos, y consultoría de datos. Conocimientos en Matemáticas avanzadas, Estadística, Machine Learning y visualización de datos.',
      location: 'Naucalpan, Estado de México',
      skills: ['Python', 'SQL', 'NoSQL', 'MongoDB', 'Neo4j', 'Tableau', 'Data Studio', 'Linux'],
      languages: [
        { name: 'Español', proficiency: 'Nativo' },
        { name: 'Inglés', proficiency: 'B2' },
      ],
      githubUrl: '',
      experience: [
        {
          company: 'Cognodata',
          companyId: companyIds['Cognodata'] || null,
          position: 'Data Scientist Consultor',
          startDate: new Date(2023, 9, 1),
          endDate: null,
          current: true,
          description: 'CLTV analysis and graph-based modeling for consulting projects.',
          technologies: ['CLTV', 'Grafos'],
        },
        {
          company: 'Unifin',
          companyId: companyIds['Unifin'] || null,
          position: 'Data Scientist',
          startDate: new Date(2021, 5, 1),
          endDate: new Date(2023, 8, 1),
          current: false,
          description: 'Credit scoring and graph-based modeling for financial services.',
          technologies: ['Credit Scoring', 'Grafos'],
        },
        {
          company: 'Insaite',
          companyId: companyIds['Insaite'] || null,
          position: 'Data Scientist Trainee',
          startDate: new Date(2020, 5, 1),
          endDate: new Date(2021, 5, 1),
          current: false,
          description: 'Credit scoring models and web scraping automation.',
          technologies: ['Credit Scoring', 'Web Scraping'],
        },
        {
          company: 'UNAM',
          companyId: companyIds['UNAM'] || null,
          position: 'Asesora de matemáticas - FES Acatlán',
          startDate: new Date(2020, 1, 1),
          endDate: new Date(2020, 11, 1),
          current: false,
          description: 'Mathematics tutoring at FES Acatlán.',
          technologies: [],
        },
      ],
      education: [
        {
          institution: 'IIMAS UNAM',
          degree: 'Licenciatura en Ciencia de Datos',
          fieldOfStudy: 'Ciencia de Datos',
          startDate: new Date(2019, 7, 1),
          endDate: new Date(2021, 5, 1),
          current: false,
          gpa: null,
          description: '',
        },
        {
          institution: 'FES Acatlán UNAM',
          degree: 'Licenciatura en Actuaría',
          fieldOfStudy: 'Actuaría',
          startDate: new Date(2016, 7, 1),
          endDate: new Date(2020, 5, 1),
          current: false,
          gpa: null,
          description: '',
        },
        {
          institution: 'Facultad de Ingeniería UNAM',
          degree: 'Diplomado en Infraestructura TI',
          fieldOfStudy: 'Infraestructura TI',
          startDate: new Date(2021, 0, 1),
          endDate: new Date(2021, 11, 1),
          current: false,
          gpa: null,
          description: '',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 13. Leonardo Damián Cázares
    // -----------------------------------------------------------------------
    {
      uid: 'Ogm3tyIM5GToz8GN9LNQ97DFPB23',
      name: 'Leonardo Damián Cázares',
      bio: "Data Scientist and Physicist with dual BSc from UNAM. Research experience at Harvard, MIT, and Northeastern University in ML for health, molecular simulations, and epidemiological forecasting. Publications in peer-reviewed journals.",
      location: 'Ciudad de México',
      skills: ['Python', 'PyTorch', 'TensorFlow', 'JAX', 'PySpark', 'Pandas', 'NumPy', 'Scikit-learn', 'Julia', 'R', 'MATLAB', 'SQL', 'MongoDB', 'Cassandra', 'Neo4j', 'Git', 'C'],
      languages: [
        { name: 'Español', proficiency: 'Nativo' },
        { name: 'Inglés', proficiency: 'IELTS 6.5' },
      ],
      githubUrl: '',
      experience: [
        {
          company: 'Secretaria de Finanzas de la CDMX',
          companyId: companyIds['Secretaria de Finanzas de la CDMX'] || null,
          position: 'Lead Data Scientist',
          startDate: new Date(2024, 0, 1),
          endDate: null,
          current: true,
          description: 'Data science leadership for government finance analytics.',
          technologies: [],
        },
        {
          company: 'Harvard University',
          companyId: companyIds['Harvard University'] || null,
          position: 'Undergraduate Research Assistant',
          startDate: new Date(2022, 7, 1),
          endDate: null,
          current: true,
          description: 'ML for health research and epidemiological forecasting at Harvard / Northeastern University.',
          technologies: ['Python', 'Machine Learning', 'Deep Learning'],
        },
        {
          company: 'UNAM',
          companyId: companyIds['UNAM'] || null,
          position: 'Undergraduate Research Assistant - Institute of Physics',
          startDate: new Date(2022, 11, 1),
          endDate: null,
          current: true,
          description: 'ML and JAX-based molecular simulation research.',
          technologies: ['Machine Learning', 'JAX'],
        },
        {
          company: 'MIT',
          companyId: companyIds['MIT'] || null,
          position: 'Undergraduate Research Assistant - Sana Lab',
          startDate: new Date(2023, 7, 1),
          endDate: new Date(2024, 2, 1),
          current: false,
          description: 'Deep learning and computer vision research.',
          technologies: ['Deep Learning', 'Computer Vision'],
        },
        {
          company: 'UNAM',
          companyId: companyIds['UNAM'] || null,
          position: 'Research Intern - Institute of Physics',
          startDate: new Date(2019, 4, 1),
          endDate: new Date(2019, 5, 1),
          current: false,
          description: 'Physics research internship.',
          technologies: [],
        },
        {
          company: 'UNAM',
          companyId: companyIds['UNAM'] || null,
          position: 'Research Intern - Institute of Physics',
          startDate: new Date(2018, 4, 1),
          endDate: new Date(2018, 5, 1),
          current: false,
          description: 'Physics research internship.',
          technologies: [],
        },
        {
          company: 'UNAM',
          companyId: companyIds['UNAM'] || null,
          position: 'Research Intern - Institute of Chemistry',
          startDate: new Date(2017, 4, 1),
          endDate: new Date(2017, 5, 1),
          current: false,
          description: 'Chemistry research internship.',
          technologies: [],
        },
      ],
      education: [
        {
          institution: 'UNAM',
          degree: 'BS in Physics',
          fieldOfStudy: 'Física',
          startDate: new Date(2017, 7, 1),
          endDate: new Date(2023, 10, 1),
          current: false,
          gpa: 9.93,
          description: '',
        },
        {
          institution: 'UNAM',
          degree: 'BS in Data Science',
          fieldOfStudy: 'Ciencia de Datos',
          startDate: new Date(2019, 7, 1),
          endDate: new Date(2024, 4, 1),
          current: false,
          gpa: 9.87,
          description: '',
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Step 1: Create new companies
// ---------------------------------------------------------------------------
async function createCompanies(companyIds) {
  console.log('=== Step 1: Creating new companies ===\n');

  let created = 0;
  let skipped = 0;

  for (const company of NEW_COMPANIES) {
    // Skip if already exists in our lookup
    if (companyIds[company.name]) {
      console.log(`  SKIP (already exists): ${company.name}`);
      skipped += 1;
      continue;
    }

    // Check Firestore for existing company by name
    const existing = await db.collection('companies')
      .where('name', '==', company.name)
      .limit(1)
      .get();

    if (!existing.empty) {
      const existingId = existing.docs[0].id;
      companyIds[company.name] = existingId;
      console.log(`  SKIP (found in Firestore): ${company.name} (${existingId})`);
      skipped += 1;
      continue;
    }

    const companyData = {
      name: company.name,
      industry: company.industry,
      location: company.location,
      createdBy: 'cv-migration-script',
      pendingReview: true,
      memberCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    };

    if (isDryRun) {
      console.log(`  DRY RUN - Would create: ${company.name} (${company.industry}, ${company.location})`);
      companyIds[company.name] = `dry-run-${company.name}`;
    } else {
      const ref = await db.collection('companies').add(companyData);
      companyIds[company.name] = ref.id;
      console.log(`  CREATED: ${company.name} (${ref.id})`);
    }
    created += 1;
  }

  console.log(`\n  Summary: ${created} created, ${skipped} skipped\n`);
  return companyIds;
}

// ---------------------------------------------------------------------------
// Step 2: Update member profiles
// ---------------------------------------------------------------------------
async function updateMembers(companyIds) {
  console.log('=== Step 2: Updating member profiles ===\n');

  const members = buildMembers(companyIds);
  let updated = 0;
  let failed = 0;

  for (const member of members) {
    // Stamp unique IDs on experience entries
    const experience = member.experience.map((role) => ({
      id: makeId('exp', role.company),
      company: role.company,
      companyId: role.companyId || null,
      position: role.position,
      startDate: role.startDate,
      endDate: role.endDate,
      current: role.current,
      description: role.description,
      technologies: role.technologies || [],
    }));

    // Stamp unique IDs on education entries
    const education = member.education.map((edu) => ({
      id: makeId('edu', edu.institution),
      institution: edu.institution,
      degree: edu.degree,
      fieldOfStudy: edu.fieldOfStudy,
      startDate: edu.startDate,
      endDate: edu.endDate,
      current: edu.current,
      gpa: edu.gpa ?? null,
      description: edu.description || '',
    }));

    const updateData = {
      bio: member.bio,
      'profile.bio': member.bio,
      skills: member.skills,
      location: member.location,
      'profile.location': member.location,
      'experience.previousRoles': experience,
      educationHistory: education,
      languages: member.languages,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Only set githubUrl if it has a value
    if (member.githubUrl) {
      updateData.githubUrl = member.githubUrl;
    }

    if (isDryRun) {
      console.log(`  DRY RUN - Would update: ${member.name} (${member.uid})`);
      console.log(`    - ${experience.length} experience entries, ${education.length} education entries`);
      console.log(`    - ${member.skills.length} skills, ${member.languages.length} languages`);
    } else {
      try {
        await db.doc(`users/${member.uid}`).update(updateData);
        console.log(`  UPDATED: ${member.name} (${member.uid})`);
      } catch (err) {
        console.error(`  FAILED: ${member.name} (${member.uid}) - ${err.message}`);
        failed += 1;
        continue;
      }
    }
    updated += 1;
  }

  console.log(`\n  Summary: ${updated} updated, ${failed} failed\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('CV Data Migration Script');
  console.log('========================\n');

  if (isDryRun) {
    console.log('*** DRY RUN MODE - No changes will be written ***\n');
  }

  const companyIds = { ...EXISTING_COMPANIES };

  await createCompanies(companyIds);
  await updateMembers(companyIds);

  console.log('Migration complete!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
