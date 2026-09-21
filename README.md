# Mathion

Torneos interactivos estilo Kahoot para el aula, con soporte LaTeX (KaTeX).
SvelteKit + Tailwind + Bun. Despliegue en Vercel.

## Requisitos

- [Bun](https://bun.sh) 1.x

## Desarrollo

```bash
bun install
bun run dev        # servidor local
bun run build      # build de producción
bun run preview    # previsualizar el build
bun run check      # typecheck
```

## Despliegue en Vercel

1. Sube este repo a GitHub (`git remote add origin … && git push -u origin main`).
2. En Vercel: **Add New → Project → Import** el repo.
   Vercel detecta SvelteKit y `bun.lock` automáticamente (usa Bun).
3. Deploy. Cada `push` a `main` redespliega.

## Agregar preguntas (JSON en la app)

1. Crea `src/lib/data/<tema>.json` con esta forma:

```json
{
  "id": "<tema>",
  "titulo": "Título del torneo",
  "descripcion": "…",
  "grado": "3.° C",
  "tiempoDefault": 20,
  "puntosBase": 1000,
  "preguntas": [
    {
      "id": 1,
      "enunciado": "¿Cuánto es $\\frac{8 \\cdot 3}{2}$?",
      "alternativas": ["$10$", "$12$", "$14$", "$24$"],
      "correcta": 1,
      "explicacion": "$\\frac{24}{2} = 12$.",
      "tiempo": 20
    }
  ]
}
```

2. Regístralo en `src/lib/quizzes.ts`:
   `import mitema from './data/<tema>.json';` y agrégalo a `QUIZZES`.
3. El enunciado, las alternativas y la explicación aceptan LaTeX
   entre `$...$` (se renderiza con KaTeX vía `src/lib/Tex.svelte`).

Bancos incluidos: `esi-anticonceptivos` (25 preguntas, tutoría ESI 3.° C).

## Notas

- Avatares: [DiceBear](https://www.dicebear.com) vía URL (`src/lib/avatar.ts`), sin instalación.
- Animaciones: transiciones de Svelte + keyframes propios + `canvas-confetti` en aciertos y podio.
- Sonido: pitidos WebAudio generados en el cliente (conmutable).
