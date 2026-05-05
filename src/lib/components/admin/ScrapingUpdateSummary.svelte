<script lang="ts">
	type ProgressData = {
		summary?: {
			recentEpisodeLimit?: number;
			newAnimeCount?: number;
			animeWithNewEpisodesCount?: number;
			newEpisodesTotal?: number;
			animeUpdates?: Array<{
				animeTitle: string;
				isNewAnime: boolean;
				totalEpisodesDetected: number;
				scannedEpisodes: number;
				newEpisodesAdded: number;
				newEpisodeNumbers: number[];
			}>;
		};
	};

	let { progress = null }: { progress: ProgressData | null } = $props();
</script>

<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
	<div class="flex items-center justify-between gap-3">
		<div>
			<h3 class="text-sm font-black uppercase tracking-[0.22em] text-zinc-400">
				Update Anime & Episode
			</h3>
			<p class="mt-2 text-sm text-zinc-500">
				Scan full page, cek jumlah episode, lalu proses
				{progress?.summary?.recentEpisodeLimit ?? 2} episode terbaru.
			</p>
		</div>
		<div class="text-right text-xs text-zinc-400">
			<div>Anime baru: {progress?.summary?.newAnimeCount ?? 0}</div>
			<div>Anime update eps: {progress?.summary?.animeWithNewEpisodesCount ?? 0}</div>
			<div>Total eps baru: {progress?.summary?.newEpisodesTotal ?? 0}</div>
		</div>
	</div>
	<div class="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
		<table class="min-w-full text-left text-xs text-zinc-200">
			<thead class="bg-zinc-950 text-zinc-400">
				<tr>
					<th class="px-3 py-2">Anime</th>
					<th class="px-3 py-2">Status</th>
					<th class="px-3 py-2">Total Eps</th>
					<th class="px-3 py-2">Discanned</th>
					<th class="px-3 py-2">Eps Baru</th>
					<th class="px-3 py-2">Nomor Eps Baru</th>
				</tr>
			</thead>
			<tbody>
				{#each progress?.summary?.animeUpdates ?? [] as row}
					<tr class="border-t border-zinc-800">
						<td class="px-3 py-2 font-semibold text-zinc-100">{row.animeTitle}</td>
						<td class="px-3 py-2">{row.isNewAnime ? 'Anime Baru' : 'Existing Anime'}</td>
						<td class="px-3 py-2">{row.totalEpisodesDetected}</td>
						<td class="px-3 py-2">{row.scannedEpisodes}</td>
						<td class="px-3 py-2">{row.newEpisodesAdded}</td>
						<td class="px-3 py-2">
							{row.newEpisodeNumbers.length ? row.newEpisodeNumbers.join(', ') : '-'}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="px-3 py-4 text-center text-zinc-500">
							Belum ada update anime/episode di run ini.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
