import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		allowedHosts: ['test.weebin.site']
	},
	preview: {
		allowedHosts: ['test.weebin.site'],
		port: 5173
	}
});
