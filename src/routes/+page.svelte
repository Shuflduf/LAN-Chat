<script lang="ts">
	import Chatbox from '$lib/components/Chatbox.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { writable, type Writable } from 'svelte/store';

	let update: Writable<string> = writable();

	// function toggleTheme() {
	// 	document.documentElement.classList.toggle('dark');
	// }
</script>

<!-- PAGE -->

<main class="fixed flex h-screen w-screen flex-row justify-center gap-4 p-4">
	<Chatbox {update}></Chatbox>
	<Sidebar {update}></Sidebar>
</main>
