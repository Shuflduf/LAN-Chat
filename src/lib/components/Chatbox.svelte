<script lang="ts">
	import { env } from '$env/dynamic/public';
	import {
		avatars,
		Channel,
		client,
		formatAvatarURI,
		formatBytes,
		formatDate,
		getChannelPassword,
		getCurrentChannel,
		getCurrentChannelId,
		Message,
		MessageFile,
		MessageGroup,
		MessageType,
		storage,
	} from '$lib';
	import type { Models, RealtimeResponseEvent } from 'appwrite';
	import { onMount } from 'svelte';
	import MessageInput from './MessageInput.svelte';
	import { writable, type Writable } from 'svelte/store';

	let { update }: { update: Writable<string> } = $props();

	let messagesContainer: HTMLDivElement | null = $state(null);

	let messages: Message[] = $state([]);
	let loadingMessages: boolean = $state(false);
	let messageGroups: any[] = $derived(groupsFromMessages(messages));
	let droppedFiles: Writable<File[]> = $state(writable([]));
	let currentChannelName: string = $state('');

	onMount(async () => {
		client.subscribe(
			`databases.main.collections.${env.PUBLIC_MESSAGES_ID}.documents`,
			messageRecieved,
		);
		update.subscribe(async (id) => {
			if (id != undefined) {
				await refreshChat();
			}
		});
	});

	async function messageRecieved(response: RealtimeResponseEvent<unknown>) {
		const res: Models.Document = response.payload as Models.Document;
		if (res.channels.$id != getCurrentChannelId()) {
			// console.log(getCurrentChannelId());
			return;
		}
		const mes = await messageFromDoc(res);
		messages = messages.filter((m) => m.id != mes.id);
		messages.unshift(mes);
	}

	async function addTempMessage(mes: Message) {
		await mes.renderMarkdown();
		messages.unshift(mes);
	}

	async function messageFromDoc(doc: Models.Document): Promise<Message> {
		let messageFiles: MessageFile[] = [];
		for (const file of doc.files) {
			const res = await storage.getFile('message_files', file);
			const mfile = new MessageFile(res.name, res.$id, res.mimeType, res.sizeOriginal);
			messageFiles.push(mfile);
		}
		const mes = new Message(
			doc.content,
			doc.username,
			new Date(doc.$createdAt),
			doc.$id,
			MessageType.User,
			doc.avatar_id,
			messageFiles,
		);
		await mes.renderMarkdown();
		return mes;
	}
	async function refreshChat() {
		await new Promise((r) => setTimeout(r, 100));

		messages = [];
		await getLatestMessages();
	}

	async function getLatestMessages() {
		const currentChannel = await getCurrentChannel();
		if (!currentChannel) {
			alert('Channel not found in saved channels');
			window.location.replace('/');
		}
		currentChannelName = (currentChannel as Channel).name;
		const res = await fetch('/api/get_messages', {
			method: 'POST',
			body: JSON.stringify({
				id: getCurrentChannelId(),
				password: currentChannel?.savedPassword,
			}),
		});
		const json = JSON.parse(await res.text());
		if (json.error) {
			console.error(json.error);
			return;
		}
		const docs: Models.Document[] = json;
		console.log(docs);
		messages = await Promise.all(docs.map(messageFromDoc));
	}

	function groupsFromMessages(tmpMessages: Message[]): MessageGroup[] {
		if (tmpMessages.length == 0) {
			return [];
		}
		let groups: MessageGroup[] = [];
		let currentGroup: (Message | null)[] = [];
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
				if (mes.files.length > 0) {
					currentGroup.push(null);
				}
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
		const safeGroup = currentGroup as Message[];
		groups.push(
			new MessageGroup(
				currentGroup,
				safeGroup[0].username,
				safeGroup[0].avatarId,
				safeGroup[0].createdAt,
			),
		);
		return groups;
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
				id: getCurrentChannelId(),
				password: getChannelPassword(getCurrentChannelId()),
				lastMessage: lastMessageId,
			}),
		});
		const json = JSON.parse(await res.text());

		if (json.error) {
			console.error(json.error);
			return;
		}
		const docs: Models.Document[] = json;
		const newMessages = await Promise.all(docs.map(messageFromDoc));

		if (newMessages.length == 0) {
			const sysMessage = new Message(
				'No more messages!',
				'SYSTEM',
				new Date(0),
				'0',
				MessageType.System,
				null,
				[],
			);
			sysMessage.renderedMarkdown = sysMessage.content;
			messages.push(sysMessage);
			loadingMessages = false;
			return;
		}
		messages = [...messages, ...newMessages];
		loadingMessages = false;
	}

	function messageFilesDropped(event: DragEvent) {
		event.preventDefault();
		if (!event.dataTransfer) {
			return;
		}
		const files = Array.from(event.dataTransfer.files);
		droppedFiles.set(files);
	}
