<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import SearchDropdown from '$lib/components/SearchDropdown.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { history } from '$lib/stores/history.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { preference } from '$lib/stores/preference.svelte';
	import { saved as savedStore } from '$lib/stores/saved.svelte';
	import { pageTitle } from '$lib/stores/page.svelte';

	let { children } = $props();

	let isDark = $state(false);
	let sidebarOpen = $state(false); // mobile drawer
	let searchQuery = $state('');
	let searchOpen = $state(false);
	let searchWrapperEl = $state<HTMLDivElement>();
	let searchInputEl = $state<HTMLInputElement>();

	let siteConfig = $derived(($page.data.siteConfig ?? {}) as Record<string, string>);
	let siteName = $derived(siteConfig['site.name'] ?? 'AniMe');
	let siteLogo = $derived(siteConfig['site.logo'] ?? '/icon.png');

	let isHomePage = $derived($page.url.pathname === '/');
	let isAnimePage = $derived($page.url.pathname.startsWith('/anime/'));

	let animeAppBarTitle = $derived(
		(($page.data?.episode as { title?: string } | null | undefined)?.title ??
			($page.data?.anime as { title?: string } | null | undefined)?.title ??
			'Anime') as string
	);
	let mobilePageTitle = $derived(pageTitle.value || animeAppBarTitle || siteName);

	const mainNav = [
		{ href: '/', icon: 'home', label: 'Beranda' },
		{ href: '/browse', icon: 'explore', label: 'Jelajahi' },
		{ href: '/popular', icon: 'local_fire_department', label: 'Populer' },
		{ href: '/genre', icon: 'category', label: 'Genre' },
		{ href: '/episode-baru', icon: 'fiber_new', label: 'Episode Baru' },
		{ href: '/profile', icon: 'person', label: 'Profil' }
	];
	const collectionNav = [
		{ href: '/profile/history', icon: 'history', label: 'Riwayat' },
		{ href: '/profile/saved', icon: 'bookmark', label: 'Tersimpan' }
	];

	function isActive(href: string) {
		if (href === '/') return $page.url.pathname === '/';
		return $page.url.pathname.startsWith(href);
	}

	function applyTheme(dark: boolean) {
		document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
		isDark = dark;
	}
	function toggleTheme() {
		applyTheme(!isDark);
	}

	function goBack() {
		window.history.length > 1 ? window.history.back() : goto('/');
	}

	function goToNotifications() {
		goto('/notifications');
	}

	async function claimOpenAppExp() {
		if (!auth.isLoggedIn) return;
		const response = await auth.authFetch('/api/exp/open-app', {
			method: 'POST',
			body: JSON.stringify({})
		});
		if (response.ok) await auth.fetchMe();
	}

	function onSearchInput() {
		searchOpen = searchQuery.trim().length > 0;
	}
	function onSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			searchOpen = false;
			searchQuery = '';
		}
		if (e.key === 'Enter' && searchQuery.trim()) {
			goto(`/search?q=${encodeURIComponent(searchQuery)}`);
			searchOpen = false;
			searchQuery = '';
		}
	}
	function onDocClick(e: MouseEvent) {
		if (searchOpen && searchWrapperEl && !searchWrapperEl.contains(e.target as Node)) {
			searchOpen = false;
		}
	}

	onMount(() => {
		const saved = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		applyTheme(saved ? saved === 'dark' : prefersDark);
		auth.startAutoRefresh();
		auth.fetchMe().then(async () => {
			await claimOpenAppExp().catch(() => null);
			await preference.fetchPreference();
			if (auth.isLoggedIn) {
				await Promise.all([
					history.fetchHistory(),
					savedStore.fetchSaved(),
					notifications.fetchNotifications().catch(() => null),
					notifications.fetchPreferences().catch(() => null)
				]);
				notifications.startPolling();
			}
			isDark = document.documentElement.getAttribute('data-theme') === 'dark';
		});
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	});
</script>

<!--
    ══════════════════════════════════════════════════
    ROOT SHELL
    ══════════════════════════════════════════════════
