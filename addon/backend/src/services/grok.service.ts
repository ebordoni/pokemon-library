import axios from "axios";
import { config } from "../config";

const GROK_BASE_URL = "https://api.x.ai/v1";
const MODEL = "grok-2-vision-latest";

export interface GrokCardIdentification {
  name: string;
  set: string;
  number: string;
  language?: string;
}

interface GrokResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const IDENTIFICATION_PROMPT = `
You are an expert Pokémon TCG card identifier.
Analyze this image and identify every Pokémon Trading Card Game card visible.
Return ONLY a valid JSON array (no markdown, no explanation) with this structure:
[
  {
    "name": "card name in English",
    "set": "set/expansion name",
    "number": "card number (e.g. 4/102)",
    "language": "EN"
  }
]
If no cards are found, return an empty array: []
`.trim();

/**
 * Identifies Pokémon TCG cards from a base64-encoded image using the Grok Vision API.
 * Returns up to 4 identified cards.
 */
export async function identifyCardsFromImage(
  imageBase64: string,
  mimeType: string,
): Promise<GrokCardIdentification[]> {
  if (!config.grokApiKey) {
    throw new Error("Grok API key is not configured");
  }

  const response = await axios.post<GrokResponse>(
    `${GROK_BASE_URL}/chat/completions`,
    {
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: IDENTIFICATION_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 1024,
    },
    {
      headers: {
        Authorization: `Bearer ${config.grokApiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const content = response.data.choices[0]?.message?.content ?? "[]";

  // Strip potential markdown code fences before parsing
  const cleaned = content
    .replace(/^```json?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed: unknown = JSON.parse(cleaned);
  if (!Array.isArray(parsed))
    throw new Error("Grok returned unexpected format");

  return parsed as GrokCardIdentification[];
}
