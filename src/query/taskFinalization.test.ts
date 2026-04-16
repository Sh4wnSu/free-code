import { describe, expect, test } from 'bun:test'
import {
  getTaskFinalizationReminderContent,
  TASK_FINALIZATION_REMINDER_MARKER,
} from './taskFinalization.js'

const baseTask = {
  description: '',
  blocks: [],
  blockedBy: [],
}

describe('getTaskFinalizationReminderContent', () => {
  test('returns a reminder when only one in-progress task remains', () => {
    const reminder = getTaskFinalizationReminderContent(
      [
        {
          ...baseTask,
          id: '1',
          subject: 'Summarize review findings',
          status: 'completed' as const,
        },
        {
          ...baseTask,
          id: '2',
          subject: 'Write final review summary',
          status: 'in_progress' as const,
        },
      ],
      [],
    )

    expect(reminder).toContain(
      'call TaskUpdate to mark task #2 as completed',
    )
  })

  test('skips the reminder when open tasks still exist', () => {
    const reminder = getTaskFinalizationReminderContent(
      [
        {
          ...baseTask,
          id: '1',
          subject: 'Read core implementation',
          status: 'completed' as const,
        },
        {
          ...baseTask,
          id: '2',
          subject: 'Write final review summary',
          status: 'in_progress' as const,
        },
        {
          ...baseTask,
          id: '3',
          subject: 'Double-check edge cases',
          status: 'pending' as const,
        },
      ],
      [],
    )

    expect(reminder).toBeNull()
  })

  test('skips the reminder for a teammate-owned task', () => {
    const reminder = getTaskFinalizationReminderContent(
      [
        {
          ...baseTask,
          id: '1',
          subject: 'Write final review summary',
          status: 'in_progress' as const,
          owner: 'reviewer-2',
        },
      ],
      [],
      'leader',
    )

    expect(reminder).toBeNull()
  })

  test('does not emit the same reminder twice', () => {
    const reminder = getTaskFinalizationReminderContent(
      [
        {
          ...baseTask,
          id: '1',
          subject: 'Write final review summary',
          status: 'in_progress' as const,
        },
      ],
      [
        {
          type: 'user',
          isMeta: true,
          message: {
            content: `${TASK_FINALIZATION_REMINDER_MARKER}\nAlready reminded.`,
          },
        },
      ],
    )

    expect(reminder).toBeNull()
  })
})
