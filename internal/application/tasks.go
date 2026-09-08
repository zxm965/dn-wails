package application

import "cull-pear/internal/tasks"

func (a *App) TaskWorkspace() (tasks.Workspace, error) {
	return a.tasksService.Workspace()
}

func (a *App) SaveTaskList(input tasks.ListInput) (tasks.List, error) {
	return a.tasksService.SaveList(input)
}

func (a *App) DeleteTaskList(id int64) error {
	return a.tasksService.DeleteList(id)
}

func (a *App) ReorderTaskLists(input tasks.ReorderListsInput) error {
	return a.tasksService.ReorderLists(input)
}

func (a *App) SaveTask(input tasks.TaskInput) (tasks.Task, error) {
	return a.tasksService.SaveTask(input)
}

func (a *App) SetTaskCompleted(id int64, completed bool) (tasks.Workspace, error) {
	return a.tasksService.SetCompleted(id, completed)
}

func (a *App) DeleteTask(id int64, deleteSeries bool) error {
	return a.tasksService.DeleteTask(id, deleteSeries)
}

func (a *App) DeleteCompletedTasks(listID int64) (int64, error) {
	return a.tasksService.DeleteCompleted(listID)
}

func (a *App) ReorderTasks(input tasks.ReorderTasksInput) error {
	return a.tasksService.ReorderTasks(input)
}

func (a *App) ClaimDueTaskReminders(limit int) ([]tasks.Task, error) {
	return a.tasksService.ClaimDueReminders(limit)
}
