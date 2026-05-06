<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { adminApi } from '$lib/admin/api';
	import { adminToast } from '$lib/stores/adminToast.svelte';
	import { onMount } from 'svelte';

	type MailStatus = 'planned' | 'installing' | 'ready' | 'maintenance';

	type MailConfig = {
		domain: string;
		hostname: string;
		adminEmail: string;
		webmailUrl: string;
		adminUrl: string;
		provider: 'mailcow';
		installPath: string;
		status: MailStatus;
		smtpHost: string;
		smtpPort: number;
		smtpSecure: boolean;
		smtpTlsRejectUnauthorized: boolean;
		smtpUser: string;
		smtpPassword?: string;
		smtpPasswordSet: boolean;
		smtpFromName: string;
		smtpFromEmail: string;
	};

	type MailPayload = {
		config: MailConfig;
		installScript: string;
		statusChecks: string[];
	};

	const emptyConfig: MailConfig = {
		domain: '',
		hostname: '',
		adminEmail: '',
		webmailUrl: '',
		adminUrl: '',
		provider: 'mailcow',
		installPath: '/opt/mailcow-dockerized',
		status: 'planned',
		smtpHost: '',
		smtpPort: 587,
		smtpSecure: false,
		smtpTlsRejectUnauthorized: true,
		smtpUser: '',
		smtpPassword: '',
		smtpPasswordSet: false,
		smtpFromName: 'Weebin',
		smtpFromEmail: ''
	};

	let config = $state<MailConfig>({ ...emptyConfig });
	let installScript = $state('');
	let statusChecks = $state<string[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let previewMode = $state<'webmail' | 'admin'>('webmail');

	const activePreviewUrl = $derived(
		previewMode === 'webmail' ? config.webmailUrl : config.adminUrl
	);

	async function load() {
		loading = true;
		error = '';
		try {
			const response = await adminApi<MailPayload>('/mailserver');
			applyPayload(response.data);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal memuat mailserver';
		} finally {
			loading = false;
		}
	}

	function applyPayload(payload: MailPayload) {
		config = { ...emptyConfig, ...payload.config };
		installScript = payload.installScript;
		statusChecks = payload.statusChecks;
	}

	function update<K extends keyof MailConfig>(key: K, value: MailConfig[K]) {
		config = { ...config, [key]: value };

		if (key === 'domain' && value && !config.hostname) {
			config = { ...config, hostname: `mail.${String(value).replace(/^mail\./, '')}` };
		}
		if (key === 'hostname' && value) {
			const hostname = String(value).replace(/\/+$/, '');
			if (!config.webmailUrl) config = { ...config, webmailUrl: `https://${hostname}/SOGo` };
			if (!config.adminUrl) config = { ...config, adminUrl: `https://${hostname}` };
			if (!config.smtpHost) config = { ...config, smtpHost: hostname };
		}
	}

	async function save() {
		saving = true;
		error = '';
		try {
			const response = await adminApi<MailPayload>('/mailserver', {
				method: 'PUT',
				body: JSON.stringify(config)
			});
			applyPayload(response.data);
			adminToast.success('Konfigurasi mailserver disimpan');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal menyimpan mailserver';
		} finally {
			saving = false;
		}
	}

	async function copyText(text: string, label: string) {
		await navigator.clipboard.writeText(text);
		adminToast.success(`${label} disalin`);
	}

	function statusClass(status: MailStatus) {
		if (status === 'ready') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
		if (status === 'installing') return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
		if (status === 'maintenance') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
		return 'border-zinc-700 bg-zinc-900 text-zinc-400';
	}

	onMount(load);
</script>

<div class="space-y-5">
	<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.18em] text-violet-400">Weebin Mail</p>
			<h2 class="mt-1 text-2xl font-black text-zinc-50">Mail Server</h2>
			<p class="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
				Setup email domain sendiri dengan Mailcow, simpan akses webmail, dan pakai script SSH yang
				siap jalan di VPS.
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				onclick={load}
				class="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800"
			>
				<AppIcon name="refresh" class="text-[18px]" />
				Refresh
			</button>
			<button
				type="button"
				onclick={save}
				disabled={saving}
				class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
			>
				<AppIcon name="save" class="text-[18px]" />
				{saving ? 'Menyimpan...' : 'Simpan'}
			</button>
		</div>
	</div>

	{#if error}
		<div
			class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200"
		>
			{error}
		</div>
	{/if}

	{#if loading}
		<div class="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
			<div class="h-96 animate-pulse rounded-xl bg-zinc-900"></div>
			<div class="h-96 animate-pulse rounded-xl bg-zinc-900"></div>
		</div>
	{:else}
		<div class="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<div class="mb-5 flex items-center justify-between gap-3">
					<div>
						<h3 class="text-lg font-black text-zinc-100">Konfigurasi</h3>
						<p class="text-sm text-zinc-500">Gunakan subdomain mail, contoh mail.domain.com.</p>
					</div>
					<span
						class="rounded-full border px-3 py-1 text-xs font-black {statusClass(config.status)}"
					>
						{config.status}
					</span>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<label>
						<span class="mb-1.5 block text-xs font-bold text-zinc-500">Domain utama</span>
						<input
							value={config.domain}
							oninput={(e) => update('domain', e.currentTarget.value)}
							placeholder="weebin.com"
							class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm outline-none focus:border-violet-500"
						/>
					</label>
					<label>
						<span class="mb-1.5 block text-xs font-bold text-zinc-500">Hostname mail</span>
						<input
							value={config.hostname}
							oninput={(e) => update('hostname', e.currentTarget.value)}
							placeholder="mail.weebin.com"
							class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm outline-none focus:border-violet-500"
						/>
					</label>
					<label>
						<span class="mb-1.5 block text-xs font-bold text-zinc-500">Email admin</span>
						<input
							value={config.adminEmail}
							oninput={(e) => update('adminEmail', e.currentTarget.value)}
							placeholder="admin@weebin.com"
							class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm outline-none focus:border-violet-500"
						/>
					</label>
					<label>
						<span class="mb-1.5 block text-xs font-bold text-zinc-500">Status</span>
						<select
							value={config.status}
							onchange={(e) => update('status', e.currentTarget.value as MailStatus)}
							class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm outline-none focus:border-violet-500"
						>
							<option value="planned">Planned</option>
							<option value="installing">Installing</option>
							<option value="ready">Ready</option>
							<option value="maintenance">Maintenance</option>
						</select>
					</label>
					<label class="md:col-span-2">
						<span class="mb-1.5 block text-xs font-bold text-zinc-500">Install path VPS</span>
						<input
							value={config.installPath}
							oninput={(e) => update('installPath', e.currentTarget.value)}
							class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm outline-none focus:border-violet-500"
						/>
					</label>
					<label>
						<span class="mb-1.5 block text-xs font-bold text-zinc-500">Webmail URL</span>
						<input
							value={config.webmailUrl}
							oninput={(e) => update('webmailUrl', e.currentTarget.value)}
							placeholder="https://mail.weebin.com/SOGo"
							class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm outline-none focus:border-violet-500"
						/>
					</label>
					<label>
						<span class="mb-1.5 block text-xs font-bold text-zinc-500">Mailcow admin URL</span>
						<input
							value={config.adminUrl}
							oninput={(e) => update('adminUrl', e.currentTarget.value)}
							placeholder="https://mail.weebin.com"
							class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm outline-none focus:border-violet-500"
						/>
					</label>
				</div>

				<div class="mt-6 border-t border-zinc-800 pt-5">
					<div class="mb-4">
						<h4 class="font-black text-zinc-100">SMTP Aplikasi</h4>
						<p class="mt-1 text-sm text-zinc-500">
							Dipakai untuk reset password dan email sistem dari Weebin.
						</p>
					</div>
					<div class="grid gap-4 md:grid-cols-2">
						<label>
							<span class="mb-1.5 block text-xs font-bold text-zinc-500">SMTP host</span>
							<input
								value={config.smtpHost}
								oninput={(e) => update('smtpHost', e.currentTarget.value)}
								placeholder="mail.weebin.site"
								class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm outline-none focus:border-violet-500"
							/>
						</label>
						<label>
							<span class="mb-1.5 block text-xs font-bold text-zinc-500">SMTP port</span>
							<input
								value={config.smtpPort}
								type="number"
								min="1"
								max="65535"
								oninput={(e) => update('smtpPort', Number(e.currentTarget.value))}
								class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm outline-none focus:border-violet-500"
							/>
						</label>
						<label>
							<span class="mb-1.5 block text-xs font-bold text-zinc-500">SMTP user</span>
							<input
								value={config.smtpUser}
								oninput={(e) => update('smtpUser', e.currentTarget.value)}
								placeholder="noreply@weebin.site"
								class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm outline-none focus:border-violet-500"
							/>
						</label>
						<label>
							<span class="mb-1.5 block text-xs font-bold text-zinc-500">
								SMTP password {config.smtpPasswordSet ? '(tersimpan)' : ''}
							</span>
							<input
								value={config.smtpPassword ?? ''}
								type="password"
								autocomplete="new-password"
								oninput={(e) => update('smtpPassword', e.currentTarget.value)}
								placeholder={config.smtpPasswordSet ? 'Isi hanya kalau ingin mengganti' : 'Password mailbox'}
								class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm outline-none focus:border-violet-500"
							/>
						</label>
						<label>
							<span class="mb-1.5 block text-xs font-bold text-zinc-500">From name</span>
							<input
								value={config.smtpFromName}
								oninput={(e) => update('smtpFromName', e.currentTarget.value)}
								placeholder="Weebin"
								class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm outline-none focus:border-violet-500"
							/>
						</label>
						<label>
							<span class="mb-1.5 block text-xs font-bold text-zinc-500">From email</span>
							<input
								value={config.smtpFromEmail}
								oninput={(e) => update('smtpFromEmail', e.currentTarget.value)}
								placeholder="noreply@weebin.site"
								class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm outline-none focus:border-violet-500"
							/>
						</label>
						<label class="flex items-center gap-3 md:col-span-2">
							<input
								checked={config.smtpSecure}
								type="checkbox"
								onchange={(e) => update('smtpSecure', e.currentTarget.checked)}
								class="h-4 w-4 rounded border-zinc-700 bg-zinc-800"
							/>
							<span class="text-sm font-bold text-zinc-300">
								Gunakan SSL langsung. Untuk port 587 STARTTLS, biarkan tidak dicentang.
							</span>
						</label>
						<label class="flex items-center gap-3 md:col-span-2">
							<input
								checked={config.smtpTlsRejectUnauthorized}
								type="checkbox"
								onchange={(e) => update('smtpTlsRejectUnauthorized', e.currentTarget.checked)}
								class="h-4 w-4 rounded border-zinc-700 bg-zinc-800"
							/>
							<span class="text-sm font-bold text-zinc-300">
								Validasi sertifikat TLS SMTP. Matikan kalau mailserver pakai sertifikat lokal.
							</span>
						</label>
					</div>
				</div>
			</section>

			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h3 class="text-lg font-black text-zinc-100">Webmail Preview</h3>
						<p class="text-sm text-zinc-500">Embed bisa gagal kalau panel mail melarang iframe.</p>
					</div>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => (previewMode = 'webmail')}
							class="rounded-lg px-3 py-2 text-xs font-black {previewMode === 'webmail'
								? 'bg-violet-600 text-white'
								: 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'}"
						>
							Webmail
						</button>
						<button
							type="button"
							onclick={() => (previewMode = 'admin')}
							class="rounded-lg px-3 py-2 text-xs font-black {previewMode === 'admin'
								? 'bg-violet-600 text-white'
								: 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'}"
						>
							Admin
						</button>
					</div>
				</div>

				{#if activePreviewUrl}
					<div class="mb-3 flex flex-wrap gap-2">
						<a
							href={activePreviewUrl}
							target="_blank"
							rel="noreferrer"
							class="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-300 hover:bg-zinc-800"
						>
							<AppIcon name="open_in_new" class="text-[16px]" />
							Buka tab baru
						</a>
						<button
							type="button"
							onclick={() => copyText(activePreviewUrl, 'URL')}
							class="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-300 hover:bg-zinc-800"
						>
							<AppIcon name="content_copy" class="text-[16px]" />
							Copy URL
						</button>
					</div>
					<iframe
						title="Mail panel preview"
						src={activePreviewUrl}
						class="h-[520px] w-full rounded-lg border border-zinc-800 bg-zinc-950"
					></iframe>
				{:else}
					<div
						class="flex h-[520px] items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-950 text-center"
					>
						<div>
							<AppIcon name="alternate_email" class="mx-auto mb-3 text-[38px] text-zinc-600" />
							<p class="font-black text-zinc-300">URL webmail belum diisi</p>
							<p class="mt-1 text-sm text-zinc-500">Isi hostname lalu simpan konfigurasi.</p>
						</div>
					</div>
				{/if}
			</section>
		</div>

		<div class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<div class="mb-4 flex items-center justify-between gap-3">
					<div>
						<h3 class="text-lg font-black text-zinc-100">Script SSH Install</h3>
						<p class="text-sm text-zinc-500">
							Jalankan setelah DNS A record mail sudah mengarah ke VPS.
						</p>
					</div>
					<button
						type="button"
						onclick={() => copyText(installScript, 'Script SSH')}
						class="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-black text-zinc-200 hover:bg-zinc-700"
					>
						<AppIcon name="content_copy" class="text-[16px]" />
						Copy
					</button>
				</div>
				<pre
					class="max-h-[520px] overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-xs leading-6 text-zinc-300">{installScript}</pre>
			</section>

			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<h3 class="text-lg font-black text-zinc-100">Checklist DNS & Tes</h3>
				<div class="mt-4 space-y-3">
					{#each statusChecks as command}
						<div class="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
							<code class="block break-all text-xs text-zinc-300">{command}</code>
						</div>
					{/each}
				</div>
				<div
					class="mt-5 rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100"
				>
					Port penting: 25, 465, 587, 993, 80, 443. PTR/rDNS wajib diset di panel provider VPS,
					bukan dari aplikasi ini.
				</div>
			</section>
		</div>
	{/if}
</div>
