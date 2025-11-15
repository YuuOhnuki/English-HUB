import React, { useState, useMemo, useCallback, useContext, useEffect } from 'react';
import type { VocabQuestion } from '../types';
import { useSound } from '../hooks/useSound';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { UserDataContext, AddXpResult } from '../context/UserDataContext';
import { XP_VALUES } from '../config/gamification';
import { SparklesIcon } from './icons/SparklesIcon';
import CompletionFeedback from './CompletionFeedback';
import { generateDistractors } from '../services/geminiService';

// Helper to shuffle arrays
const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const IN_PROGRESS_QUIZ_KEY = 'inProgressQuizSession';


const vocabList: Record<string, VocabQuestion[]> = {
  '英単語 - 基本': [
    { word: 'evidence', correctAnswer: '証拠', options: ['証拠', '仮説', '主張', '推測'] },
    { word: 'determine', correctAnswer: '決定する', options: ['決定する', '提案する', '影響する', '評価する'] },
    { word: 'provide', correctAnswer: '提供する', options: ['提供する', '要求する', '消費する', '予約する'] },
    { word: 'increase', correctAnswer: '増加する', options: ['増加する', '安定させる', '交換する', '分配する'] },
    { word: 'consider', correctAnswer: '考慮する', options: ['考慮する', '主張する', '命令する', '却下する'] },
    { word: 'develop', correctAnswer: '開発する', options: ['開発する', '維持する', '模倣する', '縮小する'] },
    { word: 'ability', correctAnswer: '能力', options: ['能力', '義務', '意図', '習慣'] },
    { word: 'community', correctAnswer: '地域社会', options: ['地域社会', '個人の集団', '国際機関', '仮想空間'] },
    { word: 'knowledge', correctAnswer: '知識', options: ['知識', '信念', '憶測', '感情'] },
    { word: 'environment', correctAnswer: '環境', options: ['環境', '遺伝', '資源', '人口'] },
    { word: 'necessary', correctAnswer: '必要な', options: ['必要な', '選択的な', '追加的な', '理想的な'] },
    { word: 'opportunity', correctAnswer: '機会', options: ['機会', '制約', '義務', '保証'] },
    { word: 'purpose', correctAnswer: '目的', options: ['目的', '手段', '偶然', '過程'] },
    { word: 'relationship', correctAnswer: '関係', options: ['関係', '接触', '分離', '契約'] },
    { word: 'technology', correctAnswer: '科学技術', options: ['科学技術', '手作業', '伝統', '理論'] },
  ],
  '英単語 - 標準': [
    { word: 'significant', correctAnswer: '重要な', options: ['重要な', '表面的な', '偶発的な', '二次的な'] },
    { word: 'consequence', correctAnswer: '結果', options: ['結果', '前提', '例外', '動機'] },
    { word: 'essential', correctAnswer: '不可欠な', options: ['不可欠な', '望ましい', '交換可能な', '補足的な'] },
    { word: 'sufficient', correctAnswer: '十分な', options: ['十分な', '最適な', '豊富な', '最低限の'] },
    { word: 'phenomenon', correctAnswer: '現象', options: ['現象', '原則', '仮説', '異常'] },
    { word: 'sophisticated', correctAnswer: '洗練された', options: ['洗練された', '高価な', '伝統的な', '複雑な'] },
    { word: 'vulnerable', correctAnswer: '脆弱な', options: ['脆弱な', '敏感な', '不安定な', '孤立した'] },
    { word: 'sustainable', correctAnswer: '持続可能な', options: ['持続可能な', '利益の出る', '環境に優しい', '再生可能な'] },
    { word: 'controversial', correctAnswer: '物議を醸す', options: ['物議を醸す', '不人気な', '否定的な', '未解決の'] },
    { word: 'comprehensive', correctAnswer: '包括的な', options: ['包括的な', '詳細な', '全体的な', '完全な'] },
    { word: 'legitimate', correctAnswer: '正当な', options: ['正当な', '伝統的な', '一般的な', '公式な'] },
    { word: 'simultaneously', correctAnswer: '同時に', options: ['同時に', '効率的に', '連続的に', '正確に'] },
    { word: 'indispensable', correctAnswer: '不可欠な', options: ['不可欠な', '非常に重要な', '代替不可能な', '価値のある'] },
    { word: 'facilitate', correctAnswer: '促進する', options: ['促進する', '許可する', '単純化する', '支援する'] },
    { word: 'implement', correctAnswer: '実行する', options: ['実行する', '導入する', '適用する', '強制する'] },
  ],
   '英単語 - 難関': [
    { word: 'ubiquitous', correctAnswer: '遍在する', options: ['遍在する', '人気のある', '一般的な', 'アクセス可能な'] },
    { word: 'plausible', correctAnswer: 'もっともらしい', options: ['もっともらしい', '可能性のある', '論理的な', '説得力のある'] },
    { word: 'ambiguous', correctAnswer: '曖昧な', options: ['曖昧な', '不明確な', '複雑な', '多義的な'] },
    { word: 'empirical', correctAnswer: '経験的な', options: ['経験的な', '実践的な', '観察に基づいた', '実験的な'] },
    { word: 'mitigate', correctAnswer: '和らげる', options: ['和らげる', '減少させる', '抑制する', '解決する'] },
    { word: 'proliferate', correctAnswer: '増殖する', options: ['増殖する', '拡大する', '普及する', '増加する'] },
    { word: 'ephemeral', correctAnswer: 'つかの間の', options: ['つかの間の', '短期的な', 'はかない', '一時的な'] },
    { word: 'acquiesce', correctAnswer: '黙認する', options: ['黙認する', '同意する', '服従する', '譲歩する'] },
    { word: 'conundrum', correctAnswer: '難問', options: ['難問', '謎', 'ジレンマ', '矛盾'] },
    { word: 'exacerbate', correctAnswer: '悪化させる', options: ['悪化させる', '強調する', '複雑にする', '増幅する'] },
    { word: 'idiosyncrasy', correctAnswer: '特異性', options: ['特異性', '癖', '奇行', '特徴'] },
    { word: 'juxtaposition', correctAnswer: '並置', options: ['並置', '対比', '比較', '配置'] },
    { word: 'ostracize', correctAnswer: '追放する', options: ['追放する', '無視する', '排斥する', '孤立させる'] },
    { word: 'quintessential', correctAnswer: '典型的な', options: ['典型的な', '理想的な', '究極の', '模範的な'] },
    { word: 'vociferous', correctAnswer: '大声で叫ぶ', options: ['大声で叫ぶ', '騒々しい', '熱烈な', '激しい'] },
  ],
  '英熟語 - 基本': [
    { word: 'look forward to', correctAnswer: '〜を楽しみに待つ', options: ['〜を楽しみに待つ', '〜を期待する', '〜を計画する', '〜を予期する'] },
    { word: 'get up', correctAnswer: '起きる', options: ['起きる', '立ち上がる', '目覚める', '始める'] },
    { word: 'take care of', correctAnswer: '〜の世話をする', options: ['〜の世話をする', '〜を管理する', '〜を担当する', '〜の面倒を見る'] },
    { word: 'give up', correctAnswer: '諦める', options: ['諦める', 'やめる', '断念する', '放棄する'] },
    { word: 'depend on', correctAnswer: '〜に頼る', options: ['〜に頼る', '〜次第である', '〜を信頼する', '〜を当てにする'] },
    { word: 'run out of', correctAnswer: '〜を使い果たす', options: ['〜を使い果たす', '〜がなくなる', '〜が不足する', '〜を欠く'] },
    { word: 'show up', correctAnswer: '現れる', options: ['現れる', '登場する', '出席する', '姿を見せる'] },
    { word: 'turn on', correctAnswer: '（電気などを）つける', options: ['（電気などを）つける', '作動させる', '開始する', '接続する'] },
    { word: 'turn off', correctAnswer: '（電気などを）消す', options: ['（電気などを）消す', '停止する', '切断する', '閉じる'] },
  ],
  '英熟語 - 標準': [
    { word: 'figure out', correctAnswer: '〜を理解する', options: ['〜を理解する', '〜を解決する', '〜を見つけ出す', '〜を計算する'] },
    { word: 'carry out', correctAnswer: '〜を実行する', options: ['〜を実行する', '〜を遂行する', '〜を行う', '〜を実施する'] },
    { word: 'put off', correctAnswer: '〜を延期する', options: ['〜を延期する', '〜を遅らせる', '〜を先延ばしにする', '〜を嫌にさせる'] },
    { word: 'catch up with', correctAnswer: '〜に追いつく', options: ['〜に追いつく', '〜と情報交換する', '〜に悪影響が及ぶ', '〜に逮捕される'] },
    { word: 'deal with', correctAnswer: '〜に対処する', options: ['〜に対処する', '〜を処理する', '〜を扱う', '〜と取引する'] },
    { word: 'end up', correctAnswer: '結局〜になる', options: ['結局〜になる', '〜で終わる', '〜に到達する', '〜という結果になる'] },
    { word: 'go through', correctAnswer: '〜を経験する', options: ['〜を経験する', '〜を通過する', '〜を調べる', '〜を耐え抜く'] },
    { word: 'keep up with', correctAnswer: '〜に遅れずについていく', options: ['〜に遅れずについていく', '〜と連絡を取り続ける', '〜の情報を得る', '〜と張り合う'] },
    { word: 'point out', correctAnswer: '〜を指摘する', options: ['〜を指摘する', '〜を指し示す', '〜に注意を促す', '〜を強調する'] },
  ],
  '英熟語 - 難関': [
    { word: 'come up with', correctAnswer: '〜を思いつく', options: ['〜を思いつく', '〜を提案する', '〜を用意する', '〜を見つける'] },
    { word: 'get away with', correctAnswer: '〜を罰せられずに済ます', options: ['〜を罰せられずに済ます', '〜をうまくやる', '〜を持ち逃げする', '〜で済ます'] },
    { word: 'look down on', correctAnswer: '〜を軽蔑する', options: ['〜を軽蔑する', '〜を見下す', '〜を過小評価する', '〜をさげすむ'] },
    { word: 'make up for', correctAnswer: '〜を補う', options: ['〜を補う', '〜の埋め合わせをする', '〜を償う', '〜を取り戻す'] },
    { word: 'abide by', correctAnswer: '〜に従う', options: ['〜に従う', '〜を守る', '〜を順守する', '〜に甘んじる'] },
    { word: 'brush up on', correctAnswer: '〜をやり直す', options: ['〜をやり直す', '〜の腕を磨く', '〜を復習する', '〜を再学習する'] },
    { word: 'fall back on', correctAnswer: '〜を当てにする', options: ['〜を当てにする', '〜に頼る', '〜を最後の手段とする', '〜を利用する'] },
    { word: 'get around to', correctAnswer: '〜をする余裕ができる', options: ['〜をする余裕ができる', '〜に取り掛かる', 'ようやく〜する', '〜まで手が回る'] },
    { word: 'iron out', correctAnswer: '〜を解決する', options: ['〜を解決する', '〜を調整する', '〜の意見をまとめる', '〜のしわを伸ばす'] },
  ]
};

