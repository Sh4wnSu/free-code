import { describe, expect, test } from 'bun:test'
import {
  getTodoFinalizationReminderContent,
  TODO_FINALIZATION_REMINDER_MARKER,
} from './todoFinalization.js'

const baseTodo = {
  activeForm: 'Working',
}

describe('getTodoFinalizationReminderContent', () => {
  test('returns a reminder when only one in-progress todo remains', () => {
    const reminder = getTodoFinalizationReminderContent(
      [
        {
          ...baseTodo,
          content: 'Read core implementation',
          status: 'completed' as const,
        },
        {
          ...baseTodo,
          content: 'Write final review summary',
          status: 'in_progress' as const,
        },
      ],
      [],
    )

    expect(reminder).toContain(
      'call TodoWrite to mark "Write final review summary" as completed',
    )
  })

  test('skips the reminder when open todos still exist', () => {
    const reminder = getTodoFinalizationReminderContent(
      [
        {
          ...baseTodo,
          content: 'Read core implementation',
          status: 'completed' as const,
        },
        {
          ...baseTodo,
          content: 'Write final review summary',
          status: 'in_progress' as const,
        },
        {
          ...baseTodo,
          content: 'Double-check edge cases',
          status: 'pending' as const,
        },
      ],
      [],
    )

    expect(reminder).toBeNull()
  })

  test('does not emit the same reminder twice', () => {
    const reminder = getTodoFinalizationReminderContent(
      [
        {
          ...baseTodo,
          content: 'Write final review summary',
          status: 'in_progress' as const,
        },
      ],
      [
        {
          type: 'user',
          isMeta: true,
          message: {
            content: `${TODO_FINALIZATION_REMINDER_MARKER}\nAlready reminded.`,
          },
        },
      ],
    )

    expect(reminder).toBeNull()
  })
})
