<script lang="ts">
	import { goto } from '$app/navigation';
	import { page as pageState } from '$app/state';
	import { onMount } from 'svelte';
	import { adminApi, toQuery } from '$lib/admin/api';
	import AdminModal from '$lib/components/admin/AdminModal.svelte';
	import AdminPagination from '$lib/components/admin/AdminPagination.svelte';
	import AdminSearchBar from '$lib/components/admin/AdminSearchBar.svelte';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	type ChatContextType = 'anime' | 'episode';
	type ChatContextItem = {
		type: ChatContextType;
		id: string;
		title: string;
		animeTitle: string | null;
		description: string | null;
		url: string;
	};
	type ChatAllowedLink = {
		url: string;
		rawText: string;
		host: string;
		path: string;
		preview: ChatContextItem | null;
	};
	type ChatMessage = {
		id: string;
		roomId: string;
		senderId: string;
		senderName: string;
		senderAvatar: string | null;
		content: string;
		contexts: ChatContextItem[];
		links: ChatAllowedLink[];
		editedAt: number | null;
		deletedAt: number | null;
		deletedBy: string | null;
		createdAt: number;
		expiresAt: number;
	};
	type SlowmodeSetting = {
		enabled: boolean;
		seconds: number;
		updatedBy: string | null;
		updatedAt: number;
	};
	type ChatSettings = {
		slowmode: {
			global: SlowmodeSetting;
			rooms: Record<string, SlowmodeSetting>;
		};
	};

	let messages = $state<ChatMessage[]>([]);
	let total = $state(0);
	let isLoading = $state(true);
	let settingsLoading = $state(true);
	let savingSlowmode = $state(false);
	let slowmodeEnabled = $state(false);
	let slowmodeSeconds = $state(0);
	let deleteTarget = $state<ChatMessage | null>(null);
	let confirmOpen = $state(false);
	let clearConfirmOpen = $state(false);

	const url = $derived(pageState.url);
	const currentPage = $derived(Number(url.searchParams.get('page') ?? 1));
	const search = $derived(url.searchParams.get('search') ?? '');
	const limit = 30;

	function setParams(next: Record<string, string | number>) {
		goto(`/admin/chat${toQuery({ page: currentPage, search, ...next })}`, { noScroll: true });
	}

	function formatTime(value: number) {
		return new Date(value).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function contextLabel(context: ChatContextItem) {
		if (context.type === 'episode' && context.animeTitle) return `${context.animeTitle} / ${context.title}`;
		return context.title;
	}

	function normalizeMessage(message: ChatMessage): ChatMessage {
		return {
			...message,
			contexts: Array.isArray(message.contexts) ? message.contexts : [],
			links: Array.isArray(message.links) ? message.links : [],
			editedAt: message.editedAt ?? null,
			deletedAt: message.deletedAt ?? null,
			deletedBy: message.deletedBy ?? null
		};
	}

	async function loadMessages() {
		isLoading = true;
		try {
			const result = await adminApi<ChatMessage[]>(
				`/chat/messages${toQuery({ page: currentPage, limit, search })}`
			);
			messages = result.data.map(normalizeMessage);
			total = Number(result.meta.total ?? 0);
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal memuat chat');
		} finally {
			isLoading = false;
		}
	}

	async function loadSettings() {
		settingsLoading = true;
		try {
			const result = await adminApi<ChatSettings>('/chat/settings');
			slowmodeEnabled = Boolean(result.data.slowmode.global.enabled);
			slowmodeSeconds = Number(result.data.slowmode.global.seconds ?? 0);
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal memuat setting chat');
		} finally {
			settingsLoading = false;
		}
	}

	async function saveSlowmode() {
		savingSlowmode = true;
		try {
			const seconds = Math.max(0, Math.min(3600, Math.floor(Number(slowmodeSeconds) || 0)));
			const result = await adminApi<SlowmodeSetting>('/chat/settings/slowmode', {
				method: 'PATCH',
				body: JSON.stringify({ enabled: slowmodeEnabled, seconds })
			});
			slowmodeEnabled = result.data.enabled;
			slowmodeSeconds = result.data.seconds;
			adminToast.success('Slowmode chat disimpan');
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal simpan slowmode');
		} finally {
			savingSlowmode = false;
		}
	}

	function askDelete(message: ChatMessage) {
		deleteTarget = message;
		confirmOpen = true;
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		try {
			await adminApi(`/chat/messages/${deleteTarget.id}`, { method: 'DELETE' });
			adminToast.success('Chat disembunyikan');
			await loadMessages();
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal hapus chat');
		} finally {
			confirmOpen = false;
			deleteTarget = null;
		}
	}

	async function clearAllMessages() {
		try {
			await adminApi('/chat/messages', { method: 'DELETE' });
			adminToast.success('Semua chat dibersihkan');
			clearConfirmOpen = false;
			await loadMessages();
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal clear chat');
		}
	}

	onMount(() => {
		void loadSettings();
	});

	$effect(() => {
		url;
		void loadMessages();
	});
</script>

<div class="space-y-5">
	<div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
		<div>
			<h2 class="text-2xl font-black text-zinc-50">Chat Admin</h2>
			<p class="text-sm text-zinc-500">
				Atur slowmode, cari fulltext chat, dan hapus pesan dari room global.
			</p>
		</div>
		<a
			href="/chat"
			class="inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs font-black text-zinc-300 hover:border-violet-500/50 hover:text-violet-300"
		>
			<span class="material-symbols-rounded text-[17px]">open_in_new</span>
			Buka Chat
		</a>
	</div>

	<section class="grid gap-4 lg:grid-cols-[380px_1fr]">
		<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
			<div class="mb-4 flex items-start justify-between gap-3">
				<div>
					<p class="text-[11px] font-black uppercase tracking-[0.18em] text-violet-400">
						Global Slowmode
					</p>
					<h3 class="mt-1 text-lg font-black text-zinc-100">Rate limit chat</h3>
					<p class="mt-1 text-xs leading-5 text-zinc-500">
						Berlaku untuk user biasa. Admin dan moderator otomatis bypass.
					</p>
				</div>
				<span
					class="rounded-full px-2.5 py-1 text-[10px] font-black {slowmodeEnabled
						? 'bg-emerald-500/15 text-emerald-300'
						: 'bg-zinc-800 text-zinc-500'}"
				>
					{slowmodeEnabled ? 'ON' : 'OFF'}
				</span>
			</div>

			<label class="mb-4 flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3">
				<span>
					<span class="block text-sm font-black text-zinc-200">Aktifkan slowmode</span>
					<span class="text-xs text-zinc-500">Cegah spam per user</span>
				</span>
				<input type="checkbox" bind:checked={slowmodeEnabled} class="h-5 w-5 accent-violet-600" />
			</label>

			<label class="block">
				<span class="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-500">
					Delay per pesan
				</span>
				<div class="flex items-center gap-2">
					<input
						type="number"
						min="0"
						max="3600"
						step="1"
						bind:value={slowmodeSeconds}
						class="h-11 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm font-bold text-zinc-100 outline-none focus:border-violet-500"
					/>
					<span class="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-xs font-black text-zinc-500">
						detik
					</span>
				</div>
			</label>

			<button
				type="button"
				disabled={settingsLoading || savingSlowmode}
				onclick={saveSlowmode}
				class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/20 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<span class="material-symbols-rounded text-[18px]">save</span>
				{savingSlowmode ? 'Menyimpan...' : 'Simpan Slowmode'}
			</button>
		</div>

		<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
			<div class="mb-4 grid gap-3 xl:grid-cols-[1fr_auto_auto]">
				<AdminSearchBar
					value={search}
					placeholder="Search fulltext: user, isi pesan, anime, episode, link..."
					onSearch={(value) => setParams({ search: value, page: 1 })}
				/>
				<button
					type="button"
					onclick={loadMessages}
					class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 text-xs font-black text-zinc-300 hover:bg-zinc-800"
				>
					<span class="material-symbols-rounded text-[17px]">refresh</span>
					Refresh
				</button>
				<button
					type="button"
					disabled={total <= 0 || isLoading}
					onclick={() => (clearConfirmOpen = true)}
					class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-900/70 px-4 text-xs font-black text-red-300 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
				>
					<span class="material-symbols-rounded text-[17px]">delete_sweep</span>
					Clear Semua
				</button>
			</div>

			<div class="mb-3 flex items-center justify-between gap-3">
				<p class="text-xs font-bold text-zinc-500">
					{search ? `Hasil untuk "${search}"` : 'Pesan terbaru'} / {total.toLocaleString('id-ID')} chat
				</p>
				{#if search}
					<button
						type="button"
						onclick={() => setParams({ search: '', page: 1 })}
						class="text-xs font-black text-violet-300 hover:text-violet-200"
					>
						Reset search
					</button>
				{/if}
			</div>

			<div class="min-h-[420px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
				{#if isLoading}
					<div class="flex h-64 items-center justify-center text-sm font-bold text-zinc-500">
						Memuat chat...
					</div>
				{:else if messages.length === 0}
					<div class="px-6 py-16 text-center">
						<span class="material-symbols-rounded text-4xl text-zinc-700">forum</span>
						<p class="mt-3 text-sm font-black text-zinc-300">Tidak ada chat</p>
						<p class="mt-1 text-xs text-zinc-500">Coba keyword lain atau refresh data.</p>
					</div>
				{:else}
					<div class="divide-y divide-zinc-900">
						{#each messages as message (message.id)}
							<article class="grid gap-3 p-4 transition hover:bg-zinc-900/70 md:grid-cols-[minmax(0,1fr)_auto]">
								<div class="min-w-0">
									<div class="mb-2 flex flex-wrap items-center gap-2">
										{#if message.senderAvatar}
											<img
												src={message.senderAvatar}
												alt={message.senderName}
												class="h-8 w-8 rounded-full bg-zinc-800 object-cover"
											/>
										{:else}
											<div class="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white">
												{(message.senderName?.[0] ?? '?').toUpperCase()}
											</div>
										{/if}
										<div class="min-w-0">
											<p class="truncate text-sm font-black text-zinc-100">{message.senderName}</p>
											<p class="text-[11px] font-bold text-zinc-600">
												{formatTime(message.createdAt)} / ID {message.id.slice(0, 8)}
											</p>
										</div>
										{#if message.deletedAt}
											<span class="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-red-300">
												Dihapus
											</span>
										{:else if message.editedAt}
											<span class="rounded-full bg-zinc-800 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">
												Diedit
											</span>
										{/if}
									</div>

									{#if message.deletedAt}
										<div class="grid gap-2 rounded-lg border border-red-950/60 bg-red-950/10 px-3 py-2">
											<p class="text-xs font-black text-red-300">
												Public: <em class="font-bold text-zinc-500">Pesan telah dihapus</em>
											</p>
											{#if message.content}
												<div>
													<p class="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">
														Pesan asli
													</p>
													<p class="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-200">
														{message.content}
													</p>
												</div>
											{/if}
											<p class="text-[11px] font-bold text-zinc-600">
												Dihapus {formatTime(message.deletedAt)} oleh ID {message.deletedBy ?? '-'}
											</p>
										</div>
									{:else if message.content}
										<p class="whitespace-pre-wrap break-words rounded-lg bg-zinc-900 px-3 py-2 text-sm leading-6 text-zinc-200">
											{message.content}
											{#if message.editedAt}
												<span class="ml-2 text-[11px] font-bold italic text-zinc-500">(diedit)</span>
											{/if}
										</p>
									{/if}

									{#if (message.contexts ?? []).length}
										<div class="mt-2 flex flex-wrap gap-2">
											{#each message.contexts ?? [] as context}
												<a
													href={context.url}
													class="inline-flex max-w-full items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[11px] font-black text-violet-200 hover:border-violet-400"
												>
													<span class="material-symbols-rounded text-[14px]">
														{context.type === 'episode' ? 'smart_display' : 'movie'}
													</span>
													<span class="truncate">{contextLabel(context)}</span>
												</a>
											{/each}
										</div>
									{/if}

									{#if (message.links ?? []).length}
										<div class="mt-2 flex flex-wrap gap-2">
											{#each message.links ?? [] as link}
												<a
													href={link.preview?.url ?? link.path}
													class="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[11px] font-black text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
												>
													<span class="material-symbols-rounded text-[14px]">link</span>
													<span class="truncate">{link.preview?.title ?? link.rawText}</span>
												</a>
											{/each}
										</div>
									{/if}
								</div>

								<div class="flex items-start justify-end">
									<button
										type="button"
										disabled={Boolean(message.deletedAt)}
										onclick={() => askDelete(message)}
										class="inline-flex items-center gap-1.5 rounded-lg border border-red-900/70 px-3 py-2 text-xs font-black text-red-300 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
									>
										<span class="material-symbols-rounded text-[16px]">delete</span>
										{message.deletedAt ? 'Sudah dihapus' : 'Hapus'}
									</button>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</div>

			<div class="mt-4">
				<AdminPagination {total} page={currentPage} {limit} onChange={(page) => setParams({ page })} />
			</div>
		</div>
	</section>
</div>

<AdminModal
	open={confirmOpen}
	title="Hapus chat?"
	message={`Pesan dari ${deleteTarget?.senderName ?? 'user'} akan disembunyikan dari publik. Pesan asli tetap terlihat di admin untuk audit.`}
	danger
	onClose={() => {
		confirmOpen = false;
		deleteTarget = null;
	}}
	onConfirm={confirmDelete}
/>

<AdminModal
	open={clearConfirmOpen}
	title="Clear semua chat?"
	message={`Semua pesan chat aktif (${total.toLocaleString('id-ID')} chat) akan dihapus dari room global. Aksi ini tidak bisa dibatalkan.`}
	danger
	onClose={() => (clearConfirmOpen = false)}
	onConfirm={clearAllMessages}
/>
