import * as z from "zod";

/** Permissive dump: keep extra keys. Widgets select known fields. */
export const SpotifyDumpSchema = z
  .object({
    currently_playing: z.unknown(),
    recently_played: z.unknown(),
    top_tracks: z.unknown(),
  })
  .passthrough();

export type SpotifyDump = z.infer<typeof SpotifyDumpSchema>;

export const SpotifyTokenResponseSchema = z
  .object({
    access_token: z.string().min(1),
    token_type: z.string().optional(),
    expires_in: z.number().optional(),
    scope: z.string().optional(),
    refresh_token: z.string().optional(),
  })
  .passthrough();

export type SpotifyTokenResponse = z.infer<typeof SpotifyTokenResponseSchema>;

export function parseSpotifyDump(value: unknown): SpotifyDump {
  return SpotifyDumpSchema.parse(value);
}

export function parseSpotifyTokenResponse(
  value: unknown,
): SpotifyTokenResponse {
  return SpotifyTokenResponseSchema.parse(value);
}
