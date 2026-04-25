<script lang="ts" module>
	export type CustomSelectOption = {
		value: string;
		label: string;
		description?: string;
		icon?: string;
		swatch?: string;
	};
</script>

<script lang="ts">
	import { onMount, tick } from 'svelte';

	type Props = {
		value: string;
		options: CustomSelectOption[];
		placeholder?: string;
		disabled?: boolean;
		align?: 'left' | 'right';
		minWidth?: number;
		onChange: (value: string) => void;
	};

	let {
		value,
		options,
		placeholder = 'Pilih',
		disabled = false,
		align = 'right',
		minWidth = 180,
		onChange
	}: Props = $props();

	let open = $state(false);
	let activeIndex = $state(0);
	let triggerEl = $state<HTMLButtonElement>();
	let menuStyle = $state('');

	const selected = $derived(options.find((option) => option.value === value));

	function selectedIndex() {
		return Math.max(0, options.findIndex((option) => option.value === value));
	}

	function positionMenu() {
		if (!triggerEl || !open) return;

		const rect = triggerEl.getBoundingClientRect();
		const width = Math.max(rect.width, minWidth);
		const left =
			align === 'right'
				? Math.min(window.innerWidth - width - 12, Math.max(12, rect.right - width))
				: Math.min(window.innerWidth - width - 12, Math.max(12, rect.left));
		const spaceBelow = window.innerHeight - rect.bottom - 12;
		const spaceAbove = rect.top - 12;
		const maxHeight = Math.max(132, Math.min(280, Math.max(spaceBelow, spaceAbove)));
		const top =
			spaceBelow >= 132 || spaceBelow >= spaceAbove
				? rect.bottom + 8
				: Math.max(12, rect.top - maxHeight - 8);

		menuStyle = `left:${left}px; top:${top}px; width:${width}px; max-height:${maxHeight}px;`;
	}

	async function toggleMenu() {
		if (disabled) return;
		open = !open;
		if (open) {
			activeIndex = selectedIndex();
			await tick();
			positionMenu();
		}
	}

	function closeMenu() {
		open = false;
	}

	function selectOption(option: CustomSelectOption) {
		onChange(option.value);
		closeMenu();
		triggerEl?.focus();
	}

	function onTriggerKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!open) {
				void toggleMenu();
				return;
			}
			activeIndex =
				event.key === 'ArrowDown'
					? (activeIndex + 1) % options.length
					: (activeIndex - 1 + options.length) % options.length;
		}

		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (!open) void toggleMenu();
			else if (options[activeIndex]) selectOption(options[activeIndex]);
		}

		if (event.key === 'Escape') {
			closeMenu();
		}
	}

	function onDocumentPointerdown(event: PointerEvent) {
		if (!open) return;
		const target = event.target as Node;
		if (triggerEl?.contains(target)) return;
		if (target instanceof Element && target.closest('[data-custom-select-menu]')) return;
		closeMenu();
	}

	onMount(() => {
		document.addEventListener('pointerdown', onDocumentPointerdown);
		window.addEventListener('resize', positionMenu);
		window.addEventListener('scroll', positionMenu, true);

		return () => {
			document.removeEventListener('pointerdown', onDocumentPointerdown);
			window.removeEventListener('resize', positionMenu);
			window.removeEventListener('scroll', positionMenu, true);
		};
	});
</script>

<button
	bind:this={triggerEl}
	type="button"
	class="cs-trigger"
	aria-haspopup="listbox"
	aria-expanded={open}
	{disabled}
	onclick={toggleMenu}
	onkeydown={onTriggerKeydown}
>
	<span class="cs-value">
		{#if selected?.swatch}
			<span class="cs-swatch" style="background: {selected.swatch};"></span>
		{/if}
		{#if selected?.icon}
			<span class="material-symbols-rounded cs-icon">{selected.icon}</span>
		{/if}
		<span class="cs-label">{selected?.label ?? placeholder}</span>
	</span>
	<span class="material-symbols-rounded cs-chevron {open ? 'open' : ''}">expand_more</span>
</button>

{#if open}
	<div data-custom-select-menu class="cs-menu" style={menuStyle}>
		<div class="cs-list" role="listbox" tabindex="-1">
			{#each options as option, index}
				<button
					type="button"
					role="option"
					aria-selected={option.value === value}
					class="cs-option"
					class:active={option.value === value}
					class:focused={index === activeIndex}
					onclick={() => selectOption(option)}
					onmouseenter={() => (activeIndex = index)}
				>
					{#if option.swatch}
						<span class="cs-option-swatch" style="background: {option.swatch};"></span>
					{/if}
					{#if option.icon}
						<span class="material-symbols-rounded cs-option-icon">{option.icon}</span>
					{/if}
					<span class="cs-option-copy">
						<span class="cs-option-label">{option.label}</span>
						{#if option.description}
							<span class="cs-option-desc">{option.description}</span>
						{/if}
					</span>
					{#if option.value === value}
						<span class="material-symbols-rounded cs-check">check</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.cs-trigger {
		position: relative;
		display: inline-flex;
		min-width: 142px;
		max-width: min(220px, 58vw);
		height: 38px;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		border-radius: var(--radius-xl);
		border: 1px solid var(--border-strong);
		background: var(--surface-offset);
		padding: 0 10px 0 13px;
		color: var(--text-primary);
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease,
			transform 0.15s ease;
	}

	.cs-trigger:hover,
	.cs-trigger[aria-expanded='true'] {
		border-color: oklch(from var(--accent) l c h / 0.42);
		box-shadow: 0 3px 12px var(--accent-glow);
	}

	.cs-trigger:active {
		transform: scale(0.98);
	}

	.cs-trigger:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.cs-value {
		display: inline-flex;
		min-width: 0;
		align-items: center;
		gap: 8px;
	}

	.cs-label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
		font-weight: 800;
	}

	.cs-icon,
	.cs-chevron {
		flex-shrink: 0;
		font-size: 16px;
		color: var(--text-faint);
	}

	.cs-chevron {
		transition: transform 0.16s ease;
	}

	.cs-chevron.open {
		transform: rotate(180deg);
	}

	.cs-swatch,
	.cs-option-swatch {
		display: inline-block;
		flex-shrink: 0;
		width: 15px;
		height: 15px;
		border-radius: 9999px;
		border: 1px solid var(--border-strong);
	}

	.cs-menu {
		position: fixed;
		z-index: 90;
		overflow: hidden;
		border-radius: var(--radius-xl);
		border: 1px solid var(--border-strong);
		background: var(--surface);
		box-shadow:
			0 16px 36px oklch(0 0 0 / 0.18),
			0 4px 12px oklch(0 0 0 / 0.08);
	}

	.cs-list {
		max-height: inherit;
		overflow-y: auto;
		padding: 6px;
		outline: none;
	}

	.cs-option {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 10px;
		border-radius: var(--radius-lg);
		padding: 9px 9px;
		color: var(--text-muted);
		text-align: left;
		transition:
			background 0.14s ease,
			color 0.14s ease;
	}

	.cs-option:hover,
	.cs-option.focused {
		background: var(--surface-offset);
		color: var(--text-primary);
	}

	.cs-option.active {
		background: var(--accent-surface);
		color: var(--accent-text);
	}

	.cs-option-icon,
	.cs-check {
		flex-shrink: 0;
		font-size: 16px;
	}

	.cs-check {
		margin-left: auto;
		color: var(--accent);
	}

	.cs-option-copy {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		gap: 1px;
	}

	.cs-option-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
		font-weight: 850;
	}

	.cs-option-desc {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 10px;
		color: var(--text-faint);
	}
</style>
