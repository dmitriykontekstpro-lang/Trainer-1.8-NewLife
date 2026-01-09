/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./App.{js,jsx,ts,tsx}",
        "./src/**/*.{js,jsx,ts,tsx}"
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                'flow-green': '#39FF14',
                'flow-blue': '#00F0FF',
                'flow-orange': '#FFAA00',
                'flow-dark-gray': '#111827',
            },
        },
    },
    plugins: [],
}
