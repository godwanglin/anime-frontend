<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { adminApi } from '$lib/admin/api';
	import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
	import AdminModal from '$lib/components/admin/AdminModal.svelte';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	type EpisodeNavItem = {
		id: number;
		number: number;
		title: string;
		status?: string | null;
	};

	type EpisodeNavigation = {
		currentId: number;
		episodes: EpisodeNavItem[];
		previous: EpisodeNavItem | null;
		next: EpisodeNavItem | null;
	};

	let id = $derived(Number(page.params.id));
	let episode: any = $state(null);
	let navigation = $state<EpisodeNavigation | null>(null);
	let selectedEpisodeId = $state('');
	let servers = $state<any[]>([]);
	let number = $state<number | null>(null);
	let title = $state('');
	let sub = $state('');
	let date = $state('');
	let status = $state('published');
	let skipIntroSeconds = $state<string | number | null>(null);
	let skipOutroSeconds = $state<string | number | null>(null);
	let label = $state('');
	let value = $state('');
	let isPrimary = $state(false);
	let deleteServerId = $state<number | null>(null);
	let settingPrimaryId = $state<number | null>(null);
	let isAddingServer = $state(false);
	let serverToolMessage = $state('');

	async function load() {
		episode = (await adminApi<any>(`/episodes/${id}`)).data;
		if (episode) {
			number = episode.number;
			title = episode.title;
			sub = episode.sub ?? '';
			date = episode.date ?? '';
			status = episode.status ?? 'published';
			skipIntroSeconds = episode.skipIntroSeconds ?? null;
			skipOutroSeconds = episode.skipOutroSeconds ?? null;
		}
		servers = (await adminApi<any[]>(`/episodes/${id}/servers`)).data;
		navigation = (await adminApi<EpisodeNavigation>(`/episodes/${id}/navigation`)).data;
		selectedEpisodeId = String(id);
	}

	function openEpisode(episodeId: number | string) {
		const targetId = Number(episodeId);
		if (!targetId || targetId === id) return;
		goto(`/admin/episodes/${targetId}`);
	}

	async function save() {
	await adminApi(`/episodes/${id}`, {
		method: 'PUT',
		body: JSON.stringify({ number, title, sub, date, status, skipIntroSeconds, skipOutroSeconds })
	});
		adminToast.success('Episode disimpan');
		await load();
	}

	async function addServer() {
		isAddingServer = true;
		serverToolMessage = '';
		try {
			const result = await adminApi<any>(`/episodes/${id}/servers`, {
				method: 'POST',
				body: JSON.stringify({ label, value, isPrimary })
			});
			const subtitleImport = result.data?.subtitleImport;
			label = '';
			value = '';
			isPrimary = false;
			serverToolMessage =
				subtitleImport?.message ??
				(subtitleImport?.attempted ? 'Subtitle YouTube diproses' : 'Server ditambahkan');
			adminToast.success(serverToolMessage);
			await load();
		} finally {
			isAddingServer = false;
		}
	}

	async function deleteServer() {
		if (!deleteServerId) return;
		await adminApi(`/servers/${deleteServerId}`, { method: 'DELETE' });
		deleteServerId = null;
		adminToast.success('Server dihapus');
		await load();
	}

	async function setPrimaryServer(serverId: number) {
		settingPrimaryId = serverId;
		try {
			await adminApi(`/servers/${serverId}`, {
				method: 'PUT',
				body: JSON.stringify({ isPrimary: true })
			});
			adminToast.success('Server utama diperbarui');
			await load();
		} finally {
			settingPrimaryId = null;
		}
	}

	$effect(() => {
		id;
		load();
	});
</script>

