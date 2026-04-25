<script lang="ts">
	type Props = {
		/** 'x' = vertical divider (resize width), 'y' = horizontal divider (resize height) */
		axis: 'x' | 'y';
		/** Invert delta — for panels anchored to right/bottom edge */
		invert?: boolean;
		/** Return the current panel size so drag can compute absolute size */
		getSize: () => number;
		onResize: (newSize: number) => void;
	};

	let { axis, invert = false, getSize, onResize }: Props = $props();

	let active = $state(false);

	function onPointerDown(e: PointerEvent) {
		e.preventDefault();
		active = true;
		const startPos = axis === 'x' ? e.clientX : e.clientY;
		const startSize = getSize();

		function onMove(ev: PointerEvent) {
			const rawDelta = (axis === 'x' ? ev.clientX : ev.clientY) - startPos;
			onResize(startSize + (invert ? -rawDelta : rawDelta));
		}

		function onUp() {
			active = false;
			window.removeEventListener('pointermove', onMove);
		}

		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp, { once: true });
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="sl-resize sl-resize-{axis} {active ? 'sl-resize-active' : ''}"
	onpointerdown={onPointerDown}
></div>
