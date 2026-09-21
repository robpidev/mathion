import type { Quiz } from './quiz';
import esi from './data/esi-anticonceptivos.json';

export const QUIZZES: Quiz[] = [esi as Quiz];

export function getQuiz(id: string): Quiz | undefined {
	return QUIZZES.find((q) => q.id === id);
}
