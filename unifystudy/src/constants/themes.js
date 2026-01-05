
export const THEMES = [
  // Free / Default
  { id: "light", name: "Light Mode", price: 0, color: "#f8f9fa", type: 'free' },

  // Coding Classics
  { id: "dracula", name: "Dracula", price: 150, color: "#bd93f9", type: 'classic' },
  { id: "monokai", name: "Monokai Pro", price: 150, color: "#f92672", type: 'classic' },
  
  // Premium Overhauls (New)
  { id: "tokyo", name: "Tokyo Night", price: 250, color: "linear-gradient(45deg, #100c24, #2a1b3d)", type: 'premium' },
  { id: "cozy", name: "Cozy Study", price: 300, color: "rgb(50, 40, 35)", type: 'premium' },
  { id: "cute", name: "Cute / Pastel", price: 300, color: "#fff5fa", type: 'premium' },
  { id: "lofi", name: "Lofi Vibes", price: 250, color: "#3c2f29", type: 'premium' },
  { id: "nature", name: "Nature", price: 250, color: "#0f1e14", type: 'premium' },
  { id: "beach", name: "Vaporwave Beach", price: 350, color: "#281428", type: 'premium' },
  { id: "city", name: "Modern City", price: 250, color: "#141414", type: 'premium' },

  // Legacy/Others (mapped to nearest equivalent or kept if CSS exists)
  { id: "cyberpunk", name: "Cyberpunk", price: 250, color: "#00ffff", type: 'legacy' },
  { id: "midnight", name: "Midnight Purple", price: 300, color: "#6c5ce7", type: 'legacy' },
];
