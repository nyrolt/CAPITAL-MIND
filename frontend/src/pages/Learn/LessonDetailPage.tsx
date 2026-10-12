import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Award,
  AlertCircle,
  Lightbulb,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useApp } from '../../context/AppContext';
import { learnService } from '../../services/learnService';
import { LEARN_GUIDES } from '../../data/learnContent';

export const LessonDetailPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const userId = user?.id || user?.email || 'demo_user';

  const lesson = useMemo(() => {
    if (!lessonId) return undefined;
    return learnService.getLessonById(lessonId);
  }, [lessonId]);

  // All guides for prev/next navigation
  const currentIndex = useMemo(() => {
    if (!lesson) return -1;
    return LEARN_GUIDES.findIndex(g => g.id === lesson.id);
  }, [lesson]);

  const prevLesson = currentIndex > 0 ? LEARN_GUIDES[currentIndex - 1] : null;
  const nextLesson = currentIndex < LEARN_GUIDES.length - 1 ? LEARN_GUIDES[currentIndex + 1] : null;

  // Local state for progress & quiz
  const [progress, setProgress] = useState(() => learnService.getUserProgress(userId));
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submittedQuiz, setSubmittedQuiz] = useState(false);

  // Mark lesson viewed / active
  useEffect(() => {
    if (lesson) {
      learnService.setLastActiveLesson(userId, lesson.id);
      setProgress(learnService.getUserProgress(userId));
      // Reset quiz local selection for new lesson
      setSelectedAnswers({});
      setSubmittedQuiz(false);
      window.scrollTo(0, 0);
    }
  }, [lesson, userId]);

  if (!lesson) {
    return (
      <AppShell pageTitle="Lesson Not Found">
        <div className="py-12 text-center space-y-4">
          <div className="p-4 rounded-2xl bg-silver-light inline-block">
            <BookOpen className="w-8 h-8 text-muted" />
          </div>
          <h2 className="text-xl font-bold text-graphite">Lesson Not Found</h2>
          <p className="text-sm text-muted max-w-md mx-auto">
            The requested educational guide could not be located. It may have been moved or updated.
          </p>
          <Button onClick={() => navigate('/learn')} icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Learn Catalog
          </Button>
        </div>
      </AppShell>
    );
  }

  const isCompleted = progress.completedLessonIds.includes(lesson.id);

  const handleToggleCompleted = () => {
    const updated = learnService.toggleLessonCompleted(userId, lesson.id);
    setProgress({ ...updated });
  };

  const handleSelectAnswer = (questionId: string, optionIndex: number) => {
    if (submittedQuiz) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmitQuiz = () => {
    if (submittedQuiz) return;
    setSubmittedQuiz(true);

    let correctCount = 0;
    const answeredCount = Object.keys(selectedAnswers).length;

    lesson.quiz.forEach(q => {
      if (selectedAnswers[q.id] === q.correctIndex) {
        correctCount += 1;
      }
    });

    const updated = learnService.saveQuizResult(userId, lesson.id, {
      answered: answeredCount,
      correct: correctCount
    });
    setProgress({ ...updated });
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setSubmittedQuiz(false);
  };

  const quizScore = progress.quizScores[lesson.id];

  return (
    <AppShell pageTitle={`Learn - ${lesson.title}`}>
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        {/* Navigation Breadcrumb / Header */}
        <div className="flex items-center justify-between border-b border-silver-border pb-4">
          <button
            onClick={() => navigate('/learn')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-graphite transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Lessons</span>
          </button>

          <div className="flex items-center gap-3">
            <Button
              variant={isCompleted ? 'secondary' : 'primary'}
              size="sm"
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleToggleCompleted}
            >
              {isCompleted ? 'Mark Incomplete' : 'Mark as Completed'}
            </Button>
          </div>
        </div>

        {/* Hero Lesson Header */}
        <div className="bg-white rounded-3xl border border-silver-border p-6 md:p-8 shadow-silver-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="neutral">{lesson.category}</Badge>
            <Badge variant={lesson.difficulty === 'Beginner' ? 'positive' : lesson.difficulty === 'Intermediate' ? 'warning' : 'silver'}>
              {lesson.difficulty}
            </Badge>
            <span className="inline-flex items-center gap-1 text-muted text-xs ml-2">
              <Clock className="w-3.5 h-3.5" />
              {lesson.readingTimeMinutes} min read
            </span>
            {isCompleted && (
              <Badge variant="positive" className="ml-auto">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </Badge>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-graphite tracking-tight">
            {lesson.title}
          </h1>

          <p className="text-sm md:text-base text-muted leading-relaxed">
            {lesson.summary}
          </p>

          {/* Learning Objectives */}
          <div className="mt-6 p-4 md:p-5 rounded-2xl bg-silver-light/60 border border-silver-border space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-graphite">
              <Lightbulb className="w-4 h-4 text-graphite" />
              What You Will Learn
            </div>
            <ul className="space-y-1.5 text-xs md:text-sm text-graphite/90">
              {lesson.learningObjectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-financial-positive font-bold shrink-0 mt-0.5">•</span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Lesson Body Content Sections */}
        <div className="space-y-8">
          {lesson.sections.map((section, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-silver-border p-6 md:p-8 shadow-silver-sm space-y-4"
            >
              <h2 className="text-lg md:text-xl font-bold text-graphite tracking-tight border-b border-silver-border/60 pb-3">
                {section.heading}
              </h2>

              <div className="space-y-3 text-xs md:text-sm text-graphite/80 leading-relaxed font-normal">
                {section.content.map((p, pIdx) => (
                  <p key={pIdx}>{p}</p>
                ))}
              </div>

              {/* Realistic Indian Market Example Box */}
              {section.example && (
                <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-blue-50/70 border border-blue-200/80 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-blue-900 uppercase tracking-wider">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px]">
                      ILLUSTRATIVE EXAMPLE
                    </span>
                    <span>{section.example.title}</span>
                  </div>
                  <p className="text-xs text-blue-950 font-medium">
                    <span className="font-semibold text-blue-900">Scenario: </span>
                    {section.example.scenario}
                  </p>
                  <p className="text-xs text-blue-900/90 leading-relaxed">
                    <span className="font-semibold text-blue-900">Analysis: </span>
                    {section.example.analysis}
                  </p>
                </div>
              )}

              {/* Pro Tip Box */}
              {section.tip && (
                <div className="mt-3 p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">
                    <strong>CapitalMind Tip:</strong> {section.tip}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Key Takeaways */}
        <div className="bg-graphite text-white rounded-3xl p-6 md:p-8 shadow-silver-md space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-silver">
            <Award className="w-4 h-4 text-silver" />
            Key Takeaways
          </div>
          <ul className="space-y-2 text-xs md:text-sm text-silver-light">
            {lesson.keyTakeaways.map((takeaway, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-financial-positive shrink-0 mt-2" />
                <span className="leading-relaxed">{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Interactive Knowledge Quiz Section */}
        {lesson.quiz && lesson.quiz.length > 0 && (
          <div className="bg-white rounded-3xl border border-silver-border p-6 md:p-8 shadow-silver-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-silver-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-graphite" />
                  <h3 className="text-base font-bold text-graphite">Knowledge Check Quiz</h3>
                </div>
                <p className="text-xs text-muted">Test your comprehension of this guide</p>
              </div>

              {quizScore && (
                <Badge variant={quizScore.correct === quizScore.answered ? 'positive' : 'warning'}>
                  Score: {quizScore.correct} / {quizScore.answered} Correct
                </Badge>
              )}
            </div>

            <div className="space-y-6">
              {lesson.quiz.map((q, qIndex) => {
                const userSelected = selectedAnswers[q.id];
                const isAnswered = userSelected !== undefined;

                return (
                  <div key={q.id} className="p-4 rounded-2xl bg-silver-light/40 border border-silver-border space-y-3">
                    <p className="text-xs md:text-sm font-bold text-graphite">
                      {qIndex + 1}. {q.question}
                    </p>

                    <div className="space-y-2">
                      {q.options.map((option, optIdx) => {
                        const isChosen = userSelected === optIdx;
                        const isCorrect = optIdx === q.correctIndex;

                        let optionStyle = 'bg-white border-silver-border hover:border-graphite text-graphite';

                        if (submittedQuiz) {
                          if (isCorrect) {
                            optionStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold ring-1 ring-emerald-400';
                          } else if (isChosen && !isCorrect) {
                            optionStyle = 'bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-400';
                          } else {
                            optionStyle = 'bg-white border-silver-border text-muted opacity-60';
                          }
                        } else if (isChosen) {
                          optionStyle = 'bg-graphite text-white border-graphite shadow-silver-sm font-semibold';
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={submittedQuiz}
                            onClick={() => handleSelectAnswer(q.id, optIdx)}
                            className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${optionStyle}`}
                          >
                            <span>{option}</span>
                            {submittedQuiz && isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Feedback & Explanation after submission */}
                    {submittedQuiz && (
                      <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                        userSelected === q.correctIndex
                          ? 'bg-emerald-50/80 border border-emerald-200 text-emerald-900'
                          : 'bg-rose-50/80 border border-rose-200 text-rose-900'
                      }`}>
                        <strong>{userSelected === q.correctIndex ? '✓ Correct! ' : '✗ Incorrect. '}</strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quiz Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              {submittedQuiz ? (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={handleResetQuiz}
                >
                  Retry Quiz
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={Object.keys(selectedAnswers).length === 0}
                  onClick={handleSubmitQuiz}
                >
                  Submit Answers
                </Button>
              )}

              {isCompleted && (
                <span className="text-xs font-semibold text-financial-positive flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Lesson Marked Complete
                </span>
              )}
            </div>
          </div>
        )}

        {/* Previous / Next Lesson Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-silver-border">
          {prevLesson ? (
            <button
              onClick={() => navigate(`/learn/${prevLesson.id}`)}
              className="flex items-center gap-2 p-3 rounded-xl border border-silver-border bg-white hover:bg-silver-light transition-all text-left w-full sm:w-auto"
            >
              <ChevronLeft className="w-5 h-5 text-muted shrink-0" />
              <div>
                <span className="text-[10px] text-muted font-semibold uppercase block">Previous Lesson</span>
                <span className="text-xs font-bold text-graphite line-clamp-1">{prevLesson.title}</span>
              </div>
            </button>
          ) : (
            <div />
          )}

          {nextLesson ? (
            <button
              onClick={() => navigate(`/learn/${nextLesson.id}`)}
              className="flex items-center gap-2 p-3 rounded-xl border border-silver-border bg-white hover:bg-silver-light transition-all text-right w-full sm:w-auto ml-auto"
            >
              <div>
                <span className="text-[10px] text-muted font-semibold uppercase block">Next Lesson</span>
                <span className="text-xs font-bold text-graphite line-clamp-1">{nextLesson.title}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted shrink-0" />
            </button>
          ) : (
            <Button onClick={() => navigate('/learn')} icon={<CheckCircle2 className="w-4 h-4" />}>
              Finish Track & Return to Academy
            </Button>
          )}
        </div>

        {/* Concise Disclaimer */}
        <div className="p-4 rounded-2xl bg-silver-light/60 border border-silver-border text-center text-[11px] text-muted">
          Educational content only; not personalized investment advice.
        </div>
      </div>
    </AppShell>
  );
};
