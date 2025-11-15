import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { UserData, ReadingQuizContent, VocabQuestion } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateReadingQuiz = async (topic: string, level: string): Promise<GenerateContentResponse> => {
    
    let passageLength = "200-300 words";
    let questionPrompt = `
      "mcqs": [
        {
          "question": "A multiple-choice question about the passage.",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswerIndex": 0
        },
        {
          "question": "Another multiple-choice question.",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswerIndex": 1
        }
      ],
      "openQuestions": [
        {
          "question": "An open-ended question that requires a short written answer based on the passage."
        }
      ]
    `;

    switch(level) {
        case '共通テスト':
            passageLength = "400-600 words";
            questionPrompt = `
              "mcqs": [
                { "question": "...", "options": ["..."], "correctAnswerIndex": 0 },
                { "question": "...", "options": ["..."], "correctAnswerIndex": 0 },
                { "question": "...", "options": ["..."], "correctAnswerIndex": 0 },
                { "question": "...", "options": ["..."], "correctAnswerIndex": 0 }
              ],
              "openQuestions": []
            `;
            break;
        case '難関私大':
        case '難関国公立':
            passageLength = "700-1000 words";
             questionPrompt = `
              "mcqs": [
                { "question": "...", "options": ["..."], "correctAnswerIndex": 0 },
                { "question": "...", "options": ["..."], "correctAnswerIndex": 0 }
              ],
              "openQuestions": [
                { "question": "Explain the main argument of the second paragraph in your own words." },
                { "question": "What is the author's opinion on the topic, and what evidence from the text supports it?" }
              ]
            `;
            break;
        case '早慶レベル':
             passageLength = "1000-1500 words";
             questionPrompt = `
              "mcqs": [
                { "question": "A difficult vocabulary-in-context question. The question itself should be in English.", "options": ["..."], "correctAnswerIndex": 0 },
                { "question": "A complex inference question. The question itself should be in English.", "options": ["..."], "correctAnswerIndex": 0 }
              ],
              "openQuestions": [
                { "question": "Translate the following sentence into natural-sounding Japanese: '... insert a complex sentence from the passage here ...'" },
                { "question": "Summarize the social implications discussed in the passage in about 50 words in English." },
                { "question": "Based on the passage, what is one potential counter-argument to the author's main point? Express your idea in English." }
              ]
            `;
            break;
    }


  const prompt = `
    Generate a complete English reading comprehension quiz for a Japanese university entrance exam candidate.
    The learner's target level is ${level}.
    The topic is "${topic}". Please generate a passage and questions related to this topic, ensuring high academic and lexical quality.

    The response must be a JSON object that strictly follows this structure, with content appropriate for the specified level:
    {
      "passage": "A reading passage of about ${passageLength}.",
      ${questionPrompt}
    }
    Ensure the JSON is valid and complete, with placeholder "..." content replaced by actual questions and options.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
        responseMimeType: 'application/json',
    }
  });
  return response;
};

export const evaluateOpenAnswer = async (passage: string, question: string, userAnswer: string): Promise<GenerateContentResponse> => {
    const prompt = `
    Based on the provided English text, evaluate the user's answer to a question.
    
    Text:
    ---
    ${passage}
    ---

    Question: "${question}"

    User's Answer: "${userAnswer}"

    Is the user's answer correct based *only* on the information in the text?
    Provide a concise evaluation. The response must be a JSON object with this exact structure:
    {
      "verdict": "Correct" | "Incorrect" | "Partially Correct",
      "explanation": "A brief explanation for your verdict, explaining why the answer is correct or incorrect."
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
     config: {
        responseMimeType: 'application/json',
    }
  });

  return response;
};


export const getWritingFeedback = async (topic: string, essay: string): Promise<GenerateContentResponse> => {
  const prompt = `
    あなたは日本の英語学習者向けのエキスパート英語教師です。以下のエッセイに対して、建設的なフィードバックを日本語で提供してください。
    
    トピック: "${topic}"

    エッセイ:
    ---
    ${essay}
    ---

    フィードバックは、前置きや余計な挨拶は不要です。すぐに核心をついた具体的な指摘から始めてください。
    以下の点に焦点を当て、丁寧かつ励ますようなトーンで記述してください。
    1.  文法と文構造の誤り。
    2.  語彙の選択と使い方。
    3.  アイデアの明確さと構成。
    4.  全体的な改善点と良い点。

    フィードバックは、読みやすいようにMarkdown形式（見出し、太字、箇条書きなど）を使用してください。
  `;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt
  });
  return response;
};


export const generateLearningPlan = async (preferences: UserData['preferences'], logs: UserData['logs']): Promise<GenerateContentResponse> => {
  // To keep the prompt concise, we'll summarize the last 5 activities.
  const recentActivitySummary = logs.slice(-5).map(log => 
    `- タイプ: ${log.type}, 詳細: ${JSON.stringify(log.details)}`
  ).join('\n');

  const prompt = `
    あなたは日本の英語学習者向けの優秀な学習コーチです。
    ユーザーの習熟度レベルは「${preferences.level}」で、学習目標は「${preferences.learningGoal}」です。
    最近のアクティビティは以下の通りです:
    ${recentActivitySummary || "最近のアクティビティはありません。"}
    
    具体的で実行可能な3〜4個の提案を含む、パーソナライズされた1週間の学習プランを作成してください。
    応答は、以下のスキーマに厳密に従った有効なJSONオブジェクトでなければなりません。また、すべてのテキストは日本語で記述してください。
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          week_focus: {
            type: Type.STRING,
            description: "今週ユーザーが集中すべきことについての、短く励みになる日本語の要約。"
          },
          suggestions: {
            type: Type.ARRAY,
            description: "3〜4個の具体的な学習提案の配列。",
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "'vocabulary', 'reading', or 'writing'" },
                category: { type: Type.STRING, description: "'vocabulary'タイプの場合。例: 'ビジネス'" },
                topic: { type: Type.STRING, description: "'reading'または'writing'タイプの場合。例: 'コーヒーの歴史'" },
                level: { type: Type.STRING, description: "'reading'タイプの場合。例: '中級 (B1)'" },
                reason: { type: Type.STRING, description: "この提案がユーザーの目標達成に役立つ理由の短い説明（日本語）。" }
              },
              required: ["type", "reason"]
            }
          }
        },
        required: ["week_focus", "suggestions"]
      },
    },
  });

  return response;
};

export const generateDistractors = async (words: {word: string, correctAnswer: string}[]): Promise<GenerateContentResponse> => {
    const prompt = `
    日本の英語学習者向けの単語クイズを作成しています。
    以下の英単語リストについて、正解の日本語訳に意味的に似ているが間違っている、巧妙な選択肢（ダミー選択肢）を3つずつ生成してください。
    
    入力単語リスト: ${JSON.stringify(words)}
    
    出力は以下のJSON形式に厳密に従ってください。
    {
      "words": [
        {
          "word": "英単語",
          "distractors": ["ダミー選択肢1", "ダミー選択肢2", "ダミー選択肢3"]
        }
      ]
    }
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json'
        }
    });
    return response;
}