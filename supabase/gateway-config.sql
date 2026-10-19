-- Runtime values stay in Vault. This definition contains no secret values.
create function public.stereo_watch_gateway_config()
returns jsonb language sql stable security invoker set search_path = ''
as $$
select jsonb_build_object(
 'siteBearer', (select decrypted_secret from vault.decrypted_secrets where name='stereo_watch_sites_service_bearer'),
 'accessHash', (select decrypted_secret from vault.decrypted_secrets where name='stereo_watch_gateway_access_hash')
);
$$;
revoke all on function public.stereo_watch_gateway_config() from public, anon, authenticated;
grant execute on function public.stereo_watch_gateway_config() to service_role;
