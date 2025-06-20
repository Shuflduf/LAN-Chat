<script lang="ts">
	import { env } from '$env/dynamic/public';

	import {
		Avatars,
		Client,
		Databases,
		ID,
		Query,
		Storage,
		type RealtimeResponseEvent
	} from 'appwrite';
	import { onMount } from 'svelte';

	let username = $state('Shuflduf');

	// idk how to ignore error BUT THIS WORKS FINE
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
		avatarId: string | null = null;
		type: MessageType = MessageType.User;

		constructor(
			content: string,
			username: string,
			createdAt: Date,
			id: string,
			type: MessageType = MessageType.User,
			avatarId: string | null = null
		) {
			this.content = content;
			this.username = username;
			this.createdAt = createdAt;
			this.id = id;

			this.type = type;
			this.avatarId = avatarId;
		}
	}

	let messages: Message[] = $state([]);
	let newMessage: string = $state('');
	let messagesContainer: HTMLDivElement | null = $state(null);
	let newMessageBox: HTMLInputElement | null = $state(null);
	let avatarFilePicker: HTMLInputElement | null = $state(null);
	let loadingMessages: boolean = $state(false);
	let currentAvatarPath: string | null = $state(null);
	let currentAvatarId: string | null = $state(null);
	let sidebarShown: boolean = $state(true);

	const client = new Client()
		.setEndpoint(env.PUBLIC_APPWRITE_ENDPOINT)
		.setProject(env.PUBLIC_APPWRITE_PROJECT_ID);
	const databases = new Databases(client);
	const avatars = new Avatars(client);
	const storage = new Storage(client);

	async function submit(event: Event) {
		if (newMessage.trim() == '') {
			event.preventDefault();
			return;
		}
		if (username == '') {
			alert('Please enter a username');
			return;
		}
		imageFromInitials(username);
		let messageToSend = newMessage;
		newMessage = '';
		setTimeout(() => {
			if (newMessageBox) {
				newMessageBox.focus();
			}
		}, 0);

		const tempMessage = new Message(
			messageToSend,
			username,
			new Date(),
			'0',
			MessageType.Temp,
			currentAvatarId
		);
		messages.unshift(tempMessage);
		await databases.createDocument('main', '6854a930003cf54d6d93', ID.unique(), {
			content: messageToSend,
			username,
			avatar_id: currentAvatarId
		});
	}

	async function getLatestMessages() {
		let res = await databases.listDocuments('main', env.PUBLIC_MESSAGES_ID, [
			Query.orderDesc('$createdAt'),
			Query.limit(20)
		]);
		res.documents.forEach((doc) => {
			messages.push(
				new Message(
					doc.content,
					doc.username,
					new Date(doc.$createdAt),
					doc.$id,
					MessageType.User,
					doc.avatar_id
				)
			);
		});
	}

	onMount(async () => {
		await getLatestMessages();
		client.subscribe(
			`databases.main.collections.${env.PUBLIC_MESSAGES_ID}.documents`,
			messageRecieved
		);

		const avatarId = localStorage.getItem('avatarId');
		if (avatarId != null) {
			currentAvatarPath = formatAvatarURI(avatarId);
			currentAvatarId = avatarId;
		}
		const savedUsername = localStorage.getItem('username');
		if (savedUsername != null) {
			username = savedUsername;
		}
	});

	function messageRecieved(response: RealtimeResponseEvent<unknown>) {
		const res: any = response.payload;
		let newMessage = new Message(
			res.content,
			res.username,
			new Date(res.$createdAt),
			res.$id,
			MessageType.User,
			res.avatar_id
		);
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
			if (difference < 100) {
				if (loadingMessages) {
					return;
				}
				loadingMessages = true;
				const lastMessage = messages.at(-1);
				const lastMessageId = lastMessage?.id;
				const res = await databases.listDocuments('main', env.PUBLIC_MESSAGES_ID, [
					Query.limit(10),
					lastMessageId ? Query.cursorBefore(lastMessageId) : ''
				]);
				if (res.documents.length == 0) {
					messages.push(
						new Message('No more messages!', 'SYSTEM', new Date(0), '0', MessageType.System)
					);
					return;
				}
				const newMessages = res.documents
					.map(
						(doc) =>
							new Message(
								doc.content,
								doc.username,
								new Date(doc.$createdAt),
								doc.$id,
								MessageType.User,
								doc.avatar_id
							)
					)
					.reverse();
				messages = [...messages, ...newMessages];
				loadingMessages = false;
			}
		}
	}

	async function imageFromInitials(username: string) {
		const res = avatars.getInitials(username);
	}

	async function onAvatarUploadStart() {
		if (avatarFilePicker?.files) {
			if (avatarFilePicker.files?.length > 0) {
				currentAvatarPath = URL.createObjectURL(avatarFilePicker.files[0]);
				const res = await storage.createFile('profiles', ID.unique(), avatarFilePicker.files[0]);
				localStorage.setItem('avatarId', res.$id);
				currentAvatarPath = formatAvatarURI(res.$id);
				currentAvatarId = res.$id;
			}
		}
	}

	function formatAvatarURI(id: string): string {
		return `https://nyc.cloud.appwrite.io/v1/storage/buckets/profiles/files/${id}/view?project=${env.PUBLIC_APPWRITE_PROJECT_ID}`;
	}

	function onUsernameChanged() {
		localStorage.setItem('username', username);
	}

	function toggleSidebar() {
		sidebarShown = !sidebarShown;
	}
