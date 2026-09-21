<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import confetti from 'canvas-confetti';
	import Tex from '$lib/Tex.svelte';
	import { getQuiz, preguntaActual, restanteActual, type Quiz } from '$lib/quizzes';
	import { supabase } from '$lib/supabase';
	import { puestos, type Answer, type Player, type Room } from '$lib/sala';
	import { avatarUrl } from '$lib/avatar';

	const SHAPES = ['▲', '◆', '●', '■'];
	const COLORS = ['bg-red-500', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500'];
	const pin = ($page.params as { pin: string }).pin.toUpperCase();

	let room: Room | null = $state(null);
	let quiz: Quiz | null = $state(null);
	let yo: Player | null = $state(null);
	let players: Player[] = $state([]);
	let miRespuesta: Answer | null = $state(null);
	let error = $state('');
	let ahora = $state(Date.now());
	let canales: Array<{ unsubscribe: () => void }> = [];
	let tick: ReturnType<typeof setInterval> | null = null;

	let pregunta = $derived(preguntaActual(room, quiz));
	let restante = $derived(restanteActual(room, pregunta, ahora));
	let ranking = $derived(puestos(players));
	let miPuesto = $derived(yo ? ranking.findIndex((p) => p.id === yo!.id) + 1 : 0);

	async function cargar() {
		const { data: r, error: e } = await supabase.from('rooms').select('*').eq('pin', pin).maybeSingle();
		if (e || !r) {
			error = 'Sala no encontrada.';
			return;
		}
		room = r as Room;
		quiz = getQuiz(room.quiz_id) ?? null;
		const pid = localStorage.getItem(`mathion:${pin}`);
		if (!pid) {
			error = room.estado === 'lobby' ? 'Entra primero desde /unirse.' : 'La partida ya empezó.';
			return;
		}
		const { data: p } = await supabase.from('players').select('*').eq('id', pid).maybeSingle();
		if (!p) {
			error = 'Jugador no encontrado. Vuelve a entrar desde /unirse.';
			return;
		}
		yo = p as Player;
		const { data: ps } = await supabase.from('players').select('*').eq('room_id', room.id);
		players = (ps ?? []) as Player[];
		await cargarMiRespuesta();
	}

	async function cargarMiRespuesta() {
		if (!room || !yo) return;
		if (room.estado === 'pregunta' || room.estado === 'revelado') {
			const { data } = await supabase
				.from('answers')
				.select('*')
				.eq('room_id', room.id)
				.eq('pregunta', room.indice)
				.eq('player_id', yo.id)
				.maybeSingle();
			miRespuesta = (data ?? null) as Answer | null;
		} else {
			miRespuesta = null;
		}
	}

	function suscribir() {
		if (!room) return;
		const c = supabase
			.channel(`play-${room.id}`)
			.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, (p) => {
				const antes = room!.estado;
				room = p.new as Room;
				if (room.estado !== antes) {
					miRespuesta = null;
					cargarMiRespuesta();
					if (room.estado === 'podio') confetti({ particleCount: 150, spread: 100 });
				}
			})
			.on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room!.id}` }, (p) => {
				if (p.eventType === 'INSERT') players = [...players, p.new as Player];
				if (p.eventType === 'UPDATE') {
					players = players.map((x) => (x.id === (p.new as Player).id ? (p.new as Player) : x));
					if (yo && (p.new as Player).id === yo.id) yo = p.new as Player;
				}
			})
			.subscribe();
		canales = [c];
	}

	async function responder(i: number) {
		if (!room || !yo || !pregunta || miRespuesta || room.estado !== 'pregunta' || restante <= 0) return;
		const ms = Math.round(Date.now() - new Date(room.pregunta_inicio!).getTime());
		const { data, error: e } = await supabase
			.from('answers')
			.upsert(
				{ room_id: room.id, pregunta: room.indice, player_id: yo.id, eleccion: i, ms },
				{ onConflict: 'room_id,pregunta,player_id', ignoreDuplicates: true }
			)
			.select()
			.maybeSingle();
		if (!e && data) miRespuesta = data as Answer;
		else await cargarMiRespuesta();
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

<svelte:head><title>Mathion — Sala {pin}</title></svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center px-4 py-6">
	{#if error}
		<div class="rounded-2xl bg-white/10 p-8 text-center ring-1 ring-white/20">
			<p class="font-bold text-red-200">{error}</p>
			<button onclick={() => goto('/unirse')} class="mt-4 rounded-xl bg-amber-400 px-6 py-2 font-black text-indigo-950">IR A UNIRSE</button>
		</div>
	{:else if room && quiz && yo}
		<div class="flex w-full items-center justify-between">
			<span class="rounded-full bg-white/15 px-3 py-1 text-sm font-black tracking-[0.3em] text-amber-300">{pin}</span>
			<div class="flex items-center gap-2">
				<img src={avatarUrl(yo.nombre + yo.avatar_seed, yo.avatar_estilo)} alt="" class="h-9 w-9 rounded-full bg-white/20 ring-2 ring-amber-400" />
				<span class="font-bold text-white">{yo.nombre}</span>
			</div>
			<span class="rounded-full bg-white/15 px-3 py-1 text-sm font-black text-amber-300">
				{yo.puntos} pts{#if miPuesto > 0} · {miPuesto}.º{/if}
			</span>
		</div>

		{#if room.estado === 'lobby'}
			<div class="animate-pop mt-8 rounded-2xl bg-white/10 p-8 text-center ring-1 ring-white/20">
				<p class="text-xl font-bold text-white">¡Dentro! Espera a que el host inicie…</p>
				<p class="mt-2 text-indigo-200">{players.length} en sala</p>
			</div>
		{:else if room.estado === 'podio'}
			<div class="animate-pop mt-6 w-full rounded-2xl bg-white/10 p-6 text-center ring-1 ring-white/20">
				<h2 class="text-3xl font-black text-amber-300">🏆 FINAL 🏆</h2>
				{#each ranking.slice(0, 5) as p, i}
					<div class="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 {p.id === yo.id ? 'bg-amber-400/20 ring-2 ring-amber-400' : 'bg-white/10'}">
						<span class="w-8 font-black text-white">{i + 1}.º</span>
						<img src={avatarUrl(p.nombre + p.avatar_seed, p.avatar_estilo)} alt="" class="h-8 w-8 rounded-full bg-white/20" />
						<span class="flex-1 text-left font-bold text-white">{p.nombre}</span>
						<span class="font-black text-amber-300">{p.puntos}</span>
					</div>
				{/each}
				<button onclick={() => goto('/')} class="mt-5 rounded-xl bg-white/15 px-8 py-2 font-black text-white">INICIO</button>
			</div>
		{:else if pregunta}
			<div class="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/15">
				<div class="h-full rounded-full {restante <= 5 ? 'bg-red-500' : 'bg-emerald-400'}" style="width: {(restante / pregunta.tiempo) * 100}%"></div>
			</div>
			<div class="mt-1 w-full text-right font-bold {restante <= 5 ? 'animate-pulse text-red-300' : 'text-indigo-200'}">{Math.ceil(restante)}s</div>

			<div class="animate-pop mt-2 w-full rounded-2xl bg-white p-6 text-center shadow-xl">
				<p class="text-xl font-bold text-indigo-950"><Tex text={pregunta.enunciado} /></p>
			</div>

			{#if room.estado === 'pregunta'}
				{#if miRespuesta}
					<p class="animate-pop mt-4 rounded-2xl bg-white/10 px-6 py-4 text-center text-lg font-bold text-emerald-300 ring-1 ring-white/20">
						¡Respuesta enviada! Espera la revelación…
					</p>
				{:else}
					<div class="mt-4 grid w-full gap-3">
						{#each pregunta.alternativas as alt, i}
							<button
								onclick={() => responder(i)}
								disabled={restante <= 0}
								class="flex items-center gap-3 rounded-xl px-4 py-4 text-left text-lg font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-60 {COLORS[i]}"
							>
								<span class="text-2xl">{SHAPES[i]}</span><span><Tex text={alt} /></span>
							</button>
						{/each}
					</div>
				{/if}
			{:else}
				<div class="animate-pop mt-4 w-full rounded-2xl bg-indigo-950/80 p-5 text-center ring-1 ring-white/20">
					{#if miRespuesta && miRespuesta.eleccion === pregunta.correcta}
						<p class="text-2xl font-black text-emerald-300">¡Correcto! +{miRespuesta.puntos} pts</p>
					{:else if miRespuesta}
						<p class="text-2xl font-black text-red-300">Era la {SHAPES[pregunta.correcta]}</p>
					{:else}
						<p class="text-2xl font-black text-red-300">No respondiste a tiempo</p>
					{/if}
					<p class="mt-2 text-indigo-100"><Tex text={pregunta.explicacion} /></p>
				</div>
			{/if}
		{/if}
	{/if}
</div>
