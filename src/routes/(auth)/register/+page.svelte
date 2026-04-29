<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import SEO from '$lib/components/SEO.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	let email = $state('');
	let fullName = $state('');
	let password = $state('');
	let error = $state('');
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

<main
	class="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex items-center justify-center p-4"
>
	<form
		onsubmit={(event) => {
			event.preventDefault();
			submit();
		}}
		class="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl shadow-black/5"
	>
		<a href="/" class="inline-flex items-center gap-2 mb-6">
			<img src={siteLogo} alt={siteName} class="h-9 w-9 rounded-full object-contain bg-violet-50 dark:bg-violet-950/40" />
			<span class="font-black text-xl">{siteName}</span>
		</a>
		<h1 class="text-2xl font-black mb-1">Daftar</h1>
		<p class="text-sm text-zinc-500 dark:text-zinc-400 mb-5">Simpan anime dan riwayat tontonanmu.</p>

		<label class="block text-xs font-bold text-zinc-500 mb-1.5" for="email">Email</label>
		<input
			id="email"
			bind:value={email}
			type="email"
			required
			class="w-full h-11 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 text-sm outline-none focus:border-violet-500 mb-4"
		/>

		<label class="block text-xs font-bold text-zinc-500 mb-1.5" for="fullName">Nama</label>
		<input
			id="fullName"
			bind:value={fullName}
			required
			class="w-full h-11 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 text-sm outline-none focus:border-violet-500 mb-4"
		/>

		<label class="block text-xs font-bold text-zinc-500 mb-1.5" for="password">Password</label>
		<input
			id="password"
			bind:value={password}
			type="password"
			required
			minlength="6"
			class="w-full h-11 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 text-sm outline-none focus:border-violet-500"
		/>

		{#if error}
			<p class="mt-3 text-sm font-semibold text-red-500">{error}</p>
		{/if}

		<button
			type="submit"
			disabled={auth.isLoading}
			class="mt-5 w-full h-11 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-black transition"
		>
			{auth.isLoading ? 'Memproses...' : 'Daftar'}
		</button>

		<p class="mt-5 text-center text-sm text-zinc-500">
			Sudah punya akun?
			<a href="/login" class="font-bold text-violet-500 hover:text-violet-400">Masuk</a>
		</p>
	</form>
</main>
