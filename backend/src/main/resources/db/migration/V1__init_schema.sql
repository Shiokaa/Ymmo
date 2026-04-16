BEGIN;

CREATE TABLE
    agencies (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        address VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        postal_code VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'OPEN' NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        deleted_at TIMESTAMP
    );

CREATE TABLE
    users (
        id UUID PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'USER' NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        deleted_at TIMESTAMP
    );

CREATE TABLE
    staff_agencies (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users (id),
        agency_id UUID NOT NULL REFERENCES agencies (id),
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        deleted_at TIMESTAMP
    );

CREATE TABLE
    properties (
        id UUID PRIMARY KEY,
        agency_id UUID NOT NULL REFERENCES agencies (id),
        title VARCHAR(255) NOT NULL,
        description VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'HOUSE' NOT NULL,
        address VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        postal_code VARCHAR(255) NOT NULL,
        price NUMERIC(38, 2) NOT NULL,
        size INTEGER NOT NULL,
        rooms_count INTEGER NOT NULL,
        available BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        deleted_at TIMESTAMP
    );

CREATE TABLE
    property_images (
        id UUID PRIMARY KEY,
        property_id UUID NOT NULL REFERENCES properties (id),
        image_url VARCHAR(255),
        description VARCHAR(255),
        is_cover BOOLEAN,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        deleted_at TIMESTAMP
    );

CREATE UNIQUE INDEX unique_cover_per_property ON property_images (property_id)
WHERE
    is_cover = true;

COMMIT;