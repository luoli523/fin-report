interface Narration { date: string; url: string; duration: number; voice: string }
const files = import.meta.glob<Narration>('../data/narration/*.json', { eager: true, import: 'default' });
export const findNarration = (date: string) => Object.values(files).find(n => n.date === date);
