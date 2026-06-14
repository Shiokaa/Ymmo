BEGIN;

CREATE TABLE
    requests (
        id UUID PRIMARY KEY,
        property_id UUID NOT NULL REFERENCES properties (id),
        user_id UUID NOT NULL REFERENCES users (id),
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
    );

COMMIT;
