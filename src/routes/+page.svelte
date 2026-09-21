<script lang="ts">
	import { QUIZZES } from '$lib/quizzes';
	import { AVATAR_STYLES, avatarUrl } from '$lib/avatar';
</script>

<svelte:head>
	<title>Mathion — Torneos de matemática y ESI</title>
</svelte:head>

<div class="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-4 py-10">
	<header class="animate-pop text-center">
		<div class="mb-2 inline-block rounded-full bg-white/10 px-4 py-1 text-sm font-semibold tracking-widest text-amber-300 uppercase">
			I.E. José Olaya Balandra
		</div>
		<h1 class="text-5xl font-black tracking-tight text-white drop-shadow-lg sm:text-6xl">
			MATH<span class="text-amber-400">ION</span>
		</h1>
		<p class="mt-3 max-w-xl text-lg text-indigo-100">
			Torneos interactivos estilo Kahoot con soporte LaTeX (KaTeX) para tus clases.
		</p>
	</header>

	<section class="mt-8 flex w-full flex-col gap-3 sm:flex-row">
		<a
			href="/sala"
			class="flex-1 rounded-2xl bg-emerald-400 px-4 py-4 text-center text-xl font-black text-indigo-950 shadow-xl transition hover:bg-emerald-300 active:scale-95"
		>
			🏠 CREAR SALA (proyector)
		</a>
		<a
			href="/unirse"
			class="flex-1 rounded-2xl bg-sky-400 px-4 py-4 text-center text-xl font-black text-indigo-950 shadow-xl transition hover:bg-sky-300 active:scale-95"
		>
			📱 UNIRSE CON PIN
		</a>
	</section>

	<section class="mt-8 grid w-full gap-5 sm:grid-cols-2">
		{#each QUIZZES as quiz (quiz.id)}
			<article class="animate-rise rounded-2xl bg-white/10 p-6 shadow-xl ring-1 ring-white/20 backdrop-blur transition hover:scale-[1.02] hover:bg-white/15">
				<div class="text-xs font-bold tracking-widest text-emerald-300 uppercase">{quiz.grado}</div>
				<h2 class="mt-1 text-2xl font-extrabold text-white">{quiz.titulo}</h2>
				<p class="mt-2 text-sm text-indigo-100">{quiz.descripcion}</p>
				<div class="mt-3 flex items-center gap-2 text-sm text-indigo-200">
					<span class="rounded-full bg-white/10 px-3 py-1">{quiz.preguntas.length} preguntas</span>
					<span class="rounded-full bg-white/10 px-3 py-1">{quiz.puntosBase} pts c/u</span>
				</div>
				<a
					href={`/jugar?quiz=${quiz.id}`}
					class="mt-5 inline-block w-full rounded-xl bg-amber-400 px-4 py-3 text-center text-lg font-black text-indigo-950 shadow-lg transition hover:bg-amber-300 active:scale-95"
				>
					▶ JUGAR
				</a>
			</article>
		{/each}
	</section>

	<section class="mt-10 w-full rounded-2xl bg-white/10 p-6 ring-1 ring-white/20 backdrop-blur">
		<h3 class="text-lg font-extrabold text-white">Elige tu avatar (DiceBear)</h3>
		<p class="text-sm text-indigo-200">Lo usarás en la sala de juego y en el podio.</p>
		<div class="mt-4 flex flex-wrap justify-center gap-3">
			{#each AVATAR_STYLES as style}
				<img
					src={avatarUrl('mathion-demo', style)}
					alt={style}
					title={style}
					class="animate-float h-16 w-16 rounded-full bg-white/20 p-1 ring-2 ring-white/30"
					loading="lazy"
				/>
			{/each}
		</div>
	</section>

	<footer class="mt-10 text-center text-xs text-indigo-300">
		Mathion · SvelteKit + Tailwind + KaTeX · Preguntas como archivos JSON en <code>src/lib/data/</code>
	</footer>
</div>
