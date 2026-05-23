ENUM user_roles {
  user
  staff
  admin
}

Table users {
  id int [pk, increment]
  first_name varchar(50) [not null]
  last_name varchar(50) [not null]
  email varchar(255) [not null, unique]
  password_hash varchar(255) [not null]
  phone varchar(50) [not null]
  role user_roles [not null, default: 'user']
  created_at  datetime
  updated_at  datetime
  deleted_at  datetime
}

Enum property_types {
  house
  apartment
  land
  parking
  building
  office
  retail_space
  warehouse
  business_assets
}

Table properties {
  id int [pk, increment]
  agency_id int [ref: > agencies.id]
  title varchar(255) [not null]
  description text [not null]
  property_type property_types [not null]
  address varchar(255) [not null]
  city varchar(255) [not null]
  postal_code varchar(50) [not null]
  price float [not null]
  size int [not null]
  rooms_count int [not null]
  is_available boolean [not null, default: 1]
  created_at  datetime
  updated_at  datetime
  deleted_at  datetime
}

ENUM agency_status {
  open
  closed
  planned
  temporarily_closed
}

Table agencies {
  id int [pk, increment]
  name varchar(255) [not null]
  description text [not null]
  email varchar(255) [not null, unique]
  address varchar(255) [not null]
  city varchar(255) [not null]
  postal_code varchar(50) [not null]
  phone varchar(50) [not null]
  agency_status agency_status [not null]
  created_at  datetime
  updated_at  datetime
  deleted_at  datetime
}

Table property_images {
  id int [pk,increment]
  property_id int [ref: > properties.id]
  image_url varchar(255) [not null]
  description text [not null]
  is_cover boolean [not null]
  created_at  datetime
  updated_at  datetime
  deleted_at  datetime

  Indexes {
    (is_cover, property_id) [unique]
  }
}

Table staff_agencies {
  id int [pk,increment]
  user_id int [ref: > users.id]
  agency_id int [ref: > agencies.id]
  created_at  datetime
  updated_at  datetime
  deleted_at  datetime
}