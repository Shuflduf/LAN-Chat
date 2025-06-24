<script lang="ts">
	import Chatbox from '$lib/components/Chatbox.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { writable, type Writable } from 'svelte/store';

	let update: Writable<string> = writable();

	// function toggleTheme() {
	// 	document.documentElement.classList.toggle('dark');
	// }

	// async function handleSelfDestruct() {
	// 	// this is probably a bad idea
	// 	const expiration = getCurrentChannel()?.expiration;
	// 	if (!expiration) {
	// 		return;
	// 	}
	// 	const expirationDate = new Date(expiration);
	// 	if (expirationDate.getTime() < Date.now()) {
	// 		alert('Channel deleted');
	// 		savedChannels = savedChannels.filter((c) => c.id != currentChannelId);
	// 		saveSavedChannels();
	// 		await databases.deleteDocument('main', env.PUBLIC_CHANNELS_ID, currentChannelId);
	// 		currentChannelId = env.PUBLIC_MAIN_CHANNEL_ID;
	// 		refreshChat();
	// 	}
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
