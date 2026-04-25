<script lang="ts">
	import { tick } from 'svelte';

	type TimelineMenuItem = {
		key: string;
		label: string;
		icon?: string;
		shortcut?: string;
		danger?: boolean;
		disabled?: boolean;
	};

	let {
		x,
		y,
		items = [],
		loadingKey = '',
		loadingText = 'Sedang generate...',
		onSelect = () => null
	}: {
		x: number;
		y: number;
		items: TimelineMenuItem[];
		loadingKey?: string;
		loadingText?: string;
		onSelect?: (key: string) => void;
	} = $props();

	let menuEl = $state<HTMLDivElement>();
	let position = $state({ x: 0, y: 0 });

	async function clampPosition() {
		position = { x, y };
		await tick();
		if (!menuEl) return;
		const rect = menuEl.getBoundingClientRect();
		const padding = 12;
		position = {
			x: Math.max(padding, Math.min(x, window.innerWidth - rect.width - padding)),
			y: Math.max(padding, Math.min(y, window.innerHeight - rect.height - padding))
		};
	}

	$effect(() => {
		void clampPosition();
	});
</script>

<div
	bind:this={menuEl}
	data-context-menu
	class="tl-menu"
	style:left={`${position.x}px`}
	style:top={`${position.y}px`}
	role="menu"
	aria-busy={loadingKey.length > 0}
	tabindex="-1"
>
	{#each items as item (item.key)}
		<button
			type="button"
			role="menuitem"
			class="tl-menu-item {item.danger ? 'is-danger' : ''} {loadingKey === item.key ? 'is-loading' : ''}"
			disabled={item.disabled || loadingKey.length > 0}
			onclick={() => onSelect(item.key)}
		>
			{#if loadingKey === item.key}
				<span class="tl-menu-loading-glow"></span>
				<span class="tl-menu-loading-noise"></span>
				<span class="tl-menu-main tl-menu-main-loading">
					<span class="tl-menu-loading-badge">AI</span>
					<span class="material-symbols-rounded tl-menu-icon tl-menu-icon-spin">auto_awesome</span>
					<span class="tl-menu-loading-copy">
						<strong>{item.label}</strong>
						<small>{loadingText}</small>
					</span>
				</span>
				<span class="tl-menu-loading-dots" aria-hidden="true">
					<i></i>
					<i></i>
					<i></i>
				</span>
			{:else}
				<span class="tl-menu-main">
					{#if item.icon}
						<span class="material-symbols-rounded tl-menu-icon">{item.icon}</span>
					{/if}
					<span>{item.label}</span>
				</span>
				{#if item.shortcut}
					<span class="tl-menu-shortcut">{item.shortcut}</span>
				{/if}
			{/if}
		</button>
	{/each}
</div>

<style>
	.tl-menu {
		position: fixed;
		z-index: 80;
		min-width: 220px;
		padding: 0.45rem;
		border-radius: 0.9rem;
		border: 1px solid oklch(1 0 0 / 0.09);
		background:
			linear-gradient(180deg, oklch(0.18 0.01 286), oklch(0.14 0.01 286)),
			oklch(0.14 0.01 286);
		box-shadow:
			0 18px 44px oklch(0 0 0 / 0.42),
			0 2px 10px oklch(0 0 0 / 0.24);
		backdrop-filter: blur(14px);
	}

	.tl-menu-item {
		position: relative;
		overflow: hidden;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.65rem 0.8rem;
		border: none;
		border-radius: 0.7rem;
		background: transparent;
		color: #e4e4e7;
		text-align: left;
		font-size: 0.86rem;
		cursor: pointer;
		transition:
			background 120ms ease,
			color 120ms ease,
			transform 120ms ease;
	}

	.tl-menu-item:hover:not(:disabled) {
		background: oklch(0.34 0.14 273 / 0.26);
		transform: translateX(1px);
	}

	.tl-menu-item:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.tl-menu-item.is-danger {
		color: #fca5a5;
	}

	.tl-menu-item.is-loading {
		background:
			linear-gradient(135deg, oklch(0.34 0.1 270 / 0.42), oklch(0.22 0.03 270 / 0.3)),
			oklch(0.18 0.02 286 / 0.8);
		border: 1px solid oklch(0.72 0.14 275 / 0.24);
		color: #f5f3ff;
		box-shadow:
			inset 0 1px 0 oklch(1 0 0 / 0.16),
			0 0 0 1px oklch(0.72 0.14 275 / 0.1),
			0 12px 24px oklch(0.05 0.01 286 / 0.32);
		isolation: isolate;
	}

	.tl-menu-main {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
	}

	.tl-menu-main-loading {
		align-items: flex-start;
		gap: 0.72rem;
	}

	.tl-menu-icon {
		font-size: 1rem;
		position: relative;
		z-index: 2;
	}

	.tl-menu-icon-spin {
		animation: tl-menu-spin 1.2s linear infinite;
	}

	.tl-menu-loading-badge {
		position: relative;
		z-index: 2;
		min-width: 1.8rem;
		height: 1.8rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		border: 1px solid oklch(1 0 0 / 0.12);
		background:
			linear-gradient(180deg, oklch(0.88 0.16 285 / 0.2), oklch(0.64 0.14 278 / 0.12)),
			oklch(0.32 0.08 280 / 0.66);
		box-shadow:
			inset 0 1px 0 oklch(1 0 0 / 0.22),
			0 8px 20px oklch(0.04 0.01 286 / 0.28);
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: #f5f3ff;
	}

	.tl-menu-loading-copy {
		display: inline-flex;
		flex-direction: column;
		gap: 0.14rem;
		position: relative;
		z-index: 2;
	}

	.tl-menu-loading-copy strong {
		font-size: 0.85rem;
		font-weight: 700;
	}

	.tl-menu-loading-copy small {
		font-size: 0.7rem;
		color: #c4b5fd;
		letter-spacing: 0.02em;
	}

	.tl-menu-loading-glow {
		position: absolute;
		inset: -10%;
		background:
			linear-gradient(110deg, transparent 20%, oklch(0.82 0.17 285 / 0.3) 48%, transparent 76%),
			linear-gradient(180deg, oklch(0.84 0.12 282 / 0.08), transparent 70%);
		filter: blur(6px);
		animation: tl-menu-glitch 1.8s ease-in-out infinite;
		pointer-events: none;
	}

	.tl-menu-loading-noise {
		position: absolute;
		inset: 0;
		background:
			repeating-linear-gradient(
				180deg,
				oklch(1 0 0 / 0.07) 0 1px,
				transparent 1px 4px
			),
			linear-gradient(90deg, transparent, oklch(0.8 0.12 282 / 0.1), transparent);
		mix-blend-mode: screen;
		opacity: 0.65;
		pointer-events: none;
		animation: tl-menu-scan 1.6s linear infinite;
	}

	.tl-menu-loading-dots {
		position: relative;
		z-index: 2;
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 0.26rem;
		padding-top: 0.18rem;
	}

	.tl-menu-loading-dots i {
		width: 0.34rem;
		height: 0.34rem;
		border-radius: 999px;
		background: #ddd6fe;
		box-shadow: 0 0 10px oklch(0.86 0.17 286 / 0.4);
		animation: tl-menu-dot 1s ease-in-out infinite;
	}

	.tl-menu-loading-dots i:nth-child(2) {
		animation-delay: 0.14s;
	}

	.tl-menu-loading-dots i:nth-child(3) {
		animation-delay: 0.28s;
	}

	.tl-menu-shortcut {
		font-size: 0.72rem;
		color: #71717a;
	}

	@keyframes tl-menu-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes tl-menu-glitch {
		0%,
		100% {
			transform: translate3d(-8%, 0, 0);
			opacity: 0.42;
		}
		35% {
			transform: translate3d(6%, -3%, 0);
			opacity: 0.78;
		}
		58% {
			transform: translate3d(-2%, 4%, 0);
			opacity: 0.36;
		}
		82% {
			transform: translate3d(9%, 1%, 0);
			opacity: 0.68;
		}
	}

	@keyframes tl-menu-scan {
		0% {
			transform: translateY(-100%);
		}
		100% {
			transform: translateY(100%);
		}
	}

	@keyframes tl-menu-dot {
		0%,
		100% {
			transform: translateY(0);
			opacity: 0.45;
		}
		50% {
			transform: translateY(-3px);
			opacity: 1;
		}
	}
</style>
