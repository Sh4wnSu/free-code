/**
 * Buddy command — manage your companion pet.
 * Implementation is lazy-loaded from buddy.ts to reduce startup time.
 */
import type { Command } from '../../commands.js'

const buddy = {
  type: 'local',
  name: 'buddy',
  description: 'Manage your companion pet (hatch, pet, rename, mute)',
  argumentHint: '[hatch|pet|mute|name <name>|info]',
  supportsNonInteractive: false,
  load: () => import('./buddy.js'),
} satisfies Command

export default buddy
