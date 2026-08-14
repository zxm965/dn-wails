package quicknotes

type UnavailableService struct{}

func NewUnavailableService() *UnavailableService {
	return &UnavailableService{}
}

func (*UnavailableService) Initialize() error { return nil }
func (*UnavailableService) Close() error      { return nil }
func (*UnavailableService) Health() error     { return ErrUnavailable }

func (*UnavailableService) List() ([]Note, error) {
	return nil, ErrUnavailable
}

func (*UnavailableService) Save(NoteInput) (Note, error) {
	return Note{}, ErrUnavailable
}

func (*UnavailableService) Delete(int64) error {
	return ErrUnavailable
}
