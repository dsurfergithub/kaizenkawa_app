import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
}
