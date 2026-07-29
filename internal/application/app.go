package application

// GreetingService describes the greeting capability required by the desktop API.
type GreetingService interface {
	Greet(name string) (string, error)
}

// App is the Wails-facing application facade.
// Keep exported methods focused on frontend use cases because Wails generates bindings for them.
type App struct {
	greetingService GreetingService
}

func New(greetingService GreetingService) *App {
	return &App{
		greetingService: greetingService,
	}
}

func (a *App) Greet(name string) (string, error) {
	return a.greetingService.Greet(name)
}
