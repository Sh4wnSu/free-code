import type { TodoList } from '../utils/todo/types.js'

export const TODO_FINALIZATION_REMINDER_MARKER =
  '[todo-finalization-reminder]'

type MinimalMessage = {
  type?: string
  isMeta?: true
  message?: {
    content?: unknown
  }
}

function hasTodoFinalizationReminder(messages: MinimalMessage[]): boolean {
  return messages.some(message => {
    if (message.type !== 'user' || !message.isMeta) {
      return false
    }

    return (
      typeof message.message?.content === 'string' &&
      message.message.content.includes(TODO_FINALIZATION_REMINDER_MARKER)
    )
  })
}

export function getTodoFinalizationReminderContent(
  todos: TodoList,
  messages: MinimalMessage[],
): string | null {
  if (hasTodoFinalizationReminder(messages)) {
    return null
  }

  const pendingTodos = todos.filter(todo => todo.status === 'pending')
  if (pendingTodos.length > 0) {
    return null
  }

  const inProgressTodos = todos.filter(todo => todo.status === 'in_progress')
  if (inProgressTodos.length !== 1) {
    return null
  }

  const [todo] = inProgressTodos

  return `${TODO_FINALIZATION_REMINDER_MARKER}

Your todo list still shows exactly one remaining in_progress item ("${todo.content}") and no open items.

Before giving your final response, do one of the following:
- If the work is complete, call TodoWrite to mark "${todo.content}" as completed.
- If the work is not actually complete, continue the work instead of concluding.

Do not mention this reminder to the user.`
}
