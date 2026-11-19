import express from "express";
import multer from "multer";
import OpenAI, { toFile } from "openai";
import Stripe from "stripe";
import "dotenv/config";

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const ADMIN = process.env.ADMIN_CODE;

const KEEP = " Keep the same composition, framing, pose and recognizable faces.";

const GROUPS = {
  "🎨 Peinture": [
    ["renaissance", "Renaissance italienne", "an Italian Renaissance oil portrait painting, sfumato shading, soft golden light, muted earthy colors, old master canvas texture"],
    ["baroque", "Baroque", "a Baroque royal portrait painting, dramatic chiaroscuro lighting, rich velvet and lace clothing, dark background"],
    ["vangogh", "Style Van Gogh", "a Van Gogh style oil painting, thick swirling brushstrokes, vivid blues and yellows"],
    ["impressionnisme", "Impressionnisme", "an Impressionist painting like Monet, soft pastel colors, visible dabs of paint, light and airy atmosphere"],
    ["artnouveau", "Art nouveau", "an Art Nouveau poster illustration, flowing lines, floral ornaments, golden decorative halo, elegant muted colors"],
    ["cubisme", "Cubisme", "a Cubist painting, face and objects broken into geometric planes, multiple viewpoints, bold earthy colors"],
    ["popart", "Pop Art", "a pop art silkscreen print, flat vivid colors, high contrast, bold graphic look"],
    ["aquarelle", "Aquarelle", "a delicate watercolor painting, soft bleeding colors, light romantic washes, white paper texture"],
    ["hyperrealiste", "Peinture hyperréaliste", "a hyperrealistic hand-painted oil painting on canvas, fine brushwork, realistic lighting, visible canvas texture"]
  ],
  "🎬 Films et animation": [
    ["anime", "Anime féerique", "a soft hand-drawn Japanese fantasy animation still, watercolor painted backgrounds, warm gentle light, magical atmosphere"],
    ["anim3d", "Film d'animation 3D", "a 3D animated feature film character render, big expressive eyes, soft lighting, polished cinematic look"],
    ["cartoonjaune", "Cartoon jaune", "a classic American TV cartoon, yellow skin, bold black outlines, flat bright colors, simple shapes"],
    ["papierdecoupe", "Papier découpé", "a crude construction-paper cutout cartoon, simple flat shapes, round heads, minimal details"],
    ["bdmultivers", "BD multivers", "a comic book animation look, halftone dots, offset colors, bold ink lines, mixed 2D and 3D, graphic effects"],
    ["anime90", "Anime années 90", "a 1990s Japanese anime cel, hand-drawn lines, slightly grainy film, nostalgic retro colors"],
    ["gothique", "Gothique fantaisie", "a whimsical gothic stop-motion style, pale skin, big dark-ringed eyes, spindly shapes, moody blue-grey palette"],
    ["cyberpunk", "Cyberpunk néon", "a cyberpunk night scene, neon pink and cyan lights, futuristic city, rain reflections, high-tech details"],
    ["jeuvideo", "Jeu vidéo néon", "a modern open-world video game cover art, neon sunset, bold outlines, cinematic"]
  ],
  "✏️ Dessin": [
    ["graphite", "Crayon graphite", "a realistic graphite pencil portrait drawing, black and white, fine shading, paper texture"],
    ["fusain", "Fusain", "a charcoal drawing, deep smudged shadows, expressive strokes, black and white, textured paper"],
    ["encre", "Encre de Chine", "a black Chinese ink drawing, expressive brush lines, white paper background"],
    ["bic", "Stylo bic", "a detailed drawing made only with a blue ballpoint pen, crosshatching, on white paper"],
    ["ligneclaire", "BD ligne claire", "a Franco-Belgian ligne claire comic panel, clean uniform black outlines, flat colors, no hatching"],
    ["manga", "Manga noir et blanc", "a black and white manga panel, screentones, strong contrast, detailed ink lines"],
    ["pastel", "Pastel sec", "a soft dry pastel drawing, powdery texture, gentle blended colors, on toned paper"],
    ["carnet", "Croquis de carnet", "a quick sketchbook drawing, loose visible pencil lines, spontaneous strokes, notebook paper"]
  ],
  "✨ Originaux": [
    ["steampunk", "Steampunk", "a steampunk Victorian scene, brass gears, goggles, leather and copper details, warm sepia tones"],
    ["artdeco", "Art déco", "a 1920s Art Deco poster, black and gold, geometric patterns, luxurious elegant style"],
    ["vaporwave", "Vaporwave", "a vaporwave aesthetic, pink and purple neon gradients, 1980s retro, glitch effects, dreamy nostalgia"],
    ["pixel", "Pixel Art", "retro 16-bit pixel art like an old video game, limited color palette, visible pixels"],
    ["graffiti", "Graffiti / Street Art", "a street art graffiti mural on a brick wall, spray paint, drips, bold vibrant colors"],
    ["estampe", "Estampe japonaise", "a traditional Japanese woodblock print, flat colors, fine outlines, washi paper texture"],
    ["fresque", "Fresque antique", "an ancient Roman fresco like Pompeii, faded pigments, cracked plaster wall texture"],
    ["royal18", "Portrait royal XVIIIe", "an 18th-century aristocratic portrait painting, powdered wigs, lavish gowns and costumes, Rococo pastel tones"]
  ]
};

