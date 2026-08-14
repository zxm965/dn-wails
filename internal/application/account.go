package application

import "cull-pear/internal/account"

func (a *App) GetAuthState() (account.AuthState, error) {
	return a.accountService.AuthState()
}

func (a *App) RegisterUser(input account.RegistrationInput) (account.Profile, error) {
	return a.accountService.Register(input)
}

func (a *App) LoginUser(input account.LoginInput) (account.Profile, error) {
	return a.accountService.Login(input)
}

func (a *App) LogoutUser() error {
	return a.accountService.Logout()
}

func (a *App) GetProfile() (account.Profile, error) {
	return a.accountService.Profile()
}

func (a *App) UpdateProfile(input account.ProfileInput) (account.Profile, error) {
	return a.accountService.UpdateProfile(input)
}

func (a *App) ChangePassword(input account.PasswordInput) error {
	return a.accountService.ChangePassword(input)
}

func (a *App) ImportAvatar(path string) (string, error) {
	return a.accountService.ImportAvatar(path)
}
