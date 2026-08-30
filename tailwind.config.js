/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
    },
    extend: {
      colors: {
        cream: '#F7F5F2',
        charcoal: '#2D2A26',
        terracotta: '#C45C3E',
        'terracotta-dark': '#A64A30',
        gold: '#B89B72',
        'gold-light': '#D4B88F',
        stone: {
          50: '#FAF9F7',
          100: '#F2F0EC',
          200: '#E6E2DB',
          300: '#D1CCC2',
          400: '#A8A095',
          500: '#8A8178',
          600: '#6E655D',
          700: '#524B45',
          800: '#36312D',
          900: '#2D2A26',
        },
      },
      fontFamily: {
        // 国内网络无法稳定访问 Google Fonts，优先使用各平台系统中文字体回退
        serif: ['"Noto Serif SC"', '"Songti SC"', 'STSong', 'SimSun', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 4px 20px -4px rgba(45, 42, 38, 0.08)',
        card: '0 8px 30px -6px rgba(45, 42, 38, 0.12)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'pulse-border': 'pulseBorder 2s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseBorder: {
          '0%, 100%': { borderColor: 'rgba(196, 92, 62, 0.4)' },
          '50%': { borderColor: 'rgba(196, 92, 62, 1)' },
        },
      },
    },
  },
  plugins: [],
};