</script>

<div
	ondrop={messageFilesDropped}
	role="region"
	ondragover={(e) => e.preventDefault()}
	class="mb-8 flex w-full max-w-2xl flex-col rounded-md border border-slate-500 bg-slate-300/10
	shadow-md backdrop-blur-xs transition hover:shadow-lg md:mb-0">
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
					class="h-8 w-8 rounded-md object-cover shadow-md transition hover:shadow-lg"
					title={group.avatarId}
					alt="avatar of {group.username}" />
				<div
					class="w-full rounded-md border bg-slate-300/10 p-4 shadow-md backdrop-blur-xs transition hover:shadow-lg {group
						.messages[0].type == MessageType.System
						? 'border-red-500'
						: 'border-slate-500 '}">
					<p class="text-xs text-gray-400" title={group.createdAt.toString()}>
						<span>{group.username}</span>
						<span>&nbsp;-&nbsp;</span>
						<span dir="ltr">{formatDate(group.createdAt)}</span>
					</p>
					{#each group.messages.reverse() as message}
						{#if message == null}
							<hr class="m-4 border-dotted text-slate-500" />
						{:else}
							<div class="rounded-md transition hover:backdrop-invert-[0.02]">
								<p
									class="{message.type == MessageType.Temp
										? 'text-gray-400'
										: 'dark:!text-white'} prose prose-slate dark:prose-invert"
									title={message.id}>
									{@html message.renderedMarkdown}
								</p>
								{#if message.files.length > 0}
									<div class="mt-2 flex w-fit flex-row flex-wrap items-start gap-4 rounded-md">
										{#each message.mediaFiles() as file}
											{#if file.isImage()}
												<img
													src={file.formatURL()}
													alt={file.name}
													title={file.id}
													class="max-w-64 rounded-md shadow-md transition hover:shadow-lg" />
											{:else if file.isVideo()}
												<video
													src={file.formatURL()}
													title={file.id}
													controls
													class="max-w-96 rounded-md shadow-md transition hover:shadow-lg"
													><track kind="captions" /></video>
											{/if}
										{/each}
										{#if message.mediaFiles().length > 0 && message.notMediaFiles().length > 0}
											<br />
										{/if}
										<div class="flex w-fit flex-row flex-wrap items-start gap-4 rounded-md">
											{#each message.notMediaFiles() as file}
												<a href={file.downloadURL()}>
													<button
														class="h-16 cursor-pointer rounded-md border border-slate-500 bg-slate-300/10 shadow-md hover:shadow-lg">
														<div class="flex flex-row justify-between gap-4 px-4">
															<div>
																<p class="font-[Arvo] italic dark:text-white">{file.name}</p>
																<p class="text-sm text-gray-400">{formatBytes(file.size)}</p>
															</div>
															<img src="/assets/download.svg" alt="download" />
														</div>
													</button>
												</a>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/each}
	</div>
	<!-- // message input -->
	<MessageInput {droppedFiles} {currentChannelName} {addTempMessage}></MessageInput>
</div>
