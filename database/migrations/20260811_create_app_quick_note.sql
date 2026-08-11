create table if not exists app_quick_note (
    id bigserial primary key,
    owner_id integer not null references sys_user (id) on delete cascade,
    title varchar(120) not null,
    content text not null default '',
    is_pinned boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

create index if not exists app_quick_note_owner_active_idx
    on app_quick_note (owner_id, is_pinned desc, updated_at desc, id desc)
    where deleted_at is null;
