<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { onMount } from 'svelte';
	import { adminApi } from '$lib/admin/api';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	const groups = [
		{
			id: 'general',
			label: 'General',
			icon: 'language',
			keys: [
				'site.name',
				'site.tagline',
				'site.description',
				'site.url',
				'site.logo',
				'site.favicon',
				'site.language',
				'site.maintenanceMode',
				'site.maintenanceMessage'
			]
		},
		{
			id: 'seo',
			label: 'SEO',
			icon: 'search',
			keys: [
				'seo.titleTemplate',
				'seo.defaultTitle',
				'seo.defaultDescription',
				'seo.keywords',
				'seo.ogImage',
				'seo.twitterCard',
				'seo.twitterSite',
				'seo.robotsTxt',
				'seo.canonicalUrl',
				'seo.structuredData'
			]
		},
		{
			id: 'analytics',
			label: 'Analytics',
			icon: 'monitoring',
			keys: [
				'analytics.googleTagId',
				'analytics.googleTagManagerId',
				'analytics.googleSearchConsoleVerification',
				'analytics.clarityProjectId',
				'analytics.enabled'
			]
		},
		{
			id: 'appearance',
			label: 'Tampilan',
			icon: 'palette',
			keys: [
				'appearance.primaryColor',
				'appearance.defaultTheme',
				'appearance.footerText',
				'appearance.announcementBar'
			]
		},
		{
			id: 'player',
			label: 'Player',
			icon: 'play_circle',
			keys: [
				'player.defaultQuality',
				'player.autoPlay',
				'player.autoNextEpisode',
				'player.skipIntroSeconds'
			]
		},
		{
			id: 'social',
			label: 'Social',
			icon: 'share',
			keys: [
				'social.facebook',
				'social.twitter',
				'social.instagram',
				'social.discord',
				'social.telegram'
			]
		}
	];

	let active = $state('general');
	let config = $state<Record<string, string>>({});
	let dirty = $state<Set<string>>(new Set());
	let isLoading = $state(true);
	const current = $derived(groups.find((item) => item.id === active) ?? groups[0]);

	async function load() {
		isLoading = true;
		config = (await adminApi<Record<string, string>>('/site-config')).data;
		isLoading = false;
	}

	function update(key: string, value: string) {
		config = { ...config, [key]: value };
		dirty = new Set([...dirty, active]);
	}

	async function saveGroup() {
		await adminApi('/site-config/batch', {
			method: 'PUT',
			body: JSON.stringify({
				configs: current.keys.map((key) => ({ key, value: config[key] ?? '' }))
			})
		});
		dirty.delete(active);
		dirty = new Set(dirty);
		adminToast.success('Site config disimpan');
	}

	onMount(load);
</script>

<div class="space-y-5">
	<div>
		<h2 class="text-2xl font-black">Site Config</h2>
		<p class="text-sm text-zinc-500">
			Kelola general, SEO, analytics, tampilan, player, dan social.
		</p>
	</div>
	<div class="overflow-x-auto border-b border-zinc-800">
		<div class="flex min-w-max gap-2">
			{#each groups as group}
				<button
					onclick={() => (active = group.id)}
					class="relative flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold {active ===
					group.id
						? 'border-violet-500 text-violet-300'
						: 'border-transparent text-zinc-500'}"
				>
					<AppIcon name={group.icon} class="text-[18px]" />{group.label}
					{#if dirty.has(group.id)}<span class="h-2 w-2 rounded-full bg-yellow-400"></span>{/if}
				</button>
			{/each}
		</div>
	</div>

	{#if isLoading}
		<div class="h-96 animate-pulse rounded-xl bg-zinc-900"></div>
	{:else}
		<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
			<div class="grid gap-4 lg:grid-cols-2">
				{#each current.keys as key}
					<label
						class={key.includes('description') ||
						key.includes('robotsTxt') ||
						key.includes('structuredData')
							? 'lg:col-span-2'
							: ''}
					>
						<span class="mb-1.5 block text-xs font-bold text-zinc-500">{key}</span>
						{#if key.includes('description') || key.includes('robotsTxt') || key.includes('structuredData')}
							<textarea
								rows="5"
								value={config[key] ?? ''}
								oninput={(e) => update(key, e.currentTarget.value)}
								class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-violet-500"
							></textarea>
						{:else if key.endsWith('enabled') || key.includes('Mode') || key.includes('auto')}
							<select
								value={config[key] ?? 'false'}
								onchange={(e) => update(key, e.currentTarget.value)}
								class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
							>
								<option value="false">OFF</option><option value="true">ON</option>
							</select>
						{:else}
							<input
								value={config[key] ?? ''}
								oninput={(e) => update(key, e.currentTarget.value)}
								class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm outline-none focus:border-violet-500"
							/>
						{/if}
						{#if key.includes('logo') || key.includes('favicon') || key.includes('Image')}
							{#if config[key]}<img
									src={config[key]}
									alt={key}
									class="mt-2 h-16 w-16 rounded-lg object-contain bg-zinc-800"
								/>{/if}
						{/if}
					</label>
				{/each}
			</div>
			<button
				onclick={saveGroup}
				class="mt-5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700"
				>Simpan Semua Perubahan</button
			>
		</section>
	{/if}
</div>
