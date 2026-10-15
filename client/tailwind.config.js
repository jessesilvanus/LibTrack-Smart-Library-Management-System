/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          canvas: '#080C14',
          surface: '#0E1424',
          card: '#121A2D',
          hover: '#18233C',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(16, 185, 129, 0.3)',
        },
        neon: {
          emerald: '#10B981',
          cyan: '#06B6D4',
          teal: '#14B8A6',
          amber: '#F59E0B',
          rose: '#F43F5E',
          purple: '#A855F7',
        },
        brand: {
          navy: '#1B2A4A',
          'navy-hover': '#142038',
          'navy-subtle': '#EBF0F7',
          teal: '#10B981',
          'teal-hover': '#059669',
          'teal-subtle': '#ECFDF5',
        },
        canvas: '#080C14',
        surface: '#0E1424',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Outfit', 'system-ui', 'sans-serif'],
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.07)',
        'card-hover': '0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(16, 185, 129, 0.3), 0 0 30px -5px rgba(16, 185, 129, 0.2)',
        elevation: '0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 4px 10px -2px rgba(0, 0, 0, 0.3)',
        modal: '0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.12)',
        'glow-emerald': '0 0 30px -4px rgba(16, 185, 129, 0.4)',
        'glow-cyan': '0 0 30px -4px rgba(6, 182, 212, 0.4)',
        'glow-amber': '0 0 30px -4px rgba(245, 158, 11, 0.4)',
        'glow-rose': '0 0 30px -4px rgba(244, 63, 94, 0.4)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};
