import { openAsBlob } from 'node:fs'
import { lstat, readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const giteeAPIBaseURL = 'https://gitee.com/api/v5'
const maximumAttachmentSize = 100_000_000
const maximumResponseSize = 2 * 1024 * 1024
const manifestName = 'latest.json'

const tag = process.argv[2]?.trim() ?? ''
const repository = process.argv[3]?.trim() ?? ''
const releaseDirectory = resolve(process.argv[4]?.trim() || 'release')
const targetCommitish = process.argv[5]?.trim() ?? ''
const token = process.env.GITEE_TOKEN?.trim() ?? ''

if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag)) {
  throw new Error(`Release tag must use vMAJOR.MINOR.PATCH, received: ${tag || '(empty)'}`)
}
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  throw new Error(`Repository must use OWNER/NAME, received: ${repository || '(empty)'}`)
}
if (!targetCommitish || /[\u0000-\u001f\u007f]/.test(targetCommitish)) {
  throw new Error('Target commitish is required')
}
if (!token) throw new Error('GITEE_TOKEN is required')

const [owner, name] = repository.split('/')
const releaseTitle = process.env.RELEASE_NAME?.trim() || tag
const notesFile = process.env.RELEASE_NOTES_FILE?.trim() ?? ''
const releaseNotes = notesFile ? (await readFile(resolve(notesFile), 'utf8')).trim() : ''
const releaseBody = releaseNotes || `Automated desktop release for ${tag}.`

const directoryEntries = await readdir(releaseDirectory, { withFileTypes: true })
const attachments = []
for (const entry of directoryEntries) {
  if (!entry.isFile()) continue
  if (!/^[A-Za-z0-9._-]+$/.test(entry.name)) {
    throw new Error(`Release attachment has an unsafe file name: ${entry.name}`)
  }
  const filePath = resolve(releaseDirectory, entry.name)
  const fileInfo = await lstat(filePath)
  if (!fileInfo.isFile())
    throw new Error(`Release attachment must be a regular file: ${entry.name}`)
  if (fileInfo.size <= 0 || fileInfo.size > maximumAttachmentSize) {
    throw new Error(
      `Gitee release attachment must be between 1 byte and 100 MB: ${entry.name} (${fileInfo.size} bytes)`,
    )
  }
  attachments.push({ name: entry.name, path: filePath, size: fileInfo.size })
}
if (!attachments.some((attachment) => attachment.name === manifestName)) {
  throw new Error(`Release directory is missing ${manifestName}`)
}
attachments.sort((left, right) => {
  if (left.name === manifestName) return 1
  if (right.name === manifestName) return -1
  return left.name.localeCompare(right.name)
})

function apiURL(path, authenticated = false) {
  const value = new URL(`${giteeAPIBaseURL}${path}`)
  if (authenticated) value.searchParams.set('access_token', token)
  return value
}

async function responsePayload(response, action, expectedStatuses) {
  const body = await response.text()
  if (body.length > maximumResponseSize) {
    throw new Error(`${action}: response exceeds ${maximumResponseSize} bytes`)
  }
  let payload = null
  if (body.trim()) {
    try {
      payload = JSON.parse(body)
    } catch {
      if (expectedStatuses.includes(response.status)) {
        throw new Error(`${action}: expected a JSON response`)
      }
    }
  }
  if (!expectedStatuses.includes(response.status)) {
    const message =
      payload && typeof payload === 'object' && typeof payload.message === 'string'
        ? `: ${payload.message}`
        : ''
    throw new Error(`${action}: unexpected HTTP status ${response.status}${message}`)
  }
  return payload
}

