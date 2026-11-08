# Workstream: widen-http

Wave 2. Json is already a dump (`unknown`). Type it without stripping. Chips: cache raw badge JSON; normalize stays a widget reader.

## Files

- `packages/integrations/src/http/{client,normalize,presets}.ts`
- `packages/integrations/src/cache.ts`
- `packages/plugins/src/http/widgets/{json,chips}/**`

## Steps

1. Keep full JSON value for json widget; optional schema without dropping keys.
2. Chips cache `{label,message,color,name,value,link}`; `normalizeBadgeJson` at widget.
3. Chips GETs stay `auth: none`, origins `shieldcn.dev` + `img.shields.io`.
4. SSRF, 1 MiB, no octokit, no new vendor integration ids.

## Verify

- shieldcn fixture keeps `link`/`value` in cache
- Chips render still uses message/label/color
- Json JMESPath still widget-side

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W2-HTTP-01 | H0 | — |
| W2-HTTP-02 | H1 | HTTP-01 |
| W2-HTTP-03 | H2 | HTTP-02 |
| W2-HTTP-04 | H2 | HTTP-02 |
| W2-HTTP-05 | H3 | HTTP-03, HTTP-04 |
| W2-HTTP-06 | H4 | HTTP-05 |
