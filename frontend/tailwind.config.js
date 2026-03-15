/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                space: '#1A1A1A',
                chrome: '#E0E0E0',
                neon: '#4ADE80',
            },
            boxShadow: {
                'neon': '0 0 15px rgba(74, 222, 128, 0.5)',
                'danger': '0 0 15px rgba(239, 68, 68, 0.5)',
            }
        },
    },
    plugins: [],
}
