// Avatares vía DiceBear (librería gratuita, sin instalación).
export const AVATAR_STYLES = [
	'adventurer',
	'adventurer-neutral',
	'big-ears',
	'bottts',
	'fun-emoji',
	'lorelei',
	'notionists',
	'personas'
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number];

export function avatarUrl(seed: string, style: AvatarStyle | string = 'adventurer'): string {
	return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

export function randomSeed(): string {
	return Math.random().toString(36).slice(2, 9);
}
