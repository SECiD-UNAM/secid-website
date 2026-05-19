// @ts-nocheck
import { COMMISSION_TYPES } from './stripe/stripe-client';

// Commission data types
export interface CommissionMember {
  id: string;
  name: string;
  email: string;
  role: 'coordinator' | 'member' | 'student';
  specializations: string[];
  avatar?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  bio?: string;
  joinedAt: Date;
  isActive: boolean;
}

export interface CommissionProject {
  id: string;
  title: string;
  description: string;
  type: 'research' | 'tutorial' | 'tool' | 'dataset' | 'publication';
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  participants: string[];
  tags: string[];
  resources: {
    github?: string;
    docs?: string;
    demo?: string;
    paper?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  commissionId: string;
}

export interface CommissionEvent {
  id: string;
  title: string;
  description: string;
  type: 'workshop' | 'seminar' | 'hackathon' | 'meetup' | 'conference';
  date: Date;
  duration: number; // in minutes
  location: 'online' | 'hybrid' | 'in-person';
  maxAttendees?: number;
  currentAttendees: number;
  speakers: string[];
  agenda: string;
  materials: string[];
  commissionId: string;
  isPublic: boolean;
}

export interface CommissionResource {
  id: string;
  title: string;
  description: string;
  type: 'tutorial' | 'dataset' | 'tool' | 'book' | 'paper' | 'video' | 'course';
  url: string;
  author: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  rating: number;
  reviews: number;
  commissionId: string;
  addedAt: Date;
  isApproved: boolean;
}

export interface CommissionMetrics {
  memberCount: number;
  activeProjects: number;
  completedProjects: number;
  upcomingEvents: number;
  resourceCount: number;
  engagementScore: number;
  monthlyActivity: {
    month: string;
    projects: number;
    events: number;
    members: number;
  }[];
}

// Commission configuration
export interface CommissionConfig {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  features: string[];
  tools: string[];
  skillAreas: string[];
  coordinators: string[];
  establishedAt: Date;
  isActive: boolean;
}

// Commission configurations
export const COMMISSION_CONFIGS: Record<string, CommissionConfig> = {
  [COMMISSION_TYPES.ANALYTICS]: {
    id: COMMISSION_TYPES.ANALYTICS,
    name: 'Analytics Commission',
    description:
      'Focused on data visualization, statistical analysis, and business intelligence',
    color: '#3B82F6',
    icon: 'chart-bar',
    features: [
      'Interactive dashboards',
      'Statistical analysis tools',
      'Business intelligence reports',
      'Data storytelling workshops',
      'Visualization best practices',
    ],
    tools: [
      'Tableau',
      'Power BI',
      'Python (Matplotlib, Seaborn, Plotly)',
      'R (ggplot2, Shiny)',
      'D3.js',
      'Observable',
    ],
    skillAreas: [
      'Statistical Analysis',
      'Data Visualization',
      'Business Intelligence',
      'Exploratory Data Analysis',
      'Dashboard Design',
      'Data Storytelling',
    ],
    coordinators: [],
    establishedAt: new Date('2023-01-15'),
    isActive: true,
  },
  [COMMISSION_TYPES.NLP]: {
    id: COMMISSION_TYPES.NLP,
    name: 'Natural Language Processing Commission',
    description:
      'Advancing text processing, language understanding, and linguistic analysis',
    color: '#10B981',
    icon: 'chat-bubble-left-right',
    features: [
      'Text sentiment analysis',
      'Language detection',
      'Named entity recognition',
      'Text summarization tools',
      'Chatbot development',
    ],
    tools: [
      'spaCy',
      'NLTK',
      'Transformers (Hugging Face)',
      'OpenAI GPT',
      'BERT',
      'Gensim',
    ],
    skillAreas: [
      'Text Processing',
      'Sentiment Analysis',
      'Language Models',
      'Information Extraction',
      'Machine Translation',
      'Speech Processing',
    ],
    coordinators: [],
    establishedAt: new Date('2023-02-01'),
    isActive: true,
  },
  [COMMISSION_TYPES.ML]: {
    id: COMMISSION_TYPES.ML,
    name: 'Machine Learning Commission',
    description:
      'Developing predictive models, algorithms, and ML best practices',
    color: '#8B5CF6',
    icon: 'cpu-chip',
    features: [
      'Experiment tracking',
      'Model performance metrics',
      'Hyperparameter optimization',
      'Feature engineering',
      'Model deployment',
    ],
    tools: [
      'scikit-learn',
      'XGBoost',
      'LightGBM',
      'MLflow',
      'Weights & Biases',
      'Optuna',
    ],
    skillAreas: [
      'Supervised Learning',
      'Unsupervised Learning',
      'Feature Engineering',
      'Model Evaluation',
      'Ensemble Methods',
      'AutoML',
    ],
    coordinators: [],
    establishedAt: new Date('2023-01-01'),
    isActive: true,
  },
  [COMMISSION_TYPES.DATA_ENG]: {
    id: COMMISSION_TYPES.DATA_ENG,
    name: 'Data Engineering Commission',
    description:
      'Building robust data pipelines, infrastructure, and data quality systems',
    color: '#F59E0B',
    icon: 'cog-6-tooth',
    features: [
      'Pipeline monitoring',
      'Data quality metrics',
      'ETL job tracking',
      'Schema evolution',
      'Performance optimization',
    ],
    tools: [
      'Apache Airflow',
      'Apache Spark',
      'Kafka',
      'dbt',
      'Prefect',
      'Great Expectations',
    ],
    skillAreas: [
      'Data Pipelines',
      'ETL/ELT',
      'Data Quality',
      'Stream Processing',
      'Data Warehousing',
      'Cloud Infrastructure',
    ],
    coordinators: [],
    establishedAt: new Date('2023-01-20'),
    isActive: true,
  },
  [COMMISSION_TYPES.DEEP_LEARNING]: {
    id: COMMISSION_TYPES.DEEP_LEARNING,
    name: 'Deep Learning Commission',
    description:
      'Exploring neural networks, deep architectures, and AI research',
    color: '#EF4444',
    icon: 'brain',
    features: [
      'GPU utilization tracking',
      'Training progress monitoring',
      'Neural architecture search',
      'Distributed training',
      'Model optimization',
    ],
    tools: [
      'PyTorch',
      'TensorFlow',
      'Keras',
      'CUDA',
      'Weights & Biases',
      'TensorBoard',
    ],
    skillAreas: [
      'Neural Networks',
      'Computer Vision',
      'Reinforcement Learning',
      'Generative AI',
      'Model Optimization',
      'GPU Programming',
    ],
    coordinators: [],
    establishedAt: new Date('2023-02-15'),
    isActive: true,
  },
  [COMMISSION_TYPES.BIOINFORMATICS]: {
    id: COMMISSION_TYPES.BIOINFORMATICS,
    name: 'Bioinformatics Commission',
    description: 'Applying data science to biological and medical research',
    color: '#14B8A6',
    icon: 'beaker',
    features: [
      'Sequence alignment tools',
      'Phylogenetic analysis',
      'Protein structure prediction',
      'Genomics data visualization',
      'Clinical data analysis',
    ],
    tools: [
      'BioPython',
      'R/Bioconductor',
      'BLAST',
      'Cytoscape',
      'PyMOL',
      'Galaxy',
    ],
    skillAreas: [
      'Genomics',
      'Proteomics',
      'Phylogenetics',
      'Structural Biology',
      'Clinical Informatics',
      'Systems Biology',
    ],
    coordinators: [],
    establishedAt: new Date('2023-03-01'),
    isActive: true,
  },
  [COMMISSION_TYPES.DATA_VIZ]: {
    id: COMMISSION_TYPES.DATA_VIZ,
    name: 'Data Visualization Commission',
    description:
      'Creating compelling visual narratives and interactive experiences',
    color: '#6366F1',
    icon: 'presentation-chart-line',
    features: [
      'Interactive chart gallery',
      'Custom visualization templates',
      'Design principles',
      'Color theory application',
      'Accessibility standards',
    ],
    tools: ['D3.js', 'Observable', 'Plotly', 'Vega-Lite', 'p5.js', 'Three.js'],
    skillAreas: [
      'Interactive Visualization',
      'Web Development',
      'Design Principles',
      'Information Graphics',
      'Animation',
      'User Experience',
    ],
    coordinators: [],
    establishedAt: new Date('2023-01-10'),
    isActive: true,
  },
};

// Mock data generators for development
export const mockCommissionMembers = (
  commissionId: string,
  count: number = 10
): CommissionMember[] => {
  const members: CommissionMember[] = [];
  const roles: CommissionMember['role'][] = [
    'coordinator',
    'member',
    'student',
  ];
  const specializations = COMMISSION_CONFIGS[commissionId]?.skillAreas || [];

  for (let i = 0; i < count; i++) {
    members.push({
      id: `member-${commissionId}-${i}`,
      name: `Member ${i + 1}`,
      email: `member${i + 1}@secid.mx`,
      role: roles[Math.floor(Math.random() * roles.length)],
      specializations: specializations.slice(
        0,
        Math.floor(Math.random() * 3) + 1
      ),
      avatar: `https://images.unsplash.com/photo-${1500000000 + i}?w=150&h=150&fit=crop&crop=face`,
      linkedin: `https://linkedin.com/in/member${i + 1}`,
      github: `https://github.com/member${i + 1}`,
      bio: `Experienced data scientist specializing in ${specializations?.[0] || 'data analysis'}`,
      joinedAt: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
      ),
      isActive: Math.random() > 0.1,
    });
  }

