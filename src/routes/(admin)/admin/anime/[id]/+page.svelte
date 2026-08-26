<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { adminApi } from '$lib/admin/api';
	import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
	import AdminModal from '$lib/components/admin/AdminModal.svelte';
	import AdminTagInput from '$lib/components/admin/AdminTagInput.svelte';
	import { imageUrl } from '$lib/image-url';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	type Episode = { id: number; number: number; title: string; slug: string; sub?: string; date?: string };
	let tab = $state('info');
	let animeId = $derived(Number(page.params.id));
	let isLoading = $state(true);
	let isSaving = $state(false);
	let episodeToDelete = $state<number | null>(null);
	let title = $state('');
	let slug = $state('');
	let type = $state('Anime');
	let status = $state('Ongoing');
	let rating = $state<number | null>(null);
	let network = $state('');
	let studio = $state('');
	let country = $state('');
	let released = $state('');
	let season = $state('');
	let duration = $state('');
	let totalEpisodes = $state<number | null>(null);
	let skipIntroSeconds = $state<string | number | null>(null);
	let skipOutroSeconds = $state<string | number | null>(null);
	let thumbnail = $state('');
	let bigCover = $state('');
	let synopsis = $state('');
	let genres = $state<string[]>([]);
	let episodes = $state<Episode[]>([]);

	async function load() {
		isLoading = true;
		const anime = (await adminApi<any>(`/anime/${animeId}`)).data;
		title = anime.title ?? '';
		slug = anime.slug ?? '';
		type = anime.type ?? 'Anime';
		status = anime.status ?? 'Ongoing';
		rating = Number(anime.rating ?? 0) || null;
		network = anime.network ?? '';
		studio = anime.studio ?? '';
		country = anime.country ?? '';
		released = anime.released ?? '';
		season = anime.season ?? '';
		duration = anime.duration ?? '';
		totalEpisodes = anime.totalEpisodes ?? null;
		skipIntroSeconds = anime.skipIntroSeconds ?? null;
		skipOutroSeconds = anime.skipOutroSeconds ?? null;
		thumbnail = anime.thumbnail ?? '';
		bigCover = anime.bigCover ?? '';
		synopsis = anime.synopsis ?? '';
		genres = (anime.genres ?? []).map((item: any) => item.genre?.name).filter(Boolean);
		episodes = anime.episodes ?? [];
		isLoading = false;
	}

	async function save() {
		isSaving = true;
		try {
			await adminApi(`/anime/${animeId}`, { method: 'PUT', body: JSON.stringify({ title, slug, type, status, rating, network, studio, country, released, season, duration, totalEpisodes, skipIntroSeconds, skipOutroSeconds, thumbnail, bigCover, synopsis, genres }) });
			adminToast.success('Anime berhasil diperbarui');
			await load();
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal simpan');
		} finally {
			isSaving = false;
		}
	}

	async function deleteEpisode() {
		if (!episodeToDelete) return;
		await adminApi(`/episodes/${episodeToDelete}`, { method: 'DELETE' });
		adminToast.success('Episode dihapus');
		episodeToDelete = null;
		await load();
	}

	onMount(load);
</script>

