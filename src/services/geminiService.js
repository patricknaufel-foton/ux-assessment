import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateTeamAssessment(prompt, data) {

  const fullPrompt = `
${prompt}

DADOS ESTRUTURADOS DA AVALIAÇÃO:

${JSON.stringify(data, null, 2)}
  `;

  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {

    try {

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
      });

      return response.text;

    } catch (error) {

      lastError = error;

      console.warn(
        `Tentativa ${attempt} falhou. Tentando novamente...`
      );

      if (attempt < 3) {
        await sleep(2000 * attempt);
      }
    }
  }

  console.error(lastError);

  throw new Error(
    "O Gemini está temporariamente sobrecarregado. Tente novamente em alguns segundos."
  );
}