async function getReleaseByTag() {
  const response = await fetch(
    apiURL(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/releases/tags/${encodeURIComponent(tag)}`,
      true,
    ),
    { headers: { Accept: 'application/json', 'User-Agent': 'cull-pear-release-publisher' } },
  )
  if (response.status === 404) return null
  return responsePayload(response, 'query Gitee release', [200])
}

function releaseForm(includeTargetCommitish) {
  const form = new URLSearchParams({
    access_token: token,
    tag_name: tag,
    name: releaseTitle,
    body: releaseBody,
    prerelease: 'false',
  })
  if (includeTargetCommitish) form.set('target_commitish', targetCommitish)
  return form
}

async function createRelease() {
  const response = await fetch(
    apiURL(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/releases`),
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'User-Agent': 'cull-pear-release-publisher' },
      body: releaseForm(true),
    },
  )
  return responsePayload(response, 'create Gitee release', [200, 201])
}

async function updateRelease(releaseID) {
  const response = await fetch(
    apiURL(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/releases/${releaseID}`),
    {
      method: 'PATCH',
      headers: { Accept: 'application/json', 'User-Agent': 'cull-pear-release-publisher' },
      body: releaseForm(false),
    },
  )
  return responsePayload(response, 'update Gitee release', [200])
}

function releaseID(payload) {
  const value = payload && typeof payload === 'object' ? Number(payload.id) : Number.NaN
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error('Gitee release response is missing a valid id')
  return value
}

async function listAttachments(id) {
  const endpoint = apiURL(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/releases/${id}/attach_files`,
    true,
  )
  endpoint.searchParams.set('page', '1')
  endpoint.searchParams.set('per_page', '100')
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json', 'User-Agent': 'cull-pear-release-publisher' },
  })
  const payload = await responsePayload(response, 'list Gitee release attachments', [200])
  if (!Array.isArray(payload)) throw new Error('Gitee attachment response must be an array')
  return payload
}

async function deleteAttachment(releaseIDValue, attachmentID, attachmentName) {
  const response = await fetch(
    apiURL(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/releases/${releaseIDValue}/attach_files/${attachmentID}`,
      true,
    ),
    {
      method: 'DELETE',
      headers: { Accept: 'application/json', 'User-Agent': 'cull-pear-release-publisher' },
    },
  )
  await responsePayload(response, `delete Gitee release attachment ${attachmentName}`, [200, 204])
}

async function uploadAttachment(releaseIDValue, attachment) {
  console.log(`Uploading ${attachment.name} to Gitee release ${tag}...`)
  const form = new FormData()
  form.set('access_token', token)
  form.set('file', await openAsBlob(attachment.path), attachment.name)
  const response = await fetch(
    apiURL(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/releases/${releaseIDValue}/attach_files`,
    ),
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'User-Agent': 'cull-pear-release-publisher' },
      body: form,
      signal: AbortSignal.timeout(30 * 60 * 1000),
    },
  )
  await responsePayload(response, `upload Gitee release attachment ${attachment.name}`, [200, 201])
  console.log(`Uploaded ${attachment.name}.`)
}

let release = await getReleaseByTag()
if (release) {
  release = await updateRelease(releaseID(release))
} else {
  release = await createRelease()
}
const id = releaseID(release)
const desiredAttachments = new Map(attachments.map((attachment) => [attachment.name, attachment]))
const reusableAttachments = new Set()
for (const existingAttachment of await listAttachments(id)) {
  if (!existingAttachment || typeof existingAttachment !== 'object') continue
  const existingName = typeof existingAttachment.name === 'string' ? existingAttachment.name : ''
  const existingID = Number(existingAttachment.id)
  const desiredAttachment = desiredAttachments.get(existingName)
  if (!desiredAttachment) continue
  if (!Number.isSafeInteger(existingID) || existingID <= 0) {
    throw new Error(`Gitee attachment ${existingName} is missing a valid id`)
  }
  if (!reusableAttachments.has(existingName) && Number(existingAttachment.size) === desiredAttachment.size) {
    reusableAttachments.add(existingName)
    console.log(`Keeping existing Gitee release attachment ${existingName}.`)
    continue
  }
  await deleteAttachment(id, existingID, existingName)
}
for (const attachment of attachments) {
  if (!reusableAttachments.has(attachment.name)) await uploadAttachment(id, attachment)
}

console.log(`Published ${attachments.length} attachments to Gitee release ${tag}.`)
