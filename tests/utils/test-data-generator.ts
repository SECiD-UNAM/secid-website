import { faker } from '@faker-js/faker/locale/es_MX';

export interface TestUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  graduationYear?: number;
  degree?: string;
  specialization?: string;
  company?: string;
  position?: string;
  bio?: string;
  skills?: string[];
  linkedIn?: string;
  github?: string;
  website?: string;
}

export interface TestJobData {
  title: string;
  company: string;
  description: string;
  requirements: string[];
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  remote: 'remote' | 'hybrid' | 'onsite';
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  benefits?: string[];
  tags?: string[];
  applicationDeadline?: Date;
}

export interface TestEventData {
  title: string;
  description: string;
  date: Date;
  duration: number; // in minutes
  location?: string;
  type: 'online' | 'presencial' | 'hybrid';
  capacity?: number;
  price?: number;
  speakers?: Array<{
    name: string;
    title: string;
    bio: string;
  }>;
  tags?: string[];
}

export interface TestPaymentData {
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export class TestDataGenerator {
  /**
   * Generate random user data
   */
  static generateUser(overrides?: Partial<TestUserData>): TestUserData {
    const graduationYear = faker.number.int({ min: 2015, max: 2024 });
    
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      password: 'TestPassword123!',
      phone: faker.phone.number('+52 ## #### ####'),
      graduationYear,
      degree: faker.helpers.arrayElement([
        'Licenciatura en Ciencia de Datos',
        'Ingeniería en Datos',
        'Maestría en Ciencia de Datos',
        'Doctorado en Ciencia de Datos'
      ]),
      specialization: faker.helpers.arrayElement([
        'Machine Learning',
        'Data Engineering',
        'Business Intelligence',
        'Deep Learning',
        'Natural Language Processing',
        'Computer Vision',
        'Big Data',
        'Data Visualization'
      ]),
      company: faker.company.name(),
      position: faker.helpers.arrayElement([
        'Data Scientist',
        'Data Engineer',
        'ML Engineer',
        'Data Analyst',
        'AI Researcher',
        'Business Intelligence Analyst'
      ]),
      bio: faker.lorem.paragraph(),
      skills: faker.helpers.arrayElements([
        'Python',
        'R',
        'SQL',
        'TensorFlow',
        'PyTorch',
        'Spark',
        'Hadoop',
        'Tableau',
        'Power BI',
        'AWS',
        'Azure',
        'GCP',
        'Docker',
        'Kubernetes'
      ], { min: 3, max: 8 }),
      linkedIn: `https://linkedin.com/in/${faker.internet.userName()}`,
      github: `https://github.com/${faker.internet.userName()}`,
      website: faker.internet.url(),
      ...overrides
    };
  }

  /**
   * Generate random job data
   */
  static generateJob(overrides?: Partial<TestJobData>): TestJobData {
    const jobTitles = [
      'Data Scientist Senior',
      'Ingeniero de Datos',
      'Machine Learning Engineer',
      'Analista de Business Intelligence',
      'Arquitecto de Datos',
      'Data Engineer Lead',
      'Research Scientist',
      'Data Analyst',
      'MLOps Engineer',
      'Computer Vision Engineer'
    ];

    const companies = [
      'TechCorp México',
      'DataLab Solutions',
      'AI Innovations',
      'CloudData Systems',
      'Analytics Pro',
      'Machine Learning Co',
      'Big Data México',
      'Neural Networks Inc',
      'Data Insights Group',
      'AI México'
    ];

    return {
      title: faker.helpers.arrayElement(jobTitles),
      company: faker.helpers.arrayElement(companies),
      description: faker.lorem.paragraphs(3),
      requirements: faker.helpers.arrayElements([
        '3+ años de experiencia en ciencia de datos',
        'Dominio de Python y librerías de ML',
        'Experiencia con SQL y bases de datos',
        'Conocimiento de estadística avanzada',
        'Experiencia con cloud computing (AWS/Azure/GCP)',
        'Habilidades de comunicación',
        'Inglés avanzado',
        'Experiencia con metodologías ágiles'
      ], { min: 4, max: 6 }),
      location: faker.helpers.arrayElement([
        'Ciudad de México',
        'Guadalajara',
        'Monterrey',
        'Querétaro',
        'Puebla'
      ]),
      type: faker.helpers.arrayElement(['full-time', 'part-time', 'contract', 'internship']),
      remote: faker.helpers.arrayElement(['remote', 'hybrid', 'onsite']),
      salary: {
        min: faker.number.int({ min: 30000, max: 60000 }),
        max: faker.number.int({ min: 60000, max: 150000 }),
        currency: 'MXN'
      },
      benefits: faker.helpers.arrayElements([
        'Seguro de gastos médicos mayores',
        'Vales de despensa',
        'Home office',
        'Horario flexible',
        'Capacitación continua',
        'Bonos por desempeño',
        'Stock options',
        'Gimnasio',
        'Días de vacaciones superiores a la ley'
      ], { min: 3, max: 6 }),
      tags: faker.helpers.arrayElements([
        'Python',
        'Machine Learning',
        'SQL',
        'AWS',
        'TensorFlow',
        'Data Engineering',
        'Statistics',
        'Big Data'
      ], { min: 3, max: 5 }),
      applicationDeadline: faker.date.future({ days: 30 }),
      ...overrides
    };
  }

