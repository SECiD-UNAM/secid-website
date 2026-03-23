# SECiD Assessment System

## Overview

The SECiD Assessment System is a comprehensive skills evaluation platform designed specifically for data science professionals. It provides a robust framework for creating, taking, and managing assessments across various data science disciplines.

## 🌟 Key Features

### Assessment Types

- **Multiple Choice Questions**: Single and multiple selection options
- **Coding Challenges**: Interactive Python, SQL, and R code execution
- **Practical Scenarios**: Real-world problem solving with peer review
- **True/False Questions**: Quick concept validation
- **Fill-in-the-Blank**: Knowledge application exercises
- **Drag & Drop**: Interactive categorization tasks

### Advanced Capabilities

- **Adaptive Difficulty**: Questions adjust based on user performance
- **Timed Assessments**: Configurable time limits per question and assessment
- **Progress Saving**: Resume assessments where you left off
- **Skill Certification**: Generate verified certificates upon completion
- **Peer Review System**: Community-driven evaluation for subjective questions
- **Comprehensive Analytics**: Detailed performance tracking and insights

### Gamification Elements

- **Skill Badges**: Earn recognition for achievements
- **Leaderboards**: Global and category-based rankings
- **Progress Tracking**: Visual skill level progression
- **Streak Counters**: Daily activity motivation
- **Percentile Rankings**: Compare performance with peers

## 📁 Architecture

### Components Structure

```
src/components/assessment/
├── AssessmentHub.tsx          # Main assessment center
├── QuizEngine.tsx            # Quiz interface with various question types
├── SkillAssessment.tsx       # Individual skill evaluation
├── AssessmentResults.tsx     # Results display with certificates
└── AssessmentHistory.tsx     # User's assessment history
```

### Data Layer

```
src/lib/assessment.ts         # Firebase functions and API calls
src/types/assessment.ts       # TypeScript type definitions
```

### Question Banks

```
src/data/question-banks/
├── python-basics.json        # Python fundamentals
├── sql-fundamentals.json     # SQL concepts and queries
└── machine-learning-basics.json # ML algorithms and concepts
```

### Translations

```
src/i18n/assessment-translations.ts # Bilingual UI translations
```

## 🚀 Getting Started

### 1. Setting Up Pages

The system integrates with the existing dashboard structure:

**English Pages:**

- `/en/dashboard/assessments/` - Assessment hub
- `/en/dashboard/assessments/[skill]` - Skill-specific assessments
- `/en/dashboard/assessments/history` - Assessment history

**Spanish Pages:**

- `/es/dashboard/evaluaciones/` - Centro de evaluaciones
- `/es/dashboard/evaluaciones/[habilidad]` - Evaluaciones por habilidad
- `/es/dashboard/evaluaciones/historial` - Historial de evaluaciones

### 2. Using Components

#### Assessment Hub

```tsx
import AssessmentHub from '@/components/assessment/AssessmentHub';

<AssessmentHub
  userId="user123"
  onStartAssessment={(assessmentId) => {
    // Navigate to quiz
    window.location.href = `/assessments/take/${assessmentId}`;
  }}
  onViewHistory={() => {
    // Navigate to history
    window.location.href = '/assessments/history';
  }}
  onViewCertificates={() => {
    // Navigate to certificates
    window.location.href = '/assessments/certificates';
  }}
/>;
```

#### Quiz Engine

```tsx
import QuizEngine from '@/components/assessment/QuizEngine';

<QuizEngine
  assessmentId="python_fundamentals"
  userId="user123"
  onComplete={(result) => {
    // Handle completion
    console.log('Assessment completed:', result);
  }}
  onExit={() => {
    // Handle exit
    window.location.href = '/assessments';
  }}
/>;
```

#### Skill Assessment

```tsx
import SkillAssessment from '@/components/assessment/SkillAssessment';

<SkillAssessment
  skillCategory="python"
  userId="user123"
  onStartAssessment={(assessmentId) => {
    // Start specific assessment
  }}
  onViewCertificate={(certificateId) => {
    // View certificate
  }}
/>;
```

## 📊 Question Types Guide

### 1. Multiple Choice

