<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import confetti from 'canvas-confetti';
	import Tex from '$lib/Tex.svelte';
	import { getQuiz, preguntaActual, restanteActual, type Quiz } from '$lib/quizzes';
	import { supabase } from '$lib/supabase';
	import { puestos, puntosPorRespuesta, type Answer, type Player, type Room } from '$lib/sala';
	import { avatarUrl } from '$lib/avatar';

	const SHAPES = ['▲', '◆', '●', '■'];
	const pin = ($page.params as { pin: string }).pin.toUpperCase();

	let room: Room | null = $state(null);
	let quiz: Quiz | null = $state(null);
	let players: Player[] = $state([]);
	let answers: Answer[] = $state([]);
	let error = $state('');
	let procesando = $state(false);
	let ahora = $state(Date.now());
	let canales: Array<{ unsubscribe: () => void }> = [];
	let tick: ReturnType<typeof setInterval> | null = null;

	let pregunta = $derived(preguntaActual(room, quiz));
	let respondidos = $derived(
		new Set(
			answers.filter((a) => room && a.pregunta === room.indice).map((a) => a.player_id)
		).size
	);
	let ranking = $derived(puestos(players));
	let restante = $derived(restanteActual(room, pregunta, ahora));

	async function cargar() {
		const { data, error: e } = await supabase.from('rooms').select('*').eq('pin', pin).maybeSingle();
		if (e || !data) {
			error = 'Sala no encontrada.';
			return;
		}
		room = data as Room;
		quiz = getQuiz(room.quiz_id) ?? null;
		if (!quiz) {
			error = 'Cuestionario no encontrado en esta app.';
			return;
		}
		const { data: ps } = await supabase.from('players').select('*').eq('room_id', room.id);
		players = (ps ?? []) as Player[];
		const { data: asw } = await supabase.from('answers').select('*').eq('room_id', room.id);
		answers = (asw ?? []) as Answer[];
	}

	function suscribir() {
		if (!room) return;
		const c1 = supabase
			.channel(`room-${room.id}`)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, (p) => {
				if (p.eventType === 'INSERT') players = [...players, p.new as Player];
				if (p.eventType === 'UPDATE')
					players = players.map((x) => (x.id === (p.new as Player).id ? (p.new as Player) : x));
				if (p.eventType === 'DELETE') players = players.filter((x) => x.id !== (p.old as { id: string }).id);
			})
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answers', filter: `room_id=eq.${room!.id}` }, (p) => {
				answers = [...answers, p.new as Answer];
			})
			.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'answers', filter: `room_id=eq.${room!.id}` }, (p) => {
				answers = answers.map((x) => (x.id === (p.new as Answer).id ? (p.new as Answer) : x));
			})
			.subscribe();
		canales = [c1];
	}

	async function setEstado(patch: Partial<Room>) {
		if (!room) return;
		const { error: e } = await supabase.from('rooms').update(patch).eq('id', room.id);
		if (e) error = 'Error de red: ' + e.message;
		else room = { ...room, ...patch };
	}

	async function empezar() {
		await setEstado({ estado: 'pregunta', indice: 0, pregunta_inicio: new Date().toISOString() });
	}

	async function revelar() {
		if (!room || !quiz || !pregunta || procesando) return;
		procesando = true;
		try {
			const tiempoMs = pregunta.tiempo * 1000;
			const delQ = answers.filter((a) => a.pregunta === room!.indice);
			for (const a of delQ) {
				const pl = players.find((p) => p.id === a.player_id);
				if (!pl) continue;
				const ok = a.eleccion === pregunta.correcta;
				const rachaNueva = ok ? pl.racha + 1 : 0;
				const pts = ok ? puntosPorRespuesta(quiz.puntosBase, tiempoMs, a.ms, rachaNueva) : 0;
				await supabase
					.from('players')
					.update({
						puntos: pl.puntos + pts,
						racha: rachaNueva,
						aciertos: pl.aciertos + (ok ? 1 : 0)
					})
					.eq('id', pl.id);
				await supabase.from('answers').update({ puntos: pts }).eq('id', a.id);
			}
			const { data: ps } = await supabase.from('players').select('*').eq('room_id', room.id);
			players = (ps ?? []) as Player[];
			await setEstado({ estado: 'revelado' });
		} finally {
			procesando = false;
		}
	}

	async function siguiente() {
		if (!room || !quiz) return;
		if (room.indice + 1 >= quiz.preguntas.length) {
			await setEstado({ estado: 'podio' });
			confetti({ particleCount: 200, spread: 120 });
		} else {
			await setEstado({ estado: 'pregunta', indice: room.indice + 1, pregunta_inicio: new Date().toISOString() });
		}
	}

	async function cerrarSala() {
		if (!room) return;
		await supabase.from('rooms').delete().eq('id', room.id);
		goto('/');
	}

	onMount(async () => {
		await cargar();
		suscribir();
		tick = setInterval(() => (ahora = Date.now()), 200);
	});

	onDestroy(() => {
		canales.forEach((c) => c.unsubscribe());
		if (tick) clearInterval(tick);
	});
</script>

