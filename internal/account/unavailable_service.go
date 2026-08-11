package account

type UnavailableService struct{}

func NewUnavailableService() *UnavailableService { return &UnavailableService{} }

func (*UnavailableService) Initialize() error                { return nil }
func (*UnavailableService) Close() error                     { return nil }
func (*UnavailableService) CurrentUserID() (int, error)      { return 0, ErrUnavailable }
func (*UnavailableService) CurrentAdminUserID() (int, error) { return 0, ErrUnavailable }
func (*UnavailableService) AuthState() (AuthState, error)    { return AuthState{}, ErrUnavailable }
func (*UnavailableService) Register(RegistrationInput) (Profile, error) {
	return Profile{}, ErrUnavailable
}
func (*UnavailableService) Login(LoginInput) (Profile, error) { return Profile{}, ErrUnavailable }
func (*UnavailableService) Logout() error                     { return ErrUnavailable }
func (*UnavailableService) Profile() (Profile, error)         { return Profile{}, ErrUnavailable }
func (*UnavailableService) UpdateProfile(ProfileInput) (Profile, error) {
	return Profile{}, ErrUnavailable
}
func (*UnavailableService) ChangePassword(PasswordInput) error  { return ErrUnavailable }
func (*UnavailableService) ImportAvatar(string) (string, error) { return "", ErrUnavailable }
