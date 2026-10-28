-- FIX: append_audit_log doesn't set tenant_id — uses hardcoded default (tenant A)
-- Also: remove default from audit_logs.tenant_id (same pattern as bundle_components)

CREATE OR REPLACE FUNCTION public.append_audit_log(
  p_actor_id text,
  p_action text,
  p_entity_ref text,
  p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prev_hash text;
  v_new_hash text;
  v_id uuid;
  v_payload_str text;
  v_created_at timestamptz;
  v_tenant_id uuid;
BEGIN
  v_created_at := now();

  -- Get caller's tenant_id
  SELECT m.tenant_id INTO v_tenant_id
    FROM public.tenant_memberships m
    WHERE m.user_id = auth.uid()
      AND m.status = 'active'
    ORDER BY m.created_at
    LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Khong co quyen: ban khong thuoc tenant nao' USING ERRCODE = '42501';
  END IF;

  SELECT current_hash INTO v_prev_hash FROM audit_logs
    WHERE tenant_id = v_tenant_id
    ORDER BY created_at DESC, id DESC LIMIT 1;

  v_payload_str := coalesce(p_payload::text, '{}');
  v_new_hash := encode(
    digest(
      coalesce(v_prev_hash, 'GENESIS') || '|' || v_payload_str || '|' || p_action || '|' || coalesce(p_entity_ref, '') || '|' || v_created_at::text,
      'sha256'
    ),
    'hex'
  );

  INSERT INTO audit_logs (id, actor_id, action, entity_ref, payload_json, prev_hash, current_hash, created_at, tenant_id)
  VALUES (gen_random_uuid(), p_actor_id, p_action, p_entity_ref, p_payload, v_prev_hash, v_new_hash, v_created_at, v_tenant_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Remove hardcoded default from audit_logs.tenant_id
ALTER TABLE public.audit_logs ALTER COLUMN tenant_id DROP DEFAULT;
