<script lang="ts">
	import { fly } from 'svelte/transition';
	import PopupBackground from './PopupBackground.svelte';

	let { children, title, onClose } = $props();
</script>

<PopupBackground className="z-30" {onClose}>
	<div
		class="bg-funny h-4/5 w-3xl rounded-md border border-slate-500 bg-white p-4 shadow-md backdrop-blur-lg dark:bg-slate-300/10"
		transition:fly={{ y: -50, duration: 100 }}>
		<div class="flex w-full flex-row items-start justify-between">
			<h1 class="mb-4 text-3xl dark:text-white">{title}</h1>
			<button onclick={onClose} class="cursor-pointer">
				<img
					src="/assets/close.svg"
					alt="close"
					class="brightness-0 dark:brightness-100" /></button>
		</div>
		{@render children()}
	</div>
</PopupBackground>
