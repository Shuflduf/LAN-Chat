<script lang="ts">
	import type { Models } from 'appwrite';
	import Popup from './Popup.svelte';
	import { getAllChannels } from '$lib';

	let channelCreationName: string = $state('');
	let channelCreationPassword: string = $state('');
	let channelCreationExpiration: string = $state('');

	let { onClose, onChannelCreate } = $props();

	async function onCreateChannel() {
		if (channelCreationName.trim() == '') {
			alert('Please provide a channel name');
			return;
		}
		if (channelCreationExpiration == '') {
			alert('Please provide an expiration date');
			return;
		}

		const allChannels = await getAllChannels();
		if (allChannels.map((c) => c.name).includes(channelCreationName)) {
			alert('Channel name taken');
			return;
		}
		if (channelCreationName.startsWith('Net')) {
			alert('Channel names starting with "Net" are not allowed');
			return;
		}

		const min = 1000 * 60;
		const hour = min * 60;
		const day = hour * 24;
		let offset: number = 0;
		switch (channelCreationExpiration) {
			case '1h':
				offset = hour;
				break;
			case '4h':
				offset = hour * 4;
				break;
			case '1d':
				offset = day;
				break;
			case '1w':
				offset = day * 7;
				break;
			case '-1h':
				offset = -hour;
				break;
		}

		const futureDate = new Date(Date.now() + offset);
		const res = await fetch('/api/create_channel', {
			method: 'POST',
			body: JSON.stringify({
				channelName: channelCreationName,
				expiration: futureDate,
				password: channelCreationPassword,
			}),
		});
		const doc: Models.Document = JSON.parse(await res.text());
		// allChannels = [];
		// await getAllChannels();
		onChannelCreate(doc, channelCreationPassword);
	}
</script>

<Popup title="Create Channel" {onClose}>
	<form class="flex flex-col gap-4">
		<label class="dark:text-white"
			>Channel Name<span class="text-red-500">*</span>

			<input
				class="ml-4 rounded-md border border-slate-500 bg-slate-300/10 px-4 py-2 shadow-md backdrop-blur-xs transition focus:shadow-xl focus:outline-none dark:text-white"
				bind:value={channelCreationName} />
		</label>
		<label class="dark:text-white" title="In how long will this channel be deleted">
			Expiration Date<span class="text-red-500">*</span>
			<select
				class="ml-4 rounded-md border border-slate-500 bg-slate-300/10 px-4 py-2 shadow-md backdrop-blur-xs"
				required
				bind:value={channelCreationExpiration}>
				<option class="text-black" value="1h">1 Hour</option>
				<option class="text-black" value="4h">4 Hours</option>
				<option class="text-black" value="1d">1 Day</option>
				<option class="text-black" value="1w">1 Week</option>
				<option class="text-black" value="-1h">-1 Hours</option>
			</select>
		</label>
		<label class="dark:text-white">
			Password
			<input
				type="password"
				class="ml-4 rounded-md border border-slate-500 bg-slate-300/10 px-4 py-2 shadow-md backdrop-blur-xs transition focus:shadow-xl focus:outline-none dark:text-white"
				bind:value={channelCreationPassword} />
		</label>
		<input
			type="submit"
			value="Create Channel"
			class="cursor-pointer rounded-md bg-blue-400 px-4 py-2 text-white shadow-md transition hover:bg-blue-500"
			onclick={onCreateChannel} />
	</form>
</Popup>
