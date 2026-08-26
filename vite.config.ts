import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		allowedHosts: ['test.weebinhub.com'],
		proxy: {
			'/api': {
				target: 'https://api.weebinhub.com',
				changeOrigin: true
			}
		}
	},
	preview: {
		allowedHosts: ['test.weebinhub.com'],
		port: 5173
	}
});
