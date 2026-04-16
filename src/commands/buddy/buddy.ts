import type { LocalCommandCall } from '../../types/command.js'
import { saveGlobalConfig, getGlobalConfig } from '../../utils/config.js'
import {
  getCompanion,
  companionUserId,
  roll,
} from '../../buddy/companion.js'
import {
  type StoredCompanion,
  RARITY_STARS,
  type Species,
} from '../../buddy/types.js'

// Per-species name pools for deterministic hatch generation.
const NAME_POOLS: Record<string, string[]> = {
  duck: ['Waddles', 'Quackers', 'Sir Quacks', 'Puddles', 'Nugget'],
  goose: ['Honk', 'Goosifer', 'Mr. Waddle', 'Feathers', 'Chaos'],
  blob: ['Gloop', 'Squish', 'Oobleck', 'Globby', 'Blobsworth'],
  cat: ['Mittens', 'Whiskers', 'Purrlock', 'Mochi', 'Chairman Meow'],
  dragon: ['Ember', 'Smaug Jr', 'Toothless', 'Scorch', 'Pepper'],
  octopus: ['Inky', 'Tentacles', 'Octavius', 'Kraken Jr', 'Squish'],
  owl: ['Hoot', 'Professor', 'Wingston', 'Owlington', 'Sage'],
  penguin: ['Waddle', 'Tux', 'Frosty', 'Pebbles', 'Sir Slides'],
  turtle: ['Shellby', 'Sheldon', 'Turbo', 'Speedy', 'McShell'],
  snail: ['Slowy', 'Gary', 'Shellsworth', 'Trailblazer', 'Zoom'],
  ghost: ['Boo', 'Casper', 'Whisper', 'Spookums', 'Floaty'],
  axolotl: ['Axel', 'Gills', 'Worf Jr', 'Smiley', 'Pinkerton'],
  capybara: ['Chill', 'Capy', 'Bob', 'Zen Master', 'Rodrigo'],
  cactus: ['Prickles', 'Spike', 'Desert', 'Sunny', 'Needles'],
  robot: ['Beep', 'Unit-7', 'Cogsworth', 'Sparky', 'Bit'],
  rabbit: ['Thumper', 'Clover', 'Hops', 'Lopsy', 'Bun Bun'],
  mushroom: ['Shroomie', 'Mycelium', 'Funguy', 'Spore', 'Cap'],
  chonk: ['Chonkus', 'Absolute Unit', 'Big Boi', 'Thicc', 'Beefy'],
}

const PERSONALITIES = [
  'curious and easily distracted',
  'sleepy but supportive',
  'chaotic and proud of it',
  'quietly judging everything',
  'enthusiastic about everything',
  'sarcastic but lovable',
  'anxious but brave',
  'perpetually confused',
  'overly dramatic',
  'zen and unbothered',
]

function pickName(species: string, seed: number): string {
  const pool = NAME_POOLS[species] ?? NAME_POOLS['blob']!
  return pool[seed % pool.length]!
}

function pickPersonality(seed: number): string {
  return PERSONALITIES[seed % PERSONALITIES.length]!
}

function showHelp(): string {
  return [
    '/buddy — manage your companion pet',
    '',
    'Subcommands:',
    '  hatch        Hatch a new companion (if you don\'t have one)',
    '  info         Show companion details',
    '  pet          Pet your companion',
    '  mute         Toggle companion muting',
    '  name <name>  Rename your companion',
  ].join('\n')
}

export const call: LocalCommandCall = async (args, context) => {
  const sub = args.trim().toLowerCase()

  switch (sub) {
    case '':
    case 'info': {
      const companion = getCompanion()
      if (!companion) {
        return {
          type: 'text',
          value: 'No companion yet! Run /buddy hatch to get one.',
        }
      }
      const stars = RARITY_STARS[companion.rarity]
      const hatchDate = new Date(companion.hatchedAt).toLocaleDateString()
      const stats = Object.entries(companion.stats)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join('\n')
      return {
        type: 'text',
        value: [
          `${companion.name} the ${companion.species}`,
          `  ${stars} ${companion.rarity}${companion.shiny ? ' ✨ shiny' : ''}`,
          `  Hat: ${companion.hat}  Eye: ${companion.eye}`,
          `  Personality: ${companion.personality}`,
          `  Hatched: ${hatchDate}`,
          `  Stats:\n${stats}`,
        ].join('\n'),
      }
    }

    case 'hatch': {
      const existing = getGlobalConfig().companion
      if (existing) {
        return {
          type: 'text',
          value: `You already have a companion (${existing.name})! Use /buddy info to see them.`,
        }
      }
      const userId = companionUserId()
      const { bones, inspirationSeed } = roll(userId)
      const name = pickName(bones.species, inspirationSeed)
      const personality = pickPersonality(inspirationSeed)
      const stored: StoredCompanion = {
        name,
        personality,
        hatchedAt: Date.now(),
      }
      saveGlobalConfig(current => ({ ...current, companion: stored }))
      const stars = RARITY_STARS[bones.rarity]
      return {
        type: 'text',
        value: [
          `🥚 A new companion hatched!`,
          ``,
          `${name} the ${bones.species}`,
          `  ${stars} ${bones.rarity}${bones.shiny ? ' ✨ shiny' : ''}`,
          `  Hat: ${bones.hat}  Eye: ${bones.eye}`,
          `  Personality: ${personality}`,
          ``,
          `Use /buddy info to see full details.`,
        ].join('\n'),
      }
    }

    case 'pet': {
      const companion = getCompanion()
      if (!companion) {
        return {
          type: 'text',
          value: 'No companion to pet! Run /buddy hatch first.',
        }
      }
      context.setAppState(prev => ({
        ...prev,
        companionPetAt: Date.now(),
      }))
      return { type: 'text', value: `<3 ${companion.name} loved that!` }
    }

    case 'mute': {
      const current = getGlobalConfig().companionMuted ?? false
      saveGlobalConfig(cfg => ({ ...cfg, companionMuted: !current }))
      return {
        type: 'text',
        value: current
          ? 'Companion unmuted! They can talk again.'
          : 'Companion muted. Shhh...',
      }
    }

    default: {
      // Handle "name <newname>"
      if (sub.startsWith('name ')) {
        const newName = args.trim().slice(args.trim().indexOf(' ') + 1).trim()
        if (!newName) {
          return { type: 'text', value: 'Usage: /buddy name <new name>' }
        }
        if (newName.length > 20) {
          return {
            type: 'text',
            value: 'Name too long! Max 20 characters.',
          }
        }
        const companion = getGlobalConfig().companion
        if (!companion) {
          return {
            type: 'text',
            value: 'No companion to rename! Run /buddy hatch first.',
          }
        }
        saveGlobalConfig(current => ({
          ...current,
          companion: { ...current.companion!, name: newName },
        }))
        return { type: 'text', value: `Renamed to ${newName}!` }
      }

      return { type: 'text', value: showHelp() }
    }
  }
}
