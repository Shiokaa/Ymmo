/** Identifiants de connexion envoyés à l'API. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Réponse de connexion renvoyée par l'API (le token est aussi posé en cookie httpOnly). */
export interface LoginResponse {
  token: string;
  expiresIn: number;
}

/** Données d'inscription envoyées à l'API. */
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}
