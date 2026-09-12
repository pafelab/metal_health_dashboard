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
        s1: { DEFAULT: '#EA580C', 50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 300: '#FDBA74', 400: '#FB923C', 500: '#F97316', 600: '#EA580C', 700: '#C2410C', 800: '#9A3412', 900: '#7C2D12' },
        // 800/900 were missing, so `bg-s2-800` silently emitted nothing. The blue scale now runs
        // the full 50-900 like s1 does, which the deck's dark card header bands need.
        s2: { DEFAULT: '#2563EB', 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8', 800: '#1E40AF', 900: '#1E3A8A' },
        sev: { black: '#1E293B', red: '#E11D48', yellow: '#F59E0B' },

        /* ------------------------------------------------------------------------------------
         * Categorical series palette. Eight hues in a fixed order, for the multi-category widgets
         * the redesign adds (the 4 risk-factor tiles, the 5-way ประเภทผู้ป่วย donut, the 7-group
         * การประเมินกลุ่มผู้ป่วย bar). Always assign by INDEX so the same category keeps the same
         * colour across widgets.
         *
         *   bg-cat-N       fill    — chart series, swatches, solid blocks (not for small text)
         *   text-cat-ink-N text    — the same hue darkened to >= 4.5:1 on white (WCAG AA)
         *   bg-cat-soft-N  tint    — pale background behind cat-ink-N text (badges, tiles)
         *
         * cat-1..4 are the recommended four for the risk-factor card; adjacent pairs stay
         * distinguishable for the common red/green colour-vision deficiencies.
         * ---------------------------------------------------------------------------------- */
        cat: {
          1: '#2563EB', // blue
          2: '#EA580C', // orange (matches s1)
          3: '#0D9488', // teal
          4: '#7C3AED', // violet
          5: '#DB2777', // pink
          6: '#16A34A', // green
          7: '#CA8A04', // yellow
          8: '#64748B', // slate — reserve for "อื่น ๆ" / unknown
          ink: {
            1: '#1D4ED8',
            2: '#C2410C',
            3: '#0F766E',
            4: '#6D28D9',
            5: '#BE185D',
            6: '#15803D',
            7: '#A16207',
            8: '#475569',
          },
          soft: {
            1: '#DBEAFE',
            2: '#FFEDD5',
            3: '#CCFBF1',
            4: '#EDE9FE',
            5: '#FCE7F3',
            6: '#DCFCE7',
            7: '#FEF9C3',
            8: '#F1F5F9',
          },
        },

        /* NOTE: the choropleth tier ramps deliberately do NOT live here. Both maps and both
         * legends read them from PALETTE.mapTiers (src/config/palette.ts) as inline fills,
         * because ECharts needs the raw hex for its visualMap pieces — a Tailwind class cannot
         * reach a canvas. A duplicate `tier.warm`/`tier.cool` scale used to sit here, went
         * unused, and then silently fell out of sync when the ramps were darkened so the
         * lightest tier would stop looking like "no events". One source of truth instead. */

        /* Score bands for the 13-zone scoring table. Each band is an ink colour (>= 4.5:1 on
         * white AND on its own `-soft` tint) plus the tint to sit it on. `na` is for zones with
         * no data — deliberately grey so an absent score never reads as a good one. */
        score: {
          good: { DEFAULT: '#047857', soft: '#ECFDF5' },
          fair: { DEFAULT: '#A16207', soft: '#FEFCE8' },
          poor: { DEFAULT: '#BE123C', soft: '#FFF1F2' },
          na: { DEFAULT: '#475569', soft: '#F1F5F9' },
        },
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