const PROMPTS = Object.fromEntries(Object.values(GROUPS).flat().map(([id, , p]) => [id, p]));

const PLANS = {
  unit: { name: "Métamorphoz — 1 image", amount: 199, credits: 1, mode: "payment" },
  pack: { name: "Métamorphoz — Pack 10 images", amount: 999, credits: 10, mode: "payment" },
  sub:  { name: "Métamorphoz — Abonnement 30 images/mois", amount: 999, credits: 30, mode: "subscription" }
};

app.use(express.json());
app.use(express.static("public"));

app.get("/styles", (req, res) => {
  res.json(Object.entries(GROUPS).map(([name, list]) => ({
    name,
    styles: list.map(([id, label]) => ({ id, label }))
  })));
});

app.post("/checkout", async (req, res) => {
  try {
    const plan = PLANS[req.body.plan];
    if (!plan) return res.status(400).json({ error: "Offre inconnue" });
    const origin = req.headers.origin || "https://" + req.headers.host;
    const price_data = { currency: "eur", unit_amount: plan.amount, product_data: { name: plan.name } };
    if (plan.mode === "subscription") price_data.recurring = { interval: "month" };
    const session = await stripe.checkout.sessions.create({
      mode: plan.mode,
      line_items: [{ price_data, quantity: 1 }],
      metadata: { plan: req.body.plan },
      success_url: origin + "/?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin + "/#prix"
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Impossible d'ouvrir le paiement" });
  }
});

async function getPass(id) {
  if (!id || !id.startsWith("cs_")) return null;
  const s = await stripe.checkout.sessions.retrieve(id, { expand: ["payment_intent", "subscription"] });
  const plan = PLANS[s.metadata?.plan];
  if (!plan || s.payment_status !== "paid") return null;

  if (plan.mode === "payment") {
    const pi = s.payment_intent;
    const used = parseInt(pi.metadata.used || "0");
    return { left: plan.credits - used, use: () => stripe.paymentIntents.update(pi.id, { metadata: { used: String(used + 1) } }) };
  }

  const sub = s.subscription;
  if (!sub || !["active", "trialing"].includes(sub.status)) return null;
  const period = String(sub.current_period_start ?? sub.items.data[0].current_period_start);
  const used = sub.metadata.period === period ? parseInt(sub.metadata.used || "0") : 0;
  return { left: plan.credits - used, use: () => stripe.subscriptions.update(sub.id, { metadata: { period, used: String(used + 1) } }) };
}

app.get("/credits", async (req, res) => {
  try {
    if (ADMIN && req.query.admin === ADMIN) return res.json({ admin: true });
    const pass = await getPass(req.query.pass);
    res.json({ left: pass ? Math.max(0, pass.left) : 0 });
  } catch (e) {
    res.json({ left: 0 });
  }
});

app.post("/transform", upload.single("photo"), async (req, res) => {
  try {
    const style = PROMPTS[req.body.style];
    if (!req.file || !style) return res.status(400).json({ error: "Photo ou style manquant" });

    const isAdmin = ADMIN && req.body.admin === ADMIN;
    let pass = null;
    if (!isAdmin) {
      pass = await getPass(req.body.pass);
      if (!pass || pass.left <= 0) return res.status(402).json({ error: "Tu n'as plus de crédits. Choisis une offre pour continuer !" });
    }

    const image = await toFile(req.file.buffer, req.file.originalname, { type: req.file.mimetype });
    const result = await openai.images.edit({
      model: "gpt-image-1-mini",
      image,
      prompt: "Transform this photo into " + style + "." + KEEP,
      size: "auto",
      quality: "medium"
    });

    if (pass) await pass.use();
    res.json({ image: `data:image/png;base64,${result.data[0].b64_json}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "La transformation a échoué, réessaie avec une autre photo." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Site lancé sur le port " + PORT));
