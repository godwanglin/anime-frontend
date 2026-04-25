<script lang="ts">
	import { goto } from '$app/navigation';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { notifications, type NotificationPreference } from '$lib/stores/notifications.svelte';
	import { preference, type UserPreference } from '$lib/stores/preference.svelte';

	const volumePct = $derived(Math.round(preference.pref.defaultVolume * 100));
	const volumeTrackStyle = $derived(
		`background: linear-gradient(to right, var(--accent) ${volumePct}%, var(--surface-offset) ${volumePct}%);`
	);
	const qualityOptions = [
		{ value: 'auto', label: 'Auto', description: 'Ikuti kualitas terbaik' },
		{ value: '1080p', label: '1080p', description: 'Full HD' },
		{ value: '720p', label: '720p', description: 'HD' },
		{ value: '480p', label: '480p', description: 'Hemat data' }
	];
	const subtitleFontOptions = [
		{ value: 'inherit', label: 'Default', description: 'Font aplikasi' },
		{ value: 'Arial, sans-serif', label: 'Arial' },
		{ value: "'Trebuchet MS', sans-serif", label: 'Trebuchet' },
		{ value: 'Georgia, serif', label: 'Georgia' },
		{ value: "'Courier New', monospace", label: 'Courier New' },
		{ value: 'Impact, sans-serif', label: 'Impact' }
	];
	const subtitleSizeOptions = [
		{ value: '1rem', label: '1rem', description: 'Kecil' },
		{ value: '1.2rem', label: '1.2rem', description: 'Normal' },
		{ value: '1.5rem', label: '1.5rem', description: 'Sedang' },
		{ value: '1.8rem', label: '1.8rem', description: 'Besar' },
		{ value: '2rem', label: '2rem', description: 'Lebih besar' },
		{ value: '2.5rem', label: '2.5rem', description: 'Maksimal' }
	];
	const subtitleBgOptions = [
		{ label: 'Hitam', value: 'rgba(0,0,0,0.72)', swatch: 'rgba(0,0,0,0.72)' },
		{ label: 'Semi', value: 'rgba(0,0,0,0.5)', swatch: 'rgba(0,0,0,0.5)' },
		{ label: 'Tipis', value: 'rgba(0,0,0,0.25)', swatch: 'rgba(0,0,0,0.25)' },
		{ label: 'Tanpa', value: 'transparent', swatch: 'transparent' }
	];
	const subtitleShadowOptions = [
		{ label: 'Kuat', value: '0 2px 6px rgba(0,0,0,1)' },
		{ label: 'Sedang', value: '0 1px 4px rgba(0,0,0,0.7)' },
		{ label: 'Tanpa', value: 'none' }
	];
	const subtitlePositionOptions = [
		{ label: 'Bawah', value: '2%', description: 'Dekat bawah' },
		{ label: 'Tengah-bawah', value: '10%', description: 'Sedikit naik' },
		{ label: 'Tengah', value: '25%', description: 'Area tengah' }
	];

	const notificationItems: Array<{
		key: keyof NotificationPreference;
		icon: string;
		label: string;
		desc: string;
		forced?: boolean;
	}> = [
		{
			key: 'announcement',
			icon: 'campaign',
			label: 'Pengumuman',
			desc: 'Info penting, maintenance, dan kabar umum'
		},
		{
			key: 'contentNew',
			icon: 'movie_info',
			label: 'Series baru',
			desc: 'Notif saat ada series baru masuk'
		},
		{
			key: 'contentUpdate',
			icon: 'new_releases',
			label: 'Episode update',
			desc: 'Episode baru dan update konten terbaru'
		},
		{
			key: 'personalActivity',
			icon: 'forum',
			label: 'Aktivitas personal',
			desc: 'Balasan komentar dan aktivitas yang terkait akunmu'
		},
		{
			key: 'watchReminder',
			icon: 'schedule',
			label: 'Reminder nonton',
			desc: 'Pengingat lanjut nonton dan update yang relevan'
		},
		{
			key: 'accountSystem',
			icon: 'shield_person',
			label: 'Akun & sistem',
			desc: 'Perubahan penting akun dan sistem'
		},
		{
			key: 'adminOperational',
			icon: 'monitor_heart',
			label: 'Operasional admin',
			desc: 'Khusus event admin seperti scraping dan subtitle'
		},
		{
			key: 'pushEnabled',
			icon: 'notifications_active',
			label: 'Push notification',
			desc: 'Izinkan notifikasi browser saat aplikasi tidak dibuka'
		},
		{
			key: 'inAppEnabled',
			icon: 'notifications',
			label: 'Inbox aplikasi',
			desc: 'Tampilkan notif di halaman notifikasi'
		}
	];

	async function toggleNotificationPreference(
		key: keyof NotificationPreference,
		value: boolean
	) {
		await notifications.updatePreferences({ [key]: value } as Partial<NotificationPreference>);
	}
