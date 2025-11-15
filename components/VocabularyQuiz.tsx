import React, { useState, useMemo, useCallback, useContext } from 'react';
import type { VocabQuestion } from '../types';
import { useSound } from '../hooks/useSound';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { UserDataContext, AddXpResult } from '../context/UserDataContext';
import { XP_VALUES } from '../config/gamification';
import { SparklesIcon } from './icons/SparklesIcon';
import CompletionFeedback from './CompletionFeedback';

// Helper to shuffle arrays
const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const vocabList: Record<string, VocabQuestion[]> = {
  '英単語 - 基本': [
    { word: 'evidence', correctAnswer: '証拠', options: ['証拠', '理論', '感情', '意見'] },
    { word: 'determine', correctAnswer: '決定する', options: ['決定する', '想像する', '無視する', '議論する'] },
    { word: 'provide', correctAnswer: '提供する', options: ['提供する', '受け取る', '隠す', '消費する'] },
    { word: 'increase', correctAnswer: '増加する', options: ['増加する', '減少する', '維持する', '破壊する'] },
    { word: 'consider', correctAnswer: '考慮する', options: ['考慮する', '否定する', '忘れる', '発表する'] },
    { word: 'develop', correctAnswer: '開発する', options: ['開発する', '停止する', 'コピーする', '購入する'] },
    { word: 'ability', correctAnswer: '能力', options: ['能力', '機会', '弱点', '性格'] },
    { word: 'community', correctAnswer: '地域社会', options: ['地域社会', '会社', '政府', '家族'] },
    { word: 'knowledge', correctAnswer: '知識', options: ['知識', '経験', '情報', '知恵'] },
    { word: 'environment', correctAnswer: '環境', options: ['環境', '状況', '天候', '自然'] },
    { word: 'necessary', correctAnswer: '必要な', options: ['必要な', '不要な', '高価な', '便利な'] },
    { word: 'opportunity', correctAnswer: '機会', options: ['機会', '問題', '危険', '約束'] },
    { word: 'purpose', correctAnswer: '目的', options: ['目的', '結果', '原因', '理由'] },
    { word: 'relationship', correctAnswer: '関係', options: ['関係', '対立', '会話', '契約'] },
    { word: 'technology', correctAnswer: '科学技術', options: ['科学技術', '芸術', '歴史', '文学'] },
  ],
  '英単語 - 標準': [
    { word: 'significant', correctAnswer: '重要な', options: ['重要な', '些細な', '退屈な', '危険な'] },
    { word: 'consequence', correctAnswer: '結果', options: ['結果', '原因', '過程', '目的'] },
    { word: 'essential', correctAnswer: '不可欠な', options: ['不可欠な', '不要な', '高価な', '稀な'] },
    { word: 'sufficient', correctAnswer: '十分な', options: ['十分な', '不十分な', '過剰な', '皆無な'] },
    { word: 'phenomenon', correctAnswer: '現象', options: ['現象', '理論', '事実', '空想'] },
    { word: 'sophisticated', correctAnswer: '洗練された', options: ['洗練された', '単純な', '粗野な', '時代遅れの'] },
    { word: 'vulnerable', correctAnswer: '脆弱な', options: ['脆弱な', '強力な', '安全な', '不死身の'] },
    { word: 'sustainable', correctAnswer: '持続可能な', options: ['持続可能な', '一時的な', '破壊的な', '非効率な'] },
    { word: 'controversial', correctAnswer: '物議を醸す', options: ['物議を醸す', '受け入れられた', '明白な', '無関心な'] },
    { word: 'comprehensive', correctAnswer: '包括的な', options: ['包括的な', '断片的な', '表面的な', '限定的な'] },
    { word: 'legitimate', correctAnswer: '正当な', options: ['正当な', '不法な', '疑わしい', '架空の'] },
    { word: 'simultaneously', correctAnswer: '同時に', options: ['同時に', '連続して', '交互に', '別々に'] },
    { word: 'indispensable', correctAnswer: '不可欠な', options: ['不可欠な', '余分な', '交換可能な', '望ましい'] },
    { word: 'facilitate', correctAnswer: '促進する', options: ['促進する', '妨害する', '複雑にする', '遅らせる'] },
    { word: 'implement', correctAnswer: '実行する', options: ['実行する', '計画する', '提案する', '中止する'] },
  ],
   '英単語 - 難関': [
    { word: 'ubiquitous', correctAnswer: '遍在する', options: ['遍在する', '珍しい', '見えない', '局所的な'] },
    { word: 'plausible', correctAnswer: 'もっともらしい', options: ['もっともらしい', '信じがたい', '証明された', '複雑な'] },
    { word: 'ambiguous', correctAnswer: '曖昧な', options: ['曖昧な', '明確な', '単純な', '矛盾した'] },
    { word: 'empirical', correctAnswer: '経験的な', options: ['経験的な', '理論的な', '直感的な', '架空の'] },
    { word: 'mitigate', correctAnswer: '和らげる', options: ['和らげる', '悪化させる', '引き起こす', '無視する'] },
    { word: 'proliferate', correctAnswer: '増殖する', options: ['増殖する', '減少する', '消滅する', '変化する'] },
    { word: 'ephemeral', correctAnswer: 'つかの間の', options: ['つかの間の', '永遠の', '重要な', '予測可能な'] },
    { word: 'acquiesce', correctAnswer: '黙認する', options: ['黙認する', '反対する', '交渉する', '拒否する'] },
    { word: 'conundrum', correctAnswer: '難問', options: ['難問', '解決策', '簡単な質問', '明確な答え'] },
    { word: 'exacerbate', correctAnswer: '悪化させる', options: ['悪化させる', '改善する', '軽減する', '安定させる'] },
    { word: 'idiosyncrasy', correctAnswer: '特異性', options: ['特異性', '共通性', '正常性', '類似性'] },
    { word: 'juxtaposition', correctAnswer: '並置', options: ['並置', '分離', '融合', '対立'] },
    { word: 'ostracize', correctAnswer: '追放する', options: ['追放する', '歓迎する', '称賛する', '無視する'] },
    { word: 'quintessential', correctAnswer: '典型的な', options: ['典型的な', '非典型的な', '例外的な', 'ユニークな'] },
    { word: 'vociferous', correctAnswer: '大声で叫ぶ', options: ['大声で叫ぶ', '静かな', '内気な', '穏やかな'] },
  ],
  '英熟語 - 基本': [
    { word: 'look forward to', correctAnswer: '〜を楽しみに待つ', options: ['〜を楽しみに待つ', '〜を調べる', '〜の世話をする', '〜を軽蔑する'] },
    { word: 'get up', correctAnswer: '起きる', options: ['起きる', '諦める', '乗る', '降りる'] },
    { word: 'take care of', correctAnswer: '〜の世話をする', options: ['〜の世話をする', '〜を延期する', '〜に参加する', '〜に頼る'] },
    { word: 'give up', correctAnswer: '諦める', options: ['諦める', '続ける', '始める', '見つける'] },
    { word: 'depend on', correctAnswer: '〜に頼る', options: ['〜に頼る', '〜を断る', '〜を疑う', '〜を避ける'] },
    { word: 'run out of', correctAnswer: '〜を使い果たす', options: ['〜を使い果たす', '〜で満たす', '〜を見つける', '〜を保存する'] },
    { word: 'show up', correctAnswer: '現れる', options: ['現れる', '隠れる', '去る', '消える'] },
    { word: 'turn on', correctAnswer: '（電気などを）つける', options: ['（電気などを）つける', '消す', '修理する', '壊す'] },
    { word: 'turn off', correctAnswer: '（電気などを）消す', options: ['（電気などを）消す', 'つける', '交換する', '充電する'] },
  ],
  '英熟語 - 標準': [
    { word: 'figure out', correctAnswer: '〜を理解する', options: ['〜を理解する', '〜を実行する', '〜を延期する', '〜に追いつく'] },
    { word: 'carry out', correctAnswer: '〜を実行する', options: ['〜を実行する', '〜を中止する', '〜を自慢する', '〜を我慢する'] },
    { word: 'put off', correctAnswer: '〜を延期する', options: ['〜を延期する', '〜を我慢する', '〜を消す', '〜を着用する'] },
    { word: 'catch up with', correctAnswer: '〜に追いつく', options: ['〜に追いつく', '〜を思いつく', '〜を罰せられずに済ます', '〜とうまくやっていく'] },
    { word: 'deal with', correctAnswer: '〜に対処する', options: ['〜に対処する', '〜を無視する', '〜を避ける', '〜と協力する'] },
    { word: 'end up', correctAnswer: '結局〜になる', options: ['結局〜になる', '〜を始める', '〜を計画する', '〜を避ける'] },
    { word: 'go through', correctAnswer: '〜を経験する', options: ['〜を経験する', '〜を避ける', '〜を忘れる', '〜を調べる'] },
    { word: 'keep up with', correctAnswer: '〜に遅れずについていく', options: ['〜に遅れずについていく', '〜から遅れる', '〜を追い越す', '〜と競争する'] },
    { word: 'point out', correctAnswer: '〜を指摘する', options: ['〜を指摘する', '〜を隠す', '〜を賞賛する', '〜を無視する'] },
  ],
  '英熟語 - 難関': [
    { word: 'come up with', correctAnswer: '〜を思いつく', options: ['〜を思いつく', '〜に屈する', '〜を廃止する', '〜を補う'] },
    { word: 'get away with', correctAnswer: '〜を罰せられずに済ます', options: ['〜を罰せられずに済ます', '〜とうまくやっていく', '〜に取り掛かる', '〜を切り抜ける'] },
    { word: 'look down on', correctAnswer: '〜を軽蔑する', options: ['〜を軽蔑する', '〜を尊敬する', '〜を調査する', '〜の面倒を見る'] },
    { word: 'make up for', correctAnswer: '〜を補う', options: ['〜を補う', '〜をでっちあげる', '〜と仲直りする', '〜を構成する'] },
    { word: 'abide by', correctAnswer: '〜に従う', options: ['〜に従う', '〜に反抗する', '〜を無視する', '〜を交渉する'] },
    { word: 'brush up on', correctAnswer: '〜をやり直す', options: ['〜をやり直す', '〜を忘れる', '〜を新しく始める', '〜を教える'] },
    { word: 'fall back on', correctAnswer: '〜を当てにする', options: ['〜を当てにする', '〜を裏切る', '〜を拒絶する', '〜を疑う'] },
    { word: 'get around to', correctAnswer: '〜をする余裕ができる', options: ['〜をする余裕ができる', '〜を延期する', '〜を避ける', '〜を強制される'] },
    { word: 'iron out', correctAnswer: '〜を解決する', options: ['〜を解決する', '〜を複雑にする', '〜問題を作り出す', '〜を調査する'] },
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
  const [view, setView] = useState<'selection' | 'quiz'>('selection');
  const [category, setCategory] = useState<string | null>(null);
  const [quizQueue, setQuizQueue] = useState<VocabQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [sessionCorrectAnswers, setSessionCorrectAnswers] = useState(0);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [sessionType, setSessionType] = useState<'learning' | 'review'>('learning');
  const [completionData, setCompletionData] = useState<AddXpResult | null>(null);


  const { userData, addXpAndLog, updateWordMemory } = useContext(UserDataContext);
  const { playCorrect, playIncorrect, playSuccess } = useSound();

  const generateQuizQueue = useCallback((selectedCategory: string) => {
    const allWordsInCategory = vocabList[selectedCategory];
     if (!allWordsInCategory) {
        setQuizQueue([]);
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

    setQuizQueue(queue.slice(0, QUIZ_LENGTH));
  }, [userData.wordMemory]);


  const startQuiz = (selectedCategory: string) => {
    setCategory(selectedCategory);
    generateQuizQueue(selectedCategory);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setSessionCorrectAnswers(0);
    setIsQuizFinished(false);
    setCompletionData(null);
    setView('quiz');
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
      setCurrentQuestionIndex(i => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      finishQuiz();
    }
  };
  
  if (view === 'selection') {
    return (
        <div className="animate-fade-in">
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

  if (!currentQuestion && !isQuizFinished) {
    return <div className="text-center">クイズを読み込んでいます...</div>
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
       <div className="w-full max-w-2xl mx-auto">
        {isQuizFinished ? (
            <div className="p-8 bg-slate-700/50 rounded-lg flex flex-col items-center gap-4 animate-bounce-in">
                <h2 className="text-3xl font-bold text-cyan-400">
                    {sessionType === 'learning' ? '学習セッション完了！' : '復習完了！'}
                </h2>
                <p className="text-xl text-slate-300">スコア: <span className="font-bold text-white">{sessionCorrectAnswers}</span> / {quizQueue.length}</p>
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
                     <button onClick={() => setView('selection')} className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105">
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
                    <button onClick={() => setView('selection')} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors text-sm">
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