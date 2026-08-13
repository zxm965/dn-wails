package installation

import "time"

const CurrentSchemaVersion = 1

type Identity struct {
	SchemaVersion       int       `json:"schemaVersion"`
	InstallationID      string    `json:"installationId"`
	CreatedAt           time.Time `json:"createdAt"`
	FirstInstallVersion string    `json:"firstInstallVersion"`
	LastSeenVersion     string    `json:"lastSeenVersion"`
}
