<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import confetti from 'canvas-confetti';
	import Tex from '$lib/Tex.svelte';
	import { getQuiz } from '$lib/quizzes';
	import { AVATAR_STYLES, avatarUrl, randomSeed, type AvatarStyle } from '$lib/avatar';

	const SHAPES = ['▲', '◆', '●', '■'];
	const COLORS = [
		'bg-red-500 hover:bg-red-400',
		'bg-blue-500 hover:bg-blue-400',
		'bg-amber-500 hover:bg-amber-400',
		'bg-emerald-500 hover:bg-emerald-400'
	];

	const quiz = getQuiz($page.url.searchParams.get('quiz') ?? '');
	if (!quiz) goto('/');

	let fase: 'lobby' | 'pregunta' | 'podio' = $state('lobby');
	let nombre = $state('');
	let estilo: AvatarStyle = $state('adventurer');
	let semilla = $state(randomSeed());
	let indice = $state(0);
	let elegida: number | null = $state(null);
	let puntos = $state(0);
	let racha = $state(0);
	let aciertos = $state(0);
	let restante = $state(0);
	let intervalo: ReturnType<typeof setInterval> | null = null;
	let ganado = $state(0);
	let sonido = $state(true);

	let pregunta = $derived(quiz!.preguntas[indice]);
	let total = $derived(quiz!.preguntas.length);
	let avatar = $derived(avatarUrl(nombre || semilla, estilo));

	function beep(ok: boolean) {
		if (!sonido) return;
		try {
			const ctx = new AudioContext();
			const o = ctx.createOscillator();
			const g = ctx.createGain();
			o.connect(g);
			g.connect(ctx.destination);
			o.frequency.value = ok ? 660 : 220;
			o.type = ok ? 'sine' : 'sawtooth';
			g.gain.setValueAtTime(0.15, ctx.currentTime);
			o.start();
			o.stop(ctx.currentTime + 0.25);
		} catch {
			/* sin audio */
		}
	}

	function empezar() {
		if (!nombre.trim()) nombre = 'Jugador';
		indice = 0;
		puntos = 0;
		racha = 0;
		aciertos = 0;
		lanzarPregunta();
	}

	function lanzarPregunta() {
		elegida = null;
		ganado = 0;
		fase = 'pregunta';
		restante = pregunta.tiempo;
		if (intervalo) clearInterval(intervalo);
		intervalo = setInterval(() => {
			restante -= 0.1;
			if (restante <= 0) {
				restante = 0;
				responder(null);
			}
		}, 100);
	}

	function responder(i: number | null) {
		if (elegida !== null || fase !== 'pregunta') return;
		if (intervalo) clearInterval(intervalo);
		elegida = i;
		const ok = i === pregunta.correcta;
		if (ok) {
			aciertos++;
			racha++;
			ganado = Math.round(quiz!.puntosBase * (0.5 + 0.5 * (restante / pregunta.tiempo))) + (racha >= 3 ? 200 : 0);
			puntos += ganado;
			beep(true);
			confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
		} else {
			racha = 0;
			beep(false);
		}
	}

	function siguiente() {
		if (indice + 1 >= total) {
			fase = 'podio';
			const estrellas = aciertos === total ? 3 : aciertos >= total * 0.6 ? 2 : 1;
			confetti({ particleCount: 120 + estrellas * 60, spread: 100 });
			setTimeout(
				() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0 } }),
				300
			);
			setTimeout(
				() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1 } }),
				500
			);
		} else {
			indice++;
			lanzarPregunta();
		}
	}

	onDestroy(() => {
		if (intervalo) clearInterval(intervalo);
	});
</script>

<svelte:head>
	<title>Mathion — Jugar</title>
</svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center px-4 py-8">
	{#if fase === 'lobby'}
		<div class="animate-pop w-full max-w-md rounded-2xl bg-white/10 p-8 text-center ring-1 ring-white/20 backdrop-blur">
			<img src={avatar} alt="avatar" class="mx-auto h-28 w-28 rounded-full bg-white/20 p-1 ring-4 ring-amber-400" />
			<h2 class="mt-4 text-2xl font-black text-white">{quiz!.titulo}</h2>
			<p class="text-sm text-indigo-200">{total} preguntas · {quiz!.puntosBase} pts c/u</p>
			<input
				bind:value={nombre}
				placeholder="Tu nombre"
				maxlength="16"
				class="mt-5 w-full rounded-xl border-2 border-white/30 bg-white/10 px-4 py-3 text-center text-lg font-bold text-white placeholder-indigo-300 outline-none focus:border-amber-400"
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
			<button
				onclick={() => ((semilla = randomSeed()), (estilo = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)]))}
				class="mt-3 text-sm font-bold text-indigo-200 underline hover:text-white"
			>
				🎲 Avatar aleatorio
			</button>
			<button
				onclick={empezar}
				class="mt-4 w-full rounded-xl bg-amber-400 px-4 py-3 text-xl font-black text-indigo-950 shadow-lg transition hover:bg-amber-300 active:scale-95"
			>
				¡EMPEZAR!
			</button>
			<label class="mt-4 flex items-center justify-center gap-2 text-sm text-indigo-200">
				<input type="checkbox" bind:checked={sonido} class="h-4 w-4 accent-amber-400" /> Sonido
			</label>
		</div>
	{:else if fase === 'pregunta'}
		<div class="w-full rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur">
			<div class="flex items-center justify-between gap-3">
				<span class="rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white">
					{indice + 1}/{total}
				</span>
				<img src={avatar} alt="avatar" class="h-10 w-10 rounded-full bg-white/20 ring-2 ring-amber-400" />
				<span class="rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-amber-300">
					{puntos} pts {#if racha >= 2}· 🔥{racha}{/if}
				</span>
			</div>
			<div class="mt-3 h-3 overflow-hidden rounded-full bg-white/15">
				<div
					class="h-full rounded-full transition-[width] duration-100 {restante <= 5 ? 'bg-red-500' : 'bg-emerald-400'}"
					style="width: {(restante / pregunta.tiempo) * 100}%"
				></div>
			</div>
			<div class="mt-2 text-right text-sm font-bold {restante <= 5 ? 'animate-pulse text-red-300' : 'text-indigo-200'}">
				{Math.ceil(restante)}s
			</div>
		</div>

		{#key indice}
			<div class="animate-pop mt-4 w-full rounded-2xl bg-white p-6 text-center shadow-xl">
				<p class="text-xl font-bold text-indigo-950 sm:text-2xl"><Tex text={pregunta.enunciado} /></p>
			</div>
		{/key}

		<div class="mt-4 grid w-full gap-3 sm:grid-cols-2">
			{#each pregunta.alternativas as alt, i}
				<button
					disabled={elegida !== null}
					onclick={() => responder(i)}
					class="animate-rise flex items-center gap-3 rounded-xl px-4 py-4 text-left text-lg font-bold text-white shadow-lg transition active:scale-95 disabled:cursor-default {elegida === null
						? COLORS[i]
						: i === pregunta.correcta
							? 'bg-emerald-500 ring-4 ring-emerald-200'
							: elegida === i
								? 'animate-shake bg-red-600'
								: 'bg-slate-500 opacity-60'}"
				>
					<span class="text-2xl">{SHAPES[i]}</span>
					<span><Tex text={alt} /></span>
				</button>
			{/each}
		</div>

		{#if elegida !== null}
			<div class="animate-pop mt-4 w-full rounded-2xl bg-indigo-950/80 p-5 text-center ring-1 ring-white/20 backdrop-blur">
				{#if elegida === pregunta.correcta}
					<p class="text-2xl font-black text-emerald-300">¡Correcto! +{ganado} pts</p>
				{:else if elegida === null}
					<p class="text-2xl font-black text-red-300">¡Tiempo agotado!</p>
				{:else}
					<p class="text-2xl font-black text-red-300">Casi… era la {SHAPES[pregunta.correcta]}</p>
				{/if}
				<p class="mt-2 text-indigo-100"><Tex text={pregunta.explicacion} /></p>
				<button
					onclick={siguiente}
					class="mt-4 rounded-xl bg-amber-400 px-8 py-2 text-lg font-black text-indigo-950 transition hover:bg-amber-300 active:scale-95"
				>
					{indice + 1 >= total ? 'VER PODIO 🏆' : 'SIGUIENTE →'}
				</button>
			</div>
		{/if}
	{:else}
		<div class="animate-pop w-full max-w-md rounded-2xl bg-white/10 p-8 text-center ring-1 ring-white/20 backdrop-blur">
			<h2 class="text-3xl font-black text-amber-300">🏆 PODIO 🏆</h2>
			<img src={avatar} alt="avatar" class="animate-float mx-auto mt-4 h-28 w-28 rounded-full bg-white/20 p-1 ring-4 ring-amber-400" />
			<p class="mt-2 text-2xl font-black text-white">{nombre}</p>
			<p class="mt-1 text-5xl font-black text-white">{puntos} <span class="text-xl">pts</span></p>
			<p class="mt-2 text-lg text-indigo-100">
				{'⭐'.repeat(aciertos === total ? 3 : aciertos >= total * 0.6 ? 2 : 1)}
			</p>
			<p class="mt-1 text-indigo-200">{aciertos}/{total} correctas</p>
			<div class="mt-6 flex gap-3">
				<button
					onclick={() => goto('/')}
					class="flex-1 rounded-xl bg-white/15 px-4 py-3 font-black text-white transition hover:bg-white/25 active:scale-95"
				>
					INICIO
				</button>
				<button
					onclick={empezar}
					class="flex-1 rounded-xl bg-amber-400 px-4 py-3 font-black text-indigo-950 transition hover:bg-amber-300 active:scale-95"
				>
					↻ OTRA VEZ
				</button>
			</div>
		</div>
	{/if}
</div>
