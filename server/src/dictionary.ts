import frenchWords from 'an-array-of-french-words'

function normalize(word: string): string {
  return word
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/Œ/g, 'OE')
    .replace(/Æ/g, 'AE')
}

let dict: Set<string> | null = null

export function loadDictionary(): Set<string> {
  if (dict) return dict
  const words = frenchWords as string[]
  dict = new Set<string>()
  for (const w of words) {
    const norm = normalize(w)
    if (norm.length >= 3 && /^[A-Z]+$/.test(norm)) {
      dict.add(norm)
    }
  }
  console.log(`[dict] Loaded ${dict.size} French words`)
  return dict
}

export function isValidWord(word: string): boolean {
  if (!dict) loadDictionary()
  return dict!.has(normalize(word))
}

export { normalize }
