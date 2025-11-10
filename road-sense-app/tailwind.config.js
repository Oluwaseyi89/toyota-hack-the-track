/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Custom screens for different dashboard displays
      screens: {
        'xs': '360px',    // Smallest dashboard displays
        'sm': '640px',    // Standard mobile
        'md': '768px',    // Tablet/medium dashboard
        'lg': '1024px',   // Large dashboard
        'xl': '1280px',   // Extra large (primary racing display)
        '2xl': '1536px',  // Ultra-wide racing displays
        'dashboard-sm': '800px',   // Custom dashboard breakpoint
        'dashboard-lg': '1200px',  // Main racing display
        'dashboard-xl': '1600px',  // Wide format racing display
      },
      
      // Racing-inspired colors
      colors: {
        // Primary racing colors
        racing: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',  // Primary blue
          600: '#0284c7',  // Speed blue
          700: '#0369a1',  // Deep racing blue
          800: '#075985',  // Dark racing blue
          900: '#0c4a6e',  // Midnight racing
        },
        // Performance/warning colors
        performance: {
          green: '#10b981',   // Optimal performance
          yellow: '#f59e0b',  // Warning/caution
          orange: '#f97316',  // High alert
          red: '#ef4444',     // Critical/danger
          purple: '#8b5cf6',  // Boost/turbo
        },
        // Carbon fiber/dark theme
        carbon: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',    // Carbon dark
          900: '#0f172a',    // Carbon black
          950: '#020617',    // Pure carbon
        }
      },
      
      // Racing-inspired typography
      fontFamily: {
        'racing': ['Orbitron', 'monospace'],      // Digital racing font
        'display': ['Rajdhani', 'sans-serif'],    // Sporty display font
        'sans': ['Inter', 'system-ui', 'sans-serif'], // Clean readable
        'mono': ['JetBrains Mono', 'monospace'],  // Data displays
      },
      
      // Animation for racing effects
      animation: {
        'pulse-rapid': 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shift-up': 'shiftUp 0.2s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'race-flash': 'raceFlash 0.1s ease-in-out',
      },
      
      keyframes: {
        shiftUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #0ea5e9' },
          '100%': { boxShadow: '0 0 20px #0ea5e9, 0 0 30px #0ea5e9' },
        },
        raceFlash: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      
      // Custom spacing for dense dashboard layouts
      spacing: {
        'dashboard-sm': '0.5rem',
        'dashboard-md': '1rem',
        'dashboard-lg': '1.5rem',
        'dashboard-xl': '2rem',
      },
      
      // Enhanced data visualization
      backdropBlur: {
        'dashboard': '8px',
      },
      
      // Grid templates for dashboard layouts
      gridTemplateColumns: {
        'dashboard': 'repeat(auto-fit, minmax(200px, 1fr))',
        'racing-metrics': '1fr 2fr 1fr',
        'telemetry': 'repeat(4, minmax(0, 1fr))',
      },
    },
  },
  plugins: [], // Remove the plugin requirements for now
}














// /** @type {import('tailwindcss').Config} */
// module.exports = {
//   content: [
//     "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
//     "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
//   ],
//   darkMode: 'class',
//   theme: {
//     extend: {},
//   },
//   plugins: [],
// }








// /** @type {import('tailwindcss').Config} */
// module.exports = {
//   content: [],
//   theme: {
//     extend: {},
//   },
//   plugins: [],
// }

