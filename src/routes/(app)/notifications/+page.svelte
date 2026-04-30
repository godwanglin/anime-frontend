<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';
	import type { AppNotification } from '$lib/stores/notifications.svelte';

	let selectedCategory = $state('all');

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
		if (auth.isLoggedIn) {
			notifications.fetchNotifications().catch(() => null);
		}
	});
</script>

<SEO title="Notifikasi" noindex />

<div class="mx-auto max-w-3xl px-4 pb-12 lg:px-0">
	<header class="flex items-center justify-between gap-4 pb-5 pt-4">
		<div>
			<h1
				class="text-[26px] font-black leading-tight tracking-tight"
				style="color: var(--text-primary);"
			>
				Notifikasi
			</h1>
			<p class="mt-1 text-[12px] leading-relaxed" style="color: var(--text-faint);">
				Inbox semua aktivitas penting dan personal.
			</p>
		</div>

		{#if auth.isLoggedIn}
			<button
				type="button"
				onclick={() => notifications.fetchNotifications().catch(() => null)}
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition"
				style="
					background: var(--surface);
					color: var(--text-muted);
					border: 1px solid var(--border-strong);
					box-shadow: var(--shadow-sm);
				"
				aria-label="Refresh notifikasi"
			>
				<AppIcon name="refresh" class="text-[20px]" />
			</button>
		{/if}
	</header>

	<section
		class="overflow-hidden rounded-[var(--radius-2xl)]"
		style="
			background: var(--surface);
			border: 1px solid var(--border);
			box-shadow: var(--shadow-sm);
		"
	>
		<div class="border-b px-4 py-4" style="border-color: var(--border);">
			<div class="flex items-start justify-between gap-3">
				<div>
					<p
						class="mb-1 text-[10px] font-black uppercase tracking-[0.2em]"
						style="color: var(--text-faint);"
					>
						Inbox
					</p>
					<h2 class="text-[15px] font-black" style="color: var(--text-primary);">
						Inbox personal
					</h2>
					{#if auth.isLoggedIn}
						<p class="text-[10px]" style="color: var(--text-faint);">
							{notifications.unreadCount} belum dibaca dari {notifications.items.length} notifikasi
						</p>
					{/if}
				</div>

				{#if auth.isLoggedIn && notifications.unreadCount > 0}
					<button
						type="button"
						onclick={() => notifications.markAllAsRead()}
						class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black transition"
						style="
							background: var(--surface-offset);
							color: var(--text-primary);
							border: 1px solid var(--border-strong);
						"
					>
						<AppIcon name="done_all" class="text-[15px]" />
						Dibaca
					</button>
				{/if}
			</div>

			{#if auth.isLoggedIn}
				<div class="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
					{#each categories as category}
						<button
							type="button"
							onclick={() => (selectedCategory = category.value)}
							class="shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black transition"
							style="
								background: {selectedCategory === category.value
								? 'var(--accent)'
								: 'var(--surface-offset)'};
								color: {selectedCategory === category.value ? 'white' : 'var(--text-muted)'};
								border-color: {selectedCategory === category.value
								? 'var(--accent)'
								: 'var(--border-strong)'};
								box-shadow: {selectedCategory === category.value
								? '0 4px 14px var(--accent-glow)'
								: 'none'};
							"
						>
							{category.label}
							<span
								class="ml-1 rounded-full px-1.5 py-0.5 text-[10px]"
								style="
									background: {selectedCategory === category.value
									? 'color-mix(in oklab, white 20%, transparent)'
									: 'var(--surface)'};
									color: {selectedCategory === category.value ? 'white' : 'var(--text-faint)'};
								"
							>
								{category.unread > 0 ? category.unread : category.count}
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		{#if !auth.isLoggedIn}
			<div class="px-4 py-10 text-center">
				<div
					class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-xl)]"
					style="
						background: var(--accent-surface);
						border: 1px solid oklch(from var(--accent) l c h / 0.2);
					"
				>
					<AppIcon name="lock" style="font-size:22px; color: var(--accent);" />
				</div>
				<p class="text-[14px] font-black" style="color: var(--text-primary);">
					Inbox personal butuh login
				</p>
				<p class="mt-1 text-[11px] leading-5" style="color: var(--text-faint);">
					Masuk dulu untuk lihat histori notif personal dan tandai sudah dibaca.
				</p>
				<button
					type="button"
					onclick={() => goto('/login?redirect=/notifications')}
					class="mt-4 rounded-[var(--radius-xl)] px-4 py-2 text-[12px] font-black text-white transition-all"
					style="
						background: var(--accent);
						box-shadow: 0 4px 14px var(--accent-glow);
					"
				>
					Masuk
				</button>
			</div>
		{:else if notifications.loading}
			<div
				class="flex h-40 items-center justify-center text-sm font-bold"
				style="color: var(--text-faint);"
			>
				Memuat notifikasi...
			</div>
		{:else if filteredNotifications.length === 0}
			<div class="px-6 py-14 text-center">
				<div
					class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
					style="
						background: var(--surface-offset);
						color: var(--text-faint);
						border: 1px solid var(--border);
					"
				>
					<AppIcon name="drafts" />
				</div>
				<p class="text-sm font-black" style="color: var(--text-primary);">Belum ada notifikasi</p>
				<p class="mt-1 text-xs leading-5" style="color: var(--text-faint);">
					Notifikasi kategori ini akan muncul di sini.
				</p>
			</div>
		{:else}
			<div class="divide-y" style="divide-color: var(--border);">
				{#each filteredNotifications as item}
					<button
						type="button"
						onclick={() => openNotification(item)}
						class="group flex w-full gap-3 px-4 py-4 text-left transition"
						style="
							background: {item.isRead
							? 'transparent'
							: 'color-mix(in oklab, var(--accent) 7%, var(--surface))'};
						"
					>
						<div
							class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
							style="
								background: {item.isRead ? 'var(--surface-offset)' : 'var(--accent-surface)'};
								color: {item.isRead ? 'var(--text-faint)' : 'var(--accent)'};
								border-color: {item.isRead
								? 'var(--border)'
								: 'color-mix(in oklab, var(--accent) 30%, transparent)'};
							"
						>
							<AppIcon name={categoryIcon(item.category)} class="text-[20px]" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="mb-1 flex items-center justify-between gap-3">
								<span
									class="truncate text-[10px] font-black uppercase tracking-[0.16em]"
									style="color: var(--accent);"
								>
									{categoryLabel(item.category)}
								</span>
								<span class="shrink-0 text-[10px] font-semibold" style="color: var(--text-faint);">
									{formatTime(item.createdAt)}
								</span>
							</div>
							<div class="flex items-start gap-2">
								<p
									class="line-clamp-1 flex-1 text-[13px] font-black"
									style="color: var(--text-primary);"
								>
									{item.title}
								</p>
								{#if !item.isRead}
									<span
										class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
										style="
											background: var(--accent);
											box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 16%, transparent);
										"
									></span>
								{/if}
							</div>
							<p class="mt-1 line-clamp-2 text-xs leading-5" style="color: var(--text-muted);">
								{item.message}
							</p>
							{#if item.link}
								<span
									class="mt-2 inline-flex items-center gap-1 text-[11px] font-black transition"
									style="color: var(--text-faint);"
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
	</section>
</div>
