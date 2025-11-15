import React, { useState, useCallback } from 'react';
import VocabularyQuiz from './components/VocabularyQuiz';
import ReadingComprehension from './components/ReadingComprehension';
import WritingPractice from './components/WritingPractice';
import Profile from './components/Profile';
import { BookOpenIcon } from './components/icons/BookOpenIcon';
import { FeatherIcon } from './components/icons/FeatherIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { UserIcon } from './components/icons/UserIcon';

type Mode = 'vocabulary' | 'reading' | 'writing' | 'profile';

const LevelUpModal: React.FC<{ newLevel: number; onClose: () => void }> = ({ newLevel, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-slate-800 border-2 border-indigo-500 rounded-2xl p-8 text-center animate-bounce-in shadow-2xl shadow-indigo-500/50 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 mb-2">LEVEL UP!</h2>
            <p className="text-2xl text-slate-200 mb-6">あなたはレベル <span className="font-bold text-yellow-300 text-3xl">{newLevel}</span> に到達しました！</p>
            <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105 text-lg"
            >
                続ける
            </button>
        </div>
    </div>
);


const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('vocabulary');
  const [levelUpInfo, setLevelUpInfo] = useState<{ newLevel: number } | null>(null);

  const handleLevelUp = useCallback((newLevel: number) => {
    setLevelUpInfo({ newLevel });
  }, []);

  const renderContent = () => {
    switch (mode) {
      case 'vocabulary':
        return <VocabularyQuiz setMode={setMode} onLevelUp={handleLevelUp} />;
      case 'reading':
        return <ReadingComprehension onLevelUp={handleLevelUp} />;
      case 'writing':
        return <WritingPractice onLevelUp={handleLevelUp} />;
      case 'profile':
        return <Profile setMode={setMode} />; 
      default:
        return <VocabularyQuiz setMode={setMode} onLevelUp={handleLevelUp} />;
    }
  };

  const NavButton = useCallback(({ currentMode, targetMode, icon, children }: { currentMode: Mode, targetMode: Mode, icon: React.ReactNode, children: React.ReactNode }) => {
    const isActive = currentMode === targetMode;
    return (
      <button
        onClick={() => setMode(targetMode)}
        className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 sm:flex-row sm:gap-2 sm:p-4 sm:rounded-t-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
          isActive
            ? 'bg-slate-800/50 backdrop-blur-sm text-indigo-400 border-t-2 sm:border-t-0 sm:border-b-2 border-indigo-400'
            : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
        }`}
      >
        {icon}
        <span className="text-xs sm:text-base font-medium">{children}</span>
      </button>
    );
  }, []);


  return (
    <div className="min-h-screen bg-slate-900 font-sans flex flex-col">
      {levelUpInfo && <LevelUpModal newLevel={levelUpInfo.newLevel} onClose={() => setLevelUpInfo(null)} />}
      <header className="p-4 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            Geminiイングリッシュハブ
          </h1>
        </div>
      </header>
      
      <main className="flex-grow flex flex-col p-4 md:p-6 pb-20 sm:pb-6">
        <div className="max-w-5xl w-full mx-auto flex flex-col flex-grow">
          <nav className="flex bg-slate-800/80 sm:bg-slate-800/30 backdrop-blur-sm sm:rounded-t-lg 
                        fixed sm:static bottom-0 left-0 right-0 
                        justify-around sm:justify-start 
                        border-t sm:border-t-0 border-slate-700 z-20">
            <NavButton currentMode={mode} targetMode="vocabulary" icon={<SparklesIcon className="w-5 h-5"/>}>単語</NavButton>
            <NavButton currentMode={mode} targetMode="reading" icon={<BookOpenIcon className="w-5 h-5"/>}>長文読解</NavButton>
            <NavButton currentMode={mode} targetMode="writing" icon={<FeatherIcon className="w-5 h-5"/>}>英作文</NavButton>
            <NavButton currentMode={mode} targetMode="profile" icon={<UserIcon className="w-5 h-5"/>}>プロフィール</NavButton>
          </nav>
          <div className="bg-slate-800/50 backdrop-blur-sm sm:rounded-b-lg p-4 sm:p-8 flex-grow">
            {renderContent()}
          </div>
        </div>
      </main>

       <footer className="text-center p-4 text-slate-500 text-sm">
         <p>Google Geminiを搭載。インタラクティブに英語スキルを向上させましょう。</p>
       </footer>
    </div>
  );
};

export default App;
