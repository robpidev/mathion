export interface Pregunta {
	id: number;
	enunciado: string;
	alternativas: string[];
	correcta: number;
	explicacion: string;
	tiempo: number;
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
