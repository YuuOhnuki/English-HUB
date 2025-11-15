
import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import type { UserData, ActivityLog, UserGoal, WordMemoryStatus, ReadingHistoryItem } from '../types';
import { XP_PER_LEVEL, BADGES } from '../config/gamification';

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
        return data;
    }
  } catch (error) {
    console.error("Error reading from localStorage", error);
  }
  return defaultUserData;
};


type UserDataContextType = {
  userData: UserData;
  addXpAndLog: (activity: Omit<ActivityLog, 'id' | 'date'>) => string[];
  setGoal: (goal: UserGoal | null) => void;
  updatePreferences: (prefs: Partial<UserData['preferences']>) => void;
  updateWordMemory: (word: string, isCorrect: boolean) => void;
  addReadingHistory: (item: ReadingHistoryItem) => void;
};

export const UserDataContext = createContext<UserDataContextType>({
  userData: defaultUserData,
  addXpAndLog: () => [],
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
    
    const addXpAndLog = useCallback((activity: Omit<ActivityLog, 'id' | 'date'>): string[] => {
        const fullActivity: ActivityLog = {
            ...activity,
            id: Date.now().toString(),
            date: new Date().toISOString(),
        };
        
        let stateAfterUpdate = userReducer(userData, { type: 'ADD_XP_AND_LOG', payload: fullActivity });
        
        const newlyUnlockedBadges = checkBadges(stateAfterUpdate);
        if (newlyUnlockedBadges.length > 0) {
            const newBadgeIds = BADGES.filter(b => newlyUnlockedBadges.includes(b.name)).map(b => b.id);
            stateAfterUpdate = { ...stateAfterUpdate, badges: [...new Set([...stateAfterUpdate.badges, ...newBadgeIds])]};
        }

        dispatch({ type: 'SET_USER_DATA', payload: stateAfterUpdate });
        
        // TODO: Show a notification for unlocked badges
        if (newlyUnlockedBadges.length > 0) {
            console.log("Unlocked badges:", newlyUnlockedBadges);
            // In a real app, you'd trigger a toast notification here.
        }

        return newlyUnlockedBadges;

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