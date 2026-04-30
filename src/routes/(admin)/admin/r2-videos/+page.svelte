<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { onMount } from 'svelte';
	import { adminApi } from '$lib/admin/api';
	import AdminModal from '$lib/components/admin/AdminModal.svelte';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	type LinkedServer = {
		id: number;
		episodeId: number;
		isPrimary: boolean;
		episodeSlug: string;
		episodeNumber: number;
		episodeTitle: string;
		animeId: number;
		animeSlug: string;
		animeTitle: string;
	};

	type R2Video = {
		videoId: string;
		prefix: string;
		masterKey: string;
		masterUrl: string;
		objectCount: number;
		totalSize: number;
		lastModified: string | null;
		resolutions: number[];
		hasMaster: boolean;
		linkedServers: LinkedServer[];
	};

	let items = $state<R2Video[]>([]);
	let isLoading = $state(true);
	let isDeleting = $state(false);
	let nextCursor = $state<string | null>(null);
	let bucket = $state('');
	let cursorHistory = $state<(string | null)[]>([null]);
	let cursorIndex = $state(0);
	let deleteTarget = $state<R2Video | null>(null);

	const hasPrev = $derived(cursorIndex > 0);
	const hasNext = $derived(Boolean(nextCursor));
	const totalObjects = $derived(items.reduce((sum, item) => sum + item.objectCount, 0));
	const totalSize = $derived(items.reduce((sum, item) => sum + item.totalSize, 0));
	const linkedCount = $derived(items.filter((item) => item.linkedServers.length > 0).length);

	async function loadVideos(cursor: string | null = cursorHistory[cursorIndex]) {
		isLoading = true;
		try {
			const query = new URLSearchParams({ limit: '20' });
			if (cursor) query.set('cursor', cursor);
			const result = await adminApi<R2Video[]>(`/r2-videos?${query.toString()}`);
			items = result.data;
			nextCursor = (result.meta.nextCursor as string | null | undefined) ?? null;
			bucket = String(result.meta.bucket ?? '');
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal memuat R2 video');
		} finally {
			isLoading = false;
		}
	}

	async function nextPage() {
		if (!nextCursor) return;
		cursorHistory = [...cursorHistory.slice(0, cursorIndex + 1), nextCursor];
		cursorIndex += 1;
		await loadVideos(nextCursor);
	}

	async function prevPage() {
		if (!hasPrev) return;
		cursorIndex -= 1;
		await loadVideos(cursorHistory[cursorIndex]);
	}

	async function deleteVideo() {
		if (!deleteTarget || isDeleting) return;
		isDeleting = true;
		try {
			const result = await adminApi<{
				deletedCount: number;
				detachedServers: LinkedServer[];
			}>(`/r2-videos/${encodeURIComponent(deleteTarget.videoId)}`, {
				method: 'DELETE'
			});
			adminToast.success(
				`Video dihapus: ${result.data.deletedCount} object, ${result.data.detachedServers.length} server dilepas`
			);
			deleteTarget = null;
			await loadVideos();
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal hapus video R2');
		} finally {
			isDeleting = false;
		}
	}

	function formatBytes(bytes: number) {
		if (!bytes) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
		const value = bytes / 1024 ** index;
		return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
	}

	function formatDate(value: string | null) {
		if (!value) return '-';
		return new Date(value).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	onMount(() => {
		void loadVideos();
	});
</script>

<div class="space-y-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-widest text-violet-400">Streaming Bucket</p>
			<h2 class="text-2xl font-black text-zinc-100">R2 Video Storage</h2>
			<p class="mt-1 text-sm text-zinc-500">
				List folder HLS dari R2 dan hapus object video yang sudah tidak dipakai.
			</p>
		</div>
		<button
			type="button"
			onclick={() => loadVideos()}
			disabled={isLoading}
			class="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
		>
			<AppIcon name="refresh" class="text-[18px]" />
			Refresh
		</button>
	</div>

	<div class="grid gap-3 md:grid-cols-4">
		<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
			<p class="text-xs font-bold uppercase tracking-widest text-zinc-500">Bucket</p>
			<p class="mt-2 truncate font-mono text-sm font-black text-zinc-100">{bucket || '-'}</p>
		</div>
		<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
			<p class="text-xs font-bold uppercase tracking-widest text-zinc-500">Video Page</p>
			<p class="mt-2 text-2xl font-black text-zinc-100">{items.length}</p>
		</div>
		<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
			<p class="text-xs font-bold uppercase tracking-widest text-zinc-500">Objects</p>
			<p class="mt-2 text-2xl font-black text-zinc-100">{totalObjects}</p>
		</div>
		<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
			<p class="text-xs font-bold uppercase tracking-widest text-zinc-500">Size / Linked</p>
			<p class="mt-2 text-2xl font-black text-zinc-100">{formatBytes(totalSize)}</p>
			<p class="text-xs font-bold text-zinc-500">{linkedCount} terhubung episode</p>
		</div>
	</div>

	<div class="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-zinc-800 text-sm">
				<thead class="bg-zinc-800/50 text-left text-xs font-black uppercase tracking-widest text-zinc-500">
					<tr>
						<th class="px-4 py-3">Video</th>
						<th class="px-4 py-3">R2</th>
						<th class="px-4 py-3">Linked Episode</th>
						<th class="px-4 py-3 text-right">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-800">
					{#if isLoading}
						{#each Array(6) as _}
							<tr>
								<td colspan="4" class="px-4 py-4">
									<div class="h-5 animate-pulse rounded bg-zinc-800"></div>
								</td>
							</tr>
						{/each}
					{:else if items.length === 0}
						<tr>
							<td colspan="4" class="px-4 py-12 text-center text-zinc-500">
								Belum ada video di prefix videos/.
							</td>
						</tr>
					{:else}
						{#each items as item}
							<tr class="align-top text-zinc-300 hover:bg-zinc-800/30">
								<td class="px-4 py-4">
									<p class="font-mono text-xs font-black text-zinc-100">{item.videoId}</p>
									<p class="mt-1 break-all font-mono text-[11px] text-zinc-500">{item.prefix}</p>
									<div class="mt-2 flex flex-wrap gap-1.5">
										{#if item.hasMaster}
											<span class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
												master
											</span>
										{:else}
											<span class="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-300">
												no master
											</span>
										{/if}
										{#each item.resolutions as res}
											<span class="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] font-bold text-zinc-300">
												{res}p
											</span>
										{/each}
									</div>
								</td>
								<td class="px-4 py-4">
									<p class="font-bold text-zinc-100">{formatBytes(item.totalSize)}</p>
									<p class="mt-1 text-xs text-zinc-500">{item.objectCount} object</p>
									<p class="mt-1 text-xs text-zinc-500">{formatDate(item.lastModified)}</p>
									<a
										href={item.masterUrl}
										target="_blank"
										rel="noopener"
										class="mt-2 inline-flex items-center gap-1 text-xs font-bold text-violet-300 hover:text-violet-200"
									>
										<AppIcon name="open_in_new" class="text-[15px]" />
										Master
									</a>
								</td>
								<td class="px-4 py-4">
									{#if item.linkedServers.length === 0}
										<span class="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300">
											Orphan
										</span>
									{:else}
										<div class="space-y-2">
											{#each item.linkedServers as server}
												<a
													href="/admin/episodes/{server.episodeId}"
													class="block rounded-lg border border-zinc-800 bg-zinc-950 p-2 hover:border-violet-500/60"
												>
													<p class="line-clamp-1 font-bold text-zinc-100">{server.animeTitle}</p>
													<p class="mt-0.5 line-clamp-1 text-xs text-zinc-500">
														Ep {server.episodeNumber} - {server.episodeTitle}
														{server.isPrimary ? ' / primary' : ''}
													</p>
												</a>
											{/each}
										</div>
									{/if}
								</td>
								<td class="px-4 py-4 text-right">
									<button
										type="button"
										onclick={() => (deleteTarget = item)}
										class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300 hover:bg-red-500/20"
									>
										<AppIcon name="delete" class="text-[16px]" />
										Delete
									</button>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
		<div class="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-sm text-zinc-400">
			<p>Page {cursorIndex + 1}</p>
			<div class="flex items-center gap-2">
				<button
					type="button"
					disabled={!hasPrev || isLoading}
					onclick={prevPage}
					class="rounded-lg border border-zinc-700 px-3 py-1.5 disabled:opacity-40"
				>
					Prev
				</button>
				<button
					type="button"
					disabled={!hasNext || isLoading}
					onclick={nextPage}
					class="rounded-lg border border-zinc-700 px-3 py-1.5 disabled:opacity-40"
				>
					Next
				</button>
			</div>
		</div>
	</div>
</div>

<AdminModal
	open={Boolean(deleteTarget)}
	title="Hapus video R2?"
	message={`Semua object di ${deleteTarget?.prefix ?? 'folder ini'} akan dihapus. Server R2 yang terhubung ke episode juga akan dilepas.`}
	danger
	onClose={() => (deleteTarget = null)}
	onConfirm={deleteVideo}
/>
