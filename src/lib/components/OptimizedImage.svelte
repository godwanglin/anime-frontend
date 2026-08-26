<script lang="ts">
	import { imageUrl } from '$lib/image-url';

	type Loading = 'eager' | 'lazy';
	type FetchPriority = 'high' | 'low' | 'auto';
	type Decoding = 'async' | 'sync' | 'auto';

	type Props = {
		src: string;
		alt: string;
		className?: string;
		imageClass?: string;
		sizes?: string;
		srcset?: string;
		webpSrcset?: string;
		avifSrcset?: string;
		loading?: Loading;
		fetchpriority?: FetchPriority;
		decoding?: Decoding;
		placeholder?: boolean;
		objectPosition?: string;
	};

	let {
		src,
		alt,
		className = '',
		imageClass = 'h-full w-full object-cover',
		sizes = '(max-width: 640px) 34vw, (max-width: 1024px) 24vw, 180px',
		srcset,
		webpSrcset,
		avifSrcset,
		loading = 'lazy',
		fetchpriority = 'low',
		decoding = 'async',
		placeholder = true,
		objectPosition,
		...restProps
	}: Props & Record<string, unknown> = $props();

	let loaded = $state(false);

	const resolvedSrc = $derived(imageUrl(src));
	const fallbackSrcset = $derived(
		srcset ??
			(resolvedSrc
				? `${resolvedSrc} 320w, ${resolvedSrc} 480w, ${resolvedSrc} 640w, ${resolvedSrc} 960w`
				: undefined)
	);

	function handleLoad() {
		loaded = true;
	}
</script>

<picture {...restProps} class="optimized-image {className} z-0" data-loaded={loaded}>
	{#if placeholder}
		<span class="optimized-image__skeleton" aria-hidden="true"></span>
	{/if}
	{#if avifSrcset}
		<source type="image/avif" srcset={avifSrcset} {sizes} />
	{/if}
	{#if webpSrcset}
		<source type="image/webp" srcset={webpSrcset} {sizes} />
	{/if}
	<img
		src={resolvedSrc}
		{alt}
		srcset={fallbackSrcset}
		{sizes}
		{loading}
		{decoding}
		{fetchpriority}
		class={imageClass}
		style:object-position={objectPosition}
		onload={handleLoad}
	/>
</picture>

<style>
	.optimized-image {
		position: relative;
		display: block;
		overflow: hidden;
		background: color-mix(in oklch, currentColor 7%, transparent);
	}

	.optimized-image img {
		display: block;
		opacity: 0;
		transition: opacity 180ms ease;
	}

	.optimized-image[data-loaded='true'] img {
		opacity: 1;
	}

	.optimized-image__skeleton {
		position: absolute;
		inset: 0;
		z-index: 0;
		background:
			linear-gradient(90deg, transparent, rgb(255 255 255 / 0.18), transparent),
			color-mix(in oklch, currentColor 8%, transparent);
		background-size: 200% 100%;
		animation: optimized-image-shimmer 1.1s linear infinite;
	}

	.optimized-image[data-loaded='true'] .optimized-image__skeleton {
		opacity: 0;
		animation: none;
		transition: opacity 160ms ease;
	}

	.optimized-image img {
		position: relative;
		z-index: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.optimized-image img,
		.optimized-image__skeleton {
			transition: none;
			animation: none;
		}
	}

	@keyframes optimized-image-shimmer {
		to {
			background-position: -200% 0;
		}
	}
</style>
