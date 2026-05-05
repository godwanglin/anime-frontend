<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { onMount, tick } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import {
		ensureSupportConversation,
		fetchSupportConversationMe,
		requestSupportHandoff,
		openSupportSocket,
		sendSupportMessage,
		type SupportConversationEnvelope,
		type SupportConversationMeta,
		type SupportMessage
	} from '$lib/support';

	let isLoading = $state(true);
	let sending = $state(false);
	let draft = $state('');
	let convo = $state<SupportConversationEnvelope | null>(null);
	let error = $state('');
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let messageListEl: HTMLDivElement | null = null;
	let socket: WebSocket | null = null;
	let typingTimer: ReturnType<typeof setTimeout> | null = null;
	let lastTypingSentAt = 0;
	let pendingIds = $state<Set<string>>(new Set());

	const statusLabel = (status: SupportConversationMeta['status']) => {
		const labels: Record<SupportConversationMeta['status'], string> = {
			ai_active: 'AI bantu dulu',
			needs_human: 'Nunggu CS',
			human_active: 'CS lagi bantu',
			resolved: 'Ticket ditutup'
		};
		return labels[status] ?? status;
	};

	function formatDay(value: number) {
		return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(
			new Date(value)
		);
	}
	function formatTime(value: number) {
		return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
	}
	function sameDay(a: number, b: number) {
		const da = new Date(a);
		const db = new Date(b);
		return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
	}

	function mergeMessages(next: SupportMessage[]) {
		if (!convo) return;
		const merged = new Map(convo.messages.map((m) => [m.id, m]));
		for (const m of next) merged.set(m.id, m);
		convo = { ...convo, messages: Array.from(merged.values()).sort((a, b) => a.createdAt - b.createdAt) };
	}

	function removeMessageById(id: string) {
		if (!convo) return;
		convo = { ...convo, messages: convo.messages.filter((m) => m.id !== id) };
	}

	function updateMeta(next: SupportConversationMeta) {
		if (!convo) return;
		convo = { ...convo, meta: next, messages: convo.messages };
	}

	async function scrollToBottom() {
		await tick();
		messageListEl?.scrollTo({ top: messageListEl.scrollHeight, behavior: 'smooth' });
	}

	async function loadInitial() {
		error = '';
		isLoading = true;
		try {
			if (!auth.accessToken) await auth.refreshToken();
			if (!auth.accessToken) {
				convo = null;
				return;
			}
			await ensureSupportConversation();
			convo = await fetchSupportConversationMe(80);
			queueMicrotask(scrollToBottom);
			await setupSocket();
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Gagal load support chat';
			error =
				msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('token')
					? 'Kamu perlu login dulu untuk chat CS.'
					: msg;
		} finally {
			isLoading = false;
		}
	}

	async function setupSocket() {
		stopPolling();
		if (!convo) return;
		if (socket && socket.readyState === WebSocket.OPEN) return;
		if (socket && socket.readyState === WebSocket.CONNECTING) return;

		socket?.close();
		socket = await openSupportSocket();
		if (!socket) {
			startPolling();
			return;
		}

		const conversationId = convo.meta.id;

		socket.onopen = () => {
			try {
				socket?.send(JSON.stringify({ event: 'support:join', conversationId }));
			} catch {
				// ignore
			}
		};

		socket.onmessage = (ev) => {
			try {
				const payload = JSON.parse(String(ev.data ?? ''));
				if (payload?.event === 'support:conversation:cleared' && payload.conversationId === conversationId) {
					convo = { ...convo, messages: [] };
					return;
				}
				if (payload?.event === 'support:message:new' && payload.conversationId === conversationId) {
					mergeMessages([payload.message as SupportMessage]);
					queueMicrotask(scrollToBottom);
				}
			} catch {
				// ignore
			}
		};

		socket.onclose = () => {
			socket = null;
			startPolling();
		};
		socket.onerror = () => {
			socket?.close();
		};
	}

	function sendTypingUpdate(text: string) {
		if (!socket || socket.readyState !== WebSocket.OPEN) return;
		if (!convo) return;

		const trimmed = text.trim();
		const typing = Boolean(trimmed);
		const now = Date.now();
		if (!typing && now - lastTypingSentAt < 350) return;
		lastTypingSentAt = now;

		try {
			socket.send(
				JSON.stringify({
					event: 'support:typing',
					conversationId: convo.meta.id,
					typing,
					text: trimmed.slice(0, 220)
				})
			);
		} catch {
			// ignore
		}
	}

	async function poll() {
		if (!convo) return;
		const last = convo.messages.at(-1)?.createdAt ?? 0;
		try {
			const next = await fetchSupportConversationMe(80, last);
			if (next.messages.length) {
				mergeMessages(next.messages);
				queueMicrotask(scrollToBottom);
			}
			convo = { ...next, messages: convo.messages };
		} catch {
			// ignore polling errors
		}
	}

	function startPolling() {
		if (pollTimer) return;
		pollTimer = setInterval(poll, 2500);
	}

	function stopPolling() {
		if (!pollTimer) return;
		clearInterval(pollTimer);
		pollTimer = null;
	}

	async function submit() {
		if (!convo || !draft.trim() || sending) return;
		sending = true;
		const content = draft.trim();
		const tmpId = `tmp-${crypto.randomUUID()}`;
		const optimistic: SupportMessage = {
			id: tmpId,
			conversationId: convo.meta.id,
			senderType: 'user',
			senderUserId: auth.user?.id ?? null,
			senderDisplay: { username: auth.user?.username ?? 'user', name: auth.user?.username ?? 'user', role: 'user' },
			content,
			source: 'app',
			createdAt: Date.now()
		};
		pendingIds = new Set(pendingIds).add(tmpId);
		mergeMessages([optimistic]);
		queueMicrotask(scrollToBottom);

		draft = '';
		sendTypingUpdate('');
		try {
			const result = await sendSupportMessage(convo.meta.id, content);
			removeMessageById(tmpId);
			const nextPending = new Set(pendingIds);
			nextPending.delete(tmpId);
			pendingIds = nextPending;
			mergeMessages([result.message]);
			queueMicrotask(scrollToBottom);
			updateMeta(result.meta);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Gagal kirim pesan';
			removeMessageById(tmpId);
			const nextPending = new Set(pendingIds);
			nextPending.delete(tmpId);
			pendingIds = nextPending;
			draft = content;
		} finally {
			sending = false;
		}
	}

	async function handoffToAdmin() {
		if (!convo) return;
		try {
			convo = { ...convo, meta: await requestSupportHandoff(convo.meta.id), messages: convo.messages };
		} catch (e) {
			error = e instanceof Error ? e.message : 'Gagal chat dengan admin';
		}
	}

	onMount(() => {
		void loadInitial();
		return () => {
			stopPolling();
			if (typingTimer) clearTimeout(typingTimer);
			try {
				if (socket && convo?.meta?.id) {
					socket.send(JSON.stringify({ event: 'support:leave', conversationId: convo.meta.id }));
				}
			} catch {
				// ignore
			}
			socket?.close();
			socket = null;
		};
	});
