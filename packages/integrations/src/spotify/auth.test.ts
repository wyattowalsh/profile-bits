import { describe, expect, it } from "vitest";
import {
  assertSpotifyActionToken,
  assertSpotifyClientCredentials,
  decideSpotifyToken,
  isSpotifyClientIdMissing,
  isSpotifyClientSecretMissing,
  isSpotifyTokenMissing,
  SPOTIFY_AUTH,
  SPOTIFY_CACHE_AUTH,
  SPOTIFY_CLIENT_ID_ENV,
  SPOTIFY_CLIENT_SECRET_ENV,
  SPOTIFY_TOKEN_URL,
  spotifyAuthorizationHeader,
  spotifyClientBasicAuthorization,
  spotifyRequiresAuthorization,
  spotifySecrets,
  spotifyTokenRequestBody,
} from "./auth.js";

const REFRESH = "spotify-refresh-secret";
const ACCESS = "spotify-access-secret";
const SECRET = "spotify-client-secret";

describe("spotify oauth-refresh auth", () => {
  it("treats empty refresh tokens as missing and fail_jobs when pack is on", () => {
    expect(SPOTIFY_AUTH).toBe("required");
    expect(spotifyRequiresAuthorization()).toBe(true);
    expect(isSpotifyTokenMissing(undefined)).toBe(true);
    expect(isSpotifyTokenMissing("")).toBe(true);
    expect(isSpotifyTokenMissing("   ")).toBe(true);
    expect(decideSpotifyToken({ token: "", packEnabled: true })).toBe(
      "fail_job",
    );
    expect(decideSpotifyToken({ token: REFRESH, packEnabled: false })).toBe(
      "render",
    );
    expect(
      decideSpotifyToken({
        token: undefined,
        packEnabled: false,
      }),
    ).toBe("render");
    expect(() => assertSpotifyActionToken("")).toThrow(/spotify_token/);
    expect(() => assertSpotifyActionToken(REFRESH)).not.toThrow();
  });

  it("fail_jobs missing client credentials when pack is on", () => {
    expect(isSpotifyClientIdMissing("")).toBe(true);
    expect(isSpotifyClientSecretMissing("  ")).toBe(true);
    expect(
      decideSpotifyToken({
        token: REFRESH,
        clientId: "",
        clientSecret: SECRET,
        packEnabled: true,
      }),
    ).toBe("fail_job");
    expect(
      decideSpotifyToken({
        token: REFRESH,
        clientId: "id",
        clientSecret: SECRET,
        packEnabled: true,
      }),
    ).toBe("render");
    expect(() => assertSpotifyClientCredentials("", SECRET)).toThrow(
      /SPOTIFY_CLIENT_ID/,
    );
    expect(() => assertSpotifyClientCredentials("id", "")).toThrow(
      /SPOTIFY_CLIENT_SECRET/,
    );
    expect(SPOTIFY_CLIENT_ID_ENV).toBe("SPOTIFY_CLIENT_ID");
    expect(SPOTIFY_CLIENT_SECRET_ENV).toBe("SPOTIFY_CLIENT_SECRET");
  });

  it("builds refresh_token body and Basic client credentials, Bearer access header", () => {
    const body = spotifyTokenRequestBody(REFRESH);
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain(`refresh_token=${REFRESH}`);
    expect(body).not.toContain("Bearer");
    const basic = spotifyClientBasicAuthorization("cid", SECRET);
    expect(basic.Authorization).toMatch(/^Basic /);
    expect(basic.Authorization).not.toContain(SECRET);
    expect(
      Buffer.from(basic.Authorization?.slice(6) ?? "", "base64").toString(
        "utf8",
      ),
    ).toBe(`cid:${SECRET}`);
    expect(spotifyAuthorizationHeader(ACCESS)).toEqual({
      Authorization: `Bearer ${ACCESS}`,
    });
    expect(spotifyAuthorizationHeader(ACCESS)?.Authorization).not.toContain(
      REFRESH,
    );
    expect(spotifyAuthorizationHeader("")).toEqual({});
    expect(spotifyAuthorizationHeader(undefined)).toEqual({});
    expect(spotifyAuthorizationHeader("")).not.toEqual({ Authorization: "" });
    expect(SPOTIFY_TOKEN_URL).toBe("https://accounts.spotify.com/api/token");
    expect(SPOTIFY_CACHE_AUTH).toBe("bearer");
  });

  it("collects secrets for redaction and never names yaml keys", () => {
    expect(
      spotifySecrets({ refreshToken: REFRESH, clientSecret: SECRET }),
    ).toEqual([REFRESH, SECRET]);
    expect(spotifySecrets({ accessToken: ACCESS })).toEqual([ACCESS]);
    const source = [SPOTIFY_CLIENT_ID_ENV, SPOTIFY_CLIENT_SECRET_ENV].join(
      "\n",
    );
    expect(source).not.toMatch(/plugin_spotify/);
    expect(source).not.toMatch(/plugin_<plugin>_<widget>_<option>/);
  });
});
