<script module lang="ts">
	export const DEFAULT_ALPHABET = [
		'#',
		'A',
		'B',
		'C',
		'D',
		'E',
		'F',
		'G',
		'H',
		'I',
		'J',
		'K',
		'L',
		'M',
		'N',
		'O',
		'P',
		'Q',
		'R',
		'S',
		'T',
		'U',
		'V',
		'W',
		'X',
		'Y',
		'Z'
	];
</script>

<script lang="ts">
	type Props = {
		letters?: string[];
		enabled: Set<string> | string[];
		active?: string;
		onJump: (letter: string) => void;
		ariaLabel?: string;
		/** px range from pointer where magnify applies */
		magnifyRange?: number;
		/** max scale at center */
		magnifyMax?: number;
		/** vibrate ms on letter change while dragging */
		hapticMs?: number;
	};

	let {
		letters = DEFAULT_ALPHABET,
		enabled,
		active = '',
		onJump,
		ariaLabel = 'Loncat ke huruf',
		magnifyRange = 70,
		magnifyMax = 2.1,
		hapticMs = 4
	}: Props = $props();

	const enabledSet = $derived(enabled instanceof Set ? enabled : new Set(enabled));

	let railEl = $state<HTMLElement>();
	let interacting = $state(false);
	let activePointerId: number | null = null;
	let lastEmittedLetter = '';

	function getItems(): HTMLElement[] {
		if (!railEl) return [];
		return Array.from(railEl.querySelectorAll<HTMLElement>('[data-rail-letter]'));
	}

	function applyMagnify(pointerY: number | null) {
		const items = getItems();
		if (!railEl || pointerY === null) {
			for (const el of items) {
				el.style.transform = '';
				el.style.zIndex = '';
			}
			return;
		}
		const railRect = railEl.getBoundingClientRect();
		for (const el of items) {
			const r = el.getBoundingClientRect();
			const center = r.top - railRect.top + r.height / 2;
			const dist = Math.abs(center - pointerY);
			let scale = 1;
			if (dist < magnifyRange) {
				const t = 1 - dist / magnifyRange;
				// Smooth ease-out so the falloff feels organic
				const eased = t * t * (3 - 2 * t);
				scale = 1 + eased * (magnifyMax - 1);
			}
			el.style.transform = scale > 1.001 ? `scale(${scale.toFixed(3)})` : '';
			el.style.zIndex = scale > 1.001 ? '2' : '';
		}
	}

	function findEnabledLetterAt(pointerY: number): string | null {
		const items = getItems();
		if (!railEl || items.length === 0) return null;
		const railRect = railEl.getBoundingClientRect();
		let best: { letter: string; dist: number } | null = null;
		for (const el of items) {
			const letter = el.dataset.railLetter ?? '';
			if (!enabledSet.has(letter)) continue;
			const r = el.getBoundingClientRect();
			const center = r.top - railRect.top + r.height / 2;
			const dist = Math.abs(center - pointerY);
			if (!best || dist < best.dist) best = { letter, dist };
		}
		return best?.letter ?? null;
	}

	function emitJump(letter: string | null) {
		if (!letter || letter === lastEmittedLetter) return;
		lastEmittedLetter = letter;
		onJump(letter);
		if (hapticMs > 0 && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
			try {
				navigator.vibrate(hapticMs);
			} catch {
				/* ignore */
			}
		}
	}

	function handlePointerDown(e: PointerEvent) {
		if (!railEl) return;
		// Start gesture mode for both touch and mouse
		interacting = true;
		activePointerId = e.pointerId;
		try {
			railEl.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
		const rect = railEl.getBoundingClientRect();
		const y = e.clientY - rect.top;
		applyMagnify(y);
		const letter = findEnabledLetterAt(y);
		if (letter) emitJump(letter);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!railEl) return;
		const rect = railEl.getBoundingClientRect();
		const y = e.clientY - rect.top;

		if (interacting && e.pointerId === activePointerId) {
			applyMagnify(y);
			const letter = findEnabledLetterAt(y);
			if (letter) emitJump(letter);
			return;
		}

		// Hover magnify (mouse only, no jumping)
		if (e.pointerType === 'mouse') {
			const inside =
				e.clientX >= rect.left &&
				e.clientX <= rect.right &&
				e.clientY >= rect.top &&
				e.clientY <= rect.bottom;
			applyMagnify(inside ? y : null);
		}
	}

	function endGesture(e: PointerEvent) {
		if (e.pointerId !== activePointerId) return;
		if (railEl) {
			try {
				railEl.releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		}
		interacting = false;
		activePointerId = null;
		lastEmittedLetter = '';
		applyMagnify(null);
	}

	function handlePointerLeave() {
		if (!interacting) applyMagnify(null);
	}
</script>

<nav
	bind:this={railEl}
	class="rail"
	class:rail-interacting={interacting}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={endGesture}
	onpointercancel={endGesture}
	onpointerleave={handlePointerLeave}
	aria-label={ariaLabel}
>
	{#each letters as letter (letter)}
		{@const isEnabled = enabledSet.has(letter)}
		<button
			type="button"
			class="rail-item"
			class:rail-active={letter === active && isEnabled}
			class:rail-disabled={!isEnabled}
			data-rail-letter={letter}
			disabled={!isEnabled}
			aria-label="Loncat ke huruf {letter}"
			tabindex={isEnabled ? 0 : -1}
		>
			{letter}
		</button>
	{/each}
</nav>

<style>
	.rail {
		position: fixed;
		top: 50%;
		right: 8px;
		transform: translateY(-50%) scale(1);
		transform-origin: right center;
		display: flex;
		flex-direction: column;
		gap: 0;
		z-index: 30;
		padding: 6px 4px;
		background: oklch(from var(--surface) l c h / 0.78);
		backdrop-filter: blur(10px) saturate(140%);
		-webkit-backdrop-filter: blur(10px) saturate(140%);
		border: 1px solid var(--border);
		border-radius: 999px;
		box-shadow: 0 10px 28px oklch(0 0 0 / 0.08);
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		transition:
			transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
			background-color 220ms ease,
			border-color 220ms ease,
			box-shadow 220ms ease,
			padding 220ms ease;
	}

	.rail-interacting {
		transform: translateY(-50%) scale(1.35);
		background: oklch(from var(--surface) l c h / 0.96);
		border-color: var(--border-strong);
		padding: 8px 5px;
		box-shadow: 0 18px 44px oklch(0 0 0 / 0.18);
	}

	.rail-item {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		font-size: 9.5px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--text-faint);
		background: transparent;
		border: 0;
		border-radius: 999px;
		cursor: pointer;
		line-height: 1;
		padding: 0;
		transform-origin: center right;
		transition:
			color 140ms ease,
			background-color 140ms ease;
		/* No transform transition — JS sets it directly for smooth tracking */
	}

	.rail-item:hover {
		color: var(--text-primary);
	}

	.rail-active {
		color: var(--accent);
		background: var(--accent-surface);
		font-weight: 800;
	}

	.rail-disabled {
		opacity: 0.28;
		cursor: default;
		pointer-events: none;
	}

	@media (max-width: 640px) {
		.rail {
			right: 4px;
			padding: 5px 3px;
		}
		.rail-item {
			width: 14px;
			height: 13px;
			font-size: 9px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.rail-item {
			transform: none !important;
		}
	}
</style>
