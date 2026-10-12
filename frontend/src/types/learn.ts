export type LearnCategory =
  | 'Investing Basics'
  | 'Technical Analysis'
  | 'Fundamental Analysis'
  | 'Risk Management'
  | 'Practical Trading';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonExample {
  title: string;
  scenario: string;
  analysis: string;
}

export interface LessonSection {
  heading: string;
  content: string[];
  example?: LessonExample;
  tip?: string;
}

export interface LessonGuide {
  id: string;
  title: string;
  slug: string;
  category: LearnCategory;
  difficulty: DifficultyLevel;
  readingTimeMinutes: number;
  summary: string;
  learningObjectives: string[];
  sections: LessonSection[];
  keyTakeaways: string[];
  quiz: QuizQuestion[];
  relatedLessonIds?: string[];
}

export interface UserLearnProgress {
  completedLessonIds: string[];
  lastActiveLessonId?: string;
  quizScores: Record<string, { answered: number; correct: number }>;
  updatedAt: string;
}

export interface ProgressSummary {
  total: number;
  completed: number;
  percentage: number;
  byCategory: Record<string, { total: number; completed: number }>;
}
