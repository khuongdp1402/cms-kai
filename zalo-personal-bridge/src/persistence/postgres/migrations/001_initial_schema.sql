CREATE TABLE IF NOT EXISTS zalo_integrations (
  id VARCHAR(255) PRIMARY KEY,
  account_id BIGINT NOT NULL,
  inbox_id BIGINT,
  status VARCHAR(64) NOT NULL DEFAULT 'needs_qr',
  encrypted_credentials TEXT,
  key_id VARCHAR(64),
  session_generation BIGINT NOT NULL DEFAULT 0,
  zalo_user_id VARCHAR(255),
  display_name VARCHAR(255),
  avatar_url TEXT,
  capabilities JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_zalo_integrations_zalo_user_id 
ON zalo_integrations(zalo_user_id) 
WHERE status != 'disabled' AND zalo_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS zalo_integration_leases (
  integration_id VARCHAR(255) PRIMARY KEY REFERENCES zalo_integrations(id) ON DELETE CASCADE,
  pod_id VARCHAR(255) NOT NULL,
  lease_until TIMESTAMP WITH TIME ZONE NOT NULL,
  fencing_token BIGINT NOT NULL DEFAULT 1,
  renewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zalo_threads (
  integration_id VARCHAR(255) NOT NULL REFERENCES zalo_integrations(id) ON DELETE CASCADE,
  thread_id VARCHAR(255) NOT NULL,
  thread_type VARCHAR(32) NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  member_count INT,
  metadata JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (integration_id, thread_type, thread_id)
);

CREATE TABLE IF NOT EXISTS zalo_outbound_deliveries (
  delivery_id UUID PRIMARY KEY,
  integration_id VARCHAR(255) NOT NULL REFERENCES zalo_integrations(id) ON DELETE CASCADE,
  idempotency_key VARCHAR(255) NOT NULL,
  payload_sha256 VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  fencing_token BIGINT,
  provider_message_ids JSONB DEFAULT '[]',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_zalo_outbound_idempotency 
ON zalo_outbound_deliveries(integration_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_zalo_outbound_status 
ON zalo_outbound_deliveries(status, created_at);

CREATE TABLE IF NOT EXISTS zalo_inbound_events (
  event_id VARCHAR(255) PRIMARY KEY,
  integration_id VARCHAR(255) NOT NULL REFERENCES zalo_integrations(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  sequence BIGINT NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zalo_inbound_status 
ON zalo_inbound_events(status, created_at);
