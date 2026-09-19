
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const { GoogleGenAI } = require("@google/genai");
const { InferenceClient } = require("@huggingface/inference");

const app = express();

app.use(cors());
app.use(express.json());

// ======================================
// AI SETUP
// ======================================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const hf = new InferenceClient(
  process.env.HF_TOKEN
);

// ======================================
// IMAGES FOLDER SETUP
// ======================================

const imagesFolder = path.join(
  __dirname,
  "public",
  "images"
);

if (!fs.existsSync(imagesFolder)) {
  fs.mkdirSync(imagesFolder, {
    recursive: true
  });
}

// Serve generated images
app.use(
  "/images",
  express.static(imagesFolder)
);

// ======================================
// HOME ROUTE
// ======================================

app.get("/", (req, res) => {
  res.send(
    "AI Comic Generator Backend is Running!"
  );
});

// ======================================
// API 1: GENERATE COMIC STORYBOARD
// ======================================

app.post("/api/generate", async (req, res) => {
  try {
    const {
      story,
      style,
      panels
    } = req.body;

    if (!story || !story.trim()) {
      return res.status(400).json({
        error: "Story is required"
      });
    }

    const panelCount = Number(panels);

    if (![4, 5, 6, 8].includes(panelCount)) {
      return res.status(400).json({
        error: "Invalid panel count"
      });
    }

    const prompt = `
You are an expert comic storyboard writer.

Convert the user's story into exactly
${panelCount} sequential comic panels.

Comic style: ${style}

IMPORTANT RULES:
1. Maintain character consistency.
2. Connect every panel logically.
3. Give every panel a clear visual description.
4. Use short and natural dialogue.
5. Do not add unnecessary characters.
6. Do not include text or speech bubbles
   inside visual_description.
7. Use an empty string when dialogue
   or narration is not required.

For every panel provide:
- panel_number
- visual_description
- dialogue
- narration

DIALOGUE RULES:
- Maximum 15 words.
- Suitable for a speech bubble.
- Do not use quotation marks.
- Keep dialogue easy to understand.

NARRATION RULES:
- Keep narration short.
- Describe important actions,
  location, time, or emotions.
- Do not repeat dialogue.

User story:
${story}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",

      contents: prompt,

      config: {
        responseMimeType: "application/json",

        responseSchema: {
          type: "object",

          properties: {
            panels: {
              type: "array",

              items: {
                type: "object",

                properties: {
                  panel_number: {
                    type: "integer"
                  },

                  visual_description: {
                    type: "string"
                  },

                  dialogue: {
                    type: "string"
                  },

                  narration: {
                    type: "string"
                  }
                },

                required: [
                  "panel_number",
                  "visual_description",
                  "dialogue",
                  "narration"
                ],

                additionalProperties: false
              }
            }
          },

          required: ["panels"],

          additionalProperties: false
        }
      }
    });

    const comicData = JSON.parse(
      response.text
    );

    res.json(comicData);

  } catch (error) {
    console.error(
      "Gemini Storyboard Error:",
      error
    );

    res.status(500).json({
      error: error.message ||
        "Failed to generate comic panels"
    });
  }
});

// ======================================
// API 2: GENERATE AI COMIC IMAGE
// ======================================

app.post(
  "/api/generate-image",
  async (req, res) => {
    try {
      const {
        visual_description,
        style,
        panel_number
      } = req.body;

      if (!visual_description) {
        return res.status(400).json({
          error: "Visual description is required"
        });
      }

      const imagePrompt = `
Create a single comic panel illustration.

Art style: ${style || "Comic book"}

Scene:
${visual_description}

Requirements:
- Clear character expressions
- Consistent illustration style
- Colorful comic artwork
- No speech bubbles
- No written text
- No captions
- Square composition
- Suitable for a comic storyboard
`;

      console.log(
        "Generating image with Hugging Face..."
      );

      const imageBlob = await hf.textToImage({
        model:
          "black-forest-labs/FLUX.1-schnell",

        inputs: imagePrompt
      });

      const imageBuffer = Buffer.from(
        await imageBlob.arrayBuffer()
      );

      const fileName =
        `panel-${panel_number || "x"}-${Date.now()}.png`;

      const filePath = path.join(
        imagesFolder,
        fileName
      );

      fs.writeFileSync(
        filePath,
        imageBuffer
      );

      res.json({
        success: true,

        imageUrl:
          `http://localhost:5000/images/${fileName}`
      });

    } catch (error) {
      console.error(
        "Hugging Face Image Error:",
        error
      );

      res.status(500).json({
        error: error.message ||
          "Failed to generate comic image"
      });
    }
  }
);

// ======================================
// START SERVER
// ======================================

const PORT = 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});