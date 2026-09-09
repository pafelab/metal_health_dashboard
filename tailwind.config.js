/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'Prompt', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: '#F5F7FB',
        s1: { DEFAULT: '#EA580C', 50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 300: '#FDBA74', 400: '#FB923C', 500: '#F97316', 600: '#EA580C', 700: '#C2410C' },
        s2: { DEFAULT: '#2563EB', 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
        sev: { black: '#1E293B', red: '#E11D48', yellow: '#F59E0B' },
      },
      borderRadius: { card: '24px' },
      boxShadow: { card: '0 4px 20px rgba(15, 23, 42, 0.06)', cardHover: '0 8px 30px rgba(15, 23, 42, 0.10)' },
      fontSize: {
        body: ['18px', { lineHeight: '1.7' }],
        cardTitle: ['22px', { lineHeight: '1.4' }],
        sectionTitle: ['28px', { lineHeight: '1.35' }],
        kpi: ['56px', { lineHeight: '1.1' }],
        chartLabel: ['14px', { lineHeight: '1.5' }],
        tableText: ['16px', { lineHeight: '1.6' }],
      },
    },
  },
  plugins: [],
}
