import React, { useState, useCallback } from 'react';
import VocabularyQuiz from './components/VocabularyQuiz';
import ReadingComprehension from './components/ReadingComprehension';
import WritingPractice from './components/WritingPractice';
import Profile from './components/Profile';
import LearningPlan from './components/LearningPlan';
import { BookOpenIcon } from './components/icons/BookOpenIcon';
import { FeatherIcon } from './components/icons/FeatherIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { UserIcon } from './components/icons/UserIcon';
import { CompassIcon } from './components/icons/CompassIcon';

type Mode = 'vocabulary' | 'reading' | 'writing' | 'plan' | 'profile';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('vocabulary');

  const renderContent = () => {
    switch (mode) {
      case 'vocabulary':
        return <VocabularyQuiz setMode={setMode}/>;
      case 'reading':
        return <ReadingComprehension />;
      case 'writing':
        return <WritingPractice />;
      case 'plan':
        return <LearningPlan setMode={setMode} />;
      case 'profile':
        return <Profile />;
      default:
        return <VocabularyQuiz setMode={setMode} />;
    }
  };

  const NavButton = useCallback(<T extends Mode,>({ currentMode, targetMode, icon, children }: { currentMode: T, targetMode: T, icon: React.ReactNode, children: React.ReactNode }) => {
    const isActive = currentMode === targetMode;
    return (
      <button
        onClick={() => setMode(targetMode)}
        className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 p-3 sm:p-4 rounded-t-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
          isActive
            ? 'bg-slate-800/50 backdrop-blur-sm text-indigo-400 border-b-2 border-indigo-400'
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
      <header className="p-4 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            Geminiイングリッシュハブ
          </h1>
        </div>
      </header>
      
      <main className="flex-grow flex flex-col p-4 md:p-6">
        <div className="max-w-5xl w-full mx-auto flex flex-col flex-grow">
          <nav className="flex bg-slate-800/30 rounded-t-lg">
            <NavButton currentMode={mode} targetMode="vocabulary" icon={<SparklesIcon className="w-5 h-5"/>}>単語</NavButton>
            <NavButton currentMode={mode} targetMode="reading" icon={<BookOpenIcon className="w-5 h-5"/>}>長文読解</NavButton>
            <NavButton currentMode={mode} targetMode="writing" icon={<FeatherIcon className="w-5 h-5"/>}>英作文</NavButton>
            <NavButton currentMode={mode} targetMode="plan" icon={<CompassIcon className="w-5 h-5"/>}>学習プラン</NavButton>
            <NavButton currentMode={mode} targetMode="profile" icon={<UserIcon className="w-5 h-5"/>}>プロフィール</NavButton>
          </nav>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-b-lg p-4 sm:p-8 flex-grow">
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