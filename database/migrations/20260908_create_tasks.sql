begin;

create table if not exists app_task_list (
    id bigserial primary key,
    owner_id integer not null references sys_user(id) on delete cascade,
    title varchar(120) not null,
    sort_order bigint not null default 0,
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create unique index if not exists app_task_list_owner_default_unique
    on app_task_list (owner_id)
    where is_default and deleted_at is null;

create index if not exists app_task_list_owner_order_idx
    on app_task_list (owner_id, sort_order, id)
    where deleted_at is null;

create table if not exists app_task (
    id bigserial primary key,
    owner_id integer not null references sys_user(id) on delete cascade,
    list_id bigint not null references app_task_list(id),
    parent_id bigint references app_task(id),
    title varchar(255) not null,
    details text not null default '',
    scheduled_at timestamptz,
    deadline_at timestamptz,
    time_zone varchar(64) not null default 'UTC',
    is_starred boolean not null default false,
    starred_at timestamptz,
    completed_at timestamptz,
    sort_order bigint not null default 0,
    repeat_frequency varchar(16) not null default 'none',
    repeat_interval integer not null default 1,
    repeat_end_mode varchar(16) not null default 'never',
    repeat_end_date date,
    repeat_count integer not null default 0,
    repeat_series_id bigint references app_task(id),
    notification_sent_for timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint app_task_repeat_frequency_check
        check (repeat_frequency in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
    constraint app_task_repeat_end_mode_check
        check (repeat_end_mode in ('never', 'date', 'count')),
    constraint app_task_repeat_interval_check
        check (repeat_interval between 1 and 999),
    constraint app_task_repeat_count_check
        check (repeat_count between 0 and 9999),
    constraint app_task_parent_not_self_check
        check (parent_id is null or parent_id <> id)
);

create index if not exists app_task_owner_list_order_idx
    on app_task (owner_id, list_id, parent_id, sort_order, id)
    where deleted_at is null;

create index if not exists app_task_owner_completed_idx
    on app_task (owner_id, list_id, completed_at)
    where deleted_at is null;

create index if not exists app_task_owner_starred_idx
    on app_task (owner_id, starred_at desc, id desc)
    where is_starred and deleted_at is null;

create index if not exists app_task_due_notification_idx
    on app_task (owner_id, scheduled_at, deadline_at)
    where completed_at is null and deleted_at is null;

create index if not exists app_task_repeat_series_idx
    on app_task (owner_id, repeat_series_id)
    where repeat_series_id is not null and deleted_at is null;

commit;
