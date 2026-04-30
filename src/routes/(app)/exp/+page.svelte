<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { getCultivationBadge, getLevelProgress } from '$lib/exp';
	import { auth } from '$lib/stores/auth.svelte';

	const exp = $derived(Number(auth.user?.exp ?? 0));
	const level = $derived(Math.max(1, Number(auth.user?.level ?? 1)));
	const badge = $derived(auth.user?.badge ?? getCultivationBadge(level));
	const progress = $derived(auth.user?.levelProgress ?? getLevelProgress(exp, level));

	const ways = [
		{
			icon: 'login',
			title: 'Buka app',
			desc: 'Kamu dapat 50 EXP saat aktif membuka app. Hadiahnya punya cooldown 1 jam.'
		},
		{
			icon: 'play_circle',
			title: 'Nonton episode',
			desc: 'Setiap 30 detik tontonan valid memberi 20 EXP. Kalau nonton minimal 80%, ada bonus 100 EXP.'
		},
		{
			icon: 'forum',
			title: 'Komentar',
			desc: 'Komentar yang valid memberi 10 EXP. EXP komentar dibatasi supaya tidak bisa dispam.'
		},
		{
			icon: 'thumb_up',
			title: 'Like',
			desc: 'Like episode atau komentar memberi 50 EXP, hanya untuk like pertama pada item yang sama.'
		}
	];

	const tiers = [
		{ range: 'Lv 1-5', name: 'Qi Condensation' },
		{ range: 'Lv 6-10', name: 'Foundation Establishment' },
		{ range: 'Lv 11-20', name: 'Core Formation' },
		{ range: 'Lv 21-35', name: 'Nascent Soul' },
		{ range: 'Lv 36-50', name: 'Soul Transformation' },
		{ range: 'Lv 51-70', name: 'Void Refinement' },
		{ range: 'Lv 71-90', name: 'Dao Integration' },
		{ range: 'Lv 91-98', name: 'Ascendant Immortal' },
		{ range: 'Lv 99+', name: 'God Immortal' }
	];
</script>

<SEO title="Level & EXP" noindex />

<div class="mx-auto max-w-2xl px-4 pb-24 pt-4">
	<section
		class="relative overflow-hidden rounded-[var(--radius-2xl)] p-5"
		style="background: linear-gradient(135deg, oklch(from var(--accent) 0.25 0.16 h), oklch(0.08 0.03 260)); border: 1px solid oklch(1 0 0 / 0.12); box-shadow: var(--shadow-md);"
	>
		<div class="relative z-10">
			<p class="mb-2 text-[10px] font-black uppercase tracking-[0.22em]" style="color: oklch(1 0 0 / 0.48);">
				Level & EXP
			</p>
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0">
					<h1 class="text-[26px] font-black leading-none text-white">Lv {level}</h1>
					<p class="mt-2 text-[12px] leading-relaxed" style="color: oklch(1 0 0 / 0.62);">
						Makin tinggi level kamu, makin besar EXP yang dibutuhkan buat naik level berikutnya.
					</p>
				</div>
				<span
					class="relative inline-flex max-w-[160px] shrink-0 items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5 text-[10px] font-black text-white"
					style="background: {badge.color}; box-shadow: 0 10px 30px oklch(0 0 0 / 0.28);"
				>
					<AppIcon name="workspace_premium" style="font-size:13px;" />
					<span class="truncate">{badge.name}</span>
					<span class="badge-shine" aria-hidden="true"></span>
				</span>
			</div>
			<div class="mt-5">
				<div class="mb-2 flex items-center justify-between text-[11px] font-bold" style="color: oklch(1 0 0 / 0.62);">
					<span>{exp.toLocaleString('id-ID')} EXP</span>
					<span>{progress.nextLevelExp.toLocaleString('id-ID')} EXP</span>
				</div>
				<div class="h-2.5 overflow-hidden rounded-full" style="background: oklch(0 0 0 / 0.3);">
					<div
						class="h-full rounded-full transition-all duration-700"
						style="width: {progress.progress}%; background: linear-gradient(90deg, #8b5cf6, #d946ef, #a855f7); box-shadow: 0 0 18px oklch(from var(--accent) l c h / 0.58);"
					></div>
				</div>
			</div>
		</div>
	</section>

	<section class="mt-5">
		<h2 class="mb-3 text-[13px] font-black" style="color: var(--text-primary);">Cara mendapatkan EXP</h2>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each ways as item}
				<div
					class="rounded-[var(--radius-xl)] p-4"
					style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
				>
					<div
						class="mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)]"
						style="background: var(--accent-surface); border: 1px solid oklch(from var(--accent) l c h / 0.16);"
					>
						<AppIcon name={item.icon} style="font-size:20px; color: var(--accent);" />
					</div>
					<p class="text-[13px] font-black" style="color: var(--text-primary);">{item.title}</p>
					<p class="mt-1 text-[11px] leading-relaxed" style="color: var(--text-muted);">{item.desc}</p>
				</div>
			{/each}
		</div>
	</section>

	<section class="mt-5">
		<h2 class="mb-3 text-[13px] font-black" style="color: var(--text-primary);">Badge kultivasi</h2>
		<div
			class="overflow-hidden rounded-[var(--radius-2xl)]"
			style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
		>
			{#each tiers as tier, i}
				<div
					class="flex items-center justify-between gap-3 px-4 py-3"
					style="border-bottom: {i < tiers.length - 1 ? '1px solid var(--border)' : 'none'};"
				>
					<span class="text-[11px] font-black" style="color: var(--text-muted);">{tier.range}</span>
					<span class="text-right text-[12px] font-black" style="color: var(--text-primary);">{tier.name}</span>
				</div>
			{/each}
		</div>
	</section>
</div>

<NavigationBottom />

<style>
	.badge-shine {
		position: absolute;
		inset: -45% auto -45% -35%;
		width: 30%;
		transform: rotate(18deg);
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent);
		animation: badge-shine 3.4s ease-in-out infinite;
	}

	@keyframes badge-shine {
		0% {
			left: -40%;
		}
		55%,
		100% {
			left: 115%;
		}
	}
</style>