{#if isLoading}
	<div class="h-80 animate-pulse rounded-xl bg-zinc-900"></div>
{:else}
	<form class="space-y-5" onsubmit={(event) => { event.preventDefault(); save(); }}>
		<div class="flex items-center justify-between">
			<div>
				<button type="button" onclick={() => goto('/admin/anime')} class="mb-2 text-sm font-bold text-violet-400">Kembali</button>
				<h2 class="text-2xl font-black">{title}</h2>
				<p class="text-sm text-zinc-500">Edit anime dan kelola episode.</p>
			</div>
			<button disabled={isSaving} class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">Simpan Perubahan</button>
		</div>

		<div class="flex gap-2 border-b border-zinc-800">
			{#each [{ id: 'info', label: 'Info Dasar' }, { id: 'episodes', label: 'Episode' }, { id: 'media', label: 'Media' }] as item}
				<button type="button" onclick={() => (tab = item.id)} class="border-b-2 px-4 py-3 text-sm font-bold {tab === item.id ? 'border-violet-500 text-violet-300' : 'border-transparent text-zinc-500'}">{item.label}</button>
			{/each}
		</div>

		{#if tab === 'info'}
			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<div class="grid gap-4 md:grid-cols-2">
					<AdminFormInput label="Judul" name="title" bind:value={title} required />
					<AdminFormInput label="Slug" name="slug" bind:value={slug} required />
					<label><span class="mb-1.5 block text-xs font-bold text-zinc-500">Type</span><select bind:value={type} class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"><option>Anime</option><option>Movie</option><option>Donghua</option></select></label>
					<label><span class="mb-1.5 block text-xs font-bold text-zinc-500">Status</span><select bind:value={status} class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"><option>Ongoing</option><option>Completed</option></select></label>
					<AdminFormInput label="Rating" name="rating" type="number" bind:value={rating} />
					<AdminFormInput label="Total Episode" name="totalEpisodes" type="number" bind:value={totalEpisodes} />
					<AdminFormInput label="Network" name="network" bind:value={network} />
					<AdminFormInput label="Studio" name="studio" bind:value={studio} />
					<AdminFormInput label="Country" name="country" bind:value={country} />
					<AdminFormInput label="Released" name="released" bind:value={released} />
					<AdminFormInput label="Season" name="season" bind:value={season} />
					<AdminFormInput label="Duration" name="duration" bind:value={duration} />
					<AdminFormInput label="Skip intro mulai (mm:ss / detik)" name="skipIntroSeconds" bind:value={skipIntroSeconds} />
					<AdminFormInput label="Skip outro mulai (mm:ss / detik)" name="skipOutroSeconds" bind:value={skipOutroSeconds} />
				</div>
				<div class="mt-4"><AdminTagInput label="Genre" bind:tags={genres} /></div>
				<label class="mt-4 block"><span class="mb-1.5 block text-xs font-bold text-zinc-500">Synopsis</span><textarea bind:value={synopsis} rows="6" class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-violet-500"></textarea></label>
			</section>
		{:else if tab === 'episodes'}
			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="font-black">Episode</h3>
					<a href="/admin/episodes?animeId={animeId}" class="rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white">Tambah Episode</a>
				</div>
				<div class="overflow-x-auto">
					<table class="min-w-full text-sm">
						<tbody class="divide-y divide-zinc-800">
							{#each episodes as ep}
								<tr class="hover:bg-zinc-800/30">
									<td class="px-3 py-3 font-black text-violet-300">Ep {ep.number}</td>
									<td class="px-3 py-3">{ep.title}</td>
									<td class="px-3 py-3 text-zinc-500">{ep.sub}</td>
									<td class="px-3 py-3 text-right">
										<a href="/admin/episodes/{ep.id}/upload" class="mr-2 rounded-lg border border-emerald-800 px-2 py-1 text-emerald-300 hover:border-emerald-600 hover:bg-emerald-950/30">Upload</a>
										<a href="/admin/episodes/{ep.id}" class="mr-2 rounded-lg border border-zinc-700 px-2 py-1">Edit</a>
										<button type="button" onclick={() => (episodeToDelete = ep.id)} class="rounded-lg border border-red-900 px-2 py-1 text-red-400">Hapus</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{:else}
			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<div class="grid gap-4 md:grid-cols-2">
					<div><AdminFormInput label="Thumbnail URL" name="thumbnail" bind:value={thumbnail} />{#if thumbnail}<img src={imageUrl(thumbnail)} alt="Thumbnail" class="mt-3 max-h-56 rounded-lg object-cover" />{/if}</div>
					<div><AdminFormInput label="Big Cover URL" name="bigCover" bind:value={bigCover} />{#if bigCover}<img src={imageUrl(bigCover)} alt="Cover" class="mt-3 max-h-56 rounded-lg object-cover" />{/if}</div>
				</div>
			</section>
		{/if}
	</form>
{/if}

<AdminModal open={Boolean(episodeToDelete)} title="Hapus episode?" message="Episode dan server terkait akan dihapus." danger onClose={() => (episodeToDelete = null)} onConfirm={deleteEpisode} />
