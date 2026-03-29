import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from '../../hooks/useTranslations';
import {
  /**
   * Quiz Engine - Main quiz interface with various question types
   */

  getAssessment,
  getQuestions,
  startAssessment,
  saveAnswer,
  updateAttemptProgress,
  submitAssessment,
} from '../../lib/assessment';
import type {
  Assessment,
  AssessmentAttempt,
  Question,
  UserAnswer,
  QuestionType,
  AssessmentResult,
} from '../../types/assessment';

interface QuizEngineProps {
  assessmentId: string;
  userId: string;
  onComplete: (result: AssessmentResult) => void;
  onExit: () => void;
}

export default function QuizEngine({
  assessmentId,
  userId,
  onComplete,
  onExit,
}: QuizEngineProps) {
  const { t } = useTranslations();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(
    new Set()
  );
  const [answers, setAnswers] = useState<Map<number, UserAnswer>>(new Map());
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date());

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    initializeAssessment();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [assessmentId, userId]);

  useEffect(() => {
    if (timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining]);

  const initializeAssessment = async () => {
    try {
      setIsLoading(true);

      // Load assessment
      const assessmentData = await getAssessment(assessmentId);
      if (!assessmentData) {
        throw new Error('Assessment not found');
      }
      setAssessment(assessmentData);

      // Start assessment attempt
      const attemptId = await startAssessment(userId, assessmentId);

      // Load questions
      const questionsData = await getQuestions(assessmentData.questionIds);

      // Shuffle questions if required
      const finalQuestions = assessmentData.shuffleQuestions
        ? shuffleArray([...questionsData])
        : questionsData;

      setQuestions(finalQuestions);

      // Initialize attempt state
      const newAttempt: AssessmentAttempt = {
        id: attemptId,
        userId,
        assessmentId,
        startedAt: new Date(),
        status: 'in_progress',
        currentQuestionIndex: 0,
        timeRemaining: assessmentData.timeLimit * 60,
        answers: [],
        score: 0,
        percentage: 0,
        passed: false,
        timeSpent: 0,
        questionTimings: [],
        difficultyProgression: [],
        needsReview: false,
        badgesEarned: [],
      };

      setAttempt(newAttempt);
      setTimeRemaining(assessmentData.timeLimit * 60);
      setStartTime(new Date());
      setQuestionStartTime(new Date());
    } catch (error) {
      console.error('Error initializing assessment:', error);
      // Handle error - could show error message or redirect
    } finally {
      setIsLoading(false);
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleTimeUp = useCallback(async () => {
    if (attempt) {
      await handleSubmit();
    }
  }, [attempt]);

  const saveCurrentAnswer = async (answer: UserAnswer) => {
    if (!attempt) return;

    const updatedAnswers = new Map(answers);
    updatedAnswers.set(currentQuestionIndex, answer);
    setAnswers(updatedAnswers);

    try {
      await saveAnswer(attempt.id, answer);
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleAnswerChange = (value: any) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion || !attempt) return;

    const timeSpent = Math.floor(
      (new Date().getTime() - questionStartTime.getTime()) / 1000
    );

    let isCorrect = false;
    let pointsEarned = 0;

    // Calculate if answer is correct based on question type
    switch (currentQuestion.type) {
      case 'multiple_choice':
        if (Array.isArray(value)) {
          const correctOptions =
            currentQuestion?.options
              ?.filter((opt) => opt.isCorrect)
              .map((opt) => opt.id) || [];
          isCorrect =
            correctOptions.length === value.length &&
            correctOptions.every((id) => value.includes(id));
        }
        break;
      case 'single_choice':
        isCorrect =
          currentQuestion?.options?.find((opt) => opt.id === value)
            ?.isCorrect || false;
        break;
      case 'true_false':
        isCorrect = currentQuestion.correctAnswer === value;
        break;
      case 'coding_challenge':
        // For coding challenges, we'll mark as correct for now
        // In a real implementation, this would be evaluated against test cases
        isCorrect = true;
        break;
      case 'fill_blank':
        if (Array.isArray(value) && currentQuestion.fillBlanks) {
          isCorrect = currentQuestion.fillBlanks.every(
            (correct, index) =>
              value[index]?.toLowerCase().trim() ===
              correct.toLowerCase().trim()
          );
        }
        break;
    }

    if (isCorrect) {
      pointsEarned = currentQuestion.points;
    }

    const answer: UserAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer: value,
      timeSpent,
      isCorrect,
      pointsEarned,
      submittedAt: new Date(),
    };

    saveCurrentAnswer(answer);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setQuestionStartTime(new Date());
      setShowExplanation(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setQuestionStartTime(new Date());
      setShowExplanation(false);
    }
  };

  const handleFlag = () => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestionIndex)) {
        newSet.delete(currentQuestionIndex);
      } else {
        newSet.add(currentQuestionIndex);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (!attempt || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Save progress
      await updateAttemptProgress(attempt.id, {
        status: 'completed',
        completedAt: new Date(),
        timeSpent: Math.floor(
          (new Date().getTime() - startTime.getTime()) / 1000
        ),
      });

      // Submit assessment
      const result = await submitAssessment(attempt.id);
      onComplete(result);
    } catch (error) {
      console.error('Error submitting assessment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.get(currentQuestionIndex);
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">
            {t('assessment.loading', 'Cargando evaluación...')}
          </p>
        </div>
      </div>
    );
  }

  if (!assessment || !currentQuestion || !attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600">
            {t('assessmenterror', 'Error al cargar la evaluación')}
          </p>
          <button
            onClick={onExit}
            className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            {t('assessment.exit', 'Salir')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-medium text-gray-900">
                {assessment.title}
              </h1>
              <span className="text-sm text-gray-500">
                {currentQuestionIndex + 1} de {questions.length}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Timer */}
              <div
                className={`text-sm font-medium ${
                  timeRemaining < 300 ? 'text-red-600' : 'text-gray-600'
                }`}
              >
                ⏰ {formatTime(timeRemaining)}
              </div>

              {/* Flag Question */}
              <button
                onClick={handleFlag}
                className={`rounded-md p-2 ${
                  flaggedQuestions.has(currentQuestionIndex)
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title={t('assessment.flag', 'Marcar para revisión')}
              >
                🚩
              </button>

              {/* Exit */}
              <button
                onClick={onExit}
                className="p-2 text-gray-400 hover:text-gray-600"
                title={t('assessment.exit', 'Salir')}
              >
                ❌
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="pb-4">
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white shadow-lg">
          <div className="p-6">
            {/* Question Header */}
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {t(
                      `questionType.${currentQuestion['type']}`,
                      currentQuestion['type']
                    )}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                    {currentQuestion.points} puntos
                  </span>
                  {currentQuestion.timeLimit && (
                    <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                      {currentQuestion.timeLimit}s
                    </span>
                  )}
                </div>

                {flaggedQuestions.has(currentQuestionIndex) && (
                  <span className="text-sm text-yellow-600">
                    🚩 {t('assessment.flagged', 'Marcada para revisión')}
                  </span>
                )}
              </div>

              <h2 className="mb-2 text-xl font-medium text-gray-900">
                {currentQuestion.title}
              </h2>

              <p className="text-gray-700">{currentQuestion['description']}</p>
            </div>

            {/* Question Component */}
            <QuestionRenderer
              question={currentQuestion}
              answer={currentAnswer}
              onAnswerChange={handleAnswerChange}
              showExplanation={showExplanation}
              codeEditorRef={codeEditorRef}
            />

            {/* Show Explanation Button (for practice mode) */}
            {assessment.mode === 'practice' &&
              !showExplanation &&
              currentAnswer && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowExplanation(true)}
                    className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-800 hover:bg-gray-200"
                  >
                    {t('assessment.showExplanation', 'Ver explicación')}
                  </button>
                </div>
              )}

            {/* Explanation */}
            {showExplanation && (
              <div className="mt-6 rounded-lg bg-blue-50 p-4">
                <h3 className="mb-2 font-medium text-blue-900">
                  {t('assessment.explanation', 'Explicación')}
                </h3>
                <p className="mb-3 text-blue-800">
                  {currentQuestion.explanation}
                </p>

                {currentQuestion.resources &&
                  currentQuestion.resources.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium text-blue-900">
                        {t('assessment.resources', 'Recursos adicionales')}
                      </h4>
                      <ul className="space-y-1">
                        {currentQuestion.resources.map((resource, index) => (
                          <li key={index}>
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              📄 {resource.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between rounded-b-lg bg-gray-50 px-6 py-4">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← {t('assessment.previous', 'Anterior')}
            </button>

            <div className="flex items-center space-x-2">
              {/* Question Navigator */}
              <div className="flex items-center space-x-1">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentQuestionIndex(index);
                      setQuestionStartTime(new Date());
                      setShowExplanation(false);
                    }}
                    className={`h-8 w-8 rounded-md border text-xs ${
                      index === currentQuestionIndex
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : answers.has(index)
                          ? 'border-green-300 bg-green-100 text-green-800'
                          : flaggedQuestions.has(index)
                            ? 'border-yellow-300 bg-yellow-100 text-yellow-800'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center rounded-md border border-transparent bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    {t('assessment.submitting', 'Enviando...')}
                  </>
                ) : (
                  <>{t('assessment.submit', 'Enviar evaluación')} ✓</>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {t('assessment.next', 'Siguiente')} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Question Renderer Component
interface QuestionRendererProps {
  question: Question;
  answer: UserAnswer | undefined;
  onAnswerChange: (value: any) => void;
  showExplanation: boolean;
  codeEditorRef: React.RefObject<HTMLTextAreaElement>;
}

function QuestionRenderer({
  question,
  answer,
  onAnswerChange,
  showExplanation,
  codeEditorRef,
}: QuestionRendererProps) {
  const { t } = useTranslations();

  const renderQuestion = () => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            question={question}
            selectedAnswers={(answer?.selectedAnswer as string[]) || []}
            onAnswerChange={onAnswerChange}
            showExplanation={showExplanation}
          />
        );

      case 'single_choice':
        return (
          <SingleChoiceQuestion
            question={question}
            selectedAnswer={(answer?.selectedAnswer as string) || ''}
            onAnswerChange={onAnswerChange}
            showExplanation={showExplanation}
          />
        );

      case 'true_false':
        return (
          <TrueFalseQuestion
            question={question}
            selectedAnswer={answer?.selectedAnswer as boolean | undefined}
            onAnswerChange={onAnswerChange}
            showExplanation={showExplanation}
          />
        );

      case 'coding_challenge':
        return (
          <CodingChallengeQuestion
            question={question}
            code={answer?.codeSubmission || ''}
            onAnswerChange={onAnswerChange}
            codeEditorRef={codeEditorRef}
          />
        );

      case 'fill_blank':
        return (
          <FillBlankQuestion
            question={question}
            answers={answer?.fillBlankAnswers || []}
            onAnswerChange={onAnswerChange}
            showExplanation={showExplanation}
          />
        );

      case 'practical_scenario':
        return (
          <PracticalScenarioQuestion
            question={question}
            textAnswer={answer?.textAnswer || ''}
            onAnswerChange={onAnswerChange}
          />
        );

      default:
        return (
          <div className="py-8 text-center text-gray-500">
            {t(
              'assessment.unsupportedQuestion',
              'Tipo de pregunta no soportado'
            )}
          </div>
        );
    }
  };

  return <div>{renderQuestion()}</div>;
}

// Individual Question Components
interface MultipleChoiceQuestionProps {
  question: Question;
  selectedAnswers: string[];
  onAnswerChange: (value: string[]) => void;
  showExplanation: boolean;
}

function MultipleChoiceQuestion({
  question,
  selectedAnswers,
  onAnswerChange,
  showExplanation,
}: MultipleChoiceQuestionProps) {
  const handleOptionChange = (optionId: string, checked: boolean) => {
    if (checked) {
      onAnswerChange([...selectedAnswers, optionId]);
    } else {
      onAnswerChange(selectedAnswers.filter((id) => id !== optionId));
    }
  };

  return (
    <div className="space-y-3">
      {question?.options?.map((option) => (
        <label
          key={option.id}
          className={`flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors ${
            selectedAnswers.includes(option.id)
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          } ${
            showExplanation && option.isCorrect
              ? 'ring-2 ring-green-500'
              : showExplanation &&
                  selectedAnswers.includes(option.id) &&
                  !option.isCorrect
                ? 'ring-2 ring-red-500'
                : ''
          }`}
        >
          <input
            type="checkbox"
            checked={selectedAnswers.includes(option.id)}
            onChange={(e) => handleOptionChange(option.id, e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <span className="text-gray-900">{option.text}</span>
            {showExplanation && option.explanation && (
              <p className="mt-1 text-sm text-gray-600">{option.explanation}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

interface SingleChoiceQuestionProps {
  question: Question;
  selectedAnswer: string;
  onAnswerChange: (value: string) => void;
  showExplanation: boolean;
}

function SingleChoiceQuestion({
  question,
  selectedAnswer,
  onAnswerChange,
  showExplanation,
}: SingleChoiceQuestionProps) {
  return (
    <div className="space-y-3">
      {question?.options?.map((option) => (
        <label
          key={option.id}
          className={`flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors ${
            selectedAnswer === option.id
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          } ${
            showExplanation && option.isCorrect
              ? 'ring-2 ring-green-500'
              : showExplanation &&
                  selectedAnswer === option.id &&
                  !option.isCorrect
                ? 'ring-2 ring-red-500'
                : ''
          }`}
        >
          <input
            type="radio"
            name={`question-${question.id}`}
            checked={selectedAnswer === option.id}
            onChange={() => onAnswerChange(option.id)}
            className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <span className="text-gray-900">{option.text}</span>
            {showExplanation && option.explanation && (
              <p className="mt-1 text-sm text-gray-600">{option.explanation}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

interface TrueFalseQuestionProps {
  question: Question;
  selectedAnswer: boolean | undefined;
  onAnswerChange: (value: boolean) => void;
  showExplanation: boolean;
}

function TrueFalseQuestion({
  question,
  selectedAnswer,
  onAnswerChange,
  showExplanation,
}: TrueFalseQuestionProps) {
  const { t } = useTranslations();

  return (
    <div className="space-y-3">
      {[true, false].map((value) => (
        <label
          key={value.toString()}
          className={`flex cursor-pointer items-center space-x-3 rounded-lg border p-3 transition-colors ${
            selectedAnswer === value
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          } ${
            showExplanation && question.correctAnswer === value
              ? 'ring-2 ring-green-500'
              : showExplanation &&
                  selectedAnswer === value &&
                  question.correctAnswer !== value
                ? 'ring-2 ring-red-500'
                : ''
          }`}
        >
          <input
            type="radio"
            name={`question-${question.id}`}
            checked={selectedAnswer === value}
            onChange={() => onAnswerChange(value)}
            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-900">
            {value
              ? t('assessment.true', 'Verdadero')
              : t('assessment.false', 'Falso')}
          </span>
        </label>
      ))}
    </div>
  );
}

interface CodingChallengeQuestionProps {
  question: Question;
  code: string;
  onAnswerChange: (value: string) => void;
  codeEditorRef: React.RefObject<HTMLTextAreaElement>;
}

function CodingChallengeQuestion({
  question,
  code,
  onAnswerChange,
  codeEditorRef,
}: CodingChallengeQuestionProps) {
  const { t } = useTranslations();
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('');

    try {
      // In a real implementation, this would send the code to a backend service
      // for execution in a sandboxed environment
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setOutput('Code executed successfully!\nOutput: Hello, World!');
    } catch (error) {
      setOutput('Error: ' + (error as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Starter Code */}
      {question?.codingChallenge?.starterCode && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">
            {t('assessment.starterCode', 'Código inicial')}:
          </h4>
          <pre className="overflow-x-auto rounded-md bg-gray-100 p-3 text-sm">
            <code>{question.codingChallenge.starterCode}</code>
          </pre>
        </div>
      )}

      {/* Code Editor */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {t('assessment.yourCode', 'Tu código')}:
        </label>
        <textarea
          ref={codeEditorRef}
          value={code}
          onChange={(e) => onAnswerChange(e.target.value)}
          rows={12}
          className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder={
            question?.codingChallenge?.starterCode ||
            `# ${t('assessment.writeCode', 'Escribe tu código aquí...')}`
          }
        />
      </div>

      {/* Run Code Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleRunCode}
          disabled={isRunning || !code.trim()}
          className="flex items-center rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
              {t('assessment.running', 'Ejecutando...')}
            </>
          ) : (
            <>▶️ {t('assessment.runCode', 'Ejecutar código')}</>
          )}
        </button>

        {question?.codingChallenge?.timeLimit && (
          <span className="text-sm text-gray-500">
            {t('assessment.timeLimit', 'Tiempo límite')}:{' '}
            {question.codingChallenge.timeLimit}min
          </span>
        )}
      </div>

      {/* Output */}
      {output && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">
            {t('assessment.output', 'Salida')}:
          </h4>
          <pre className="overflow-x-auto rounded-md bg-black p-3 text-sm text-green-400">
            {output}
          </pre>
        </div>
      )}

      {/* Test Cases (if visible) */}
      {question?.codingChallenge?.testCases && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">
            {t('assessment.testCases', 'Casos de prueba')}:
          </h4>
          <div className="space-y-2">
            {question.codingChallenge.testCases
              .filter((testCase) => testCase.isVisible)
              .map((testCase, index) => (
                <div key={index} className="rounded-md bg-gray-50 p-3 text-sm">
                  <p className="font-medium">{testCase['description']}</p>
                  <p className="text-gray-600">
                    Input: <code>{JSON.stringify(testCase.input)}</code>
                  </p>
                  <p className="text-gray-600">
                    Expected:{' '}
                    <code>{JSON.stringify(testCase.expectedOutput)}</code>
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface FillBlankQuestionProps {
  question: Question;
  answers: string[];
  onAnswerChange: (value: string[]) => void;
  showExplanation: boolean;
}

function FillBlankQuestion({
  question,
  answers,
  onAnswerChange,
  showExplanation,
}: FillBlankQuestionProps) {
  const { t } = useTranslations();
  const blanksCount = question?.fillBlanks?.length || 0;

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    // Ensure array has the right length
    while (newAnswers.length < blanksCount) {
      newAnswers.push('');
    }
    onAnswerChange(newAnswers);
  };

  return (
    <div className="space-y-4">
      <p className="mb-4 text-gray-700">
        {t('assessment.fillBlanks', 'Completa los espacios en blanco:')}
      </p>

      {Array.from({ length: blanksCount }, (_, index) => (
        <div key={index} className="flex items-center space-x-3">
          <span className="font-medium text-gray-600">{index + 1}.</span>
          <input
            type="text"
            value={answers[index] || ''}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            className={`flex-1 rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500 ${
              showExplanation
                ? question.fillBlanks?.[index]?.toLowerCase() ===
                  answers[index]?.toLowerCase()
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
                : 'border-gray-300'
            }`}
            placeholder={t('assessment.enterAnswer', 'Ingresa tu respuesta...')}
          />
          {showExplanation && (
            <span className="text-sm text-gray-600">
              ({question.fillBlanks?.[index]})
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

interface PracticalScenarioQuestionProps {
  question: Question;
  textAnswer: string;
  onAnswerChange: (value: string) => void;
}

function PracticalScenarioQuestion({
  question,
  textAnswer,
  onAnswerChange,
}: PracticalScenarioQuestionProps) {
  const { t } = useTranslations();

  return (
    <div className="space-y-4">
      <textarea
        value={textAnswer}
        onChange={(e) => onAnswerChange(e.target.value)}
        rows={8}
        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        placeholder={t(
          'assessment.describeApproach',
          'Describe tu enfoque y solución...'
        )}
      />

      <div className="text-sm text-gray-500">
        {t(
          'assessment.scenarioNote',
          'Esta pregunta será evaluada por pares. Proporciona una respuesta detallada.'
        )}
      </div>
    </div>
  );
}