  return members;
};

export const mockCommissionProjects = (
  commissionId: string,
  count: number = 5
): CommissionProject[] => {
  const projects: CommissionProject[] = [];
  const types: CommissionProject['type'][] = [
    'research',
    'tutorial',
    'tool',
    'dataset',
    'publication',
  ];
  const statuses: CommissionProject['status'][] = [
    'planning',
    'active',
    'completed',
    'on-hold',
  ];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    projects.push({
      id: `project-${commissionId}-${i}`,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Project ${i + 1}`,
      description: `A comprehensive ${type} focused on advancing ${commissionId} capabilities`,
      type,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      participants: [
        `member-${commissionId}-${i}`,
        `member-${commissionId}-${i + 1}`,
      ],
      tags: COMMISSION_CONFIGS[commissionId]?.skillAreas.slice(0, 3) || [],
      resources: {
        github: `https://github.com/secid/${commissionId}-project-${i}`,
        docs: `https://docs.secid.mx/${commissionId}/project-${i}`,
        demo:
          type === 'tool'
            ? `https://demo.secid.mx/${commissionId}/project-${i}`
            : undefined,
      },
      createdAt: new Date(
        Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000
      ),
      updatedAt: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ),
      commissionId,
    });
  }

  return projects;
};

export const mockCommissionMetrics = (
  commissionId: string
): CommissionMetrics => {
  const baseMetrics = {
    memberCount: Math.floor(Math.random() * 50) + 20,
    activeProjects: Math.floor(Math.random() * 8) + 2,
    completedProjects: Math.floor(Math.random() * 15) + 5,
    upcomingEvents: Math.floor(Math.random() * 5) + 1,
    resourceCount: Math.floor(Math.random() * 30) + 10,
    engagementScore: Math.random() * 40 + 60,
    monthlyActivity: [],
  };

  // Generate 12 months of activity data
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    baseMetrics.monthlyActivity.push({
      month: date.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      }),
      projects: Math.floor(Math.random() * 3),
      events: Math.floor(Math.random() * 2),
      members: Math.floor(Math.random() * 5),
    });
  }

  return baseMetrics;
};

