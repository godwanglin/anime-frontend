<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';

	const preferenceLabels: Record<string, string> = {
		announcement: 'Announcement',
		contentNew: 'Series baru',
		contentUpdate: 'Episode update',
		personalActivity: 'Aktivitas personal',
		watchReminder: 'Reminder nonton',
		accountSystem: 'Akun & sistem',
		adminOperational: 'Operasional admin',
		pushEnabled: 'Push notification',
		inAppEnabled: 'In-app notification'
	};

	function formatTime(value: string) {
		return new Date(value).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function openNotification(item: { id: number; link?: string | null; isRead?: boolean }) {
		if (!item.isRead) {
			await notifications.markAsRead(item.id).catch(() => null);
		}

		notifications.togglePanel(false);
		if (item.link) goto(item.link);
	}

	async function togglePreference(key: string, value: boolean) {
		await notifications.updatePreferences({ [key]: value } as never).catch(() => null);
	}
</script>

<div class="fixed bottom-4 right-4 z-[70]">
	<div class="relative">
		<button
			onclick={() => notifications.togglePanel()}
			class="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-zinc-950 text-zinc-100 shadow-[0_18px_48px_-20px_rgba(0,0,0,0.7)] transition hover:scale-[1.02] hover:bg-zinc-900"
			aria-label="Buka notifikasi"
		>
			<AppIcon name="notifications" class="text-[26px]" />
		</button>

		{#if notifications.unreadCount > 0}
			<span class="absolute -right-1 -top-1 min-w-6 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white">
				{Math.min(notifications.unreadCount, 99)}
			</span>
		{/if}
	</div>

	{#if notifications.panelOpen}
		<div class="absolute bottom-16 right-0 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
			<div class="border-b border-zinc-800 bg-zinc-900/95 px-4 py-4">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-[11px] font-black uppercase tracking-[0.24em] text-violet-300">Notification Hub</p>
						<h3 class="mt-1 text-lg font-black">Notifikasi</h3>
						<p class="mt-1 text-xs text-zinc-500">
							{auth.isLoggedIn
								? `${notifications.unreadCount} belum dibaca`
								: 'Guest bisa terima broadcast web push selama izin aktif'}
						</p>
					</div>
					<button
						onclick={() => notifications.togglePanel(false)}
						class="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
						aria-label="Tutup notifikasi"
					>
						<AppIcon name="close" class="text-[18px]" />
					</button>
				</div>
			</div>

			<div class="max-h-[75vh] overflow-y-auto">
				<div class="space-y-4 p-4">
					<section class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="text-sm font-bold text-zinc-100">Web Push</p>
								<p class="mt-1 text-xs leading-5 text-zinc-500">
									Broadcast bisa diterima walau belum login, selama permission browser diizinkan.
								</p>
							</div>
							<span class="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide {notifications.permission === 'granted'
								? 'bg-emerald-500/15 text-emerald-300'
								: notifications.permission === 'denied'
									? 'bg-rose-500/15 text-rose-300'
									: 'bg-amber-500/15 text-amber-200'}">
								{notifications.permission}
							</span>
						</div>

						{#if notifications.supported}
							<div class="mt-3 flex flex-wrap gap-2">
								<button
									onclick={() => notifications.requestPermission()}
									disabled={notifications.configuringPush || notifications.permission === 'granted' || !notifications.pushConfig.enabled}
									class="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{notifications.permission === 'granted' ? 'Push Aktif' : 'Aktifkan Push'}
								</button>
								{#if !notifications.pushConfig.enabled}
									<span class="self-center text-[11px] text-amber-300">VAPID key backend belum aktif.</span>
								{/if}
							</div>
						{:else}
							<p class="mt-3 text-xs text-rose-300">Browser ini belum support web push.</p>
						{/if}
					</section>

					{#if auth.isLoggedIn}
						<section class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
							<div class="mb-3 flex items-center justify-between gap-3">
								<div>
									<p class="text-sm font-bold text-zinc-100">Inbox Personal</p>
									<p class="mt-1 text-xs text-zinc-500">Notifikasi user dan event penting akun kamu.</p>
								</div>
								<button
									onclick={() => notifications.markAllAsRead()}
									class="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] font-bold text-zinc-300 transition hover:bg-zinc-800"
								>
									Read all
								</button>
							</div>

							<div class="space-y-2">
								{#if notifications.items.length === 0}
									<div class="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 px-4 py-8 text-center text-sm text-zinc-500">
										Belum ada notifikasi personal.
									</div>
								{:else}
									{#each notifications.items as item}
										<button
											onclick={() => openNotification(item)}
											class="block w-full rounded-2xl border px-3 py-3 text-left transition {item.isRead
												? 'border-zinc-800 bg-zinc-950/50'
												: 'border-violet-500/30 bg-violet-500/10'}"
										>
											<div class="flex items-start justify-between gap-3">
												<div class="min-w-0">
													<p class="text-xs font-black uppercase tracking-wide text-violet-300">{item.category.replaceAll('_', ' ')}</p>
													<p class="mt-1 text-sm font-bold text-zinc-100">{item.title}</p>
													<p class="mt-1 text-xs leading-5 text-zinc-400">{item.message}</p>
												</div>
												{#if !item.isRead}
													<span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-400"></span>
												{/if}
											</div>
											<p class="mt-2 text-[11px] text-zinc-500">{formatTime(item.createdAt)}</p>
										</button>
									{/each}
								{/if}
							</div>
						</section>

						{#if notifications.preferences}
							<section class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
								<div class="mb-3">
									<p class="text-sm font-bold text-zinc-100">Preference</p>
									<p class="mt-1 text-xs text-zinc-500">Atur kategori notifikasi yang mau kamu terima.</p>
								</div>

								<div class="space-y-2">
									{#each Object.entries(notifications.preferences) as [key, value]}
										<label class="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
											<div>
												<p class="text-sm font-semibold text-zinc-100">{preferenceLabels[key] ?? key}</p>
											</div>
											<input
												type="checkbox"
												checked={value}
												onchange={(event) => togglePreference(key, event.currentTarget.checked)}
												class="h-4 w-4 accent-violet-500"
											/>
										</label>
									{/each}
								</div>
							</section>
						{/if}
					{:else}
						<section class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
							<p class="text-sm font-bold text-zinc-100">Mode Guest</p>
							<p class="mt-2 text-xs leading-5 text-zinc-500">
								Kamu tetap bisa menerima broadcast seperti pengumuman, series baru, dan update episode lewat web push.
								Login kalau mau inbox personal dan preferensi per kategori.
							</p>
						</section>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
