package dnprocess

type unavailableService struct{}

func NewUnavailableService() Service {
	return unavailableService{}
}

func (unavailableService) List() ([]Info, error) {
	return nil, ErrUnavailable
}

func (unavailableService) Terminate(Target) (Info, error) {
	return Info{}, ErrUnavailable
}

func (unavailableService) TerminateConfigured(string) (Info, error) {
	return Info{}, ErrUnavailable
}

func (unavailableService) Health() error {
	return ErrUnavailable
}
