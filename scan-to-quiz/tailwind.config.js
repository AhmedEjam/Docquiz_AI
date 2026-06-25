/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#ffffff',
          secondary: '#f9fafb',
          info: '#eff6ff',
        },
        text: {
          primary: '#111827',
          secondary: '#6b7280',
          info: '#2563eb',
          success: '#16a34a',
        },
        border: {
          tertiary: '#e5e7eb',
          info: '#bfdbfe',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
      }
    },
  },
  plugins: [],
}
