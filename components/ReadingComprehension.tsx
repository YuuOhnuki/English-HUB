import React, { useState, useCallback, useContext } from 'react';
import { generateReadingQuiz, evaluateOpenAnswer } from '../services/geminiService';
import type { ReadingQuizContent, ReadingHistoryItem } from '../types';
import { useSound } from '../hooks/useSound';
import { UserDataContext, AddXpResult } from '../context/UserDataContext';
import { XP_VALUES } from '../config/gamification';
import { BookOpenIcon } from './icons/BookOpenIcon';
import CompletionFeedback from './CompletionFeedback';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';


type QuizState = 'selection' | 'loading' | 'active' | 'evaluating' | 'results' | 'finished' | 'error';

const randomTopics = ['The Psychology of Decision Making', 'The Impact of Globalization on Local Cultures', 'Breakthroughs in Renewable Energy', 'The Ethics of Artificial Intelligence', 'Historical Revisionism', 'The Future of Biotechnology'];
const levels = ['共通テスト', '難関私大', '難関国公立', '早慶レベル'];

const LoadingSpinner: React.FC<{text?: string}> = ({ text }) => (
    <div className="flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-400"></div>
        <p className="text-slate-300">{text || '読み込み中...'}</p>
    </div>
);

const LevelCard: React.FC<{ level: string, onClick: () => void }> = ({ level, onClick }) => (
    <button
        onClick={onClick}
        className="bg-slate-700/50 p-6 rounded-lg text-center transition-all duration-300 transform hover:scale-105 hover:bg-slate-700/80 border-2 border-slate-700 hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
        <BookOpenIcon className="w-10 h-10 mx-auto mb-3 text-indigo-400" />
        <h3 className="text-lg font-bold text-white">{level}</h3>
        <p className="text-sm text-slate-400 mt-1">このレベルのクイズを開始</p>
    </button>
);

interface ReadingComprehensionProps {
    onLevelUp: (newLevel: number) => void;
}

