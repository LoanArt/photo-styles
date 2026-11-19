import express from "express";
import multer from "multer";
import OpenAI, { toFile } from "openai";
import "dotenv/config";

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STYLES = {
  vangogh: "Transform this photo into an oil painting with swirling, thick brushstrokes in the style of post-impressionism, vivid blues and yellows.",
  anime: "Transform this photo into a soft hand-drawn Japanese animation style, watercolor backgrounds, warm gentle lighting.",
  bic: "Transform this photo into a detailed drawing made only with a blue ballpoint pen, crosshatching, on white paper.",
  encre: "Transform this photo into a black Chinese ink drawing, expressive brush lines, white paper background.",
  jeuvideo: "Transform this photo into a modern open-world video game cover art style, neon sunset, bold outlines, cinematic."
};

app.use(express.static("public"));

app.post("/transform", upload.single("photo"), async (req, res) => {
  try {
    const prompt = STYLES[req.body.style];
    if (!req.file || !prompt) return res.status(400).json({ error: "Photo ou style manquant" });

    const image = await toFile(req.file.buffer, req.file.originalname, { type: req.file.mimetype });
    const result = await openai.images.edit({ model: "gpt-image-1-mini", image, prompt, size: "1024x1024" });

    res.json({ image: `data:image/png;base64,${result.data[0].b64_json}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "La transformation a échoué" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Site lancé sur le port " + PORT));
