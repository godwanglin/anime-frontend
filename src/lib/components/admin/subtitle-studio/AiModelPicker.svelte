<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	type PickerOption = {
		value: string;
		label: string;
		description?: string;
		meta?: string;
		features?: string[];
	};

	type UnsupportedOption = {
		label: string;
		description?: string;
	};

	let {
		value = $bindable(''),
		options = [],
		unsupportedOptions = [],
		menuTitle = '',
		icon = 'tune',
		disabled = false,
		align = 'right',
		compact = false,
		placement = 'bottom'
	}: {
		value: string;
		options?: PickerOption[];
		unsupportedOptions?: UnsupportedOption[];
		menuTitle?: string;
		icon?: string;
		disabled?: boolean;
		align?: 'left' | 'right';
		compact?: boolean;
		placement?: 'top' | 'bottom';
	} = $props();

	let open = $state(false);
	let rootEl = $state<HTMLDivElement | null>(null);
	let menuEl = $state<HTMLDivElement | null>(null);
	let menuStyle = $state('');
	let previewValue = $state('');
	let menuFrame = 0;

	const activeOption = $derived(
		options.find((option) => option.value === value) ?? options[0] ?? null
	);
	const previewOption = $derived(
		options.find((option) => option.value === (previewValue || value)) ?? activeOption
	);

	function closePicker() {
		open = false;
		previewValue = '';
	}

	function togglePicker() {
		if (disabled) return;
		open = !open;
		if (open) previewValue = value;
	}

	function chooseOption(nextValue: string) {
		value = nextValue;
		previewValue = nextValue;
		closePicker();
	}

	function portalToBody(node: HTMLDivElement) {
		if (typeof document === 'undefined') return;
		document.body.appendChild(node);
		scheduleMenuPosition();
		return {
			destroy() {
				node.remove();
			}
		};
	}

	function updateMenuPosition() {
		if (!open || !rootEl || typeof window === 'undefined') return;

		const rect = rootEl.getBoundingClientRect();
		const computed = getComputedStyle(rootEl);
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const width = Math.min(compact ? 260 : 280, viewportWidth - 24);
		const nextLeft =
			align === 'left' ? rect.left : rect.right - width;
		const left = Math.min(viewportWidth - width - 12, Math.max(12, nextLeft));
		const menuHeight = menuEl?.offsetHeight ?? 260;
		const desiredTop =
			placement === 'top' ? rect.top - menuHeight - 8 : rect.bottom + 8;
		const top = Math.min(viewportHeight - menuHeight - 12, Math.max(12, desiredTop));
		const themeVars = [
			'--sb-bg',
			'--sb-surface',
			'--sb-surface-2',
			'--sb-border',
			'--sb-border-strong',
			'--sb-text',
			'--sb-text-muted',
			'--sb-text-faint',
			'--sb-accent',
			'--sb-accent-light',
			'--sb-accent-surface',
			'--sb-accent-border'
		]
			.map((name) => `${name}:${computed.getPropertyValue(name).trim()};`)
			.join('');

		menuStyle =
			`${themeVars}left:${Math.round(left)}px;top:${Math.round(top)}px;width:${Math.round(width)}px;`;
	}

	function scheduleMenuPosition() {
		if (typeof window === 'undefined') return;
		cancelAnimationFrame(menuFrame);
		menuFrame = requestAnimationFrame(updateMenuPosition);
	}

	function handleWindowPointer(event: PointerEvent) {
		if (!open || !rootEl) return;
		if (
			event.target instanceof Node &&
			!rootEl.contains(event.target) &&
			!menuEl?.contains(event.target)
		) {
			closePicker();
		}
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') closePicker();
	}

	$effect(() => {
		if (!open || typeof window === 'undefined') return;
		scheduleMenuPosition();

		const handleViewportChange = () => scheduleMenuPosition();
		window.addEventListener('resize', handleViewportChange);
		window.addEventListener('scroll', handleViewportChange, true);

		return () => {
			window.removeEventListener('resize', handleViewportChange);
			window.removeEventListener('scroll', handleViewportChange, true);
			cancelAnimationFrame(menuFrame);
		};
	});

	$effect(() => {
		menuEl;
		if (open) scheduleMenuPosition();
	});
</script>

<svelte:window onpointerdown={handleWindowPointer} onkeydown={handleWindowKeydown} />

<div class="sb-ai-picker" class:is-compact={compact} bind:this={rootEl}>
	<button
		type="button"
		class="sb-ai-picker-trigger"
		class:is-open={open}
		{disabled}
		onclick={togglePicker}
		aria-haspopup="menu"
		aria-expanded={open}
		title={menuTitle || activeOption?.label || 'Pilih model'}
	>
		<AppIcon name={icon} class="sb-ai-picker-trigger-icon" />

		<span class="sb-ai-picker-trigger-text">
			{activeOption?.label || menuTitle || 'Pilih model'}
		</span>

		{#if activeOption?.meta}
			<span class="sb-ai-picker-trigger-meta">{activeOption.meta}</span>
		{/if}

		<AppIcon name="expand_more" class="sb-ai-picker-trigger-chevron" />
	</button>

	{#if open}
		<div
			use:portalToBody
			bind:this={menuEl}
			class="sb-ai-picker-menu"
			class:is-left={align === 'left'}
			class:is-compact={compact}
			class:is-top={placement === 'top'}
			style={menuStyle}
		>
			{#if menuTitle}
				<div class="sb-ai-picker-menu-head">
					<p>{menuTitle}</p>
				</div>
			{/if}

			<div class="sb-ai-picker-layout">
				<div class="sb-ai-picker-list" role="menu">
					{#each options as option}
						<button
							type="button"
							role="menuitemradio"
							aria-checked={value === option.value}
							class="sb-ai-picker-item"
							class:is-active={value === option.value}
							onmouseenter={() => (previewValue = option.value)}
							onfocus={() => (previewValue = option.value)}
							onclick={() => chooseOption(option.value)}
						>
							<span class="sb-ai-picker-item-copy">
								<strong>{option.label}</strong>
								{#if option.description}
									<small>{option.description}</small>
								{/if}
							</span>

							{#if value === option.value}
								<AppIcon name="check" class="sb-ai-picker-check" />
							{/if}
						</button>
					{/each}

					{#if unsupportedOptions.length}
						<div class="sb-ai-picker-note-group">
							<p class="sb-ai-picker-note-title">Belum cocok untuk timeline</p>

							<div class="sb-ai-picker-note-list">
								{#each unsupportedOptions as option}
									<div class="sb-ai-picker-note-item">
										<strong>{option.label}</strong>
										{#if option.description}
											<small>{option.description}</small>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				{#if previewOption && !compact}
					<aside class="sb-ai-picker-detail">
						<div class="sb-ai-picker-detail-head">
							<p>{previewOption.meta || 'Model aktif'}</p>
							{#if previewOption.value === value}
								<span>Dipilih</span>
							{/if}
						</div>

						<div class="sb-ai-picker-detail-body">
							<strong>{previewOption.label}</strong>
							<p>{previewOption.description || 'Tidak ada deskripsi tambahan.'}</p>
						</div>

						{#if previewOption.features?.length}
							<ul class="sb-ai-picker-detail-features">
								{#each previewOption.features as feature}
									<li>{feature}</li>
								{/each}
							</ul>
						{/if}
					</aside>
				{/if}
			</div>
		</div>
	{/if}
</div>
