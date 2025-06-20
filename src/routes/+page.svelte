<script lang="ts">
	import { env } from '$env/dynamic/public';

	import { Client, Databases, ID, Query, type RealtimeResponseEvent } from 'appwrite';
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

		const tempMessage = new Message(newMessage, username, new Date(), true);
		tempMessage.id = '0';
		messages.unshift(tempMessage);
		const res = await databases.createDocument('main', '6854a930003cf54d6d93', ID.unique(), {
			content: newMessage,
			username: 'Shuflduf'
		});
		newMessage = '';
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
			messageRecieved
		);
	});

	function messageRecieved(response: RealtimeResponseEvent<unknown>) {
		const res: any = response.payload;
		let newMessage = new Message(res.content, res.username, new Date(res.$createdAt));
		newMessage.id = res.$id;
		messages.unshift(newMessage);

		const tempIndex = messages.findIndex((mes) => mes.id == '0');
		messages.splice(tempIndex, 1);
	}

	function formatDate(date: Date): string {
		const hours = date.getHours();
		const hour12 = hours % 12 || 12;
		const minutes = date.getMinutes().toString().padStart(2, '0');
		const ampm = hours < 12 ? 'AM' : 'PM';

		return `${hour12}:${minutes} ${ampm}`;
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
					<p class={message.temp ? 'text-gray-600' : ''}>{message.content}</p>
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
