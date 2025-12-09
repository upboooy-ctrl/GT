import { FighterStats } from "../types";

// Helper to generate a number based on string hash
const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const TITLES = ["The Destroyer", "The Honoured One", "King of Curses", "The Prodigy", "Shadow Hunter", "Divine General", "The Immortal"];
const DESCRIPTIONS = [
    "Possesses an aura that distorts reality.",
    "A warrior from a forgotten timeline.",
    "Standing at the pinnacle of strength.",
    "Eyes that see through all techniques.",
    "Fueled by pure chaotic energy."
];
const QUOTES = [
    "You are weak.",
    "Throughout heaven and earth, I alone am the honoured one.",
    "Let's curse each other to death.",
    "Nah, I'd win.",
    "Show me what you've got."
];

export async function analyzeFighters(
  image1Base64: string,
  image2Base64: string
): Promise<{ player1: FighterStats; player2: FighterStats }> {
  
  // Simulate processing time locally
  await new Promise(resolve => setTimeout(resolve, 800));

  const generateStats = (img: string, defaultName: string): FighterStats => {
      const seed = hashString(img.substring(0, 100)); // Use first 100 chars for seed
      
      const hp = 120 + (seed % 81); // 120-200
      const speed = 5 + (seed % 6); // 5-10
      const power = 5 + ((seed * 2) % 6); // 5-10
      
      return {
          name: defaultName,
          title: TITLES[seed % TITLES.length],
          description: DESCRIPTIONS[seed % DESCRIPTIONS.length],
          hp: hp,
          speed: speed,
          power: power,
          specialMove: "Signature Move", // Placeholder, overwritten by UI
          quote: QUOTES[seed % QUOTES.length]
      };
  };

  return {
    player1: generateStats(image1Base64, "Player 1"),
    player2: generateStats(image2Base64, "Player 2")
  };
}