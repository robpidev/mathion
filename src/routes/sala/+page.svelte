<script lang="ts">
	import { goto } from '$app/navigation';
	import { QUIZZES } from '$lib/quizzes';
	import { supabase } from '$lib/supabase';
	import { makePin } from '$lib/sala';

	let quizId = $state(QUIZZES[0]?.id ?? '');
	let creando = $state(false);
	let error = $state('');

	async function crear() {
		if (creando || !quizId) return;
		creando = true;
		error = '';
		try {
			for (let i = 0; i < 5; i++) {
				const pin = makePin();
				const { error: e } = await supabase
					.from('rooms')
					.insert({ pin, quiz_id: quizId, estado: 'lobby', indice: 0 });
				if (!e) {
					goto(`/sala/${pin}/host`);
					return;
				}
			}
			error = 'No se pudo crear la sala. Revisa tu conexión y el schema SQL.';
		} finally {
			creando = false;
		}
	}
</script>

<svelte:head><title>Mathion — Crear sala</title></svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4">
	<div class="animate-pop w-full rounded-2xl bg-white/10 p-8 text-center ring-1 ring-white/20 backdrop-blur">
		<h2 class="text-3xl font-black text-white">Crear sala</h2>
		<p class="mt-1 text-sm text-indigo-200">Proyecta el PIN y que se unan con sus celulares.</p>
		<label for="quizsel" class="mt-5 block text-left text-sm font-bold text-indigo-100">Cuestionario</label>
		<select
			id="quizsel"
			bind:value={quizId}
			class="mt-1 w-full rounded-xl border-2 border-white/30 bg-indigo-950 px-4 py-3 font-bold text-white outline-none focus:border-amber-400"
		>
			{#each QUIZZES as q (q.id)}
				<option value={q.id}>{q.titulo} ({q.preguntas.length})</option>
			{/each}
		</select>
		{#if error}
			<p class="mt-3 rounded-xl bg-red-500/20 px-3 py-2 text-sm font-bold text-red-200">{error}</p>
		{/if}
		<button
			onclick={crear}
			disabled={creando}
			class="mt-5 w-full rounded-xl bg-amber-400 px-4 py-3 text-xl font-black text-indigo-950 transition hover:bg-amber-300 active:scale-95 disabled:opacity-60"
		>
			{creando ? 'CREANDO…' : 'CREAR SALA'}
		</button>
		<a href="/" class="mt-4 inline-block text-sm font-bold text-indigo-200 underline hover:text-white">← Volver</a>
	</div>
</div>
