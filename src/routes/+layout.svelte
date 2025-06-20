<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

{@render children()}
<div class="pointer-events-none fixed -z-40 h-screen w-screen dark:backdrop-invert"></div>