  /**
   * Generate random event data
   */
  static generateEvent(overrides?: Partial<TestEventData>): TestEventData {
    const eventTitles = [
      'Workshop: Introducción a Machine Learning',
      'Conferencia: El Futuro de la IA en México',
      'Meetup: Data Science en la Práctica',
      'Taller: Deep Learning con PyTorch',
      'Webinar: MLOps Best Practices',
      'Hackathon: Data for Good',
      'Panel: Mujeres en Data Science',
      'Curso: SQL para Data Scientists'
    ];

    return {
      title: faker.helpers.arrayElement(eventTitles),
      description: faker.lorem.paragraphs(2),
      date: faker.date.future({ days: 60 }),
      duration: faker.helpers.arrayElement([60, 90, 120, 180, 480]), // minutes
      location: faker.helpers.arrayElement([
        'UNAM - Facultad de Ciencias',
        'Hotel Hilton Reforma',
        'WeWork Polanco',
        'Online via Zoom',
        'Google Meet'
      ]),
      type: faker.helpers.arrayElement(['online', 'presencial', 'hybrid']),
      capacity: faker.number.int({ min: 20, max: 200 }),
      price: faker.helpers.arrayElement([0, 0, 0, 500, 1000, 1500]), // Many free events
      speakers: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => ({
        name: faker.person.fullName(),
        title: faker.person.jobTitle(),
        bio: faker.lorem.sentence()
      })),
      tags: faker.helpers.arrayElements([
        'Machine Learning',
        'Data Science',
        'Python',
        'Career Development',
        'Networking',
        'Technical Workshop',
        'Industry Insights'
      ], { min: 2, max: 4 }),
      ...overrides
    };
  }

  /**
   * Generate test payment data
   */
  static generatePaymentData(overrides?: Partial<TestPaymentData>): TestPaymentData {
    return {
      cardNumber: '4242424242424242', // Stripe test card
      cardHolder: faker.person.fullName().toUpperCase(),
      expiryDate: '12/25',
      cvv: '123',
      billingAddress: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: 'México'
      },
      ...overrides
    };
  }

  /**
   * Generate invalid credit card for testing
   */
  static generateInvalidCard(): TestPaymentData {
    return this.generatePaymentData({
      cardNumber: '4000000000000002', // Stripe card that will be declined
    });
  }

  /**
   * Generate expired credit card for testing
   */
  static generateExpiredCard(): TestPaymentData {
    return this.generatePaymentData({
      expiryDate: '01/20', // Expired date
    });
  }

  /**
   * Generate test message/forum post
   */
  static generateMessage(): { subject: string; content: string } {
    return {
      subject: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(2)
    };
  }

  /**
   * Generate course/learning content
   */
  static generateCourse() {
    return {
      title: faker.helpers.arrayElement([
        'Fundamentos de Machine Learning',
        'Python para Data Science',
        'Estadística Aplicada',
        'Deep Learning Avanzado',
        'Big Data con Spark',
        'Visualización de Datos'
      ]),
      description: faker.lorem.paragraph(),
      duration: faker.helpers.arrayElement(['4 semanas', '6 semanas', '8 semanas', '3 meses']),
      level: faker.helpers.arrayElement(['Principiante', 'Intermedio', 'Avanzado']),
      price: faker.helpers.arrayElement([0, 1500, 2500, 3500]),
      instructor: faker.person.fullName(),
      modules: Array.from({ length: faker.number.int({ min: 4, max: 8 }) }, () => ({
        title: faker.lorem.sentence({ min: 3, max: 6 }),
        duration: `${faker.number.int({ min: 30, max: 120 })} minutos`,
        lessons: faker.number.int({ min: 3, max: 8 })
      }))
    };
  }

  /**
   * Generate mentorship profile
   */
  static generateMentor() {
    return {
      name: faker.person.fullName(),
      title: faker.person.jobTitle(),
      company: faker.company.name(),
      expertise: faker.helpers.arrayElements([
        'Machine Learning',
        'Career Development',
        'Data Engineering',
        'Leadership',
        'Technical Interviews',
        'Project Management'
      ], { min: 2, max: 4 }),
      experience: `${faker.number.int({ min: 5, max: 20 })} años`,
      bio: faker.lorem.paragraphs(2),
      availability: faker.helpers.arrayElement([
        'Lunes a Viernes, 6-8 PM',
        'Sábados, 10 AM - 2 PM',
        'Flexible por las tardes',
        'Fines de semana'
      ]),
      rate: faker.helpers.arrayElement(['Gratis', '$500/hora', '$800/hora', '$1000/hora']),
      languages: ['Español', 'Inglés']
    };
  }

  /**
   * Generate bulk test data
   */
  static generateBulkData(type: 'users' | 'jobs' | 'events', count: number = 10) {
    switch (type) {
      case 'users':
        return Array.from({ length: count }, () => this.generateUser());
      case 'jobs':
        return Array.from({ length: count }, () => this.generateJob());
      case 'events':
        return Array.from({ length: count }, () => this.generateEvent());
      default:
        return [];
    }
  }

  /**
   * Generate search query
   */
  static generateSearchQuery(): string {
    return faker.helpers.arrayElement([
      'machine learning',
      'data engineer',
      'python',
      'remoto',
      'ciudad de méxico',
      'senior',
      'junior',
      'aws',
      'tensorflow'
    ]);
  }

  /**
   * Generate filter criteria
   */
  static generateFilterCriteria() {
    return {
      location: faker.helpers.arrayElement(['Ciudad de México', 'Guadalajara', 'Monterrey', 'Remoto', '']),
      type: faker.helpers.arrayElement(['full-time', 'part-time', 'contract', '']),
      experience: faker.helpers.arrayElement(['junior', 'mid', 'senior', '']),
      salary: faker.helpers.arrayElement(['0-50000', '50000-100000', '100000+', '']),
      tags: faker.helpers.arrayElements(['Python', 'Machine Learning', 'SQL', 'AWS'], { min: 0, max: 3 })
    };
  }
}