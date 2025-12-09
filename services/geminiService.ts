import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FighterStats } from "../types";

const FIGHTER_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "A creative, slightly edgy or mythical name for this fighter." },
    title: { type: Type.STRING, description: "An epic title like 'The Honoured One' or 'King of Curses'." },
    description: { type: Type.STRING, description: "A short, funny, or intense bio based on their facial expression." },
    hp: { type: Type.INTEGER, description: "Health points between 80 and 150." },
    speed: { type: Type.INTEGER, description: "Speed stat between 1 and 10." },
    power: { type: Type.INTEGER, description: "Power stat between 1 and 10." },
    specialMove: { type: Type.STRING, description: "Name of a special attack." },
    quote: { type: Type.STRING, description: "A battle start quote." },
  },
  required: ["name", "title", "description", "hp", "speed", "power", "specialMove", "quote"],
};

export async function analyzeFighters(
  image1Base64: string,
  image2Base64: string
): Promise<{ player1: FighterStats; player2: FighterStats }> {
  
  // Clean base64 strings if they contain headers
  const cleanBase64 = (str: string) => str.replace(/^data:image\/\w+;base64,/, "");

  // Fallback stats function
  const getFallbackStats = () => ({
      player1: {
        name: "Challenger",
        title: "The Unknown",
        description: "A mysterious warrior ready for battle.",
        hp: 120,
        speed: 6,
        power: 6,
        specialMove: "Rising Strike",
        quote: "Actions speak louder.",
      },
      player2: {
        name: "The Boss",
        title: "The Gatekeeper",
        description: "An imposing figure blocking the path.",
        hp: 130,
        speed: 5,
        power: 8,
        specialMove: "Cataclysm",
        quote: "You are not prepared.",
      },
  });

  try {
    if (!process.env.API_KEY) {
        console.warn("API_KEY is missing. Using fallback stats.");
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        return getFallbackStats();
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64(image1Base64),
            },
          },
          {
            text: "This is Player 1 (The Challenger).",
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64(image2Base64),
            },
          },
          {
            text: "This is Player 2 (The Boss). Analyze both faces. Generate RPG stats for a fighting game based on their expressions/vibes. Make it funny but epic.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            player1: FIGHTER_SCHEMA,
            player2: FIGHTER_SCHEMA,
          },
          required: ["player1", "player2"],
        },
        systemInstruction: "You are a game master for 'The Honoured One' fighting tournament. You analyze combatants and assign them stats based on their appearance (aura).",
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from Gemini");

    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return getFallbackStats();
  }
}