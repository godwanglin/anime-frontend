<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { page as pageState } from '$app/state';
	import SEO from '$lib/components/SEO.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let showPassword = $state(false);

	const siteConfig = $derived((pageState.data.siteConfig ?? {}) as Record<string, string>);
	const siteName = $derived(siteConfig['site.name'] ?? 'AniMe');
	const siteLogo = $derived(siteConfig['site.logo'] ?? '/icon.png');
	const visibleError = $derived(error || $page.url.searchParams.get('error') || '');

	async function submit() {
		error = '';
		try {
			await auth.login({ email, password });
			const redirect = $page.url.searchParams.get('redirect') || '/';
			goto(redirect);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Login gagal';
		}
	}
</script>

<SEO title="Login" noindex />

<main class="min-h-screen overflow-hidden bg-[#0f0e0d] text-white">
	<div class="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
		<div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(139,92,246,0.34),transparent_28rem),radial-gradient(circle_at_82%_85%,rgba(20,184,166,0.24),transparent_24rem),linear-gradient(135deg,#0f0e0d_0%,#171614_45%,#101827_100%)]"></div>
		<div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30"></div>

		<section class="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/40 backdrop-blur-2xl lg:grid-cols-[1.05fr_0.95fr]">
			<div class="hidden min-h-[620px] flex-col justify-between border-r border-white/10 bg-black/20 p-10 lg:flex">
				<a href="/" class="inline-flex w-fit items-center gap-3">
					<img src={siteLogo} alt={siteName} class="h-12 w-12 rounded-2xl border border-white/10 bg-white/10 object-contain p-1.5" />
					<span class="text-2xl font-black">{siteName}</span>
				</a>

				<div class="space-y-6">
					<p class="max-w-md text-5xl font-black leading-tight text-white">
						Balik ke dunia anime favoritmu.
					</p>
					<p class="max-w-sm text-sm leading-6 text-white/62">
						Masuk untuk lanjut nonton, simpan progress, dan buka semua fitur akun kamu.
					</p>
				</div>

				<div class="grid grid-cols-3 gap-3">
					<div class="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
						<p class="text-2xl font-black">HD</p>
						<p class="mt-1 text-xs font-semibold text-white/48">streaming</p>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
						<p class="text-2xl font-black">24/7</p>
						<p class="mt-1 text-xs font-semibold text-white/48">watchlist</p>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
						<p class="text-2xl font-black">EXP</p>
						<p class="mt-1 text-xs font-semibold text-white/48">progress</p>
					</div>
				</div>
			</div>

			<form
				onsubmit={(event) => {
					event.preventDefault();
					submit();
				}}
				class="relative flex min-h-[520px] flex-col justify-center overflow-hidden border-white/40 bg-white/80 px-5 py-8 text-[#1a1714] shadow-2xl shadow-black/10 backdrop-blur-2xl transition-colors before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.95),transparent_18rem),linear-gradient(135deg,rgba(124,58,237,0.10),transparent_34%,rgba(20,184,166,0.08)_100%)] before:content-[''] after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-white/90 after:content-[''] dark:border-white/10 dark:bg-white/[0.07] dark:text-[#e8e5e0] dark:shadow-black/35 dark:before:bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.16),transparent_18rem),linear-gradient(135deg,rgba(139,92,246,0.16),transparent_38%,rgba(20,184,166,0.10)_100%)] dark:after:bg-white/20 sm:px-8 lg:min-h-[620px] lg:border-l lg:px-10"
			>
				<div class="relative z-10 mb-7">
					<p class="mb-3 w-fit rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200">
						Member Access
					</p>
					<h1 class="text-3xl font-black tracking-tight sm:text-4xl">Masuk</h1>
					<p class="mt-2 text-sm leading-6 text-[#6b6560] dark:text-[#a49b92]">
						Lanjut nonton dari episode terakhir tanpa kehilangan progress.
					</p>
				</div>

				<div class="relative z-10 space-y-4">
					<label class="block" for="email">
						<span class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#8a8178] dark:text-[#9c948c]">Email</span>
						<input
							id="email"
							bind:value={email}
							type="email"
							required
							autocomplete="email"
							placeholder="nama@email.com"
							class="h-13 w-full rounded-2xl border border-white/80 bg-white/70 px-4 text-sm font-semibold shadow-inner shadow-black/[0.03] outline-none backdrop-blur-xl transition placeholder:text-[#b6aca4] focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-black/25 dark:text-[#f4f1ec] dark:shadow-black/20 dark:placeholder:text-[#6d655e] dark:focus:border-violet-300 dark:focus:ring-violet-300/15"
						/>
					</label>

					<label class="block" for="password">
						<span class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#8a8178] dark:text-[#9c948c]">Password</span>
						<div class="relative">
							<input
								id="password"
								bind:value={password}
								type={showPassword ? 'text' : 'password'}
								required
								autocomplete="current-password"
								placeholder="Masukkan password"
								class="h-13 w-full rounded-2xl border border-white/80 bg-white/70 px-4 pr-13 text-sm font-semibold shadow-inner shadow-black/[0.03] outline-none backdrop-blur-xl transition placeholder:text-[#b6aca4] focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-black/25 dark:text-[#f4f1ec] dark:shadow-black/20 dark:placeholder:text-[#6d655e] dark:focus:border-violet-300 dark:focus:ring-violet-300/15"
							/>
							<button
								type="button"
								class="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-[#8a8178] transition hover:bg-[#f1eee9] hover:text-[#1a1714] dark:text-[#8c837b] dark:hover:bg-white/10 dark:hover:text-[#f4f1ec]"
								aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
								aria-pressed={showPassword}
								onclick={() => (showPassword = !showPassword)}
							>
								<span class="material-symbols-rounded text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
							</button>
						</div>
					</label>
				</div>

				{#if visibleError}
					<p class="relative z-10 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
						{visibleError}
					</p>
				{/if}

				<button
					type="submit"
					disabled={auth.isLoading}
					class="relative z-10 mt-6 h-13 w-full rounded-2xl bg-[#1a1714] text-sm font-black text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#f4f1ec] dark:text-[#171614] dark:shadow-violet-950/20 dark:hover:bg-violet-200"
				>
					{auth.isLoading ? 'Memproses...' : 'Masuk Sekarang'}
				</button>

				<div class="relative z-10 my-6 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#a89e95] dark:text-[#6d655e]">
					<span class="h-px flex-1 bg-[#e4ddd5] dark:bg-white/10"></span>
					<span>atau</span>
					<span class="h-px flex-1 bg-[#e4ddd5] dark:bg-white/10"></span>
				</div>

				<a
					href="/creds/google/start"
					class="relative z-10 flex h-13 w-full items-center justify-center gap-3 rounded-2xl border border-white/75 bg-white/55 text-sm font-black text-[#1a1714] shadow-inner shadow-white/40 backdrop-blur-xl transition hover:border-violet-200 hover:bg-violet-50 dark:border-white/10 dark:bg-black/20 dark:text-[#f4f1ec] dark:shadow-white/5 dark:hover:border-violet-400/30 dark:hover:bg-violet-400/10"
				>
					<span class="grid h-6 w-6 place-items-center rounded-full bg-[#4285f4] text-sm font-black text-white">G</span>
					Login with Google
				</a>

				<p class="relative z-10 mt-6 text-center text-sm text-[#6b6560] dark:text-[#a49b92]">
					Belum punya akun?
					<a href="/register" class="font-black text-violet-700 hover:text-violet-600 dark:text-violet-300 dark:hover:text-violet-200">Daftar</a>
				</p>
			</form>
		</section>
	</div>
</main>
