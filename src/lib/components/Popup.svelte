<script lang="ts">
	let { children } = $props();
</script>

<main class="fixed z-30 flex h-screen w-screen items-center justify-center bg-black/50">
	<div
		class="h-4/5 w-3xl rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md backdrop-blur-xs"
	>
		{@render children()}
	</div>
</main>
