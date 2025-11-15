import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import type { UserData, ActivityLog, UserGoal, WordMemoryStatus, ReadingHistoryItem, DailyMission } from '../types';
import { XP_PER_LEVEL, BADGES, XP_VALUES } from '../config/gamification';

const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

const isYesterday = (d1: Date, d2: Date) => {
    const yesterday = new Date(d1);
    yesterday.setDate(d1.getDate() - 1);
    return isSameDay(yesterday, d2);
}

const missionTemplates: Omit<DailyMission, 'progress' | 'completed'>[] = [
    { type: 'vocab_correct', target: 10, description: '単語クイズで10問正解する' },
    { type: 'earn_xp', target: 100, description: '合計100 XPを獲得する' },
    { type: 'complete_reading', target: 1, description: '長文読解クイズを1つ完了する' },
];

const generateNewMission = (): DailyMission => {
    const template = missionTemplates[Math.floor(Math.random() * missionTemplates.length)];
    return {
        ...template,
        progress: 0,
        completed: false,
    };
};

const defaultUserData: UserData = {
  level: 1,
  xp: 0,
  lastLogin: new Date().toISOString(),
  loginStreak: 1,
  goal: null,
  badges: [],
  logs: [],
  preferences: {
    level: 'Intermediate',
    learningGoal: 'General English Improvement',
  },
  wordMemory: {},
  readingHistory: [],
  dailyMission: generateNewMission(),
  lastMissionDate: new Date().toISOString(),
};

const getInitialState = (): UserData => {
  try {
    const item = window.localStorage.getItem('gemini-eng-hub-user');
    if (item) {
        const data = JSON.parse(item);
        // Ensure new fields exist
        if (!data.wordMemory) data.wordMemory = {};
        if (!data.readingHistory) data.readingHistory = [];
        
        // Check login streak
        const lastLogin = new Date(data.lastLogin);
        const now = new Date();
        if(!isSameDay(lastLogin, now)) {
            if(isYesterday(now, lastLogin)) {
                data.loginStreak += 1;
            } else {
                data.loginStreak = 1;
            }
            data.lastLogin = now.toISOString();
        }

        // Check daily mission
        const lastMissionDate = data.lastMissionDate ? new Date(data.lastMissionDate) : new Date(0);
        if (!isSameDay(lastMissionDate, now)) {
            data.dailyMission = generateNewMission();
            data.lastMissionDate = now.toISOString();
        } else if (!data.dailyMission) { // Handle case where mission is null from old data
            data.dailyMission = generateNewMission();
            data.lastMissionDate = now.toISOString();
        }
        
        // Data migration for reading history from single open question to multiple
        if (data.readingHistory.length > 0 && data.readingHistory[0].content.openQuestion) {
             data.readingHistory = data.readingHistory.map((item: any) => ({
                ...item,
                content: {
                    ...item.content,
                    openQuestions: item.content.openQuestion ? [item.content.openQuestion] : [],
                },
                userOpenAnswers: item.userOpenAnswer ? [item.userOpenAnswer] : [],
                evaluations: item.evaluation ? [item.evaluation] : [],
            }));
        }


        return data;
    }
  } catch (error) {
    console.error("Error reading from localStorage", error);
  }
  return defaultUserData;
};

export interface AddXpResult {
    xpEarned: number;
    unlockedBadges: string[];
    leveledUp: boolean;
    newLevel: number;
}


type UserDataContextType = {
  userData: UserData;
  addXpAndLog: (activity: Omit<ActivityLog, 'id' | 'date'>) => AddXpResult;
  setGoal: (goal: UserGoal | null) => void;
  updatePreferences: (prefs: Partial<UserData['preferences']>) => void;
  updateWordMemory: (word: string, isCorrect: boolean) => void;
  addReadingHistory: (item: ReadingHistoryItem) => void;
};

