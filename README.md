# 🎋 Kaizenkawa

> **Convierte el *scroll* pasivo en pasos accionables.**

¿Cuántas veces has guardado un hilo de Twitter o un Reel de Instagram súper inspirador y nunca más lo has vuelto a mirar? **Kaizenkawa** nace para solucionar el síndrome de la "biblioteca digital olvidada". 

Inspirada en la filosofía **Kaizen** (mejora continua), esta aplicación web utiliza Inteligencia Artificial para analizar ese contenido que guardas y transformarlo en una guía práctica, personalizada y dividida en pequeños pasos que puedes empezar a aplicar hoy mismo.

---

## ✨ Características Principales

* 🧠 **Análisis Inteligente:** Pega un enlace de X (Twitter) o Instagram y la IA extraerá el valor real del contenido.
* 💬 **Contexto Personalizado:** Antes de darte una guía genérica, la app te hace un par de preguntas rápidas para adaptar los consejos a tu vida y situación actual.
* 🗺️ **Guías de Acción:** Recibe un plan de acción dividido en "Esta Semana" y "30-90 Días", además de una pregunta activadora para empezar *hoy*.
* 🔖 **Gestor de Enlaces:** ¿No tienes tiempo de procesar un enlace ahora? Guárdalo en tu lista de lectura categorizada (Finanzas, Crecimiento Personal, Recetas, etc.).
* 📊 **Dashboard Visual:** Observa tu progreso con gráficos interactivos. Descubre cuántas guías has aplicado, cuántas tienes pendientes y qué categorías consumes más.
* 💾 **Copias de Seguridad:** Exporta e importa todos tus datos (guías y enlaces) en un archivo JSON. ¡Tus datos son tuyos!
* ⬇️ **Exportación:** Descarga tus guías en formato `.txt` para llevarlas a Notion, Obsidian o tu bloc de notas favorito.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend:** React 19, Vite, Tailwind CSS (v4).
* **Animaciones e Iconos:** Framer Motion (`motion/react`) y Lucide React.
* **Gráficos:** Recharts.
* **IA:** Google Gemini API (`@google/genai`).
* **Backend/Despliegue:** Funciones Serverless preparadas para Vercel (`@vercel/node`).

---

## 🚀 Instalación y Uso Local

Si quieres correr Kaizenkawa en tu propia máquina, sigue estos pasos:

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/kaizenkawa.git
   cd kaizenkawa
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno:**
   Crea un archivo `.env` en la raíz del proyecto y añade tu clave de la API de Gemini:
   ```env
   GEMINI_API_KEY=tu_clave_api_aqui
   ```

4. **Inicia el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   ¡Abre `http://localhost:3000` en tu navegador y empieza a mejorar!

---

## ☁️ Despliegue en Vercel

Kaizenkawa está optimizada para ser desplegada en Vercel sin dolores de cabeza (incluye configuración para evitar el error 404 en aplicaciones SPA y funciones Serverless para el scraping).

1. Sube tu código a GitHub.
2. Entra en [Vercel](https://vercel.com) e importa tu repositorio.
3. En la sección **Environment Variables**, añade `GEMINI_API_KEY` con tu clave secreta.
4. Haz clic en **Deploy**. ¡Listo! 🚀

---

## 🤝 Contribuir

¡Las contribuciones son súper bienvenidas! Si tienes ideas para mejorar la extracción de enlaces, añadir nuevas plataformas o mejorar los prompts de la IA, siéntete libre de hacer un *fork* y enviar un *Pull Request*.

---

*Diseñado con 🍵 y enfoque en la mejora continua.*
