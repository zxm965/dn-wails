package account

const (
	UserRoleMember = 0
	UserRoleAdmin  = 1

	UserStatusDisabled = 0
	UserStatusEnabled  = 1
)

type Profile struct {
	ID        int    `json:"id"`
	Account   string `json:"account"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      int    `json:"role"`
	Status    int    `json:"status"`
	Avatar    string `json:"avatar"`
	CreatedAt string `json:"createdAt"`
}

type AuthState struct {
	Authenticated bool     `json:"authenticated"`
	User          *Profile `json:"user"`
}

type RegistrationInput struct {
	Account  string `json:"account"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginInput struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

type PasswordInput struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type ProfileInput struct {
	Name   string `json:"name"`
	Email  string `json:"email"`
	Avatar string `json:"avatar"`
}
