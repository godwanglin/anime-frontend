<script lang="ts">
	import ShuffleIcon from './icons/ShuffleIcon.svelte';
	import CalendarIcon from './icons/CalendarIcon.svelte';
	import CompassIcon from './icons/CompassIcon.svelte';
	import GridIcon from './icons/GridIcon.svelte';
	import FlameIcon from './icons/FlameIcon.svelte';

	type Action = {
		href: string;
		label: string;
		hint: string;
		icon: any;
		tone: 'violet' | 'rose' | 'cyan' | 'amber' | 'emerald';
		hideOnMobile?: boolean;
	};

	const actions: Action[] = [
		{ href: '/random', label: 'Tonton Acak', hint: 'Yang baru tiap klik', icon: ShuffleIcon, tone: 'violet' },
		{ href: '/jadwal-rilis', label: 'Jadwal Rilis', hint: 'Per hari', icon: CalendarIcon, tone: 'rose' },
		{ href: '/popular', label: 'Populer', hint: 'Semua waktu', icon: FlameIcon, tone: 'amber' },
		{ href: '/browse', label: 'Jelajah', hint: 'Filter detail', icon: CompassIcon, tone: 'cyan' },
		{ href: '/genre', label: 'Genre', hint: 'Semua kategori', icon: GridIcon, tone: 'emerald', hideOnMobile: true }
	];
</script>

<section class="qa-section mb-9" aria-label="Aksi cepat">
	<div
		class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3"
	>
		{#each actions as a (a.href)}
			<a
				href={a.href}
				class="quick-action group {a.hideOnMobile ? 'hidden sm:flex' : 'flex'} items-center gap-3 px-3.5 py-3 rounded-2xl transition-all"
				data-tone={a.tone}
				style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
			>
				<span class="quick-icon-wrap">
					<a.icon size={18} />
				</span>
				<span class="min-w-0 flex flex-col leading-tight">
					<span class="text-[12.5px] font-black truncate" style="color: var(--text-primary);">
						{a.label}
					</span>
					<span class="text-[10px] truncate" style="color: var(--text-faint);">
						{a.hint}
					</span>
				</span>
			</a>
		{/each}
	</div>
</section>

<style>
	.quick-action {
		position: relative;
		overflow: hidden;
	}

	.quick-action::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: linear-gradient(135deg, transparent, var(--tone-glow, transparent));
		opacity: 0;
		transition: opacity 220ms ease;
		pointer-events: none;
	}

	.quick-action:hover {
		transform: translateY(-2px);
		border-color: var(--tone-border, var(--border-strong)) !important;
	}

	.quick-action:hover::after {
		opacity: 0.18;
	}

	.quick-action:active {
		transform: translateY(0);
	}

	.quick-icon-wrap {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 38px;
		width: 38px;
		flex-shrink: 0;
		border-radius: 12px;
		background: var(--tone-soft, var(--accent-surface));
		color: var(--tone-color, var(--accent));
		transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1);
		box-shadow: inset 0 0 0 1px var(--tone-ring, transparent);
	}

	.quick-action:hover .quick-icon-wrap {
		background: var(--tone-color, var(--accent));
		color: white;
		box-shadow: 0 6px 18px var(--tone-glow, var(--accent-glow));
	}

	.quick-action[data-tone='violet'] {
		--tone-soft: oklch(from #7c3aed l c h / 0.12);
		--tone-color: #7c3aed;
		--tone-glow: oklch(from #7c3aed l c h / 0.4);
		--tone-border: oklch(from #7c3aed l c h / 0.35);
		--tone-ring: oklch(from #7c3aed l c h / 0.18);
	}

	.quick-action[data-tone='rose'] {
		--tone-soft: oklch(from #f43f5e l c h / 0.12);
		--tone-color: #f43f5e;
		--tone-glow: oklch(from #f43f5e l c h / 0.4);
		--tone-border: oklch(from #f43f5e l c h / 0.35);
		--tone-ring: oklch(from #f43f5e l c h / 0.18);
	}

	.quick-action[data-tone='cyan'] {
		--tone-soft: oklch(from #06b6d4 l c h / 0.12);
		--tone-color: #06b6d4;
		--tone-glow: oklch(from #06b6d4 l c h / 0.4);
		--tone-border: oklch(from #06b6d4 l c h / 0.35);
		--tone-ring: oklch(from #06b6d4 l c h / 0.18);
	}

	.quick-action[data-tone='amber'] {
		--tone-soft: oklch(from #f59e0b l c h / 0.14);
		--tone-color: #f59e0b;
		--tone-glow: oklch(from #f59e0b l c h / 0.45);
		--tone-border: oklch(from #f59e0b l c h / 0.4);
		--tone-ring: oklch(from #f59e0b l c h / 0.22);
	}

	.quick-action[data-tone='emerald'] {
		--tone-soft: oklch(from #10b981 l c h / 0.12);
		--tone-color: #10b981;
		--tone-glow: oklch(from #10b981 l c h / 0.4);
		--tone-border: oklch(from #10b981 l c h / 0.35);
		--tone-ring: oklch(from #10b981 l c h / 0.18);
	}

	@media (hover: none) {
		.quick-action:hover {
			transform: none;
		}
	}

	.qa-section {
		content-visibility: auto;
		contain-intrinsic-size: 0 180px;
	}
</style>
