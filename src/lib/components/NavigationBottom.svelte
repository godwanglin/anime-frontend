<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { page } from '$app/stores';
	import { onDestroy } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { chatPresence } from '$lib/stores/chat-presence.svelte';

	const navItems = [
		{ href: '/', icon: 'home', label: 'Home' },
		{ href: '/short', icon: 'smart_display', label: 'Short' },
		{ href: '/chat', icon: 'forum', label: 'Chat', floating: true },
		{ href: '/browse', icon: 'explore', label: 'Jelajah' },
		{ href: '/profile', icon: 'person', label: 'Profil' }
	];

	function isActive(href: string) {
		if (href === '/') return $page.url.pathname === '/';
		return $page.url.pathname.startsWith(href);
	}

	$effect(() => {
		auth.isLoggedIn;
		auth.accessToken;
		chatPresence.setRoute($page.url.pathname);
	});

	onDestroy(() => {
		chatPresence.disconnect();
	});
</script>

<!-- BOTTOM NAV - mobile -->
<nav class="fixed bottom-0 left-0 right-0 z-40 md:hidden pointer-events-none">
	<div class="px-3 pb-[max(env(safe-area-inset-bottom),0.65rem)]">
		<div class="bottom-nav-dock pointer-events-auto mx-auto grid max-w-[520px] grid-cols-5 px-2">
			{#each navItems as item}
				{#if item.floating}
					<span class="bottom-nav-slot" aria-hidden="true"></span>
					<a
						href={item.href}
						class="bottom-nav-item bottom-nav-chat group px-1 text-[10px] font-bold transition active:scale-95"
						style="color: {isActive(item.href) ? 'var(--accent)' : 'var(--text-faint)'};"
						aria-current={isActive(item.href) ? 'page' : undefined}
					>
						<span class="bottom-nav-chat-bubble">
							<svg
								class="bottom-nav-chat-symbol"
								viewBox="0 0 24 24"
								aria-hidden="true"
								fill="none"
							>
								<path
									d="M7.5 8.5h9M7.5 12h5.2M8.2 17.2H7c-2.2 0-4-1.8-4-4V7.8c0-2.2 1.8-4 4-4h10c2.2 0 4 1.8 4 4v5.4c0 2.2-1.8 4-4 4h-4.8L8.7 20c-.2.2-.5 0-.5-.3v-2.5Z"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
						{#if chatPresence.mentionCount > 0}
							<span class="bottom-nav-mention-badge" aria-label={`${chatPresence.mentionCount} mention chat`}>
								@{Math.min(chatPresence.mentionCount, 99)}
							</span>
						{/if}
						{#if chatPresence.unreadCount > 0}
							<span class="bottom-nav-unread-badge" aria-label={`${chatPresence.unreadCount} pesan chat baru`}>
								{Math.min(chatPresence.unreadCount, 99)}
							</span>
						{/if}
						<span class="sr-only">{item.label}</span>
					</a>
				{:else}
					<a
						href={item.href}
						class="bottom-nav-item group relative min-w-0 px-1 text-[10px] font-bold transition active:scale-95"
						style="color: {isActive(item.href) ? 'var(--accent)' : 'var(--text-faint)'};"
						aria-current={isActive(item.href) ? 'page' : undefined}
					>
						<AppIcon name={item.icon} class="bottom-nav-icon flex items-center justify-center transition"
							style="font-size: 22px;" />
						<span class="bottom-nav-label max-w-full truncate">{item.label}</span>
					</a>
				{/if}
			{/each}
		</div>
	</div>
</nav>

<style>
	.bottom-nav-dock {
		position: relative;
		height: 60px;
		border-radius: 9999px;
		background: oklch(from var(--surface) l c h / 0.9);
		border: 1px solid var(--border);
		box-shadow:
			0 18px 50px oklch(0 0 0 / 0.28),
			inset 0 1px 0 oklch(from #ffffff l c h / 0.08);
		backdrop-filter: blur(22px) saturate(180%);
		-webkit-backdrop-filter: blur(22px) saturate(180%);
	}

	.bottom-nav-dock::before {
		content: '';
		position: absolute;
		top: -15px;
		left: 50%;
		width: 86px;
		height: 58px;
		transform: translateX(-50%);
		border-radius: 9999px;
		background: var(--accent-glow);
		filter: blur(22px);
		opacity: 0.9;
		pointer-events: none;
	}

	.bottom-nav-item {
		position: relative;
		z-index: 1;
		display: flex;
		height: 100%;
		min-height: 60px;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		line-height: 1;
	}

	:global(.bottom-nav-icon) {
		line-height: 1;
		font-variation-settings:
			'FILL' 0,
			'wght' 450,
			'GRAD' 0,
			'opsz' 24;
	}

	.bottom-nav-label {
		display: block;
		line-height: 1;
	}

	.bottom-nav-slot {
		min-height: 60px;
	}

	.bottom-nav-chat {
		position: absolute;
		z-index: 2;
		top: -23px;
		left: 50%;
		width: 76px;
		height: 84px;
		min-height: 84px;
		justify-content: flex-start;
		gap: 5px;
		transform: translateX(-50%);
		color: #fff !important;
	}

	.bottom-nav-chat-bubble {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 62px;
		height: 62px;
		flex-shrink: 0;
		border-radius: 9999px;
		background:
			linear-gradient(145deg, oklch(from var(--accent) calc(l + 0.08) c h), var(--accent-hover)),
			var(--accent);
		border: 1px solid oklch(from #ffffff l c h / 0.28);
		box-shadow:
			0 18px 34px var(--accent-glow),
			0 12px 28px oklch(0 0 0 / 0.34),
			inset 0 1px 0 oklch(from #ffffff l c h / 0.34);
	}

	.bottom-nav-chat-symbol {
		width: 28px;
		height: 28px;
		color: #fff;
		opacity: 1;
		transform: translate(1px, 1px);
		filter: drop-shadow(0 2px 8px oklch(0 0 0 / 0.24));
	}

	.bottom-nav-unread-badge,
	.bottom-nav-mention-badge {
		position: absolute;
		z-index: 3;
		top: 3px;
		min-width: 19px;
		height: 19px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		padding: 0 5px;
		border: 2px solid var(--surface);
		color: #fff;
		font-size: 9px;
		font-weight: 1000;
		line-height: 1;
		box-shadow: 0 8px 18px oklch(0 0 0 / 0.28);
	}

	.bottom-nav-unread-badge {
		right: 7px;
		background: oklch(0.72 0.17 34);
	}

	.bottom-nav-mention-badge {
		left: 5px;
		background: var(--accent);
		box-shadow:
			0 8px 18px var(--accent-glow),
			0 8px 18px oklch(0 0 0 / 0.22);
	}

	.bottom-nav-chat span:last-child {
		color: var(--accent);
		line-height: 1;
		text-shadow: 0 1px 14px var(--accent-glow);
	}
</style>
