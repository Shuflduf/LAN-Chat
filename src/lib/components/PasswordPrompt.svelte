<script lang="ts">
	import SmallPopup from './SmallPopup.svelte';

	let { onClose, onSubmit } = $props();

	let promptPass = $state('');

	function submit() {
		onSubmit(promptPass);
		promptPass = '';
	}
</script>

<SmallPopup title="Enter Password" {onClose}>
	<form onsubmit={submit}>
		<input
			class="w-full rounded-md border border-slate-500 bg-slate-300/10 px-4 py-2 shadow-md transition focus:shadow-xl focus:outline-none dark:text-white"
			type="password"
			bind:value={promptPass} />
	</form>
</SmallPopup>