export const UserDataContext = createContext<UserDataContextType>({
  userData: defaultUserData,
  addXpAndLog: () => ({ xpEarned: 0, unlockedBadges: [], leveledUp: false, newLevel: 1 }),
  setGoal: () => {},
  updatePreferences: () => {},
  updateWordMemory: () => {},
  addReadingHistory: () => {},
});

type Action = 
    | { type: 'SET_USER_DATA', payload: UserData }
    | { type: 'ADD_XP_AND_LOG', payload: ActivityLog }
    | { type: 'SET_GOAL', payload: UserGoal | null }
    | { type: 'UPDATE_PREFERENCES', payload: Partial<UserData['preferences']> }
    | { type: 'UPDATE_WORD_MEMORY', payload: { word: string, isCorrect: boolean } }
    | { type: 'ADD_READING_HISTORY', payload: ReadingHistoryItem };

const userReducer = (state: UserData, action: Action): UserData => {
    switch(action.type) {
        case 'ADD_XP_AND_LOG': {
            const newXp = state.xp + action.payload.xp;
            const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
            const newLogs = [...state.logs, action.payload];
            return { ...state, xp: newXp, level: newLevel, logs: newLogs };
        }
        case 'SET_GOAL':
            return { ...state, goal: action.payload };
        case 'UPDATE_PREFERENCES':
            return { ...state, preferences: { ...state.preferences, ...action.payload } };
        case 'UPDATE_WORD_MEMORY': {
            const { word, isCorrect } = action.payload;
            const currentStatus = state.wordMemory[word] || { status: 'learning', consecutiveCorrect: 0 };
            let newStatus: WordMemoryStatus;

            if (isCorrect) {
                const newCount = currentStatus.consecutiveCorrect + 1;
                if (newCount >= 3) {
                    newStatus = { status: 'mastered', consecutiveCorrect: newCount };
                } else {
                    newStatus = { ...currentStatus, consecutiveCorrect: newCount };
                }
            } else {
                newStatus = { status: 'learning', consecutiveCorrect: 0 };
            }

            return {
                ...state,
                wordMemory: {
                    ...state.wordMemory,
                    [word]: newStatus,
                }
            };
        }
        case 'ADD_READING_HISTORY': {
            return {
                ...state,
                readingHistory: [action.payload, ...state.readingHistory],
            };
        }
        case 'SET_USER_DATA':
            return action.payload;
        default:
            return state;
    }
}

const checkBadges = (userData: UserData): string[] => {
    const unlockedBadges: string[] = [];
    const { logs, badges: currentBadges, level, loginStreak } = userData;
    
    for (const badge of BADGES) {
        if (currentBadges.includes(badge.id)) continue;

        let unlocked = false;
        switch(badge.id) {
            case 'first_steps':
                if(logs.length > 0) unlocked = true;
                break;
            case 'vocab_wiz_1':
                if(logs.filter(l => l.type === 'vocabulary').reduce((sum, l) => sum + (l.details.score || 0), 0) >= 10) unlocked = true;
                break;
            case 'vocab_wiz_2':
                if(logs.filter(l => l.type === 'vocabulary').reduce((sum, l) => sum + (l.details.score || 0), 0) >= 50) unlocked = true;
                break;
            case 'word_smith_1':
                if(logs.some(l => l.type === 'writing')) unlocked = true;
                break;
            case 'word_smith_2':
                if(logs.filter(l => l.type === 'writing').length >= 5) unlocked = true;
                break;
            case 'bookworm_1':
                if(logs.filter(l => l.type === 'reading').length >= 3) unlocked = true;
                break;
            case 'bookworm_2':
                if(logs.filter(l => l.type === 'reading').length >= 10) unlocked = true;
                break;
            case 'sharp_shooter':
                if(logs.some(l => l.details.score === l.details.total)) unlocked = true;
                break;
            case 'polymath':
                const types = new Set(logs.map(l => l.type));
                if (types.has('vocabulary') && types.has('reading') && types.has('writing')) unlocked = true;
                break;
            case 'dedicated_learner':
                if(loginStreak >= 3) unlocked = true;
                break;
            case 'committed_learner':
                if(loginStreak >= 7) unlocked = true;
                break;
            case 'unstoppable':
                if(level >= 5) unlocked = true;
                break;
        }

        if (unlocked) {
            unlockedBadges.push(badge.name);
        }
    }
    return unlockedBadges;
}

