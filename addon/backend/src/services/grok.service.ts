import axios from "axios";
import { config } from "../config";

const GROK_BASE_URL = "https://api.x.ai/v1";
const MODEL = "grok-4.3";

export interface GrokCardIdentification {
  name: string;
  set: string;
  number: string;
  language?: string;
  hp?: number;
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

IMPORTANT rules:
- The card may be printed in any language; ALWAYS return the English card name and English set name.
- For the card number: read the digits printed in the BOTTOM-RIGHT corner (format NN/TTT). Return ONLY the left part (before the slash), with NO leading zeros. Example: "085/132" → "85".
- Return the HP value printed on the card (the number next to "HP" at the top).

Return ONLY a valid JSON array (no markdown, no explanation) with this structure:
[
  {
    "name": "English card name",
    "set": "English set/expansion name",
    "number": "card number without leading zeros (e.g. '85' not '085')",
    "hp": 130
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

  let response;
  try {
    response = await axios.post<GrokResponse>(
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
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const body = JSON.stringify(err.response?.data ?? {});
      console.error(`[grok] HTTP ${err.response?.status} — ${body}`);
      throw new Error(`Grok API error ${err.response?.status}: ${body}`);
    }
    throw err;
  }

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
