import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateContextQuestion(
  content: string,
  platform: string,
  questionNumber: 1 | 2,
  previousAnswer?: string
): Promise<string> {
  let prompt = "";
  if (questionNumber === 1) {
    prompt = `Eres un asistente de IA para Kaizenkawa, una app que convierte posts de redes sociales en guías accionables.
El usuario quiere procesar este contenido de ${platform}:
"${content}"

Haz UNA pregunta corta y directa (máximo 15 palabras, en español) para entender cómo este contenido se relaciona con su vida personal o trabajo.`;
  } else {
    prompt = `Eres un asistente de IA para Kaizenkawa.
El usuario quiere procesar este contenido de ${platform}:
"${content}"

Su respuesta sobre cómo se relaciona con él/ella: "${previousAnswer}"

Haz UNA pregunta corta y directa (máximo 15 palabras, en español) para entender su horizonte temporal para tomar acción (ej. días vs meses).`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "¿Podrías darme más contexto?";
}

export interface Guide {
  summary: string;
  steps_short: string[];
  steps_long: string[];
  activation_question: string;
  topic_tag: string;
  suggested_status: "pending" | "irrelevant";
}

export async function generateGuide(
  content: string,
  platform: string,
  context1: string,
  context2: string
): Promise<Guide> {
  const prompt = `Crea una guía accionable en español basada en el siguiente contenido de ${platform} y el contexto del usuario.
Contenido: "${content}"
Relación del usuario con el contenido: "${context1}"
Horizonte temporal del usuario: "${context2}"

Genera un objeto JSON con la siguiente estructura:
- summary: Un resumen detallado que condense la información del post sin perder su esencia, incluyendo los puntos clave mencionados (puede ser extenso, 1 o 2 párrafos).
- steps_short: Un array de 3 pasos accionables para esta semana.
- steps_long: Un array de 2 pasos accionables para los próximos 30-90 días.
- activation_question: Una sola pregunta profunda para impulsarlos a empezar HOY.
- topic_tag: Una sola palabra categorizando el tema (ej. productividad, salud, finanzas, relaciones, aprendizaje, creatividad, negocios, otro).
- suggested_status: "pending" o "irrelevant".`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          steps_short: { type: Type.ARRAY, items: { type: Type.STRING } },
          steps_long: { type: Type.ARRAY, items: { type: Type.STRING } },
          activation_question: { type: Type.STRING },
          topic_tag: { type: Type.STRING },
          suggested_status: { type: Type.STRING, enum: ["pending", "irrelevant"] },
        },
        required: ["summary", "steps_short", "steps_long", "activation_question", "topic_tag", "suggested_status"],
      },
    },
  });

  const jsonStr = response.text?.trim() || "{}";
  return JSON.parse(jsonStr) as Guide;
}
