BEGIN;

-- UUIDs fixes pour pouvoir gérer les relations plus facilement
-- Agencies
INSERT INTO
    agencies (
        id,
        name,
        description,
        email,
        address,
        city,
        postal_code,
        phone,
        status,
        created_at,
        updated_at
    )
VALUES
    (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Ymmo Paris Centre',
        'Agence principale au coeur de Paris',
        'paris@ymmo.fr',
        '15 rue de Rivoli',
        'Paris',
        '75001',
        '0102030405',
        'OPEN',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'Ymmo Lyon Presqu''île',
        'L''expertise Lyonnaise à votre service',
        'lyon@ymmo.fr',
        '2 Place Bellecour',
        'Lyon',
        '69002',
        '0405060708',
        'OPEN',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- Users (Mots de passe générés fictifs ou hashes bcrypt classiques (ex: 'password' => '$2a$10$X8...'))
-- Ici on met un hash qui correspond à "password123" pour permettre des tests.
INSERT INTO
    users (
        id,
        first_name,
        last_name,
        email,
        password_hash,
        phone,
        role,
        created_at,
        updated_at
    )
VALUES
    (
        '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Jean',
        'Dupont',
        'admin@ymmo.fr',
        '$2a$10$G0N0b.zXZN8wXYJ4/k8eueq1.4P6P3R1oZ3m6V5U4xH9vI3Y.rR1W',
        '0601020304',
        'ADMIN',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'Alice',
        'Martin',
        'agent.paris@ymmo.fr',
        '$2a$10$G0N0b.zXZN8wXYJ4/k8eueq1.4P6P3R1oZ3m6V5U4xH9vI3Y.rR1W',
        '0605060708',
        'AGENT',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        '33eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        'Paul',
        'Durand',
        'user@ymmo.fr',
        '$2a$10$G0N0b.zXZN8wXYJ4/k8eueq1.4P6P3R1oZ3m6V5U4xH9vI3Y.rR1W',
        '0708091011',
        'USER',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- Staff Agencies (Liés les agents aux agences)
INSERT INTO
    staff_agencies (id, user_id, agency_id, created_at, updated_at)
VALUES
    (
        'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- Properties
INSERT INTO
    properties (
        id,
        agency_id,
        title,
        description,
        type,
        address,
        city,
        postal_code,
        price,
        size,
        rooms_count,
        available,
        created_at,
        updated_at
    )
VALUES
    (
        'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Superbe T3 au centre de Paris',
        'Appartement lumineux, idéalement situé avec vue dégagée.',
        'APARTMENT',
        '10 rue des Halles',
        'Paris',
        '75001',
        450000.00,
        65,
        3,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'Maison familiale spacieuse',
        'Grande maison avec jardin et garage privé.',
        'HOUSE',
        '15 avenue de la République',
        'Lyon',
        '69003',
        320000.00,
        120,
        5,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- Property Images
INSERT INTO
    property_images (
        id,
        property_id,
        image_url,
        description,
        is_cover,
        created_at,
        updated_at
    )
VALUES
    (
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
        'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
        'Salon',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
        'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
        'Façade avant',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

COMMIT;