```json
{
  "type": "multiple_choice",
  "options": [
    {
      "id": "a",
      "text": "Option A",
      "isCorrect": true,
      "explanation": "Why this is correct"
    }
  ]
}
```

### 2. Coding Challenge

```json
{
  "type": "coding_challenge",
  "codingChallenge": {
    "starterCode": "def solution(n):\n    # Your code here\n    pass",
    "language": "python",
    "testCases": [
      {
        "input": 5,
        "expectedOutput": 120,
        "description": "Factorial of 5",
        "isVisible": true
      }
    ],
    "timeLimit": 5
  }
}
```

### 3. Practical Scenario

```json
{
  "type": "practical_scenario",
  "requiresPeerReview": true,
  "reviewCriteria": [
    "Problem understanding",
    "Solution approach",
    "Code quality"
  ]
}
```

## 🔧 Configuration

### Assessment Configuration

```typescript
interface Assessment {
  title: string;
  description: string;
  category: SkillCategory;
  difficulty: DifficultyLevel;
  mode: 'practice' | 'certification';
  questionIds: string[];
  timeLimit: number; // minutes
  passingScore: number; // percentage
  isAdaptive: boolean;
  shuffleQuestions: boolean;
}
```

### Question Configuration

```typescript
interface Question {
  type: QuestionType;
  category: SkillCategory;
  difficulty: DifficultyLevel;
  title: string;
  description: string;
  points: number;
  timeLimit?: number; // seconds
  explanation: string;
  resources?: Resource[];
  tags: string[];
}
```

## 🎓 Skill Categories

The system supports the following skill categories:

### Programming Languages

- `python` - Python programming
- `r` - R programming
- `sql` - SQL and databases

### Data Science Domains

- `machine_learning` - ML algorithms and concepts
- `deep_learning` - Neural networks and deep learning
- `statistics` - Statistical analysis and methods
- `data_visualization` - Charts, graphs, and visual analytics
- `data_engineering` - Data pipelines and infrastructure

### Tools & Platforms

- `excel` - Microsoft Excel
- `tableau` - Tableau visualization
- `power_bi` - Microsoft Power BI
- `spark` - Apache Spark
- `hadoop` - Hadoop ecosystem

### Cloud & Infrastructure

- `aws` - Amazon Web Services
- `azure` - Microsoft Azure
- `gcp` - Google Cloud Platform
- `docker` - Containerization
- `linux` - Linux systems

### Data Management

- `databases` - Database design and management
- `mongodb` - MongoDB NoSQL database
- `etl` - Extract, Transform, Load processes
- `apis` - API development and integration

## 📈 Analytics & Reporting

### User Progress Tracking

- Skill level progression (0-100%)
- Verified skills with certificates
- Assessment completion rates
- Time spent on assessments
- Consecutive activity streaks

### Performance Metrics

- Overall accuracy percentage
- Category-specific performance
- Difficulty level analysis
- Question-by-question breakdown
- Improvement over time

### Leaderboards

- Global rankings
- Category-specific rankings
- Monthly/weekly competitions
- Percentile positioning

## 🏆 Certification System

### Certificate Generation

Certificates are automatically generated for:

- Passing certification-mode assessments
- Achieving minimum required scores
- Completing skill assessment paths

### Certificate Features

- Unique verification codes
- Blockchain-ready hashing
- PDF generation for download
- Social sharing capabilities
- Professional credential display

### Skill Verification

- Multiple assessment requirement
- Peer review validation
- Time-based verification expiry
- Continuous learning incentives

## 🔒 Security & Integrity

### Anti-Cheating Measures

- Question randomization
- Time-limited sessions
- Browser lockdown options
- Copy/paste prevention
- Tab switching detection

### Code Execution Security

- Sandboxed execution environment
- Resource usage limits
- Timeout protections
- Safe library restrictions

## 🌐 Internationalization

### Supported Languages

- Spanish (es) - Primary language
- English (en) - Secondary language

### Translation Structure

All UI elements are translated using the `useTranslations` hook:

```typescript
const { t } = useTranslations();
const title = t('assessment.hub.title', 'Centro de Evaluaciones');
```

