<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { onMount } from 'svelte';
	import { adminApi, toQuery } from '$lib/admin/api';
	import AdminSearchBar from '$lib/components/admin/AdminSearchBar.svelte';
	import { adminToast } from '$lib/stores/adminToast.svelte';
	import { openSupportSocket } from '$lib/support';

	type SupportConversationStatus = 'ai_active' | 'needs_human' | 'human_active' | 'resolved';
	type SupportConversationPriority = 'normal' | 'high' | 'urgent';

	type Row = {
		id: string;
		userId: number;
		username: string;
		fullName: string | null;
		avatar: string | null;
		status: SupportConversationStatus;
		priority: SupportConversationPriority;
		assignedAdminId: number | null;
		lastMessageAt: number | null;
		unreadUser: number;
		unreadAdmin: number;
		updatedAt: number;
	};

	type Msg = {
		id: string;
		conversationId: string;
		senderType: 'user' | 'ai' | 'admin' | 'system';
		senderDisplay: { username: string; name: string; role: string };
		content: string;
		source: string;
		createdAt: number;
	};

	let rows = $state<Row[]>([]);
	let total = $state(0);
	let isLoading = $state(true);
	let selectedId = $state<string | null>(null);
	let detailLoading = $state(false);
	let messages = $state<Msg[]>([]);
	let draft = $state('');
	let search = $state('');
	let status = $state<SupportConversationStatus | 'all'>('all');
	let socket: WebSocket | null = null;
	let typingByConv = $state<Record<string, { username: string; text: string; typing: boolean; updatedAt: number }>>({});
	let joinedConvId: string | null = null;
	let pendingIds = $state<Set<string>>(new Set());

	function formatTime(value: number) {
		return new Date(value).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
	}

	async function loadList() {
		isLoading = true;
		try {
			const result = await adminApi<Row[]>(
				`/support/conversations${toQuery({ status: status === 'all' ? '' : status, search, page: 1, limit: 30 })}`
			);
			rows = result.data;
			total = Number(result.meta.total ?? 0);
			if (!selectedId && rows[0]?.id) {
				selectedId = rows[0].id;
				void loadDetail();
			}
		} catch (e) {
			adminToast.error(e instanceof Error ? e.message : 'Gagal load support');
		} finally {
			isLoading = false;
		}
	}

	async function loadDetail() {
		if (!selectedId) return;
		detailLoading = true;
		try {
			const result = await adminApi<{ messages: Msg[]; nextCursor: string | null; serverTime: number }>(
				`/support/conversations/${encodeURIComponent(selectedId)}/messages?limit=120`
			);
			messages = result.data.messages ?? [];
		} catch (e) {
			adminToast.error(e instanceof Error ? e.message : 'Gagal load chat');
		} finally {
			detailLoading = false;
		}
	}

	async function closeTicket() {
		if (!selectedId) return;
		try {
			await adminApi(`/support/conversations/${encodeURIComponent(selectedId)}/resolve`, { method: 'PATCH' });
			adminToast.success('Ticket ditutup');
			void loadList();
			void loadDetail();
		} catch (e) {
			adminToast.error(e instanceof Error ? e.message : 'Gagal tutup ticket');
		}
	}

	async function clearChat() {
		if (!selectedId) return;
		try {
			await adminApi(`/support/conversations/${encodeURIComponent(selectedId)}/clear`, { method: 'PATCH' });
			adminToast.success('Chat dihapus');
			messages = [];
			void loadList();
		} catch (e) {
			adminToast.error(e instanceof Error ? e.message : 'Gagal clear chat');
		}
	}

	function mergeIncoming(next: Msg[]) {
		const merged = new Map(messages.map((m) => [m.id, m]));
		for (const m of next) merged.set(m.id, m);
		messages = Array.from(merged.values()).sort((a, b) => a.createdAt - b.createdAt);
	}

	function removeMessageById(id: string) {
		messages = messages.filter((m) => m.id !== id);
	}

	async function send() {
		if (!selectedId || !draft.trim()) return;
		const content = draft.trim();
		const tmpId = `tmp-${crypto.randomUUID()}`;
		const optimistic: Msg = {
			id: tmpId,
			conversationId: selectedId,
			senderType: 'admin',
			senderDisplay: { username: 'csweebin', name: 'Weebin Care', role: 'admin' },
			content,
			source: 'app',
			createdAt: Date.now()
		};
		pendingIds = new Set(pendingIds).add(tmpId);
		mergeIncoming([optimistic]);

		draft = '';
		try {
			const result = await adminApi<{ meta: any; message: Msg }>(`/support/conversations/${encodeURIComponent(selectedId)}/messages`, {
				method: 'POST',
				body: JSON.stringify({ content })
			});
			removeMessageById(tmpId);
			const nextPending = new Set(pendingIds);
			nextPending.delete(tmpId);
			pendingIds = nextPending;
			const actual = (result as any)?.data?.message as Msg | undefined;
			if (actual) mergeIncoming([actual]);
		} catch (e) {
			adminToast.error(e instanceof Error ? e.message : 'Gagal kirim');
			removeMessageById(tmpId);
			const nextPending = new Set(pendingIds);
			nextPending.delete(tmpId);
			pendingIds = nextPending;
			draft = content;
		}
	}

	async function setupSocket() {
		socket?.close();
		socket = await openSupportSocket();
		if (!socket) return;

		socket.onopen = () => {
			if (!selectedId) return;
			try {
				socket?.send(JSON.stringify({ event: 'support:join', conversationId: selectedId }));
				joinedConvId = selectedId;
			} catch {
				// ignore
			}
		};

		socket.onmessage = (ev) => {
			try {
				const payload = JSON.parse(String(ev.data ?? ''));
				if (payload?.event === 'support:conversation:cleared') {
					const convId = String(payload.conversationId ?? '');
					if (convId && convId === selectedId) {
						messages = [];
					}
					return;
				}
				if (payload?.event === 'support:message:new') {
					const convId = String(payload.conversationId ?? '');
					if (!convId || convId !== selectedId) return;
					mergeIncoming([payload.message as Msg]);
					return;
				}
				if (payload?.event === 'support:typing:update') {
					const convId = String(payload.conversationId ?? '');
					if (!convId) return;
					typingByConv = {
						...typingByConv,
						[convId]: {
							username: String(payload.username ?? ''),
							text: String(payload.text ?? ''),
							typing: Boolean(payload.typing),
							updatedAt: Date.now()
						}
					};
					return;
				}
			} catch {
				// ignore
			}
		};

		socket.onerror = () => socket?.close();
		socket.onclose = () => {
			socket = null;
			joinedConvId = null;
		};
	}

	function switchRoom(nextId: string) {
		if (!socket || socket.readyState !== WebSocket.OPEN) return;
		if (joinedConvId && joinedConvId !== nextId) {
			try {
				socket.send(JSON.stringify({ event: 'support:leave', conversationId: joinedConvId }));
			} catch {
				// ignore
			}
		}
		try {
			socket.send(JSON.stringify({ event: 'support:join', conversationId: nextId }));
			joinedConvId = nextId;
		} catch {
			// ignore
		}
	}

	onMount(() => {
		void loadList();
		void setupSocket();
		return () => {
			try {
				if (socket && joinedConvId) socket.send(JSON.stringify({ event: 'support:leave', conversationId: joinedConvId }));
			} catch {
				// ignore
			}
			socket?.close();
			socket = null;
		};
	});