// API functions for commission data
export class CommissionService {
  static async getCommissionConfig(
    commissionId: string
  ): Promise<CommissionConfig | null> {
    return COMMISSION_CONFIGS[commissionId] || null;
  }

  static async getCommissionMembers(
    commissionId: string
  ): Promise<CommissionMember[]> {
    // In a real app, this would fetch from Firebase/API
    return mockCommissionMembers(commissionId);
  }

  static async getCommissionProjects(
    commissionId: string
  ): Promise<CommissionProject[]> {
    // In a real app, this would fetch from Firebase/API
    return mockCommissionProjects(commissionId);
  }

  static async getCommissionMetrics(
    commissionId: string
  ): Promise<CommissionMetrics> {
    // In a real app, this would fetch from Firebase/API
    return mockCommissionMetrics(commissionId);
  }

  static async joinCommission(
    commissionId: string,
    userId: string
  ): Promise<boolean> {
    // In a real app, this would update the user's commission membership
    console.log(`User ${userId} joining commission ${commissionId}`);
    return true;
  }

  static async leaveCommission(
    commissionId: string,
    userId: string
  ): Promise<boolean> {
    // In a real app, this would remove the user's commission membership
    console.log(`User ${userId} leaving commission ${commissionId}`);
    return true;
  }

  static async createProject(
    commissionId: string,
    project: Partial<CommissionProject>
  ): Promise<CommissionProject> {
    // In a real app, this would create a new project in the database
    const newProject: CommissionProject = {
      id: `project-${commissionId}-${Date.now()}`,
      title: project.title || '',
      description: project['description'] || '',
      type: project['type'] || 'research',
      status: 'planning',
      participants: project.participants || [],
      tags: project.tags || [],
      resources: project.resources || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      commissionId,
    };

    return newProject;
  }

  static async updateProject(
    projectId: string,
    updates: Partial<CommissionProject>
  ): Promise<CommissionProject | null> {
    // In a real app, this would update the project in the database
    console.log(`Updating project ${projectId}`, updates);
    return null;
  }

  static async deleteProject(projectId: string): Promise<boolean> {
    // In a real app, this would delete the project from the database
    console.log(`Deleting project ${projectId}`);
    return true;
  }

  static getAllCommissions(): CommissionConfig[] {
    return Object.values(COMMISSION_CONFIGS);
  }

  static getCommissionByType(type: string): CommissionConfig | null {
    return COMMISSION_CONFIGS[type] || null;
  }
}

export default CommissionService;