<div class="mx-auto max-w-5xl space-y-5">
	<div class="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 lg:flex-row lg:items-center lg:justify-between">
		<button onclick={() => goto('/admin/episodes')} class="text-left text-sm font-bold text-violet-400"
			>Kembali ke Episode</button
		>
		{#if navigation}
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
				<button
					type="button"
					disabled={!navigation.previous}
					onclick={() => navigation?.previous && openEpisode(navigation.previous.id)}
					class="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-200 disabled:cursor-not-allowed disabled:text-zinc-600"
					>Sebelumnya</button
				>
				<select
					bind:value={selectedEpisodeId}
					onchange={(event) => openEpisode(event.currentTarget.value)}
					class="h-10 min-w-64 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm font-bold text-zinc-100"
				>
					{#each navigation.episodes as item}
						<option value={String(item.id)}>
							Ep {item.number} - {item.title || `Episode ${item.number}`}
						</option>
					{/each}
				</select>
				<button
					type="button"
					disabled={!navigation.next}
					onclick={() => navigation?.next && openEpisode(navigation.next.id)}
					class="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-200 disabled:cursor-not-allowed disabled:text-zinc-600"
					>Selanjutnya</button
				>
			</div>
		{/if}
	</div>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			save();
		}}
		class="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
	>
		<h2 class="mb-4 text-2xl font-black">Edit Episode</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<AdminFormInput
				label="Nomor Episode"
				name="number"
				type="number"
				bind:value={number}
				required
			/>
			<AdminFormInput label="Judul" name="title" bind:value={title} required />
			<AdminFormInput label="Sub/Dub" name="sub" bind:value={sub} />
			<label class="block">
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Status</span>
				<select
					bind:value={status}
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				>
					<option value="published">Published</option>
					<option value="draft">Draft</option>
				</select>
			</label>
			<AdminFormInput label="Tanggal Tayang" name="date" bind:value={date} />
			<AdminFormInput
				label="Skip intro (mm:ss / detik)"
				name="skipIntroSeconds"
				bind:value={skipIntroSeconds}
			/>
			<AdminFormInput
				label="Skip outro mulai (mm:ss / detik)"
				name="skipOutroSeconds"
				bind:value={skipOutroSeconds}
			/>
		</div>
		<button class="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white"
			>Simpan Perubahan</button
		>
	</form>

	<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
		<div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<h3 class="text-lg font-black">Server Video</h3>
			<div class="flex flex-wrap gap-2">
				<a
					href="/admin/episodes/{id}/upload"
					class="rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700"
					>Upload Video</a
				>
				<a
					href="/admin/subtitle-studio/{id}"
					class="rounded-lg border border-violet-500 px-3 py-2 text-sm font-bold text-violet-200 hover:bg-violet-500/10"
					>Subtitle Studio</a
				>
			</div>
		</div>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				addServer();
			}}
			class="mb-4 grid gap-3 md:grid-cols-[200px_1fr_auto_auto]"
		>
			<input
				bind:value={label}
				placeholder="Label"
				class="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
			/>
			<input
				bind:value
				placeholder="URL / iframe src"
				class="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
			/>
			<label class="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm font-bold text-zinc-200">
				<input
					type="checkbox"
					bind:checked={isPrimary}
					class="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-violet-600"
				/>
				Primary
			</label>
			<button
				disabled={isAddingServer}
				class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:bg-zinc-700"
				>{isAddingServer ? 'Memproses...' : 'Tambah'}</button
			>
		</form>
		{#if serverToolMessage}
			<p class="mb-4 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-300">
				{serverToolMessage}
			</p>
		{/if}
		<div class="overflow-x-auto">
			<table class="min-w-full text-sm">
				<tbody class="divide-y divide-zinc-800">
					{#each servers as server}
						<tr class={server.isPrimary ? 'bg-emerald-500/5' : ''}>
							<td class="px-3 py-3 font-bold">
								<div class="flex flex-wrap items-center gap-2">
									<span>{server.label}</span>
									{#if server.isPrimary}
										<span
											class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-emerald-300"
											>Primary</span
										>
									{/if}
								</div>
							</td>
							<td class="max-w-xl truncate px-3 py-3 text-zinc-400">{server.value}</td>
							<td class="px-3 py-3 text-right"
								><button
									type="button"
									disabled={server.isPrimary || settingPrimaryId === server.id}
									onclick={() => setPrimaryServer(server.id)}
									class="mr-2 rounded-lg border border-emerald-700 px-2 py-1 text-emerald-300 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
									>{server.isPrimary
										? 'Primary'
										: settingPrimaryId === server.id
											? 'Menyimpan...'
											: 'Set Primary'}</button
								><button
									onclick={() => (deleteServerId = server.id)}
									class="rounded-lg border border-red-900 px-2 py-1 text-red-400">Hapus</button
								></td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</div>

<AdminModal
	open={Boolean(deleteServerId)}
	title="Hapus server?"
	message="Sumber video ini akan dihapus."
	danger
	onClose={() => (deleteServerId = null)}
	onConfirm={deleteServer}
/>