</script>

<SEO title="Support" />

<div class="mx-auto w-full max-w-3xl">
	<div class="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
		<div>
			<h1 class="text-xl font-black text-zinc-100">Weebin Care</h1>
			<p class="text-sm text-zinc-500">Chat bantuan, history rapih per tanggal dan jam.</p>
		</div>
		{#if convo}
			<span class="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[11px] font-black text-zinc-300">
				{statusLabel(convo.meta.status)}
			</span>
		{/if}
	</div>

	{#if error}
		<div class="mb-3 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm font-bold text-red-200">
			{error}
		</div>
	{/if}

	<div class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
		<div class="h-[62vh] overflow-y-auto p-4" bind:this={messageListEl}>
			{#if isLoading}
				<div class="flex h-48 items-center justify-center text-sm font-bold text-zinc-500">Memuat chat...</div>
			{:else if !auth.isLoggedIn}
				<div class="flex h-48 items-center justify-center text-sm font-bold text-zinc-500">
					Kamu harus login untuk chat CS.
				</div>
			{:else if convo && convo.messages.length === 0}
				<div class="flex h-48 items-center justify-center text-sm font-bold text-zinc-500">
					Tulis keluhannya di bawah ya.
				</div>
			{:else if convo}
				{#each convo.messages as message, idx (message.id)}
					{#if idx === 0 || !sameDay(convo.messages[idx - 1].createdAt, message.createdAt)}
						<div class="my-3 flex items-center justify-center">
							<span class="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[10px] font-black text-zinc-400">
								{formatDay(message.createdAt)}
							</span>
						</div>
					{/if}
					<div class="mb-3 flex {message.senderType === 'user' ? 'justify-end' : 'justify-start'}">
						<div class="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6
							{message.senderType === 'user'
								? 'bg-violet-600 text-white'
								: 'bg-zinc-900 text-zinc-100 border border-zinc-800'}
							{pendingIds.has(message.id) ? ' opacity-70' : ''}">
							<p class="whitespace-pre-wrap break-words">{message.content}</p>
							{#if (message.actions ?? []).some((a) => a.type === 'handoff')}
								<button
									type="button"
									onclick={handoffToAdmin}
									disabled={convo?.meta.status === 'needs_human' || convo?.meta.status === 'human_active'}
									class="mt-3 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-[11px] font-black text-zinc-200 hover:border-violet-500/50 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
								>
									<AppIcon name="support_agent" class="text-[16px]" />
									Chat dengan admin
								</button>
							{/if}
							<p class="mt-2 text-right text-[10px] font-black opacity-70">
								{formatTime(message.createdAt)}
							</p>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<div class="border-t border-zinc-800 p-3">
			<form
				class="flex items-center gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					void submit();
				}}
			>
				<input
					bind:value={draft}
					placeholder="Tulis pesan..."
					disabled={!convo || sending}
					oninput={() => {
						if (typingTimer) clearTimeout(typingTimer);
						typingTimer = setTimeout(() => sendTypingUpdate(draft), 220);
					}}
					onblur={() => sendTypingUpdate('')}
					class="h-11 min-w-0 flex-1 rounded-full border border-zinc-800 bg-zinc-900 px-4 text-sm font-bold text-zinc-100 outline-none focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
				/>
				<button
					type="submit"
					disabled={!convo || sending || !draft.trim()}
					class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-500/20 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
					aria-label="Kirim"
				>
					<AppIcon name={sending ? 'hourglass_top' : 'send'} class="text-[18px]" />
				</button>
			</form>
		</div>
	</div>
</div>
