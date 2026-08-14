package application

import "cull-pear/internal/quicknotes"

func (a *App) ListQuickNotes() ([]quicknotes.Note, error) {
	return a.quickNotesService.List()
}

func (a *App) SaveQuickNote(input quicknotes.NoteInput) (quicknotes.Note, error) {
	return a.quickNotesService.Save(input)
}

func (a *App) DeleteQuickNote(id int64) error {
	return a.quickNotesService.Delete(id)
}
