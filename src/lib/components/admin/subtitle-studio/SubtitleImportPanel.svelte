<script lang="ts">
	import type { VideoServer } from '$lib/admin/subtitle-studio';
	import type { StudioSubtitle } from '$lib/subtitle-studio';

	let {
		servers,
		activeServerUrl,
		subtitles,
		fromServerUrl = $bindable(''),
		language = $bindable(''),
		isSaving = false,
		onSubmit
	}: {
		servers: VideoServer[];
		activeServerUrl: string;
		subtitles: StudioSubtitle[];
		fromServerUrl: string;
		language: string;
		isSaving?: boolean;
		onSubmit: () => void;
	} = $props();

	const importableLanguages = $derived(
		subtitles
			.filter((subtitle) => subtitle.serverUrl === fromServerUrl)
			.map((subtitle) => subtitle.language)
	);
</script>

<form
	onsubmit={(event) => {
		event.preventDefault();
		onSubmit();
	}}
	class="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
>
	<div>
		<h3 class="text-lg font-black">Import dari server lain</h3>
		<p class="text-xs text-zinc-500">Duplikasi subtitle untuk timing yang sama.</p>
	</div>

	<label>
		<span class="mb-1.5 block text-xs font-bold text-zinc-500">Source server</span>
		<select
			bind:value={fromServerUrl}
			class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
			required
		>
			<option value="">Pilih server</option>
			{#each servers.filter((server) => server.value !== activeServerUrl) as server}
				<option value={server.value}>{server.label}</option>
			{/each}
		</select>
	</label>

	<label>
		<span class="mb-1.5 block text-xs font-bold text-zinc-500">Language</span>
		<select
			bind:value={language}
			class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
			required
			disabled={!fromServerUrl}
		>
			<option value="">Pilih bahasa</option>
			{#each importableLanguages as lang}
				<option value={lang}>{lang}</option>
			{/each}
		</select>
	</label>

	<button
		class="w-full rounded-lg border border-violet-500 px-4 py-2 text-sm font-bold text-violet-200 hover:bg-violet-500/10 disabled:opacity-60"
		disabled={isSaving || !fromServerUrl || !language}
	>
		{isSaving ? 'Mengimport...' : 'Import subtitle'}
	</button>
</form>