</script>

<div class="space-y-4">
	<div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
		<div>
			<h2 class="text-2xl font-black text-zinc-50">Support Chat</h2>
			<p class="text-sm text-zinc-500">Ticket per user, history jelas per tanggal dan jam.</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={loadList}
				class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 text-xs font-black text-zinc-300 hover:bg-zinc-800"
			>
				<AppIcon name="refresh" class="text-[17px]" />
				Refresh
			</button>
		</div>
	</div>

	<div class="grid gap-4 lg:grid-cols-[360px_1fr]">
		<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
			<div class="mb-3 grid gap-3">
				<AdminSearchBar
					value={search}
					placeholder="Cari: username / nama / ticket..."
					onSearch={(value) => {
						search = value;
						void loadList();
					}}
				/>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => {
							status = 'all';
							void loadList();
						}}
						class="flex-1 rounded-lg border px-3 py-2 text-[11px] font-black
							{status === 'all' ? 'border-violet-500 bg-violet-600 text-white' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}"
					>
						Semua
					</button>
					<button
						type="button"
						onclick={() => {
							status = 'needs_human';
							void loadList();
						}}
						class="flex-1 rounded-lg border px-3 py-2 text-[11px] font-black
							{status === 'needs_human'
								? 'border-amber-500 bg-amber-600 text-white'
								: 'border-zinc-800 bg-zinc-950 text-zinc-400'}"
					>
						Needs human
					</button>
					<button
						type="button"
						onclick={() => {
							status = 'resolved';
							void loadList();
						}}
						class="flex-1 rounded-lg border px-3 py-2 text-[11px] font-black
							{status === 'resolved'
								? 'border-emerald-500 bg-emerald-600 text-white'
								: 'border-zinc-800 bg-zinc-950 text-zinc-400'}"
					>
						Selesai
					</button>
				</div>
			</div>

			<p class="mb-2 text-xs font-bold text-zinc-500">{total.toLocaleString('id-ID')} ticket</p>

			<div class="max-h-[62vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950">
				{#if isLoading}
					<div class="flex h-40 items-center justify-center text-sm font-bold text-zinc-500">Memuat...</div>
				{:else if rows.length === 0}
					<div class="px-5 py-10 text-center text-sm font-bold text-zinc-500">Belum ada ticket</div>
				{:else}
					<div class="divide-y divide-zinc-900">
						{#each rows as row (row.id)}
							<button
								type="button"
								onclick={() => {
									selectedId = row.id;
									void loadDetail();
									switchRoom(row.id);
								}}
								class="w-full px-4 py-3 text-left hover:bg-zinc-900/70
									{selectedId === row.id ? 'bg-violet-500/10' : ''}"
							>
								<div class="flex items-center justify-between gap-3">
									<p class="truncate text-sm font-black text-zinc-100">
										{row.fullName ?? row.username}
										<span class="ml-2 text-[11px] font-bold text-zinc-500">@{row.username}</span>
									</p>
									{#if row.unreadAdmin > 0}
										<span class="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-black text-white">
											{row.unreadAdmin}
										</span>
									{/if}
								</div>
								<p class="mt-1 text-[11px] font-bold text-zinc-600">{formatTime(row.updatedAt)}</p>
								<p class="mt-1 text-[11px] font-black text-zinc-500">SUP-{row.id.slice(0, 8)} - {row.status}</p>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</section>

		<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
			{#if !selectedId}
				<div class="flex h-64 items-center justify-center text-sm font-bold text-zinc-500">Pilih ticket</div>
			{:else}
				<div class="mb-3 flex items-center justify-between gap-3">
					<p class="text-sm font-black text-zinc-100">Ticket: SUP-{selectedId.slice(0, 8)}</p>
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={clearChat}
							class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-900/50 bg-red-950/10 px-4 text-xs font-black text-red-200 hover:bg-red-950/30"
						>
							<AppIcon name="delete" class="text-[17px]" />
							Clear
						</button>
						<button
							type="button"
							onclick={closeTicket}
							class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-700/60 bg-amber-950/10 px-4 text-xs font-black text-amber-200 hover:bg-amber-950/30"
						>
							<AppIcon name="check_circle" class="text-[17px]" />
							Close
						</button>
						<button
							type="button"
							onclick={loadDetail}
							class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 text-xs font-black text-zinc-300 hover:bg-zinc-800"
						>
							<AppIcon name="refresh" class="text-[17px]" />
							Refresh
						</button>
					</div>
				</div>

				{#if typingByConv[selectedId]?.typing && typingByConv[selectedId]?.text}
					<div class="mb-3 rounded-xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-xs font-bold text-amber-200">
						@{typingByConv[selectedId].username} lagi ngetik: <span class="font-black">{typingByConv[selectedId].text}</span>
					</div>
				{/if}

				<div class="h-[54vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4">
					{#if detailLoading}
						<div class="flex h-40 items-center justify-center text-sm font-bold text-zinc-500">Memuat chat...</div>
					{:else if messages.length === 0}
						<div class="flex h-40 items-center justify-center text-sm font-bold text-zinc-500">Belum ada pesan</div>
					{:else}
						{#each messages as message (message.id)}
							<div class="mb-3 flex {message.senderType === 'user' ? 'justify-start' : 'justify-end'}">
								<div class="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6
									{message.senderType === 'user'
										? 'bg-zinc-900 text-zinc-100 border border-zinc-800'
										: 'bg-violet-600 text-white'}
									{pendingIds.has(message.id) ? ' opacity-70' : ''}">
									<p class="whitespace-pre-wrap break-words">{message.content}</p>
									<p class="mt-2 text-right text-[10px] font-black opacity-70">{formatTime(message.createdAt)}</p>
								</div>
							</div>
						{/each}
					{/if}
				</div>

				<form
					class="mt-3 flex items-center gap-2"
					onsubmit={(e) => {
						e.preventDefault();
						void send();
					}}
				>
					<input
						bind:value={draft}
						placeholder="Balas user..."
						class="h-11 min-w-0 flex-1 rounded-full border border-zinc-800 bg-zinc-950 px-4 text-sm font-bold text-zinc-100 outline-none focus:border-violet-500"
					/>
					<button
						type="submit"
						disabled={!draft.trim()}
						class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-500/20 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
						aria-label="Kirim"
					>
						<AppIcon name="send" class="text-[18px]" />
					</button>
				</form>
			{/if}
		</section>
	</div>
</div>
