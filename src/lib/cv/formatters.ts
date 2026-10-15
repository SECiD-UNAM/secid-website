/**
 * Pure formatting and grouping helpers used by the CV viewer.
 *
 * These functions have no React or DOM dependencies. They cover:
 *   - Skill categorisation by domain (Languages, ML, Cloud, etc).
 *   - Language proficiency badge color resolution (returns inline style
 *     objects, but no React imports — see `React.CSSProperties` typing).
 *   - Date formatting for display (#49 — consolidate HTML vs PDF).
 */

import type { CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Date formatting (issue #49)
//
// The HTML CV viewer renders raw "YYYY-MM" strings (from transform.formatDate),
// while pdf-generator reformats to "MMM YYYY". Same field, two different
// displayed strings. Consolidate here so both rendering paths produce
// identical output.
//
// Input: "YYYY-MM" string (or "" / undefined for absent dates).
// Output: localised "Abr 2024" / "Apr 2024".
// ---------------------------------------------------------------------------

const MONTH_NAMES_ES = [
  '',
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

const MONTH_NAMES_EN = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function formatDateForDisplay(
  yyyymm: string | undefined | null,
  lang: 'es' | 'en' = 'es'
): string {
  if (!yyyymm) return '';
  const parts = String(yyyymm).split('-');
  const year = parts[0] ?? '';
  const month = parts[1] ?? '';
  if (!year) return '';
  const monthIndex = parseInt(month, 10);
  if (!Number.isFinite(monthIndex) || monthIndex < 1 || monthIndex > 12) {
    return year; // year-only is acceptable
  }
  const names = lang === 'es' ? MONTH_NAMES_ES : MONTH_NAMES_EN;
  return `${names[monthIndex]} ${year}`;
}

// ---------------------------------------------------------------------------
// Language proficiency badge styling
// ---------------------------------------------------------------------------

export function getLevelBadgeStyle(proficiency: string): CSSProperties {
  const key = proficiency.toLowerCase();
  if (key === 'native' || key === 'nativo') {
    return {
      background: 'rgb(16 185 129 / 0.2)',
      color: '#10b981',
      border: '1px solid rgb(16 185 129 / 0.3)',
    };
  }
  if (key === 'fluent' || key === 'fluido') {
    return {
      background: 'rgb(246 84 37 / 0.15)',
      color: 'var(--color-primary)',
      border: '1px solid rgb(246 84 37 / 0.3)',
    };
  }
  if (key === 'advanced' || key === 'avanzado') {
    return {
      background: 'rgb(59 130 246 / 0.2)',
      color: '#60a5fa',
      border: '1px solid rgb(59 130 246 / 0.3)',
    };
  }
  if (key === 'intermediate' || key === 'intermedio') {
    return {
      background: 'rgb(234 179 8 / 0.2)',
      color: '#facc15',
      border: '1px solid rgb(234 179 8 / 0.3)',
    };
  }
  // basic / basico / default
  return {
    background: 'rgb(107 114 128 / 0.2)',
    color: '#9ca3af',
    border: '1px solid rgb(107 114 128 / 0.3)',
  };
}

// ---------------------------------------------------------------------------
// Skill categorisation
// ---------------------------------------------------------------------------

export const SKILL_CATEGORIES: Record<string, string[]> = {
  Languages: [
    'Python',
    'R',
    'SQL',
    'Java',
    'Julia',
    'C++',
    'JavaScript',
    'TypeScript',
    'Scala',
    'MATLAB',
    'Fortran',
    'Node.js',
    'HTML',
    'CSS',
    'Go',
    'Rust',
    'Kotlin',
    'Swift',
    'PHP',
    'Ruby',
    'Perl',
    'Shell',
    'Bash',
  ],
  'Cloud & MLOps': [
    'AWS',
    'Azure',
    'GCP',
    'SageMaker',
    'EMR',
    'Lambda',
    'Docker',
    'Kubernetes',
    'Airflow',
    'MLflow',
    'Snowflake',
    'Glue',
    'Terraform',
    'CloudFormation',
    'Databricks',
    'Vertex AI',
  ],
  Databases: [
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Cassandra',
    'Neo4j',
    'Redis',
    'SQL Server',
    'Riak',
    'DynamoDB',
    'Elasticsearch',
    'InfluxDB',
    'SQLite',
  ],
  'Machine Learning': [
    'PyTorch',
    'TensorFlow',
    'Scikit-learn',
    'XGBoost',
    'Keras',
    'CUDA',
    'Deep Learning',
    'Machine Learning',
    'NLP',
    'Computer Vision',
    'Transformers',
    'LLMs',
    'HuggingFace',
    'OpenCV',
    'spaCy',
    'NLTK',
    'LangChain',
    'RAG',
  ],
  'Data & Visualization': [
    'Pandas',
    'NumPy',
    'Spark',
    'PySpark',
    'Power BI',
    'Tableau',
    'Matplotlib',
    'Seaborn',
    'Plotly',
    'D3.js',
    'Qlik',
    'Data Studio',
    'Excel',
    'Grafana',
    'Looker',
    'dbt',
  ],
  Tools: [
    'Git',
    'Linux',
    'Jenkins',
    'Jira',
    'LaTeX',
    'Postman',
    'CI/CD',
    'GitHub Actions',
    'GitLab CI',
    'Confluence',
    'Notion',
    'VS Code',
  ],
};

export function categorizeSkills(
  skills: string[],
  lang: 'es' | 'en'
): { label: string; items: string[] }[] {
  const categorized: { label: string; items: string[] }[] = [];
  const used = new Set<string>();

  for (const [category, keywords] of Object.entries(SKILL_CATEGORIES)) {
    const matches = skills.filter(
      (s) =>
        keywords.some((k) => s.toLowerCase().includes(k.toLowerCase())) &&
        !used.has(s)
    );
    if (matches.length > 0) {
      categorized.push({ label: category, items: matches });
      matches.forEach((m) => used.add(m));
    }
  }

  const remaining = skills.filter((s) => !used.has(s));
  if (remaining.length > 0) {
    categorized.push({
      label: lang === 'es' ? 'Otros' : 'Other',
      items: remaining,
    });
  }

  return categorized;
}
