export interface Room {
	id: string;
	pin: string;
	quiz_id: string;
	estado: 'lobby' | 'pregunta' | 'revelado' | 'podio';
	indice: number;
	pregunta_inicio: string | null;
}

export interface Player {
	id: string;
	room_id: string;
	nombre: string;
	avatar_estilo: string;
	avatar_seed: string;
	puntos: number;
	racha: number;
	aciertos: number;
}

export interface Answer {
	id: string;
	room_id: string;
	pregunta: number;
	player_id: string;
	eleccion: number;
	ms: number;
	puntos: number;
}

const PIN_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function makePin(): string {
	let pin = '';
	for (let i = 0; i < 4; i++) {
		pin += PIN_CHARS[Math.floor(Math.random() * PIN_CHARS.length)];
	}
	return pin;
}

/** Puntos por respuesta correcta (misma fórmula que el modo local). */
export function puntosPorRespuesta(
	base: number,
	tiempoMs: number,
	ms: number,
	rachaNueva: number
): number {
	const frac = Math.min(1, Math.max(0, (tiempoMs - ms) / tiempoMs));
	return Math.round(base * (0.5 + 0.5 * frac)) + (rachaNueva >= 3 ? 200 : 0);
}

export function puestos(players: Player[]): Player[] {
	return [...players].sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre));
}
