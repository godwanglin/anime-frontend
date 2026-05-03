<script lang="ts">
	import { page } from '$app/state';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import appConfig from '$lib/config';
	import SEO from '$lib/components/SEO.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	const redirectTo = $derived(page.url.searchParams.get('redirect') ?? '/');
	const benefits = [
		{ icon: 'high_quality', title: '1080p aktif', desc: 'Buka kualitas tertinggi saat tersedia.' },
		{ icon: 'block', title: 'Tanpa iklan', desc: 'Nonton lebih bersih tanpa ad gate.' },
		{ icon: 'lock_open', title: 'Tanpa limit terbaru', desc: 'Episode baru tetap nyaman diakses.' },
		{ icon: 'workspace_premium', title: 'Benefit berikutnya', desc: 'Badge, fitur room, dan prioritas request.' }
	];
</script>

<SEO title="Weebin Premium" description="Premium Weebin Rp5.000 per bulan." noindex />

<section class="min-h-[calc(100vh-80px)] px-4 py-8 text-white md:px-8">
	<div class="mx-auto max-w-5xl">
		{#if !appConfig.ENABLE_PREMIUM_FEATURE}
			<div class="mx-auto flex min-h-[52vh] max-w-md flex-col items-center justify-center text-center">
				<div class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
					<AppIcon name="drafts" class="text-[28px] text-zinc-300" />
				</div>
				<p class="text-xs font-black uppercase tracking-[0.28em] text-zinc-500">Draft</p>
				<h1 class="mt-3 text-2xl font-black">Premium belum dibuka</h1>
				<p class="mt-3 text-sm font-semibold leading-relaxed text-zinc-500">
					Fitur premium sedang disimpan dulu dan belum aktif untuk user.
				</p>
				<a
					href={redirectTo}
					class="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-zinc-950"
				>
					Kembali
				</a>
			</div>
		{:else}
		<div class="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-center">
			<div>
				<p class="text-xs font-black uppercase tracking-[0.32em] text-violet-300">Weebin Premium</p>
				<h1 class="mt-4 text-4xl font-black leading-tight md:text-5xl">
					Nonton lebih nyaman, kualitas lebih tinggi.
				</h1>
				<p class="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-zinc-400">
					Premium dibuat ringan: 1080p saat tersedia, bebas iklan, dan akses episode terbaru tanpa batas guest.
				</p>

				<div class="mt-7 grid gap-3 sm:grid-cols-2">
					{#each benefits as item}
						<div class="rounded-lg border border-white/10 bg-white/[0.04] p-4">
							<div class="flex items-start gap-3">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-200">
									<AppIcon name={item.icon} class="text-[20px]" />
								</div>
								<div>
									<p class="text-sm font-black">{item.title}</p>
									<p class="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">{item.desc}</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="rounded-2xl border border-violet-400/20 bg-zinc-950/90 p-5 shadow-2xl shadow-violet-950/30">
				<div class="rounded-xl border border-white/10 bg-gradient-to-br from-violet-600/25 to-fuchsia-500/10 p-5">
					<p class="text-xs font-black uppercase tracking-[0.28em] text-violet-100">Paket Bulanan</p>
					<p class="mt-4 text-4xl font-black">Rp5.000<span class="text-base text-white/55">/bulan</span></p>
					<p class="mt-2 text-xs font-semibold text-white/60">Harga awal untuk dukung operasional Weebin.</p>
				</div>

				<div class="mt-5 space-y-3 text-sm font-bold text-zinc-300">
					<div class="flex items-center gap-2">
						<AppIcon name="check_circle" class="text-[18px] text-emerald-300" />
						<span>1080p dan kualitas tertinggi saat tersedia</span>
					</div>
					<div class="flex items-center gap-2">
						<AppIcon name="check_circle" class="text-[18px] text-emerald-300" />
						<span>Bebas iklan saat fitur ads aktif</span>
					</div>
					<div class="flex items-center gap-2">
						<AppIcon name="check_circle" class="text-[18px] text-emerald-300" />
						<span>Benefit premium baru otomatis ikut aktif</span>
					</div>
				</div>

				{#if auth.isPremium}
					<a
						href={redirectTo}
						class="mt-6 flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-500 text-sm font-black text-white shadow-lg shadow-emerald-500/20"
					>
						<AppIcon name="verified" class="text-[18px]" />
						Lanjut Nonton
					</a>
				{:else if auth.isLoggedIn}
					<a
						href="/profile"
						class="mt-6 flex h-12 items-center justify-center gap-2 rounded-full bg-violet-600 text-sm font-black text-white shadow-lg shadow-violet-500/25"
					>
						<AppIcon name="workspace_premium" class="text-[18px]" />
						Hubungi Admin untuk Upgrade
					</a>
				{:else}
					<a
						href={`/login?redirect=${encodeURIComponent('/premium?redirect=' + redirectTo)}`}
						class="mt-6 flex h-12 items-center justify-center gap-2 rounded-full bg-violet-600 text-sm font-black text-white shadow-lg shadow-violet-500/25"
					>
						<AppIcon name="login" class="text-[18px]" />
						Login untuk Premium
					</a>
				{/if}
			</div>
		</div>
		{/if}
	</div>
</section>
