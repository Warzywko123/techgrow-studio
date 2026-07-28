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
        // #C77E10 z białym napisem dawało 3.27:1 — poniżej progu WCAG AA (4.5:1).
        gold: '#a6690d',
        // Tekst zlota na jasnym tle (bg-paper) potrzebuje ciemniejszego odcienia:
        // #a6690d daje tam 3.64:1, a przy tej wielkosci pisma potrzeba 4.5:1.
        goldtext: '#915c0b',
        goldhover: '#8a5709',
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
