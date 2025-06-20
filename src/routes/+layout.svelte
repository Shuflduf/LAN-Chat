<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

{@render children()}
<div class="pointer-events-none fixed z-[100] h-screen w-screen"></div>