### Adding New Languages

1. Extend `assessment-translations.ts`
2. Add language code to type definitions
3. Update translation loading logic

## 🔨 Development Guide

### Adding New Question Types

1. **Define Type in TypeScript**

```typescript
// In src/types/assessment.ts
export type QuestionType = 'existing_types' | 'new_question_type';
```

2. **Create Renderer Component**

```tsx
// In QuizEngine.tsx
function NewQuestionTypeRenderer({ question, answer, onAnswerChange }) {
  // Implementation
}
```

3. **Update Question Router**

```tsx
// In QuestionRenderer component
case 'new_question_type':
  return <NewQuestionTypeRenderer {...props} />;
```

### Creating Question Banks

1. **Define Question Structure**

```json
{
  "id": "skill_category_bank",
  "name": "Skill Category Questions",
  "description": "Questions for skill category",
  "category": "skill_category",
  "questions": [
    // Question objects
  ]
}
```

2. **Add to Data Directory**
   Place JSON file in `src/data/question-banks/`

3. **Import in Assessment Logic**
   Questions are loaded dynamically based on assessment configuration.

### Extending Assessment Logic

#### Custom Scoring

```typescript
// In assessment.ts
function calculateCustomScore(
  answers: UserAnswer[],
  questions: Question[]
): number {
  // Custom scoring logic
  return score;
}
```

#### Adaptive Difficulty

```typescript
interface DifficultyRule {
  condition: 'correct_streak' | 'time_remaining';
  threshold: number;
  action: 'increase_difficulty' | 'decrease_difficulty';
}
```

## 🧪 Testing

### Unit Tests

Test individual components:

```bash
npm run test src/components/assessment/
```

### Integration Tests

Test complete assessment flows:

```bash
npm run test:integration
```

### E2E Tests

Test user journeys:

```bash
npm run test:e2e
```

## 📱 Mobile Considerations

### Responsive Design

- Touch-friendly interfaces
- Mobile-optimized layouts
- Swipe navigation support
- Adaptive font sizing

### Performance

- Lazy loading for large assessments
- Offline capability for started assessments
- Progressive image loading
- Minimized bundle sizes

## 🚀 Deployment

### Environment Variables

```env
PUBLIC_FIREBASE_PROJECT_ID=your-project-id
PUBLIC_FIREBASE_API_KEY=your-api-key
PUBLIC_USE_EMULATORS=false
PUBLIC_DEBUG_MODE=false
```

### Build Configuration

The assessment system integrates with the existing Astro build process:

```bash
npm run build
npm run preview
```

### Production Considerations

- CDN for static assets
- Firebase security rules
- Rate limiting for APIs
- Monitoring and analytics

## 🤝 Contributing

### Code Style

Follow the existing TypeScript and React patterns:

- Use functional components with hooks
- Implement proper TypeScript typing
- Follow the existing file organization
- Include comprehensive JSDoc comments

### Question Contribution

1. Follow the JSON schema for questions
2. Include proper explanations and resources
3. Test question functionality
4. Ensure translations are complete

### Feature Requests

Submit feature requests with:

- Clear use case description
- Implementation considerations
- User experience impact
- Backward compatibility notes

## 📚 Resources

### Documentation

- [Astro Documentation](https://docs.astro.build/)
- [React Documentation](https://react.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Learning Materials

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)

## 🐛 Troubleshooting

### Common Issues

**Assessment not loading:**

- Check Firebase configuration
- Verify user authentication
- Check browser console for errors

**Questions not displaying:**

- Verify question bank JSON format
- Check category mapping
- Ensure proper imports

**Code execution failing:**

- Check sandbox environment
- Verify language support
- Review execution timeouts

### Debug Mode

Enable debug mode for detailed logging:

```typescript
if (import.meta.env.PUBLIC_DEBUG_MODE === 'true') {
  console.log('Debug info:', data);
}
```

## 📞 Support

For technical support or questions about the assessment system:

- Create an issue in the repository
- Contact the development team
- Review existing documentation
- Check community discussions

---

Built with ❤️ for the SECiD community by data scientists, for data scientists.
