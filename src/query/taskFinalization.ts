import type { Task } from '../utils/tasks.js'

export const TASK_FINALIZATION_REMINDER_MARKER =
  '[task-finalization-reminder]'

type MinimalMessage = {
  type?: string
  isMeta?: true
  message?: {
    content?: unknown
  }
}

function hasTaskFinalizationReminder(messages: MinimalMessage[]): boolean {
  return messages.some(message => {
    if (message.type !== 'user' || !message.isMeta) {
      return false
    }

    return (
      typeof message.message?.content === 'string' &&
      message.message.content.includes(TASK_FINALIZATION_REMINDER_MARKER)
    )
  })
}

export function getTaskFinalizationReminderContent(
  tasks: Task[],
  messages: MinimalMessage[],
  currentAgentName?: string,
): string | null {
  if (hasTaskFinalizationReminder(messages)) {
    return null
  }

  const pendingTasks = tasks.filter(task => task.status === 'pending')
  if (pendingTasks.length > 0) {
    return null
  }

  const inProgressTasks = tasks.filter(task => task.status === 'in_progress')
  if (inProgressTasks.length !== 1) {
    return null
  }

  const [task] = inProgressTasks

  // Only nudge for the main agent's own last task (or an unowned task).
  // If another teammate still owns the task, the leader should not auto-close it.
  if (
    task.owner &&
    (!currentAgentName || task.owner !== currentAgentName)
  ) {
    return null
  }

  return `${TASK_FINALIZATION_REMINDER_MARKER}

Your task list still shows exactly one remaining in_progress task (#${task.id}: ${task.subject}) and no open tasks.

Before giving your final response, do one of the following:
- If the work is complete, call TaskUpdate to mark task #${task.id} as completed.
- If the work is not actually complete, continue the work instead of concluding.

Do not mention this reminder to the user.`
}
