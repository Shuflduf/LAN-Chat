<script lang="ts">
	import Chatbox from '$lib/components/Chatbox.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { writable, type Writable } from 'svelte/store';

	let update: Writable<string> = writable();

	// function toggleTheme() {
	// 	document.documentElement.classList.toggle('dark');
	// }

	// function messageFilesDropped(event: DragEvent) {
	// 	event.preventDefault();
	// 	if (!event.dataTransfer) {
	// 		return;
	// 	}
	// 	const files = Array.from(event.dataTransfer.files);
	// 	if (files.length > 0) {
	// 		if (files.length + messageFiles.length > 5) {
	// 			alert('5 files max');
	// 			return;
	// 		}
	// 		for (const file of files) {
	// 			messageFiles.push(file);
	// 		}
	// 	}
	// }
</script>

<!-- PAGE -->

<main class="fixed flex h-screen w-screen flex-row justify-center gap-4 p-4">
	<Chatbox {update}></Chatbox>
	<Sidebar {update}></Sidebar>
</main>
