package dn

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

const officialIntegrationKey = "dragon-nest-official-news"

func (s *PostgresService) ListMessages(query SiteMessageQuery) (SiteMessageList, error) {
	ctx, cancel := databaseContext()
	defer cancel()
	var ownerID int
	var err error
	if query.Manage {
		ownerID, err = s.identity.CurrentAdminUserID()
	} else {
		ownerID, err = databaseUserID(ctx, s)
	}
	if err != nil {
		return SiteMessageList{}, err
	}
	page, pageSize := normalizePage(query.Page, query.PageSize)
	keyword := strings.TrimSpace(query.Keyword)
	readStatus := query.ReadStatus
	if readStatus != "read" && readStatus != "unread" {
		readStatus = "all"
	}
	countQuery := messageCountQuery
	selectQuery := messageSelectQuery
	if query.Manage {
		countQuery = messageManageCountQuery
		selectQuery = messageManageSelectQuery
	}
	var total int
	if err := s.pool.QueryRow(ctx, countQuery, ownerID, keyword, readStatus).Scan(&total); err != nil {
		return SiteMessageList{}, fmt.Errorf("count DN messages: %w", err)
	}
	rows, err := s.pool.Query(ctx, selectQuery+`
		limit $4 offset $5
	`, ownerID, keyword, readStatus, pageSize, (page-1)*pageSize)
	if err != nil {
		return SiteMessageList{}, fmt.Errorf("list DN messages: %w", err)
	}
	defer rows.Close()
	items := make([]SiteMessage, 0)
	for rows.Next() {
		item, scanErr := scanDatabaseMessage(rows)
		if scanErr != nil {
			return SiteMessageList{}, fmt.Errorf("scan DN message: %w", scanErr)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return SiteMessageList{}, fmt.Errorf("iterate DN messages: %w", err)
	}
	unread, err := s.databaseUnreadCount(ctx, ownerID)
	if err != nil {
		return SiteMessageList{}, err
	}
	lastSyncedAt, _ := s.databaseLastSyncedAt(ctx)
	return SiteMessageList{
		Items:        items,
		Meta:         listMeta(total, page, pageSize),
		UnreadCount:  unread,
		LastSyncedAt: lastSyncedAt,
	}, nil
}

func (s *PostgresService) MessageInbox(limit int) (SiteMessageInbox, error) {
	if limit <= 0 {
		limit = 8
	}
	if limit > 20 {
		limit = 20
	}
	syncError := ""
	if _, err := s.syncPostgresOfficialMessages(false); err != nil {
		if errors.Is(err, ErrUnauthenticated) {
			return SiteMessageInbox{}, err
		}
		syncError = err.Error()
	}
	ctx, cancel := databaseContext()
	defer cancel()
	ownerID, err := databaseUserID(ctx, s)
	if err != nil {
		return SiteMessageInbox{}, err
	}
	rows, err := s.pool.Query(ctx, messageSelectBase+`
		where m.status = 1 and m.published_at <= now()
		  and (m.expires_at is null or m.expires_at > now())
		  and r.read_at is null
		order by m.published_at desc, m.id desc
		limit $2
	`, ownerID, limit)
	if err != nil {
		return SiteMessageInbox{}, fmt.Errorf("list DN message inbox: %w", err)
	}
	defer rows.Close()
	items := make([]SiteMessage, 0)
	for rows.Next() {
		item, scanErr := scanDatabaseMessage(rows)
		if scanErr != nil {
			return SiteMessageInbox{}, scanErr
		}
		items = append(items, item)
	}
	unread, err := s.databaseUnreadCount(ctx, ownerID)
	if err != nil {
		return SiteMessageInbox{}, err
	}
	lastSyncedAt, _ := s.databaseLastSyncedAt(ctx)
	return SiteMessageInbox{Items: items, UnreadCount: unread, LastSyncedAt: lastSyncedAt, SyncError: syncError}, nil
}

func (s *PostgresService) ClaimMessageNotifications(limit int) (SiteMessageClaim, error) {
	if limit <= 0 {
		limit = 3
	}
	if limit > 20 {
		limit = 20
	}
	_, _ = s.syncPostgresOfficialMessages(false)
	ctx, cancel := databaseContext()
	defer cancel()
	ownerID, err := databaseUserID(ctx, s)
	if err != nil {
		return SiteMessageClaim{}, err
	}
	rows, err := s.pool.Query(ctx, messageSelectBase+`
		where m.status = 1 and m.published_at <= now()
		  and (m.expires_at is null or m.expires_at > now())
		  and m.popup = true and r.notified_at is null and r.read_at is null
		order by m.published_at desc, m.id desc
		limit $2
	`, ownerID, limit)
	if err != nil {
		return SiteMessageClaim{}, fmt.Errorf("query DN notification claims: %w", err)
	}
	defer rows.Close()
	items := make([]SiteMessage, 0)
	for rows.Next() {
		item, scanErr := scanDatabaseMessage(rows)
		if scanErr != nil {
			rows.Close()
			return SiteMessageClaim{}, scanErr
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return SiteMessageClaim{}, fmt.Errorf("iterate DN notification claims: %w", err)
	}
	return SiteMessageClaim{Items: items}, nil
}

func (s *PostgresService) MarkMessageNotified(id int) error {
	if id <= 0 {
		return fmt.Errorf("%w: invalid site message id", ErrInvalidData)
	}
	ctx, cancel := databaseContext()
	defer cancel()
	ownerID, err := databaseUserID(ctx, s)
	if err != nil {
		return err
	}
	var exists bool
	if err := s.pool.QueryRow(ctx, `
		select exists(
			select 1 from sys_site_message
			where id=$1 and status=1 and popup=true and published_at<=now() and (expires_at is null or expires_at>now())
		)
	`, id).Scan(&exists); err != nil {
		return fmt.Errorf("validate DN message notification: %w", err)
	}
	if !exists {
		return fmt.Errorf("%w: site message %d", ErrNotFound, id)
	}
	if _, err := s.pool.Exec(ctx, `
		insert into sys_site_message_receipt (message_id,user_id,notified_at,created_at,updated_at)
		values ($1,$2,now(),now(),now())
		on conflict (message_id,user_id) do update
		set notified_at=coalesce(sys_site_message_receipt.notified_at,excluded.notified_at),updated_at=now()
	`, id, ownerID); err != nil {
		return fmt.Errorf("mark DN message notified: %w", err)
	}
	return nil
}

func (s *PostgresService) MarkMessageRead(id int) (SiteMessage, error) {
	if id <= 0 {
		return SiteMessage{}, fmt.Errorf("%w: invalid site message id", ErrInvalidData)
	}
	ctx, cancel := databaseContext()
	defer cancel()
	ownerID, err := databaseUserID(ctx, s)
	if err != nil {
		return SiteMessage{}, err
	}
	var exists bool
	if err := s.pool.QueryRow(ctx, `
		select exists(select 1 from sys_site_message where id=$1 and status=1 and published_at<=now() and (expires_at is null or expires_at>now()))
	`, id).Scan(&exists); err != nil {
		return SiteMessage{}, fmt.Errorf("validate DN message: %w", err)
	}
	if !exists {
		return SiteMessage{}, fmt.Errorf("%w: site message %d", ErrNotFound, id)
	}
	if _, err := s.pool.Exec(ctx, `
		insert into sys_site_message_receipt (message_id, user_id, notified_at, read_at, created_at, updated_at)
		values ($1,$2,now(),now(),now(),now())
		on conflict (message_id,user_id) do update set notified_at=coalesce(sys_site_message_receipt.notified_at, now()), read_at=now(), updated_at=now()
	`, id, ownerID); err != nil {
		return SiteMessage{}, fmt.Errorf("mark DN message read: %w", err)
	}
	item, err := scanDatabaseMessage(s.pool.QueryRow(ctx, messageSelectBase+` where m.id=$2`, ownerID, id))
	if err != nil {
		return SiteMessage{}, fmt.Errorf("load read DN message: %w", err)
	}
	return item, nil
}

func (s *PostgresService) MarkAllMessagesRead() (int, error) {
	ctx, cancel := databaseContext()
	defer cancel()
	ownerID, err := databaseUserID(ctx, s)
	if err != nil {
		return 0, err
	}
	rows, err := s.pool.Query(ctx, `
		insert into sys_site_message_receipt (message_id, user_id, notified_at, read_at, created_at, updated_at)
		select m.id, $1, now(), now(), now(), now()
		from sys_site_message m
		left join sys_site_message_receipt r on r.message_id=m.id and r.user_id=$1
		where m.status=1 and m.published_at<=now() and (m.expires_at is null or m.expires_at>now()) and r.read_at is null
		on conflict (message_id,user_id) do update set notified_at=coalesce(sys_site_message_receipt.notified_at, now()), read_at=now(), updated_at=now()
		returning message_id
	`, ownerID)
	if err != nil {
		return 0, fmt.Errorf("mark all DN messages read: %w", err)
	}
	defer rows.Close()
	count := 0
	for rows.Next() {
		count++
	}
	return count, rows.Err()
}

func (s *PostgresService) PublishMessage(input SiteMessageInput) (SiteMessage, error) {
	normalized, err := normalizeSiteMessageInput(input, time.Now())
	if err != nil {
		return SiteMessage{}, err
	}
	publishedAt, _ := optionalDatabaseTime(normalized.PublishedAt)
	expiresAt, _ := optionalDatabaseTime(normalized.ExpiresAt)
	ctx, cancel := databaseContext()
	defer cancel()
	currentID, err := s.identity.CurrentAdminUserID()
	if err != nil {
		return SiteMessage{}, err
	}
	item, err := scanDatabaseMessage(s.pool.QueryRow(ctx, messageInsertReturning,
		"desktop", nil, normalized.Level, normalized.Title, nullableString(normalized.Content), nullableString(normalized.ActionLabel),
		nullableString(normalized.ActionURL), normalized.ActionTarget, normalized.Popup, publishedAt, expiresAt, currentID, nil,
	))
	if err != nil {
		return SiteMessage{}, mapDatabaseError("publish DN message", err)
	}
	return item, nil
}

func (s *PostgresService) UpdateMessage(id int, input SiteMessageInput) (SiteMessage, error) {
	if id <= 0 {
		return SiteMessage{}, fmt.Errorf("%w: invalid site message id", ErrInvalidData)
	}
	normalized, err := normalizeSiteMessageInput(input, time.Now())
	if err != nil {
		return SiteMessage{}, err
	}
	publishedAt, _ := optionalDatabaseTime(normalized.PublishedAt)
	expiresAt, _ := optionalDatabaseTime(normalized.ExpiresAt)
	ctx, cancel := databaseContext()
	defer cancel()
	if _, err := s.identity.CurrentAdminUserID(); err != nil {
		return SiteMessage{}, err
	}
	item, err := scanDatabaseMessage(s.pool.QueryRow(ctx, `
		update sys_site_message
		set level=$2,title=$3,content=$4,action_label=$5,action_url=$6,action_target=$7,
		    popup=$8,published_at=$9,expires_at=$10,updated_at=now()
		where id=$1 and status=1
		returning id,source,coalesce(source_key,''),level,title,coalesce(content,''),coalesce(action_label,''),
		          coalesce(action_url,''),action_target,popup,status,published_at,expires_at,coalesce(created_by,0),
		          coalesce(metadata,'{}'::jsonb),null::timestamp
	`, id, normalized.Level, normalized.Title, nullableString(normalized.Content), nullableString(normalized.ActionLabel),
		nullableString(normalized.ActionURL), normalized.ActionTarget, normalized.Popup, publishedAt, expiresAt))
	if errors.Is(err, pgx.ErrNoRows) {
		return SiteMessage{}, fmt.Errorf("%w: site message %d", ErrNotFound, id)
	}
	if err != nil {
		return SiteMessage{}, mapDatabaseError("update DN message", err)
	}
	return item, nil
}

func (s *PostgresService) DeleteMessage(id int) (SiteMessage, error) {
	if id <= 0 {
		return SiteMessage{}, fmt.Errorf("%w: invalid site message id", ErrInvalidData)
	}
	ctx, cancel := databaseContext()
	defer cancel()
	if _, err := s.identity.CurrentAdminUserID(); err != nil {
		return SiteMessage{}, err
	}
	item, err := scanDatabaseMessage(s.pool.QueryRow(ctx, `
		update sys_site_message set status=0,updated_at=now()
		where id=$1 and status=1
		returning id,source,coalesce(source_key,''),level,title,coalesce(content,''),coalesce(action_label,''),
		          coalesce(action_url,''),action_target,popup,status,published_at,expires_at,coalesce(created_by,0),
		          coalesce(metadata,'{}'::jsonb),null::timestamp
	`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return SiteMessage{}, fmt.Errorf("%w: site message %d", ErrNotFound, id)
	}
	if err != nil {
		return SiteMessage{}, mapDatabaseError("delete DN message", err)
	}
	return item, nil
}

func (s *PostgresService) SyncOfficialMessages() (OfficialMessageSyncResult, error) {
	return s.syncPostgresOfficialMessages(true)
}

func (s *PostgresService) syncPostgresOfficialMessages(force bool) (OfficialMessageSyncResult, error) {
	var authErr error
	if force {
		_, authErr = s.identity.CurrentAdminUserID()
	} else {
		_, authErr = s.identity.CurrentUserID()
	}
	if authErr != nil {
		return OfficialMessageSyncResult{}, authErr
	}
	s.syncMu.Lock()
	defer s.syncMu.Unlock()
	ctx, cancel := databaseContext()
	defer cancel()
	var data []byte
	var lastSyncedAt time.Time
	err := s.pool.QueryRow(ctx, `select coalesce(data, '{}'::jsonb), last_synced_at from sys_integration_state where key=$1`, officialIntegrationKey).Scan(&data, &lastSyncedAt)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return OfficialMessageSyncResult{}, fmt.Errorf("load official sync state: %w", err)
	}
	freshness := officialSyncFreshness
	if force {
		freshness = officialForceMinInterval
	}
	if err == nil && time.Since(lastSyncedAt) < freshness {
		return OfficialMessageSyncResult{Skipped: true, SyncedAt: formatDatabaseTime(lastSyncedAt)}, nil
	}
	items, err := fetchOfficialNews(s.httpClient)
	if err != nil {
		return OfficialMessageSyncResult{}, err
	}
	if len(items) == 0 {
		return OfficialMessageSyncResult{}, fmt.Errorf("官网没有返回可用消息")
	}
	var integration struct {
		LatestPublishedAt string `json:"latestPublishedAt"`
	}
	_ = json.Unmarshal(data, &integration)
	cursor, _ := time.Parse(time.RFC3339Nano, integration.LatestPublishedAt)
	cutoff := time.Now().Add(-officialInitialLookback)
	candidates := make([]officialNewsItem, 0)
	for _, item := range items {
		if (!cursor.IsZero() && item.PublishedAt.After(cursor)) || (cursor.IsZero() && !item.PublishedAt.Before(cutoff)) {
			candidates = append(candidates, item)
		}
	}
	sort.Slice(candidates, func(i, j int) bool { return candidates[i].PublishedAt.Before(candidates[j].PublishedAt) })
	if len(candidates) > 20 {
		candidates = candidates[len(candidates)-20:]
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return OfficialMessageSyncResult{}, err
	}
	defer tx.Rollback(ctx)
	published := 0
	for _, item := range candidates {
		label, level := officialMessageMeta(item.CategoryCode)
		content := item.Summary
		if content == "" {
			content = fmt.Sprintf("《龙之谷》官网发布了新的%s，点击查看详情。", label)
		}
		metadata, _ := json.Marshal(SiteMessageMetadata{CategoryCode: item.CategoryCode, IsTop: item.IsTop, IsHot: item.IsHot, SourceID: item.SourceID})
		var id int
		err := tx.QueryRow(ctx, `
			insert into sys_site_message
			(source,source_key,level,title,content,action_label,action_url,action_target,popup,status,metadata,published_at,created_at,updated_at)
			values ('dragon-nest-official',$1,$2,$3,$4,'查看官网',$5,'_blank',true,1,$6::jsonb,$7,now(),now())
			on conflict (source,source_key) where source_key is not null do nothing
			returning id
		`, strconv.Itoa(item.SourceID), level, item.Title, content, item.URL, metadata, item.PublishedAt).Scan(&id)
		if errors.Is(err, pgx.ErrNoRows) {
			continue
		}
		if err != nil {
			return OfficialMessageSyncResult{}, fmt.Errorf("publish official DN message: %w", err)
		}
		published++
	}
	latest := items[0].PublishedAt
	for _, item := range items[1:] {
		if item.PublishedAt.After(latest) {
			latest = item.PublishedAt
		}
	}
	syncedAt := time.Now().UTC()
	integrationData, _ := json.Marshal(map[string]string{"latestPublishedAt": latest.UTC().Format(time.RFC3339Nano)})
	if _, err := tx.Exec(ctx, `
		insert into sys_integration_state (key,data,last_synced_at,created_at,updated_at)
		values ($1,$2::jsonb,$3,now(),now())
		on conflict (key) do update set data=excluded.data,last_synced_at=excluded.last_synced_at,updated_at=now()
	`, officialIntegrationKey, integrationData, syncedAt); err != nil {
		return OfficialMessageSyncResult{}, fmt.Errorf("update official sync state: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return OfficialMessageSyncResult{}, fmt.Errorf("commit official message sync: %w", err)
	}
	return OfficialMessageSyncResult{Fetched: len(items), Published: published, SyncedAt: formatDatabaseTime(syncedAt)}, nil
}

func (s *PostgresService) databaseUnreadCount(ctx context.Context, userID int) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `
		select count(*)::int from sys_site_message m
		left join sys_site_message_receipt r on r.message_id=m.id and r.user_id=$1
		where m.status=1 and m.published_at<=now() and (m.expires_at is null or m.expires_at>now()) and r.read_at is null
	`, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count unread DN messages: %w", err)
	}
	return count, nil
}

func (s *PostgresService) databaseLastSyncedAt(ctx context.Context) (string, error) {
	var value time.Time
	err := s.pool.QueryRow(ctx, `select last_synced_at from sys_integration_state where key=$1`, officialIntegrationKey).Scan(&value)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return formatDatabaseTime(value), nil
}

const messageSelectBase = `
	select m.id,m.source,coalesce(m.source_key,''),m.level,m.title,coalesce(m.content,''),
	       coalesce(m.action_label,''),coalesce(m.action_url,''),m.action_target,m.popup,m.status,
	       m.published_at,m.expires_at,coalesce(m.created_by,0),coalesce(m.metadata,'{}'::jsonb),r.read_at
	from sys_site_message m
	left join sys_site_message_receipt r on r.message_id=m.id and r.user_id=$1
`

const messageSelectQuery = messageSelectBase + `
	where m.status=1 and m.published_at<=now() and (m.expires_at is null or m.expires_at>now())
	  and ($2='' or m.title ilike '%'||$2||'%' or coalesce(m.content,'') ilike '%'||$2||'%')
	  and ($3='all' or ($3='read' and r.read_at is not null) or ($3='unread' and r.read_at is null))
	order by m.published_at desc,m.id desc
`

const messageCountQuery = `
	select count(*)::int from sys_site_message m
	left join sys_site_message_receipt r on r.message_id=m.id and r.user_id=$1
	where m.status=1 and m.published_at<=now() and (m.expires_at is null or m.expires_at>now())
	  and ($2='' or m.title ilike '%'||$2||'%' or coalesce(m.content,'') ilike '%'||$2||'%')
	  and ($3='all' or ($3='read' and r.read_at is not null) or ($3='unread' and r.read_at is null))
`

const messageManageSelectQuery = messageSelectBase + `
	where m.status=1
	  and ($2='' or m.title ilike '%'||$2||'%' or coalesce(m.content,'') ilike '%'||$2||'%')
	  and ($3='all' or ($3='read' and r.read_at is not null) or ($3='unread' and r.read_at is null))
	order by m.published_at desc,m.id desc
`

const messageManageCountQuery = `
	select count(*)::int from sys_site_message m
	left join sys_site_message_receipt r on r.message_id=m.id and r.user_id=$1
	where m.status=1
	  and ($2='' or m.title ilike '%'||$2||'%' or coalesce(m.content,'') ilike '%'||$2||'%')
	  and ($3='all' or ($3='read' and r.read_at is not null) or ($3='unread' and r.read_at is null))
`

const messageInsertReturning = `
	insert into sys_site_message
	(source,source_key,level,title,content,action_label,action_url,action_target,popup,status,published_at,expires_at,created_by,metadata,created_at,updated_at)
	values ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,coalesce($10,now()),$11,$12,$13,now(),now())
	returning id,source,coalesce(source_key,''),level,title,coalesce(content,''),coalesce(action_label,''),
	          coalesce(action_url,''),action_target,popup,status,published_at,expires_at,coalesce(created_by,0),coalesce(metadata,'{}'::jsonb),null::timestamp
`

func scanDatabaseMessage(row databaseRowScanner) (SiteMessage, error) {
	var value SiteMessage
	var publishedAt time.Time
	var expiresAt *time.Time
	var readAt *time.Time
	var metadata []byte
	err := row.Scan(
		&value.ID, &value.Source, &value.SourceKey, &value.Level, &value.Title, &value.Content,
		&value.ActionLabel, &value.ActionURL, &value.ActionTarget, &value.Popup, &value.Status,
		&publishedAt, &expiresAt, &value.CreatedBy, &metadata, &readAt,
	)
	if err != nil {
		return SiteMessage{}, err
	}
	value.PublishedAt = formatDatabaseTime(publishedAt)
	if expiresAt != nil {
		value.ExpiresAt = formatDatabaseTime(*expiresAt)
	}
	if readAt != nil {
		value.ReadAt = formatDatabaseTime(*readAt)
		value.IsRead = true
	}
	var messageMetadata SiteMessageMetadata
	if len(metadata) > 0 && string(metadata) != "{}" && json.Unmarshal(metadata, &messageMetadata) == nil {
		value.Metadata = &messageMetadata
	}
	return value, nil
}

func optionalDatabaseTime(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		parsed, err = time.Parse(time.RFC3339, value)
	}
	if err != nil {
		return nil, err
	}
	parsed = parsed.UTC()
	return &parsed, nil
}

func nullableString(value string) any {
	if value == "" {
		return nil
	}
	return value
}
