/**
 * Declared Spotify scopes. Not Marketplace / Action inputs.
 */
export const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-top-read",
] as const;

export type SpotifyScope = (typeof SPOTIFY_SCOPES)[number];
