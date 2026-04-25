<script lang="ts">
	import { page } from '$app/state';
	import { siteConfig } from '$lib/stores/siteConfig.svelte';
	import { pageTitle as pg } from '$lib/stores/page.svelte';
	type Props = {
		title?: string;
		description?: string;
		image?: string;
		type?: string;
		noindex?: boolean;
	};

	let { title, description, image, type = 'website', noindex = false }: Props = $props();

	$effect(() => {
		pg.value = title ?? siteConfig.config['site.name'] ?? 'AniStream';
	});

	const config = $derived(
		((page.data.siteConfig as Record<string, string> | undefined) ??
			siteConfig.config ??
			{}) as Record<string, string>
	);
	const siteName = $derived(config['site.name'] ?? 'AniStream');
	const titleTemplate = $derived(config['seo.titleTemplate'] ?? '%s - AniStream');
	const defaultTitle = $derived(
		config['seo.defaultTitle'] ?? `${siteName} - Nonton Anime Sub Indo`
	);
	const pageTitle = $derived(title ? titleTemplate.replace('%s', title) : defaultTitle);
	const pageDescription = $derived(
		description ?? config['seo.defaultDescription'] ?? config['site.description'] ?? ''
	);
	const baseUrl = $derived(
		(config['site.url'] ?? config['seo.canonicalUrl'] ?? '').replace(/\/$/, '')
	);
	const canonicalUrl = $derived(`${baseUrl}${page.url.pathname}`);
	const rawImage = $derived(image ?? config['seo.ogImage'] ?? config['site.logo'] ?? '/icon.png');
	const absoluteImage = $derived(
		rawImage.startsWith('http')
			? rawImage
			: `${baseUrl}${rawImage.startsWith('/') ? rawImage : `/${rawImage}`}`
	);
	const structuredData = $derived(config['seo.structuredData'] ?? '');
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	{#if config['seo.keywords']}
		<meta name="keywords" content={config['seo.keywords']} />
	{/if}
	<meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} />
	{#if baseUrl}
		<link rel="canonical" href={canonicalUrl} />
	{/if}

	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:image" content={absoluteImage} />
	<meta property="og:type" content={type} />
	{#if baseUrl}
		<meta property="og:url" content={canonicalUrl} />
	{/if}
	<meta property="og:site_name" content={siteName} />
	<meta property="og:locale" content="id_ID" />

	<meta name="twitter:card" content={config['seo.twitterCard'] ?? 'summary_large_image'} />
	{#if config['seo.twitterSite']}
		<meta name="twitter:site" content={config['seo.twitterSite']} />
	{/if}
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:image" content={absoluteImage} />

	{#if structuredData}
		<script type="application/ld+json">
{structuredData}
		</script>
	{/if}
</svelte:head>
