<script lang="ts">
	import { env } from '$env/dynamic/public';
	import Popup from '$lib/components/Popup.svelte';
	import { page } from '$app/state';

	import {
		Avatars,
		Client,
		Databases,
		ID,
		Storage,
		type Models,
		type RealtimeResponseEvent,
	} from 'appwrite';
	import { onMount } from 'svelte';
	import CreateChannelPopup from '$lib/components/CreateChannelPopup.svelte';
	import SmallPopup from '$lib/components/SmallPopup.svelte';
	import { fly, slide } from 'svelte/transition';
	import { quadOut } from 'svelte/easing';

	let username = $state('');

	enum MessageType {
		User,
		System,
		Temp,
	}

	class Channel {
		id: string;
		name: string;
		expiration: string;
		password: string | null = null;
		savedPassword: string | null = null;

		constructor(
			id: string,
			name: string,
			expiration: Date,
			password: string | null = null,
			savedPassword: string | null = null,
		) {
			this.id = id;
			this.name = name;
			this.expiration = expiration.toString();

			this.password = password;
			this.savedPassword = savedPassword;
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
			avatarId: string | null = null,
		) {
			this.content = content;
			this.username = username;
			this.createdAt = createdAt;
			this.id = id;

			this.type = type;
			this.avatarId = avatarId;
		}
	}

	// STATE
	let messagesContainer: HTMLDivElement | null = $state(null);
	let newMessageBox: HTMLInputElement | null = $state(null);
	let avatarFilePicker: HTMLInputElement | null = $state(null);

	let messages: Message[] = $state([]);
	let newMessage: string = $state('');
	let loadingMessages: boolean = $state(false);
	let currentAvatarPath: string | null = $state(null);
	let currentAvatarId: string | null = $state(null);
	let sidebarShown: boolean = $state(true);
	let createChannelPopupShown: boolean = $state(false);
	let savedChannels: Channel[] = $state([]);
	let allChannels: Channel[] = $state([]);
	let currentChannelId: string = $state(env.PUBLIC_MAIN_CHANNEL_ID);
	let listChannelsPopupShown: boolean = $state(false);
	let passwordPromptShown: boolean = $state(false);
	let promptPass: string = $state('');
	let profileCustomizationOpen: boolean = $state(true);
	let channelsMenuOpen: boolean = $state(true);

	let messageGroups: any[] = $derived(groupsFromMessages(messages));

	const client = new Client()
		.setEndpoint(env.PUBLIC_APPWRITE_ENDPOINT)
		.setProject(env.PUBLIC_APPWRITE_PROJECT_ID);
	const databases = new Databases(client);
	const avatars = new Avatars(client);
	const storage = new Storage(client);

	function getCurrentChannel(): Channel | undefined {
		const channel = savedChannels.find((c) => c.id == currentChannelId);
		return channel;
	}

	async function refreshChat() {
		await new Promise((r) => setTimeout(r, 100));
		const c = page.url.searchParams.get('c');
		const id = c ? c : env.PUBLIC_MAIN_CHANNEL_ID;
		messages = [];
		currentChannelId = id;
		await handleSelfDestruct();
		await getLatestMessages();
	}

	// this is probably a bad idea
	async function handleSelfDestruct() {
		const expiration = getCurrentChannel()?.expiration;
		if (!expiration) {
			return;
		}
		const expirationDate = new Date(expiration);
		if (expirationDate.getTime() < Date.now()) {
			alert('Channel deleted');
			savedChannels = savedChannels.filter((c) => c.id != currentChannelId);
			saveSavedChannels();
			await databases.deleteDocument('main', env.PUBLIC_CHANNELS_ID, currentChannelId);
			currentChannelId = env.PUBLIC_MAIN_CHANNEL_ID;
			refreshChat();
		}
	}

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
			ID.unique(),
			MessageType.Temp,
			currentAvatarId,
		);
		messages.unshift(tempMessage);
		let res = await databases.createDocument('main', env.PUBLIC_MESSAGES_ID, ID.unique(), {
			content: messageToSend,
			username,
			avatar_id: currentAvatarId,
			channels: currentChannelId,
		});
		messages = messages.filter((m) => m.type != MessageType.Temp || m.id != tempMessage.id);
	}

	async function getLatestMessages() {
		// let res = await databases.listDocuments('main', env.PUBLIC_MESSAGES_ID, [
		// 	Query.equal('channels', channelId),
		// 	Query.orderDesc('$createdAt'),
		// 	Query.limit(20)
		// ]);

		if (!savedChannels.map((c) => c.id).includes(currentChannelId)) {
			alert('Channel not found in saved channels');
			window.location.replace('/');
			currentChannelId = env.PUBLIC_MAIN_CHANNEL_ID;
		}
		const res = await fetch('/api/get_messages', {
			method: 'POST',
			body: JSON.stringify({
				id: currentChannelId,
				password: getCurrentChannel()?.savedPassword,
			}),
		});
		const json = JSON.parse(await res.text());
		if (json.error) {
			console.error(json.error);
			return;
		}
		const docs: Models.Document[] = json;
		messages = docs.map(messageFromDoc);
	}

	async function getAllChannels() {
		let res = await databases.listDocuments('main', env.PUBLIC_CHANNELS_ID);
		allChannels = res.documents.map(
			(doc) => new Channel(doc.$id, doc.name, new Date(doc.expiration), doc.password),
		);
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
			const newMainChannel = new Channel(env.PUBLIC_MAIN_CHANNEL_ID, 'Main', new Date(2035, 0));
			localStorage.setItem('savedChannels', JSON.stringify([newMainChannel]));
			savedChannels = [newMainChannel];
		} else {
			savedChannels = JSON.parse(channels);
		}
	}

	function saveSavedChannels() {
		localStorage.setItem('savedChannels', JSON.stringify(savedChannels));
	}

	onMount(async () => {
		// await getLatestMessages();
		loadSavedInfo();
		client.subscribe(
			`databases.main.collections.${env.PUBLIC_MESSAGES_ID}.documents`,
			messageRecieved,
		);
		await getAllChannels();
		await refreshChat();
	});

	function messageRecieved(response: RealtimeResponseEvent<unknown>) {
		const res: Models.Document = response.payload as Models.Document;
		if (res.channels.$id != currentChannelId) {
			return;
		}
		messages.unshift(messageFromDoc(res));
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
			// console.log(difference);
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
		if (lastMessage?.type != MessageType.User) {
			loadingMessages = false;
			return;
		}
		const lastMessageId = lastMessage?.id;
		const res = await fetch('/api/get_messages', {
			method: 'POST',
			body: JSON.stringify({
				id: currentChannelId,
				password: savedChannels.find((c) => c.id == currentChannelId)?.savedPassword,
				lastMessage: lastMessageId,
			}),
		});
		const json = JSON.parse(await res.text());
		// const res = await databases.listDocuments('main', env.PUBLIC_MESSAGES_ID, [
		// 	Query.equal('channels', currentChannelId),
		// 	Query.limit(10),
		// 	lastMessageId ? Query.cursorBefore(lastMessageId) : ''
		// ]);

		if (json.error) {
			console.error(json.error);
			return;
		}
		const docs: Models.Document[] = json;
		const newMessages = docs.map(messageFromDoc);

		if (newMessages.length == 0) {
			messages.push(
				new Message('No more messages!', 'SYSTEM', new Date(0), '0', MessageType.System),
			);
			loadingMessages = false;
			return;
		}
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
			doc.avatar_id,
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
					tmpCreatedAt,
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
				currentGroup[0].createdAt,
			),
		);
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

	async function onChannelCreate(doc: Models.Document, pass: string) {
		createChannelPopupShown = false;
		allChannels = [];
		await getAllChannels();
		const channel = new Channel(doc.$id, doc.name, doc.expiration, doc.password, pass);
		savedChannels.push(channel);
		saveSavedChannels();
	}

	function onCreateChannelOpen() {
		createChannelPopupShown = true;
	}

	function onListChannelsOpen() {
		listChannelsPopupShown = true;
	}

	let channelBeingAdded: Channel | null = null;
	async function toggleChannel(channel: Channel) {
		channelBeingAdded = channel;
		if (channel.id == env.PUBLIC_MAIN_CHANNEL_ID) {
			return alert("Can't remove Main channel");
		}
		const saved = savedChannels.map((c) => c.id).includes(channel.id);
		if (saved) {
			const index = savedChannels.map((c) => c.id).indexOf(channel.id);
			savedChannels.splice(index, 1);
			if (currentChannelId == channel.id) {
				refreshChat();
			}
		} else {
			if (channel.password) {
				passwordPromptShown = true;
				// promptPass = prompt('Enter password') ?? '';
				// const res = await fetch('/api/verify', {
				// 	method: 'POST',
				// 	body: JSON.stringify({
				// 		channel,
				// 		pass: promptPass,
				// 	}),
				// });
				// const resText = await res.text();
				// const allowed = resText == 'true';
				// if (allowed) {
				// 	channel.savedPassword = promptPass;
				// 	savedChannels.push(channel);
				// }
			} else {
				savedChannels.push(channel);
			}
		}

		saveSavedChannels();
	}

	function sortedChannels(): Channel[] {
		const savedChannelIds = savedChannels.map((c) => c.id);
		const notAdded = allChannels.filter((c) => !savedChannelIds.includes(c.id));
		return savedChannels.concat(notAdded);
	}

	async function addPasswordChannel() {
		passwordPromptShown = false;
		const res = await fetch('/api/verify', {
			method: 'POST',
			body: JSON.stringify({
				channel: channelBeingAdded,
				pass: promptPass,
			}),
		});
		const resText = await res.text();
		const allowed = resText == 'true';
		if (allowed && channelBeingAdded != null) {
			channelBeingAdded.savedPassword = promptPass;
			savedChannels.push(channelBeingAdded);
		}
		promptPass = '';
	}
