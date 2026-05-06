<script lang="ts">
	import { page } from '$app/state';
	import SEO from '$lib/components/SEO.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	let email = $state('');
	let error = $state('');
	let sent = $state(false);
	let loading = $state(false);

	const siteConfig = $derived((page.data.siteConfig ?? {}) as Record<string, string>);
	const siteName = $derived(siteConfig['site.name'] ?? 'AniMe');
	const siteLogo = $derived(siteConfig['site.logo'] ?? '/icon.png');

	async function submit() {
		error = '';
		loading = true;
		try {
			await auth.requestPasswordReset({ email });
			sent = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal mengirim link reset';
		} finally {
			loading = false;
		}
	}
</script>

<SEO title="Lupa Password" noindex />

<main class="min-h-screen overflow-hidden bg-[#0f0e0d] text-white">
	<div class="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
		<div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(139,92,246,0.32),transparent_25rem),radial-gradient(circle_at_82%_86%,rgba(20,184,166,0.22),transparent_24rem),linear-gradient(135deg,#0f0e0d_0%,#171614_48%,#101827_100%)]"></div>
		<section class="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-8">
			<a href="/" class="mb-8 inline-flex items-center gap-3">
				<img src={siteLogo} alt={siteName} class="h-11 w-11 rounded-2xl bg-violet-100 object-contain p-1.5" />
				<span class="text-xl font-black">{siteName}</span>
			</a>

			<h1 class="text-3xl font-black">Lupa password</h1>
			<p class="mt-2 text-sm leading-6 text-white/60">
				Masukkan email akun kamu. Kalau terdaftar, link reset akan dikirim ke inbox.
			</p>

			{#if sent}
				<div class="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-bold leading-6 text-emerald-100">
					Link reset sudah dikirim kalau email tersebut terdaftar. Cek inbox atau spam.
				</div>
				<a href="/login" class="mt-6 flex h-12 items-center justify-center rounded-2xl bg-white text-sm font-black text-[#171614]">
					Kembali ke Login
				</a>
			{:else}
				<form
					class="mt-6 space-y-4"
					onsubmit={(event) => {
						event.preventDefault();
						submit();
					}}
				>
					<label class="block" for="email">
						<span class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-white/50">Email</span>
						<input
							id="email"
							bind:value={email}
							type="email"
							required
							autocomplete="email"
							placeholder="nama@email.com"
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
						{loading ? 'Mengirim...' : 'Kirim Link Reset'}
					</button>
				</form>
			{/if}
		</section>
	</div>
</main>

