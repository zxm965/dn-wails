update sys_session
set expires_at = '9999-12-31 23:59:59+00'::timestamptz,
    updated_at = now()
where user_agent = 'dn-wails'
  and revoked_at is null;
