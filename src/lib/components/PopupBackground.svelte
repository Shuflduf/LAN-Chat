<script lang="ts">
	import { fade } from 'svelte/transition';

	let { children, className, onClose } = $props();
</script>

<div
	role="button"
	tabindex="0"
	onclick={(e) => {
		if (e.target === e.currentTarget) onClose();
	}}
	onkeydown={(e) => {
		if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) onClose();
	}}
	class="fixed {className} flex h-screen w-screen items-center justify-center bg-black/50"
	transition:fade={{ duration: 100 }}>
	{@render children()}
</div>