const ReadingComprehension: React.FC<ReadingComprehensionProps> = ({ onLevelUp }) => {
    const [quizState, setQuizState] = useState<QuizState>('selection');
    const [quizContent, setQuizContent] = useState<ReadingQuizContent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<string>(levels[0]);
    const [selectedTopic, setSelectedTopic] = useState<string>('');

    const [mcqAnswers, setMcqAnswers] = useState<(number | null)[]>([]);
    const [openAnswers, setOpenAnswers] = useState<string[]>([]);
    const [evaluations, setEvaluations] = useState<({ verdict: string; explanation: string; } | null)[]>([]);
    const [score, setScore] = useState<{ mcqCorrect: number; openCorrect: number; } | null>(null);
    const [completionData, setCompletionData] = useState<AddXpResult | null>(null);


    const { addXpAndLog, addReadingHistory } = useContext(UserDataContext);
    const { playCorrect, playIncorrect, playSuccess } = useSound();

    const fetchQuiz = useCallback(async (level: string) => {
        setQuizState('loading');
        setError(null);
        setQuizContent(null);
        setMcqAnswers([]);
        setOpenAnswers([]);
        setEvaluations([]);
        setScore(null);
        setCompletionData(null);
        setSelectedLevel(level);

        try {
            const topic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
            setSelectedTopic(topic);
            const response = await generateReadingQuiz(topic, level);
            const jsonText = response.text;
            const data: ReadingQuizContent = JSON.parse(jsonText);
            
            if (!data.passage || !data.mcqs || !data.openQuestions) {
                throw new Error("AI response is missing required fields.");
            }

            setQuizContent(data);
            setMcqAnswers(Array(data.mcqs.length).fill(null));
            setOpenAnswers(Array(data.openQuestions.length).fill(''));
            setQuizState('active');
        } catch (e) {
            console.error(e);
            setError('クイズの生成に失敗しました。AIがビジー状態の可能性があります。もう一度お試しください。');
            setQuizState('error');
        }
    }, []);

    const handleMcqAnswer = (qIndex: number, aIndex: number) => {
        if (quizState !== 'active') return;
        
        // Allow changing answer
        setMcqAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[qIndex] = aIndex;
            return newAnswers;
        });

        if (navigator.vibrate) navigator.vibrate(50);
    };

     const handleOpenAnswerChange = (qIndex: number, value: string) => {
        setOpenAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[qIndex] = value;
            return newAnswers;
        });
    };

    const handleSubmit = async () => {
        if (!quizContent) return;
        setQuizState('evaluating');
        setError(null);
        try {
            const evaluationPromises = quizContent.openQuestions.map((oq, index) => 
                evaluateOpenAnswer(quizContent.passage, oq.question, openAnswers[index])
            );

            const evaluationResponses = await Promise.all(evaluationPromises);
            const parsedEvaluations = evaluationResponses.map(res => JSON.parse(res.text));
            setEvaluations(parsedEvaluations);

            let mcqCorrectCount = 0;
            quizContent.mcqs.forEach((mcq, index) => {
                if (mcq.correctAnswerIndex === mcqAnswers[index]) {
                    mcqCorrectCount++;
                    playCorrect();
                } else {
                    playIncorrect();
                }
            });

            const openAnswerCorrectCount = parsedEvaluations.filter(ev => ev && ev.verdict.toLowerCase() === 'correct').length;
            
            setScore({ mcqCorrect: mcqCorrectCount, openCorrect: openAnswerCorrectCount });
            setQuizState('results');
            
        } catch (e) {
            console.error(e);
            setError('回答の評価に失敗しました。もう一度お試しください。');
            setQuizState('active'); // Go back to active state
        }
    };
    
    const handleFinishQuiz = () => {
        if (!quizContent || !score) return;

        let xpToEarn = score.mcqCorrect * XP_VALUES.READING_MCQ_CORRECT + score.openCorrect * XP_VALUES.READING_OPEN_CORRECT;
        const addXpResult = addXpAndLog({
            type: 'reading',
            xp: xpToEarn,
            details: {
                topic: selectedTopic,
                level: selectedLevel,
                mcqScore: score.mcqCorrect,
                mcqTotal: quizContent.mcqs.length,
                openCorrect: score.openCorrect,
                openTotal: quizContent.openQuestions.length,
            }
        });
        setCompletionData(addXpResult);
        if (addXpResult.leveledUp) {
            onLevelUp(addXpResult.newLevel);
        }
        
        const historyItem: ReadingHistoryItem = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            topic: selectedTopic,
            level: selectedLevel,
            content: quizContent,
            userMcqAnswers: mcqAnswers,
            userOpenAnswers: openAnswers,
            evaluations: evaluations,
        };
        addReadingHistory(historyItem);

        setQuizState('finished');
        playSuccess();
    };

    const allQuestionsAnswered = mcqAnswers.every(a => a !== null) && openAnswers.every(a => a.trim() !== '');
    const isSubmittable = (quizContent?.openQuestions.length ?? 0) > 0 ? allQuestionsAnswered : mcqAnswers.every(a => a !== null);
    
    if (quizState === 'selection') {
        return (
            <div className="animate-fade-in">
                <h2 className="text-3xl font-bold text-center text-cyan-300 mb-2">長文読解</h2>
                <p className="text-center text-slate-400 mb-8">挑戦したい難易度を選択してください。</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {levels.map(level => (
                        <LevelCard key={level} level={level} onClick={() => fetchQuiz(level)} />
                    ))}
                </div>
            </div>
        );
    }
    
    if (quizState === 'loading') return <div className="h-full flex items-center justify-center"><LoadingSpinner text="AIがクイズを作成中です..." /></div>;
    if (quizState === 'error') return <div className="text-center text-red-400">{error} <button onClick={() => setQuizState('selection')} className="ml-2 px-4 py-2 bg-indigo-600 rounded">戻る</button></div>;
    if (quizState === 'evaluating') return <div className="h-full flex items-center justify-center"><LoadingSpinner text="AIが回答を評価中です..." /></div>;
    

    if (quizState === 'results' && quizContent && score) {
        return (
            <div className="space-y-8 animate-fade-in">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-cyan-300">結果</h2>
                    <p className="text-slate-300">MCQ: {score.mcqCorrect}/{quizContent.mcqs.length} | 記述: {score.openCorrect}/{quizContent.openQuestions.length}</p>
                </div>
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                    {quizContent.mcqs.length > 0 && (
                        <section>
                            <h3 className="text-xl font-semibold text-cyan-300 mb-4">選択問題</h3>
                            {quizContent.mcqs.map((mcq, qIndex) => {
                                const userAnswerIndex = mcqAnswers[qIndex];
                                const isCorrect = mcq.correctAnswerIndex === userAnswerIndex;
                                return (
                                <div key={qIndex} className={`p-4 rounded-lg border-l-4 ${isCorrect ? 'bg-green-900/30 border-green-500' : 'bg-red-900/30 border-red-500'}`}>
                                    <p className="font-semibold mb-3 text-slate-200">{qIndex + 1}. {mcq.question}</p>
                                    <p>あなたの回答: <span className="font-medium">{userAnswerIndex !== null ? mcq.options[userAnswerIndex] : '未回答'}</span> {isCorrect ? <CheckIcon className="inline w-5 h-5 text-green-400"/> : <XIcon className="inline w-5 h-5 text-red-400"/>}</p>
                                    {!isCorrect && <p className="mt-1">正解: <span className="font-medium">{mcq.options[mcq.correctAnswerIndex]}</span></p>}
                                </div>
                                )
                            })}
                        </section>
                    )}
                    {quizContent.openQuestions.length > 0 && (
                        <section>
                             <h3 className="text-xl font-semibold text-cyan-300 mb-4">記述問題</h3>
                              {quizContent.openQuestions.map((oq, qIndex) => (
                                <div key={qIndex} className="p-4 rounded-lg bg-slate-800/50 mb-4">
                                    <p className="font-semibold mb-2 text-slate-200">{qIndex + 1}. {oq.question}</p>
                                    <p className="text-slate-300 italic mb-3">あなたの回答: "{openAnswers[qIndex]}"</p>
                                    {evaluations[qIndex] && (
                                         <div className="mt-2 pt-2 border-t border-slate-700">
                                            <p className={`font-bold text-lg ${evaluations[qIndex]!.verdict.toLowerCase() === 'correct' ? 'text-green-400' : 'text-yellow-400'}`}>{evaluations[qIndex]!.verdict}</p>
                                            <p className="text-slate-400 text-sm">{evaluations[qIndex]!.explanation}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </section>
                    )}
                </div>
                <button onClick={handleFinishQuiz} className="mt-6 px-6 py-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105">
                    完了してXPを獲得
                </button>
            </div>
        )
    }

    if (quizState === 'finished') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-full max-w-2xl mx-auto p-8 bg-slate-700/50 rounded-lg flex flex-col items-center gap-4 animate-bounce-in">
                     <h2 className="text-3xl font-bold text-cyan-400">クイズ完了！</h2>
                     {completionData && (
                        <CompletionFeedback
                            xpEarned={completionData.xpEarned}
                            unlockedBadges={completionData.unlockedBadges}
                        />
                    )}
                    <div className="flex gap-4 mt-4">
                        <button onClick={() => fetchQuiz(selectedLevel)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105">
                           同じレベルで再挑戦
                        </button>
                         <button onClick={() => setQuizState('selection')} className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105">
                            レベル選択へ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                {/* FIX: Removed redundant disabled check. This view is not rendered during evaluation. */}
                <button onClick={() => setQuizState('selection')} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">
                    レベル選択に戻る
                </button>
            </div>
            {quizContent && (
                <div className="space-y-12 animate-fade-in">
                    <article>
                        <h2 className="text-2xl font-bold text-cyan-300 mb-4">長文</h2>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{quizContent.passage}</p>
                    </article>
                    
                    {quizContent.mcqs.length > 0 && (
                        <section>
                            <h3 className="text-xl font-semibold text-cyan-300 mb-4">選択問題</h3>
                            <div className="space-y-6">
                                {quizContent.mcqs.map((mcq, qIndex) => (
                                    <div key={qIndex}>
                                        <p className="font-semibold mb-3 text-slate-200">{qIndex + 1}. {mcq.question}</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {mcq.options.map((option, aIndex) => {
                                                const isSelected = mcqAnswers[qIndex] === aIndex;
                                                return (
                                                    <button key={aIndex} onClick={() => handleMcqAnswer(qIndex, aIndex)} className={`p-3 rounded-lg text-left transition-colors duration-200 ${isSelected ? 'bg-indigo-500 text-white ring-2 ring-indigo-300' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                                        {option}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {quizContent.openQuestions.length > 0 && (
                         <section>
                             <h3 className="text-xl font-semibold text-cyan-300 mb-4">記述問題</h3>
                             <div className="space-y-6">
                                {quizContent.openQuestions.map((oq, qIndex) => (
                                    <div key={qIndex}>
                                        <p className="font-semibold mb-3 text-slate-200">{qIndex + 1}. {oq.question}</p>
                                        <textarea
                                            value={openAnswers[qIndex]}
                                            onChange={(e) => handleOpenAnswerChange(qIndex, e.target.value)}
                                            rows={4}
                                            className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-700/50"
                                            placeholder="ここに回答を入力してください..."
                                            // FIX: Removed redundant disabled check. This view is not rendered during evaluation.
                                        />
                                    </div>
                                ))}
                             </div>
                         </section>
                    )}

                    <button
                        onClick={handleSubmit}
                        // FIX: Removed redundant check for 'evaluating' state, as it's unreachable here and causes a type error.
                        disabled={!isSubmittable}
                        className="mt-4 px-6 py-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed"
                    >
                        {/* FIX: Removed redundant check for 'evaluating' state. */}
                        提出して採点
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReadingComprehension;
