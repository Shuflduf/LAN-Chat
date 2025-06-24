<script lang="ts">
	import { env } from '$env/dynamic/public';
	import {
		databases,
		getAvatarId,
		getCurrentChannelId,
		getUsername,
		Message,
		MessageType,
		storage,
	} from '$lib';
	import { ID } from 'appwrite';
	import { onMount } from 'svelte';
	import type { Writable } from 'svelte/store';

	let newMessageBox: HTMLTextAreaElement | null = $state(null);
	let messageFilePicker: HTMLInputElement | null = $state(null);
	let newMessage: string = $state('');
	let currentAvatarId: string | null = $state(null);
	let messageFiles: File[] = $state([]);

	let {
		droppedFiles,
		currentChannelName,
		addTempMessage,
	}: {
		droppedFiles: Writable<File[]>;
		currentChannelName: string;
		addTempMessage: (mes: Message) => void;
	} = $props();

	onMount(() => {
		const avatarId = localStorage.getItem('avatarId');
		if (avatarId != null) {
			currentAvatarId = avatarId;
		}
		droppedFiles.subscribe(droppedFilesUpdate);
	});

	function droppedFilesUpdate(files: File[]) {
		if (files.length > 0) {
			if (files.length + messageFiles.length > 5) {
				alert('5 files max');
				return;
			}
			for (const file of files) {
				messageFiles.push(file);
			}
		}
	}

	function removeMessageFile(file: File) {
		messageFiles = messageFiles.filter((f) => f != file);
	}
	function pasteMessageFiles(event: ClipboardEvent) {
		if (!event.clipboardData) {
			return;
		}
		const files = Array.from(event.clipboardData.files);
		if (files.length > 0) {
			if (messageFiles.length + files.length > 5) {
				alert('5 files max');
				return;
			}
			for (const file of files) {
				messageFiles.push(file);
			}
		}
	}
	function onMessageFilesAdded() {
		if (messageFilePicker && messageFilePicker.files) {
			if (messageFiles.length + messageFilePicker.files.length > 5) {
				alert('5 files max');
				return;
			}
			for (let i = 0; i < messageFilePicker.files.length; i++) {
				const file = messageFilePicker.files.item(i);
				if (file) {
					messageFiles.push(file);
				}
			}
		}
	}
	async function uploadMessageFiles(files: File[]): Promise<string[]> {
		let ids: string[] = [];
		for (const file of files) {
			let res = await storage.createFile('message_files', ID.unique(), file);
			ids.push(res.$id);
		}
		// files.forEach(async (file) => {
		// 	let res = await storage.createFile('message_files', ID.unique(), file);
		// 	ids.push(res.$id);
		// });
		return ids;
	}
	async function submitMessage(event: Event) {
		event.preventDefault();
		if (newMessage.trim() == '') {
			return;
		}
		if (getUsername().trim() == '') {
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
		const filesToUpload = messageFiles;
		messageFiles = [];

		const id = ID.unique();
		const tempMessage = new Message(
			messageToSend,
			getUsername(),
			new Date(),
			id,
			MessageType.Temp,
			getAvatarId(),
			[],
		);
		addTempMessage(tempMessage);
		let ids = await uploadMessageFiles(filesToUpload);
		await databases.createDocument('main', env.PUBLIC_MESSAGES_ID, id, {
			content: messageToSend,
			username: getUsername(),
			avatar_id: getAvatarId(),
			channels: getCurrentChannelId(),
			files: ids,
		});
		// messages = messages.filter((m) => m.type != MessageType.Temp || m.id != tempMessage.id);
	}
	function handleTextareaKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			submitMessage(event);
		}
	}
</script>

<div class="absolute bottom-22 left-4 flex flex-row gap-2">
	{#each messageFiles as file}
		<button
			onclick={() => removeMessageFile(file)}
			class="flex h-8 cursor-pointer items-center rounded-md border border-slate-500 bg-slate-300/10 px-4 py-2 font-[Arvo] text-white italic shadow-md backdrop-blur-xs">
			{file.name}
		</button>
	{/each}
</div>
<form class="flex w-full flex-row gap-2 p-4" onsubmit={submitMessage}>
	<input
		type="file"
		class="hidden"
		bind:this={messageFilePicker}
		multiple
		onchange={onMessageFilesAdded} />
	<button
		type="button"
		class="cursor-pointer rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md transition hover:shadow-lg"
		onclick={() => messageFilePicker?.click()}>
		<img src="/assets/add.svg" alt="plus" class="brightness-0 dark:brightness-100" />
	</button>
	<textarea
		rows="1"
		onpaste={pasteMessageFiles}
		onkeydown={handleTextareaKeydown}
		class="w-full resize-none rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md transition hover:shadow-lg focus:shadow-xl focus:outline-none dark:text-white"
		placeholder="Send message to {currentChannelName}"
		bind:value={newMessage}
		bind:this={newMessageBox}>
	</textarea>
</form>
