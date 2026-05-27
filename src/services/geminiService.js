import { GoogleGenAI } from "@google/genai";

function getApiKey() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY não encontrada.");
  }

  return apiKey;
}

export async function generateTeamAssessment(prompt, data) {
  const ai = new GoogleGenAI({
    apiKey: getApiKey(),
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
${prompt}

DADOS ESTRUTURADOS DA AVALIAÇÃO:

${JSON.stringify(data, null, 2)}
    `,
  });

  return response.text;
}