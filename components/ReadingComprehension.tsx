
import React, { useState, useCallback, useContext } from 'react';
import { generateReadingQuiz, evaluateOpenAnswer } from '../services/geminiService';
import type { ReadingQuizContent, ReadingHistoryItem } from '../types';
import { useSound } from '../hooks/useSound';
import { UserDataContext } from '../context/UserDataContext';
import { XP_VALUES } from '../config/gamification';
import { BookOpenIcon } from './icons/BookOpenIcon';

type QuizState = 'selection' | 'loading' | 'active' | 'evaluating' | 'finished' | 'error';

const randomTopics = ['The History of Coffee', 'The Wonders of the Deep Sea', 'The Rise of Artificial Intelligence', 'Sustainable Urban Living', 'The Secrets of Ancient Civilizations', 'The Future of Space Exploration'];
const levels = ['Beginner (A2)', 'Intermediate (B1)', 'Advanced (C1)'];

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


const ReadingComprehension: React.FC = () => {
    const [quizState, setQuizState] = useState<QuizState>('selection');
    const [quizContent, setQuizContent] = useState<ReadingQuizContent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<string>(levels[1]);

    const [mcqAnswers, setMcqAnswers] = useState<(number | null)[]>([]);
    const [openAnswer, setOpenAnswer] = useState('');
    const [evaluationResult, setEvaluationResult] = useState<{ verdict: string; explanation: string; } | null>(null);

    const { addXpAndLog, addReadingHistory } = useContext(UserDataContext);
    const { playCorrect, playIncorrect, playSuccess } = useSound();

    const fetchQuiz = useCallback(async (level: string) => {
        setQuizState('loading');
        setError(null);
        setQuizContent(null);
        setMcqAnswers([]);
        setOpenAnswer('');
        setEvaluationResult(null);
        setSelectedLevel(level);

        try {
            const topic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
            const response = await generateReadingQuiz(topic, level);
            const jsonText = response.text;
            const data: ReadingQuizContent = JSON.parse(jsonText);
            
            if (!data.passage || !data.mcqs || !data.openQuestion) {
                throw new Error("AI response is missing required fields.");
            }

            setQuizContent(data);
            setMcqAnswers(Array(data.mcqs.length).fill(null)); // Dynamically set answers array
            setQuizState('active');
        } catch (e) {
            console.error(e);
            setError('クイズの生成に失敗しました。AIがビジー状態の可能性があります。もう一度お試しください。');
            setQuizState('error');
        }
    }, []);

    const handleMcqAnswer = (qIndex: number, aIndex: number) => {
        if (quizState !== 'active') return;
        setMcqAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[qIndex] = aIndex;
            return newAnswers;
        });

        if (navigator.vibrate) navigator.vibrate(50);
        if(quizContent?.mcqs[qIndex].correctAnswerIndex === aIndex) {
            playCorrect();
        } else {
            playIncorrect();
        }
    };

    const handleSubmit = async () => {
        if (!quizContent) return;
        setQuizState('evaluating');
        setError(null);
        try {
            const response = await evaluateOpenAnswer(quizContent.passage, quizContent.openQuestion.question, openAnswer);
            const jsonText = response.text;
            const result = JSON.parse(jsonText);
            setEvaluationResult(result);
            
            let mcqCorrectCount = 0;
            quizContent.mcqs.forEach((mcq, index) => {
                if (mcq.correctAnswerIndex === mcqAnswers[index]) {
                    mcqCorrectCount++;
                }
            });
            const openAnswerCorrect = result.verdict.toLowerCase() === 'correct';
            
            let xpEarned = mcqCorrectCount * XP_VALUES.READING_MCQ_CORRECT;
            if (openAnswerCorrect) {
                xpEarned += XP_VALUES.READING_OPEN_CORRECT;
            }

            addXpAndLog({
                type: 'reading',
                xp: xpEarned,
                details: {
                    topic: randomTopics[0], // Simplified for now
                    level: selectedLevel,
                    mcqScore: mcqCorrectCount,
                    mcqTotal: quizContent.mcqs.length,
                    openAnswerCorrect,
                }
            });
            
            const historyItem: ReadingHistoryItem = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                topic: randomTopics[0],
                level: selectedLevel,
                content: quizContent,
                userMcqAnswers: mcqAnswers,
                userOpenAnswer: openAnswer,
                evaluation: result,
            };
            addReadingHistory(historyItem);

            setQuizState('finished');
            playSuccess();
        } catch (e) {
            console.error(e);
            setError('回答の評価に失敗しました。もう一度お試しください。');
            setQuizState('active'); // Go back to active state
        }
    };
    
    const isMcqAnswered = (qIndex: number) => mcqAnswers[qIndex] !== null;

    if (quizState === 'selection') {
        return (
            <div className="animate-fade-in">
                <h2 className="text-3xl font-bold text-center text-cyan-300 mb-2">長文読解</h2>
                <p className="text-center text-slate-400 mb-8">挑戦したい難易度を選択してください。</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {levels.map(level => (
                        <LevelCard key={level} level={level} onClick={() => fetchQuiz(level)} />
                    ))}
                </div>
            </div>
        );
    }
    
    if (quizState === 'loading') return <div className="h-full flex items-center justify-center"><LoadingSpinner text="AIがクイズを作成中です..." /></div>;
    if (quizState === 'error') return <div className="text-center text-red-400">{error} <button onClick={() => setQuizState('selection')} className="ml-2 px-4 py-2 bg-indigo-600 rounded">戻る</button></div>;


    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <button onClick={() => setQuizState('selection')} disabled={quizState === 'evaluating'} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">
                    レベル選択に戻る
                </button>
            </div>
            {quizContent && (
                <div className="space-y-12 animate-fade-in">
                    <article>
                        <h2 className="text-2xl font-bold text-cyan-300 mb-4">長文</h2>
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{quizContent.passage}</p>
                    </article>
                    
                    <section>
                        <h3 className="text-xl font-semibold text-cyan-300 mb-4">選択問題</h3>
                        <div className="space-y-6">
                            {quizContent.mcqs.map((mcq, qIndex) => (
                                <div key={qIndex}>
                                    <p className="font-semibold mb-3 text-slate-200">{qIndex + 1}. {mcq.question}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {mcq.options.map((option, aIndex) => {
                                            const isSelected = mcqAnswers[qIndex] === aIndex;
                                            const isCorrect = mcq.correctAnswerIndex === aIndex;
                                            let buttonClass = 'bg-slate-700 hover:bg-slate-600';
                                            if (isMcqAnswered(qIndex) || quizState === 'finished') {
                                                if (isCorrect) buttonClass = 'bg-green-600/80 text-white';
                                                else if (isSelected) buttonClass = 'bg-red-600/80 text-white';
                                                else buttonClass = 'bg-slate-700/50 text-slate-400';
                                            }
                                            return (
                                                <button key={aIndex} onClick={() => handleMcqAnswer(qIndex, aIndex)} disabled={isMcqAnswered(qIndex) || quizState === 'finished'} className={`p-3 rounded-lg text-left transition-colors duration-200 ${buttonClass}`}>
                                                    {option}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                         <h3 className="text-xl font-semibold text-cyan-300 mb-4">記述問題</h3>
                         <p className="font-semibold mb-3 text-slate-200">{quizContent.openQuestion.question}</p>
                         <textarea
                            value={openAnswer}
                            onChange={(e) => setOpenAnswer(e.target.value)}
                            rows={4}
                            className="w-full p-3 bg-slate-700 rounded-md border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-700/50"
                            placeholder="ここに回答を入力してください..."
                            disabled={quizState === 'finished' || quizState === 'evaluating'}
                         />
                         {quizState !== 'finished' && (
                             <button onClick={handleSubmit} disabled={!openAnswer || quizState === 'evaluating' || !mcqAnswers.every(a => a !== null)} className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">
                                 {quizState === 'evaluating' ? '評価中...' : '提出して終了'}
                             </button>
                         )}
                    </section>
                    
                    {evaluationResult && quizState === 'finished' && (
                        <section className="p-4 rounded-lg bg-slate-700/50 animate-fade-in">
                            <h3 className="text-xl font-semibold mb-3 text-cyan-300">あなたの回答の評価</h3>
                            <p className={`font-bold text-lg mb-2 ${
                                evaluationResult.verdict.toLowerCase() === 'correct' ? 'text-green-400' :
                                evaluationResult.verdict.toLowerCase() === 'incorrect' ? 'text-red-400' : 'text-yellow-400'
                            }`}>{evaluationResult.verdict}</p>
                            <p className="text-slate-300">{evaluationResult.explanation}</p>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReadingComprehension;