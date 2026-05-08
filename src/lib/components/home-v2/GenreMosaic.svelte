<script lang="ts">
	import GridIcon from './icons/GridIcon.svelte';
	import ChevronRightIcon from './icons/ChevronRightIcon.svelte';

	type Genre = {
		id: number;
		name: string;
		animeCount: number;
	};

	let { genres = [] }: { genres?: Genre[] } = $props();

	const top = $derived([...genres].sort((a, b) => b.animeCount - a.animeCount).slice(0, 8));

	type Tone = { from: string; to: string; glow: string };
	const tones: Tone[] = [
		{ from: '#7c3aed', to: '#ec4899', glow: 'rgba(124,58,237,0.45)' },
		{ from: '#0ea5e9', to: '#22d3ee', glow: 'rgba(14,165,233,0.45)' },
		{ from: '#f97316', to: '#ef4444', glow: 'rgba(249,115,22,0.45)' },
		{ from: '#10b981', to: '#0ea5e9', glow: 'rgba(16,185,129,0.45)' },
		{ from: '#a855f7', to: '#f43f5e', glow: 'rgba(168,85,247,0.45)' },
		{ from: '#facc15', to: '#f59e0b', glow: 'rgba(250,204,21,0.45)' },
		{ from: '#06b6d4', to: '#3b82f6', glow: 'rgba(59,130,246,0.45)' },
		{ from: '#e879f9', to: '#8b5cf6', glow: 'rgba(232,121,249,0.45)' }
	];

	function tone(i: number): Tone {
		return tones[i % tones.length];
	}
</script>

{#if top.length > 0}
	<section class="gm-section mb-10" aria-label="Jelajahi genre">
		<header class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2.5">
				<span class="gm-icon-badge">
					<GridIcon size={14} />
				</span>
				<div>
					<h2 class="text-[15px] sm:text-base font-black" style="color: var(--text-primary);">
						Jelajahi Genre
					</h2>
					<p class="text-[11px] -mt-0.5" style="color: var(--text-faint);">
						Pilih dunia favoritmu
					</p>
				</div>
			</div>
			<a
				href="/genre"
				class="gm-link inline-flex items-center gap-1 text-[12px] font-bold transition-colors"
			>
				Semua genre
				<ChevronRightIcon size={14} />
			</a>
		</header>

		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
			{#each top as g, i (g.id)}
				{@const t = tone(i)}
				<a
					href="/browse?genre={encodeURIComponent(g.name)}"
					class="gm-tile group"
					style="--g-from: {t.from}; --g-to: {t.to}; --g-glow: {t.glow};"
				>
					<div class="gm-tile-bg"></div>
					<div class="gm-tile-noise" aria-hidden="true"></div>
					<div class="gm-tile-orb gm-orb-1" aria-hidden="true"></div>
					<div class="gm-tile-orb gm-orb-2" aria-hidden="true"></div>
					<div class="gm-tile-content">
						<span class="gm-tile-count">{g.animeCount}</span>
						<div class="gm-tile-meta">
							<p class="gm-tile-name">{g.name}</p>
							<p class="gm-tile-judul">judul</p>
						</div>
						<span class="gm-tile-arrow">
							<ChevronRightIcon size={14} />
						</span>
					</div>
				</a>
			{/each}
		</div>
	</section>
{/if}

<style>
	.gm-icon-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 32px;
		width: 32px;
		border-radius: 10px;
		background: linear-gradient(135deg, #06b6d4, #3b82f6);
		color: white;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
	}

	.gm-link {
		color: var(--accent);
	}

	.gm-link:hover {
		color: var(--accent-hover);
	}

	.gm-tile {
		position: relative;
		display: block;
		isolation: isolate;
		aspect-ratio: 1.25 / 1;
		border-radius: 22px;
		overflow: hidden;
		transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 280ms ease;
		box-shadow: 0 8px 24px var(--g-glow), 0 1px 0 oklch(from #ffffff l c h / 0.18) inset;
	}

	.gm-tile:hover {
		transform: translateY(-4px);
		box-shadow: 0 18px 44px var(--g-glow), 0 1px 0 oklch(from #ffffff l c h / 0.3) inset;
	}

	.gm-tile-bg {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, var(--g-from), var(--g-to));
		z-index: -2;
	}

	.gm-tile-noise {
		position: absolute;
		inset: 0;
		opacity: 0.4;
		z-index: -1;
		mix-blend-mode: overlay;
		background-image:
			radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.18), transparent 35%),
			radial-gradient(circle at 80% 70%, rgba(0, 0, 0, 0.18), transparent 40%);
	}

	.gm-tile-orb {
		position: absolute;
		border-radius: 9999px;
		filter: blur(18px);
		z-index: -1;
		pointer-events: none;
		transition: transform 380ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.gm-orb-1 {
		top: -28%;
		right: -18%;
		height: 90%;
		width: 90%;
		background: oklch(from #ffffff l c h / 0.32);
	}

	.gm-orb-2 {
		bottom: -32%;
		left: -22%;
		height: 75%;
		width: 75%;
		background: oklch(0 0 0 / 0.32);
	}

	.gm-tile:hover .gm-orb-1 {
		transform: translate(-10px, 12px) scale(1.08);
	}

	.gm-tile:hover .gm-orb-2 {
		transform: translate(8px, -10px) scale(1.05);
	}

	.gm-tile-content {
		position: relative;
		display: grid;
		grid-template-rows: 1fr auto;
		height: 100%;
		padding: 14px 16px;
		color: white;
	}

	.gm-tile-count {
		position: absolute;
		top: 12px;
		right: 14px;
		font-family: 'Bebas Neue', 'Lexend Deca', sans-serif;
		font-size: 38px;
		font-weight: 400;
		line-height: 1;
		color: rgba(255, 255, 255, 0.92);
		letter-spacing: 0.005em;
		text-shadow: 0 2px 16px rgba(0, 0, 0, 0.25);
	}

	.gm-tile-meta {
		grid-row: 2;
		min-width: 0;
	}

	.gm-tile-name {
		font-size: 16px;
		font-weight: 900;
		letter-spacing: -0.01em;
		line-height: 1.15;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
	}

	.gm-tile-judul {
		margin-top: 1px;
		font-size: 10.5px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		opacity: 0.78;
	}

	.gm-tile-arrow {
		position: absolute;
		bottom: 14px;
		right: 14px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 28px;
		width: 28px;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.18);
		border: 1px solid rgba(255, 255, 255, 0.28);
		backdrop-filter: blur(10px);
		transition: all 220ms ease;
	}

	.gm-tile:hover .gm-tile-arrow {
		background: rgba(255, 255, 255, 0.95);
		color: #1a1714;
		transform: translateX(2px);
	}

	@media (hover: none) {
		.gm-tile:hover {
			transform: none;
		}
		.gm-tile:hover .gm-orb-1,
		.gm-tile:hover .gm-orb-2 {
			transform: none;
		}
	}

	/* Mobile/touch perf: disable expensive filter blurs that tank scroll */
	@media (max-width: 768px) {
		.gm-tile-orb {
			display: none;
		}
		.gm-tile-arrow {
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
		}
	}

	.gm-section {
		content-visibility: auto;
		contain-intrinsic-size: 0 540px;
	}
</style>
