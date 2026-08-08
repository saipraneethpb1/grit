/**
 * External educational / commercial resources users can study.
 * We do NOT copy book text, images, or proprietary website programs into Grit.
 * Links are recommendations only — content remains on the rights-holder’s site/publisher.
 */

export type ResourceKind = 'book' | 'website' | 'open_data' | 'methodology';

export interface ExternalResource {
  id: string;
  kind: ResourceKind;
  title: string;
  author?: string;
  url?: string;
  /** Why it matters for Grit users */
  why: string;
  /** How Grit uses it legally */
  gritPolicy: string;
}

export const EXTERNAL_RESOURCES: ExternalResource[] = [
  {
    id: 'free_exercise_db',
    kind: 'open_data',
    title: 'free-exercise-db',
    author: 'Community (yuhonas et al.)',
    url: 'https://github.com/yuhonas/free-exercise-db',
    why: 'Public-domain exercise names, muscles, equipment, and instructions we curate into the Grit library.',
    gritPolicy: 'Directly curated into the app under Unlicense (public domain).',
  },
  {
    id: 'wger',
    kind: 'open_data',
    title: 'wger workout manager',
    author: 'wger project',
    url: 'https://wger.de',
    why: 'FLOSS fitness platform with a community exercise API under open licenses.',
    gritPolicy: 'Optional future source with CC-BY-SA attribution; not required for MVP.',
  },
  {
    id: 'delavier_sta',
    kind: 'book',
    title: 'Strength Training Anatomy',
    author: 'Frédéric Delavier',
    url: 'https://www.human-kinetics.com/products/strength-training-anatomy-4th-edition',
    why:
      'Gold-standard visual reference for how common lifts load prime movers and stabilizers. Excellent for learning which muscles a movement targets.',
    gritPolicy:
      'Not copied. We only apply general anatomy education principles (prime mover → compounds first, isolation for target muscle). Buy/read the book for illustrations and full text.',
  },
  {
    id: 'myprotein_guides',
    kind: 'website',
    title: 'MyProtein training guides & blog',
    author: 'MyProtein',
    url: 'https://www.myprotein.com/thezone/training/',
    why:
      'Free public articles on splits, hypertrophy templates, and gym workouts that many beginners already follow.',
    gritPolicy:
      'Not scraped or reproduced. Grit’s “Practical Gym Hypertrophy” system mirrors common public blog structures (compound → accessory) while selecting open-catalog exercises only.',
  },
  {
    id: 'exrx',
    kind: 'website',
    title: 'ExRx exercise directory (reference)',
    url: 'https://exrx.net/Lists/Directory',
    why: 'Long-standing public directory of exercise classifications by muscle and movement.',
    gritPolicy:
      'Used as a conceptual reference for movement patterns only — we do not mirror their pages into the app.',
  },
];
