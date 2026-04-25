<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
</script>

<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
	<h2 class="text-xl font-black">Detail user tersedia sebagai slide-over</h2>
	<p class="mt-2 text-sm text-zinc-500">User ID: {page.params.id}</p>
	<button onclick={() => goto('/admin/users')} class="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white">Kembali ke User</button>
</div>
