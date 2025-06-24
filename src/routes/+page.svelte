<script lang="ts">
	import { getCurrentChannel } from '$lib';
	import Chatbox from '$lib/components/Chatbox.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { onMount } from 'svelte';
	import { writable, type Writable } from 'svelte/store';

	let update: Writable<string> = writable();
	let title = $state('Shufl Chat');

	// function toggleTheme() {
	// 	document.documentElement.classList.toggle('dark');
	// }

	onMount(() => {
		update.subscribe(async (_) => {
			const channel = await getCurrentChannel();
			if (channel) {
				title = `${channel.name} - Shufl Chat`;
			}
		});
	});
</script>

<title>{title}</title>

<main class="fixed flex h-screen w-screen flex-row justify-center gap-4 p-4">
	<Chatbox {update}></Chatbox>
	<Sidebar {update}></Sidebar>
</main>
