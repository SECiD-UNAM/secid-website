/**
 * Pure formatting and grouping helpers used by the CV viewer.
 *
 * These functions have no React or DOM dependencies. They cover:
 *   - Skill categorisation by domain (Languages, ML, Cloud, etc).
 *   - Language proficiency badge color resolution (returns inline style
 *     objects, but no React imports — see `React.CSSProperties` typing).
 */

import type { CSSProperties } from 'react';

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
