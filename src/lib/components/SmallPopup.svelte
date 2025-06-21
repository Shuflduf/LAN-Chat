<script lang="ts">
	import { fly } from 'svelte/transition';
	import PopupBackground from './PopupBackground.svelte';

	let { children, title, onClose } = $props();
</script>

<PopupBackground className="z-40">
	<div
		class="h-1/5 w-lg rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md backdrop-blur-xs"
		transition:fly={{ y: -50, duration: 100 }}>
		<div class="flex w-full flex-row items-start justify-between">
			<h1 class="mb-4 text-2xl dark:text-white">{title}</h1>
			<button onclick={onClose} class="cursor-pointer"
				><img src="/assets/close.svg" alt="close" /></button>
		</div>
		{@render children()}
	</div>
</PopupBackground>
