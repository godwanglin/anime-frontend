<script lang="ts">
	import Analytics from '$lib/components/Analytics.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { siteConfig as siteConfigStore } from '$lib/stores/siteConfig.svelte';
	import { onMount } from 'svelte';

	import '../app.css';

	let { data, children } = $props();

	const siteConfig = $derived((data.siteConfig ?? {}) as Record<string, string>);

	$effect(() => {
		siteConfigStore.setConfig(siteConfig);
	});

	onMount(() => {
		notifications.init().catch(() => null);
	});
</script>

<svelte:head>
	<link rel="icon" href={siteConfig['site.favicon'] ?? '/icon.png'} />
	<link rel="apple-touch-icon" href={siteConfig['site.logo'] ?? '/icon.png'} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content={siteConfig['appearance.primaryColor'] ?? '#7c3aed'} />
</svelte:head>

<Analytics {siteConfig} />

{#if siteConfig['appearance.announcementBar']}
	<div class="bg-violet-600 px-4 py-2 text-center text-xs font-bold text-white">
		{siteConfig['appearance.announcementBar']}
	</div>
{/if}

{@render children()}
