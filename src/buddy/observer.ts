import { getCompanion } from './companion.js'
import { getGlobalConfig } from '../utils/config.js'

type ReactionCategory = {
  patterns: RegExp[]
  reactions: string[]
}

const CATEGORIES: ReactionCategory[] = [
  {
    patterns: [/\berror\b/i, /\bfailed\b/i, /\bexception\b/i, /\btraceback\b/i, /\bcrash/i],
    reactions: ['yikes!', 'oh no...', 'that broke', 'oops', 'uh oh'],
  },
  {
    patterns: [/\btest/i, /\bpassed\b/i, /\ball green\b/i],
    reactions: ['nice!', 'green!', 'all clear!', 'ship it!'],
  },
  {
    patterns: [/\bcommit/i, /\bpush/i, /\bmerge\b/i, /\bbranch\b/i],
    reactions: ['ship it!', 'deploy time', 'to prod!', 'yeet'],
  },
  {
    patterns: [/\bbug\b/i, /\bfix\b/i, /\bdebug/i, /\bwhy\b/i],
    reactions: ['detective mode', 'hmm...', 'interesting', 'investigating'],
  },
  {
    patterns: [/\bdelete/i, /\bremove/i, /\brm\b/],
    reactions: ['gone!', 'spring cleaning', 'bye bye', 'snip snip'],
  },
  {
    patterns: [/\bcreat/i, /\bnew file/i, /\bwrite/i, /\badd\b/i],
    reactions: ['new file!', 'building!', 'ooh shiny', 'adding stuff'],
  },
  {
    patterns: [/\brefactor/i, /\brename/i, /\brestructure/i],
    reactions: ['tidying up', 'clean code!', 'reorg!', 'ooh fancy'],
  },
]

const DEFAULT_REACTIONS = ['nice', 'cool', 'hmm', 'ok!', '👀', 'neat', 'carry on']

// Simple counter-based seed so default reactions aren't always the same.
let defaultIndex = 0

function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b?.type === 'text' && typeof b.text === 'string')
      .map((b: any) => b.text as string)
      .join('\n')
  }
  return ''
}

export function fireCompanionObserver(
  messages: readonly { type: string; content?: unknown }[],
  callback: (reaction: string) => void,
): void {
  const companion = getCompanion()
  if (!companion || getGlobalConfig().companionMuted) return

  // Find last user and assistant messages.
  let lastUserText = ''
  let lastAssistantText = ''
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!
    if (msg.type === 'assistant' && !lastAssistantText) {
      lastAssistantText = extractText(msg.content)
    } else if (msg.type === 'user' && !lastUserText) {
      lastUserText = extractText(msg.content)
    }
    if (lastUserText && lastAssistantText) break
  }

  const combined = `${lastUserText}\n${lastAssistantText}`

  // Match categories in priority order, pick first hit.
  for (const category of CATEGORIES) {
    if (category.patterns.some(p => p.test(combined))) {
      const idx = Math.floor(Math.random() * category.reactions.length)
      callback(category.reactions[idx]!)
      return
    }
  }

  // Fallback: cycle through defaults.
  callback(DEFAULT_REACTIONS[defaultIndex % DEFAULT_REACTIONS.length]!)
  defaultIndex++
}
