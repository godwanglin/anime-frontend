<script lang="ts">
	import { getFrameTweak, type EquippedFrame } from '$lib/decorations';

	type Props = {
		src?: string | null;
		alt?: string;
		size?: number;
		frame?: EquippedFrame;
		rounded?: 'full' | 'square';
		fallbackInitial?: string;
		/** Render only the frame (no inner avatar) — useful for shop previews */
		framePreviewOnly?: boolean;
		/** Extra scale multiplier applied on top of the per-asset tweak */
		frameScale?: number;
		class?: string;
		fromComment?: boolean; // TODO: remove after migrating all comment avatars to this component
		el?: any; // Optional anchor element for popover positioning (used in comments)
		onclick?: () => void;
	};

	let {
		src,
		alt = '',
		size = 48,
		frame = null,
		rounded = 'full',
		fallbackInitial,
		framePreviewOnly = false,
		frameScale = 1,
		class: className = '',
		fromComment = false,
		el = $bindable<HTMLButtonElement | null>(null),
		onclick
	}: Props = $props();

	const radius = $derived(rounded === 'full' ? '9999px' : 'var(--radius-xl, 14px)');
	const initial = $derived(((fallbackInitial ?? alt.trim().charAt(0)) || '?').toUpperCase());
	const tweak = $derived(getFrameTweak(frame?.asset));
	const framePct = $derived(Math.round(tweak.scale * frameScale * 100));

	const offsetX = $derived(tweak.offsetX ?? 0);
	const offsetYperAsset: any = {
		'border5.gif': -4,
		'border8.webp': 1
	};

	const getoffsetYdefault = () => {
		if (fromComment) {
			return offsetYperAsset[frame?.asset as any] ?? tweak.offsetY ?? 0;
		}
		return tweak.offsetY ?? 0;
	};
	const offsetY = $derived(
		fromComment && getoffsetYdefault() ? getoffsetYdefault() : (tweak.offsetY ?? 0)
	);
	const showInner = $derived(!framePreviewOnly);
</script>

<button
	{onclick}
	bind:this={el}
	class="avatar-wrapper {className}"
	style="width: {size}px; height: {size}px; --frame-radius: {radius};"
>
	{#if showInner}
		<span class="avatar-inner">
			{#if src}
				<img {src} {alt} loading="lazy" decoding="async" class="avatar-img" />
			{:else}
				<span class="avatar-fallback" aria-hidden={alt ? 'false' : 'true'}>{initial}</span>
			{/if}
		</span>
	{/if}

	{#if frame?.assetUrl}
		<img
			src={frame.assetUrl}
			alt=""
			aria-hidden="true"
			loading="lazy"
			decoding="async"
			draggable="false"
			class="avatar-frame-overlay"
			style="
				width: {framePct}%;
				height: {framePct}%;
				transform: translate(calc(-50% + {offsetX}px), calc(-50% + {offsetY}px));"
			onerror={(event) => {
				(event.currentTarget as HTMLImageElement).style.display = 'none';
			}}
		/>
	{/if}
</button>

<style>
	.avatar-wrapper {
		position: relative;
		display: inline-block;
		flex-shrink: 0;
		/* Prevent overlay overflow from triggering parent scrollbars */
		isolation: isolate;
	}

	.avatar-inner {
		position: absolute;
		inset: 0;
		border-radius: var(--frame-radius);
		overflow: hidden;
		background: var(--surface-offset, #1f1f29);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.avatar-fallback {
		font-weight: 800;
		font-size: 42%;
		color: var(--accent-text, #fff);
		background: var(--accent-surface, oklch(0.88 0.08 280));
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-frame-overlay {
		position: absolute;
		top: 50%;
		left: 50%;

		width: auto; /* reset */
		height: auto; /* reset */
		max-width: none; /* 🔥 penting */
		max-height: none; /* 🔥 penting */

		pointer-events: none;
		user-select: none;
		object-fit: contain;
		z-index: 10;

		will-change: transform;
	}
</style>