</script>

<!-- PAGE -->
{#if passwordPromptShown}
	<SmallPopup title="Enter Password" onClose={() => (passwordPromptShown = false)}>
		<form onsubmit={addPasswordChannel}>
			<input
				class="w-full rounded-md border border-slate-500 bg-slate-300/10 px-4 py-2 shadow-md transition focus:shadow-xl focus:outline-none dark:text-white"
				type="password"
				bind:value={promptPass} />
		</form>
	</SmallPopup>
{/if}

{#if listChannelsPopupShown}
	<Popup
		title="List Channels"
		onClose={() => {
			listChannelsPopupShown = false;
		}}>
		<div class="flex flex-row flex-wrap gap-4">
			{#each sortedChannels() as channel}
				<button
					class="cursor-pointer rounded-md border bg-slate-300/10 px-4 py-2 shadow-md transition dark:text-white {savedChannels
						.map((c) => c.id)
						.includes(channel.id)
						? 'border-blue-500'
						: 'border-stone-500'}"
					onclick={() => toggleChannel(channel)}
					><div class="flex flex-row gap-2">
						{#if channel.password}<img
								src="/assets/key.svg"
								alt="password protected channel" />{/if}
						<p>{channel.name}</p>
					</div></button>
			{/each}
		</div>
	</Popup>
{/if}
{#if createChannelPopupShown}
	<CreateChannelPopup
		onClose={() => {
			createChannelPopupShown = false;
		}}
		{onChannelCreate}></CreateChannelPopup>
{/if}

<main class="fixed flex h-screen w-screen flex-row justify-center gap-4 p-4">
	<div
		class="flex w-full max-w-4xl flex-col rounded-md border border-slate-500 bg-slate-300/10 shadow-md backdrop-blur-xs">
		<div
			class="flex h-full flex-col-reverse overflow-y-auto p-2"
			onscroll={onMessagesScrolled}
			bind:this={messagesContainer}>
			{#each messageGroups as group}
				<div class="flex w-full gap-2 p-2">
					<img
						src={group.avatarId
							? formatAvatarURI(group.avatarId)
							: avatars.getInitials(group.username)}
						class="h-8 w-8 rounded-md object-cover shadow-md"
						title={group.avatarId}
						alt="avatar of {group.username}" />
					<div
						class="w-full rounded-md border bg-slate-300/10 p-4 shadow-md backdrop-blur-xs {group
							.messages[0].type == MessageType.System
							? 'border-red-500'
							: 'border-slate-500 '}">
						<p class="text-xs text-gray-400" title={group.createdAt.toString()}>
							<span>{group.username}</span>
							<span>&nbsp;-&nbsp;</span>
							<span dir="ltr">{formatDate(group.createdAt)}</span>
						</p>
						{#each group.messages.reverse() as message}
							<p
								class={message.type == MessageType.Temp ? 'text-gray-400' : 'dark:text-white'}
								title={message.id}>
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
				bind:this={newMessageBox} />
		</form>
	</div>
	{#if sidebarShown}
		<section
			transition:fly={{ duration: 200, x: 100, easing: quadOut }}
			class="flex h-full w-lg flex-col gap-4 rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md backdrop-blur-xs">
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
					class="flex flex-col gap-4 rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md backdrop-blur-xs">
					<button
						onclick={() => (profileCustomizationOpen = !profileCustomizationOpen)}
						class="flex w-full cursor-pointer flex-row items-center justify-between">
						<h1 class="text-2xl dark:text-white">Profile</h1>
						<img src="/assets/chevron_forward.svg" alt="open menu" />
					</button>
					<!-- TODO: add toggle thing -->
					{#if profileCustomizationOpen}
						<div class="flex flex-col gap-4" transition:slide={{ axis: 'y', duration: 200 }}>
							<input
								class="focus_shadow-xl rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md transition focus:outline-none dark:text-white"
								placeholder="Username"
								bind:value={username}
								onchange={onUsernameChanged} />
							{#if currentAvatarPath}
								<img
									src={currentAvatarPath}
									class="rounded-md border border-slate-500 object-cover shadow-md"
									alt="current avatar"
									title={currentAvatarId} />
							{/if}
							<div class="flex flex-row gap-4">
								<button
									class="w-full cursor-pointer rounded-md bg-blue-400 px-4 py-2 text-white shadow-md transition hover:bg-blue-500"
									onclick={() => avatarFilePicker?.click()}>Upload Avatar</button>
								<input
									type="file"
									class="hidden"
									accept="image/png, image/jpeg, image/webp"
									onchange={onAvatarUploadStart}
									bind:this={avatarFilePicker} />
								{#if currentAvatarId}
									<button
										class="cursor-pointer rounded-md bg-red-500 px-4 py-2 text-white shadow-md transition hover:bg-red-600"
										onclick={removeAvatar}>Remove</button>
								{/if}
							</div>
						</div>
					{/if}
				</div>
				<div
					class="flex flex-col gap-4 rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md backdrop-blur-xs">
					<button
						onclick={() => (channelsMenuOpen = !channelsMenuOpen)}
						class="flex w-full cursor-pointer flex-row items-center justify-between">
						<h1 class="text-2xl dark:text-white">Channels</h1>
						<img src="/assets/chevron_forward.svg" alt="open menu" />
					</button>

					{#if channelsMenuOpen}
						<div class="flex flex-col gap-4" transition:slide={{ axis: 'y', duration: 200 }}>
							{#each savedChannels as channel}
								<div class="flex flex-row items-center gap-4">
									<img
										src="/assets/chevron_forward.svg"
										class="size-6 brightness-0 dark:brightness-100"
										alt="chevron" />
									<a
										class="w-full cursor-pointer rounded-md {channel.id == currentChannelId
											? 'border border-blue-400 hover:border-blue-500'
											: ''} hover: bg-slate-300/10 px-4 py-2 transition hover:bg-slate-400/10 dark:text-white"
										onclick={() => refreshChat()}
										href="?{new URLSearchParams({ c: channel.id }).toString()}">{channel.name}</a>
								</div>
							{/each}
							<div class="flex w-full flex-row gap-4">
								<button
									class="shadmow-md w-full cursor-pointer rounded-md bg-blue-400 px-4 py-2 text-white backdrop-blur-xs transition hover:bg-blue-500"
									onclick={onCreateChannelOpen}>Create Channel</button>
								<button
									class="shadmow-md w-full cursor-pointer rounded-md bg-blue-400 px-4 py-2 text-white backdrop-blur-xs transition hover:bg-blue-500"
									onclick={onListChannelsOpen}>List Channels</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</section>
	{:else}
		<button
			class="fixed top-8 right-8 flex flex-row gap-1 self-end rounded-md bg-blue-400 px-4 py-2 text-white shadow-md transition hover:bg-blue-500"
			onclick={toggleSidebar}>
			<img src="/assets/chevron_forward.svg" class="rotate-180" alt="open sidebar" />
		</button>
	{/if}
</main>
