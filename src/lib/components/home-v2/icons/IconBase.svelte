<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		size?: number | string;
		strokeWidth?: number;
		class?: string;
		title?: string;
		children: Snippet;
	};

	let {
		size = 16,
		strokeWidth = 1.75,
		class: cls = '',
		title,
		children
	}: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class={cls}
	role={title ? 'img' : 'presentation'}
	aria-hidden={title ? undefined : 'true'}
	aria-label={title}
>
	{#if title}<title>{title}</title>{/if}
	{@render children()}
</svg>
