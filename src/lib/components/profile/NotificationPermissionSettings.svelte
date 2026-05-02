<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { notifications, type NotificationPreference } from '$lib/stores/notifications.svelte';

	const notificationGroups: Array<{
		icon: string;
		label: string;
		desc: string;
		keys: Array<keyof NotificationPreference>;
	}> = [
		{
			icon: 'campaign',
			label: 'Informasi',
			desc: 'Pengumuman, series baru, dan update episode',
			keys: ['announcement', 'contentNew', 'contentUpdate']
		},
		{
			icon: 'forum',
			label: 'Aktivitas',
			desc: 'Balasan komentar dan reminder nonton',
			keys: ['personalActivity', 'watchReminder']
		},
		{
			icon: 'shield_person',
			label: 'Akun & sistem',
			desc: 'Perubahan penting akun dan sistem',
			keys: ['accountSystem']
		},
		{
			icon: 'monitor_heart',
			label: 'Operasional admin',
			desc: 'Event admin seperti scraping dan subtitle',
			keys: ['adminOperational']
		}
	];

	const visibleNotificationGroups = $derived(
		notificationGroups.filter((group) => group.keys[0] !== 'adminOperational' || auth.user?.role === 'admin')
	);
	const notificationAllowed = $derived(
		notifications.supported &&
			notifications.permission === 'granted' &&
			Boolean(notifications.preferences?.pushEnabled)
	);
	const notificationBlocked = $derived(notifications.permission === 'denied');

	function notificationGroupEnabled(group: (typeof notificationGroups)[number]) {
		const prefs = notifications.preferences;
		if (!prefs) return false;
		return group.keys.every((key) => prefs[key]);
	}

	async function setNotificationGroup(group: (typeof notificationGroups)[number], value: boolean) {
		await notifications.updatePreferences(
			Object.fromEntries(group.keys.map((key) => [key, value])) as Partial<NotificationPreference>
		);
	}

	async function setNotificationAllowed(value: boolean) {
		if (!value) {
			await notifications.unsubscribePush();
			await notifications.updatePreferences({ pushEnabled: false });
			return;
		}

		const permission = await notifications.requestPermission();
		await notifications.updatePreferences({ pushEnabled: permission === 'granted' });
	}
</script>

<p
	class="text-[9px] font-black uppercase tracking-[0.2em] mb-2 px-1"
	style="color: var(--text-faint);"
>
	Notifikasi
</p>
<div
	class="rounded-[var(--radius-2xl)] overflow-hidden mb-6"
	style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
>
	<div class="px-4 py-4" style="border-bottom: 1px solid var(--border);">
		<div class="flex items-start gap-3">
			<div
				class="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0"
				style="background: var(--surface-offset);"
			>
				<AppIcon name="notifications_active" style="font-size:16px; color: var(--text-muted);" />
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-[13px] font-bold" style="color: var(--text-primary);">
					Izinkan notifikasi
				</p>
				<p class="text-[10px] leading-4" style="color: var(--text-faint);">
					Aktifkan notifikasi browser untuk info penting saat aplikasi tidak dibuka.
				</p>
			</div>
			<label class="relative shrink-0 cursor-pointer">
				<input
					type="checkbox"
					class="sr-only peer"
					checked={notificationAllowed}
					disabled={notifications.configuringPush || !notifications.supported}
					onchange={(event) => setNotificationAllowed(event.currentTarget.checked)}
				/>
				<div
					class="w-12 h-6 rounded-full transition-all duration-200 peer-checked:shadow-sm"
					style="
						background: {notificationAllowed ? 'var(--accent)' : 'var(--surface-offset)'};
						border: 1.5px solid {notificationAllowed
						? 'oklch(from var(--accent) l c h / 0.4)'
						: 'var(--border-strong)'};
						box-shadow: {notificationAllowed ? '0 2px 8px var(--accent-glow)' : 'none'};
						opacity: {notifications.configuringPush || !notifications.supported ? 0.6 : 1};
					"
				>
					<div
						class="w-5 h-5 rounded-full bg-white transition-transform duration-200 mt-[1px]"
						style="
							transform: translateX({notificationAllowed ? '24px' : '2px'});
							box-shadow: 0 1px 4px oklch(0 0 0 / 0.2);
						"
					></div>
				</div>
			</label>
		</div>
		{#if notificationBlocked}
			<div
				class="mt-3 rounded-[var(--radius-xl)] px-3 py-2 text-[11px] leading-5"
				style="background: oklch(0.25 0.08 35 / 0.5); color: oklch(0.84 0.12 55); border: 1px solid oklch(0.64 0.16 45 / 0.32);"
			>
				Notifikasi diblokir di browser. Buka pengaturan situs/aplikasi browser, ubah Notifications
				menjadi Allow, lalu refresh halaman ini.
			</div>
		{:else if !notifications.supported}
			<div
				class="mt-3 rounded-[var(--radius-xl)] px-3 py-2 text-[11px] leading-5"
				style="background: var(--surface-offset); color: var(--text-muted); border: 1px solid var(--border);"
			>
				Browser ini belum mendukung izin notifikasi.
			</div>
		{:else if !notifications.pushSupported}
			<div
				class="mt-3 rounded-[var(--radius-xl)] px-3 py-2 text-[11px] leading-5"
				style="background: var(--surface-offset); color: var(--text-muted); border: 1px solid var(--border);"
			>
				Browser ini belum mendukung push notification.
			</div>
		{/if}
	</div>

	{#if !notifications.preferences}
		<div class="px-4 py-8 text-center">
			<p class="text-[12px] font-bold" style="color: var(--text-primary);">
				Memuat preferensi notifikasi...
			</p>
		</div>
	{:else}
		{#each visibleNotificationGroups as item, i}
			{@const enabled = notificationGroupEnabled(item)}
			<label
				class="flex items-center justify-between gap-4 px-4 py-4 cursor-pointer transition-colors"
				style="border-bottom: {i < visibleNotificationGroups.length - 1
					? '1px solid var(--border)'
					: 'none'};"
			>
				<div class="flex items-center gap-3">
					<div
						class="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0"
						style="background: var(--surface-offset);"
					>
						<AppIcon name={item.icon} style="font-size:16px; color: var(--text-muted);" />
					</div>
					<div>
						<p class="text-[13px] font-bold" style="color: var(--text-primary);">{item.label}</p>
						<p class="text-[10px]" style="color: var(--text-faint);">{item.desc}</p>
					</div>
				</div>

				<div class="relative shrink-0">
					<input
						type="checkbox"
						class="sr-only peer"
						checked={enabled}
						onchange={(event) => setNotificationGroup(item, event.currentTarget.checked)}
					/>
					<div
						class="w-12 h-6 rounded-full transition-all duration-200 peer-checked:shadow-sm"
						style="
							background: {enabled ? 'var(--accent)' : 'var(--surface-offset)'};
							border: 1.5px solid {enabled
							? 'oklch(from var(--accent) l c h / 0.4)'
							: 'var(--border-strong)'};
							box-shadow: {enabled ? '0 2px 8px var(--accent-glow)' : 'none'};
						"
					>
						<div
							class="w-5 h-5 rounded-full bg-white transition-transform duration-200 mt-[1px]"
							style="
								transform: translateX({enabled ? '24px' : '2px'});
								box-shadow: 0 1px 4px oklch(0 0 0 / 0.2);
							"
						></div>
					</div>
				</div>
			</label>
		{/each}
	{/if}
</div>
