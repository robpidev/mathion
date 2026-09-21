<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { AVATAR_STYLES, avatarUrl, randomSeed, type AvatarStyle } from '$lib/avatar';

	let pin = $state('');
	let nombre = $state('');
	let estilo: AvatarStyle = $state('adventurer');
	let semilla = $state(randomSeed());
	let entrando = $state(false);
	let error = $state('');

	async function entrar() {
		if (entrando) return;
		error = '';
		const code = pin.trim().toUpperCase();
		if (code.length !== 4) {
			error = 'El PIN tiene 4 letras.';
			return;
		}
		if (!nombre.trim()) {
			error = 'Escribe tu nombre.';
			return;
		}
		entrando = true;
		try {
			const { data: room, error: e1 } = await supabase
				.from('rooms')
				.select('id,estado')
				.eq('pin', code)
				.maybeSingle();
			if (e1 || !room) {
				error = 'Sala no encontrada. Revisa el PIN.';
				return;
			}
			if (room.estado !== 'lobby') {
				error = 'La partida ya empezó.';
				return;
			}
			const { data: player, error: e2 } = await supabase
				.from('players')
				.insert({
					room_id: room.id,
					nombre: nombre.trim().slice(0, 16),
					avatar_estilo: estilo,
					avatar_seed: semilla
				})
				.select('id')
				.single();
			if (e2 || !player) {
				error = 'No se pudo entrar. Intenta de nuevo.';
				return;
			}
			localStorage.setItem(`mathion:${code}`, player.id);
			goto(`/sala/${code}/jugar`);
		} finally {
			entrando = false;
		}
	}
</script>

<svelte:head><title>Mathion — Unirse</title></svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4">
	<div class="animate-pop w-full rounded-2xl bg-white/10 p-8 text-center ring-1 ring-white/20 backdrop-blur">
		<h2 class="text-3xl font-black text-white">Unirse a la sala</h2>
		<input
			bind:value={pin}
			placeholder="PIN"
			maxlength="4"
			class="mt-5 w-full rounded-xl border-2 border-white/30 bg-white/10 px-4 py-3 text-center text-3xl font-black tracking-[0.5em] text-white uppercase placeholder-indigo-300 outline-none focus:border-amber-400"
		/>
		<input
			bind:value={nombre}
			placeholder="Tu nombre"
			maxlength="16"
			class="mt-3 w-full rounded-xl border-2 border-white/30 bg-white/10 px-4 py-3 text-center text-lg font-bold text-white placeholder-indigo-300 outline-none focus:border-amber-400"
		/>
		<div class="mt-4 flex flex-wrap justify-center gap-2">
			{#each AVATAR_STYLES as s}
				<button
					onclick={() => (estilo = s)}
					class="rounded-full ring-2 transition {estilo === s ? 'ring-amber-400' : 'ring-transparent hover:ring-white/50'}"
					aria-label={s}
				>
					<img src={avatarUrl(nombre || semilla, s)} alt={s} class="h-12 w-12 rounded-full bg-white/20" loading="lazy" />
				</button>
			{/each}
		</div>
		{#if error}
			<p class="mt-3 rounded-xl bg-red-500/20 px-3 py-2 text-sm font-bold text-red-200">{error}</p>
		{/if}
		<button
			onclick={entrar}
			disabled={entrando}
			class="mt-5 w-full rounded-xl bg-amber-400 px-4 py-3 text-xl font-black text-indigo-950 transition hover:bg-amber-300 active:scale-95 disabled:opacity-60"
		>
			{entrando ? 'ENTRANDO…' : 'ENTRAR'}
		</button>
		<a href="/" class="mt-4 inline-block text-sm font-bold text-indigo-200 underline hover:text-white">← Volver</a>
	</div>
</div>
