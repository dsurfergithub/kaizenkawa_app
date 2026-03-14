import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/scrape", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      if (url.includes("instagram.com")) {
        return res.json({ platform: "instagram", content: null });
      } else if (url.includes("x.com") || url.includes("twitter.com")) {
        try {
          // Use Twitter oEmbed API to get tweet content publicly
          const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
          const response = await fetch(oembedUrl);
          if (!response.ok) {
            throw new Error("Failed to fetch from Twitter oEmbed");
          }
          const data = await response.json();
          // data.html contains the tweet embed HTML. We can strip tags.
          const html = data.html;
          const textContent = html.replace(/<[^>]*>?/gm, '').trim();
          return res.json({ platform: "x", content: textContent });
        } catch (e) {
          console.error("Scraping error:", e);
          return res.json({ platform: "x", content: null, error: "Failed to scrape. Please enter text manually." });
        }
      } else {
        return res.status(400).json({ error: "Unsupported platform. Please use X or Instagram." });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
