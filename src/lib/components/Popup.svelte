<script lang="ts">
	let { children, title, onClose } = $props();
</script>

<main class="fixed z-30 flex h-screen w-screen items-center justify-center bg-black/50">
	<div
		class="h-4/5 w-3xl rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md backdrop-blur-xs"
	>
		<div class="flex w-full flex-row items-start justify-between">
			<h1 class="mb-4 text-3xl dark:text-white">{title}</h1>
			<button onclick={onClose} class="cursor-pointer"
				><img src="/assets/close.svg" alt="close" /></button
			>
		</div>
		{@render children()}
	</div>
</main>
