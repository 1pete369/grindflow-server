// use this in frontend for getting the tasks for today

export const getTasksForDay = (allTasks, targetDate = new Date()) => {
  const targetDay = targetDate.toLocaleDateString("en-US", { weekday: "long" })
  const targetISO = targetDate.toISOString().slice(0, 10)

  return allTasks.filter(task => {
    const taskStart = new Date(task.startTime).toISOString().slice(0, 10)
    if (taskStart > targetISO) return false // ignore future tasks

    switch (task.recurring) {
      case "daily":
        return true

      case "weekly":
        return task.days?.includes(targetDay)

      case "monthly":
        return new Date(task.startTime).getDate() === targetDate.getDate()

      case "none":
      default:
        return taskStart === targetISO
    }
  })
}
