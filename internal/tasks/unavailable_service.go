package tasks

type UnavailableService struct{}

func NewUnavailableService() *UnavailableService { return &UnavailableService{} }

func (*UnavailableService) Initialize() error { return nil }
func (*UnavailableService) Close() error      { return nil }
func (*UnavailableService) Health() error     { return ErrUnavailable }
func (*UnavailableService) Workspace() (Workspace, error) {
	return Workspace{}, ErrUnavailable
}
func (*UnavailableService) SaveList(ListInput) (List, error) { return List{}, ErrUnavailable }
func (*UnavailableService) DeleteList(int64) error           { return ErrUnavailable }
func (*UnavailableService) ReorderLists(ReorderListsInput) error {
	return ErrUnavailable
}
func (*UnavailableService) SaveTask(TaskInput) (Task, error) { return Task{}, ErrUnavailable }
func (*UnavailableService) SetCompleted(int64, bool) (Workspace, error) {
	return Workspace{}, ErrUnavailable
}
func (*UnavailableService) DeleteTask(int64, bool) error { return ErrUnavailable }
func (*UnavailableService) DeleteCompleted(int64) (int64, error) {
	return 0, ErrUnavailable
}
func (*UnavailableService) ReorderTasks(ReorderTasksInput) error  { return ErrUnavailable }
func (*UnavailableService) ClaimDueReminders(int) ([]Task, error) { return nil, ErrUnavailable }
