-- V999 contenait un hash bcrypt placeholder invalide : aucun compte de test n'était connectable.
-- On remet un vrai hash bcrypt correspondant au mot de passe « password123 » pour les comptes seedés.
-- (En production, V999 n'est pas chargée : cette migration ne touche alors aucune ligne.)
UPDATE users
SET password_hash = '$2a$10$CIqF3GOzBgzgUSONXwfbnO8hivMP2YFzEdukIsuZX08dMQbEDFIx2'
WHERE email IN ('admin@ymmo.fr', 'agent.paris@ymmo.fr', 'user@ymmo.fr');
