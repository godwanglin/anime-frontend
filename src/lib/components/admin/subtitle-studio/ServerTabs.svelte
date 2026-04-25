<script lang="ts">
	import type { VideoServer } from '$lib/admin/subtitle-studio';
	import type { StudioSubtitle } from '$lib/subtitle-studio';

	let {
		servers,
		subtitles,
		activeServerUrl,
		onSelect
	}: {
		servers: VideoServer[];
		subtitles: StudioSubtitle[];
		activeServerUrl: string;
		onSelect: (serverUrl: string) => void;
	} = $props();

	function count(serverUrl: string) {
		return subtitles.filter((subtitle) => subtitle.serverUrl === serverUrl).length;
	}
</script>

<div class="flex gap-2 overflow-x-auto pb-1">
	{#each servers as server}
		<button
			type="button"
			onclick={() => onSelect(server.value)}
			class="min-w-44 rounded-xl border px-4 py-3 text-left transition {activeServerUrl ===
			server.value
				? 'border-violet-500 bg-violet-600/20 text-violet-100'
				: 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'}"
		>
			<span class="block truncate text-sm font-black">{server.label}</span>
			<span class="mt-1 block truncate text-xs text-zinc-500">{count(server.value)} subtitle</span>
		</button>
	{/each}
</div>