const QUIZ_LENGTH = 10;

const CategoryCard: React.FC<{ title: string; onClick: () => void; }> = ({ title, onClick }) => (
    <button
        onClick={onClick}
        className="bg-slate-700/50 p-6 rounded-lg text-center transition-all duration-300 transform hover:scale-105 hover:bg-slate-700/80 border-2 border-slate-700 hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
        <SparklesIcon className="w-10 h-10 mx-auto mb-3 text-indigo-400" />
        <h3 className="text-lg font-bold text-white">{title}</h3>
    </button>
);

interface VocabularyQuizProps {
  setMode: (mode: 'vocabulary' | 'reading' | 'writing' | 'profile') => void;
  onLevelUp: (newLevel: number) => void;
}

const VocabularyQuiz: React.FC<VocabularyQuizProps> = ({ setMode, onLevelUp }) => {
  const [view, setView] = useState<'selection' | 'quiz' | 'loading'>('selection');
  const [category, setCategory] = useState<string | null>(null);
  const [quizQueue, setQuizQueue] = useState<VocabQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [sessionCorrectAnswers, setSessionCorrectAnswers] = useState(0);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [sessionType, setSessionType] = useState<'learning' | 'review'>('learning');
  const [completionData, setCompletionData] = useState<AddXpResult | null>(null);
  const [resumableSession, setResumableSession] = useState<any>(null);


  const { userData, addXpAndLog, updateWordMemory } = useContext(UserDataContext);
  const { playCorrect, playIncorrect, playSuccess } = useSound();
  
  useEffect(() => {
    try {
        const savedSession = localStorage.getItem(IN_PROGRESS_QUIZ_KEY);
        if (savedSession) {
            const parsedSession = JSON.parse(savedSession);
            if (parsedSession && parsedSession.quizQueue.length > 0) {
                 setResumableSession(parsedSession);
            }
        }
    } catch (error) {
        console.error("Failed to load quiz session", error);
        localStorage.removeItem(IN_PROGRESS_QUIZ_KEY);
    }
  }, []);

  const generateQuizQueue = useCallback(async (selectedCategory: string) => {
    setView('loading');
    const allWordsInCategory = vocabList[selectedCategory];
     if (!allWordsInCategory) {
        setQuizQueue([]);
        setView('selection');
        return;
    }
    
    const learningWords: VocabQuestion[] = [];
    const masteredWords: VocabQuestion[] = [];

    allWordsInCategory.forEach(word => {
      const memoryStatus = userData.wordMemory[word.word]?.status;
      if (memoryStatus === 'mastered') {
        masteredWords.push(word);
      } else {
        learningWords.push(word);
      }
    });
    
    const shuffledLearning = shuffleArray(learningWords);
    let queue = [...shuffledLearning];

    if (shuffledLearning.length > 0) {
      setSessionType('learning');
      if (queue.length < QUIZ_LENGTH) {
          queue.push(...shuffleArray(masteredWords).slice(0, QUIZ_LENGTH - queue.length));
      }
    } else if (masteredWords.length > 0) {
        setSessionType('review');
        queue = shuffleArray(masteredWords);
    } else {
        setSessionType('learning');
        queue = shuffleArray(allWordsInCategory);
    }
    
    const finalQueue = queue.slice(0, QUIZ_LENGTH);
    
    // Generate better distractors using Gemini
    try {
        const wordsToEnrich = finalQueue.map(q => ({ word: q.word, correctAnswer: q.correctAnswer }));
        const response = await generateDistractors(wordsToEnrich);
        const distractorsData = JSON.parse(response.text);

        const enrichedQueue = finalQueue.map((question, index) => {
            const enrichedInfo = distractorsData.words.find((w: any) => w.word === question.word);
            if (enrichedInfo && enrichedInfo.distractors.length > 0) {
                return {
                    ...question,
                    options: shuffleArray([...enrichedInfo.distractors, question.correctAnswer])
                };
            }
            return {
                ...question,
                options: shuffleArray(question.options) 
            };
        });
        setQuizQueue(enrichedQueue);
    } catch(e) {
        console.error("Failed to generate distractors, using fallback.", e);
        // Fallback to simple shuffling if API fails
        const fallbackQueue = finalQueue.map(q => ({...q, options: shuffleArray(q.options)}));
        setQuizQueue(fallbackQueue);
    }
    setView('quiz');
  }, [userData.wordMemory]);


  const startQuiz = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setSessionCorrectAnswers(0);
    setIsQuizFinished(false);
    setCompletionData(null);
    generateQuizQueue(selectedCategory);
  }
  
  const currentQuestion = quizQueue[currentQuestionIndex];

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;

    setSelectedAnswer(answer);
    setIsAnswered(true);
    
    const isCorrect = answer === currentQuestion.correctAnswer;
    updateWordMemory(currentQuestion.word, isCorrect);

    if (navigator.vibrate) navigator.vibrate(100);

    if (isCorrect) {
      setSessionCorrectAnswers(s => s + 1);
      playCorrect();
    } else {
      playIncorrect();
    }
  };
  
  const finishQuiz = useCallback(() => {
    localStorage.removeItem(IN_PROGRESS_QUIZ_KEY);
    if (!category) return;
    const xpEarned = sessionCorrectAnswers * XP_VALUES.VOCAB_CORRECT;
    if (xpEarned > 0) {
        const result = addXpAndLog({
            type: 'vocabulary',
            xp: xpEarned,
            details: { category, score: sessionCorrectAnswers, total: quizQueue.length }
        });
        setCompletionData(result);
        if (result.leveledUp) {
            onLevelUp(result.newLevel);
        }
    } else {
         const result = addXpAndLog({ type: 'vocabulary', xp: 0, details: { category, score: 0, total: quizQueue.length } });
         setCompletionData(result);
    }
    playSuccess();
    setIsQuizFinished(true);
  }, [sessionCorrectAnswers, addXpAndLog, category, quizQueue.length, playSuccess, onLevelUp]);

  const handleNext = () => {
    if (currentQuestionIndex < quizQueue.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer(null);
      setIsAnswered(false);
      
      // Save progress
      const sessionToSave = {
          category,
          quizQueue,
          currentQuestionIndex: nextIndex,
          sessionCorrectAnswers,
          sessionType,
      };
      localStorage.setItem(IN_PROGRESS_QUIZ_KEY, JSON.stringify(sessionToSave));

    } else {
      finishQuiz();
    }
  };
  
    const handleResume = () => {
      if (!resumableSession) return;
      setCategory(resumableSession.category);
      setQuizQueue(resumableSession.quizQueue);
      setCurrentQuestionIndex(resumableSession.currentQuestionIndex);
      setSessionCorrectAnswers(resumableSession.sessionCorrectAnswers);
      setSessionType(resumableSession.sessionType);
      
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsQuizFinished(false);
      setCompletionData(null);

      setView('quiz');
      setResumableSession(null);
  };

  const handleDiscard = () => {
      localStorage.removeItem(IN_PROGRESS_QUIZ_KEY);
      setResumableSession(null);
  };
  
  const handleBackToSelection = () => {
    localStorage.removeItem(IN_PROGRESS_QUIZ_KEY);
    setView('selection');
  };
  
    const totalWords = AllVocabWords.length;
    const answeredWords = Object.keys(userData.wordMemory).length;
    const progressPercentage = totalWords > 0 ? (answeredWords / totalWords) * 100 : 0;

  if (view === 'selection') {
    return (
        <div className="animate-fade-in">
             {resumableSession && (
                <div className="mb-6 p-4 bg-indigo-900/50 border border-indigo-700 rounded-lg text-center">
                    <p className="font-semibold text-white mb-3">中断したクイズがあります ({resumableSession.category})。</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={handleResume} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">再開する</button>
                        <button onClick={handleDiscard} className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg">破棄する</button>
                    </div>
                </div>
            )}
            <h2 className="text-3xl font-bold text-center text-cyan-300 mb-2">単語学習</h2>
            <p className="text-center text-slate-400 mb-8">学習したいカテゴリを選択してください。</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.keys(vocabList).map(cat => (
                    <CategoryCard key={cat} title={cat} onClick={() => startQuiz(cat)} />
                ))}
            </div>
        </div>
    );
  }
  
  if (view === 'loading') {
    return <div className="text-center">AIが選択肢を生成中...</div>
  }

  if (!currentQuestion && !isQuizFinished) {
    return <div className="text-center">クイズを読み込んでいます...</div>
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
       <div className="w-full max-w-2xl mx-auto">
        {isQuizFinished ? (
            <div className="p-8 bg-slate-700/50 rounded-lg flex flex-col items-center gap-2 animate-bounce-in">
                <h2 className="text-3xl font-bold text-cyan-400">
                    {sessionType === 'learning' ? '学習セッション完了！' : '復習完了！'}
                </h2>
                <p className="text-xl text-slate-300">スコア: <span className="font-bold text-white">{sessionCorrectAnswers}</span> / {quizQueue.length}</p>
                <p className="text-slate-400 text-sm">
                    学習進捗: {answeredWords} / {totalWords} 単語 ({progressPercentage.toFixed(1)}%)
                </p>

                 {completionData && (
                    <CompletionFeedback
                        xpEarned={completionData.xpEarned}
                        unlockedBadges={completionData.unlockedBadges}
                    />
                )}
                <div className="flex gap-4 mt-4 z-10">
                    <button onClick={() => category && startQuiz(category)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105">
                        もう一度プレイ
                    </button>
                     <button onClick={handleBackToSelection} className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105">
                        カテゴリ選択へ
                    </button>
                </div>
            </div>
        ) : (
            <div className="w-full animate-fade-in">
                <div className="mb-4 text-slate-400">問題 {currentQuestionIndex + 1} / {quizQueue.length} | 正解数: {sessionCorrectAnswers}</div>
                <div className="mb-6">
                    <h2 className="text-4xl font-bold text-cyan-300 mb-2">{currentQuestion.word}</h2>
                    <p className="text-lg text-slate-300">この単語・熟語の意味は？</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentQuestion.options.map((option, index) => {
                        const isCorrect = option === currentQuestion.correctAnswer;
                        const isSelected = option === selectedAnswer;
                        let buttonClass = 'bg-slate-700 hover:bg-slate-600';
                        if (isAnswered) {
                            if (isCorrect) buttonClass = 'bg-green-500/80 text-white';
                            else if (isSelected) buttonClass = 'bg-red-500/80 text-white';
                            else buttonClass = 'bg-slate-700/50 text-slate-400';
                        }
                        
                        return (
                            <button
                                key={index}
                                onClick={() => handleAnswer(option)}
                                disabled={isAnswered}
                                className={`p-4 rounded-lg text-lg font-semibold transition-all duration-200 transform ${!isAnswered ? 'hover:scale-105' : ''} ${buttonClass} flex justify-between items-center`}
                            >
                                {option}
                                {isAnswered && (isCorrect ? <CheckIcon className="w-6 h-6 text-white"/> : isSelected ? <XIcon className="w-6 h-6 text-white"/> : null)}
                            </button>
                        )
                    })}
                </div>
                
                <div className="mt-8 flex justify-between items-center">
                    <button onClick={handleBackToSelection} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors text-sm">
                        カテゴリ選択に戻る
                    </button>
                    {isAnswered && (
                        <button onClick={handleNext} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105 animate-fade-in">
                           {currentQuestionIndex === quizQueue.length - 1 ? 'クイズを終了' : '次の問題へ'}
                        </button>
                    )}
                </div>
            </div>
        )}
       </div>
    </div>
  );
};

export default VocabularyQuiz;
// A flat list of all vocab words for the profile page
export const AllVocabWords = Object.values(vocabList).flat();