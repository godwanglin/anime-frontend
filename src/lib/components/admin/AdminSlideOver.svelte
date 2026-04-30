<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	let {
		open = false,
		title = '',
		onClose = () => {},
		children
	} = $props<{
		open?: boolean;
		title?: string;
		onClose?: () => void;
		children?: import('svelte').Snippet;
	}>();
</script>

{#if open}
	<div class="fixed inset-0 z-[70] bg-black/60">
		<button class="absolute inset-0 h-full w-full" aria-label="Tutup" onclick={onClose}></button>
		<aside
			class="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
		>
			<div class="mb-5 flex items-center justify-between">
				<h2 class="text-lg font-black text-zinc-100">{title}</h2>
				<button
					onclick={onClose}
					class="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
				>
					<AppIcon name="close" />
				</button>
			</div>
			{@render children?.()}
		</aside>
	</div>
{/if}