</script>

<main class="fixed flex h-screen w-screen flex-row justify-center gap-4 p-4">
	<div
		class="flex w-full max-w-4xl flex-col rounded-md border border-slate-500 bg-slate-300/10 shadow-md backdrop-blur-xs"
	>
		<div
			class="flex flex-col-reverse overflow-y-auto p-2"
			onscroll={onMessagesScrolled}
			bind:this={messagesContainer}
		>
			{#each messages as message}
				<div class="flex w-full gap-2 p-2">
					<img
						src={message.avatarId
							? formatAvatarURI(message.avatarId)
							: avatars.getInitials(message.username)}
						class="h-8 w-8 rounded-md object-cover shadow-md"
					/>
					<div
						class="w-full rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md backdrop-blur-xs"
					>
						<p class="text-xs text-gray-400" title={message.createdAt.toString()}>
							{message.username} - {formatDate(message.createdAt)}
						</p>
						<p class="{message.type == MessageType.Temp ? 'text-gray-400' : ''} dark:text-white">
							{message.content}
						</p>
					</div>
				</div>
			{/each}
		</div>
		<form class="w-full p-4" onsubmit={submit}>
			<input
				class="w-full rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md transition focus:shadow-xl focus:outline-none dark:text-white"
				placeholder="Send Message"
				bind:value={newMessage}
				bind:this={newMessageBox}
			/>
		</form>
	</div>
	{#if sidebarShown}
		<section
			class="flex h-full w-lg flex-col gap-4 rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md backdrop-blur-xs"
		>
			<button
				class="flex flex-row gap-1 self-end rounded-md bg-blue-400 px-4 py-2 text-white shadow-md transition hover:bg-blue-500"
				onclick={toggleSidebar}
				><p>Hide Sidebar</p>
				<img src="/assets/chevron_forward.svg" />
			</button>
			<div
				class="flex flex-col gap-4 rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md backdrop-blur-xs"
			>
				<h1 class="text-center text-2xl dark:text-white">Profile Customization</h1>
				<!-- TODO: add toggle thing -->
				<input
					class="focus_shadow-xl rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md transition focus:outline-none dark:text-white"
					placeholder="Username"
					bind:value={username}
					onchange={onUsernameChanged}
				/>
				{#if currentAvatarPath}
					<img
						src={currentAvatarPath}
						class="rounded-md border border-slate-500 object-cover shadow-md"
					/>
				{/if}
				<input
					type="file"
					class="cursor-pointer rounded-md bg-blue-400 p-4 text-white shadow-md transition hover:bg-blue-500"
					accept="image/png, image/jpeg, image/webp"
					onchange={onAvatarUploadStart}
					bind:this={avatarFilePicker}
				/>
			</div>
		</section>
	{:else}
		<button
			class="fixed top-8 right-8 flex flex-row gap-1 self-end rounded-md bg-blue-400 px-4 py-2 text-white shadow-md transition hover:bg-blue-500"
			onclick={toggleSidebar}
		>
			<img src="/assets/chevron_forward.svg" class="rotate-180" />
		</button>
	{/if}
</main>
