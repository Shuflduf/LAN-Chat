<script lang="ts">
	import { env } from '$env/dynamic/public';

	import { Client, Databases, ID, Query, type RealtimeResponseEvent } from 'appwrite';
	import { onMount } from 'svelte';

	const username = 'Shuflduf';

	enum MessageType {
		User,
		System,
		Temp
	}

	class Message {
		content: string;
		username: string;
		createdAt: Date;
		id: string;
		type: MessageType = MessageType.User;

		constructor(
			content: string,
			username: string,
			createdAt: Date,
			id: string,
			type: MessageType = MessageType.User
		) {
			this.content = content;
			this.username = username;
			this.createdAt = createdAt;
			this.id = id;

			this.type = type;
		}
	}

	let messages: Message[] = $state([]);
	let newMessage: string = $state('');
	let messagesContainer: HTMLDivElement | null = $state(null);
	let newMessageBox: HTMLInputElement | null = $state(null);
	let loadingMessages: boolean = $state(false);

	const client = new Client()
		.setEndpoint(env.PUBLIC_APPWRITE_ENDPOINT)
		.setProject(env.PUBLIC_APPWRITE_PROJECT_ID);
	const databases = new Databases(client);

	async function submit(event: Event) {
		if (newMessage.trim() === '') {
			event.preventDefault();
			return;
		}
		let messageToSend = newMessage;
		newMessage = '';
		setTimeout(() => {
			if (newMessageBox) {
				newMessageBox.focus();
			}
		}, 0);

		const tempMessage = new Message(messageToSend, username, new Date(), '0', MessageType.Temp);
		messages.unshift(tempMessage);
		await databases.createDocument('main', '6854a930003cf54d6d93', ID.unique(), {
			content: messageToSend,
			username: 'Shuflduf'
		});
	}

	async function getLatestMessages() {
		let res = await databases.listDocuments('main', env.PUBLIC_MESSAGES_ID, [
			Query.orderDesc('$createdAt'),
			Query.limit(20)
		]);
		res.documents.forEach((doc) => {
			messages.push(new Message(doc.content, doc.username, new Date(doc.$createdAt), doc.$id));
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
		let newMessage = new Message(res.content, res.username, new Date(res.$createdAt), res.$id);
		newMessage.id = res.$id;
		messages.unshift(newMessage);

		const tempIndex = messages.findIndex((mes) => mes.type == MessageType.Temp);
		messages.splice(tempIndex, 1);
	}

	function formatDate(date: Date): string {
		const hours = date.getHours();
		const hour12 = hours % 12 || 12;
		const minutes = date.getMinutes().toString().padStart(2, '0');
		const ampm = hours < 12 ? 'AM' : 'PM';

		return `${hour12}:${minutes} ${ampm}`;
	}

	async function onMessagesScrolled() {
		if (messagesContainer) {
			const scrollLoc = -messagesContainer.scrollTop + messagesContainer.clientHeight;
			const difference = Math.abs(scrollLoc - messagesContainer.scrollHeight);
			console.log(scrollLoc, difference);
			if (difference < 100) {
				if (loadingMessages) {
					return;
				}
				console.log('at top');
				loadingMessages = true;
				const lastMessage = messages.at(-1);
				const lastMessageId = lastMessage?.id;
				console.log(lastMessage);
				const res = await databases.listDocuments('main', env.PUBLIC_MESSAGES_ID, [
					Query.limit(10),
					lastMessageId ? Query.cursorBefore(lastMessageId) : ''
				]);
				console.log(res);
				if (res.documents.length == 0) {
					messages.push(
						new Message('No more messages!', 'SYSTEM', new Date(0), '0', MessageType.System)
					);
					return;
				}
				const newMessages = res.documents
					.map((doc) => new Message(doc.content, doc.username, new Date(doc.$createdAt), doc.$id))
					.reverse();
				console.log(newMessages);
				messages = [...messages, ...newMessages];
				loadingMessages = false;
			}
		}
	}
</script>

<main class="fixed flex h-screen w-screen flex-row justify-center gap-4 p-4">
	<div
		class="flex w-full max-w-4xl flex-col rounded-md border border-stone-500 bg-stone-100/10 shadow-md backdrop-blur-xs"
	>
		<div
			class="flex flex-col-reverse overflow-y-auto p-2"
			onscroll={onMessagesScrolled}
			bind:this={messagesContainer}
		>
			{#each messages as message}
				<div
					class="m-2 rounded-md border border-stone-500 bg-stone-100/10 p-4 shadow-md backdrop-blur-xs"
				>
					<p class="text-xs text-gray-400">
						{message.username} - {formatDate(message.createdAt)}
					</p>
					<p class={message.type == MessageType.Temp ? 'text-gray-400' : ''}>{message.content}</p>
				</div>
			{/each}
		</div>
		<form class="w-full p-4" onsubmit={submit}>
			<input
				class="w-full rounded-md border border-stone-500 bg-stone-100/10 p-4 shadow-md ring-0 transition focus:shadow-xl focus:outline-none"
				placeholder="Send Message"
				bind:value={newMessage}
				bind:this={newMessageBox}
			/>
		</form>
	</div>
</main>
