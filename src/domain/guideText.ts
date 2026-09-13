import overrides from '@/data/exercise-step-overrides.json';

/** Normalize imported prose without changing exercise names or source records. */
export function cleanGuideText(text: string): string {
  return text
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/([.!?:])(?=[A-Z])/g, '$1 ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/\bteh\b/gi, 'the')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Keep complete first sentences; full technique notes remain available. */
export function conciseGuideSteps(instructions: string[], sourceId?: string): string[] {
  const edited = sourceId ? (overrides as Record<string, string[]>)[sourceId] : undefined;
  return instructions.map(cleanGuideText).filter(Boolean).map((text, index) => {
    if (edited?.[index]) return edited[index];
    const sentence = text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;
    return sentence
      .replace(/^Now,?\s+/i, '')
      .replace(/^Slowly begin to /i, 'Slowly ')
      .replace(/\bfor the recommended amount of repetitions\b/gi, 'for your target reps')
      .replace(/\bfor the recommended number of repetitions\b/gi, 'for your target reps')
      .replace(/^./, char => char.toUpperCase());
  });
}
