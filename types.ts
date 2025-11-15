
export interface VocabQuestion {
  word: string;
  options: string[];
  correctAnswer: string;
}

export interface ReadingMCQ {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface ReadingOpenQuestion {
  question: string;
}

export interface ReadingQuizContent {
  passage: string;
  mcqs: ReadingMCQ[];
  openQuestion: ReadingOpenQuestion;
}

// New Types for Progress Tracking and Gamification

export interface ActivityLog {
  id: string;
  type: 'vocabulary' | 'reading' | 'writing';
  date: string; // ISO string
  xp: number;
  details: Record<string, any>; // e.g., { category: 'Business', score: 4, total: 5 }
}

export interface UserGoal {
  type: 'xp';
  target: number;
  timeframe: 'weekly';
  startDate: string; // ISO string
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji
}

export interface WordMemoryStatus {
  status: 'learning' | 'mastered';
  consecutiveCorrect: number;
}

export interface ReadingHistoryItem {
  id: string;
  date: string; // ISO string
  topic: string;
  level: string;
  content: ReadingQuizContent;
  userMcqAnswers: (number | null)[];
  userOpenAnswer: string;
  evaluation: { verdict: string; explanation: string; } | null;
}

export interface UserData {
  level: number;
  xp: number;
  lastLogin: string; // ISO string for streak calculation
  loginStreak: number;
  goal: UserGoal | null;
  badges: string[]; // Array of badge IDs
  logs: ActivityLog[];
  preferences: {
    level: string;
    learningGoal: string;
  };
  wordMemory: Record<string, WordMemoryStatus>; // Tracks memory status for each vocab word
  readingHistory: ReadingHistoryItem[];
}

export interface LearningPlan {
    week_focus: string;
    suggestions: {
        type: 'vocabulary' | 'reading' | 'writing';
        category?: string;
        topic?: string;
        level?: string;
        reason: string;
    }[];
}