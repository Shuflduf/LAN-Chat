<script lang="ts">
	let messages: String[] = $state(
      Array.from({ length: 20 }, (_, i) => `Message ${i + 1}`)
	);

	let newMessage: string = $state('');

	function submit(event: Event) {
    if (newMessage.trim() === '') {
      event.preventDefault();
      return;
    }
		messages.unshift(newMessage);
		newMessage = '';
	}
</script>

<main class="fixed flex h-screen w-screen flex-row gap-4 p-4">
	<div class="w-1/5 rounded-md bg-red-500">
		<h1 class="p-4 text-2xl text-white">Sidebar</h1>
	</div>
	<div class="flex w-4/5 flex-col rounded-md bg-blue-500">
		<div class="flex flex-col-reverse overflow-y-auto p-2">
			{#each messages as message}
				<div class="m-2 rounded-md bg-green-500 p-4">
					<p class="text-white">{message}</p>
				</div>
			{/each}
		</div>
		<form class="w-full p-4" onsubmit={submit}>
			<input
				class="w-full rounded-md bg-yellow-500 p-4"
				placeholder="Send Message"
				bind:value={newMessage}
			/>
		</form>
	</div>
</main>
