<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { goto } from '$app/navigation';
	import SEO from '$lib/components/SEO.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { displayUserName } from '$lib/user-display';
	import { imageUrl } from '$lib/image-url';

	let username = $state(displayUserName(auth.user, ''));
	let avatar = $state(auth.user?.avatar ?? '');
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let message = $state('');
	let error = $state('');
	let savingProfile = $state(false);
	let savingPassword = $state(false);
	let uploadingAvatar = $state(false);
	let showCurrent = $state(false);
	let showNew = $state(false);
	let showConfirm = $state(false);

	const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
	const ALLOWED_AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'image/gif']);

	// Avatar preview — pakai avatar akun kalau ada, fallback ke dicebear
	const avatarPreview = $derived(
		avatar.trim()
			? imageUrl(avatar)
			: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username || 'A')}&backgroundColor=7c3aed`
	);

	function formatBytes(bytes: number) {
		if (!bytes) return '0 B';
		const units = ['B', 'KB', 'MB'];
		const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
		const value = bytes / 1024 ** index;
		return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
	}

	async function saveProfile() {
		if (!username.trim()) {
			error = 'Nama tidak boleh kosong';
			return;
		}
		error = '';
		message = '';
		savingProfile = true;
		try {
			await auth.updateProfile({ fullName: username });
			message = 'Nama profil berhasil disimpan';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal menyimpan profil';
		} finally {
			savingProfile = false;
		}
	}

	async function uploadAvatar(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		input.value = '';

		if (!file) return;

		if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
			error = 'Avatar harus PNG, JPG, JPEG, SVG, atau GIF';
			message = '';
			return;
		}

		if (file.size > MAX_AVATAR_BYTES) {
			error = `Ukuran avatar maksimal 5MB. File ini ${formatBytes(file.size)}`;
			message = '';
			return;
		}

		error = '';
		message = '';
		uploadingAvatar = true;

		try {
			const updated = await auth.uploadAvatar(file);
			avatar = updated.avatar ?? '';
			message = 'Avatar berhasil diperbarui';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal upload avatar';
		} finally {
			uploadingAvatar = false;
		}
	}

	async function savePassword() {
		if (!currentPassword || !newPassword) {
			error = 'Semua kolom password wajib diisi';
			return;
		}
		if (newPassword !== confirmPassword) {
			error = 'Konfirmasi password tidak cocok';
			return;
		}
		if (newPassword.length < 8) {
			error = 'Password baru minimal 8 karakter';
			return;
		}
		error = '';
		message = '';
		savingPassword = true;
		try {
			await auth.updatePassword({ currentPassword, newPassword });
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
			message = 'Password berhasil diperbarui';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal mengganti password';
		} finally {
			savingPassword = false;
		}
	}
</script>

<SEO title="Pengaturan" noindex />

{#if !auth.isLoggedIn}
	<!-- ── NOT LOGGED IN ── -->
	<div class="flex flex-col items-center justify-center py-24 px-6 text-center">
		<div
			class="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
			style="background: var(--accent-surface); border: 1px solid oklch(from var(--accent) l c h / 0.2);"
		>
			<AppIcon name="manage_accounts" style="font-size:28px; color: var(--accent);" />
		</div>
		<h1 class="text-[18px] font-black mb-1.5" style="color: var(--text-primary);">
			Login diperlukan
		</h1>
		<p class="text-[13px] mb-6 max-w-[240px]" style="color: var(--text-muted);">
			Masuk untuk mengatur nama, avatar, dan password akunmu.
		</p>
		<button
			onclick={() => goto('/login?redirect=/profile/settings')}
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
				Pengaturan Akun
			</h1>
			<p class="text-[12px] mt-0.5" style="color: var(--text-faint);">
				Edit nama tampilan, foto profil, dan password
			</p>
		</div>

		<!-- Toast feedback — inline, di atas form -->
		{#if message || error}
			<div
				class="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] mb-5 transition-all"
				style="
                    background: {message
					? 'color-mix(in oklch, #22c55e 8%, var(--surface))'
					: 'color-mix(in oklch, #ef4444 8%, var(--surface))'};
                    border: 1px solid {message
					? 'color-mix(in oklch, #22c55e 25%, transparent)'
					: 'color-mix(in oklch, #ef4444 25%, transparent)'};
                "
			>
				<AppIcon name={message ? 'check_circle' : 'error'} class="shrink-0"
					style="font-size:18px; color: {message ? '#22c55e' : '#ef4444'};" />
				<p
					class="text-[13px] font-bold"
					style="color: {message
						? 'color-mix(in oklch, #22c55e 80%, var(--text-primary))'
						: 'color-mix(in oklch, #ef4444 80%, var(--text-primary))'};"
				>
					{message || error}
				</p>
				<button
					onclick={() => {
						message = '';
						error = '';
					}}
					class="ml-auto shrink-0 transition-colors"
					style="color: var(--text-faint);"
				>
					<AppIcon name="close" style="font-size:16px;" />
				</button>
			</div>
		{/if}

		<!-- ════════════════════════════════
             SECTION 1 — Profil
        ════════════════════════════════ -->
		<p
			class="text-[9px] font-black uppercase tracking-[0.2em] mb-2 px-1"
			style="color: var(--text-faint);"
		>
			Profil
		</p>
		<div
			class="rounded-[var(--radius-2xl)] overflow-hidden mb-6"
			style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
		>
			<!-- Avatar preview row -->
			<div
				class="flex items-center gap-4 px-4 py-4"
				style="border-bottom: 1px solid var(--border);"
			>
				<!-- Ring double seperti di halaman profil utama. -->
				<div
					class="w-14 h-14 rounded-[var(--radius-xl)] overflow-hidden shrink-0"
					style="
                        box-shadow:
                            0 0 0 2px oklch(from var(--accent) l c h / 0.15),
                            0 0 0 4px oklch(from var(--accent) l c h / 0.08);
                    "
				>
					<img
						src={avatarPreview}
						alt="Preview avatar"
						class="w-full h-full object-cover"
						style="background: var(--surface-offset);"
					/>
				</div>
				<div class="flex-1 min-w-0">
					<p
						class="flex items-center gap-1.5 text-[13px] font-black"
						style="color: var(--text-primary);"
					>
						<span class="truncate">{username || 'Nama'}</span>
						{#if auth.user?.isVerified}
							<img src="/badges/verify.png" alt="Verified" class="h-3.5 w-3.5 shrink-0 object-contain" />
						{/if}
					</p>
					<p class="text-[10px]" style="color: var(--text-faint);">{auth.user?.email}</p>
				</div>
			</div>

			<!-- Form fields -->
			<div class="px-4 py-4 space-y-4">
				<!-- Display name field -->
				<div>
					<label
						for="profile-username"
						class="mb-1.5 flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.15em]"
						style="color: var(--accent-text);"
					>
						<span>Edit Nama Tampilan</span>
						<span class="normal-case tracking-normal" style="color: var(--text-faint);">
							Tampil di chat & profil
						</span>
					</label>
					<div class="relative">
						<AppIcon name="badge" class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
							style="font-size:16px; color: var(--text-faint);" />
						<input
							id="profile-username"
							bind:value={username}
							autocomplete="name"
							placeholder="Masukkan nama tampilan"
							class="w-full h-11 pl-9 pr-4 rounded-[var(--radius-xl)] text-[13px] outline-none transition-all"
							style="
                                background: color-mix(in oklch, var(--accent) 8%, var(--surface-offset));
                                border: 1px solid color-mix(in oklch, var(--accent) 35%, var(--border-strong));
                                color: var(--text-primary);
                            "
						/>
					</div>
					<p class="mt-1.5 text-[10px] font-semibold" style="color: var(--text-faint);">
						Username login tetap otomatis dari email. Yang bisa diedit di sini adalah nama tampilan.
					</p>
				</div>

				<!-- Username readonly field -->
				<div>
					<label
						for="profile-handle"
						class="block text-[9px] font-black uppercase tracking-[0.15em] mb-1.5"
						style="color: var(--text-faint);"
					>
						Username
					</label>
					<div class="relative">
						<AppIcon name="alternate_email" class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
							style="font-size:16px; color: var(--text-faint);" />
						<input
							id="profile-handle"
							value={auth.user?.username ?? ''}
							disabled
							aria-disabled="true"
							class="w-full h-11 pl-9 pr-4 rounded-[var(--radius-xl)] text-[13px] outline-none cursor-not-allowed"
							style="
                                background: color-mix(in oklch, var(--surface-offset) 82%, #000);
                                border: 1px solid var(--border);
                                color: var(--text-faint);
                                opacity: 0.85;
                            "
						/>
					</div>
				</div>

				<!-- Avatar upload field -->
				<div>
					<label
						for="profile-avatar"
						class="block text-[9px] font-black uppercase tracking-[0.15em] mb-1.5"
						style="color: var(--text-faint);"
					>
						Avatar
					</label>
					<label
						for="profile-avatar"
						class="flex min-h-[92px] cursor-pointer items-center gap-3 rounded-[var(--radius-xl)] px-4 py-3 transition-all active:scale-[0.99]"
						style="
							background: var(--surface-offset);
							border: 1px dashed color-mix(in oklch, var(--accent) 38%, var(--border-strong));
						"
					>
						<input
							id="profile-avatar"
							type="file"
							accept="image/png,image/jpeg,image/svg+xml,image/gif"
							class="hidden"
							disabled={uploadingAvatar}
							onchange={uploadAvatar}
						/>
						<div
							class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)]"
							style="background: color-mix(in oklch, var(--accent) 12%, var(--surface)); color: var(--accent);"
						>
							<AppIcon
								name={uploadingAvatar ? 'progress_activity' : 'cloud_upload'}
								class={uploadingAvatar ? 'animate-spin' : ''}
								style="font-size:22px;"
							/>
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-[13px] font-black" style="color: var(--text-primary);">
								{uploadingAvatar ? 'Mengupload avatar...' : 'Upload avatar baru'}
							</p>
							<p class="mt-1 text-[10px] font-semibold leading-4" style="color: var(--text-faint);">
								PNG, JPG, JPEG, SVG, GIF. Maksimal 5MB. Otomatis tersimpan setelah upload berhasil.
							</p>
						</div>
					</label>
				</div>

				<!-- Save profile button -->
				<button
					onclick={saveProfile}
					disabled={savingProfile}
					class="w-full h-11 rounded-[var(--radius-xl)] text-[13px] font-black text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
					style="background: var(--accent); box-shadow: 0 4px 12px var(--accent-glow);"
				>
					{#if savingProfile}
						<AppIcon name="progress_activity" class="animate-spin" style="font-size:16px;" />
						Menyimpan...
					{:else}
						<AppIcon name="save" style="font-size:16px;" />
						Simpan Nama
					{/if}
				</button>
			</div>
		</div>

		<!-- ════════════════════════════════
             SECTION 2 — Password
        ════════════════════════════════ -->
		<p
			class="text-[9px] font-black uppercase tracking-[0.2em] mb-2 px-1"
			style="color: var(--text-faint);"
		>
			Keamanan
		</p>
		<div
			class="rounded-[var(--radius-2xl)] overflow-hidden mb-4"
			style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
		>
			<div class="px-4 py-4 space-y-4">
				<!-- Password field helper component (inline — no separate component needed) -->
				{#each [{ id: 'current-password', label: 'Password sekarang', placeholder: '••••••••', bindKey: 'current' as const, showKey: 'showCurrent' as const, autocomplete: 'current-password' }, { id: 'new-password', label: 'Password baru', placeholder: 'Min. 8 karakter', bindKey: 'new' as const, showKey: 'showNew' as const, autocomplete: 'new-password' }, { id: 'confirm-password', label: 'Konfirmasi password baru', placeholder: 'Ulangi password baru', bindKey: 'confirm' as const, showKey: 'showConfirm' as const, autocomplete: 'new-password' }] as field}
					<div>
						<label
							for={field.id}
							class="block text-[9px] font-black uppercase tracking-[0.15em] mb-1.5"
							style="color: var(--text-faint);"
						>
							{field.label}
						</label>
						<div class="relative">
							<AppIcon name="lock" class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
								style="font-size:16px; color: var(--text-faint);" />
							<input
								id={field.id}
								type={field.bindKey === 'current'
									? showCurrent
										? 'text'
										: 'password'
									: field.bindKey === 'new'
										? showNew
											? 'text'
											: 'password'
										: showConfirm
											? 'text'
											: 'password'}
								value={field.bindKey === 'current'
									? currentPassword
									: field.bindKey === 'new'
										? newPassword
										: confirmPassword}
								oninput={(e) => {
									if (field.bindKey === 'current') currentPassword = e.currentTarget.value;
									else if (field.bindKey === 'new') newPassword = e.currentTarget.value;
									else confirmPassword = e.currentTarget.value;
								}}
								autocomplete={field.autocomplete as any}
								placeholder={field.placeholder}
								class="w-full h-11 pl-9 pr-11 rounded-[var(--radius-xl)] text-[13px] outline-none transition-all"
								style="
                                    background: var(--surface-offset);
                                    border: 1px solid {field.bindKey === 'confirm' &&
								confirmPassword &&
								confirmPassword !== newPassword
									? 'color-mix(in oklch, #ef4444 40%, var(--border))'
									: 'var(--border-strong)'};
                                    color: var(--text-primary);
                                "
							/>
							<!-- Show/hide toggle -->
							<button
								type="button"
								onclick={() => {
									if (field.bindKey === 'current') showCurrent = !showCurrent;
									else if (field.bindKey === 'new') showNew = !showNew;
									else showConfirm = !showConfirm;
								}}
								class="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
								style="color: var(--text-faint);"
								tabindex="-1"
							>
								<AppIcon name={field.bindKey === 'current'
										? showCurrent
											? 'visibility_off'
											: 'visibility'
										: field.bindKey === 'new'
											? showNew
												? 'visibility_off'
												: 'visibility'
											: showConfirm
												? 'visibility_off'
												: 'visibility'} style="font-size:16px;" />
							</button>
						</div>
						<!-- Confirm mismatch hint -->
						{#if field.bindKey === 'confirm' && confirmPassword && confirmPassword !== newPassword}
							<p
								class="text-[10px] font-semibold mt-1 ml-1"
								style="color: color-mix(in oklch, #ef4444 70%, var(--text-muted));"
							>
								Password tidak cocok
							</p>
						{/if}
					</div>
				{/each}

				<!-- Password strength indicator -->
				{#if newPassword}
					{@const strength =
						newPassword.length >= 12 &&
						/[A-Z]/.test(newPassword) &&
						/[0-9]/.test(newPassword) &&
						/[^a-zA-Z0-9]/.test(newPassword)
							? 3
							: newPassword.length >= 8 && (/[A-Z]/.test(newPassword) || /[0-9]/.test(newPassword))
								? 2
								: 1}
					<div>
						<div class="flex items-center gap-1.5 mb-1">
							{#each [1, 2, 3] as level}
								<div
									class="flex-1 h-1 rounded-full transition-all duration-300"
									style="background: {level <= strength
										? strength === 1
											? '#ef4444'
											: strength === 2
												? '#f59e0b'
												: '#22c55e'
										: 'var(--surface-offset)'};"
								></div>
							{/each}
							<span
								class="text-[9px] font-black ml-1 shrink-0"
								style="color: {strength === 1
									? '#ef4444'
									: strength === 2
										? '#f59e0b'
										: '#22c55e'};"
							>
								{strength === 1 ? 'Lemah' : strength === 2 ? 'Sedang' : 'Kuat'}
							</span>
						</div>
					</div>
				{/if}

				<!-- Save password button -->
				<button
					onclick={savePassword}
					disabled={savingPassword || (!!confirmPassword && confirmPassword !== newPassword)}
					class="w-full h-11 rounded-[var(--radius-xl)] text-[13px] font-black text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
					style="
                        background: color-mix(in oklch, #1a1714 85%, var(--accent));
                        box-shadow: var(--shadow-sm);
                    "
				>
					{#if savingPassword}
						<AppIcon name="progress_activity" class="animate-spin" style="font-size:16px;" />
						Menyimpan...
					{:else}
						<AppIcon name="shield" style="font-size:16px;" />
						Ganti Password
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}

	input:focus {
		border-color: oklch(from var(--accent) l c h / 0.6) !important;
		box-shadow: 0 0 0 3px oklch(from var(--accent) l c h / 0.12);
	}
</style>
