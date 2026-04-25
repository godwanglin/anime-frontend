<script lang="ts">
	import { adminToast } from '$lib/stores/adminToast.svelte';
</script>

<div class="fixed bottom-4 right-4 z-[80] flex w-[min(92vw,360px)] flex-col gap-2">
	{#each adminToast.items as toast}
		<button
			onclick={() => adminToast.dismiss(toast.id)}
			class="rounded-xl border px-4 py-3 text-left text-sm font-semibold shadow-xl backdrop-blur
				{toast.type === 'success'
				? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
				: toast.type === 'error'
					? 'border-red-500/30 bg-red-500/15 text-red-200'
					: 'border-blue-500/30 bg-blue-500/15 text-blue-200'}"
		>
			{toast.message}
		</button>
	{/each}
</div>
