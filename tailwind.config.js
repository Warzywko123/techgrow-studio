/** @type {import('tailwindcss').Config} */
// Ta konfiguracja jest przeniesiona 1:1 z bloku `tailwind.config` , ktory wczesniej
// siedzial w kazdym pliku HTML i byl czytany przez cdn.tailwindcss.com.
module.exports = {
  content: ['./*.html'],
  theme: {
    extend: {
      colors: {
        paper: '#DCE8F7',
        ink: '#0F1B33',
        inkmuted: '#3D537A',
        bp: '#1D4ED8',
        bpbright: '#0891B2',
        gold: '#C77E10',
        goldhover: '#A96A0C',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
