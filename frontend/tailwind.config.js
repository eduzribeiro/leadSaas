/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                space: '#1A1A1A',     // Cinza Espacial
                chrome: '#E0E0E0',    // Prata Cromado
                neon: '#4ADE80',      // Verde Claro
            }
        },
    },
    plugins: [],
}
