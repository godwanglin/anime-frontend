<script lang="ts">
	import type { StudioSubtitle } from '$lib/subtitle-studio';

	let {
		items,
		editingId = $bindable<number | null>(null),
		editLabel = $bindable(''),
		editLanguage = $bindable(''),
		onEdit,
		onSave,
		onDelete
	}: {
		items: StudioSubtitle[];
		editingId: number | null;
		editLabel: string;
		editLanguage: string;
		onEdit: (subtitle: StudioSubtitle) => void;
		onSave: (subtitle: StudioSubtitle) => void;
		onDelete: (subtitle: StudioSubtitle) => void;
	} = $props();
</script>

<section class="rounded-xl border border-zinc-800 bg-zinc-900">
	<div class="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
		<h3 class="text-lg font-black">Subtitle server ini</h3>
		<span class="rounded-full bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-400"
			>{items.length} track</span
		>
	</div>

	{#if items.length}
		<div class="overflow-x-auto">
			<table class="min-w-full text-sm">
				<tbody class="divide-y divide-zinc-800">
					{#each items as subtitle}
						<tr>
							<td class="px-4 py-3">
								{#if editingId === subtitle.id}
									<input
										bind:value={editLabel}
										class="h-9 w-44 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
									/>
								{:else}
									<p class="font-black">{subtitle.label}</p>
								{/if}
							</td>
							<td class="px-4 py-3">
								{#if editingId === subtitle.id}
									<input
										bind:value={editLanguage}
										class="h-9 w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
									/>
								{:else}
									<span
										class="rounded-full bg-violet-500/15 px-2 py-1 text-xs font-bold text-violet-200"
										>{subtitle.language}</span
									>
								{/if}
							</td>
							<td class="max-w-md truncate px-4 py-3 text-zinc-400">
								<a
									href={subtitle.fileUrl}
									target="_blank"
									rel="noreferrer"
									class="hover:text-violet-300">{subtitle.fileUrl}</a
								>
							</td>
							<td class="px-4 py-3 text-zinc-500">{subtitle.format ?? 'vtt'}</td>
							<td class="px-4 py-3 text-right">
								{#if editingId === subtitle.id}
									<button
										type="button"
										onclick={() => onSave(subtitle)}
										class="mr-2 rounded-lg bg-violet-600 px-3 py-1.5 font-bold text-white"
										>Simpan</button
									>
									<button
										type="button"
										onclick={() => (editingId = null)}
										class="rounded-lg border border-zinc-700 px-3 py-1.5">Batal</button
									>
								{:else}
									<a
										href={subtitle.fileUrl}
										download
										class="mr-2 rounded-lg border border-zinc-700 px-3 py-1.5">Export</a
									>
									<button
										type="button"
										onclick={() => onEdit(subtitle)}
										class="mr-2 rounded-lg border border-zinc-700 px-3 py-1.5">Edit</button
									>
									<button
										type="button"
										onclick={() => onDelete(subtitle)}
										class="rounded-lg border border-red-900 px-3 py-1.5 text-red-400">Hapus</button
									>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="px-4 py-12 text-center">
			<span class="material-symbols-rounded text-4xl text-zinc-600">subtitles_off</span>
			<p class="mt-2 font-black">Belum ada subtitle</p>
			<p class="text-sm text-zinc-500">Upload atau import subtitle untuk server aktif.</p>
		</div>
	{/if}
</section>
