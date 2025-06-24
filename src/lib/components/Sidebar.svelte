<script lang="ts">
	import { env } from '$env/dynamic/public';
	import {
		Channel,
		databases,
		formatAvatarURI,
		getAvatarId,
		getCurrentChannel,
		getCurrentChannelId,
		getSavedChannels,
		getUsername,
		saveChannel,
		storage,
		unsaveChannel,
	} from '$lib';
	import { ID, Query, type Models } from 'appwrite';
	import { fly, slide } from 'svelte/transition';
	import ListChannelsPopup from './ListChannelsPopup.svelte';
	import { quadOut } from 'svelte/easing';
	import CreateChannelPopup from './CreateChannelPopup.svelte';
	import type { Writable } from 'svelte/store';
	import { onMount } from 'svelte';

	let { update }: { update: Writable<string> } = $props();

	let avatarFilePicker: HTMLInputElement | null = $state(null);
	let sidebarShown: boolean = $state(false);
	let createChannelPopupShown: boolean = $state(false);
	let profileCustomizationOpen: boolean = $state(true);
	let channelsMenuOpen: boolean = $state(true);
	let username: string = $state(getUsername());
	let currentAvatarPath: string | null = $state(
		getAvatarId() ? formatAvatarURI(getAvatarId() as string) : null,
	);
	let allChannels: Channel[] = $state([]);
	let savedChannels: Channel[] = $state([]);

	let listChannelsPopupShown: boolean = $state(false);

	function saveUsername() {
		localStorage.setItem('username', username);
	}

	onMount(async () => {
		savedChannels = await getSavedChannels();
		refreshChat();
	});

	async function handleSelfDestruct() {
		// this is probably a bad idea
		const curChannel = await getCurrentChannel();
		if (curChannel?.name == 'Main') return;

		const expiration = curChannel?.expiration;
		if (!expiration) return;

		const expirationDate = new Date(expiration);
		if (expirationDate.getTime() < Date.now()) {
			alert('Channel deleted');
			// savedChannels = savedChannels.filter((c) => c.id != currentChannelId);
			unsaveChannel((await getCurrentChannel()) as Channel);
			await databases.deleteDocument('main', env.PUBLIC_CHANNELS_ID, getCurrentChannelId());
			// currentChannelId = env.PUBLIC_MAIN_CHANNEL_ID;
			window.location.replace('/');
			refreshChat();
		}
	}

	async function onAvatarUploadStart() {
		if (avatarFilePicker?.files && avatarFilePicker.files.length > 0) {
			const res = await storage.createFile('profiles', ID.unique(), avatarFilePicker.files[0]);
			localStorage.setItem('avatar_id', res.$id);
			currentAvatarPath = formatAvatarURI(res.$id);
		}
	}
	function toggleSidebar() {
		sidebarShown = !sidebarShown;
	}
	function removeAvatar() {
		localStorage.removeItem('avatar_id');
		currentAvatarPath = null;
	}

	async function refreshChat() {
		await new Promise((r) => setTimeout(r, 100));
		handleSelfDestruct();
		update.set(getCurrentChannelId());
	}

	async function onChannelCreate(doc: Models.Document, pass: string) {
		createChannelPopupShown = false;
		allChannels = [];
		await getAllChannels();
		const channel = new Channel(doc.$id, doc.name, doc.expiration, doc.password, pass);
		// savedChannels.push(channel);
		await saveChannel(channel);
		console.log(await getSavedChannels());
		savedChannels = await getSavedChannels();
	}

	async function getAllChannels() {
		let res = await databases.listDocuments('main', env.PUBLIC_CHANNELS_ID, [
			Query.select(['name', 'expiration', 'password']),
			Query.limit(100),
		]);
		allChannels = res.documents.map(
			(doc) => new Channel(doc.$id, doc.name, new Date(doc.expiration), doc.password),
		);
	}

	function onCreateChannelOpen() {
		createChannelPopupShown = true;
	}

	async function onListChanged() {
		savedChannels = await getSavedChannels();
	}

	// function onListChannelsOpen() {
	// 	listChannelsPopupShown = true;
	// }
</script>

