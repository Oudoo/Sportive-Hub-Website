// Tailwind CSS 4 through PostCSS. Works with both bundlers; production builds use webpack
// (`next build --webpack`) because Hostinger's build environment cannot run the helper
// process Turbopack spawns for CSS transforms.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
