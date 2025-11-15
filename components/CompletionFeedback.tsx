
import React, { useContext, useEffect, useState } from 'react';
import { UserDataContext } from '../context/UserDataContext';
import { BADGES, XP_PER_LEVEL } from '../config/gamification';

interface CompletionFeedbackProps {
    xpEarned: number;
    unlockedBadges: string[];
}

const ProgressBar: React.FC<{label: string; value: number; max: number;}> = ({ label, value, max }) => {
    const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div>
            <div className="flex justify-between items-baseline mb-1 text-sm">
                <span className="font-semibold text-slate-300">{label}</span>
                <span className="text-slate-400">{Math.min(value, max)} / {max}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5">
                <div
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percent}%` }}
                ></div>
            </div>
        </div>
    )
}

const CompletionFeedback: React.FC<CompletionFeedbackProps> = ({ xpEarned, unlockedBadges }) => {
    const { userData } = useContext(UserDataContext);
    const { xp, level, dailyMission, goal, logs } = userData;

    const [displayedXp, setDisplayedXp] = useState(xp - xpEarned);

    // Animate XP bar
    useEffect(() => {
        const timeout = setTimeout(() => {
            setDisplayedXp(xp);
        }, 100); // Start animation shortly after mount
        return () => clearTimeout(timeout);
    }, [xp]);

    const xpForCurrentLevel = displayedXp % XP_PER_LEVEL;
    const progressPercent = (xpForCurrentLevel / XP_PER_LEVEL) * 100;

    const newBadges = BADGES.filter(b => unlockedBadges.includes(b.name));

    const weeklyGoalProgress = goal ? logs
        .filter(log => new Date(log.date) >= new Date(goal.startDate))
        .reduce((sum, log) => sum + log.xp, 0) : 0;

    return (
        <div className="w-full max-w-md mx-auto my-4 space-y-4 text-center animate-fade-in">
            <div>
                <p className="text-lg text-yellow-300 font-bold">+{xpEarned} XP 獲得！</p>
            </div>
            {/* XP Progress Bar */}
            <div className="w-full">
                <div className="flex justify-between items-baseline mb-1 text-sm">
                    <span className="font-bold text-white">レベル {level}</span>
                    <span className="text-slate-400">{xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3">
                    <div
                        className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-3 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>
            </div>
            
            <div className="space-y-3 text-left pt-2">
                 {dailyMission && (
                    <ProgressBar 
                        label="今日のミッション"
                        value={dailyMission.progress}
                        max={dailyMission.target}
                    />
                )}
                {goal && (
                     <ProgressBar 
                        label="週の目標"
                        value={weeklyGoalProgress}
                        max={goal.target}
                    />
                )}
            </div>

            {/* Unlocked Badges */}
            {newBadges.length > 0 && (
                <div>
                    <h4 className="font-semibold text-cyan-300 mb-2">新しいバッジを獲得しました！</h4>
                    <div className="flex justify-center gap-4">
                        {newBadges.map(badge => (
                            <div key={badge.id} className="flex flex-col items-center p-2 bg-indigo-900/50 rounded-lg" title={badge.description}>
                                <span className="text-3xl">{badge.icon}</span>
                                <span className="text-xs font-semibold">{badge.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompletionFeedback;