import React, { useState, useContext, useCallback } from 'react';
import { UserDataContext } from '../context/UserDataContext';
import { generateLearningPlan } from '../services/geminiService';
import type { LearningPlan as TLearningPlan } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { FeatherIcon } from './icons/FeatherIcon';

type PlanState = 'setup' | 'loading' | 'plan' | 'error';
const proficiencyLevels = ['Beginner', 'Intermediate', 'Advanced'];
const learningGoals = ['General English Improvement', 'Business English', 'TOEIC Preparation', 'Travel Conversation'];

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-400"></div>
        <p className="text-slate-300">AIがあなたに合わせたプランを生成中です...</p>
    </div>
);

const SuggestionCard: React.FC<{ suggestion: TLearningPlan['suggestions'][0], setMode: (mode: any) => void }> = ({ suggestion, setMode }) => {
    const iconMap = {
        vocabulary: <SparklesIcon className="w-6 h-6 text-indigo-400"/>,
        reading: <BookOpenIcon className="w-6 h-6 text-indigo-400"/>,
        writing: <FeatherIcon className="w-6 h-6 text-indigo-400"/>
    };
    
    const typeMap = {
        vocabulary: '単語',
        reading: '長文読解',
        writing: '英作文'
    }

    return (
        <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    {iconMap[suggestion.type]}
                    <h4 className="text-lg font-bold text-cyan-300 capitalize">{typeMap[suggestion.type]}</h4>
                </div>
                <p className="text-slate-300 mb-1"><strong className="text-slate-100">フォーカス:</strong> {suggestion.category || suggestion.topic}</p>
                <p className="text-slate-300 italic">"{suggestion.reason}"</p>
            </div>
            <button 
                onClick={() => setMode(suggestion.type)}
                className="mt-4 w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors text-sm"
            >
                今すぐ始める
            </button>
        </div>
    );
};

const LearningPlan: React.FC<{ setMode: (mode: any) => void }> = ({ setMode }) => {
    const { userData, updatePreferences } = useContext(UserDataContext);
    const [planState, setPlanState] = useState<PlanState>('setup');
    const [plan, setPlan] = useState<TLearningPlan | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const handleGeneratePlan = useCallback(async () => {
        setPlanState('loading');
        setError(null);
        try {
            const response = await generateLearningPlan(userData.preferences, userData.logs);
            const jsonText = response.text.replace(/```json|```/g, '').trim();
            const data: TLearningPlan = JSON.parse(jsonText);
            setPlan(data);
            setPlanState('plan');
        } catch (e) {
            console.error(e);
            setError("プランの生成に失敗しました。AIがビジー状態の可能性があります。もう一度お試しください。");
            setPlanState('error');
        }
    }, [userData.preferences, userData.logs]);

    if(planState === 'loading') return <div className="h-full flex items-center justify-center"><LoadingSpinner /></div>;

    if(planState === 'plan' && plan) {
        return (
            <div className="animate-fade-in space-y-6">
                 <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <h2 className="text-2xl font-bold text-cyan-300 mb-2">今週のフォーカス</h2>
                    <p className="text-slate-300 max-w-2xl mx-auto">{plan.week_focus}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    {plan.suggestions.map((s, i) => (
                        <SuggestionCard key={i} suggestion={s} setMode={setMode} />
                    ))}
                </div>
                <div className="text-center mt-6">
                    <button onClick={handleGeneratePlan} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg">
                        新しいプランを生成
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-xl mx-auto text-center h-full flex flex-col justify-center animate-fade-in">
            <h2 className="text-3xl font-bold text-cyan-300 mb-4">学習プランを作成</h2>
            <p className="text-slate-400 mb-8">あなたについて教えてください。AIがパーソナライズされたプランを作成します。</p>
            
            <div className="space-y-6 text-left">
                <div>
                    <label htmlFor="level" className="block mb-2 font-semibold text-slate-300">現在の英語レベル:</label>
                    <select 
                        id="level" 
                        value={userData.preferences.level}
                        onChange={e => updatePreferences({ level: e.target.value })}
                        className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        {proficiencyLevels.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="goal" className="block mb-2 font-semibold text-slate-300">主な学習目標:</label>
                    <select 
                        id="goal" 
                        value={userData.preferences.learningGoal}
                        onChange={e => updatePreferences({ learningGoal: e.target.value })}
                        className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        {learningGoals.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
            </div>
            
            {error && <p className="text-red-400 mt-4">{error}</p>}

            <button 
                onClick={handleGeneratePlan} 
                className="w-full mt-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105 text-lg"
            >
                プランを生成
            </button>
        </div>
    );
};

export default LearningPlan;