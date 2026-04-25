<script lang="ts">
	let {
		open = false,
		title = 'Konfirmasi',
		message = '',
		danger = false,
		onClose = () => {},
		onConfirm = () => {}
	} = $props<{
		open?: boolean;
		title?: string;
		message?: string;
		danger?: boolean;
		onClose?: () => void;
		onConfirm?: () => void;
	}>();
</script>

{#if open}
	<div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
		<div class="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
			<h2 class="text-lg font-black text-zinc-100">{title}</h2>
			<p class="mt-2 text-sm text-zinc-400">{message}</p>
			<div class="mt-5 flex justify-end gap-2">
				<button onclick={onClose} class="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800">
					Batal
				</button>
				<button
					onclick={onConfirm}
					class="rounded-lg px-4 py-2 text-sm font-bold text-white {danger
						? 'bg-red-600 hover:bg-red-700'
						: 'bg-violet-600 hover:bg-violet-700'}"
				>
					Konfirmasi
				</button>
			</div>
		</div>
	</div>
{/if}
