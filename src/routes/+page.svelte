<main class="fixed flex h-screen w-screen flex-row gap-4 p-4">
	<div class="w-1/5 bg-red-500 rounded-md">
		<h1 class="p-4 text-2xl text-white">Sidebar</h1>
	</div>
	<div class="flex w-4/5 flex-col bg-blue-500 rounded-md">
		<div class="flex flex-col-reverse overflow-y-auto p-2">
			{#each Array(20).fill(0) as _, i}
				<div class="m-2 rounded-md bg-green-500 p-4">
					<p class="text-white">Item {i + 1}</p>
				</div>
			{/each}
		</div>
		<form class="w-full p-4">
			<input class="w-full bg-yellow-500 p-4 rounded-md" placeholder="Send Message" />
		</form>
	</div>
</main>