-->
<div
	class="min-h-screen max-w-full"
	style="background: var(--page-bg, var(--color-bg)); color: var(--text-primary);"
>
	<!-- ══════════════════════════════════════════════
         MOBILE SIDEBAR DRAWER — slides from left
    ══════════════════════════════════════════════ -->
	{#if sidebarOpen}
		<!-- Backdrop -->
		<button
			class="fixed inset-0 z-40 md:hidden"
			style="background: oklch(0 0 0 / 0.55); backdrop-filter: blur(4px);"
			onclick={() => (sidebarOpen = false)}
			aria-label="Tutup menu"
		></button>

		<!-- Drawer -->
		<nav
			class="fixed top-0 left-0 z-50 h-full w-72 flex flex-col md:hidden"
			style="
                background: var(--surface);
                border-right: 1px solid var(--border);
                box-shadow: 8px 0 32px oklch(0 0 0 / 0.25);
                animation: slideInLeft 0.28s cubic-bezier(0.16, 1, 0.3, 1);
            "
		>
			<!-- Drawer header -->
			<div
				class="flex items-center justify-between px-5 h-16 shrink-0"
				style="border-bottom: 1px solid var(--border);"
			>
				<a href="/" onclick={() => (sidebarOpen = false)} class="flex items-center gap-2.5">
					<img
						src={siteLogo}
						alt={siteName}
						class="h-8 w-8 rounded-[var(--radius-lg)] object-contain"
						style="background: var(--accent-surface);"
					/>
					<span class="text-[17px] font-black tracking-tight" style="color: var(--text-primary);">
						{siteName}
					</span>
				</a>
				<button
					onclick={() => (sidebarOpen = false)}
					class="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
					style="color: var(--text-faint);"
					aria-label="Tutup"
				>
					<span class="material-symbols-rounded" style="font-size:20px;">close</span>
				</button>
			</div>

			<!-- User chip if logged in -->
			{#if auth.isLoggedIn}
				<a
					href="/profile"
					onclick={() => (sidebarOpen = false)}
					class="mx-4 mt-4 flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-xl)] transition-colors"
					style="background: var(--accent-surface); border: 1px solid oklch(from var(--accent) l c h / 0.2);"
				>
					<img
						src={auth.user?.avatar ||
							`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(auth.user?.username ?? 'A')}&backgroundColor=7c3aed`}
						alt={auth.user?.username}
						class="w-9 h-9 rounded-full object-cover shrink-0"
					/>
					<div class="min-w-0 flex-1">
						<p
							class="flex items-center gap-1.5 text-[13px] font-black truncate"
							style="color: var(--text-primary);"
						>
							<span class="truncate">{auth.user?.username}</span>
							{#if auth.user?.isVerified}
								<img
									src="/badges/verify.png"
									alt="Verified"
									class="h-3.5 w-3.5 shrink-0 object-contain"
								/>
							{/if}
						</p>
						<p class="text-[10px] truncate" style="color: var(--text-faint);">
							{auth.user?.email}
						</p>
					</div>
					<span
						class="material-symbols-rounded shrink-0"
						style="font-size:16px; color: var(--accent);"
					>
						chevron_right
					</span>
				</a>
			{:else}
				<a
					href="/login"
					onclick={() => (sidebarOpen = false)}
					class="mx-4 mt-4 h-11 flex items-center justify-center gap-2 rounded-[var(--radius-xl)] text-[13px] font-black text-white transition-all"
					style="background: var(--accent); box-shadow: 0 4px 12px var(--accent-glow);"
				>
					<span class="material-symbols-rounded" style="font-size:16px;">login</span>
					Masuk
				</a>
			{/if}

			<!-- Nav links -->
			<div class="flex-1 overflow-y-auto px-3 pt-4 pb-6 space-y-0.5">
				{#each mainNav as item}
					<a
						href={item.href}
						onclick={() => (sidebarOpen = false)}
						class="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-xl)] text-[13px] font-bold transition-all"
						style="
                            background: {isActive(item.href)
							? 'var(--accent-surface)'
							: 'transparent'};
                            color: {isActive(item.href)
							? 'var(--accent-text)'
							: 'var(--text-muted)'};
                            border: 1px solid {isActive(item.href)
							? 'oklch(from var(--accent) l c h / 0.18)'
							: 'transparent'};
                        "
					>
						<span class="material-symbols-rounded" style="font-size:20px;">{item.icon}</span>
						{item.label}
					</a>
				{/each}

				<p
					class="text-[9px] font-black uppercase tracking-[0.2em] px-3 pt-4 pb-1.5"
					style="color: var(--text-faint);"
				>
					Koleksi
				</p>
				{#each collectionNav as item}
					<a
						href={item.href}
						onclick={() => (sidebarOpen = false)}
						class="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-xl)] text-[13px] font-bold transition-all"
						style="
                            background: {isActive(item.href)
							? 'var(--accent-surface)'
							: 'transparent'};
                            color: {isActive(item.href)
							? 'var(--accent-text)'
							: 'var(--text-muted)'};
                            border: 1px solid {isActive(item.href)
							? 'oklch(from var(--accent) l c h / 0.18)'
							: 'transparent'};
                        "
					>
						<span class="material-symbols-rounded" style="font-size:20px;">{item.icon}</span>
						{item.label}
					</a>
				{/each}
			</div>

			<!-- Theme toggle di bawah drawer -->
			<div class="px-4 pb-6 pt-2 shrink-0" style="border-top: 1px solid var(--border);">
				<button
					onclick={toggleTheme}
					class="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-xl)] text-[13px] font-bold transition-all"
					style="background: var(--surface-offset); color: var(--text-muted);"
				>
					<span class="material-symbols-rounded" style="font-size:20px;">
						{isDark ? 'light_mode' : 'dark_mode'}
					</span>
					{isDark ? 'Mode Terang' : 'Mode Gelap'}
				</button>
			</div>
		</nav>
	{/if}

	<!-- ══════════════════════════════════════════════
         TOPBAR
    ══════════════════════════════════════════════ -->
	<header
		class="fixed left-0 right-0 top-0 z-30 w-full"
		style="
        background: oklch(from var(--surface) l c h / 0.82);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border-bottom: 1px solid var(--border);
        box-shadow: 0 1px 0 var(--border), 0 4px 16px oklch(0 0 0 / 0.04);
    	"
	>
		<!-- ── DESKTOP TOPBAR ── -->
		<div class="hidden md:flex max-w-7xl mx-auto px-5 h-[60px] items-center gap-4">
			<!-- Logo -->
			<a href="/" class="flex items-center gap-2.5 shrink-0 group">
				<div
					class="h-10 rounded-[var(--radius-lg)] overflow-hidden flex items-center justify-center transition-transform duration-200 group-hover:scale-95"
				>
					<img src={siteLogo} alt={siteName} class="w-full h-full object-contain" />
				</div>
				<!-- <span class="text-[16px] font-black tracking-tight" style="color: var(--text-primary);">
					{siteName}
				</span> -->
			</a>

			<!-- Search bar -->
			<div bind:this={searchWrapperEl} class="relative flex-1 max-w-md mx-2">
				<div
					class="relative flex items-center rounded-[var(--radius-xl)] overflow-hidden transition-all duration-200"
					style="
                        background: var(--surface-offset);
                        border: 1px solid var(--border-strong);
                        box-shadow: var(--shadow-sm);
                    "
				>
					<span
						class="material-symbols-rounded absolute left-3 pointer-events-none"
						style="font-size:17px; color: var(--text-faint);"
					>
						search
					</span>
					<input
						bind:this={searchInputEl}
						bind:value={searchQuery}
						oninput={onSearchInput}
						onkeydown={onSearchKeydown}
						onfocus={() => {
							if (searchQuery.trim()) searchOpen = true;
						}}
						type="search"
						placeholder="Cari anime..."
						class="w-full h-9 pl-9 pr-4 text-[13px] bg-transparent outline-none"
						style="color: var(--text-primary);"
					/>
				</div>
				{#if searchOpen && searchQuery.trim()}
					<SearchDropdown
						query={searchQuery}
						onClose={() => {
							searchOpen = false;
							searchQuery = '';
						}}
					/>
				{/if}
			</div>

			<!-- Right actions -->
			<div class="flex items-center gap-1.5 shrink-0 ml-auto">
				<button
					onclick={goToNotifications}
					aria-label="Buka notifikasi"
					class="relative flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90"
					style="color: var(--text-muted);"
				>
					<span class="material-symbols-rounded" style="font-size:20px;">notifications</span>
					{#if notifications.unreadCount > 0}
						<span
							class="absolute -right-1 -top-1 min-w-[18px] rounded-full px-1 py-0.5 text-center text-[9px] font-black text-white"
							style="background: var(--accent); box-shadow: 0 2px 8px var(--accent-glow);"
						>
							{Math.min(notifications.unreadCount, 99)}
						</span>
					{/if}
				</button>

				<!-- Theme toggle -->
				<button
					onclick={toggleTheme}
					aria-label="Toggle tema"
					class="w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90"
					style="color: var(--text-muted);"
				>
					<span class="material-symbols-rounded" style="font-size:20px;">
						{isDark ? 'light_mode' : 'dark_mode'}
					</span>
				</button>

				<!-- Auth pill -->
				<a
					href={auth.isLoggedIn ? '/profile' : '/login'}
					class="flex items-center gap-2 h-9 px-3.5 rounded-full text-[12px] font-black text-white transition-all active:scale-[0.97]"
					style="background: var(--accent); box-shadow: 0 2px 8px var(--accent-glow);"
				>
					{#if auth.isLoggedIn}
						<img
							src={auth.user?.avatar ||
								`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(auth.user?.username ?? 'A')}&backgroundColor=7c3aed`}
							alt={auth.user?.username}
							class="w-5 h-5 rounded-full object-cover"
						/>
						<span class="flex max-w-[96px] items-center gap-1.5 truncate">
							<span class="truncate">{auth.user?.username}</span>
							{#if auth.user?.isVerified}
								<img
									src="/badges/verify.png"
									alt="Verified"
									class="h-3.5 w-3.5 shrink-0 object-contain"
								/>
							{/if}
						</span>
					{:else}
						<span class="material-symbols-rounded" style="font-size:15px;">login</span>
						Masuk
					{/if}
				</a>
			</div>
		</div>

		<!-- ── MOBILE TOPBAR — homepage ── -->
		{#if isHomePage}
			<div class="md:hidden px-4 h-[56px] flex items-center justify-between gap-3">
				<a href="/" class="flex items-center gap-2 shrink-0">
					<div class="h-8 rounded-[var(--radius-lg)] overflow-hidden">
						<img src={siteLogo} alt={siteName} class="w-full h-full object-contain" />
					</div>
					<!-- <span class="text-[17px] font-black tracking-tight" style="color: var(--text-primary);">
						{siteName}
					</span> -->
				</a>

				<div class="flex items-center gap-1">
					<button
						onclick={goToNotifications}
						class="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors"
						style="color: var(--text-muted);"
						aria-label="Buka notifikasi"
					>
						<span class="material-symbols-rounded" style="font-size:20px;">notifications</span>
						{#if notifications.unreadCount > 0}
							<span
								class="absolute -right-1 -top-1 min-w-[18px] rounded-full px-1 py-0.5 text-center text-[9px] font-black text-white"
								style="background: var(--accent); box-shadow: 0 2px 8px var(--accent-glow);"
							>
								{Math.min(notifications.unreadCount, 99)}
							</span>
						{/if}
					</button>
					<button
						onclick={toggleTheme}
						class="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
						style="color: var(--text-muted);"
						aria-label="Toggle tema"
					>
						<span class="material-symbols-rounded" style="font-size:20px;">
							{isDark ? 'light_mode' : 'dark_mode'}
						</span>
					</button>
					<button
						onclick={() => (sidebarOpen = true)}
						class="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
						style="color: var(--text-muted);"
						aria-label="Buka menu"
					>
						<span class="material-symbols-rounded" style="font-size:22px;">menu</span>
					</button>
				</div>
			</div>
			<!-- Mobile search bar di bawah header -->
			<div class="md:hidden px-4 pb-3">
				<button
					onclick={() => goto('/search')}
					class="w-full h-9 flex items-center gap-2 pl-9 pr-4 rounded-[var(--radius-xl)] text-[13px] relative text-left transition-colors"
					style="
                        background: var(--surface-offset);
                        border: 1px solid var(--border-strong);
                        color: var(--text-faint);
                    "
				>
					<span
						class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
						style="font-size:17px; color: var(--text-faint);"
					>
						search
					</span>
					Cari anime...
				</button>
			</div>
		{:else}
			<!-- ── MOBILE TOPBAR — inner pages ── -->
			<div class="md:hidden px-3 h-[56px] flex items-center gap-2">
				<!-- Back button -->
				<button
					onclick={goBack}
					class="shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90"
					style="
                        background: var(--surface);
                        border: 1px solid var(--border-strong);
                        color: var(--text-muted);
                        box-shadow: var(--shadow-sm);
                    "
					aria-label="Kembali"
				>
					<span class="material-symbols-rounded" style="font-size:20px;">arrow_back</span>
				</button>

				<!-- Page title -->
				<p
					class="flex-1 min-w-0 text-[14px] font-black truncate {isAnimePage
						? 'text-left'
						: 'text-center'}"
					style="color: var(--text-primary);"
				>
					{mobilePageTitle}
				</p>

				<button
					onclick={goToNotifications}
					class="relative shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90"
					style="
                        background: var(--surface);
                        border: 1px solid var(--border-strong);
                        color: var(--text-muted);
                        box-shadow: var(--shadow-sm);
                    "
					aria-label="Buka notifikasi"
				>
					<span class="material-symbols-rounded" style="font-size:19px;">notifications</span>
					{#if notifications.unreadCount > 0}
						<span
							class="absolute -right-1 -top-1 min-w-[18px] rounded-full px-1 py-0.5 text-center text-[9px] font-black text-white"
							style="background: var(--accent); box-shadow: 0 2px 8px var(--accent-glow);"
						>
							{Math.min(notifications.unreadCount, 99)}
						</span>
					{/if}
				</button>

				<!-- Theme toggle -->
				<button
					onclick={toggleTheme}
					class="shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90"
					style="
                        background: var(--surface);
                        border: 1px solid var(--border-strong);
                        color: var(--text-muted);
                        box-shadow: var(--shadow-sm);
                    "
					aria-label="Toggle tema"
				>
					<span class="material-symbols-rounded" style="font-size:19px;">
						{isDark ? 'light_mode' : 'dark_mode'}
					</span>
				</button>
			</div>
		{/if}
	</header>
	<div class={isHomePage ? 'h-[104px] md:h-[60px]' : 'h-[56px] md:h-[60px]'}></div>

	<!-- ══════════════════════════════════════════════
         BODY — sidebar (desktop) + main content
    ══════════════════════════════════════════════ -->
	<div class="mx-auto flex w-full min-w-0 max-w-full md:max-w-7xl relative z-10">
		<!-- ── DESKTOP SIDEBAR ── -->
		<aside
			class="hidden md:flex flex-col w-[220px] shrink-0 self-start sticky top-15 h-[calc(100dvh-60px)] overflow-y-auto py-5 px-3"
			style="border-right: 1px solid var(--border);"
		>
			<nav class="flex flex-col gap-0.5">
				{#each mainNav as item}
					<a
						href={item.href}
						class="group flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-xl)] text-[13px] font-bold transition-all duration-150"
						style="
                            background: {isActive(item.href)
							? 'var(--accent-surface)'
							: 'transparent'};
                            color: {isActive(item.href)
							? 'var(--accent-text)'
							: 'var(--text-muted)'};
                            border: 1px solid {isActive(item.href)
							? 'oklch(from var(--accent) l c h / 0.18)'
							: 'transparent'};
                        "
					>
						<!--
                            Active indicator dot + icon color shift.
                            Icon gets accent color when active.
                        -->
						<span
							class="material-symbols-rounded transition-colors"
							style="font-size:20px; color: {isActive(item.href)
								? 'var(--accent)'
								: 'var(--text-faint)'};"
						>
							{item.icon}
						</span>
						{item.label}
						{#if isActive(item.href)}
							<span
								class="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
								style="background: var(--accent);"
							></span>
						{/if}
					</a>
				{/each}

				<!-- Collection section -->
				<p
					class="text-[9px] font-black uppercase tracking-[0.2em] px-3 pt-5 pb-1.5"
					style="color: var(--text-faint);"
				>
					Koleksi
				</p>
				{#each collectionNav as item}
					<a
						href={item.href}
						class="group flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-xl)] text-[13px] font-bold transition-all duration-150"
						style="
                            background: {isActive(item.href)
							? 'var(--accent-surface)'
							: 'transparent'};
                            color: {isActive(item.href)
							? 'var(--accent-text)'
							: 'var(--text-muted)'};
                            border: 1px solid {isActive(item.href)
							? 'oklch(from var(--accent) l c h / 0.18)'
							: 'transparent'};
                        "
					>
						<span
							class="material-symbols-rounded"
							style="font-size:20px; color: {isActive(item.href)
								? 'var(--accent)'
								: 'var(--text-faint)'};"
						>
							{item.icon}
						</span>
						{item.label}
						{#if isActive(item.href)}
							<span class="ml-auto w-1.5 h-1.5 rounded-full" style="background: var(--accent);"
							></span>
						{/if}
					</a>
				{/each}
			</nav>

			<!-- Sidebar footer — preferences shortcut -->
			<div class="mt-auto pt-4" style="border-top: 1px solid var(--border);">
				<a
					href="/profile/preferences"
					class="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-xl)] text-[12px] font-bold transition-all"
					style="color: var(--text-faint);"
				>
					<span class="material-symbols-rounded" style="font-size:18px;">tune</span>
					Preferensi
				</a>
			</div>
		</aside>

		<!-- ── MAIN CONTENT ── -->
		<main class="flex-1 min-w-0 max-w-full overflow-x-clip px-4 py-5 pb-28 md:pb-8">
			{@render children()}
		</main>
	</div>
</div>

<style>
	/* ── Blob slow drift animation (opsional, sangat subtle) ── */
	@keyframes blobDrift {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(20px, -15px) scale(1.03);
		}
		66% {
			transform: translate(-10px, 20px) scale(0.97);
		}
	}

	/* Apply ke blob jika mau bergerak pelan — uncomment kalau mau */
	/*
.ambient-blob {
    animation: blobDrift 18s ease-in-out infinite;
}
.ambient-blob:nth-child(2) { animation-delay: -6s; }
.ambient-blob:nth-child(3) { animation-delay: -12s; }
*/

	@media (prefers-reduced-motion: reduce) {
		.ambient-blob {
			animation: none !important;
		}
	}

	/* ── Drawer slide-in animation ── */
	@keyframes slideInLeft {
		from {
			transform: translateX(-100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	/* ── Search input — remove browser default X button & outline ── */
	input[type='search']::-webkit-search-cancel-button {
		display: none;
	}
	input[type='search']::-webkit-search-decoration {
		display: none;
	}
	input[type='search']:focus {
		outline: none;
	}

	/* ── Sidebar scrollbar (ultra-thin) ── */
	aside::-webkit-scrollbar {
		width: 3px;
	}
	aside::-webkit-scrollbar-track {
		background: transparent;
	}
	aside::-webkit-scrollbar-thumb {
		background: var(--border-strong);
		border-radius: 9999px;
	}

	/* ── Nav link hover (not active) ── */
	a[href]:not([style*='accent-surface']):hover {
		background: var(--surface-offset) !important;
		color: var(--text-primary) !important;
	}
</style>
