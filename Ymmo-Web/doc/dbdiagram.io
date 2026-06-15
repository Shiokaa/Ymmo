// ─────────────────────────────────────────────────────────────
// Schéma de base de données Ymmo — source dbdiagram.io (DBML)
// Fidèle aux migrations Flyway (backend/src/main/resources/db/migration)
// et aux enums (backend/.../com/ymmo/enums). Ré-importer sur dbdiagram.io
// puis exporter en PNG pour régénérer doc/schema_bdd.png.
// ─────────────────────────────────────────────────────────────

// ── Enums (valeurs = constantes Java réelles) ────────────────
Enum user_role {
  USER
  AGENT
  ADMIN
}

Enum property_type {
  HOUSE
  APARTMENT
  LAND
  PARKING
  BUILDING
  OFFICE
  RETAIL_SPACE
  WAREHOUSE
  BUSINESS_ASSETS
}

Enum agency_status {
  OPEN
  CLOSED
  PLANNED
  TEMPORILY_CLOSED
}

Enum request_type {
  INFO
  VISITE
}

Enum request_status {
  PENDING
  ACCEPTED
  REFUSED
  DONE
}

Enum transaction_status {
  INITIATED
  OFFER
  NEGOTIATION
  COMPROMISE
  COMPLETED
  CANCELLED
}

// ── Tables ───────────────────────────────────────────────────
Table users {
  id uuid [pk]
  first_name varchar(255) [not null]
  last_name varchar(255) [not null]
  email varchar(255) [not null, unique]
  password_hash varchar(255) [not null]
  phone varchar(255) [not null]
  role user_role [not null, default: 'USER']
  created_at timestamp [not null]
  updated_at timestamp [not null]
  deleted_at timestamp
}

Table agencies {
  id uuid [pk]
  name varchar(255) [not null]
  description varchar(255) [not null]
  email varchar(255) [not null, unique]
  address varchar(255) [not null]
  city varchar(255) [not null]
  postal_code varchar(255) [not null]
  phone varchar(255) [not null]
  status agency_status [not null, default: 'OPEN']
  created_at timestamp [not null]
  updated_at timestamp [not null]
  deleted_at timestamp
}

Table staff_agencies {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  agency_id uuid [not null, ref: > agencies.id]
  created_at timestamp [not null]
  updated_at timestamp [not null]
  deleted_at timestamp
}

Table properties {
  id uuid [pk]
  agency_id uuid [not null, ref: > agencies.id]
  title varchar(255) [not null]
  description varchar(255) [not null]
  type property_type [not null, default: 'HOUSE']
  address varchar(255) [not null]
  city varchar(255) [not null]
  postal_code varchar(255) [not null]
  price decimal(38,2) [not null]
  size int [not null]
  rooms_count int [not null]
  available boolean [not null, default: true]
  created_at timestamp [not null]
  updated_at timestamp [not null]
  deleted_at timestamp
}

Table property_images {
  id uuid [pk]
  property_id uuid [not null, ref: > properties.id]
  image_url varchar(255)
  description varchar(255)
  is_cover boolean
  created_at timestamp [not null]
  updated_at timestamp [not null]
  deleted_at timestamp

  // Index unique PARTIEL (PostgreSQL) : une seule image de couverture par propriété
  //   CREATE UNIQUE INDEX unique_cover_per_property ON property_images (property_id) WHERE is_cover = true;
  Note: 'Index unique partiel : une seule couverture (is_cover=true) par propriété'
}

Table requests {
  id uuid [pk]
  property_id uuid [not null, ref: > properties.id]
  user_id uuid [not null, ref: > users.id]
  type request_type [not null]
  message text [not null]
  status request_status [not null, default: 'PENDING']
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]
  deleted_at timestamp
}

Table transactions {
  id uuid [pk]
  property_id uuid [not null, ref: > properties.id]
  client_id uuid [not null, ref: > users.id]
  agent_id uuid [ref: > users.id]
  status transaction_status [not null, default: 'INITIATED']
  amount decimal(12,2)
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]
  deleted_at timestamp
}
