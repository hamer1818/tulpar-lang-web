import starlightPlugin from '@astrojs/starlight-tailwind';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				// Extend Tailwind with Starlight's accent color if needed
				accent: '#1bbdbf',
			},
		},
	},
	plugins: [starlightPlugin()],
};