</script>

<SEO title="Preferensi" noindex />

{#if !auth.isLoggedIn}
	<!-- ── NOT LOGGED IN ── -->
	<div class="flex flex-col items-center justify-center py-24 px-6 text-center">
		<div
			class="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
			style="background: var(--accent-surface); border: 1px solid oklch(from var(--accent) l c h / 0.2);"
		>
			<span class="material-symbols-rounded" style="font-size:28px; color: var(--accent);">
				lock
			</span>
		</div>
		<h1 class="text-[18px] font-black mb-1.5" style="color: var(--text-primary);">
			Login diperlukan
		</h1>
		<p class="text-[13px] mb-6 max-w-[240px]" style="color: var(--text-muted);">
			Preferensi tersimpan ke akunmu dan sync di semua perangkat.
		</p>
		<button
			onclick={() => goto('/login?redirect=/profile/preferences')}
			class="h-12 px-8 rounded-[var(--radius-xl)] text-[13px] font-black text-white transition-all active:scale-[0.97]"
			style="background: var(--accent); box-shadow: 0 4px 14px var(--accent-glow);"
		>
			Masuk
		</button>
	</div>
{:else}
	<div class="max-w-xl mx-auto pb-12">
		<!-- Page title -->
		<div class="mb-6">
			<h1 class="text-[22px] font-black tracking-tight" style="color: var(--text-primary);">
				Preferensi
			</h1>
			<p class="text-[12px] mt-0.5" style="color: var(--text-faint);">
				Setelan personal yang tersimpan ke akunmu
			</p>
		</div>

		<!-- ════════════════════════════════
             SECTION 1 — Tampilan
        ════════════════════════════════ -->
		<p
			class="text-[9px] font-black uppercase tracking-[0.2em] mb-2 px-1"
			style="color: var(--text-faint);"
		>
			Tampilan
		</p>
		<div
			class="rounded-[var(--radius-2xl)] overflow-hidden mb-6"
			style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
		>
			<!-- Tema -->
			<!-- Ganti seluruh row "Tema" dengan ini -->
			<div
				class="flex items-center justify-between gap-4 px-4 py-4"
				style="border-bottom: 1px solid var(--border);"
			>
				<div class="flex items-center gap-3">
					<div
						class="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0"
						style="background: var(--surface-offset);"
					>
						<span
							class="material-symbols-rounded"
							style="font-size:16px; color: var(--text-muted);"
						>
							contrast
						</span>
					</div>
					<div>
						<p class="text-[13px] font-bold" style="color: var(--text-primary);">Tema</p>
						<p class="text-[10px]" style="color: var(--text-faint);">Tampilan aplikasi</p>
					</div>
				</div>

				<div
					class="flex items-center gap-0.5 p-1 rounded-full shrink-0"
					style="background: var(--surface-offset); border: 1px solid var(--border-strong);"
				>
					{#each [{ value: 'system', icon: 'brightness_auto', label: 'Auto' }, { value: 'dark', icon: 'dark_mode', label: 'Dark' }, { value: 'light', icon: 'light_mode', label: 'Light' }] as const as tab}
						<button
							type="button"
							onclick={() => preference.updatePreference({ theme: tab.value })}
							class="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-black transition-all duration-150 active:scale-[0.94]"
							style="
                    background: {preference.pref.theme === tab.value
								? 'var(--accent)'
								: 'transparent'};
                    color: {preference.pref.theme === tab.value ? '#fff' : 'var(--text-muted)'};
                    box-shadow: {preference.pref.theme === tab.value
								? '0 2px 8px var(--accent-glow)'
								: 'none'};
                "
						>
							<span class="material-symbols-rounded" style="font-size:13px;">{tab.icon}</span>
							{tab.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Kualitas default -->
			<div class="flex items-center justify-between gap-4 px-4 py-4">
				<div class="flex items-center gap-3">
					<div
						class="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0"
						style="background: var(--surface-offset);"
					>
						<span
							class="material-symbols-rounded"
							style="font-size:16px; color: var(--text-muted);"
						>
							hd
						</span>
					</div>
					<div>
						<p class="text-[13px] font-bold" style="color: var(--text-primary);">Kualitas video</p>
						<p class="text-[10px]" style="color: var(--text-faint);">Resolusi default stream</p>
					</div>
				</div>
				<CustomSelect
					value={preference.pref.defaultQuality}
					options={qualityOptions}
					minWidth={190}
					onChange={(defaultQuality) =>
						preference.updatePreference({
							defaultQuality: defaultQuality as UserPreference['defaultQuality']
						})}
				/>
			</div>
		</div>

		<!-- ════════════════════════════════
             SECTION 2 — Audio & Volume
        ════════════════════════════════ -->
		<p
			class="text-[9px] font-black uppercase tracking-[0.2em] mb-2 px-1"
			style="color: var(--text-faint);"
		>
			Audio
		</p>
		<div
			class="rounded-[var(--radius-2xl)] overflow-hidden mb-6"
			style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
		>
			<div class="px-4 py-4">
				<div class="flex items-center gap-3 mb-4">
					<div
						class="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0"
						style="background: var(--surface-offset);"
					>
						<span
							class="material-symbols-rounded"
							style="font-size:16px; color: var(--text-muted);"
						>
							volume_up
						</span>
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center justify-between mb-1">
							<p class="text-[13px] font-bold" style="color: var(--text-primary);">
								Volume default
							</p>
							<span class="text-[12px] font-black tabular-nums" style="color: var(--accent);">
								{Math.round(preference.pref.defaultVolume * 100)}%
							</span>
						</div>
						<p class="text-[10px]" style="color: var(--text-faint);">
							Volume awal saat video dibuka
						</p>
					</div>
				</div>

				<!--
                    Range slider — styled via CSS custom property trick.
                    accent-color pakai var(--accent) tidak cukup di semua browser,
                    jadi kita pakai inline style untuk override.
                -->
				<div class="px-1">
					<input
						type="range"
						min="0"
						max="1"
						step="0.05"
						value={preference.pref.defaultVolume}
						oninput={(e) =>
							preference.updatePreference({ defaultVolume: Number(e.currentTarget.value) })}
						class="volume-slider w-full outline-none cursor-pointer appearance-none"
						style={volumeTrackStyle}
					/>
				</div>

				<!-- Tick labels -->
				<div class="flex justify-between px-1 mt-1.5">
					{#each ['0%', '25%', '50%', '75%', '100%'] as tick}
						<span class="text-[9px]" style="color: var(--text-faint);">{tick}</span>
					{/each}
				</div>
			</div>
		</div>

		<!-- ════════════════════════════════
             SECTION 3 — Pemutaran
        ════════════════════════════════ -->
		<p
			class="text-[9px] font-black uppercase tracking-[0.2em] mb-2 px-1"
			style="color: var(--text-faint);"
		>
			Pemutaran
		</p>
		<div
			class="rounded-[var(--radius-2xl)] overflow-hidden mb-6"
			style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
		>
			{#each [{ key: 'autoPlay' as const, icon: 'play_circle', label: 'Auto play', desc: 'Mulai video otomatis saat halaman dibuka', value: preference.pref.autoPlay }, { key: 'autoNextEpisode' as const, icon: 'skip_next', label: 'Auto next episode', desc: 'Lanjut episode berikutnya secara otomatis', value: preference.pref.autoNextEpisode }, { key: 'skipIntroEnabled' as const, icon: 'fast_forward', label: 'Auto skip intro', desc: 'Lewati intro jika tersedia', value: preference.pref.skipIntroEnabled }, { key: 'subtitleEnabled' as const, icon: 'subtitles', label: 'Subtitle aktif', desc: 'Tampilkan subtitle secara default', value: preference.pref.subtitleEnabled }] as item, i}
				<label
					class="flex items-center justify-between gap-4 px-4 py-4 cursor-pointer transition-colors"
					style="
                        border-bottom: {i < 3 ? '1px solid var(--border)' : 'none'};
                    "
				>
					<div class="flex items-center gap-3">
						<div
							class="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0"
							style="background: var(--surface-offset);"
						>
							<span
								class="material-symbols-rounded"
								style="font-size:16px; color: var(--text-muted);"
							>
								{item.icon}
							</span>
						</div>
						<div>
							<p class="text-[13px] font-bold" style="color: var(--text-primary);">{item.label}</p>
							<p class="text-[10px]" style="color: var(--text-faint);">{item.desc}</p>
						</div>
					</div>

					<!--
                        Custom toggle switch — tidak pakai <input type="checkbox">
                        supaya bisa di-style penuh dengan CSS variables.
                        State tetap dikendalikan oleh checkbox asli yang di-sr-only.
                    -->
					<div class="relative shrink-0">
						<input
							type="checkbox"
							class="sr-only peer"
							checked={item.value}
							onchange={(e) => preference.updatePreference({ [item.key]: e.currentTarget.checked })}
						/>
						<!--
                            Track: abu-abu saat off, var(--accent) saat on.
                            Thumb: bulat putih, geser kanan saat on.
                        -->
						<div
							class="w-12 h-6 rounded-full transition-all duration-200 peer-checked:shadow-sm"
							style="
                                background: {item.value
								? 'var(--accent)'
								: 'var(--surface-offset)'};
                                border: 1.5px solid {item.value
								? 'oklch(from var(--accent) l c h / 0.4)'
								: 'var(--border-strong)'};
                                box-shadow: {item.value ? '0 2px 8px var(--accent-glow)' : 'none'};
                            "
						>
							<div
								class="w-5 h-5 rounded-full bg-white transition-transform duration-200 mt-[1px]"
								style="
                                    transform: translateX({item.value ? '24px' : '2px'});
                                    box-shadow: 0 1px 4px oklch(0 0 0 / 0.2);
                                "
							></div>
						</div>
					</div>
				</label>
			{/each}
		</div>

		<!-- SECTION 4 Subtitle -->
		<p
			class="text-[9px] font-black uppercase tracking-[0.2em] mb-2 px-1"
			style="color: var(--text-faint);"
		>
			Subtitle
		</p>
		<div
			class="rounded-[var(--radius-2xl)] overflow-hidden mb-6"
			style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
		>
			<div class="px-4 pt-4 pb-3" style="border-bottom: 1px solid var(--border);">
				<p class="text-[10px] font-bold uppercase tracking-widest mb-2" style="color: var(--text-faint);">Preview</p>
				<div class="relative rounded-xl overflow-hidden" style="background:#000; height:80px;">
					<div class="absolute inset-x-0 bottom-2 flex justify-center" style="opacity: {preference.pref.subtitleOpacity};">
						<p style="color: {preference.pref.subtitleColor}; font-size: {preference.pref.subtitleFontSize}; font-family: {preference.pref.subtitleFontFamily}; font-weight: 700; background: {preference.pref.subtitleBg}; text-shadow: {preference.pref.subtitleShadow}; border-radius: 4px; padding: 2px 10px; max-width: 90%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Subtitle contoh — AniStream</p>
					</div>
				</div>
			</div>

			<div class="flex items-center justify-between gap-4 px-4 py-4" style="border-bottom: 1px solid var(--border);">
				<div class="flex min-w-0 items-center gap-3">
					<div class="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0" style="background: var(--surface-offset);">
						<span class="material-symbols-rounded" style="font-size:16px; color: var(--text-muted);">font_download</span>
					</div>
					<div class="min-w-0">
						<p class="text-[13px] font-bold" style="color: var(--text-primary);">Font</p>
						<p class="text-[10px]" style="color: var(--text-faint);">Jenis huruf subtitle</p>
					</div>
				</div>
				<CustomSelect
					value={preference.pref.subtitleFontFamily}
					options={subtitleFontOptions}
					minWidth={205}
					onChange={(subtitleFontFamily) =>
						preference.updatePreference({ subtitleFontFamily })}
				/>
			</div>

			<div class="flex items-center justify-between gap-4 px-4 py-4" style="border-bottom: 1px solid var(--border);">
				<div class="flex min-w-0 items-center gap-3">
					<div class="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0" style="background: var(--surface-offset);">
						<span class="material-symbols-rounded" style="font-size:16px; color: var(--text-muted);">format_size</span>
					</div>
					<div class="min-w-0">
						<p class="text-[13px] font-bold" style="color: var(--text-primary);">Ukuran teks</p>
						<p class="text-[10px]" style="color: var(--text-faint);">Ukuran font subtitle</p>
					</div>
				</div>
				<CustomSelect
					value={preference.pref.subtitleFontSize}
					options={subtitleSizeOptions}
					minWidth={176}
					onChange={(subtitleFontSize) =>
						preference.updatePreference({ subtitleFontSize })}
				/>
			</div>

			<div class="flex items-center justify-between gap-4 px-4 py-4" style="border-bottom: 1px solid var(--border);">
				<div class="flex items-center gap-3">
					<div class="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0" style="background: var(--surface-offset);">
						<span class="material-symbols-rounded" style="font-size:16px; color: var(--text-muted);">palette</span>
					</div>
					<div>
						<p class="text-[13px] font-bold" style="color: var(--text-primary);">Warna teks</p>
						<p class="text-[10px]" style="color: var(--text-faint);">Warna huruf subtitle</p>
					</div>
				</div>
				<div class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
					{#each ['#ffffff', '#ffff00', '#00ff88', '#ff6b6b', '#7eb8f7', '#ffb347'] as col}
						<button
							onclick={() => preference.updatePreference({ subtitleColor: col })}
							class="w-6 h-6 rounded-full transition-all"
							style="background: {col}; outline: {preference.pref.subtitleColor === col ? '2px solid var(--accent)' : '2px solid transparent'}; outline-offset: 2px;"
							title={col}
						></button>
					{/each}
					<label class="relative w-7 h-7 rounded-full overflow-hidden cursor-pointer flex items-center justify-center" style="border: 2px solid var(--border-strong); background: var(--surface-offset);">
						<input type="color" value={preference.pref.subtitleColor} oninput={(e) => preference.updatePreference({ subtitleColor: e.currentTarget.value })} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
						<span class="material-symbols-rounded" style="font-size:14px; color: var(--text-muted); pointer-events:none;">colorize</span>
					</label>
				</div>
			</div>

			<div class="flex items-center justify-between gap-4 px-4 py-4" style="border-bottom: 1px solid var(--border);">
				<div class="flex min-w-0 items-center gap-3">
					<div class="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0" style="background: var(--surface-offset);">
						<span class="material-symbols-rounded" style="font-size:16px; color: var(--text-muted);">layers</span>
					</div>
					<div class="min-w-0">
						<p class="text-[13px] font-bold" style="color: var(--text-primary);">Background</p>
						<p class="text-[10px]" style="color: var(--text-faint);">Latar belakang teks subtitle</p>
					</div>
				</div>
				<CustomSelect
					value={preference.pref.subtitleBg}
					options={subtitleBgOptions}
					minWidth={176}
					onChange={(subtitleBg) => preference.updatePreference({ subtitleBg })}
				/>
			</div>

			<div class="flex items-center justify-between gap-4 px-4 py-4" style="border-bottom: 1px solid var(--border);">
				<div class="flex min-w-0 items-center gap-3">
					<div class="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0" style="background: var(--surface-offset);">
						<span class="material-symbols-rounded" style="font-size:16px; color: var(--text-muted);">blur_on</span>
					</div>
					<div class="min-w-0">
						<p class="text-[13px] font-bold" style="color: var(--text-primary);">Bayangan teks</p>
						<p class="text-[10px]" style="color: var(--text-faint);">Efek shadow pada subtitle</p>
					</div>
				</div>
				<CustomSelect
					value={preference.pref.subtitleShadow}
					options={subtitleShadowOptions}
					minWidth={176}
					onChange={(subtitleShadow) =>
						preference.updatePreference({ subtitleShadow })}
				/>
			</div>

			<div class="flex items-center justify-between gap-4 px-4 py-4" style="border-bottom: 1px solid var(--border);">
				<div class="flex min-w-0 items-center gap-3">
					<div class="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0" style="background: var(--surface-offset);">
						<span class="material-symbols-rounded" style="font-size:16px; color: var(--text-muted);">vertical_align_bottom</span>
					</div>
					<div class="min-w-0">
						<p class="text-[13px] font-bold" style="color: var(--text-primary);">Posisi</p>
						<p class="text-[10px]" style="color: var(--text-faint);">Jarak subtitle dari bawah</p>
					</div>
				</div>
				<CustomSelect
					value={preference.pref.subtitlePosition}
					options={subtitlePositionOptions}
					minWidth={190}
					onChange={(subtitlePosition) =>
						preference.updatePreference({ subtitlePosition })}
				/>
			</div>

			<div class="px-4 py-4">
				<div class="flex items-center gap-3 mb-3">
					<div class="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0" style="background: var(--surface-offset);">
						<span class="material-symbols-rounded" style="font-size:16px; color: var(--text-muted);">opacity</span>
					</div>
					<div class="flex-1">
						<div class="flex items-center justify-between">
							<p class="text-[13px] font-bold" style="color: var(--text-primary);">Opacity</p>
							<span class="text-[12px] font-black tabular-nums" style="color: var(--accent);">{Math.round(preference.pref.subtitleOpacity * 100)}%</span>
						</div>
						<p class="text-[10px]" style="color: var(--text-faint);">Transparansi subtitle</p>
					</div>
				</div>
				<div class="px-1">
					<input
						type="range" min="0.1" max="1" step="0.05"
						value={preference.pref.subtitleOpacity}
						oninput={(e) => preference.updatePreference({ subtitleOpacity: Number(e.currentTarget.value) })}
						class="volume-slider w-full outline-none cursor-pointer appearance-none"
						style="background: linear-gradient(to right, var(--accent) {preference.pref.subtitleOpacity * 100}%, var(--surface-offset) {preference.pref.subtitleOpacity * 100}%);"
					/>
				</div>
			</div>
		</div>

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
						<span
							class="material-symbols-rounded"
							style="font-size:16px; color: var(--text-muted);"
						>
							notifications_active
						</span>
					</div>
					<div class="min-w-0 flex-1">
						<p class="text-[13px] font-bold" style="color: var(--text-primary);">
							Preferensi notifikasi
						</p>
						<p class="text-[10px] leading-4" style="color: var(--text-faint);">
							Atur kategori notif yang mau kamu terima. Inbox lengkapnya ada di halaman
							notifikasi.
						</p>
					</div>
					<a
						href="/notifications"
						class="shrink-0 rounded-[var(--radius-xl)] px-3 py-2 text-[11px] font-black transition-all"
						style="background: var(--accent-surface); color: var(--accent-text); border: 1px solid oklch(from var(--accent) l c h / 0.2);"
					>
						Buka Inbox
					</a>
				</div>
			</div>

			{#if !notifications.preferences}
				<div class="px-4 py-8 text-center">
					<p class="text-[12px] font-bold" style="color: var(--text-primary);">
						Memuat preferensi notifikasi...
					</p>
				</div>
			{:else}
				{#each notificationItems as item, i}
					<label
						class="flex items-center justify-between gap-4 px-4 py-4 cursor-pointer transition-colors"
						style="border-bottom: {i < notificationItems.length - 1 ? '1px solid var(--border)' : 'none'};"
					>
						<div class="flex items-center gap-3">
							<div
								class="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0"
								style="background: var(--surface-offset);"
							>
								<span
									class="material-symbols-rounded"
									style="font-size:16px; color: var(--text-muted);"
								>
									{item.icon}
								</span>
							</div>
							<div>
								<div class="flex items-center gap-2">
									<p class="text-[13px] font-bold" style="color: var(--text-primary);">
										{item.label}
									</p>
									{#if item.forced}
										<span
											class="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em]"
											style="background: var(--accent-surface); color: var(--accent-text);"
										>
											Wajib
										</span>
									{/if}
								</div>
								<p class="text-[10px]" style="color: var(--text-faint);">{item.desc}</p>
							</div>
						</div>

						<div class="relative shrink-0">
							<input
								type="checkbox"
								class="sr-only peer"
								checked={notifications.preferences[item.key]}
								onchange={(e) =>
									toggleNotificationPreference(item.key, e.currentTarget.checked)}
							/>
							<div
								class="w-12 h-6 rounded-full transition-all duration-200 peer-checked:shadow-sm"
								style="
                                background: {notifications.preferences[item.key]
									? 'var(--accent)'
									: 'var(--surface-offset)'};
                                border: 1.5px solid {notifications.preferences[item.key]
									? 'oklch(from var(--accent) l c h / 0.4)'
									: 'var(--border-strong)'};
                                box-shadow: {notifications.preferences[item.key]
									? '0 2px 8px var(--accent-glow)'
									: 'none'};
                            "
							>
								<div
									class="w-5 h-5 rounded-full bg-white transition-transform duration-200 mt-[1px]"
									style="
                                    transform: translateX({notifications.preferences[item.key]
										? '24px'
										: '2px'});
                                    box-shadow: 0 1px 4px oklch(0 0 0 / 0.2);
                                "
								></div>
							</div>
						</div>
					</label>
				{/each}
			{/if}
		</div>
	</div>
{/if}

<style>
	.volume-slider {
		height: 6px;
		border-radius: 9999px;
	}

	/* Track — background diambil dari inline style (gradient dinamis) */
	.volume-slider::-webkit-slider-runnable-track {
		height: 6px;
		border-radius: 9999px;
		background: inherit; /* ← kunci: pakai gradient dari inline style */
	}
	.volume-slider::-moz-range-track {
		height: 6px;
		border-radius: 9999px;
		background: inherit;
	}

	/* Thumb — bulat, accent color, glow saat active */
	.volume-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 2px 6px var(--accent-glow);
		margin-top: -6px;
		cursor: pointer;
		border: 2px solid white;
		transition:
			transform 0.15s,
			box-shadow 0.15s;
	}
	.volume-slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid white;
		background: var(--accent);
		box-shadow: 0 2px 6px var(--accent-glow);
		cursor: pointer;
		transition: transform 0.15s;
	}

	.volume-slider:active::-webkit-slider-thumb {
		transform: scale(1.2);
		box-shadow: 0 0 0 6px var(--accent-glow);
	}
	.volume-slider:active::-moz-range-thumb {
		transform: scale(1.2);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>
