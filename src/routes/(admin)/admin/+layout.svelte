<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import AdminToast from '$lib/components/admin/AdminToast.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { imageUploader } from '$lib/stores/image-uploader.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';
	import type { AppNotification } from '$lib/stores/notifications.svelte';
	import { displayUserName, userInitial } from '$lib/user-display';

	type AdminUser = {
		id?: number;
		email?: string;
		username?: string;
		fullName?: string | null;
		avatar?: string | null;
		role?: string;
	};

	type NavItem = {
		href: string;
		icon: string;
		label: string;
	};

	type NavGroup = {
		id: string;
		icon: string;
		label: string;
		items: NavItem[];
	};

	let { data, children } = $props();
	let sidebarOpen = $state(false);
	let notificationPanelOpen = $state(false);
	let selectedNotificationCategory = $state('all');
	let collapsedGroups = $state<Record<string, boolean>>({});
	const adminUser = $derived((data.adminUser ?? {}) as AdminUser);
	const adminDisplayName = $derived(displayUserName(adminUser, 'Admin'));
	const siteConfig = $derived((page.data.siteConfig ?? {}) as Record<string, string>);
	const siteName = $derived(siteConfig['site.name'] ?? 'AniStream');
	const siteLogo = $derived(siteConfig['site.logo'] ?? '/icon.png');
	const currentPath = $derived(page.url.pathname);
	const title = $derived(currentPath.split('/').filter(Boolean).at(-1) ?? 'dashboard');
	const filteredNotifications = $derived(
		selectedNotificationCategory === 'all'
			? notifications.items
			: notifications.items.filter((item) => item.category === selectedNotificationCategory)
	);
	const notificationCategories = $derived([
		{
			value: 'all',
			label: 'Semua',
			count: notifications.items.length,
			unread: notifications.unreadCount
		},
		...Array.from(new Set(notifications.items.map((item) => item.category))).map((category) => {
			const items = notifications.items.filter((item) => item.category === category);
			return {
				value: category,
				label: notificationCategoryLabel(category),
				count: items.length,
				unread: items.filter((item) => !item.isRead).length
			};
		})
	]);

	const navGroups: NavGroup[] = [
		{
			id: 'overview',
			icon: 'dashboard',
			label: 'Overview',
			items: [{ href: '/admin', icon: 'dashboard', label: 'Dashboard' }]
		},
		{
			id: 'ops',
			icon: 'tune',
			label: 'Operasional',
			items: [
				{ href: '/admin/analytics', icon: 'monitoring', label: 'Analytics' },
				{ href: '/admin/health', icon: 'health_metrics', label: 'Health' },
				{ href: '/admin/jobs', icon: 'manufacturing', label: 'Jobs' },
				{ href: '/admin/activity', icon: 'person_search', label: 'User Activity' },
				{ href: '/admin/mailserver', icon: 'alternate_email', label: 'Mail Server' }
			]
		},
		{
			id: 'content',
			icon: 'movie',
			label: 'Konten',
			items: [
				{ href: '/admin/anime', icon: 'movie', label: 'Anime' },
				{ href: '/admin/episodes', icon: 'video_library', label: 'Episode' },
				{ href: '/admin/r2-videos', icon: 'storage', label: 'R2 Videos' },
				{ href: '/admin/youtube-tools', icon: 'smart_display', label: 'YouTube Tools' },
				{ href: '/admin/scraping-progress', icon: 'monitor_heart', label: 'Scraping Monitor' },
				{ href: '/admin/sokuja-scraper', icon: 'travel_explore', label: 'Sokuja Scraper' },
				{ href: '/admin/subtitle-studio', icon: 'subtitles', label: 'Subtitle Studio' }
			]
		},
		{
			id: 'community',
			icon: 'groups',
			label: 'Komunitas',
			items: [
				{ href: '/admin/users', icon: 'group', label: 'User' },
				{ href: '/admin/notifications', icon: 'campaign', label: 'Notifications' },
				{ href: '/admin/chat', icon: 'forum', label: 'Chat' },
				{ href: '/admin/support', icon: 'support_agent', label: 'Support' },
				{ href: '/admin/comments', icon: 'forum', label: 'Komentar' },
				{ href: '/admin/comment-reports', icon: 'flag', label: 'Laporan Komentar' },
				{ href: '/admin/episode-reports', icon: 'report', label: 'Laporan Episode' }
			]
		},
		{
			id: 'settings',
			icon: 'settings',
			label: 'Settings',
			items: [
				{ href: '/admin/decorations', icon: 'auto_awesome', label: 'Decorations' },
				{ href: '/admin/site-config', icon: 'settings', label: 'Site Config' }
			]
		}
	];

	async function logout() {
		await auth.logout();
		goto('/login');
	}

	function isNavActive(item: NavItem) {
		return (
			currentPath === item.href || (item.href !== '/admin' && currentPath.startsWith(item.href))
		);
	}

	function isGroupActive(group: NavGroup) {
		return group.items.some(isNavActive);
	}

	function isGroupOpen(group: NavGroup) {
		return collapsedGroups[group.id] ?? isGroupActive(group);
	}

	function toggleGroup(group: NavGroup) {
		collapsedGroups = { ...collapsedGroups, [group.id]: !isGroupOpen(group) };
	}

	function notificationCategoryLabel(value: string) {
		const labels: Record<string, string> = {
			announcement: 'Pengumuman',
			content_new: 'Konten Baru',
			content_update: 'Update Konten',
			personal_activity: 'Aktivitas',
			watch_reminder: 'Reminder',
			account_security: 'Keamanan',
			account_system: 'Sistem Akun',
			admin_operational: 'Admin'
		};
		return (
			labels[value] ?? value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
		);
	}

	function notificationCategoryIcon(value: string) {
		const icons: Record<string, string> = {
			announcement: 'campaign',
			content_new: 'new_releases',
			content_update: 'update',
			personal_activity: 'alternate_email',
			watch_reminder: 'schedule',
			account_security: 'shield',
			account_system: 'manage_accounts',
			admin_operational: 'admin_panel_settings'
		};
		return icons[value] ?? 'notifications';
	}

	function notificationTime(value: string) {
		return new Date(value).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function toggleNotificationPanel() {
		notificationPanelOpen = !notificationPanelOpen;
		if (notificationPanelOpen) {
			await notifications.fetchNotifications().catch(() => null);
		}
	}

	async function openNotification(item: AppNotification) {
		if (!item.isRead) {
			await notifications.markAsRead(item.id).catch(() => null);
		}
		if (item.link) {
			notificationPanelOpen = false;
			goto(item.link);
		}
	}

	onMount(async () => {
		await auth.refreshToken().catch(() => null);
		if (auth.accessToken) {
			await Promise.all([
				notifications.fetchNotifications().catch(() => null),
				notifications.fetchPreferences().catch(() => null),
				notifications.subscribePush().catch(() => null)
			]);
			notifications.startPolling();
		}
	});
</script>

<SEO title={`${siteName} Admin`} noindex />

<div class="min-h-screen bg-[#0f0f11] text-zinc-100">
	{#if sidebarOpen}
		<button
			class="fixed inset-0 z-40 bg-black/60 lg:hidden"
			onclick={() => (sidebarOpen = false)}
			aria-label="Tutup menu"
		></button>
	{/if}

	<aside
		class="fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-800 bg-zinc-900 transition-transform lg:translate-x-0 {sidebarOpen
			? 'translate-x-0'
			: '-translate-x-full lg:translate-x-0'}"
	>
		<div class="flex h-full flex-col">
			<a href="/admin" class="flex h-16 items-center gap-3 border-b border-zinc-800 px-5">
				<img src={siteLogo} alt={siteName} class="h-9 w-9 rounded-full object-contain" />
				<div class="min-w-0">
					<p class="truncate text-sm font-black">{siteName}</p>
					<p class="text-[11px] font-bold uppercase tracking-widest text-violet-400">Admin</p>
				</div>
			</a>

			<nav class="flex-1 space-y-2 overflow-y-auto p-3">
				{#each navGroups as group}
					{#if group.items.length === 1}
						{@const item = group.items[0]}
						<a
							href={item.href}
							onclick={() => (sidebarOpen = false)}
							class="flex items-center gap-3 rounded-lg border-r-2 px-3 py-2.5 text-sm font-bold transition
								{isNavActive(item)
								? 'border-violet-500 bg-violet-600/20 text-violet-300'
								: 'border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}"
						>
							<AppIcon name={item.icon} class="text-[20px]" />
							{item.label}
						</a>
					{:else}
						<div class="rounded-xl border border-zinc-800/80 bg-zinc-950/35">
							<button
								type="button"
								onclick={() => toggleGroup(group)}
								class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-black transition
									{isGroupActive(group)
									? 'text-violet-300'
									: 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100'}"
								aria-expanded={isGroupOpen(group)}
							>
								<AppIcon name={group.icon} class="text-[20px]" />
								<span class="min-w-0 flex-1 truncate">{group.label}</span>
								<span class="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
									{group.items.length}
								</span>
								<AppIcon
									name="expand_more"
									class="text-[18px] transition {isGroupOpen(group) ? 'rotate-180' : ''}"
								/>
							</button>

							{#if isGroupOpen(group)}
								<div class="space-y-1 border-t border-zinc-800/80 p-1.5">
									{#each group.items as item}
										<a
											href={item.href}
											onclick={() => (sidebarOpen = false)}
											class="flex items-center gap-2 rounded-lg border-r-2 px-2.5 py-2 text-[13px] font-bold transition
												{isNavActive(item)
												? 'border-violet-500 bg-violet-600/20 text-violet-200'
												: 'border-transparent text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}"
										>
											<AppIcon name={item.icon} class="text-[18px]" />
											<span class="truncate">{item.label}</span>
										</a>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			</nav>

			<div class="border-t border-zinc-800 p-4">
				<div class="mb-3 flex items-center gap-3">
					<img
						src={adminUser.avatar ||
							`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(adminDisplayName)}`}
						alt={adminDisplayName}
						class="h-10 w-10 rounded-full bg-zinc-800"
					/>
					<div class="min-w-0">
						<p class="truncate text-sm font-black">{adminDisplayName || userInitial(adminUser)}</p>
						<p class="text-xs text-zinc-500">{adminUser.email}</p>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-2">
					<a
						href="/"
						class="rounded-lg border border-zinc-700 px-3 py-2 text-center text-xs font-bold text-zinc-300 hover:bg-zinc-800"
						>Site</a
					>
					<button
						onclick={logout}
						class="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
						>Logout</button
					>
				</div>
			</div>
		</div>
	</aside>

	<div class="lg:pl-64">
		<header
			class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur lg:px-6"
		>
			<div class="flex items-center gap-3">
				<button
					class="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 lg:hidden"
					onclick={() => (sidebarOpen = true)}
					aria-label="Menu"
				>
					<AppIcon name="menu" />
				</button>
				<div>
					<p class="text-xs font-bold uppercase tracking-widest text-zinc-500">Admin / {title}</p>
					<h1 class="text-lg font-black capitalize">{title.replace('-', ' ')}</h1>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<button
					class="relative rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
					aria-label="Upload gambar"
					title="Upload gambar"
					onclick={() => imageUploader.open()}
				>
					<AppIcon name="add_photo_alternate" />
				</button>
				<button
					class="relative rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"
					aria-label="Notifikasi"
					onclick={toggleNotificationPanel}
				>
					<AppIcon name="notifications" />
					{#if notifications.unreadCount > 0}
						<span
							class="absolute -right-1 -top-1 min-w-5 rounded-full bg-violet-600 px-1.5 py-0.5 text-center text-[10px] font-black text-white shadow-lg shadow-violet-500/30"
						>
							{Math.min(notifications.unreadCount, 99)}
						</span>
					{/if}
				</button>
			</div>
		</header>

		{#if notificationPanelOpen}
			<button
				class="fixed inset-0 z-30 bg-black/45"
				aria-label="Tutup notifikasi"
				onclick={() => (notificationPanelOpen = false)}
			></button>

			<aside
				class="fixed bottom-0 right-0 top-16 z-40 flex w-full max-w-[430px] flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50"
			>
				<div class="border-b border-zinc-800 px-4 py-4">
					<div class="mb-4 flex items-start justify-between gap-3">
						<div>
							<p class="text-[11px] font-black uppercase tracking-[0.2em] text-violet-400">
								Notification Center
							</p>
							<h2 class="mt-1 text-lg font-black text-zinc-50">Notifikasi Admin</h2>
							<p class="mt-1 text-xs text-zinc-500">
								{notifications.unreadCount} belum dibaca dari {notifications.items.length} notifikasi
							</p>
						</div>
						<div class="flex items-center gap-1">
							<button
								type="button"
								class="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
								aria-label="Refresh notifikasi"
								onclick={() => notifications.fetchNotifications().catch(() => null)}
							>
								<AppIcon name="refresh" class="text-[19px]" />
							</button>
							<button
								type="button"
								class="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
								aria-label="Tutup notifikasi"
								onclick={() => (notificationPanelOpen = false)}
							>
								<AppIcon name="close" class="text-[19px]" />
							</button>
						</div>
					</div>

					<div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
						{#each notificationCategories as category}
							<button
								type="button"
								onclick={() => (selectedNotificationCategory = category.value)}
								class="shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black transition
									{selectedNotificationCategory === category.value
									? 'border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-500/20'
									: 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100'}"
							>
								{category.label}
								<span
									class="ml-1 rounded-full px-1.5 py-0.5 text-[10px]
										{selectedNotificationCategory === category.value
										? 'bg-white/20 text-white'
										: 'bg-zinc-800 text-zinc-500'}"
								>
									{category.unread > 0 ? category.unread : category.count}
								</span>
							</button>
						{/each}
					</div>

					{#if notifications.unreadCount > 0}
						<button
							type="button"
							onclick={() => notifications.markAllAsRead()}
							class="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-[11px] font-black text-zinc-300 hover:border-violet-500/50 hover:text-violet-300"
						>
							<AppIcon name="done_all" class="text-[15px]" />
							Tandai semua dibaca
						</button>
					{/if}
				</div>

				<div class="min-h-0 flex-1 overflow-y-auto">
					{#if notifications.loading}
						<div class="flex h-40 items-center justify-center text-sm font-bold text-zinc-500">
							Memuat notifikasi...
						</div>
					{:else if filteredNotifications.length === 0}
						<div class="px-6 py-14 text-center">
							<div
								class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-500 ring-1 ring-zinc-800"
							>
								<AppIcon name="drafts" />
							</div>
							<p class="text-sm font-black text-zinc-300">Belum ada notifikasi</p>
							<p class="mt-1 text-xs leading-5 text-zinc-500">
								Notifikasi kategori ini akan muncul di sini.
							</p>
						</div>
					{:else}
						<div class="divide-y divide-zinc-900">
							{#each filteredNotifications as item}
								<button
									type="button"
									onclick={() => openNotification(item)}
									class="group flex w-full gap-3 px-4 py-4 text-left transition hover:bg-zinc-900/80
										{item.isRead ? 'bg-transparent' : 'bg-violet-500/[0.07]'}"
								>
									<div
										class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border
											{item.isRead
											? 'border-zinc-800 bg-zinc-900 text-zinc-500'
											: 'border-violet-500/30 bg-violet-500/15 text-violet-300'}"
									>
										<AppIcon name={notificationCategoryIcon(item.category)} class="text-[20px]" />
									</div>
									<div class="min-w-0 flex-1">
										<div class="mb-1 flex items-center justify-between gap-3">
											<span
												class="truncate text-[10px] font-black uppercase tracking-[0.16em] text-violet-400"
											>
												{notificationCategoryLabel(item.category)}
											</span>
											<span class="shrink-0 text-[10px] font-semibold text-zinc-600">
												{notificationTime(item.createdAt)}
											</span>
										</div>
										<div class="flex items-start gap-2">
											<p class="line-clamp-1 flex-1 text-[13px] font-black text-zinc-100">
												{item.title}
											</p>
											{#if !item.isRead}
												<span
													class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-400 shadow-[0_0_0_4px_rgba(139,92,246,0.14)]"
												></span>
											{/if}
										</div>
										<p class="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
											{item.message}
										</p>
										{#if item.link}
											<span
												class="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-zinc-500 transition group-hover:text-violet-300"
											>
												Buka detail
												<AppIcon name="arrow_outward" class="text-[13px]" />
											</span>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</aside>
		{/if}

		<main class="min-h-[calc(100vh-4rem)] p-4 lg:p-6">
			{@render children()}
		</main>
	</div>
</div>

<AdminToast />
