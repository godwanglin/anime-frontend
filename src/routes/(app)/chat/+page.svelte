<script lang="ts">
	import { onMount, tick } from 'svelte';
	import AvatarFrame from '$lib/components/AvatarFrame.svelte';
	import NameTag from '$lib/components/NameTag.svelte';
	import OptimizedImage from '$lib/components/OptimizedImage.svelte';
	import ProfileCard from '$lib/components/ProfileCard.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { getCultivationBadge } from '$lib/exp';
	import {
		fetchChatPublicUser,
		fetchChatMessages,
		fetchHistoryChatContexts,
		fetchSavedChatContexts,
		messageMentionsUser,
		openChatSocket,
		pollChatMessages,
		searchChatContexts,
		searchChatMentionUsers,
		type ChatApiMessage,
		type ChatAllowedLink,
		type ChatContextItem,
		type ChatContextType,
		type ChatMentionUser,
		type ChatMessagesResponse,
		type ChatReplyPreview,
		type ChatSocketEvent
	} from '$lib/chat';
	import type { PublicUser } from '$lib/stores/auth.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { chatPresence } from '$lib/stores/chat-presence.svelte';
	import { pageTitle } from '$lib/stores/page.svelte';
	import { displayUserName, userHandle, userInitial } from '$lib/user-display';

	type ChatUser = Pick<
		PublicUser,
		| 'id'
		| 'username'
		| 'fullName'
		| 'avatar'
		| 'frame'
		| 'nametag'
		| 'isVerified'
		| 'role'
		| 'level'
	> &
		Partial<PublicUser>;
	type ChatMessage = {
		id: string;
		user: ChatUser;
		body: string;
		contexts: ChatContextItem[];
		links: ChatAllowedLink[];
		replyTo: ChatReplyPreview | null;
		editedAt: number | null;
		deletedAt: number | null;
		deletedByRole: string | null;
		time: string;
		createdAt: number;
		isMine?: boolean;
	};
	type MessageMenuState = {
		open: boolean;
		x: number;
		y: number;
		message: ChatMessage | null;
	};
	type ContextSource = 'saved' | 'history' | 'search';

	let messages = $state<ChatMessage[]>([]);
	let draft = $state('');
	let contextSheetOpen = $state(false);
	let contextSource = $state<ContextSource>('saved');
	let contextQuery = $state('');
	let contextFilter = $state<ChatContextType | 'all'>('all');
	let contextResults = $state<ChatContextItem[]>([]);
	let savedContextResults = $state<ChatContextItem[]>([]);
	let historyContextResults = $state<ChatContextItem[]>([]);
	let selectedContexts = $state<ChatContextItem[]>([]);
	let replyTarget = $state<ChatMessage | null>(null);
	let editTarget = $state<ChatMessage | null>(null);
	let deleteTarget = $state<ChatMessage | null>(null);
	let highlightedMessageId = $state<string | null>(null);
	let replyJumpToast = $state('');
	let mentionJumpQueue = $state<string[]>([]);
	let messageMenu = $state<MessageMenuState>({ open: false, x: 0, y: 0, message: null });
	let contextLoading = $state(false);
	let contextError = $state('');
	let savedContextsLoaded = $state(false);
	let historyContextsLoaded = $state(false);
	let isLoading = $state(true);
	let chatNotice = $state('');
	let socketState = $state<'idle' | 'connecting' | 'open' | 'closed' | 'error'>('idle');
	let typingUsers = $state<{ id: string; name: string }[]>([]);
	let mentionKeyword = $state('');
	let mentionSuggestions = $state<ChatMentionUser[]>([]);
	let mentionLoading = $state(false);
	let mentionActiveIndex = $state(0);
	let messageListEl: HTMLDivElement | null = null;
	let composerInputEl = $state<HTMLInputElement | null>(null);
	let socket: WebSocket | null = null;
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let typingTimer: ReturnType<typeof setTimeout> | null = null;
	let contextSearchTimer: ReturnType<typeof setTimeout> | null = null;
	let mentionSearchTimer: ReturnType<typeof setTimeout> | null = null;
	let slowmodeTimer: ReturnType<typeof setInterval> | null = null;
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let highlightTimer: ReturnType<typeof setTimeout> | null = null;
	let replyJumpToastTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingPresenceMentionIds: string[] = [];
	let pointerStart:
		| { id: number; x: number; y: number; message: ChatMessage; moved: boolean }
		| null = null;
	let slowmodeEnabled = $state(false);
	let slowmodeSeconds = $state(0);
	let slowmodeRemaining = $state(0);
	let currentClickedUser = $state<PublicUser | null>(null);
	let showUserCard = $state(false);
	let showChatOnboarding = $state(false);
	let profileCardAnchor = $state<HTMLButtonElement | null>(null);
	const publicUserCache = new Map<number, PublicUser>();
	const typingUserTimers = new Map<string, ReturnType<typeof setTimeout>>();
	const CHAT_ONBOARDING_STORAGE_KEY = 'weebin:chat:onboarding:v1';
	const chatOnboardingItems = [
		{
			icon: 'add_link',
			title: 'Bagikan anime & episode',
			description: 'Tekan tombol plus untuk kirim kartu anime atau episode dari riwayat, tersimpan, atau pencarian.'
		},
		{
			icon: 'reply',
			title: 'Reply cepat',
			description: 'Swipe bubble ke kanan di mobile, atau klik kanan di desktop untuk reply pesan.'
		},
		{
			icon: 'alternate_email',
			title: 'Mention user',
			description: 'Ketik @ lalu minimal 2 huruf. Mention bisa diklik untuk buka profile card.'
		},
		{
			icon: 'manage_accounts',
			title: 'Aksi pesan',
			description: 'Pesan sendiri bisa diedit atau dihapus. Admin bisa moderasi pesan dari client.'
		},
		{
			icon: 'timer',
			title: 'Realtime & slowmode',
			description: 'Status koneksi ada di composer, dan tombol kirim otomatis jadi timer saat slowmode aktif.'
		}
	];
	let reconnectAttempt = 0;
	let allowReconnect = true;
	let hasRealtimeSession = false;
	const chatSkeletonRows = [
		{ mine: false, width: '76%', lines: ['64%', '88%'] },
		{ mine: false, width: '58%', lines: ['52%'] },
		{ mine: true, width: '42%', lines: ['72%'] },
		{ mine: false, width: '68%', lines: ['58%', '82%'] },
		{ mine: true, width: '50%', lines: ['64%'] },
		{ mine: false, width: '46%', lines: ['74%'] },
		{ mine: true, width: '36%', lines: ['58%'] }
	];

	const canSend = $derived(
		Boolean(
			auth.isLoggedIn &&
				(editTarget
					? draft.trim() && !editTarget.deletedAt
					: !slowmodeRemaining && (draft.trim() || selectedContexts.length > 0))
		)
	);
	const showSlowmodeButton = $derived(slowmodeRemaining > 0 && !editTarget);
	const isElevatedUser = $derived(auth.user?.role === 'admin' || auth.user?.role === 'moderator');
	const knownMentionNames = $derived.by(() => {
		const names = new Set<string>();
		if (auth.user) {
			names.add(displayUserName(auth.user));
			if (auth.user.username) names.add(auth.user.username);
		}
		for (const message of messages) {
			const displayName = displayUserName(message.user, '');
			if (displayName) names.add(displayName);
			if (message.user.username) names.add(message.user.username);
			if (message.replyTo?.senderName) names.add(message.replyTo.senderName);
			if (message.replyTo?.senderUsername) names.add(message.replyTo.senderUsername);
			if (message.replyTo?.senderFullName) names.add(message.replyTo.senderFullName);
		}
		return Array.from(names).sort((a, b) => b.length - a.length);
	});
	const knownMentionUsers = $derived.by(() => {
		const users = new Map<string, ChatUser>();
		if (auth.user) {
			users.set(displayUserName(auth.user).toLocaleLowerCase(), auth.user);
			if (auth.user.username) users.set(auth.user.username.toLocaleLowerCase(), auth.user);
		}
		for (const message of messages) {
			const displayName = displayUserName(message.user, '');
			if (displayName) users.set(displayName.toLocaleLowerCase(), message.user);
			if (message.user.username) users.set(message.user.username.toLocaleLowerCase(), message.user);
		}
		return users;
	});

	$effect(() => {
		contextFilter;
		contextQuery;
		if (contextSheetOpen && contextSource === 'search') queueContextSearch();
	});

	$effect(() => {
		contextSource;
		if (contextSheetOpen) void loadContextSource();
	});

	function formatTime(timestamp: number) {
		return new Intl.DateTimeFormat('id-ID', {
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(timestamp));
	}

	function toChatMessage(message: ChatApiMessage): ChatMessage {
		const senderId = Number(message.senderId);
		const currentUserId = auth.user?.id;
		const sender = message.sender;

		return {
			id: message.id,
			user: {
				id: Number.isFinite(senderId) ? senderId : 0,
				username: sender?.username ?? message.senderUsername ?? message.senderName,
				fullName: sender?.fullName ?? message.senderFullName ?? sender?.name ?? message.senderName,
				avatar: sender?.avatar ?? message.senderAvatar,
				frame: sender?.frame ?? message.senderFrame,
				nametag: sender?.nageTag ?? message.senderNageTag,
				isVerified: Boolean(sender?.isVerified),
				role: sender?.role ?? undefined,
				level: Math.max(1, Number(sender?.level ?? message.senderLevel ?? 1))
			},
			body: message.content,
			contexts: message.contexts?.length
				? message.contexts
				: message.context
					? [message.context]
					: [],
			links: message.links ?? [],
			replyTo: message.replyTo ?? null,
			editedAt: message.editedAt ?? null,
			deletedAt: message.deletedAt ?? null,
			deletedByRole: message.deletedByRole ?? null,
			time: formatTime(message.createdAt),
			createdAt: message.createdAt,
			isMine: Boolean(currentUserId && String(currentUserId) === message.senderId)
		};
	}

	function deletedMessageText(message: ChatMessage) {
		return message.deletedByRole === 'admin' || message.deletedByRole === 'moderator'
			? 'Pesan telah dihapus oleh admin'
			: 'Pesan telah dihapus';
	}

	function dismissChatOnboarding() {
		showChatOnboarding = false;
		try {
			localStorage.setItem(CHAT_ONBOARDING_STORAGE_KEY, 'done');
		} catch {
			// Local storage may be blocked; closing for this session is enough.
		}
	}

	function userLevelMeta(user: ChatUser) {
		const level = Math.max(1, Number(user.level ?? 1));
		return {
			level,
			badge: getCultivationBadge(level)
		};
	}

	function replyPreviewText(reply: ChatReplyPreview | ChatMessage | null) {
		if (!reply) return '';
		if ('deletedAt' in reply && reply.deletedAt) {
			return 'deletedByRole' in reply ? deletedMessageText(reply) : 'Pesan telah dihapus';
		}
		if ('body' in reply) return reply.body || reply.contexts[0]?.title || reply.links[0]?.path || 'Pesan';
		return reply.content || 'Pesan';
	}

	function isMentionBoundary(value: string | undefined) {
		return !value || !/[\p{L}\p{N}_]/u.test(value);
	}

	function messageTextSegments(body: string) {
		const segments: { text: string; mention?: boolean; link?: string; user?: ChatUser | null }[] = [];
		let index = 0;

		while (index < body.length) {
			const remaining = body.slice(index);
			const nextMention = body.indexOf('@', index);
			const linkMatch = remaining.match(/\b(?:https?:\/\/|www\.)[^\s<>"']+/i);
			const nextLink = linkMatch?.index !== undefined ? index + linkMatch.index : -1;
			const candidates = [nextMention, nextLink].filter((value) => value >= 0);
			const nextSpecial = candidates.length ? Math.min(...candidates) : -1;

			if (nextSpecial === -1) {
				segments.push({ text: body.slice(index) });
				break;
			}

			if (nextSpecial > index) segments.push({ text: body.slice(index, nextSpecial) });

			if (nextSpecial === nextLink && linkMatch) {
				const rawUrl = linkMatch[0].replace(/[),.!?]+$/g, '');
				segments.push({
					text: rawUrl,
					link: /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
				});
				index = nextLink + rawUrl.length;
				continue;
			}

			const atIndex = nextSpecial;
			const before = atIndex > 0 ? body[atIndex - 1] : '';
			if (!isMentionBoundary(before)) {
				segments.push({ text: '@' });
				index = atIndex + 1;
				continue;
			}

			const afterAt = body.slice(atIndex + 1);
			const knownMatch = knownMentionNames.find((name) => {
				if (!afterAt.toLocaleLowerCase().startsWith(name.toLocaleLowerCase())) return false;
				return isMentionBoundary(afterAt[name.length]);
			});

			if (knownMatch) {
				segments.push({
					text: knownMatch,
					mention: true,
					user: knownMentionUsers.get(knownMatch.toLocaleLowerCase()) ?? null
				});
				index = atIndex + knownMatch.length + 1;
				continue;
			}

			const fallbackMatch = afterAt.match(/^[\p{L}\p{N}_]+/u)?.[0];
			if (fallbackMatch) {
				segments.push({
					text: fallbackMatch,
					mention: true,
					user: knownMentionUsers.get(fallbackMatch.toLocaleLowerCase()) ?? null
				});
				index = atIndex + fallbackMatch.length + 1;
				continue;
			}

			segments.push({ text: '@' });
			index = atIndex + 1;
		}

		return segments;
	}

	async function openMentionProfile(
		username: string,
		anchorEl: HTMLButtonElement,
		knownUser?: ChatUser | null
	) {
		if (knownUser?.id) {
			await openProfileCard(knownUser, anchorEl);
			return;
		}

		const users = await searchChatMentionUsers(username, 6).catch(() => []);
		const normalized = username.toLocaleLowerCase();
		const found = users.find(
			(user) =>
				user.username.toLocaleLowerCase() === normalized ||
				displayUserName(user).toLocaleLowerCase() === normalized
		);
		if (!found) {
			showReplyJumpToast('User mention tidak ditemukan.');
			return;
		}
		await openProfileCard(found as ChatUser, anchorEl);
	}

	async function scrollToLatest() {
		await tick();
		messageListEl?.scrollTo({ top: messageListEl.scrollHeight });
	}

	function mergeMessages(nextMessages: ChatMessage[]) {
		const merged = new Map(messages.map((message) => [message.id, message]));
		for (const message of nextMessages) merged.set(message.id, message);
		messages = Array.from(merged.values()).sort((a, b) => a.createdAt - b.createdAt);
		void scrollToLatest();
	}

	function setTypingUser(userId: string, name: string, typing: boolean) {
		const currentUserId = auth.user?.id ? String(auth.user.id) : '';
		if (!userId || userId === currentUserId) return;

		const existingTimer = typingUserTimers.get(userId);
		if (existingTimer) clearTimeout(existingTimer);
		typingUserTimers.delete(userId);

		if (!typing) {
			typingUsers = typingUsers.filter((user) => user.id !== userId);
			return;
		}

		const cleanName = name.trim() || 'User';
		const withoutUser = typingUsers.filter((user) => user.id !== userId);
		typingUsers = [...withoutUser, { id: userId, name: cleanName }];
		typingUserTimers.set(
			userId,
			setTimeout(() => {
				typingUserTimers.delete(userId);
				typingUsers = typingUsers.filter((user) => user.id !== userId);
			}, 5500)
		);
	}

	function clearTypingUsers() {
		for (const timer of typingUserTimers.values()) clearTimeout(timer);
		typingUserTimers.clear();
		typingUsers = [];
	}

	function closeMessageMenu() {
		messageMenu = { open: false, x: 0, y: 0, message: null };
	}

	function openMessageMenu(event: MouseEvent | PointerEvent, message: ChatMessage) {
		event.preventDefault();
		openMessageMenuAt(event.clientX, event.clientY, message);
	}

	function openMessageMenuAt(clientX: number, clientY: number, message: ChatMessage) {
		const viewportPadding = 12;
		const menuWidth = 176;
		const menuHeight = 142;
		messageMenu = {
			open: true,
			x: Math.min(window.innerWidth - menuWidth - viewportPadding, Math.max(viewportPadding, clientX)),
			y: Math.min(window.innerHeight - menuHeight - viewportPadding, Math.max(viewportPadding, clientY)),
			message
		};
	}

	function startReply(message: ChatMessage | null) {
		if (!message || message.deletedAt) return;
		replyTarget = message;
		editTarget = null;
		closeMessageMenu();
	}

	function canDeleteMessage(message: ChatMessage | null) {
		return Boolean(message && !message.deletedAt && auth.isLoggedIn && (message.isMine || isElevatedUser));
	}

	function canEditMessage(message: ChatMessage | null) {
		return Boolean(message && !message.deletedAt && auth.isLoggedIn && message.isMine);
	}

	function startEdit(message: ChatMessage | null) {
		if (!canEditMessage(message) || !message) return;
		editTarget = message;
		replyTarget = null;
		selectedContexts = [];
		draft = message.body;
		closeMessageMenu();
	}

	function cancelEdit() {
		editTarget = null;
		draft = '';
	}

	function askDeleteMessage(message: ChatMessage | null) {
		if (!canDeleteMessage(message) || !message) return;
		deleteTarget = message;
		closeMessageMenu();
	}

	function confirmDeleteMessage() {
		if (!deleteTarget) return;
		if (socket?.readyState !== WebSocket.OPEN) {
			chatNotice = 'Koneksi realtime belum siap. Tunggu sebentar.';
			startPollingFallback();
			return;
		}
		socket.send(
			JSON.stringify({
				event: 'chat:message:delete',
				messageId: deleteTarget.id
			})
		);
		if (replyTarget?.id === deleteTarget.id) replyTarget = null;
		if (editTarget?.id === deleteTarget.id) cancelEdit();
		deleteTarget = null;
	}

	function clearLongPress() {
		if (!longPressTimer) return;
		clearTimeout(longPressTimer);
		longPressTimer = null;
	}

	function showReplyJumpToast(message = 'Pesan yang direply sudah tidak ada di riwayat chat.') {
		if (replyJumpToastTimer) clearTimeout(replyJumpToastTimer);
		replyJumpToast = message;
		replyJumpToastTimer = setTimeout(() => {
			replyJumpToast = '';
			replyJumpToastTimer = null;
		}, 2200);
	}

	function highlightMessage(messageId: string) {
		if (highlightTimer) clearTimeout(highlightTimer);
		highlightedMessageId = messageId;
		highlightTimer = setTimeout(() => {
			highlightedMessageId = null;
			highlightTimer = null;
		}, 1000);
	}

	async function scrollToMessage(messageId: string) {
		await tick();
		const targetEl = messageListEl?.querySelector<HTMLElement>(
			`[data-message-id="${messageId.replace(/"/g, '\\"')}"]`
		);
		if (!targetEl) return false;
		targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
		highlightMessage(messageId);
		return true;
	}

	async function jumpToReplyTarget(message: ChatMessage) {
		const replyId = message.replyTo?.id;
		if (!replyId) return;
		const targetExists = messages.some((item) => item.id === replyId);
		if (!targetExists) {
			showReplyJumpToast();
			return;
		}

		const didScroll = await scrollToMessage(replyId);
		if (!didScroll) {
			showReplyJumpToast();
			return;
		}
	}

	function handleBubbleClick(event: MouseEvent, message: ChatMessage) {
		if (!message.replyTo) return;
		const target = event.target as HTMLElement | null;
		if (target?.closest('a, button')) return;
		void jumpToReplyTarget(message);
	}

	function queueMentionJump(message: ChatMessage) {
		if (!auth.user || message.isMine || message.deletedAt) return;
		const isReplyToMe = message.replyTo?.senderId === String(auth.user.id);
		if (
			!isReplyToMe &&
			!messageMentionsUser(message.body, displayUserName(auth.user)) &&
			!messageMentionsUser(message.body, auth.user.username)
		)
			return;
		mentionJumpQueue = [message.id, ...mentionJumpQueue.filter((id) => id !== message.id)].slice(0, 20);
	}

	function queuePresenceMentions(loadedMessages: ChatMessage[]) {
		if (!pendingPresenceMentionIds.length) return;
		const loadedIds = new Set(loadedMessages.map((message) => message.id));
		mentionJumpQueue = [
			...pendingPresenceMentionIds.filter((id) => loadedIds.has(id)),
			...mentionJumpQueue
		].filter((id, index, ids) => ids.indexOf(id) === index);
		pendingPresenceMentionIds = [];
	}

	async function jumpToNextMention() {
		const [targetId, ...rest] = mentionJumpQueue;
		if (!targetId) return;
		mentionJumpQueue = rest;
		const didScroll = await scrollToMessage(targetId);
		if (!didScroll) showReplyJumpToast('Pesan mention sudah tidak ada di riwayat chat.');
	}

	function handleBubblePointerDown(event: PointerEvent, message: ChatMessage) {
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		pointerStart = {
			id: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			message,
			moved: false
		};
		clearLongPress();
		longPressTimer = setTimeout(() => {
			openMessageMenu(event, message);
			pointerStart = null;
		}, 500);
	}

	function handleBubblePointerMove(event: PointerEvent) {
		if (!pointerStart || pointerStart.id !== event.pointerId) return;
		const dx = event.clientX - pointerStart.x;
		const dy = event.clientY - pointerStart.y;
		if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
			pointerStart.moved = true;
			clearLongPress();
		}
	}

	function handleBubblePointerUp(event: PointerEvent) {
		if (!pointerStart || pointerStart.id !== event.pointerId) {
			clearLongPress();
			return;
		}
		const dx = event.clientX - pointerStart.x;
		const dy = event.clientY - pointerStart.y;
		const isReplySwipe = dx > 56 && Math.abs(dy) < 42;
		const target = pointerStart.message;
		pointerStart = null;
		clearLongPress();
		if (isReplySwipe) startReply(target);
	}

	function typingLabel() {
		if (typingUsers.length === 0) return '';
		if (typingUsers.length === 1) return `${typingUsers[0].name} sedang mengetik`;
		if (typingUsers.length === 2)
			return `${typingUsers[0].name}, ${typingUsers[1].name} sedang mengetik`;
		return `${typingUsers[0].name} dan ${typingUsers.length - 1} lainnya sedang mengetik`;
	}

	function stopSlowmodeTimer() {
		if (!slowmodeTimer) return;
		clearInterval(slowmodeTimer);
		slowmodeTimer = null;
	}

	function setSlowmodeCountdown(seconds: number) {
		const next = Math.max(0, Math.ceil(seconds));
		slowmodeRemaining = next;
		stopSlowmodeTimer();
		if (next <= 0) return;
		slowmodeTimer = setInterval(() => {
			slowmodeRemaining = Math.max(0, slowmodeRemaining - 1);
			if (slowmodeRemaining <= 0) stopSlowmodeTimer();
		}, 1000);
	}

	function applySlowmode(response: Pick<ChatMessagesResponse, 'slowmode'>) {
		const slowmode = response.slowmode;
		slowmodeEnabled = Boolean(slowmode?.enabled);
		slowmodeSeconds = Math.max(0, Number(slowmode?.seconds ?? 0));
		if (!slowmodeEnabled) {
			setSlowmodeCountdown(0);
			return;
		}
		setSlowmodeCountdown(Number(slowmode?.remainingSeconds ?? 0));
	}

	async function loadInitialMessages() {
		isLoading = true;
		chatNotice = '';
		try {
			if (auth.user && !auth.accessToken) await auth.refreshToken();
			const response = await fetchChatMessages();
			applySlowmode(response);
			messages = response.messages.map(toChatMessage);
			queuePresenceMentions(messages);
			void scrollToLatest();
		} catch (error) {
			chatNotice =
				error instanceof Error ? error.message : 'Chat belum bisa dimuat. Coba lagi beberapa saat.';
		} finally {
			isLoading = false;
		}
	}

	function stopPolling() {
		if (!pollTimer) return;
		clearInterval(pollTimer);
		pollTimer = null;
	}

	function clearReconnectTimer() {
		if (!reconnectTimer) return;
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}

	function scheduleReconnect() {
		if (!allowReconnect || !hasRealtimeSession || reconnectTimer) return;
		const delay = Math.min(1000 * 2 ** reconnectAttempt, 10_000);
		reconnectAttempt += 1;
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			void connectSocket();
		}, delay);
	}

	function startPollingFallback() {
		if (pollTimer) return;
		pollTimer = setInterval(async () => {
			const after = messages.at(-1)?.createdAt ?? 0;
			try {
				const response = await pollChatMessages(after);
				applySlowmode(response);
				mergeMessages(response.messages.map(toChatMessage));
			} catch {
				// Fallback polling should stay quiet; composer notice handles active send errors.
			}
		}, 12_000);
	}

	async function connectSocket() {
		if (!auth.accessToken) await auth.refreshToken();
		if (auth.accessToken && !auth.user) await auth.fetchMe().catch(() => null);

		if (!auth.accessToken) {
			hasRealtimeSession = false;
			socketState = 'closed';
			startPollingFallback();
			return;
		}

		hasRealtimeSession = true;
		clearReconnectTimer();
		socket?.close();
		socketState = 'connecting';
		socket = await openChatSocket();
		if (!socket) {
			socketState = 'closed';
			startPollingFallback();
			scheduleReconnect();
			return;
		}
		const activeSocket = socket;

		socket.addEventListener('open', () => {
			if (socket !== activeSocket) return;
			socketState = 'open';
			reconnectAttempt = 0;
			chatNotice = '';
			stopPolling();
		});

		socket.addEventListener('message', (event) => {
			if (socket !== activeSocket) return;
			let payload: ChatSocketEvent;
			try {
				payload = JSON.parse(event.data) as ChatSocketEvent;
			} catch {
				return;
			}
			if (payload.event === 'chat:message:new') {
				const incomingMessage = toChatMessage(payload.message);
				if (
					slowmodeEnabled &&
					slowmodeSeconds > 0 &&
					auth.user?.id &&
					payload.message.senderId === String(auth.user.id)
				) {
					setSlowmodeCountdown(slowmodeSeconds);
				}
				mergeMessages([incomingMessage]);
				queueMentionJump(incomingMessage);
				return;
			}
			if (payload.event === 'chat:message:update') {
				const updated = toChatMessage(payload.message);
				mergeMessages([updated]);
				if (replyTarget?.id === updated.id && updated.deletedAt) replyTarget = null;
				if (editTarget?.id === updated.id) editTarget = null;
				return;
			}
			if (payload.event === 'chat:typing:update') {
				setTypingUser(payload.userId, payload.username, payload.typing);
				return;
			}
			if (payload.event === 'chat:slowmode:error') {
				slowmodeEnabled = true;
				slowmodeSeconds = Math.max(slowmodeSeconds, payload.remainingSeconds);
				setSlowmodeCountdown(payload.remainingSeconds);
				chatNotice = '';
				return;
			}
			if (payload.event === 'chat:message:error') {
				chatNotice = payload.message;
			}
		});

		socket.addEventListener('close', () => {
			if (socket !== activeSocket) return;
			socketState = 'closed';
			startPollingFallback();
			scheduleReconnect();
		});

		socket.addEventListener('error', () => {
			if (socket !== activeSocket) return;
			socketState = 'error';
			startPollingFallback();
			scheduleReconnect();
		});
	}

	function sendTypingStart() {
		if (socket?.readyState !== WebSocket.OPEN) return;
		socket.send(JSON.stringify({ event: 'chat:typing:start' }));
		if (typingTimer) clearTimeout(typingTimer);
		typingTimer = setTimeout(() => {
			socket?.send(JSON.stringify({ event: 'chat:typing:stop' }));
		}, 1800);
	}

	function contextTypeLabel(type: ChatContextType) {
		return type === 'episode' ? 'Episode' : 'Anime';
	}

	function contextSubtitle(context: ChatContextItem) {
		if (context.type === 'episode' && context.animeTitle) return context.animeTitle;
		return context.description ?? 'weebin.site';
	}

	async function openProfileCard(user: ChatUser, anchorEl: HTMLButtonElement) {
		profileCardAnchor = anchorEl;
		currentClickedUser = user as PublicUser;
		showUserCard = true;

		if (!user.id) return;
		const cached = publicUserCache.get(user.id);
		if (cached) {
			currentClickedUser = cached;
			return;
		}

		try {
			const fullUser = await fetchChatPublicUser(user.id);
			publicUserCache.set(user.id, fullUser);
			if (showUserCard && currentClickedUser?.id === user.id) {
				currentClickedUser = fullUser;
			}
		} catch {
			// Snapshot chat tetap cukup untuk fallback ProfileCard.
		}
	}

	function contextImageSizes(surface: 'bubble' | 'selected' | 'sheet') {
		if (surface === 'selected') return '48px';
		if (surface === 'bubble') return '62px';
		return '82px';
	}

	function openContextSheet() {
		contextSheetOpen = true;
		void loadContextSource();
	}

	function closeContextSheet() {
		contextSheetOpen = false;
	}

	function contextSourceTitle() {
		if (contextSource === 'saved') return 'Anime tersimpan';
		if (contextSource === 'history') return 'Riwayat tontonan';
		return 'Cari database';
	}

	function contextSourceItems() {
		if (contextSource === 'saved') return savedContextResults;
		if (contextSource === 'history') return historyContextResults;
		return contextResults;
	}

	function contextEmptyCopy() {
		if (contextSource === 'saved') {
			return {
				icon: 'bookmark',
				title: 'Belum ada anime tersimpan',
				desc: 'Anime yang kamu simpan akan muncul di sini.'
			};
		}
		if (contextSource === 'history') {
			return {
				icon: 'history',
				title: 'Riwayat tontonan kosong',
				desc: 'Episode yang kamu tonton akan muncul di sini.'
			};
		}
		return {
			icon: 'add_link',
			title: 'Cari anime atau episode',
			desc: 'Context yang dipilih bisa dikirim tanpa teks.'
		};
	}

	async function loadContextSource() {
		if (contextSource === 'search') {
			queueContextSearch();
			return;
		}

		if (contextSource === 'saved' && savedContextsLoaded) return;
		if (contextSource === 'history' && historyContextsLoaded) return;

		contextLoading = true;
		contextError = '';
		try {
			if (contextSource === 'saved') {
				savedContextResults = await fetchSavedChatContexts(30);
				savedContextsLoaded = true;
			} else {
				historyContextResults = await fetchHistoryChatContexts(30);
				historyContextsLoaded = true;
			}
		} catch (error) {
			contextError = error instanceof Error ? error.message : 'Gagal memuat data context user.';
		} finally {
			contextLoading = false;
		}
	}

	async function runContextSearch() {
		if (contextSource !== 'search') return;
		const q = contextQuery.trim();
		contextError = '';
		if (!q) {
			contextResults = [];
			contextLoading = false;
			return;
		}
		contextLoading = true;
		try {
			contextResults = await searchChatContexts(q, contextFilter, 16);
		} catch (error) {
			contextError = error instanceof Error ? error.message : 'Gagal mencari anime atau episode.';
			contextResults = [];
		} finally {
			contextLoading = false;
		}
	}

	function queueContextSearch() {
		if (contextSearchTimer) clearTimeout(contextSearchTimer);
		contextSearchTimer = setTimeout(() => {
			void runContextSearch();
		}, 300);
	}

	function selectContext(item: ChatContextItem) {
		if (selectedContexts.some((context) => context.type === item.type && context.id === item.id)) {
			closeContextSheet();
			return;
		}
		selectedContexts = [...selectedContexts, item].slice(0, 5);
		closeContextSheet();
	}

	function removeContext(item: ChatContextItem) {
		selectedContexts = selectedContexts.filter(
			(context) => !(context.type === item.type && context.id === item.id)
		);
	}

	function sendPayloadContexts() {
		return selectedContexts.map((context) => ({
			type: context.type,
			id: context.id
		}));
	}

	function currentMentionToken() {
		const cursor = composerInputEl?.selectionStart ?? draft.length;
		const beforeCursor = draft.slice(0, cursor);
		const match = beforeCursor.match(/(^|\s)@([\p{L}\p{N}_]{0,32})$/u);
		if (!match) return null;
		return {
			start: cursor - (match[2].length + 1),
			end: cursor,
			keyword: match[2]
		};
	}

	function closeMentionSuggestions() {
		mentionKeyword = '';
		mentionSuggestions = [];
		mentionLoading = false;
		mentionActiveIndex = 0;
		if (mentionSearchTimer) clearTimeout(mentionSearchTimer);
		mentionSearchTimer = null;
	}

	function queueMentionSearch() {
		const token = currentMentionToken();
		const keyword = token?.keyword ?? '';
		mentionKeyword = keyword;
		mentionActiveIndex = 0;

		if (!token || keyword.length < 2) {
			closeMentionSuggestions();
			return;
		}

		if (mentionSearchTimer) clearTimeout(mentionSearchTimer);
		mentionLoading = true;
		mentionSearchTimer = setTimeout(async () => {
			try {
				const users = await searchChatMentionUsers(keyword, 8);
				if (mentionKeyword !== keyword) return;
				mentionSuggestions = users.filter((user) => user.id !== auth.user?.id);
			} catch {
				if (mentionKeyword === keyword) mentionSuggestions = [];
			} finally {
				if (mentionKeyword === keyword) mentionLoading = false;
			}
		}, 180);
	}

	async function insertMention(user: ChatMentionUser) {
		const token = currentMentionToken();
		if (!token) return;
		const mentionName = displayUserName(user);
		draft = `${draft.slice(0, token.start)}@${mentionName} ${draft.slice(token.end)}`;
		const nextCursor = token.start + mentionName.length + 2;
		closeMentionSuggestions();
		await tick();
		composerInputEl?.focus();
		composerInputEl?.setSelectionRange(nextCursor, nextCursor);
	}

	function handleComposerInput() {
		sendTypingStart();
		queueMentionSearch();
	}

	function handleComposerKeydown(event: KeyboardEvent) {
		if (!mentionSuggestions.length) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			mentionActiveIndex = (mentionActiveIndex + 1) % mentionSuggestions.length;
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			mentionActiveIndex =
				(mentionActiveIndex - 1 + mentionSuggestions.length) % mentionSuggestions.length;
			return;
		}
		if (event.key === 'Enter' || event.key === 'Tab') {
			event.preventDefault();
			void insertMention(mentionSuggestions[mentionActiveIndex] ?? mentionSuggestions[0]);
			return;
		}
		if (event.key === 'Escape') closeMentionSuggestions();
	}

	function sendMessage() {
		const content = draft.trim();
		const contexts = sendPayloadContexts();
		if (!auth.isLoggedIn) return;
		if (editTarget) {
			if (!content || editTarget.deletedAt) return;
			if (socket?.readyState !== WebSocket.OPEN) {
				chatNotice = 'Koneksi realtime belum siap. Tunggu sebentar.';
				startPollingFallback();
				return;
			}
			if (typingTimer) clearTimeout(typingTimer);
			socket.send(JSON.stringify({ event: 'chat:typing:stop' }));
			socket.send(
				JSON.stringify({
					event: 'chat:message:edit',
					messageId: editTarget.id,
					content
				})
			);
			cancelEdit();
			return;
		}
		if ((!content && contexts.length === 0) || slowmodeRemaining > 0) return;
		if (socket?.readyState !== WebSocket.OPEN) {
			chatNotice = 'Koneksi realtime belum siap. Tunggu sebentar.';
			startPollingFallback();
			return;
		}
		if (typingTimer) clearTimeout(typingTimer);
		socket.send(JSON.stringify({ event: 'chat:typing:stop' }));
		socket.send(
			JSON.stringify({
				event: 'chat:message:send',
				content,
				contexts,
				replyToId: replyTarget?.id
			})
		);
		if (slowmodeEnabled && slowmodeSeconds > 0) {
			setSlowmodeCountdown(slowmodeSeconds);
		}
		draft = '';
		closeMentionSuggestions();
		replyTarget = null;
		selectedContexts = [];
	}

	onMount(() => {
		pageTitle.value = 'Chat';
		try {
			showChatOnboarding = localStorage.getItem(CHAT_ONBOARDING_STORAGE_KEY) !== 'done';
		} catch {
			showChatOnboarding = false;
		}
		pendingPresenceMentionIds = chatPresence.consumeMentionIds();
		chatPresence.markSeen();
		chatPresence.disconnect();
		const closeMenuOnWindowClick = () => closeMessageMenu();
		window.addEventListener('click', closeMenuOnWindowClick);
		void loadInitialMessages();
		void connectSocket();

		return () => {
			allowReconnect = false;
			window.removeEventListener('click', closeMenuOnWindowClick);
			pageTitle.value = '';
			socket?.close();
			stopPolling();
			clearReconnectTimer();
			clearTypingUsers();
			if (typingTimer) clearTimeout(typingTimer);
			clearLongPress();
			stopSlowmodeTimer();
			if (highlightTimer) clearTimeout(highlightTimer);
			if (replyJumpToastTimer) clearTimeout(replyJumpToastTimer);
			if (contextSearchTimer) clearTimeout(contextSearchTimer);
			if (mentionSearchTimer) clearTimeout(mentionSearchTimer);
		};
	});