export const UserDataProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [userData, dispatch] = useReducer(userReducer, getInitialState());

    useEffect(() => {
        try {
            window.localStorage.setItem('gemini-eng-hub-user', JSON.stringify(userData));
        } catch (error) {
            console.error("Error writing to localStorage", error);
        }
    }, [userData]);
    
    const addXpAndLog = useCallback((activity: Omit<ActivityLog, 'id' | 'date'>): AddXpResult => {
        const fullActivity: ActivityLog = {
            ...activity,
            id: Date.now().toString(),
            date: new Date().toISOString(),
        };
        
        const oldLevel = userData.level;
        let updatedState = { ...userData };

        // 1. Add XP from activity
        let totalXpEarned = fullActivity.xp;
        updatedState.xp += fullActivity.xp;
        updatedState.logs = [...updatedState.logs, fullActivity];

        // 2. Check and update daily mission
        let mission = updatedState.dailyMission;

        if (mission && !mission.completed) {
            let progressIncrement = 0;
            switch (mission.type) {
                case 'earn_xp':
                    progressIncrement = fullActivity.xp;
                    break;
                case 'vocab_correct':
                    if (fullActivity.type === 'vocabulary' && fullActivity.details.score) {
                        progressIncrement = fullActivity.details.score;
                    }
                    break;
                case 'complete_reading':
                    if (fullActivity.type === 'reading') {
                        progressIncrement = 1;
                    }
                    break;
            }
            
            if (progressIncrement > 0) {
                const newProgress = mission.progress + progressIncrement;
                mission = { ...mission, progress: newProgress };
                
                if (newProgress >= mission.target) {
                    mission.completed = true;
                    const bonusXp = XP_VALUES.DAILY_MISSION_COMPLETE;
                    updatedState.xp += bonusXp;
                    totalXpEarned += bonusXp;
                }
            }
            updatedState.dailyMission = mission;
        }

        // 3. Update level based on final XP
        const newLevel = Math.floor(updatedState.xp / XP_PER_LEVEL) + 1;
        updatedState.level = newLevel;

        // 4. Check for new badges
        const newlyUnlockedBadges = checkBadges(updatedState);
        if (newlyUnlockedBadges.length > 0) {
            const newBadgeIds = BADGES.filter(b => newlyUnlockedBadges.includes(b.name)).map(b => b.id);
            updatedState.badges = [...new Set([...updatedState.badges, ...newBadgeIds])];
        }

        // 5. Dispatch final state
        dispatch({ type: 'SET_USER_DATA', payload: updatedState });
        
        return {
            xpEarned: totalXpEarned,
            unlockedBadges: newlyUnlockedBadges,
            leveledUp: newLevel > oldLevel,
            newLevel: newLevel,
        };

    }, [userData]);

    const setGoal = useCallback((goal: UserGoal | null) => {
        dispatch({ type: 'SET_GOAL', payload: goal });
    }, []);
    
    const updatePreferences = useCallback((prefs: Partial<UserData['preferences']>) => {
        dispatch({ type: 'UPDATE_PREFERENCES', payload: prefs });
    }, []);

    const updateWordMemory = useCallback((word: string, isCorrect: boolean) => {
        dispatch({ type: 'UPDATE_WORD_MEMORY', payload: { word, isCorrect } });
    }, []);

    const addReadingHistory = useCallback((item: ReadingHistoryItem) => {
        dispatch({ type: 'ADD_READING_HISTORY', payload: item });
    }, []);


    return (
        <UserDataContext.Provider value={{ userData, addXpAndLog, setGoal, updatePreferences, updateWordMemory, addReadingHistory }}>
            {children}
        </UserDataContext.Provider>
    )
}