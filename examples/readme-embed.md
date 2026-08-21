Embed relatives that match `output_dir` + widget `filename` + format (default `profile-bits/` + `svg`). The Action commits widget files; it does not patch `README.md`.

```md
![](./profile-bits/stats.svg)
![](./profile-bits/languages.svg)
![](./profile-bits/chips.svg)
```

With `output_pair: false` (default), `stats.svg` is the **selected flavor**. With `output_pair: true`, the unsuffixed file is **light** and `filename-dark` is dark — pair embeds should use `<picture>`, not a lone `stats.svg`.
