export interface Pregunta {
	id: number;
	enunciado: string;
	alternativas: string[];
	correcta: number;
	explicacion: string;
	tiempo: number;
	/** Opcional: ruta en static/ (p. ej. "/esi/condon.png") o URL externa. */
	imagen?: string;
}

export interface Quiz {
	id: string;
	titulo: string;
	descripcion: string;
	grado: string;
	tiempoDefault: number;
	puntosBase: number;
	preguntas: Pregunta[];
}
