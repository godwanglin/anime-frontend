<script lang="ts" module>
	let royalCounter = 0;
</script>

<script lang="ts">
	import { getNameTagClass, getNameTagStyle, type EquippedNameTag } from '$lib/decorations';

	type Props = {
		name: string;
		nametag?: EquippedNameTag;
		class?: string;
	};

	const { name, nametag = null, class: className = '' }: Props = $props();
	const style = $derived(getNameTagStyle(nametag));
	const nameTagClass = $derived(getNameTagClass(nametag));
	const royalUid = `royal-${++royalCounter}`;
</script>

<span class="username {nameTagClass} {className}" data-text={name}>
	{#if style === 'royal'}
		<svg
			class="royal-ornament royal-ornament-left"
			viewBox="0 0 64 40"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			focusable="false"
		>
			<defs>
				<linearGradient id="{royalUid}-gold" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#fff4c2" />
					<stop offset="32%" stop-color="#f0c75a" />
					<stop offset="62%" stop-color="#9a661c" />
					<stop offset="100%" stop-color="#3a2208" />
				</linearGradient>
				<radialGradient id="{royalUid}-gem" cx="50%" cy="38%" r="65%">
					<stop offset="0%" stop-color="#fee2e2" />
					<stop offset="38%" stop-color="#dc2626" />
					<stop offset="100%" stop-color="#3f0808" />
				</radialGradient>
			</defs>
			<path
				d="M 64,4 C 48,2 30,6 18,12 C 8,17 4,20 8,22 C 18,20 28,16 42,16 C 54,16 60,14 64,12 Z"
				fill="url(#{royalUid}-gold)"
				stroke="#2a1804"
				stroke-width="0.7"
				stroke-linejoin="round"
			/>
			<path
				d="M 64,36 C 48,38 30,34 18,28 C 8,23 4,20 8,18 C 18,20 28,24 42,24 C 54,24 60,26 64,28 Z"
				fill="url(#{royalUid}-gold)"
				stroke="#2a1804"
				stroke-width="0.7"
				stroke-linejoin="round"
			/>
			<ellipse
				cx="46"
				cy="20"
				rx="5.4"
				ry="6.2"
				fill="url(#{royalUid}-gem)"
				stroke="#7c1d1d"
				stroke-width="0.6"
			/>
			<ellipse cx="44.4" cy="17.5" rx="1.6" ry="2.2" fill="#fecaca" opacity="0.8" />
		</svg>
		<span class="royal-text">{name}</span>
		<svg
			class="royal-ornament royal-ornament-right"
			viewBox="0 0 64 40"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			focusable="false"
		>
			<g transform="translate(64,0) scale(-1,1)">
				<path
					d="M 64,4 C 48,2 30,6 18,12 C 8,17 4,20 8,22 C 18,20 28,16 42,16 C 54,16 60,14 64,12 Z"
					fill="url(#{royalUid}-gold)"
					stroke="#2a1804"
					stroke-width="0.7"
					stroke-linejoin="round"
				/>
				<path
					d="M 64,36 C 48,38 30,34 18,28 C 8,23 4,20 8,18 C 18,20 28,24 42,24 C 54,24 60,26 64,28 Z"
					fill="url(#{royalUid}-gold)"
					stroke="#2a1804"
					stroke-width="0.7"
					stroke-linejoin="round"
				/>
				<ellipse
					cx="46"
					cy="20"
					rx="5.4"
					ry="6.2"
					fill="url(#{royalUid}-gem)"
					stroke="#7c1d1d"
					stroke-width="0.6"
				/>
				<ellipse cx="44.4" cy="17.5" rx="1.6" ry="2.2" fill="#fecaca" opacity="0.8" />
			</g>
		</svg>
	{:else}
		{name}
	{/if}
</span>
