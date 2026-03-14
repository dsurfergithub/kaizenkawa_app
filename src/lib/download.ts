import { Guide } from "./gemini";

export function downloadGuide(guide: Guide, postUrl: string) {
  const content = `GUÍA KAIZENKAWA
================
Fuente: ${postUrl}
Tema: ${guide.topic_tag.toUpperCase()}

RESUMEN DETALLADO
-----------------
${guide.summary}

ESTA SEMANA (Corto Plazo)
-------------------------
${guide.steps_short.map((step, i) => `${i + 1}. ${step}`).join("\n")}

PRÓXIMOS 30-90 DÍAS (Largo Plazo)
---------------------------------
${guide.steps_long.map((step, i) => `${i + 1}. ${step}`).join("\n")}

EMPIEZA HOY
-----------
${guide.activation_question}
`;

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kaizenkawa-guia-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
