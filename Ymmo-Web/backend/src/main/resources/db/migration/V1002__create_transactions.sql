BEGIN;

CREATE TABLE
    transactions (
        id UUID PRIMARY KEY,
        property_id UUID NOT NULL REFERENCES properties (id),
        client_id UUID NOT NULL REFERENCES users (id),
        agent_id UUID REFERENCES users (id),
        status VARCHAR(50) DEFAULT 'INITIATED' NOT NULL,
        amount NUMERIC(12, 2),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    );

COMMIT;
