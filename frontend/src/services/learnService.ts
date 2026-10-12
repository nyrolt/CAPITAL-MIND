import { LEARN_GUIDES } from '../data/learnContent';
import { LessonGuide, UserLearnProgress, ProgressSummary, LearnCategory, DifficultyLevel } from '../types/learn';

const STORAGE_PREFIX = 'cm_learn_progress_';

export const learnService = {
  /**
   * Retrieve all educational guides.
   */
  getLessons(): LessonGuide[] {
    return LEARN_GUIDES;
  },

  /**
   * Find a specific lesson guide by ID or slug.
   */
  getLessonById(idOrSlug: string): LessonGuide | undefined {
    return LEARN_GUIDES.find(
      g => g.id.toLowerCase() === idOrSlug.toLowerCase() || g.slug.toLowerCase() === idOrSlug.toLowerCase()
    );
  },

  /**
   * Search and filter guides by keyword, category, and difficulty.
   */
  searchLessons(query: string = '', category: string = 'All', difficulty: string = 'All'): LessonGuide[] {
    const q = query.trim().toLowerCase();
    return LEARN_GUIDES.filter(guide => {
      // Category filter
      if (category !== 'All' && guide.category !== category) {
        return false;
      }
      // Difficulty filter
      if (difficulty !== 'All' && guide.difficulty !== difficulty) {
        return false;
      }
      // Text query match
      if (!q) return true;
      const titleMatch = guide.title.toLowerCase().includes(q);
      const summaryMatch = guide.summary.toLowerCase().includes(q);
      const categoryMatch = guide.category.toLowerCase().includes(q);
      const sectionMatch = guide.sections.some(
        s => s.heading.toLowerCase().includes(q) || s.content.some(c => c.toLowerCase().includes(q))
      );
      return titleMatch || summaryMatch || categoryMatch || sectionMatch;
    });
  },

  /**
   * Get user-specific progress persisted in local browser storage.
   */
  getUserProgress(userId: string = 'demo_user'): UserLearnProgress {
    try {
      const key = `${STORAGE_PREFIX}${userId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          completedLessonIds: Array.isArray(parsed.completedLessonIds) ? parsed.completedLessonIds : [],
          lastActiveLessonId: parsed.lastActiveLessonId,
          quizScores: parsed.quizScores || {},
          updatedAt: parsed.updatedAt || new Date().toISOString()
        };
      }
    } catch (e) {
      console.warn('Could not read user learn progress from storage:', e);
    }
    return {
      completedLessonIds: [],
      quizScores: {},
      updatedAt: new Date().toISOString()
    };
  },

  /**
   * Save user progress safely.
   */
  saveUserProgress(userId: string = 'demo_user', progress: UserLearnProgress): void {
    try {
      const key = `${STORAGE_PREFIX}${userId}`;
      localStorage.setItem(key, JSON.stringify(progress));
    } catch (e) {
      console.warn('Could not persist learn progress:', e);
    }
  },

  /**
   * Toggle a lesson's completed status.
   */
  toggleLessonCompleted(userId: string = 'demo_user', lessonId: string): UserLearnProgress {
    const progress = this.getUserProgress(userId);
    const index = progress.completedLessonIds.indexOf(lessonId);
    if (index > -1) {
      progress.completedLessonIds.splice(index, 1);
    } else {
      progress.completedLessonIds.push(lessonId);
    }
    progress.lastActiveLessonId = lessonId;
    progress.updatedAt = new Date().toISOString();
    this.saveUserProgress(userId, progress);
    return progress;
  },

  /**
   * Record that a lesson was viewed / set as last active.
   */
  setLastActiveLesson(userId: string = 'demo_user', lessonId: string): void {
    const progress = this.getUserProgress(userId);
    progress.lastActiveLessonId = lessonId;
    progress.updatedAt = new Date().toISOString();
    this.saveUserProgress(userId, progress);
  },

  /**
   * Save quiz score for a lesson.
   */
  saveQuizResult(
    userId: string = 'demo_user',
    lessonId: string,
    score: { answered: number; correct: number }
  ): UserLearnProgress {
    const progress = this.getUserProgress(userId);
    progress.quizScores[lessonId] = score;
    // Automatically mark completed if all quiz questions answered correctly
    if (score.correct === score.answered && score.answered > 0 && !progress.completedLessonIds.includes(lessonId)) {
      progress.completedLessonIds.push(lessonId);
    }
    progress.updatedAt = new Date().toISOString();
    this.saveUserProgress(userId, progress);
    return progress;
  },

  /**
   * Compute overall progress summary.
   */
  getProgressSummary(userId: string = 'demo_user'): ProgressSummary {
    const progress = this.getUserProgress(userId);
    const total = LEARN_GUIDES.length;
    const completedSet = new Set(progress.completedLessonIds);
    const completed = completedSet.size;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    const byCategory: Record<string, { total: number; completed: number }> = {};
    for (const guide of LEARN_GUIDES) {
      if (!byCategory[guide.category]) {
        byCategory[guide.category] = { total: 0, completed: 0 };
      }
      byCategory[guide.category].total += 1;
      if (completedSet.has(guide.id)) {
        byCategory[guide.category].completed += 1;
      }
    }

    return {
      total,
      completed,
      percentage,
      byCategory
    };
  }
};
