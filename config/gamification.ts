import type { Badge } from '../types';

export const XP_PER_LEVEL = 1000;

export const XP_VALUES = {
  VOCAB_CORRECT: 15,
  READING_MCQ_CORRECT: 20,
  READING_OPEN_CORRECT: 40,
  WRITING_SUBMIT: 75,
};

export const BADGES: Badge[] = [
  { id: 'first_steps', name: '最初の一歩', description: '最初のアクティビティを完了する。', icon: '👟' },
  { id: 'vocab_wiz_1', name: '単語ウィザード I', description: '単語問題に10問正解する。', icon: '🧙' },
  { id: 'vocab_wiz_2', name: '単語ウィザード II', description: '単語問題に50問正解する。', icon: '🧙‍♂️' },
  { id: 'word_smith_1', name: '言葉の鍛冶屋 I', description: '最初の英作文のフィードバックをもらう。', icon: '✍️' },
  { id: 'word_smith_2', name: '言葉の鍛冶屋 II', description: '5つの英作文のフィードバックをもらう。', icon: '✍️' },
  { id: 'bookworm_1', name: '本の虫 I', description: '長文読解クイズを3つ完了する。', icon: '🐛' },
  { id: 'bookworm_2', name: '本の虫 II', description: '長文読解クイズを10個完了する。', icon: '🦋' },
  { id: 'dedicated_learner', name: '熱心な学習者', description: '3日間連続でログインする。', icon: '🗓️' },
  { id: 'committed_learner', name: '献身的な学習者', description: '7日間の連続ログインを達成する。', icon: '🔥' },
  { id: 'sharp_shooter', name: 'シャープシューター', description: 'いずれかのクイズで満点を取る。', icon: '🎯' },
  { id: 'polymath', name: '博学者', description: '3つすべてのカテゴリーのアクティビティを完了する。', icon: '🎓' },
  { id: 'unstoppable', name: '止められない', description: 'レベル5に到達する。', icon: '🚀' },
];