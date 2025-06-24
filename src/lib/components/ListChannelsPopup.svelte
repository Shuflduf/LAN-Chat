<script lang="ts">
	import { env } from '$env/dynamic/public';
	import {
		Channel,
		databases,
		getSavedChannels,
		isChannelSaved,
		saveChannel,
		unsaveChannel,
	} from '$lib';
	import { onMount } from 'svelte';
	import Popup from './Popup.svelte';
	import PasswordPrompt from './PasswordPrompt.svelte';

	let savedChannels: Channel[] = $state(getSavedChannels());

	let allChannels: Channel[] = $state([]);
	let passwordPromptShown: boolean = $state(false);
	let onPasswordSubmit: ((pass: string) => void) | null = $state(null);
	let promptPass: string = $state('');
	let sortedChannelsList = $derived(sortedChannels());

	let { onClose, onListChanged } = $props();

	onMount(async () => {
		const res = await databases.listDocuments('main', env.PUBLIC_CHANNELS_ID);
		res.documents.forEach((d) =>
			allChannels.push(new Channel(d.$id, d.name, new Date(d.expiration), d.password, null)),
		);
	});

	function sortedChannels(): Channel[] {
		const notAdded = allChannels.filter((c) => !savedChannels.map((d) => d.id).includes(c.id));
		return savedChannels.concat(notAdded);
	}

	async function toggleChannel(channel: Channel) {
		if (channel.id == env.PUBLIC_MAIN_CHANNEL_ID) {
			return alert("Can't remove Main channel");
		}
		if (isChannelSaved(channel)) {
			unsaveChannel(channel);
			// if (currentChannelId == channel.id) {
			// 	refreshChat();
			// } TODO:
		} else {
			if (channel.password) {
				passwordPromptShown = true;
				const contFunc = async () => {
					passwordPromptShown = false;
					const res = await fetch('/api/verify', {
						method: 'POST',
						body: JSON.stringify({
							channel,
							pass: promptPass,
						}),
					});
					const resText = await res.text();
					const allowed = resText == 'true';
					if (allowed) {
						channel.savedPassword = promptPass;
						saveChannel(channel);
						saveSaveSavedSave();
					}
				};
				onPasswordSubmit = (pass: string) => {
					promptPass = pass;
					contFunc();
				};
			} else {
				// savedChannels.push(channel);
				saveChannel(channel);
			}
		}
		saveSaveSavedSave();
	}

	function saveSaveSavedSave() {
		savedChannels = getSavedChannels();
		onListChanged();
	}
</script>

{#if passwordPromptShown}
	<PasswordPrompt onClose={() => (passwordPromptShown = false)} onSubmit={onPasswordSubmit}>
	</PasswordPrompt>
{/if}
<Popup title="List Channels" {onClose}>
	<div class="flex flex-row flex-wrap gap-4">
		{#each sortedChannelsList as channel}
			<button
				class="cursor-pointer rounded-md border bg-slate-300/10 px-4 py-2 shadow-md transition dark:text-white {getSavedChannels()
					.map((c) => c.id)
					.includes(channel.id)
					? 'border-blue-500'
					: 'border-stone-500'}"
				onclick={() => toggleChannel(channel)}>
				<div class="flex flex-row gap-2">
					{#if channel.password}
						<img src="/assets/key.svg" alt="password protected channel" />
					{/if}
					<p>{channel.name}</p>
				</div>
			</button>
		{/each}
	</div>
</Popup>
