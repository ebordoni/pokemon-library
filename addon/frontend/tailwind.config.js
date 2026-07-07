/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        pokemon: {
          red: "#CC0000",
          blue: "#3B4CCA",
          yellow: "#FFDE00",
          gold: "#B3A125",
        },
      },
      // Pokémon energy type colors for card type badges
      energy: {
        fire: "#F08030",
        water: "#6890F0",
        grass: "#78C850",
        lightning: "#F8D030",
        psychic: "#F85888",
        fighting: "#C03028",
        darkness: "#705848",
        metal: "#B8B8D0",
        dragon: "#7038F8",
        colorless: "#A8A878",
        fairy: "#EE99AC",
      },
    },
  },
  plugins: [],
};
