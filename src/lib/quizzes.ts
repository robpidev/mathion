import type { Quiz } from './quiz';

export function preguntaActual(
	room: { indice: number } | null,
	quiz: { preguntas: Quiz['preguntas'] } | null
): Quiz['preguntas'][number] | null {
	return room && quiz ? quiz.preguntas[room.indice] : null;
}

export function restanteActual(
	room: { estado: string; pregunta_inicio: string | null } | null,
	pregunta: { tiempo: number } | null,
	ahora: number
): number {
	if (room?.estado === 'pregunta' && room.pregunta_inicio && pregunta) {
		return Math.max(0, pregunta.tiempo - (ahora - new Date(room.pregunta_inicio).getTime()) / 1000);
	}
	return 0;
}
import esi from './data/esi-anticonceptivos.json';

export type { Quiz };

export const QUIZZES: Quiz[] = [esi as Quiz];

export function getQuiz(id: string): Quiz | undefined {
	return QUIZZES.find((q) => q.id === id);
}
