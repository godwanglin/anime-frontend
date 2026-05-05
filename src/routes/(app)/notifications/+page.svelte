<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';
	import type { AppNotification } from '$lib/stores/notifications.svelte';
	import './notifications.css';

	let selectedCategory = $state('all');
	let stickyTop = $state(56);

	const filteredNotifications = $derived(
		selectedCategory === 'all'
			? notifications.items
			: notifications.items.filter((item) => item.category === selectedCategory)
	);

	const categories = $derived([
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
				label: categoryLabel(category),
				count: items.length,
				unread: items.filter((item) => !item.isRead).length
			};
		})
	]);

	function formatTime(value: string) {
		return new Date(value).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function categoryLabel(value: string) {
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
			labels[value] ??
			value
				.replaceAll('_', ' ')
				.replace(/\b\w/g, (char) => char.toUpperCase())
		);
	}

	function categoryIcon(value: string) {
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

	async function openNotification(item: AppNotification) {
		if (!item.isRead) {
			await notifications.markAsRead(item.id).catch(() => null);
		}
		if (item.link) goto(item.link);
	}

	onMount(() => {
		const header = document.querySelector('header');
		const syncStickyTop = () => {
			if (header) stickyTop = Math.ceil(header.getBoundingClientRect().height);
		};
		const observer = header ? new ResizeObserver(syncStickyTop) : null;
		if (header) observer?.observe(header);
		syncStickyTop();

		if (auth.isLoggedIn) {
			notifications.fetchNotifications().catch(() => null);
		}

		return () => observer?.disconnect();
	});
</script>

<SEO title="Notifikasi" noindex />

<div class="notifications-page" class:has-toolbar={auth.isLoggedIn}>
	{#if auth.isLoggedIn}
		<section
			class="notification-toolbar"
			style:--notification-sticky-top={`${stickyTop}px`}
			aria-label="Filter notifikasi"
		>
			<nav class="notification-tabs" aria-label="Kategori notifikasi">
				{#each categories as category}
					<button
						type="button"
						onclick={() => (selectedCategory = category.value)}
						class:is-active={selectedCategory === category.value}
					>
						<span>{category.label}</span>
						<b>{category.unread > 0 ? category.unread : category.count}</b>
					</button>
				{/each}
			</nav>

			<div class="notification-toolbar-actions">
				{#if notifications.unreadCount > 0}
					<button type="button" onclick={() => notifications.markAllAsRead()} class="text-action">
						<AppIcon name="done_all" />
						<span>Tandai dibaca</span>
					</button>
				{/if}
				<button
					type="button"
					onclick={() => notifications.fetchNotifications().catch(() => null)}
					class="icon-action"
					aria-label="Refresh notifikasi"
				>
					<AppIcon name="refresh" />
				</button>
			</div>
		</section>
	{/if}

	{#if !auth.isLoggedIn}
		<section class="notification-empty">
			<AppIcon name="lock" />
			<h2>Masuk untuk melihat notifikasi</h2>
			<p>Update tontonan, komentar, dan akun kamu akan muncul setelah login.</p>
			<button type="button" onclick={() => goto('/login?redirect=/notifications')}>Masuk</button>
		</section>
	{:else if notifications.loading}
		<section class="notification-loading">
			<span></span>
			<p>Memuat notifikasi...</p>
		</section>
	{:else if filteredNotifications.length === 0}
		<section class="notification-empty">
			<AppIcon name="drafts" />
			<h2>Belum ada notifikasi</h2>
			<p>Kalau ada update baru dari kategori ini, nanti muncul di sini.</p>
		</section>
	{:else}
		<section class="notification-feed" aria-label="Daftar notifikasi">
			{#each filteredNotifications as item}
				<button
					type="button"
					onclick={() => openNotification(item)}
					class="notification-row"
					class:is-unread={!item.isRead}
				>
					<span class="notification-icon">
						<AppIcon name={categoryIcon(item.category)} />
					</span>
					<span class="notification-content">
						<span class="notification-meta">
							<span>{categoryLabel(item.category)}</span>
							<time>{formatTime(item.createdAt)}</time>
						</span>
						<span class="notification-title">
							{item.title}
							{#if !item.isRead}
								<i aria-label="Belum dibaca"></i>
							{/if}
						</span>
						<span class="notification-message">{item.message}</span>
						{#if item.link}
							<span class="notification-link">
								Buka detail
								<AppIcon name="arrow_outward" />
							</span>
						{/if}
					</span>
				</button>
			{/each}
		</section>
	{/if}
</div>