<svelte:head><title>Mathion — Host {pin}</title></svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-4 py-6">
	{#if error && !room}
		<p class="rounded-xl bg-red-500/20 px-4 py-3 font-bold text-red-200">{error}</p>
	{:else if room && quiz}
		<div class="flex w-full items-center justify-between">
			<span class="rounded-full bg-white/15 px-4 py-2 text-lg font-black tracking-[0.3em] text-amber-300">PIN {pin}</span>
			<span class="text-sm font-bold text-indigo-200">{players.length} jugadores</span>
			<button onclick={cerrarSala} class="rounded-lg bg-white/10 px-3 py-1 text-sm font-bold text-red-200 hover:bg-white/20">Cerrar sala</button>
		</div>

		{#if room.estado === 'lobby'}
			<div class="animate-pop mt-6 w-full rounded-2xl bg-white/10 p-8 text-center ring-1 ring-white/20 backdrop-blur">
				<h2 class="text-2xl font-black text-white">{quiz.titulo}</h2>
				<p class="mt-2 text-indigo-200">Entren en <b>/unirse</b> con el PIN <b class="text-amber-300">{pin}</b></p>
				<div class="mt-5 flex flex-wrap justify-center gap-3">
					{#each players as p (p.id)}
						<div class="animate-rise flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20">
							<img src={avatarUrl(p.nombre + p.avatar_seed, p.avatar_estilo)} alt="" class="h-8 w-8 rounded-full bg-white/20" />
							<span class="font-bold text-white">{p.nombre}</span>
						</div>
					{/each}
					{#if players.length === 0}
						<p class="text-indigo-300">Esperando jugadores…</p>
					{/if}
				</div>
				<button
					onclick={empezar}
					disabled={players.length === 0}
					class="mt-6 rounded-xl bg-amber-400 px-10 py-3 text-xl font-black text-indigo-950 transition hover:bg-amber-300 active:scale-95 disabled:opacity-50"
				>
					¡EMPEZAR!
				</button>
			</div>
		{:else if room.estado === 'podio'}
			<div class="animate-pop mt-6 w-full max-w-lg rounded-2xl bg-white/10 p-8 text-center ring-1 ring-white/20 backdrop-blur">
				<h2 class="text-3xl font-black text-amber-300">🏆 PODIO 🏆</h2>
				{#each ranking.slice(0, 3) as p, i}
					<div class="mt-3 flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/20">
						<span class="text-2xl font-black text-white">{['🥇', '🥈', '🥉'][i]}</span>
						<img src={avatarUrl(p.nombre + p.avatar_seed, p.avatar_estilo)} alt="" class="h-10 w-10 rounded-full bg-white/20" />
						<span class="flex-1 text-left font-bold text-white">{p.nombre}</span>
						<span class="font-black text-amber-300">{p.puntos}</span>
					</div>
				{/each}
				<button onclick={() => goto('/')} class="mt-6 rounded-xl bg-white/15 px-8 py-2 font-black text-white hover:bg-white/25">INICIO</button>
			</div>
		{:else if pregunta}
			<div class="mt-4 w-full rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur">
				<div class="flex items-center justify-between text-sm font-bold text-white">
					<span>Pregunta {room.indice + 1}/{quiz.preguntas.length}</span>
					<span>{respondidos}/{players.length} respondieron</span>
					<span class={restante <= 5 && room.estado === 'pregunta' ? 'text-red-300' : 'text-indigo-200'}>
						{room.estado === 'pregunta' ? `${Math.ceil(restante)}s` : 'cerrada'}
					</span>
				</div>
				<div class="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
					<div class="h-full bg-emerald-400" style="width: {(restante / pregunta.tiempo) * 100}%"></div>
				</div>
			</div>

			<div class="mt-4 w-full rounded-2xl bg-white p-6 text-center shadow-xl">
				<p class="text-xl font-bold text-indigo-950 sm:text-2xl"><Tex text={pregunta.enunciado} /></p>
				<div class="mt-4 grid gap-2 sm:grid-cols-2">
					{#each pregunta.alternativas as alt, i}
						<div class="flex items-center gap-2 rounded-xl px-3 py-2 text-left font-bold text-white {i === pregunta.correcta && room.estado === 'revelado' ? 'bg-emerald-500' : 'bg-slate-500'}">
							<span>{SHAPES[i]}</span><span><Tex text={alt} /></span>
						</div>
					{/each}
				</div>
				{#if room.estado === 'revelado'}
					<p class="mt-3 text-indigo-900"><Tex text={pregunta.explicacion} /></p>
				{/if}
			</div>

			<div class="mt-4 grid w-full gap-4 lg:grid-cols-2">
				<div class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur">
					<h3 class="font-black text-amber-300">PUESTOS EN VIVO</h3>
					{#each ranking as p, i}
						<div class="mt-1 flex items-center gap-2 text-white">
							<span class="w-8 font-black">{i + 1}.º</span>
							<img src={avatarUrl(p.nombre + p.avatar_seed, p.avatar_estilo)} alt="" class="h-7 w-7 rounded-full bg-white/20" />
							<span class="flex-1 truncate font-bold">{p.nombre}</span>
							<span class="font-black text-amber-300">{p.puntos}</span>
						</div>
					{/each}
				</div>
				<div class="flex flex-col justify-center gap-3">
					{#if room.estado === 'pregunta'}
						<button
							onclick={revelar}
							disabled={procesando}
							class="rounded-xl bg-emerald-400 px-6 py-3 text-xl font-black text-indigo-950 transition hover:bg-emerald-300 active:scale-95 disabled:opacity-60"
						>
							{procesando ? 'CALCULANDO…' : 'REVELAR ✓'}
						</button>
					{:else}
						<button
							onclick={siguiente}
							class="rounded-xl bg-amber-400 px-6 py-3 text-xl font-black text-indigo-950 transition hover:bg-amber-300 active:scale-95"
						>
							{room.indice + 1 >= quiz.preguntas.length ? 'VER PODIO 🏆' : 'SIGUIENTE →'}
						</button>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>
