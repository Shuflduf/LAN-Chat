<script lang="ts">
	import { env } from '$env/dynamic/public';
	import Popup from '$lib/components/Popup.svelte';

	import {
		Avatars,
		Client,
		Databases,
		ID,
		Query,
		Storage,
		type Models,
		type RealtimeResponseEvent
	} from 'appwrite';
	import { onMount } from 'svelte';

	let username = $state('');

	enum MessageType {
		User,
		System,
		Temp
	}

	class Channel {
		id: string;
		name: string;
		password: string | null = null;

		constructor(id: string, name: string, password: string | null = null) {
			this.id = id;
			this.name = name;

			this.password = null;
		}
	}

	class MessageGroup {
		messages: Message[];
		username: string;
		avatarId: string | null;
		createdAt: Date;

		constructor(messages: Message[], username: string, avatarId: string | null, createdAt: Date) {
			this.messages = messages;
			this.username = username;
			this.avatarId = avatarId;
			this.createdAt = createdAt;
		}
	}

	// TODO: eventually add like ip or hashed ip in case multiple people have same name
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
	let createChannelPopupShown: boolean = $state(false);
	let savedChannels: Channel[] = $state([]);
	let allChannels: Channel[] = $state([]);

	let messageGroups: any[] = $derived(groupsFromMessages(messages));

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
		if (username.trim() == '') {
			alert('Please enter a username');
			return;
		}
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
		messages = res.documents.map(messageFromDoc);
	}

	async function getAllChannels() {
		let res = await databases.listDocuments('main', env.PUBLIC_CHANNELS_ID);
		allChannels = res.documents.map((doc) => new Channel(doc.$id, doc.name, doc.password));
	}

	function loadSavedInfo() {
		const avatarId = localStorage.getItem('avatarId');
		if (avatarId != null) {
			currentAvatarPath = formatAvatarURI(avatarId);
			currentAvatarId = avatarId;
		}
		const savedUsername = localStorage.getItem('username');
		if (savedUsername != null) {
			username = savedUsername;
		}

		const channels = localStorage.getItem('savedChannels');
		if (channels == null) {
			localStorage.setItem('savedChannels', JSON.stringify([env.PUBLIC_MAIN_CHANNEL_ID]));
			savedChannels = [new Channel(env.PUBLIC_MAIN_CHANNEL_ID, 'Main')];
		} else {
			savedChannels = JSON.parse(channels);
		}
	}

	onMount(async () => {
		await getLatestMessages();
		await getAllChannels();
		client.subscribe(
			`databases.main.collections.${env.PUBLIC_MESSAGES_ID}.documents`,
			messageRecieved
		);
		loadSavedInfo();

		// const futureDate = new Date(Date.now() + 1000 * 60 * 60);
		// const res = await fetch('/api/create_channel', {
		// 	method: 'POST',
		// 	body: JSON.stringify({
		// 		channelName: 'gaeming',
		// 		expiration: futureDate,
		// 		password: 'Duflshuf'
		// 	})
		// });
		// console.log(await res.text());
	});

	function messageRecieved(response: RealtimeResponseEvent<unknown>) {
		const res: Models.Document = response.payload as Models.Document;
		messages.unshift(messageFromDoc(res));

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
				await loadMoreMessages();
			}
		}
	}

	async function loadMoreMessages() {
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
		const newMessages = res.documents.map(messageFromDoc).reverse();
		messages = [...messages, ...newMessages];
		loadingMessages = false;
	}

	function messageFromDoc(doc: Models.Document): Message {
		return new Message(
			doc.content,
			doc.username,
			new Date(doc.$createdAt),
			doc.$id,
			MessageType.User,
			doc.avatar_id
		);
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

	function groupsFromMessages(tmpMessages: Message[]): MessageGroup[] {
		if (tmpMessages.length == 0) {
			return [];
		}
		let groups: MessageGroup[] = [];
		let currentGroup: Message[] = [];
		for (let index = 0; index < tmpMessages.length; index++) {
			const mes = tmpMessages[index];
			if (currentGroup.length == 0) {
				currentGroup.push(mes);
				continue;
			}
			const tmpLatest = currentGroup.at(-1);
			if (!tmpLatest) {
				continue;
			}
			const tmpAvatarId = tmpLatest.avatarId;
			const tmpUsername = tmpLatest.username;
			const tmpCreatedAt = tmpLatest.createdAt;

			if (mes.avatarId == tmpAvatarId && mes.username == tmpUsername) {
				currentGroup.push(mes);
			} else {
				const newMessageGroup = new MessageGroup(
					currentGroup,
					tmpUsername,
					tmpAvatarId,
					tmpCreatedAt
				);
				groups.push(newMessageGroup);
				currentGroup = [];
				currentGroup.push(mes);
			}
		}
		groups.push(
			new MessageGroup(
				currentGroup,
				currentGroup[0].username,
				currentGroup[0].avatarId,
				currentGroup[0].createdAt
			)
		);
		console.log('out:', groups);
		return groups;
	}

	function removeAvatar() {
		localStorage.removeItem('avatarId');
		currentAvatarId = null;
		currentAvatarPath = null;
	}

	// function toggleTheme() {
	// 	document.documentElement.classList.toggle('dark');
	// }

	function onCreateChannel() {
		console.log('AAA');
		createChannelPopupShown = true;
	}
</script>

{#if createChannelPopupShown}
	<Popup>
		<div class="flex w-full flex-row items-start justify-between">
			<h1 class="mb-4 text-3xl dark:text-white">Create Channel</h1>
			<button onclick={() => (createChannelPopupShown = false)} class="cursor-pointer"
				><img src="/assets/close.svg" alt="close" /></button
			>
		</div>
		<form class="flex flex-col gap-4">
			<label class="dark:text-white"
				>Channel Name<span class="text-red-500">*</span>

				<input
					class="ml-4 rounded-md border border-slate-500 bg-slate-300/10 px-4 py-2 shadow-md transition focus:shadow-xl focus:outline-none dark:text-white"
				/>
			</label>
			<label class="dark:text-white" title="In how long will this channel be deleted">
				Expiration Date<span class="text-red-500">*</span>
				<select
					class="ml-4 rounded-md border border-slate-500 bg-slate-300/10 px-4 py-2 shadow-md"
					required
				>
					<option class="text-black" value="1h">1 Hour</option>
					<option class="text-black" value="4h">4 Hours</option>
					<option class="text-black" value="4h">1 Day</option>
					<option class="text-black" value="4h">1 Week</option>
				</select>
			</label>
			<label class="dark:text-white">
				Password
				<input
					type="password"
					class="ml-4 rounded-md border border-slate-500 bg-slate-300/10 px-4 py-2 shadow-md transition focus:shadow-xl focus:outline-none dark:text-white"
				/>
			</label>
			<input
				type="submit"
				value="Create Channel"
				class="cursor-pointer rounded-md bg-blue-400 px-4 py-2 text-white shadow-md transition hover:bg-blue-500"
				onclick={() => (createChannelPopupShown = false)}
			/>
		</form>
	</Popup>
{/if}

<main class="fixed flex h-screen w-screen flex-row justify-center gap-4 p-4">
	<div
		class="flex w-full max-w-4xl flex-col rounded-md border border-slate-500 bg-slate-300/10 shadow-md backdrop-blur-xs"
	>
		<div
			class="flex flex-col-reverse overflow-y-auto p-2"
			onscroll={onMessagesScrolled}
			bind:this={messagesContainer}
		>
			<!-- {#each messageGroups as group} -->
			<!-- 	{#each group.messages as mes} -->
			<!-- 		<p>{mes.content}</p> -->
			<!-- 	{/each} -->
			<!-- 	<h1>{group.username}</h1> -->
			<!-- {/each} -->

			{#each messageGroups as group}
				<div class="flex w-full gap-2 p-2">
					<img
						src={group.avatarId
							? formatAvatarURI(group.avatarId)
							: avatars.getInitials(group.username)}
						class="h-8 w-8 rounded-md object-cover shadow-md"
						title={group.avatarId}
						alt="avatar of {group.username}"
					/>
					<div
						class="w-full rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md backdrop-blur-xs"
					>
						<p class="text-xs text-gray-400" title={group.createdAt.toString()}>
							<span>{group.username}</span>
							<span>&nbsp;-&nbsp;</span>
							<span dir="ltr">{formatDate(group.createdAt)}</span>
						</p>
						{#each group.messages.reverse() as message}
							<p class="{message.type == MessageType.Temp ? 'text-gray-400' : ''} dark:text-white">
								{message.content}
							</p>
						{/each}
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
			<div class="flex w-full flex-row justify-end gap-4">
				<!-- <button -->
				<!-- 	class="flex flex-row gap-1 rounded-md bg-blue-400 px-4 py-2 text-white shadow-md transition hover:bg-blue-500" -->
				<!-- 	onclick={toggleTheme}>Change Theme</button -->
				<!-- > -->
				<button
					class="flex flex-row gap-1 rounded-md bg-blue-400 px-4 py-2 text-white shadow-md transition hover:bg-blue-500"
					onclick={toggleSidebar}
					><p>Hide Sidebar</p>
					<img src="/assets/chevron_forward.svg" alt="chevron" />
				</button>
			</div>
			<div class="flex flex-col gap-4 overflow-y-auto">
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
							alt="current avatar"
							title={currentAvatarId}
						/>
					{/if}
					<div class="flex flex-row gap-4">
						<button
							class="w-full cursor-pointer rounded-md bg-blue-400 px-4 py-2 text-white shadow-md transition hover:bg-blue-500"
							onclick={() => avatarFilePicker?.click()}>Upload Avatar</button
						>
						<input
							type="file"
							class="hidden"
							accept="image/png, image/jpeg, image/webp"
							onchange={onAvatarUploadStart}
							bind:this={avatarFilePicker}
						/>
						{#if currentAvatarId}
							<button
								class="cursor-pointer rounded-md bg-red-500 px-4 py-2 text-white shadow-md transition hover:bg-red-600"
								onclick={removeAvatar}>Remove</button
							>
						{/if}
					</div>
				</div>
				<div
					class="flex flex-col gap-4 rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md backdrop-blur-xs"
				>
					<h1 class="text-center text-2xl dark:text-white">Channels</h1>

					{#each allChannels as channel}
						<div class="flex flex-row items-center gap-4">
							<img
								src="/assets/chevron_forward.svg"
								class="size-6 brightness-0 dark:brightness-100"
								alt="chevron"
							/>
							<a
								class="w-full cursor-pointer rounded-md border-2 border-blue-400 bg-slate-300/10 px-4 py-2 transition hover:border-blue-500 dark:text-white"
								href="?{new URLSearchParams({ c: channel.id }).toString()}">{channel.name}</a
							>
						</div>
					{/each}
					<button
						class="shadmow-md w-full cursor-pointer rounded-md bg-blue-400 px-4 py-2 text-white backdrop-blur-xs transition hover:bg-blue-500"
						onclick={onCreateChannel}>Create Channel</button
					>
				</div>
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
