<script lang="ts">
	import { fade } from 'svelte/transition';

	let { children, className } = $props();
</script>

<div
	class="fixed {className} flex h-screen w-screen items-center justify-center bg-black/50"
	transition:fade={{ duration: 100 }}>
	{@render children()}
</div>