{#if listChannelsPopupShown}
	<ListChannelsPopup onClose={() => (listChannelsPopupShown = false)} {onListChanged}>
	</ListChannelsPopup>
{/if}
{#if createChannelPopupShown}
	<CreateChannelPopup onClose={() => (createChannelPopupShown = false)} {onChannelCreate}>
	</CreateChannelPopup>
{/if}

{#if sidebarShown}
	<div
		class="sidebar-min fixed right-4 ml-4 h-[calc(100%-2rem)] max-w-md md:static md:m-0 md:ml-0 md:h-full md:min-w-md">
		<section
			transition:fly={{ duration: 200, x: 100, easing: quadOut }}
			class="bg-funny flex h-full w-full flex-col gap-4 rounded-md border border-slate-500 bg-white p-4 shadow-md backdrop-blur-lg transition hover:shadow-lg md:backdrop-blur-xs dark:bg-slate-300/10">
			<div class="flex w-full flex-row justify-end gap-4">
				<!-- <button -->
				<!-- 	class="flex flex-row gap-1 rounded-md bg-blue-400 px-4 py-2 text-white shadow-md transition hover:bg-blue-500" -->
				<!-- 	onclick={toggleTheme}>Change Theme</button -->
				<!-- > -->
				<button
					class="flex cursor-pointer flex-row gap-2 rounded-md bg-blue-400 px-4 py-2 font-[Arvo] text-white shadow-md transition hover:bg-blue-500 hover:shadow-lg"
					onclick={toggleSidebar}>
					<p>Hide Sidebar</p>
					<img src="/assets/chevron_forward.svg" alt="chevron" />
				</button>
			</div>
			<div class="flex flex-col gap-4 overflow-y-auto">
				<div
					class="flex flex-col gap-4 rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md backdrop-blur-xs transition hover:shadow-lg">
					<button
						onclick={() => (profileCustomizationOpen = !profileCustomizationOpen)}
						class="flex w-full cursor-pointer flex-row items-center justify-between">
						<h1 class="font-[Arvo] text-2xl font-bold dark:text-white">Profile</h1>
						<img
							src="/assets/chevron_forward.svg"
							alt="open menu"
							class="brightness-0 dark:brightness-100" />
					</button>
					{#if profileCustomizationOpen}
						<div class="flex flex-col gap-4" transition:slide={{ axis: 'y', duration: 200 }}>
							<div class="flex h-12 w-full flex-row gap-2">
								{#if currentAvatarPath}
									<img
										src={currentAvatarPath}
										class="aspect-square rounded-md border border-slate-500 object-cover shadow-md transition hover:shadow-lg"
										alt="current avatar"
										title={getAvatarId()} />
								{/if}
								<input
									class="w-full rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md transition hover:shadow-lg focus:shadow-xl focus:outline-none dark:text-white"
									placeholder="Username"
									bind:value={username}
									onchange={saveUsername} />
							</div>
							<div class="flex flex-row gap-4">
								<button
									class="w-full cursor-pointer rounded-md bg-blue-400 px-4 py-2 font-[Arvo] text-white shadow-md transition hover:bg-blue-500 hover:shadow-lg"
									onclick={() => avatarFilePicker?.click()}>
									<div class="flex flex-row justify-center gap-2">
										<img src="/assets/person.svg" alt="person" />
										<p>Upload Avatar</p>
									</div>
								</button>
								<input
									type="file"
									class="hidden"
									accept="image/png, image/jpeg, image/webp"
									onchange={onAvatarUploadStart}
									bind:this={avatarFilePicker} />
								{#if currentAvatarPath}
									<button
										class="w-full cursor-pointer rounded-md bg-red-500 px-4 py-2 font-[Arvo] text-white shadow-md transition hover:bg-red-600 hover:shadow-lg"
										onclick={removeAvatar}>
										<div class="flex flex-row justify-center gap-2">
											<img src="/assets/trash.svg" alt="trash" />
											<p>Remove</p>
										</div>
									</button>
								{/if}
							</div>
						</div>
					{/if}
				</div>
				<div
					class="flex flex-col gap-4 rounded-md border border-slate-500 bg-slate-300/10 p-4 shadow-md backdrop-blur-xs transition hover:shadow-lg">
					<button
						onclick={() => (channelsMenuOpen = !channelsMenuOpen)}
						class="flex w-full cursor-pointer flex-row items-center justify-between">
						<h1 class="font-[Arvo] text-2xl font-bold dark:text-white">Channels</h1>
						<img
							src="/assets/chevron_forward.svg"
							alt="open menu"
							class="brightness-0 dark:brightness-100" />
					</button>
					{#if channelsMenuOpen}
						<div class="flex flex-col gap-2" transition:slide={{ axis: 'y', duration: 200 }}>
							{#each savedChannels as channel}
								<div class="flex flex-row items-center gap-4">
									<img
										src="/assets/tag.svg"
										class="size-6 brightness-0 dark:brightness-100"
										alt="chevron" />
									<a
										class="w-full cursor-pointer rounded-md {channel.id == getCurrentChannelId()
											? 'border border-blue-400 hover:border-blue-500'
											: 'border border-slate-300 dark:border-none'} bg-slate-300/10 px-4 py-2 shadow-md transition hover:bg-slate-400/10 hover:shadow-lg dark:text-white"
										onclick={refreshChat}
										href="?{new URLSearchParams({ c: channel.id }).toString()}">
										{channel.name}
									</a>
								</div>
							{/each}
							<div class="mt-2 flex w-full flex-row gap-4">
								<button
									class="w-full cursor-pointer rounded-md bg-blue-400 px-4 py-2 font-[Arvo] text-white shadow-md backdrop-blur-xs transition hover:bg-blue-500 hover:shadow-lg"
									onclick={onCreateChannelOpen}>
									<div class="flex flex-row justify-center gap-2">
										<img src="/assets/add.svg" alt="add" />
										<p>Create Channel</p>
									</div>
								</button>
								<button
									class="w-full cursor-pointer rounded-md bg-blue-400 px-4 py-2 font-[Arvo] text-white shadow-md backdrop-blur-xs transition hover:bg-blue-500 hover:shadow-lg"
									onclick={() => (listChannelsPopupShown = true)}>
									<div class="flex flex-row justify-center gap-2">
										<img src="/assets/list.svg" alt="add" />
										<p>List Channels</p>
									</div>
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</section>
	</div>
{:else}
	<button
		class="fixed top-8 right-8 flex cursor-pointer flex-row gap-1 self-end rounded-md bg-blue-400 px-4 py-2 text-white shadow-md transition hover:bg-blue-500 hover:shadow-lg"
		onclick={toggleSidebar}>
		<img src="/assets/chevron_forward.svg" class="rotate-180" alt="open sidebar" />
	</button>
{/if}

<style>
	.sidebar-min {
		min-width: min(calc(100vw - 2rem), 28rem);
	}
</style>
