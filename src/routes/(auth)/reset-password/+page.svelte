<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { page as pageState } from '$app/state';
	import SEO from '$lib/components/SEO.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let done = $state(false);
	let loading = $state(false);
	let showPassword = $state(false);

	const token = $derived($page.url.searchParams.get('token') ?? '');
	const siteConfig = $derived((pageState.data.siteConfig ?? {}) as Record<string, string>);
	const siteName = $derived(siteConfig['site.name'] ?? 'AniMe');
	const siteLogo = $derived(siteConfig['site.logo'] ?? '/icon.png');

	async function submit() {
		error = '';
		if (!token) {
			error = 'Token reset tidak ditemukan';
			return;
		}
		if (password !== confirmPassword) {
			error = 'Konfirmasi password tidak sama';
			return;
		}

		loading = true;
		try {
			await auth.confirmPasswordReset({ token, password });
			done = true;
			setTimeout(() => goto('/login'), 1400);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Reset password gagal';
		} finally {
			loading = false;
		}
	}
</script>

<SEO title="Reset Password" noindex />

<main class="min-h-screen overflow-hidden bg-[#0f0e0d] text-white">
	<div class="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
		<div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(20,184,166,0.24),transparent_25rem),radial-gradient(circle_at_82%_86%,rgba(139,92,246,0.32),transparent_24rem),linear-gradient(135deg,#0f0e0d_0%,#171614_48%,#101827_100%)]"></div>
		<section class="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-8">
			<a href="/" class="mb-8 inline-flex items-center gap-3">
				<img src={siteLogo} alt={siteName} class="h-11 w-11 rounded-2xl bg-violet-100 object-contain p-1.5" />
				<span class="text-xl font-black">{siteName}</span>
			</a>

			<h1 class="text-3xl font-black">Reset password</h1>
			<p class="mt-2 text-sm leading-6 text-white/60">
				Buat password baru untuk akun kamu.
			</p>

			{#if done}
				<div class="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-bold leading-6 text-emerald-100">
					Password berhasil direset. Kamu akan diarahkan ke login.
				</div>
			{:else}
				<form
					class="mt-6 space-y-4"
					onsubmit={(event) => {
						event.preventDefault();
						submit();
					}}
				>
					<label class="block" for="password">
						<span class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-white/50">Password baru</span>
						<div class="relative">
							<input
								id="password"
								bind:value={password}
								type={showPassword ? 'text' : 'password'}
								required
								minlength="6"
								autocomplete="new-password"
								class="h-13 w-full rounded-2xl border border-white/10 bg-black/25 px-4 pr-12 text-sm font-semibold outline-none transition placeholder:text-white/30 focus:border-violet-300 focus:ring-4 focus:ring-violet-300/15"
							/>
							<button
								type="button"
								class="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-white/55 hover:bg-white/10"
								aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
								onclick={() => (showPassword = !showPassword)}
							>
								<span class="material-symbols-rounded text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
							</button>
						</div>
					</label>

					<label class="block" for="confirmPassword">
						<span class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-white/50">Ulangi password</span>
						<input
							id="confirmPassword"
							bind:value={confirmPassword}
							type={showPassword ? 'text' : 'password'}
							required
							minlength="6"
							autocomplete="new-password"
							class="h-13 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm font-semibold outline-none transition placeholder:text-white/30 focus:border-violet-300 focus:ring-4 focus:ring-violet-300/15"
						/>
					</label>

					{#if error}
						<p class="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
							{error}
						</p>
					{/if}

					<button
						type="submit"
						disabled={loading}
						class="h-13 w-full rounded-2xl bg-violet-600 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:bg-violet-700 disabled:opacity-60"
					>
						{loading ? 'Menyimpan...' : 'Reset Password'}
					</button>
				</form>
			{/if}
		</section>
	</div>
</main>

