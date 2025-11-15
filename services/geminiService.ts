
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { UserData, ReadingQuizContent } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateReadingQuiz = async (topic: string, level: string): Promise<GenerateContentResponse> => {
  const prompt = `
    Generate a complete English reading comprehension quiz for an English learner.
    The learner's level is ${level}.
    The topic is "${topic}". Please generate a passage and questions related to this topic.
    
    To ensure variety, consider these themes based on level:
    - If the level is 'Beginner (A2)', focus on topics like daily routines, hobbies, family, or simple travel stories.
    - If the level is 'Intermediate (B1)', focus on topics like technology in everyday life, cultural events, environmental issues, or work-related situations.
    - If the level is 'Advanced (C1)', focus on more abstract or academic topics like scientific breakthroughs, economic trends, social commentary, or literary analysis.

    The response must be a JSON object that strictly follows this structure:
    {
      "passage": "A reading passage of about 150-200 words, appropriate for the specified level.",
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
      "openQuestion": {
        "question": "An open-ended question that requires a short written answer based on the passage."
      }
    }
    Ensure the JSON is valid and complete.
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
    You are an expert English teacher. Please provide constructive feedback on the following essay written by an English learner.
    
    Topic: "${topic}"

    Essay:
    ---
    ${essay}
    ---

    Your feedback should be encouraging and helpful. Focus on:
    1.  Grammar and sentence structure errors.
    2.  Vocabulary choice and usage.
    3.  Clarity and organization of ideas.
    4.  Overall positive reinforcement.

    Please format your feedback using Markdown. Use headings, bold text, and bullet points to make it easy to read.
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
    `- Type: ${log.type}, Details: ${JSON.stringify(log.details)}`
  ).join('\n');

  const prompt = `
    You are an expert English learning coach. A user with the proficiency level "${preferences.level}" wants to achieve the goal: "${preferences.learningGoal}".
    Their recent activity is:
    ${recentActivitySummary || "No recent activity."}
    
    Create a personalized, one-week learning plan with 3-4 concrete suggestions.
    The response MUST be a valid JSON object following this exact schema.
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
            description: "A short, encouraging summary of what the user should focus on this week."
          },
          suggestions: {
            type: Type.ARRAY,
            description: "An array of 3 to 4 specific learning suggestions.",
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "'vocabulary', 'reading', or 'writing'" },
                category: { type: Type.STRING, description: "For 'vocabulary' type. e.g. 'Business'" },
                topic: { type: Type.STRING, description: "For 'reading' or 'writing' types. e.g., 'The History of Coffee'" },
                level: { type: Type.STRING, description: "For 'reading' type. e.g., 'Intermediate (B1)'" },
                reason: { type: Type.STRING, description: "A brief reason why this suggestion is helpful for the user's goal." }
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