import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Compass,
  TrendingUp,
  BarChart2,
  Shield,
  Layers,
  Award,
  RotateCcw
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { useApp } from '../../context/AppContext';
import { learnService } from '../../services/learnService';
import { LEARN_CATEGORIES, DIFFICULTY_LEVELS, LEARN_GUIDES } from '../../data/learnContent';
import { LessonGuide, DifficultyLevel } from '../../types/learn';

export const LearnPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const userId = user?.id || user?.email || 'demo_user';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [progress, setProgress] = useState(() => learnService.getUserProgress(userId));

  // Refresh progress when user changes or page gains focus
  useEffect(() => {
    setProgress(learnService.getUserProgress(userId));
  }, [userId]);

  const progressSummary = useMemo(() => {
    return learnService.getProgressSummary(userId);
  }, [userId, progress]);

  const lastActiveLesson = useMemo(() => {
    if (progress.lastActiveLessonId) {
      return learnService.getLessonById(progress.lastActiveLessonId);
    }
    // Default to first incomplete lesson or first lesson
    const all = learnService.getLessons();
    const firstIncomplete = all.find(g => !progress.completedLessonIds.includes(g.id));
    return firstIncomplete || all[0];
  }, [progress]);

  const filteredGuides = useMemo(() => {
    return learnService.searchLessons(searchQuery, selectedCategory, selectedDifficulty);
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Investing Basics':
        return <Layers className="w-4 h-4 text-blue-600" />;
      case 'Technical Analysis':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'Fundamental Analysis':
        return <BarChart2 className="w-4 h-4 text-amber-600" />;
      case 'Risk Management':
        return <Shield className="w-4 h-4 text-rose-600" />;
      case 'Practical Trading':
        return <Compass className="w-4 h-4 text-indigo-600" />;
      default:
        return <BookOpen className="w-4 h-4 text-graphite" />;
    }
  };

  const getDifficultyBadge = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case 'Beginner':
        return <Badge variant="positive" size="sm">Beginner</Badge>;
      case 'Intermediate':
        return <Badge variant="warning" size="sm">Intermediate</Badge>;
      case 'Advanced':
        return <Badge variant="silver" size="sm">Advanced</Badge>;
    }
  };

  const handleOpenLesson = (lesson: LessonGuide) => {
    learnService.setLastActiveLesson(userId, lesson.id);
    navigate(`/learn/${lesson.id}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedDifficulty('All');
  };

  return (
    <AppShell pageTitle="Learn">
      <div className="space-y-8 pb-12">
        {/* Header Title & Subtitle */}
        <div className="border-b border-silver-border pb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-graphite text-white shadow-silver-sm">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-bold text-graphite tracking-tight">Learn</h1>
                <Badge variant="silver" size="sm">Academy</Badge>
              </div>
              <p className="text-xs md:text-sm text-muted mt-1.5">
                Build your investing knowledge, one lesson at a time.
              </p>
            </div>

            {/* Quick Completion Stats */}
            <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-2xl border border-silver-border shadow-silver-sm">
              <div className="text-right">
                <div className="text-xs font-semibold text-muted uppercase">Overall Progress</div>
                <div className="text-sm font-bold text-graphite">
                  {progressSummary.completed} / {progressSummary.total} Lessons
                </div>
              </div>
              <div className="w-12 h-12 relative flex items-center justify-center">
                <div className="text-xs font-bold text-graphite">{progressSummary.percentage}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Welcome & Introduction Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-graphite via-graphite-dark to-graphite p-6 md:p-8 text-white shadow-silver-md">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium backdrop-blur-sm border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-silver-light" />
              Structured Indian Capital Market Education
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Master Equities, Technical Analysis & Risk Management
            </h2>
            <p className="text-xs md:text-sm text-silver-light leading-relaxed">
              Designed specifically for Indian retail investors and traders. Understand market structure, evaluate balance sheets, size positions with mathematical discipline, and test setups risk-free using our integrated paper trading simulator.
            </p>
          </div>

          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-8 translate-y-8">
            <BookOpen className="w-72 h-72 text-white" />
          </div>
        </div>

        {/* Continue Learning Section (if active) */}
        {lastActiveLesson && (
          <div className="bg-white rounded-2xl border border-silver-border p-5 shadow-silver-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    Continue Learning
                  </span>
                  {progress.completedLessonIds.includes(lastActiveLesson.id) ? (
                    <Badge variant="positive" size="sm">Completed</Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">In Progress</Badge>
                  )}
                </div>
                <h3 className="text-base font-bold text-graphite">{lastActiveLesson.title}</h3>
                <p className="text-xs text-muted max-w-xl">{lastActiveLesson.summary}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{lastActiveLesson.readingTimeMinutes} min read</span>
                </div>
                <Button
                  onClick={() => handleOpenLesson(lastActiveLesson)}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  {progress.completedLessonIds.includes(lastActiveLesson.id) ? 'Review Lesson' : 'Resume Lesson'}
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 pt-4 border-t border-silver-border/60">
              <div className="flex items-center justify-between text-[11px] text-muted mb-1.5 font-medium">
                <span>Curriculum Completion</span>
                <span className="text-graphite font-bold">{progressSummary.completed} of {progressSummary.total} completed ({progressSummary.percentage}%)</span>
              </div>
              <div className="w-full h-2 bg-silver-light rounded-full overflow-hidden border border-silver-border">
                <div
                  className="h-full bg-graphite transition-all duration-300"
                  style={{ width: `${progressSummary.percentage}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Learning Paths by Experience Level */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-graphite">Learning Paths</h3>
              <p className="text-xs text-muted">Choose a guided track matching your experience level</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Beginner Track */}
            <div
              onClick={() => setSelectedDifficulty(selectedDifficulty === 'Beginner' ? 'All' : 'Beginner')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                selectedDifficulty === 'Beginner'
                  ? 'bg-emerald-50/50 border-emerald-300 shadow-silver-md ring-1 ring-emerald-400'
                  : 'bg-white border-silver-border hover:border-silver-dark shadow-silver-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Badge variant="positive" size="sm">Beginner Path</Badge>
                <span className="text-xs font-semibold text-muted">
                  {LEARN_GUIDES.filter(g => g.difficulty === 'Beginner').length} Lessons
                </span>
              </div>
              <h4 className="text-sm font-bold text-graphite">Foundation & Markets</h4>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Understand exchange mechanics, order types, indices (NIFTY & SENSEX), and basic candlestick price action.
              </p>
            </div>

            {/* Intermediate Track */}
            <div
              onClick={() => setSelectedDifficulty(selectedDifficulty === 'Intermediate' ? 'All' : 'Intermediate')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                selectedDifficulty === 'Intermediate'
                  ? 'bg-amber-50/50 border-amber-300 shadow-silver-md ring-1 ring-amber-400'
                  : 'bg-white border-silver-border hover:border-silver-dark shadow-silver-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Badge variant="warning" size="sm">Intermediate Path</Badge>
                <span className="text-xs font-semibold text-muted">
                  {LEARN_GUIDES.filter(g => g.difficulty === 'Intermediate').length} Lessons
                </span>
              </div>
              <h4 className="text-sm font-bold text-graphite">Strategy & Risk Discipline</h4>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Dive into support/resistance, moving averages, stop-loss planning, RRR math, trade journals, and psychology.
              </p>
            </div>

            {/* Advanced Track */}
            <div
              onClick={() => setSelectedDifficulty(selectedDifficulty === 'Advanced' ? 'All' : 'Advanced')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                selectedDifficulty === 'Advanced'
                  ? 'bg-purple-50/50 border-purple-300 shadow-silver-md ring-1 ring-purple-400'
                  : 'bg-white border-silver-border hover:border-silver-dark shadow-silver-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Badge variant="silver" size="sm">Advanced Path</Badge>
                <span className="text-xs font-semibold text-muted">
                  {LEARN_GUIDES.filter(g => g.difficulty === 'Advanced').length} Lessons
                </span>
              </div>
              <h4 className="text-sm font-bold text-graphite">Valuation & Portfolio Science</h4>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Master economic moats, return on capital (ROCE), beta analysis, drawdown recovery mathematics, and hedging.
              </p>
            </div>
          </div>
        </div>

        {/* Search & Category / Difficulty Filters */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search lessons (e.g., NIFTY, stop-loss, P/E, support...)"
                className="w-full pl-10 pr-4 py-2 bg-white border border-silver-border rounded-xl text-xs md:text-sm text-graphite placeholder-muted outline-none focus:border-graphite shadow-silver-sm transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-muted hover:text-graphite"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Difficulty Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted whitespace-nowrap">Difficulty:</span>
              <select
                value={selectedDifficulty}
                onChange={e => setSelectedDifficulty(e.target.value)}
                className="bg-white border border-silver-border text-xs rounded-xl px-3 py-2 text-graphite font-medium outline-none focus:border-graphite shadow-silver-sm"
              >
                {DIFFICULTY_LEVELS.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Pill Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {LEARN_CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat;
              const catStat = cat === 'All' ? null : progressSummary.byCategory[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? 'bg-graphite text-white shadow-silver-sm font-semibold'
                      : 'bg-white text-muted hover:text-graphite hover:bg-silver-light border border-silver-border'
                  }`}
                >
                  {cat !== 'All' && getCategoryIcon(cat)}
                  <span>{cat}</span>
                  {catStat && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-silver-light text-muted'
                    }`}>
                      {catStat.completed}/{catStat.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lesson Catalog Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
              {filteredGuides.length} {filteredGuides.length === 1 ? 'Lesson' : 'Lessons'} Found
            </h3>
            {(selectedCategory !== 'All' || selectedDifficulty !== 'All' || searchQuery) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-graphite font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            )}
          </div>

          {filteredGuides.length === 0 ? (
            <EmptyState
              title="No lessons match your filters"
              description="Try adjusting your keyword query or switching the category and difficulty filters to browse other guides."
              icon={<BookOpen className="w-8 h-8 text-muted" />}
              actionText="Reset Filters"
              onAction={clearFilters}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGuides.map(guide => {
                const isCompleted = progress.completedLessonIds.includes(guide.id);
                const quizScore = progress.quizScores[guide.id];

                return (
                  <div
                    key={guide.id}
                    onClick={() => handleOpenLesson(guide)}
                    className="flex flex-col justify-between bg-white rounded-2xl border border-silver-border p-5 hover:border-silver-dark shadow-silver-sm hover:shadow-silver-md transition-all duration-150 cursor-pointer group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-silver-light">
                            {getCategoryIcon(guide.category)}
                          </span>
                          <span className="text-[11px] font-semibold text-muted">
                            {guide.category}
                          </span>
                        </div>
                        {getDifficultyBadge(guide.difficulty)}
                      </div>

                      {/* Title & Summary */}
                      <h4 className="text-sm font-bold text-graphite group-hover:text-graphite-dark transition-colors line-clamp-2">
                        {guide.title}
                      </h4>
                      <p className="text-xs text-muted mt-2 line-clamp-3 leading-relaxed">
                        {guide.summary}
                      </p>
                    </div>

                    {/* Bottom Metadata & Status */}
                    <div className="mt-5 pt-3.5 border-t border-silver-border flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {guide.readingTimeMinutes} min
                        </span>
                        {quizScore && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-graphite">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            Quiz: {quizScore.correct}/{quizScore.answered}
                          </span>
                        )}
                      </div>

                      <div>
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-financial-positive">
                            <CheckCircle2 className="w-4 h-4" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-graphite group-hover:translate-x-0.5 transition-transform">
                            Start <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Disclaimer Footer */}
        <div className="p-4 rounded-2xl bg-silver-light/60 border border-silver-border text-center text-[11px] text-muted">
          Educational content only; not personalized investment advice. Past performance and illustrative financial examples do not guarantee future returns.
        </div>
      </div>
    </AppShell>
  );
};
