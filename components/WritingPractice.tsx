import React, { useState, useCallback, useContext } from 'react';
import { getWritingFeedback } from '../services/geminiService';
import { UserDataContext, AddXpResult } from '../context/UserDataContext';
import { XP_VALUES } from '../config/gamification';
import CompletionFeedback from './CompletionFeedback';

type WritingState = 'idle' | 'loading' | 'feedback' | 'error';

const topics = [
  "Describe a memorable trip you have taken.",
  "What is your favorite hobby and why do you enjoy it?",
  "Discuss the advantages and disadvantages of social media.",
  "If you could have any superpower, what would it be and why?",
  "Write about a person who has had a significant influence on your life."
];

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-400"></div>
        <p className="text-slate-300">AIがエッセイをレビュー中です...</p>
    </div>
);

interface WritingPracticeProps {
    onLevelUp: (newLevel: number) => void;
}

const WritingPractice: React.FC<WritingPracticeProps> = ({ onLevelUp }) => {
    const [state, setState] = useState<WritingState>('idle');
    const [topic, setTopic] = useState(topics[0]);
    const [essay, setEssay] = useState('');
    const [feedback, setFeedback] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [completionData, setCompletionData] = useState<AddXpResult | null>(null);
    const { addXpAndLog } = useContext(UserDataContext);
    
    const selectNewTopic = () => {
        const newTopic = topics[Math.floor(Math.random() * topics.length)];
        setTopic(newTopic);
        setEssay('');
        setFeedback('');
        setCompletionData(null);
        setState('idle');
    }

    const handleSubmit = useCallback(async () => {
        if (!essay.trim()) {
            setError("提出前に何か文章を書いてください。");
            return;
        }
        setState('loading');
        setError(null);
        setCompletionData(null);
        try {
            const response = await getWritingFeedback(topic, essay);
            setFeedback(response.text);
            
            const result = addXpAndLog({
                type: 'writing',
                xp: XP_VALUES.WRITING_SUBMIT,
                details: { topic, wordCount: essay.trim().split(/\s+/).length }
            });
            setCompletionData(result);
            if (result.leveledUp) {
                onLevelUp(result.newLevel);
            }

            setState('feedback');
        } catch(e) {
            console.error(e);
            setError("申し訳ありません、フィードバックの取得中にエラーが発生しました。もう一度お試しください。");
            setState('error');
        }
    }, [topic, essay, addXpAndLog, onLevelUp]);

    const renderFeedback = () => {
      if(!feedback) return null;
      const html = feedback
        .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-cyan-300 mt-4 mb-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-cyan-200 mt-6 mb-3">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-indigo-300">$1</strong>')
        .replace(/^\* (.*$)/gim, '<li class="ml-5 list-disc">$1</li>')
        .replace(/\n/g, '<br />')
        .replace(/<br \/>(<li)/g, '$1'); 

      return (
        <div className="prose prose-invert prose-p:text-slate-300 prose-li:text-slate-300" dangerouslySetInnerHTML={{ __html: html }} />
      );
    }
    
    return (
        <div className="flex flex-col h-full">
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
                <h2 className="text-xl font-bold text-cyan-300 flex-shrink-0">あなたのトピック:</h2>
                <p className="flex-grow p-3 bg-slate-700/50 rounded-lg text-slate-200 text-center sm:text-left">{topic}</p>
                <button onClick={selectNewTopic} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors w-full sm:w-auto">
                    新しいトピック
                </button>
            </div>
            
            <div className="flex-grow flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/2 flex flex-col">
                     <textarea
                        value={essay}
                        onChange={(e) => setEssay(e.target.value)}
                        className="w-full flex-grow p-4 bg-slate-900 rounded-md border border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200 leading-relaxed disabled:opacity-70"
                        placeholder="ここにエッセイを書き始めてください..."
                        rows={15}
                        disabled={state === 'loading'}
                    />
                    <button 
                        onClick={handleSubmit} 
                        disabled={!essay || state === 'loading'}
                        className="w-full mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed text-lg"
                    >
                        {state === 'loading' ? 'フィードバックを取得中...' : 'フィードバックをもらう'}
                    </button>
                </div>

                <div className="w-full md:w-1/2 p-4 bg-slate-900/80 rounded-lg border border-slate-700 flex items-center justify-center min-h-[300px]">
                    {state === 'loading' && <LoadingSpinner />}
                    {state === 'error' && <p className="text-red-400">{error}</p>}
                    {(state === 'idle' || (state==='error' && !feedback)) && <p className="text-slate-500">フィードバックはここに表示されます。</p>}
                    {state === 'feedback' && (
                        <div className="w-full h-full overflow-y-auto space-y-4">
                            {completionData && (
                                <div className="p-4 mb-4 bg-slate-800 rounded-lg">
                                    <CompletionFeedback
                                        xpEarned={completionData.xpEarned}
                                        unlockedBadges={completionData.unlockedBadges}
                                    />
                                </div>
                            )}
                            <h2 className="text-2xl font-bold text-cyan-200">AIからのフィードバック</h2>
                            {renderFeedback()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WritingPractice;