
import CosmosBanner from "@/assets/shop/cosmos-banner.svg?url";
import CircuitBanner from "@/assets/shop/circuit-banner.svg?url";
import WavesBanner from "@/assets/shop/waves-banner.svg?url";

export const PROFILE_TAGS = [
  { id: "scholar", name: "🎓 Scholar", description: "For the dedicated learner", price: 150, color: "#6c5ce7" },
  { id: "champion", name: "🏆 Champion", description: "Top performer", price: 500, color: "#ffd700" },
  { id: "night-owl", name: "🦉 Night Owl", description: "Studies past midnight", price: 200, color: "#4b6c82" },
  { id: "early-bird", name: "🌅 Early Bird", description: "Starts before dawn", price: 200, color: "#e17055" },
  { id: "coffee-club", name: "☕ Coffee Club", description: "Fueled by caffeine", price: 100, color: "#6f4e37" },
  { id: "verified", name: "✅ Verified", description: "Official status", price: 1000, color: "#00b894" },
  { id: "vip", name: "💎 VIP", description: "Very Important Pupil", price: 2000, color: "#E91E63" },
  { id: "legend", name: "👑 Legend", description: "Study Legend", price: 5000, color: "#FFD700" },
  { id: "goat", name: "🐐 G.O.A.T", description: "Greatest of All Time", price: 7500, color: "#fff" },
  { id: "coder", name: "👨‍💻 Coder", description: "Born to code", price: 300, color: "#00ff41" },
];

export const BANNERS = [
  // Defaults
  { id: "default", name: "Ocean", type: "gradient", price: 0, preview: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  
  // Shop Items
  { id: "cosmos", name: "Cosmos", type: "svg", price: 500, preview: CosmosBanner },
  { id: "circuit", name: "Circuit", type: "svg", price: 450, preview: CircuitBanner },
  { id: "waves", name: "Teal Waves", type: "svg", price: 350, preview: WavesBanner },
  { id: "cyber", name: "Cyberpunk", type: "gradient", price: 200, preview: "linear-gradient(135deg, #00d4ff 0%, #005bea 100%)" }, // Updated to match profile gradient
  { id: "matrix", name: "Matrix", type: "gradient", price: 200, preview: "linear-gradient(135deg, #00ff41 0%, #008f11 100%)" },
  { id: "sunset", name: "Sunset", type: "gradient", price: 200, preview: "linear-gradient(135deg, #f5576c 0%, #f093fb 100%)" },
  { id: "galaxy", name: "Galaxy", type: "gradient", price: 300, preview: "linear-gradient(to right, #654ea3, #eaafc8)" },
  { id: "fire", name: "Inferno", type: "gradient", price: 300, preview: "linear-gradient(to right, #f12711, #f5af19)" },
  
  // Profile Defaults (from profile.tsx) - Mapping them to IDs
  { id: "gradient-3", name: "Forest", type: "gradient", price: 0, preview: "#00b894" },
  { id: "gradient-4", name: "Aurora", type: "gradient", price: 0, preview: "#6c5ce7" },
];
