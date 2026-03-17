# Kaizenkawa

Kaizenkawa es una aplicación web diseñada para transformar contenido extenso, hilos de X (Twitter) y posts de Instagram en conocimiento accionable y práctico para tu vida personal y profesional.

## Características Principales

- **Análisis de Contenido Inteligente**: Pega texto extenso o enlaces de X/Instagram y deja que la IA analice el contenido.
- **Coach Personalizado**: La IA actúa como un coach experto, haciéndote preguntas clave para entender tu situación y objetivos antes de generar la guía.
- **Guías Accionables**: Genera resúmenes detallados y pasos prácticos divididos en:
  - En lo Personal
  - En lo Laboral / Profesional
  - Takeaway Final + Acción Inmediata
- **Gestión de Enlaces**: Guarda enlaces interesantes para leer más tarde, categorizados por temas (Finanzas, Espiritual, Crecimiento personal, etc.).
- **Dashboard y Estadísticas**: Visualiza tu progreso, el estado de tus guías y la distribución de tus enlaces guardados.
- **Copias de Seguridad**: Exporta e importa tus datos (guías y enlaces) en formato JSON para no perder nunca tu información.
- **Reinicio de la App**: Una "Zona de Peligro" en el Dashboard te permite borrar todos los datos y reiniciar la aplicación fácilmente.

## Tecnologías Utilizadas

- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion (para animaciones), Recharts (para gráficos), Lucide React (para iconos).
- **Backend**: Express.js (para manejar el scraping básico de URLs).
- **Inteligencia Artificial**: Google Gemini API (`@google/genai`) para el análisis de texto y generación de guías personalizadas.
- **Almacenamiento**: `localStorage` del navegador para mantener tus datos privados y accesibles localmente.

## Estructura del Proyecto

- `/src/App.tsx`: Componente principal de la aplicación que maneja el estado, la interfaz de usuario y la lógica de navegación.
- `/src/lib/gemini.ts`: Integración con la API de Google Gemini, incluyendo los prompts del sistema y la validación de esquemas JSON.
- `/src/lib/download.ts`: Utilidad para exportar las guías generadas a formato Markdown.
- `/server.ts`: Servidor Express que maneja la extracción de contenido de URLs y sirve la aplicación en producción.

## Uso

1. **Analizar Contenido**: En la vista principal, pega un texto extenso o un enlace.
2. **Responder Preguntas**: El asistente te hará un par de preguntas para afinar el contexto.
3. **Leer la Guía**: Obtén tu guía personalizada y marca los pasos como aplicados.
4. **Guardar Enlaces**: Ve a la pestaña "Enlaces" para guardar contenido que quieras procesar más tarde.
5. **Dashboard**: Revisa tus estadísticas y gestiona tus copias de seguridad.

## Privacidad

Todos tus datos (guías, enlaces y respuestas) se guardan localmente en tu navegador mediante `localStorage`. No se envían datos a servidores externos, excepto el contenido que se envía a la API de Gemini para su análisis.
