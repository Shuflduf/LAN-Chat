<script lang="ts">
	import { env } from '$env/dynamic/public';

	import { Client, Databases, ID } from 'appwrite';
	import { onMount } from 'svelte';

	type Message = {
		content: string;
		username: string;
		userId: string;
		$createdAt: string;
	};

	let messages: String[] = $state(Array.from({ length: 20 }, (_, i) => `Message ${i + 1}`));
	let newMessage: string = $state('');

	const client = new Client()
		.setEndpoint(env.PUBLIC_APPWRITE_ENDPOINT)
		.setProject(env.PUBLIC_APPWRITE_PROJECT_ID);

	async function submit(event: Event) {
		if (newMessage.trim() === '') {
			event.preventDefault();
			return;
		}
		messages.unshift(newMessage);

		const databases = new Databases(client);
		const res = await databases.createDocument('main', '6854a930003cf54d6d93', ID.unique(), {
			content: newMessage,
			username: 'Shuflduf',
			user_id: 'AAAABBBBCCCC'
		});

		newMessage = '';
		console.log(res);
	}

	onMount(() => {
		client.subscribe('databases.main.collections.6854a930003cf54d6d93.documents', (response) => {
			console.log(response.payload);
			const res: Message = response.payload as Message;
			messages.unshift(res.content);
		});
	});
</script>

<main class="fixed flex h-screen w-screen flex-row justify-center gap-4 p-4">
	<div class="flex w-full max-w-4xl flex-col rounded-md bg-blue-500">
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
