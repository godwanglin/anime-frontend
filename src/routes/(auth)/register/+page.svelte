<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import SEO from '$lib/components/SEO.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	let email = $state('');
	let fullName = $state('');
	let password = $state('');
	let error = $state('');
	let showPassword = $state(false);

	const siteConfig = $derived((page.data.siteConfig ?? {}) as Record<string, string>);
	const siteName = $derived(siteConfig['site.name'] ?? 'AniMe');
	const siteLogo = $derived(siteConfig['site.logo'] ?? '/icon.png');

	async function submit() {
		error = '';
		try {
			await auth.register({ email, username: fullName, password });
			await auth.login({ email, password });
			goto('/');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Registrasi gagal';
		}
	}
</script>

<SEO title="Register" noindex />

<main class="min-h-screen overflow-hidden bg-[#0f0e0d] text-white">
	<div class="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
		<div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(20,184,166,0.26),transparent_25rem),radial-gradient(circle_at_78%_82%,rgba(139,92,246,0.36),transparent_28rem),linear-gradient(135deg,#0f0e0d_0%,#171614_46%,#111827_100%)]"></div>
		<div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30"></div>

		<section class="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/40 backdrop-blur-2xl lg:grid-cols-[0.95fr_1.05fr]">
			<form
				onsubmit={(event) => {
					event.preventDefault();
					submit();
				}}
				class="relative flex min-h-[640px] flex-col justify-center overflow-hidden border-white/40 bg-white/80 px-5 py-8 text-[#1a1714] shadow-2xl shadow-black/10 backdrop-blur-2xl transition-colors before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.95),transparent_18rem),linear-gradient(135deg,rgba(16,185,129,0.10),transparent_34%,rgba(124,58,237,0.08)_100%)] before:content-[''] after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-white/90 after:content-[''] dark:border-white/10 dark:bg-white/[0.07] dark:text-[#e8e5e0] dark:shadow-black/35 dark:before:bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.16),transparent_18rem),linear-gradient(135deg,rgba(16,185,129,0.14),transparent_38%,rgba(139,92,246,0.12)_100%)] dark:after:bg-white/20 sm:px-8 lg:border-r lg:px-10"
			>
				<a href="/" class="relative z-10 mb-8 inline-flex w-fit items-center gap-3">
					<img src={siteLogo} alt={siteName} class="h-11 w-11 rounded-2xl bg-violet-100 object-contain p-1.5 dark:bg-violet-500/15" />
					<span class="text-xl font-black">{siteName}</span>
				</a>

				<div class="relative z-10 mb-7">
					<p class="mb-3 w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200">
						New Account
					</p>
					<h1 class="text-3xl font-black tracking-tight sm:text-4xl">Daftar</h1>
					<p class="mt-2 text-sm leading-6 text-[#6b6560] dark:text-[#a49b92]">
						Buat akun untuk simpan anime, riwayat tontonan, dan progress kamu.
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

					<label class="block" for="fullName">
						<span class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#8a8178] dark:text-[#9c948c]">Nama</span>
						<input
							id="fullName"
							bind:value={fullName}
							required
							autocomplete="name"
							placeholder="Nama akun kamu"
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
								minlength="6"
								autocomplete="new-password"
								placeholder="Minimal 6 karakter"
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

				{#if error}
					<p class="relative z-10 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
						{error}
					</p>
				{/if}

				<button
					type="submit"
					disabled={auth.isLoading}
					class="relative z-10 mt-6 h-13 w-full rounded-2xl bg-[#1a1714] text-sm font-black text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#f4f1ec] dark:text-[#171614] dark:shadow-violet-950/20 dark:hover:bg-violet-200"
				>
					{auth.isLoading ? 'Memproses...' : 'Buat Akun'}
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
					Sudah punya akun?
					<a href="/login" class="font-black text-violet-700 hover:text-violet-600 dark:text-violet-300 dark:hover:text-violet-200">Masuk</a>
				</p>
			</form>

			<div class="hidden min-h-[640px] flex-col justify-between border-l border-white/10 bg-black/20 p-10 lg:flex">
				<div class="flex items-center justify-between">
					<p class="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/64">
						Watch Better
					</p>
					<span class="material-symbols-rounded text-[32px] text-violet-200">auto_awesome</span>
				</div>

				<div class="space-y-6">
					<p class="max-w-md text-5xl font-black leading-tight text-white">
						Akun kecil, pengalaman nonton lebih rapi.
					</p>
					<p class="max-w-sm text-sm leading-6 text-white/62">
						Progress, koleksi, dan aktivitas kamu tersimpan dalam satu profil.
					</p>
				</div>

				<div class="space-y-3">
					<div class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
						<span class="material-symbols-rounded text-violet-200">bookmark</span>
						<p class="text-sm font-bold text-white/75">Simpan anime yang ingin kamu tonton.</p>
					</div>
					<div class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
						<span class="material-symbols-rounded text-emerald-200">history</span>
						<p class="text-sm font-bold text-white/75">Lanjut dari episode terakhir lebih cepat.</p>
					</div>
					<div class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
						<span class="material-symbols-rounded text-amber-200">military_tech</span>
						<p class="text-sm font-bold text-white/75">Kumpulkan EXP dari aktivitas nonton.</p>
					</div>
				</div>
			</div>
		</section>
	</div>
</main>
