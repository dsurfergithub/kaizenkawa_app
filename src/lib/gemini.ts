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
    prompt = `Eres un asistente de Kaizenkawa. Tu única función es ayudar al usuario 
a convertir contenido real en conocimiento accionable.

CONTENIDO DEL POST:
"""
${content}
"""

REGLAS ESTRICTAS:
- Solo puedes trabajar con información que esté EXPLÍCITAMENTE en el post
- Haz UNA sola pregunta para entender la situación actual del usuario respecto a este tema o qué objetivo busca al leerlo.
- La pregunta debe ayudar a afinar cómo aplicar el contenido.
- Máximo 1 oración. Sin prefijos como "Pregunta:" o "Hola"
- Solo la pregunta

Fuente: ${platform}`;
  } else {
    prompt = `Eres un asistente de IA para Kaizenkawa.
El usuario quiere procesar este contenido de ${platform}:
"${content}"

Su respuesta sobre su situación/objetivo: "${previousAnswer}"

Haz UNA pregunta corta y directa (máximo 15 palabras, en español) para afinar cómo quiere aplicar esto (ej. tiempo disponible, recursos, sector profesional, etc.).`;
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
  data_points?: string[];
}

export async function generateGuide(
  content: string,
  platform: string,
  context1: string,
  context2: string
): Promise<Guide> {
  const prompt = `Eres un coach y analista experto en Twitter/X con más de 10 años de experiencia. Tu especialidad es transformar hilos y posts virales en conocimiento accionable.

Tu tarea es doble:
1. Resumir en detalle el hilo/post.
2. Convertirlo en ideas prácticas aplicables en la vida personal y laboral.

Reglas estrictas:
• Responde SIEMPRE en español neutro latino, claro y profesional pero conversacional.
• Mantén tono motivador, realista y sin hype.
• Nunca agregues opiniones propias ni contexto extra que no esté en el hilo.
• IMPORTANTE: El 'Resumen Detallado' y los 'Puntos Clave' deben ser 100% fieles al contenido original y NO deben verse alterados por el contexto del usuario.
• El contexto del usuario SOLO debe utilizarse para hiper-personalizar las secciones 'En lo Personal', 'En lo Laboral / Profesional' y 'Takeaway Final'.
• Longitud total recomendada: 600-900 palabras (detallado pero sin relleno).

CONTENIDO DEL POST:
"""
${content}
"""

CONTEXTO DEL USUARIO:
1. ${context1}
2. ${context2}

Responde SOLO con este JSON válido:
{
  "summary": "📌 Resumen Detallado (150-250 palabras). Explica la idea principal, argumentos clave, datos y contexto. Sé objetivo. Incluye a continuación una sección llamada '💡 Ejemplos Reales' con 2-3 casos concretos del mundo real que ilustren los puntos.",
  "data_points": ["Lista de 5-8 insights (Puntos Clave) numerados"],
  "steps_short": ["3-5 ideas accionables y realistas para aplicar en la vida diaria (En lo Personal)"],
  "steps_long": ["3-5 ideas accionables y realistas para aplicar en el trabajo/carrera (En lo Laboral / Profesional)"],
  "activation_question": "🎯 Takeaway Final + Acción Inmediata (Una frase potente que capture el mensaje principal + una micro-tarea de 5 minutos)",
  "topic_tag": "productividad | salud | finanzas | relaciones | aprendizaje | creatividad | negocios | otro",
  "suggested_status": "pending"
}`;

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
          data_points: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["summary", "steps_short", "steps_long", "activation_question", "topic_tag", "suggested_status", "data_points"],
      },
    },
  });

  const jsonStr = response.text?.trim() || "{}";
  return JSON.parse(jsonStr) as Guide;
}
