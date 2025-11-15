import React, { useContext, useMemo, useState } from 'react';
import { UserDataContext } from '../context/UserDataContext';
// FIX: Import `XP_VALUES` to use for daily mission completion bonus.
import { XP_PER_LEVEL, BADGES, XP_VALUES } from '../config/gamification';
import type { UserGoal, ReadingHistoryItem, DailyMission, Badge } from '../types';
import { AllVocabWords } from './VocabularyQuiz'; // Import the flat list
import LearningPlan from './LearningPlan';

const StatCard: React.FC<{ label: string; value: string | number; icon: string; }> = ({ label, value, icon }) => (
    <div className="bg-slate-700/50 p-4 rounded-lg text-center">
        <div className="text-3xl mb-2">{icon}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-slate-400">{label}</div>
    </div>
);

const BadgeModal: React.FC<{ badge: Badge, onClose: () => void }> = ({ badge, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center animate-bounce-in shadow-lg max-w-xs mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-6xl mb-4">{badge.icon}</div>
            <h3 className="text-2xl font-bold text-cyan-300 mb-2">{badge.name}</h3>
            <p className="text-slate-300 mb-4">{badge.description}</p>
            <button onClick={onClose} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors">
                閉じる
            </button>
        </div>
    </div>
);

const BadgeDisplay: React.FC<{ earnedBadges: string[] }> = ({ earnedBadges }) => {
    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
    return (
        <>
            {selectedBadge && <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {BADGES.map(badge => {
                    const isEarned = earnedBadges.includes(badge.id);
                    return (
                        <button 
                            key={badge.id} 
                            onClick={() => setSelectedBadge(badge)}
                            className={`p-3 rounded-lg flex flex-col items-center gap-2 text-center transition-all duration-200 ${isEarned ? 'bg-indigo-900/50 opacity-100 transform hover:scale-105' : 'bg-slate-700/50 opacity-50'}`}
                        >
                            <div className="text-4xl">{badge.icon}</div>
                            <div className="text-xs font-semibold text-white">{badge.name}</div>
                        </button>
                    );
                })}
            </div>
        </>
    );
};

const ActivityCalendar: React.FC<{ logs: { date: string }[] }> = ({ logs }) => {
    const activityByDay = useMemo(() => {
        const map = new Map<string, number>();
        logs.forEach(log => {
            const date = new Date(log.date).toISOString().split('T')[0];
            map.set(date, (map.get(date) || 0) + 1);
        });
        return map;
    }, [logs]);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 34); // Approx 5 weeks

    const days = [];
    let day = new Date(startDate);
    while (day <= endDate) {
        days.push(new Date(day));
        day.setDate(day.getDate() + 1);
    }
    
    const [tooltip, setTooltip] = useState<{ content: string; top: number; left: number; } | null>(null);

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, dateString: string, count: number) => {
        const target = e.currentTarget;
        setTooltip({
            content: `${dateString}: ${count} アクティビティ`,
            top: target.offsetTop,
            left: target.offsetLeft + (target.offsetWidth / 2),
        });
    };
    const handleMouseLeave = () => { setTooltip(null); };

    return (
        <div className="relative"> {/* Positioning context for the tooltip */}
            <div className="flex flex-wrap gap-1.5 justify-center">
                {days.map(d => {
                    const dateString = d.toISOString().split('T')[0];
                    const count = activityByDay.get(dateString) || 0;
                    let bgColor = 'bg-slate-700';
                    if (count > 0) bgColor = 'bg-green-800';
                    if (count > 2) bgColor = 'bg-green-600';
                    if (count > 5) bgColor = 'bg-green-400';

                    return <div 
                                key={dateString} 
                                className={`w-4 h-4 rounded-sm ${bgColor}`} 
                                onMouseEnter={(e) => handleMouseEnter(e, dateString, count)}
                                onMouseLeave={handleMouseLeave}
                            />;
                })}
            </div>
            {tooltip && (
                <div 
                    className="absolute z-10 p-2 text-xs text-white bg-slate-900 border border-slate-600 rounded-md shadow-lg pointer-events-none"
                    style={{ 
                        top: tooltip.top,
                        left: tooltip.left,
                        transform: 'translate(-50%, -125%)',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
};

const VocabNotebook: React.FC = () => {
    const { userData } = useContext(UserDataContext);
    const [filter, setFilter] = useState<'all' | 'learning' | 'mastered'>('all');

    const filteredWords = useMemo(() => {
        return AllVocabWords.filter(vocab => {
            if (filter === 'all') return true;
            const status = userData.wordMemory[vocab.word]?.status;
            if (filter === 'learning') return status !== 'mastered';
            if (filter === 'mastered') return status === 'mastered';
            return false;
        }).sort((a, b) => a.word.localeCompare(b.word));
    }, [filter, userData.wordMemory]);
    
    const getStatusLabel = (word: string) => {
        const status = userData.wordMemory[word]?.status;
        if (status === 'mastered') {
            return <span className="text-xs font-semibold text-green-400 bg-green-900/50 px-2 py-1 rounded-full">習得済み</span>;
        }
        return <span className="text-xs font-semibold text-yellow-400 bg-yellow-900/50 px-2 py-1 rounded-full">学習中</span>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-center gap-2 p-1 bg-slate-700/50 rounded-lg">
                <button onClick={() => setFilter('all')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${filter === 'all' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-600'}`}>すべて</button>
                <button onClick={() => setFilter('learning')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${filter === 'learning' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-600'}`}>学習中</button>
                <button onClick={() => setFilter('mastered')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${filter === 'mastered' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-600'}`}>習得済み</button>
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                {filteredWords.length > 0 ? filteredWords.map(vocab => (
                    <div key={vocab.word} className="flex justify-between items-center p-3 bg-slate-800 rounded-md">
                        <div>
                            <p className="font-bold text-slate-100">{vocab.word}</p>
                            <p className="text-sm text-slate-400">{vocab.correctAnswer}</p>
                        </div>
                        {getStatusLabel(vocab.word)}
                    </div>
                )) : <p className="text-center text-slate-400 py-4">このカテゴリの単語はありません。</p>}
            </div>
        </div>
    )
}

const ReadingHistory: React.FC = () => {
    const { userData } = useContext(UserDataContext);
    const { readingHistory } = userData;
    const [selectedItem, setSelectedItem] = useState<ReadingHistoryItem | null>(null);

    if (selectedItem) {
        const { content, userMcqAnswers, userOpenAnswers, evaluations } = selectedItem;
        return (
            <div className="space-y-6 animate-fade-in max-h-[500px] overflow-y-auto pr-2">
                <button onClick={() => setSelectedItem(null)} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg sticky top-0 z-10">&larr; 履歴一覧に戻る</button>
                <article>
                    <h2 className="text-2xl font-bold text-cyan-300 mb-4">{selectedItem.topic} ({selectedItem.level})</h2>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{content.passage}</p>
                </article>
                {content.mcqs.length > 0 && (
                    <section>
                        <h3 className="text-xl font-semibold text-cyan-300 mb-4">選択問題</h3>
                        <div className="space-y-6">
                            {content.mcqs.map((mcq, qIndex) => {
                                const userAnswerIndex = userMcqAnswers[qIndex];
                                const isCorrect = mcq.correctAnswerIndex === userAnswerIndex;
                                return (
                                    <div key={qIndex} className="p-3 bg-slate-800 rounded-lg">
                                        <p className="font-semibold mb-2 text-slate-200">{qIndex + 1}. {mcq.question}</p>
                                        <p className={`border-l-4 pl-3 ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                                            あなたの回答: <span className="font-medium">{userAnswerIndex !== null ? mcq.options[userAnswerIndex] : '未回答'}</span>
                                        </p>
                                        {!isCorrect && <p className="border-l-4 border-cyan-500 pl-3 mt-1">正解: <span className="font-medium">{mcq.options[mcq.correctAnswerIndex]}</span></p>}
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}
                {content.openQuestions.length > 0 && (
                    <section>
                         <h3 className="text-xl font-semibold text-cyan-300 mb-2">記述問題</h3>
                         <div className="space-y-4">
                            {content.openQuestions.map((oq, qIndex) => (
                                 <div key={qIndex} className="p-3 bg-slate-800 rounded-lg">
                                    <p className="font-semibold mb-2 text-slate-200">{qIndex + 1}. {oq.question}</p>
                                    <p className="text-slate-300 italic mb-2">あなたの回答: "{userOpenAnswers[qIndex]}"</p>
                                    {evaluations[qIndex] && (
                                         <div className="mt-2 pt-2 border-t border-slate-700">
                                            <p className={`font-bold text-lg ${evaluations[qIndex]!.verdict.toLowerCase() === 'correct' ? 'text-green-400' : 'text-yellow-400'}`}>{evaluations[qIndex]!.verdict}</p>
                                            <p className="text-slate-400 text-sm">{evaluations[qIndex]!.explanation}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                         </div>
                    </section>
                )}
            </div>
        )
    }

    return (
         <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
            {readingHistory.length > 0 ? readingHistory.map(item => (
                <button key={item.id} onClick={() => setSelectedItem(item)} className="w-full text-left p-4 bg-slate-800 rounded-lg hover:bg-slate-700/50 transition-colors">
                    <p className="font-bold text-slate-200">{item.topic} <span className="text-sm font-normal text-slate-400">({item.level})</span></p>
                    <p className="text-xs text-slate-500">{new Date(item.date).toLocaleString('ja-JP')}</p>
                </button>
            )) : <p className="text-center text-slate-400 py-8">まだ完了した読解クイズはありません。</p>}
        </div>
    )
}

const DailyMissionCard: React.FC<{ mission: DailyMission | null }> = ({ mission }) => {
    if (!mission) {
        return (
            <div className="p-4 bg-slate-700/30 rounded-lg text-center">
                <h3 className="text-lg font-semibold text-cyan-300 mb-2">今日のミッション</h3>
                <p className="text-slate-400">ミッションを読み込み中...</p>
            </div>
        );
    }

    const progressPercent = mission.completed ? 100 : Math.min((mission.progress / mission.target) * 100, 100);

    return (
        <div className="p-4 bg-slate-700/30 rounded-lg">
            <h3 className="text-lg font-semibold text-center text-cyan-300 mb-4">今日のミッション</h3>
            {mission.completed ? (
                <div className="text-center">
                    <p className="text-2xl mb-2">✅</p>
                    <p className="font-semibold text-green-400">ミッション完了！</p>
                    <p className="text-slate-400 text-sm">+{XP_VALUES.DAILY_MISSION_COMPLETE} XPボーナスを獲得しました！</p>
                </div>
            ) : (
                <div>
                    <p className="text-center text-slate-300 mb-2">{mission.description}</p>
                    <div className="flex items-center gap-4">
                        <div className="w-full bg-slate-700 rounded-full h-3 flex-grow">
                            <div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <span className="text-sm font-semibold text-slate-400">{Math.min(mission.progress, mission.target)} / {mission.target}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

type SetMode = (mode: 'vocabulary' | 'reading' | 'writing' | 'profile') => void;

const Profile: React.FC<{ setMode: SetMode }> = ({ setMode }) => {
    const { userData, setGoal } = useContext(UserDataContext);
    const { level, xp, logs, badges, goal } = userData;
    const [tab, setTab] = useState<'stats' | 'notebook' | 'history' | 'badges' | 'plan'>('stats');

    const xpForCurrentLevel = xp % XP_PER_LEVEL;
    const progressPercent = (xpForCurrentLevel / XP_PER_LEVEL) * 100;

    const stats = useMemo(() => {
        const vocabLogs = logs.filter(l => l.type === 'vocabulary');
        const totalCorrectAnswers = Object.values(userData.wordMemory).filter(w => w.status === 'mastered').length;
        
        const readingLogs = logs.filter(l => l.type === 'reading');
        const mcqCorrect = readingLogs.reduce((sum, log) => sum + (log.details.mcqScore || 0), 0);
        const mcqTotal = readingLogs.reduce((sum, log) => sum + (log.details.mcqTotal || 0), 0);
        
        const writingLogs = logs.filter(l => l.type === 'writing');
        
        const accuracy = mcqTotal > 0 ? ((mcqCorrect / mcqTotal) * 100).toFixed(1) + '%' : 'N/A';
        
        return {
            wordsMastered: totalCorrectAnswers,
            quizzesCompleted: vocabLogs.length + readingLogs.length,
            essaysReviewed: writingLogs.length,
            accuracy,
        }
    }, [logs, userData.wordMemory]);
    
    const handleSetGoal = () => {
        const newGoal: UserGoal = {
            type: 'xp',
            target: 2000,
            timeframe: 'weekly',
            startDate: new Date().toISOString()
        };
        setGoal(newGoal);
    }
    
    const goalProgress = useMemo(() => {
        if (!goal) return null;
        const currentProgressInTimeframe = logs
            .filter(log => new Date(log.date) >= new Date(goal.startDate))
            .reduce((sum, log) => sum + log.xp, 0);

        return Math.min((currentProgressInTimeframe / goal.target) * 100, 100);
    }, [goal, logs]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-700/30 rounded-lg">
                <div className="text-6xl font-bold bg-gradient-to-tr from-indigo-500 to-cyan-400 text-transparent bg-clip-text h-24 w-24 flex items-center justify-center border-4 border-indigo-500/50 rounded-full">
                    {level}
                </div>
                <div className="w-full">
                    <div className="flex justify-between items-baseline mb-1">
                        <h2 className="text-xl font-bold text-white">レベル {level}</h2>
                        <p className="text-sm text-slate-400">{xpForCurrentLevel} / {XP_PER_LEVEL} XP</p>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-4">
                        <div className="bg-indigo-500 h-4 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>
            </div>
            
             <div className="flex justify-center border-b border-slate-700 overflow-x-auto">
                <button onClick={() => setTab('stats')} className={`flex-shrink-0 px-4 py-2 text-md font-semibold ${tab === 'stats' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}>統計</button>
                <button onClick={() => setTab('notebook')} className={`flex-shrink-0 px-4 py-2 text-md font-semibold ${tab === 'notebook' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}>単語帳</button>
                <button onClick={() => setTab('history')} className={`flex-shrink-0 px-4 py-2 text-md font-semibold ${tab === 'history' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}>読解履歴</button>
                <button onClick={() => setTab('badges')} className={`flex-shrink-0 px-4 py-2 text-md font-semibold ${tab === 'badges' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}>バッジ</button>
                <button onClick={() => setTab('plan')} className={`flex-shrink-0 px-4 py-2 text-md font-semibold ${tab === 'plan' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400'}`}>学習プラン</button>
            </div>

            {tab === 'stats' && (
                <div className="space-y-8 animate-fade-in">
                    <DailyMissionCard mission={userData.dailyMission} />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="習得した単語" value={stats.wordsMastered} icon="📚" />
                        <StatCard label="完了したクイズ" value={stats.quizzesCompleted} icon="🧠" />
                        <StatCard label="添削済みの作文" value={stats.essaysReviewed} icon="✍️" />
                        <StatCard label="クイズ正答率" value={stats.accuracy} icon="🎯" />
                    </div>
                    
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                        <h3 className="text-lg font-semibold text-center text-cyan-300 mb-4">週の目標</h3>
                        {!goal ? (
                            <div className="text-center">
                                <p className="text-slate-400 mb-4">今週の目標が設定されていません。</p>
                                <button onClick={handleSetGoal} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">目標を設定</button>
                            </div>
                        ) : (
                             <div>
                                <p className="text-center text-slate-300 mb-2">目標: {goal.target} XP</p>
                                <div className="w-full bg-slate-700 rounded-full h-3">
                                    <div className="bg-green-500 h-3 rounded-full" style={{ width: `${goalProgress}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-700/30 rounded-lg">
                        <h3 className="text-lg font-semibold text-center text-cyan-300 mb-4">アクティビティ</h3>
                        <ActivityCalendar logs={logs} />
                    </div>
                </div>
            )}

            {tab === 'notebook' && (
                 <div className="animate-fade-in">
                    <VocabNotebook />
                 </div>
            )}

            {tab === 'history' && (
                 <div className="animate-fade-in">
                    <ReadingHistory />
                 </div>
            )}
            
            {tab === 'badges' && (
                 <div className="animate-fade-in">
                    <BadgeDisplay earnedBadges={badges} />
                 </div>
            )}

            {tab === 'plan' && (
                 <div className="animate-fade-in">
                    <LearningPlan setMode={setMode} />
                 </div>
            )}
            
        </div>
    );
};

export default Profile;