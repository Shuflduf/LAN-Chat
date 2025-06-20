<script lang="ts">
	import { env } from '$env/dynamic/public';

	import { Client, Databases, ID, Query } from 'appwrite';
	import { onMount } from 'svelte';

	const username = 'Shuflduf';

	class Message {
		content: string;
		username: string;
		createdAt: Date;
		temp: boolean;
		id: string;

		constructor(content: string, username: string, createdAt: Date, temp: boolean = false) {
			this.content = content;
			this.username = username;
			this.createdAt = createdAt;
			this.temp = temp;

			this.id = ID.unique();
		}
	}

	let messages: Message[] = $state([]);
	let newMessage: string = $state('');

	const client = new Client()
		.setEndpoint(env.PUBLIC_APPWRITE_ENDPOINT)
		.setProject(env.PUBLIC_APPWRITE_PROJECT_ID);
	const databases = new Databases(client);

	async function submit(event: Event) {
		if (newMessage.trim() === '') {
			event.preventDefault();
			return;
		}

		messages.unshift(new Message(newMessage, username, new Date(), true));
		const res = await databases.createDocument('main', '6854a930003cf54d6d93', ID.unique(), {
			content: newMessage,
			username: 'Shuflduf'
		});

		newMessage = '';
		console.log(res);
	}

	async function getLatestMessages() {
		let res = await databases.listDocuments('main', env.PUBLIC_MESSAGES_ID, [
			Query.orderDesc('$createdAt')
		]);
		res.documents.forEach((doc) => {
			messages.push(new Message(doc.content, doc.username, new Date(doc.$createdAt)));
		});
	}

	onMount(async () => {
		await getLatestMessages();
		client.subscribe(
			`databases.main.collections.${env.PUBLIC_MESSAGES_ID}.documents`,
			(response) => {
				console.log(response.payload);
				const res: Message = response.payload as Message;
				messages.unshift(res);
			}
		);
	});

	function formatDate(date: Date): string {
		return `${date.getHours() % 12}:${date.getMinutes()}`;
	}
</script>

<main class="fixed flex h-screen w-screen flex-row justify-center gap-4 p-4">
	<div class="flex w-full max-w-4xl flex-col rounded-md bg-blue-500">
		<div class="flex flex-col-reverse overflow-y-auto p-2">
			{#each messages as message}
				<div class="m-2 rounded-md bg-green-500 p-4">
					<p class="text-gray-500">
						{message.username} - {formatDate(message.createdAt)}
					</p>
					<p>{message.content}</p>
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