</script>

<ProfileCard
	user={currentClickedUser as PublicUser}
	isOpen={showUserCard && !!currentClickedUser}
	onClose={() => (showUserCard = false)}
	anchorEl={profileCardAnchor}
/>

<SEO title="Chat" description="Ruang chat komunitas anime." noindex />

<section class="chat-page">
	<div class="chat-shell">
		<div class="chat-messages" aria-label="Daftar pesan" bind:this={messageListEl}>
			{#if isLoading}
				<div class="chat-skeleton" aria-label="Memuat chat">
					{#each chatSkeletonRows as row, index}
						<div class="skeleton-row" class:mine={row.mine}>
							{#if !row.mine}
								<span class="skeleton-avatar"></span>
							{/if}
							<div class="skeleton-stack" style:width={row.width}>
								{#if !row.mine}
									<span class="skeleton-name" style:width={index % 2 === 0 ? '46%' : '34%'}></span>
								{/if}
								<div class="skeleton-bubble">
									{#each row.lines as line}
										<span class="skeleton-line" style:width={line}></span>
									{/each}
									<span class="skeleton-time"></span>
								</div>
							</div>
							{#if row.mine}
								<span class="skeleton-avatar mini"></span>
							{/if}
						</div>
					{/each}
				</div>
			{:else if messages.length === 0}
				<div class="chat-state">
					<span class="material-symbols-rounded">forum</span>
					<strong>{chatNotice ? 'Chat belum siap' : 'Belum ada pesan'}</strong>
					<p>{chatNotice || 'Mulai obrolan komunitas anime hari ini.'}</p>
				</div>
			{:else}
				{#each messages as message (message.id)}
					<article
						class="message-row"
						class:mine={message.isMine}
						class:reply-highlight={highlightedMessageId === message.id}
						data-message-id={message.id}
					>
						{#if !message.isMine}
							<AvatarFrame
								src={message.user.avatar}
								alt={displayUserName(message.user)}
								size={38}
								frame={message.user.frame ?? null}
								fallbackInitial={displayUserName(message.user)}
								onclick={(event) =>
									openProfileCard(message.user, event.currentTarget as HTMLButtonElement)}
							/>
						{/if}

						<div class="message-stack">
							{#if !message.isMine}
								{@const levelMeta = userLevelMeta(message.user)}
								<div class="message-author-block">
									<div class="message-author">
										<NameTag name={displayUserName(message.user)} nametag={message.user.nametag ?? null} />
										{#if message.user.isVerified}
											<img
												src="/badges/verify.png"
												alt="Verified user"
												title="Verified user"
												class="verified-badge"
											/>
										{/if}
									</div>
									<div class="message-level-line">
										<span class="message-level-title" style="background: {levelMeta.badge.color};">
											{levelMeta.badge.name}
										</span>
										<span class="message-level-number">Lv {levelMeta.level}</span>
									</div>
								</div>
							{/if}
							<div
								class="message-bubble"
								class:has-reply={Boolean(message.replyTo)}
								role="button"
								tabindex="0"
								aria-label="Buka opsi pesan"
								onclick={(event) => handleBubbleClick(event, message)}
								oncontextmenu={(event) => openMessageMenu(event, message)}
								onpointerdown={(event) => handleBubblePointerDown(event, message)}
								onpointermove={handleBubblePointerMove}
								onpointerup={handleBubblePointerUp}
								onkeydown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										const rect = event.currentTarget.getBoundingClientRect();
										openMessageMenuAt(rect.left + rect.width / 2, rect.top + 12, message);
									}
								}}
								onpointercancel={() => {
									pointerStart = null;
									clearLongPress();
								}}
							>
								{#if message.replyTo}
									<div
										class="reply-preview in-bubble jumpable-reply"
										role="button"
										tabindex="0"
										aria-label={`Lihat pesan dari ${message.replyTo.senderName}`}
										onclick={(event) => {
											event.stopPropagation();
											void jumpToReplyTarget(message);
										}}
										onkeydown={(event) => {
											if (event.key === 'Enter' || event.key === ' ') {
												event.preventDefault();
												void jumpToReplyTarget(message);
											}
										}}
									>
										<strong>{message.replyTo.senderName}</strong>
										<span>{replyPreviewText(message.replyTo)}</span>
									</div>
								{/if}
								{#if message.contexts.length}
									<div class="bubble-context-list">
										{#each message.contexts as context (context.type + context.id)}
											<a class="bubble-context-card" href={context.url}>
												<span class="context-thumb">
													{#if context.thumbnail}
														<OptimizedImage
															src={context.thumbnail}
															alt={context.title}
															className="context-image"
															imageClass="chat-context-image"
															sizes={contextImageSizes('bubble')}
															placeholder={false}
														/>
													{:else}
														<span class="material-symbols-rounded">movie</span>
													{/if}
												</span>
												<span class="context-copy">
													<span class="context-badge">{contextTypeLabel(context.type)}</span>
													<strong>{context.title}</strong>
													<small>{contextSubtitle(context)}</small>
												</span>
											</a>
										{/each}
									</div>
								{/if}
								{#if message.body || message.deletedAt}
									<p class:deleted-message={message.deletedAt}>
										{#if message.deletedAt}
											{deletedMessageText(message)}
										{:else}
										{#each messageTextSegments(message.body) as segment}
												{#if segment.mention}
													<button
														type="button"
														class="message-mention"
														onclick={(event) => {
															event.stopPropagation();
															void openMentionProfile(
																segment.text,
																event.currentTarget as HTMLButtonElement,
																segment.user
															);
														}}
													>
														{segment.text}
													</button>
												{:else if segment.link}
													<a
														class="message-inline-link"
														href={segment.link}
														target="_blank"
														rel="noreferrer"
														onclick={(event) => event.stopPropagation()}
													>
														{segment.text}
													</a>
												{:else}
													{segment.text}
												{/if}
											{/each}
										{/if}
									</p>
								{/if}
								{#if message.links.length}
									<div class="bubble-link-list">
										{#each message.links as link (link.url + link.rawText)}
											<a
												class="bubble-context-card link-preview"
												href={link.preview?.url ?? link.path}
											>
												<span class="context-thumb link-thumb">
													{#if link.preview?.thumbnail}
														<OptimizedImage
															src={link.preview.thumbnail}
															alt={link.preview.title}
															className="context-image"
															imageClass="chat-context-image"
															sizes={contextImageSizes('bubble')}
															placeholder={false}
														/>
													{:else}
														<span class="material-symbols-rounded">link</span>
													{/if}
												</span>
												<span class="context-copy">
													<span class="context-badge"
														>{link.preview ? contextTypeLabel(link.preview.type) : link.host}</span
													>
													<strong>{link.preview?.title ?? link.path}</strong>
													<small
														>{link.preview
															? contextSubtitle(link.preview)
															: 'Link internal weebin.site'}</small
													>
												</span>
											</a>
										{/each}
									</div>
								{/if}
								<span class="message-time">{message.time}{message.editedAt ? ' - diedit' : ''}</span>
							</div>
						</div>

						{#if message.isMine}
							<AvatarFrame
								src={message.user.avatar}
								alt={displayUserName(message.user)}
								size={38}
								frame={message.user.frame ?? null}
								fallbackInitial={displayUserName(message.user)}
								onclick={(event) =>
									openProfileCard(message.user, event.currentTarget as HTMLButtonElement)}
							/>
						{/if}
					</article>
				{/each}
			{/if}
		</div>

		{#if auth.isLoggedIn}
			<form
				class="chat-composer"
				onsubmit={(event) => {
					event.preventDefault();
					sendMessage();
				}}
			>
				{#if typingUsers.length}
					<div class="typing-bar" aria-live="polite">
						<span class="typing-text">{typingLabel()}</span>
						<span class="typing-dots" aria-hidden="true">
							<span></span>
							<span></span>
							<span></span>
						</span>
					</div>
				{/if}
				{#if replyTarget}
					<div class="reply-preview composer-reply">
						<div>
						<strong>Reply ke {displayUserName(replyTarget.user)}</strong>
							<span>{replyPreviewText(replyTarget)}</span>
						</div>
						<button type="button" aria-label="Batal reply" onclick={() => (replyTarget = null)}>
							<span class="material-symbols-rounded">close</span>
						</button>
					</div>
				{/if}
				{#if editTarget}
					<div class="reply-preview composer-reply edit-preview">
						<div>
							<strong>Edit pesan</strong>
							<span>{replyPreviewText(editTarget)}</span>
						</div>
						<button type="button" aria-label="Batal edit" onclick={cancelEdit}>
							<span class="material-symbols-rounded">close</span>
						</button>
					</div>
				{/if}
				{#if selectedContexts.length}
					<div class="selected-contexts">
						{#each selectedContexts as context (context.type + context.id)}
							<div class="selected-context-card">
								<a href={context.url} class="selected-context-link">
									<span class="context-thumb">
										{#if context.thumbnail}
											<OptimizedImage
												src={context.thumbnail}
												alt={context.title}
												className="context-image"
												imageClass="chat-context-image"
												sizes={contextImageSizes('selected')}
												placeholder={false}
											/>
										{:else}
											<span class="material-symbols-rounded">movie</span>
										{/if}
									</span>
									<span class="context-copy">
										<span class="context-badge">{contextTypeLabel(context.type)}</span>
										<strong>{context.title}</strong>
										<small>{contextSubtitle(context)}</small>
									</span>
								</a>
								<button
									type="button"
									class="remove-context"
									aria-label="Hapus context"
									onclick={() => removeContext(context)}
								>
									<span class="material-symbols-rounded">close</span>
								</button>
							</div>
						{/each}
					</div>
				{/if}
				<button
					type="button"
					class="context-button"
					aria-label="Tambah context anime atau episode"
					disabled={Boolean(editTarget)}
					onclick={openContextSheet}
				>
					<span class="material-symbols-rounded">add</span>
				</button>
				<div class="composer-input">
					{#if mentionKeyword.length >= 2 && (mentionLoading || mentionSuggestions.length)}
						<div class="mention-suggestions" role="listbox" aria-label="Pilih user mention">
							{#if mentionLoading && mentionSuggestions.length === 0}
								<div class="mention-state">Mencari user...</div>
							{:else}
								{#each mentionSuggestions as user, index (user.id)}
									<button
										type="button"
										class:active={index === mentionActiveIndex}
										role="option"
										aria-selected={index === mentionActiveIndex}
										onpointerdown={(event) => event.preventDefault()}
										onclick={() => insertMention(user)}
									>
										<span class="mention-avatar">
											{#if user.avatar}
												<img src={user.avatar} alt="" loading="lazy" />
											{:else}
												{userInitial(user)}
											{/if}
										</span>
										<span class="mention-copy">
											<strong>{displayUserName(user)}</strong>
											<small>@{userHandle(user) || displayUserName(user)}</small>
										</span>
										{#if user.isVerified}
											<img
												src="/badges/verify.png"
												alt="Verified user"
												title="Verified user"
												class="verified-badge mention-verified"
											/>
										{/if}
									</button>
								{/each}
							{/if}
						</div>
					{/if}
					<input
						bind:this={composerInputEl}
						type="text"
						placeholder={editTarget ? 'Edit pesan...' : 'Tulis pesan...'}
						aria-label="Tulis pesan"
						maxlength="1000"
						bind:value={draft}
						oninput={handleComposerInput}
						onkeydown={handleComposerKeydown}
						onclick={queueMentionSearch}
					/>
				</div>
				<button
					class="send-button"
					class:slowmode-active={showSlowmodeButton}
					type="submit"
					aria-label={editTarget
						? 'Simpan edit pesan'
						: showSlowmodeButton
							? `Slowmode aktif, tunggu ${slowmodeRemaining} detik`
							: 'Kirim pesan'}
					title={editTarget
						? 'Simpan edit pesan'
						: showSlowmodeButton
							? `Slowmode aktif, tunggu ${slowmodeRemaining} detik`
							: 'Kirim pesan'}
					disabled={!canSend}
				>
					<span class="material-symbols-rounded">
						{editTarget ? 'check' : showSlowmodeButton ? 'schedule' : 'send'}
					</span>
					{#if showSlowmodeButton}
						<span class="slowmode-count">{slowmodeRemaining}</span>
					{/if}
				</button>
				<span
					class="composer-status-dot"
					class:online={socketState === 'open'}
					class:error={socketState === 'error'}
					aria-label={socketState === 'open' ? 'Realtime aktif' : 'Polling aktif'}
					title={socketState === 'open' ? 'Realtime aktif' : 'Polling aktif'}
				></span>
				{#if chatNotice}
					<p class="composer-notice">{chatNotice}</p>
				{/if}
			</form>
		{:else}
			<div class="chat-composer guest-composer">
				<div class="guest-copy">
					<span class="material-symbols-rounded">lock</span>
					<p>Login untuk ikut kirim pesan</p>
				</div>
				<a href="/login?redirect=/chat" class="login-chat-button">Masuk</a>
			</div>
		{/if}
	</div>
</section>

{#if replyJumpToast}
	<div class="reply-jump-toast" role="status" aria-live="polite">
		<span class="material-symbols-rounded">info</span>
		{replyJumpToast}
	</div>
{/if}

{#if mentionJumpQueue.length}
	<button
		type="button"
		class="mention-jump-button"
		aria-label={`${mentionJumpQueue.length} mention belum dilihat`}
		onclick={jumpToNextMention}
	>
		<span>@</span>
		<strong>{Math.min(mentionJumpQueue.length, 99)}</strong>
	</button>
{/if}

{#if showChatOnboarding}
	<div
		class="chat-onboarding-layer"
		role="presentation"
		onclick={dismissChatOnboarding}
		onkeydown={(event) => {
			if (event.key === 'Escape') dismissChatOnboarding();
		}}
	>
		<div
			class="chat-onboarding"
			role="dialog"
			aria-modal="true"
			aria-label="Pengenalan fitur chat"
			tabindex="-1"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			<div class="chat-onboarding-hero">
				<span class="material-symbols-rounded">forum</span>
				<div>
					<p>Selamat datang di Chat</p>
					<h2>Ngobrol lebih enak dengan fitur komunitas.</h2>
				</div>
			</div>

			<div class="chat-onboarding-grid">
				{#each chatOnboardingItems as item}
					<div class="chat-onboarding-item">
						<span class="material-symbols-rounded">{item.icon}</span>
						<div>
							<strong>{item.title}</strong>
							<p>{item.description}</p>
						</div>
					</div>
				{/each}
			</div>

			<button type="button" class="chat-onboarding-action" onclick={dismissChatOnboarding}>
				Mulai Chat
				<span class="material-symbols-rounded">arrow_forward</span>
			</button>
		</div>
	</div>
{/if}

{#if messageMenu.open && messageMenu.message}
	<div
		class="message-context-menu"
		style:left={`${messageMenu.x}px`}
		style:top={`${messageMenu.y}px`}
		role="menu"
		tabindex="-1"
		onclick={(event) => event.stopPropagation()}
		onkeydown={(event) => event.stopPropagation()}
	>
		<button
			type="button"
			role="menuitem"
			disabled={Boolean(messageMenu.message.deletedAt)}
			onclick={() => startReply(messageMenu.message)}
		>
			<span class="material-symbols-rounded">reply</span>
			Reply pesan
		</button>
		<button
			type="button"
			role="menuitem"
			disabled={!canDeleteMessage(messageMenu.message)}
			onclick={() => askDeleteMessage(messageMenu.message)}
		>
			<span class="material-symbols-rounded">delete</span>
			Hapus pesan
		</button>
		<button
			type="button"
			role="menuitem"
			disabled={!canEditMessage(messageMenu.message)}
			onclick={() => startEdit(messageMenu.message)}
		>
			<span class="material-symbols-rounded">edit</span>
			Edit pesan
		</button>
	</div>
{/if}

{#if deleteTarget}
	<div
		class="message-confirm-layer"
		role="presentation"
		onclick={() => (deleteTarget = null)}
		onkeydown={(event) => {
			if (event.key === 'Escape') deleteTarget = null;
		}}
	>
		<div
			class="message-confirm"
			role="dialog"
			aria-modal="true"
			aria-label="Konfirmasi hapus pesan"
			tabindex="-1"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			<strong>Hapus pesan?</strong>
			<p>Pesan akan disembunyikan dari chat dan tampil sebagai pesan telah dihapus.</p>
			<div class="message-confirm-actions">
				<button type="button" onclick={() => (deleteTarget = null)}>Batal</button>
				<button type="button" class="danger" onclick={confirmDeleteMessage}>Hapus</button>
			</div>
		</div>
	</div>
{/if}

{#if contextSheetOpen}
	<div
		class="context-sheet-layer"
		role="presentation"
		onclick={closeContextSheet}
		onkeydown={(event) => {
			if (event.key === 'Escape') closeContextSheet();
		}}
	>
		<div
			class="context-sheet"
			role="dialog"
			aria-modal="true"
			aria-label="Pilih context chat"
			tabindex="-1"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			<header class="context-sheet-header">
				<div>
					<strong>Bagikan ke chat</strong>
					<p>{contextSourceTitle()}</p>
				</div>
				<button type="button" class="sheet-close" aria-label="Tutup" onclick={closeContextSheet}>
					<span class="material-symbols-rounded">close</span>
				</button>
			</header>

			<div class="context-source-tabs" role="tablist" aria-label="Sumber context">
				{#each [{ id: 'saved', label: 'Tersimpan', icon: 'bookmark' }, { id: 'history', label: 'Riwayat', icon: 'history' }, { id: 'search', label: 'Cari', icon: 'search' }] as item}
					<button
						type="button"
						role="tab"
						class:active={contextSource === item.id}
						aria-selected={contextSource === item.id}
						onclick={() => (contextSource = item.id as ContextSource)}
					>
						<span class="material-symbols-rounded">{item.icon}</span>
						{item.label}
					</button>
				{/each}
			</div>

			{#if contextSource === 'search'}
				<div class="context-search">
					<span class="material-symbols-rounded">search</span>
					<input
						type="search"
						placeholder="Cari anime atau episode..."
						bind:value={contextQuery}
						aria-label="Cari context"
					/>
				</div>

				<div class="context-tabs" role="tablist" aria-label="Filter context">
					{#each ['all', 'anime', 'episode'] as item}
						<button
							type="button"
							role="tab"
							class:active={contextFilter === item}
							aria-selected={contextFilter === item}
							onclick={() => (contextFilter = item as ChatContextType | 'all')}
						>
							{item === 'all' ? 'Semua' : contextTypeLabel(item as ChatContextType)}
						</button>
					{/each}
				</div>
			{/if}

			<div class="context-results">
				{#if contextSource === 'search' && !contextQuery.trim()}
					<div class="sheet-state">
						<span class="material-symbols-rounded">{contextEmptyCopy().icon}</span>
						<strong>{contextEmptyCopy().title}</strong>
						<p>{contextEmptyCopy().desc}</p>
					</div>
				{:else if contextLoading}
					<div class="sheet-state">
						<span class="material-symbols-rounded">hourglass_top</span>
						<strong>Memuat context...</strong>
					</div>
				{:else if contextError}
					<div class="sheet-state error">{contextError}</div>
				{:else if contextSourceItems().length === 0}
					<div class="sheet-state">
						<span class="material-symbols-rounded">{contextEmptyCopy().icon}</span>
						<strong
							>{contextSource === 'search' ? 'Tidak ada hasil' : contextEmptyCopy().title}</strong
						>
						<p>{contextSource === 'search' ? 'Coba kata kunci lain.' : contextEmptyCopy().desc}</p>
					</div>
				{:else}
					{#each contextSourceItems() as item (item.type + item.id)}
						<button type="button" class="context-result" onclick={() => selectContext(item)}>
							<span class="context-thumb">
								{#if item.thumbnail}
									<OptimizedImage
										src={item.thumbnail}
										alt={item.title}
										className="context-image"
										imageClass="chat-context-image"
										sizes={contextImageSizes('sheet')}
									/>
								{:else}
									<span class="material-symbols-rounded">movie</span>
								{/if}
							</span>
							<span class="context-copy">
								<span class="context-badge">{contextTypeLabel(item.type)}</span>
								<strong>{item.title}</strong>
								<small>{contextSubtitle(item)}</small>
							</span>
							<span class="pick-label">Pilih</span>
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body:has(.chat-page)) {
		overflow: hidden;
	}

	:global(main:has(.chat-page)) {
		padding: 0 !important;
		overflow: hidden !important;
	}

	.chat-page {
		width: 100%;
		max-width: 100%;
		height: calc(100dvh - 60px);
		min-height: 0;
		display: flex;
		justify-content: center;
		overflow: hidden;
		user-select: none;
	}

	.chat-shell {
		width: min(100%, 880px);
		height: 100%;
		min-height: 0;
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius-2xl);
		background:
			linear-gradient(180deg, oklch(from var(--surface) l c h / 0.96), var(--surface)),
			var(--surface);
		box-shadow: var(--shadow-lg);
	}

	.chat-composer {
		background: oklch(from var(--surface) l c h / 0.9);
		backdrop-filter: blur(18px) saturate(170%);
	}

	.send-button {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
	}

	.chat-messages {
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 20px 12px 22px 8px;
		background:
			radial-gradient(circle at 14% 8%, var(--accent-glow), transparent 18rem),
			linear-gradient(180deg, var(--page-bg), oklch(from var(--page-bg) calc(l - 0.02) c h));
	}

	.message-row {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		margin-bottom: 14px;
	}

	.message-row > :global(.avatar-wrapper) {
		margin-top: 1px;
	}

	.chat-state {
		width: min(100%, 420px);
		margin: 18px auto;
		padding: 18px 16px;
		border-radius: 22px;
		border: 1px solid var(--border);
		background:
			linear-gradient(145deg, oklch(from var(--accent) l c h / 0.12), transparent), var(--surface);
		color: var(--text-muted);
		text-align: center;
		font-size: 12px;
		font-weight: 800;
		box-shadow: var(--shadow-sm);
	}

	.chat-state span {
		display: inline-flex;
		width: 38px;
		height: 38px;
		align-items: center;
		justify-content: center;
		margin-bottom: 9px;
		border-radius: 9999px;
		background: linear-gradient(145deg, var(--accent), var(--accent-hover));
		color: #fff;
		box-shadow: 0 10px 24px var(--accent-glow);
	}

	.chat-state strong,
	.chat-state p {
		display: block;
		margin: 0;
	}

	.chat-state strong {
		color: var(--text-primary);
		font-size: 14px;
	}

	.chat-state p {
		margin-top: 4px;
		color: var(--text-muted);
	}

	.chat-onboarding-layer {
		position: fixed;
		inset: 0;
		z-index: 90;
		display: grid;
		place-items: center;
		padding: 18px;
		background: oklch(0 0 0 / 0.58);
		backdrop-filter: blur(14px) saturate(140%);
	}

	.chat-onboarding {
		width: min(100%, 440px);
		max-height: min(720px, calc(100dvh - 36px));
		overflow-y: auto;
		border: 1px solid oklch(from var(--accent) l c h / 0.28);
		border-radius: 26px;
		background:
			radial-gradient(circle at 18% 0%, oklch(from var(--accent) l c h / 0.24), transparent 18rem),
			linear-gradient(180deg, oklch(from var(--surface) calc(l + 0.03) c h / 0.98), var(--surface));
		box-shadow: 0 24px 80px oklch(0 0 0 / 0.48);
		padding: 18px;
	}

	.chat-onboarding-hero {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 14px;
		align-items: center;
		padding: 4px 2px 16px;
	}

	.chat-onboarding-hero > span {
		width: 46px;
		height: 46px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 18px;
		background: linear-gradient(145deg, var(--accent), var(--accent-hover));
		color: #fff;
		box-shadow: 0 14px 30px var(--accent-glow);
	}

	.chat-onboarding-hero p,
	.chat-onboarding-hero h2,
	.chat-onboarding-item p {
		margin: 0;
	}

	.chat-onboarding-hero p {
		color: var(--accent);
		font-size: 11px;
		font-weight: 1000;
		text-transform: uppercase;
	}

	.chat-onboarding-hero h2 {
		margin-top: 4px;
		color: var(--text-primary);
		font-size: 20px;
		font-weight: 1000;
		line-height: 1.12;
	}

	.chat-onboarding-grid {
		display: grid;
		gap: 9px;
	}

	.chat-onboarding-item {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 11px;
		align-items: flex-start;
		padding: 12px;
		border: 1px solid var(--border);
		border-radius: 18px;
		background: oklch(from var(--card-bg) l c h / 0.74);
	}

	.chat-onboarding-item > span {
		width: 34px;
		height: 34px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 13px;
		background: oklch(from var(--accent) l c h / 0.15);
		color: var(--accent);
		font-size: 19px;
	}

	.chat-onboarding-item strong {
		display: block;
		color: var(--text-primary);
		font-size: 13px;
		font-weight: 1000;
	}

	.chat-onboarding-item p {
		margin-top: 4px;
		color: var(--text-muted);
		font-size: 11.5px;
		font-weight: 750;
		line-height: 1.35;
	}

	.chat-onboarding-action {
		width: 100%;
		height: 46px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-top: 14px;
		border: 0;
		border-radius: 999px;
		background: linear-gradient(145deg, var(--accent), var(--accent-hover));
		color: #fff;
		font-size: 13px;
		font-weight: 1000;
		box-shadow: 0 14px 34px var(--accent-glow);
		cursor: pointer;
	}

	.chat-onboarding-action span {
		font-size: 18px;
	}

	.chat-skeleton {
		display: grid;
		gap: 14px;
		padding: 2px 0 8px;
	}

	.skeleton-row {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.skeleton-row.mine {
		justify-content: flex-end;
	}

	.skeleton-stack {
		max-width: min(72%, 560px);
		min-width: 96px;
		display: grid;
		gap: 6px;
	}

	.skeleton-row.mine .skeleton-stack {
		justify-items: end;
	}

	.skeleton-avatar,
	.skeleton-name,
	.skeleton-bubble,
	.skeleton-line,
	.skeleton-time {
		position: relative;
		overflow: hidden;
		background: oklch(from var(--surface-2) calc(l + 0.03) c h / 0.72);
	}

	.skeleton-avatar,
	.skeleton-bubble {
		border: 1px solid oklch(from var(--border) l c h / 0.72);
	}

	.skeleton-avatar {
		width: 38px;
		height: 38px;
		flex: 0 0 auto;
		border-radius: 9999px;
		margin-top: 1px;
	}

	.skeleton-avatar.mini {
		width: 34px;
		height: 34px;
		opacity: 0.66;
	}

	.skeleton-name {
		height: 10px;
		border-radius: 9999px;
	}

	.skeleton-bubble {
		width: 100%;
		min-height: 58px;
		display: grid;
		align-content: start;
		gap: 8px;
		padding: 13px 14px 20px;
		border-radius: 7px 20px 20px;
	}

	.skeleton-row.mine .skeleton-bubble {
		border-radius: 20px 7px 20px 20px;
		background: oklch(from var(--accent) l c h / 0.26);
	}

	.skeleton-line {
		display: block;
		height: 9px;
		border-radius: 9999px;
		background: oklch(from var(--text-muted) l c h / 0.16);
	}

	.skeleton-time {
		position: absolute;
		right: 12px;
		bottom: 8px;
		width: 28px;
		height: 7px;
		border-radius: 9999px;
		background: oklch(from var(--text-muted) l c h / 0.14);
	}

	.skeleton-avatar::after,
	.skeleton-name::after,
	.skeleton-bubble::after {
		content: '';
		position: absolute;
		inset: 0;
		transform: translateX(-100%);
		background: linear-gradient(
			90deg,
			transparent,
			oklch(from var(--text-primary) l c h / 0.08),
			transparent
		);
		animation: skeleton-sweep 1.6s ease-in-out infinite;
	}

	@keyframes skeleton-sweep {
		to {
			transform: translateX(100%);
		}
	}

	.message-row.mine {
		justify-content: flex-end;
	}

	.message-row.reply-highlight .message-bubble {
		animation: reply-target-pulse 1s ease both;
	}

	@keyframes reply-target-pulse {
		0%,
		100% {
			box-shadow: var(--shadow-sm);
		}
		22%,
		72% {
			border-color: oklch(0.82 0.15 72 / 0.92);
			box-shadow:
				0 0 0 3px oklch(0.82 0.15 72 / 0.28),
				0 14px 32px oklch(0.72 0.13 72 / 0.2);
		}
	}

	.message-stack {
		max-width: min(72%, 560px);
		min-width: 0;
	}

	.message-author {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 12px;
		font-weight: 900;
		color: var(--text-primary);
	}

	.message-author-block {
		margin: 0 0 6px 2px;
	}

	.message-level-line {
		display: flex;
		align-items: center;
		gap: 5px;
		margin-top: 2px;
		min-width: 0;
	}

	.message-level-title {
		display: inline-flex;
		align-items: center;
		height: 15px;
		border-radius: 999px;
		padding: 0 6px;
		color: #fff;
		font-size: 9px;
		font-weight: 1000;
		line-height: 1;
		box-shadow: 0 4px 10px oklch(0 0 0 / 0.2);
	}

	.message-level-number {
		overflow: hidden;
		color: var(--text-faint);
		font-size: 9.5px;
		font-weight: 900;
		line-height: 1;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.verified-badge {
		width: 14px;
		height: 14px;
		object-fit: contain;
	}

	.message-bubble {
		position: relative;
		padding: 10px 12px 7px;
		border-radius: 18px 18px 18px 6px;
		background: var(--surface);
		border: 1px solid var(--border);
		box-shadow: var(--shadow-sm);
		color: var(--text-primary);
	}

	.message-bubble.has-reply {
		cursor: pointer;
	}

	.message-row.mine .message-bubble {
		border-radius: 18px 18px 6px 18px;
		background: linear-gradient(145deg, var(--accent), var(--accent-hover));
		border-color: oklch(from #ffffff l c h / 0.14);
		color: #fff;
		box-shadow: 0 10px 24px var(--accent-glow);
	}

	.message-bubble p {
		margin: 0;
		font-size: 13px;
		line-height: 1.55;
		overflow-wrap: anywhere;
	}

	.message-bubble p.deleted-message {
		font-style: italic;
		color: var(--text-muted);
	}

	.message-row.mine .message-bubble p.deleted-message {
		color: oklch(from #ffffff l c h / 0.72);
	}

	.message-mention {
		display: inline;
		border: 0;
		padding: 0;
		background: transparent;
		color: #60a5fa;
		font: inherit;
		font-weight: 1000;
		text-shadow: 0 0 16px oklch(from #60a5fa l c h / 0.24);
		cursor: pointer;
	}

	.message-mention:hover {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.message-inline-link {
		color: #38bdf8;
		font-weight: 900;
		text-decoration: underline;
		text-underline-offset: 2px;
		overflow-wrap: anywhere;
	}

	.message-row.mine .message-mention {
		color: #bfdbfe;
		text-shadow: 0 0 16px oklch(from #bfdbfe l c h / 0.26);
	}

	.message-row.mine .message-inline-link {
		color: #e0f2fe;
	}

	.reply-preview {
		min-width: 0;
		border-left: 3px solid var(--accent);
		background: oklch(from var(--surface-offset) calc(l + 0.01) c h / 0.76);
		color: var(--text-secondary);
	}

	.reply-preview strong,
	.reply-preview span {
		display: block;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.reply-preview strong {
		color: var(--text-primary);
		font-size: 11px;
		font-weight: 1000;
	}

	.reply-preview span {
		margin-top: 2px;
		font-size: 11px;
		font-weight: 800;
	}

	.reply-preview.in-bubble {
		margin-bottom: 8px;
		padding: 7px 9px;
		border-radius: 10px;
	}

	.reply-preview.jumpable-reply {
		cursor: pointer;
		transition:
			border-color 0.18s ease,
			background 0.18s ease,
			transform 0.18s ease;
	}

	.reply-preview.jumpable-reply:hover {
		border-left-color: oklch(from var(--accent) l c h / 0.9);
		background: oklch(from var(--surface-offset) calc(l + 0.025) c h / 0.88);
		transform: translateX(1px);
	}

	.message-row.mine .reply-preview.in-bubble {
		border-left-color: oklch(from #ffffff l c h / 0.7);
		background: oklch(from #000000 l c h / 0.16);
		color: oklch(from #ffffff l c h / 0.78);
	}

	.message-row.mine .reply-preview.in-bubble strong {
		color: #fff;
	}

	.composer-reply {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 10px;
		padding: 9px 10px;
		border-radius: 16px;
		border: 1px solid var(--border);
	}

	.composer-reply button {
		width: 30px;
		height: 30px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		color: var(--text-muted);
		background: var(--surface-2);
	}

	.composer-reply button span {
		font-size: 17px;
	}

	.edit-preview {
		border-left-color: var(--text-muted);
	}

	.message-confirm-layer {
		position: fixed;
		inset: 0;
		z-index: 90;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding: 16px;
		background: oklch(from #000000 l c h / 0.4);
	}

	.reply-jump-toast {
		position: fixed;
		left: 50%;
		bottom: calc(78px + env(safe-area-inset-bottom));
		z-index: 95;
		width: min(calc(100vw - 28px), 360px);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 13px;
		border-radius: 9999px;
		border: 1px solid var(--border);
		background: oklch(from var(--surface) l c h / 0.96);
		color: var(--text-secondary);
		box-shadow: var(--shadow-lg);
		backdrop-filter: blur(18px) saturate(160%);
		transform: translateX(-50%);
		font-size: 12px;
		font-weight: 850;
	}

	.reply-jump-toast span {
		flex: 0 0 auto;
		font-size: 17px;
		color: var(--text-muted);
	}

	.mention-jump-button {
		position: fixed;
		right: 16px;
		bottom: calc(82px + env(safe-area-inset-bottom));
		z-index: 82;
		min-width: 48px;
		height: 42px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 3px;
		border-radius: 9999px;
		border: 1px solid oklch(from #ffffff l c h / 0.24);
		background:
			linear-gradient(145deg, oklch(from var(--accent) calc(l + 0.08) c h), var(--accent-hover)),
			var(--accent);
		color: #fff;
		box-shadow:
			0 16px 34px var(--accent-glow),
			0 12px 28px oklch(0 0 0 / 0.3),
			inset 0 1px 0 oklch(from #ffffff l c h / 0.3);
		font-weight: 1000;
		transition:
			transform 0.18s ease,
			filter 0.18s ease;
	}

	.mention-jump-button:active {
		transform: scale(0.95);
	}

	.mention-jump-button span {
		font-size: 18px;
		line-height: 1;
	}

	.mention-jump-button strong {
		min-width: 16px;
		font-size: 11px;
		line-height: 1;
	}

	.message-confirm {
		width: min(100%, 360px);
		display: grid;
		gap: 10px;
		padding: 16px;
		border-radius: 18px;
		border: 1px solid var(--border);
		background: oklch(from var(--surface) l c h / 0.98);
		box-shadow: var(--shadow-lg);
		backdrop-filter: blur(18px) saturate(160%);
	}

	.message-confirm strong {
		color: var(--text-primary);
		font-size: 15px;
		font-weight: 1000;
	}

	.message-confirm p {
		margin: 0;
		color: var(--text-muted);
		font-size: 12px;
		font-weight: 800;
		line-height: 1.5;
	}

	.message-confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}

	.message-confirm-actions button {
		border-radius: 9999px;
		padding: 9px 13px;
		background: var(--surface-2);
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 950;
	}

	.message-confirm-actions button.danger {
		background: oklch(from #ef4444 l c h / 0.18);
		color: #fca5a5;
	}

	.message-context-menu {
		position: fixed;
		z-index: 80;
		width: 176px;
		display: grid;
		gap: 4px;
		padding: 7px;
		border-radius: 16px;
		border: 1px solid var(--border);
		background: oklch(from var(--surface) l c h / 0.98);
		box-shadow: var(--shadow-lg);
		backdrop-filter: blur(18px) saturate(160%);
	}

	.message-context-menu button {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 9px;
		border-radius: 11px;
		padding: 9px 10px;
		color: var(--text-primary);
		font-size: 12px;
		font-weight: 900;
		text-align: left;
	}

	.message-context-menu button:hover:not(:disabled) {
		background: var(--surface-2);
	}

	.message-context-menu button:disabled {
		cursor: not-allowed;
		opacity: 0.42;
	}

	.message-context-menu span {
		font-size: 18px;
	}

	.bubble-context-list,
	.bubble-link-list {
		display: grid;
		gap: 8px;
		margin-bottom: 8px;
	}

	.bubble-link-list {
		margin-top: 8px;
	}

	.bubble-context-card,
	.selected-context-link,
	.context-result {
		min-width: 0;
		display: grid;
		grid-template-columns: 54px minmax(0, 1fr);
		align-items: center;
		gap: 10px;
		padding: 7px;
		border-radius: 14px;
		border: 1px solid oklch(from #ffffff l c h / 0.14);
		background: oklch(from var(--surface-offset) l c h / 0.72);
		color: inherit;
		overflow: hidden;
		content-visibility: auto;
	}

	.message-row.mine .bubble-context-card {
		background: oklch(from #000000 l c h / 0.16);
	}

	.bubble-context-card {
		grid-template-columns: 62px minmax(0, 1fr);
		min-height: 78px;
		border-radius: 16px;
		background: oklch(from var(--surface-offset) calc(l + 0.015) c h / 0.9);
	}

	.bubble-context-card .context-thumb {
		width: 62px;
		height: 62px;
		border-radius: 14px;
	}

	.bubble-context-card .context-copy {
		gap: 5px;
	}

	.bubble-context-card .context-copy strong {
		font-size: 13px;
		line-height: 1.25;
	}

	.bubble-context-card .context-copy small {
		font-size: 11px;
		line-height: 1.35;
	}

	.context-thumb {
		width: 54px;
		height: 54px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 12px;
		background: var(--surface);
		color: var(--accent);
	}

	.context-thumb :global(.context-image),
	.context-thumb :global(.chat-context-image) {
		width: 100%;
		height: 100%;
		display: block;
	}

	.context-thumb :global(.chat-context-image) {
		object-fit: cover;
	}

	.context-thumb :global(.optimized-image__skeleton) {
		border-radius: inherit;
	}

	.context-copy {
		min-width: 0;
		display: grid;
		gap: 3px;
		padding-right: 8px;
	}

	.context-badge {
		width: fit-content;
		border-radius: 9999px;
		padding: 2px 7px;
		background: oklch(from var(--accent) l c h / 0.18);
		color: var(--accent);
		font-size: 9px;
		font-weight: 950;
		text-transform: uppercase;
	}

	.message-row.mine .context-badge {
		background: oklch(from #ffffff l c h / 0.2);
		color: #fff;
	}

	.context-copy strong,
	.context-copy small {
		min-width: 0;
		overflow: hidden;
		display: -webkit-box;
		-webkit-box-orient: vertical;
	}

	.context-copy strong {
		-webkit-line-clamp: 1;
		line-clamp: 1;
		font-size: 12px;
		line-height: 1.25;
	}

	.context-copy small {
		-webkit-line-clamp: 2;
		line-clamp: 2;
		color: var(--text-muted);
		font-size: 10px;
		font-weight: 750;
		line-height: 1.35;
	}

	.message-row.mine .context-copy small {
		color: oklch(from #ffffff l c h / 0.72);
	}

	.message-time {
		display: block;
		margin-top: 4px;
		text-align: right;
		font-size: 10px;
		font-weight: 700;
		color: var(--text-faint);
	}

	.message-row.mine .message-time {
		color: oklch(from #ffffff l c h / 0.72);
	}

	.chat-composer {
		position: sticky;
		bottom: 0;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		border-top: 1px solid var(--border);
	}

	.chat-composer:not(.guest-composer) {
		grid-template-columns: auto minmax(0, 1fr) auto;
	}

	.guest-composer {
		grid-template-columns: minmax(0, 1fr) auto;
	}

	.composer-status-dot {
		position: absolute;
		left: 24px;
		top: -6px;
		width: 9px;
		height: 9px;
		border-radius: 9999px;
		background: #f59e0b;
		border: 2px solid var(--surface);
		box-shadow: 0 0 0 3px oklch(from #f59e0b l c h / 0.18);
		pointer-events: none;
		z-index: 3;
	}

	.composer-status-dot.online {
		background: #22c55e;
		box-shadow: 0 0 0 3px oklch(from #22c55e l c h / 0.18);
	}

	.composer-status-dot.error {
		background: #ef4444;
		box-shadow: 0 0 0 3px oklch(from #ef4444 l c h / 0.18);
	}

	.composer-notice {
		grid-column: 1 / -1;
		margin: -2px 4px 0;
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 800;
	}

	.guest-copy {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 0 3px;
		color: var(--text-muted);
	}

	.guest-copy span {
		flex-shrink: 0;
		font-size: 19px;
		color: var(--accent);
	}

	.guest-copy p {
		margin: 0;
		min-width: 0;
		font-size: 12px;
		font-weight: 800;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.login-chat-button {
		display: inline-flex;
		height: 40px;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		padding: 0 18px;
		color: #fff;
		background: linear-gradient(145deg, var(--accent), var(--accent-hover));
		box-shadow: 0 10px 24px var(--accent-glow);
		font-size: 12px;
		font-weight: 900;
	}

	.context-button {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		border: 1px solid var(--border-strong);
		background: var(--surface-offset);
		color: var(--accent);
		box-shadow: var(--shadow-sm);
	}

	.context-button:disabled {
		cursor: not-allowed;
		opacity: 0.42;
		box-shadow: none;
	}

	.context-button span {
		font-size: 23px;
	}

	.composer-input {
		position: relative;
		min-width: 0;
		height: 44px;
		display: flex;
		align-items: center;
		border-radius: 9999px;
		border: 1px solid var(--border-strong);
		background: var(--surface-offset);
		padding: 0 16px;
	}

	.composer-input input {
		user-select: text;
		min-width: 0;
		flex: 1;
		border: 0;
		outline: 0;
		background: transparent;
		font-size: 13px;
		color: var(--text-primary);
	}

	.composer-input input::placeholder {
		color: var(--text-faint);
	}

	.mention-suggestions {
		position: absolute;
		left: 0;
		right: 0;
		bottom: calc(100% + 10px);
		z-index: 12;
		display: grid;
		gap: 5px;
		max-height: 248px;
		overflow-y: auto;
		padding: 7px;
		border-radius: 18px;
		border: 1px solid var(--border);
		background: oklch(from var(--surface) l c h / 0.98);
		box-shadow: var(--shadow-lg);
		backdrop-filter: blur(18px) saturate(160%);
	}

	.mention-suggestions button,
	.mention-state {
		min-width: 0;
		display: grid;
		grid-template-columns: 34px minmax(0, 1fr) auto;
		align-items: center;
		gap: 9px;
		border-radius: 13px;
		padding: 7px;
		color: var(--text-primary);
		text-align: left;
	}

	.mention-suggestions button.active,
	.mention-suggestions button:hover {
		background: var(--surface-2);
	}

	.mention-avatar {
		width: 34px;
		height: 34px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 9999px;
		background: oklch(from var(--accent) l c h / 0.18);
		color: var(--accent);
		font-size: 12px;
		font-weight: 1000;
	}

	.mention-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.mention-copy {
		min-width: 0;
		display: grid;
		gap: 2px;
	}

	.mention-copy strong,
	.mention-copy small {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mention-copy strong {
		font-size: 12px;
		font-weight: 950;
	}

	.mention-copy small,
	.mention-state {
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 800;
	}

	.mention-verified {
		width: 14px;
		height: 14px;
	}

	.send-button {
		width: 44px;
		height: 44px;
		position: relative;
		color: #fff;
		background: linear-gradient(145deg, var(--accent), var(--accent-hover));
		box-shadow: 0 10px 24px var(--accent-glow);
	}

	.send-button.slowmode-active {
		gap: 0;
		background:
			linear-gradient(145deg, oklch(from var(--surface-2) calc(l + 0.05) c h), var(--surface-2)),
			var(--surface-2);
		border: 1px solid var(--border-strong);
		color: var(--text-secondary);
		box-shadow: none;
		opacity: 1;
	}

	.send-button.slowmode-active .material-symbols-rounded {
		font-size: 21px;
		transform: translateY(-5px);
	}

	.slowmode-count {
		position: absolute;
		left: 50%;
		bottom: 6px;
		transform: translateX(-50%);
		min-width: 18px;
		font-size: 10px;
		font-weight: 1000;
		line-height: 1;
		letter-spacing: 0;
		font-variant-numeric: tabular-nums;
	}

	.send-button:disabled {
		cursor: not-allowed;
		opacity: 0.45;
		box-shadow: none;
	}

	.send-button.slowmode-active:disabled {
		opacity: 1;
		box-shadow: none;
	}

	.selected-contexts {
		grid-column: 1 / -1;
		display: grid;
		gap: 8px;
	}

	.selected-context-card {
		position: relative;
		min-width: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 8px;
		padding: 7px;
		border-radius: 18px;
		border: 1px solid var(--border);
		background: oklch(from var(--surface-offset) l c h / 0.78);
		box-shadow: var(--shadow-sm);
		content-visibility: auto;
		contain-intrinsic-size: 64px;
	}

	.selected-context-link {
		grid-template-columns: 48px minmax(0, 1fr);
		border: 0;
		background: transparent;
	}

	.selected-context-card .context-thumb {
		width: 48px;
		height: 48px;
	}

	.remove-context,
	.sheet-close {
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		background: var(--surface);
		color: var(--text-muted);
		border: 1px solid var(--border);
	}

	.remove-context span,
	.sheet-close span {
		font-size: 18px;
	}

	.typing-bar {
		grid-column: 1 / -1;
		width: fit-content;
		display: flex;
		align-items: center;
		gap: 8px;
		margin: -2px 4px 0;
		padding: 7px 11px;
		border-radius: 9999px;
		border: 1px solid var(--border);
		background: oklch(from var(--surface-offset) l c h / 0.86);
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 800;
		box-shadow: var(--shadow-sm);
	}

	.typing-text {
		min-width: 0;
	}

	.typing-dots {
		display: inline-flex;
		align-items: center;
		gap: 3px;
	}

	.typing-dots span {
		width: 6px;
		height: 6px;
		border-radius: 9999px;
		background: var(--accent);
		animation: typing-dot 1s infinite ease-in-out;
	}

	.typing-dots span:nth-child(2) {
		animation-delay: 0.16s;
	}

	.typing-dots span:nth-child(3) {
		animation-delay: 0.32s;
	}

	@keyframes typing-dot {
		0%,
		80%,
		100% {
			opacity: 0.35;
			transform: translateY(0);
		}
		40% {
			opacity: 1;
			transform: translateY(-3px);
		}
	}

	.context-sheet-layer {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		background: oklch(from #000000 l c h / 0.46);
		padding: 0 14px max(12px, env(safe-area-inset-bottom));
	}

	.context-sheet {
		width: min(100%, 720px);
		height: 70vh;
		min-height: 0;
		display: flex;
		flex-direction: column;
		border-radius: 24px 24px 18px 18px;
		border: 1px solid var(--border);
		background:
			linear-gradient(145deg, oklch(from var(--accent) l c h / 0.1), transparent 42%),
			var(--surface);
		box-shadow: 0 -18px 54px oklch(from #000000 l c h / 0.35);
		overflow: hidden;
	}

	.context-sheet-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		padding: 16px 16px 10px;
	}

	.context-sheet-header strong {
		display: block;
		color: var(--text-primary);
		font-size: 15px;
		font-weight: 950;
	}

	.context-sheet-header p {
		margin: 3px 0 0;
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 800;
	}

	.context-search {
		margin: 0 16px 10px;
		height: 42px;
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 0 12px;
		border-radius: 16px;
		border: 1px solid var(--border-strong);
		background: var(--surface-offset);
		color: var(--text-muted);
	}

	.context-search span {
		font-size: 19px;
	}

	.context-search input {
		min-width: 0;
		flex: 1;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--text-primary);
		font-size: 13px;
	}

	.context-tabs {
		display: flex;
		gap: 8px;
		padding: 0 16px 12px;
		overflow-x: auto;
	}

	.context-source-tabs {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
		padding: 0 16px 10px;
	}

	.context-source-tabs button {
		min-width: 0;
		height: 42px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		border-radius: 16px;
		border: 1px solid var(--border);
		background: var(--surface-offset);
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 950;
	}

	.context-source-tabs button span {
		font-size: 17px;
	}

	.context-source-tabs button.active {
		color: #fff;
		border-color: transparent;
		background: linear-gradient(145deg, var(--accent), var(--accent-hover));
		box-shadow: 0 10px 24px var(--accent-glow);
	}

	.context-tabs button {
		flex: 0 0 auto;
		border-radius: 9999px;
		padding: 8px 13px;
		border: 1px solid var(--border);
		background: var(--surface-offset);
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 900;
	}

	.context-tabs button.active {
		color: #fff;
		border-color: transparent;
		background: linear-gradient(145deg, var(--accent), var(--accent-hover));
		box-shadow: 0 10px 24px var(--accent-glow);
	}

	.context-results {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: grid;
		align-content: start;
		gap: 9px;
		padding: 0 16px 16px;
	}

	.context-result {
		width: 100%;
		grid-template-columns: 82px minmax(0, 1fr) auto;
		min-height: 104px;
		padding: 12px;
		gap: 13px;
		text-align: left;
		border-color: var(--border);
		border-radius: 18px;
		background:
			linear-gradient(135deg, oklch(from var(--accent) l c h / 0.08), transparent 36%),
			oklch(from var(--surface-offset) l c h / 0.86);
		color: var(--text-primary);
		box-shadow: var(--shadow-sm);
		contain-intrinsic-size: 104px;
	}

	.context-result .context-thumb {
		width: 82px;
		height: 82px;
		border-radius: 18px;
		box-shadow: 0 10px 24px oklch(from #000000 l c h / 0.22);
	}

	.context-result .context-copy {
		gap: 6px;
		align-self: center;
	}

	.context-result .context-copy strong {
		font-size: 14px;
		line-height: 1.2;
	}

	.context-result .context-copy small {
		-webkit-line-clamp: 2;
		line-clamp: 2;
		font-size: 11.5px;
		line-height: 1.45;
	}

	.context-result .context-badge {
		padding: 3px 8px;
		font-size: 9.5px;
	}

	.pick-label {
		align-self: center;
		border-radius: 9999px;
		padding: 7px 10px;
		background: oklch(from var(--accent) l c h / 0.18);
		color: var(--accent);
		font-size: 10px;
		font-weight: 950;
	}

	.sheet-state {
		margin: 18px auto;
		width: min(100%, 380px);
		padding: 18px 16px;
		border-radius: 20px;
		border: 1px dashed var(--border);
		color: var(--text-muted);
		text-align: center;
		font-size: 12px;
		font-weight: 800;
	}

	.sheet-state span {
		display: inline-flex;
		margin-bottom: 8px;
		color: var(--accent);
	}

	.sheet-state strong,
	.sheet-state p {
		display: block;
		margin: 0;
	}

	.sheet-state strong {
		color: var(--text-primary);
	}

	.sheet-state p {
		margin-top: 4px;
	}

	.sheet-state.error {
		border-color: oklch(from #ef4444 l c h / 0.35);
		color: #ef4444;
	}

	@media (max-width: 767px) {
		.chat-page {
			height: calc(100dvh - 56px);
			margin-inline: 0;
		}

		.chat-shell {
			width: 100%;
			height: 100%;
			min-height: 0;
			border-left: 0;
			border-right: 0;
			border-radius: 0;
			box-shadow: none;
		}

		.chat-messages {
			padding: 18px 8px 18px 6px;
		}

		.message-stack {
			max-width: min(80%, 430px);
		}

		.chat-composer {
			padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
		}

		.context-sheet-layer {
			padding-inline: 0;
			padding-bottom: 0;
		}

		.context-sheet {
			width: 100%;
			border-radius: 22px 22px 0 0;
			border-left: 0;
			border-right: 0;
			border-bottom: 0;
		}

		.context-result {
			grid-template-columns: 76px minmax(0, 1fr) auto;
			min-height: 96px;
			padding: 10px;
			gap: 12px;
		}

		.context-result .context-thumb {
			width: 76px;
			height: 76px;
		}

		.pick-label {
			display: none;
		}
	}
</style>
