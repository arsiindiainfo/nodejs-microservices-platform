# Trademark Notice

The source code in this repository is licensed under the MIT License (see
[`LICENSE`](./LICENSE)). That license covers the *code* — it does not grant
any rights to the **Arsi India Info** name, logo, or brand assets that appear
throughout this repository and its documentation.

## What this means in practice

- **You may** fork, modify, self-host, and build on this code — including
  for commercial purposes — under the terms of the MIT License.
- **You may not** present a fork or derivative of this project as Arsi India
  Info's own product, or reuse the Arsi India Info name or logo in a way that
  suggests Arsi India Info created, endorses, or is affiliated with your
  version.
- If you fork this project, please replace the branding surfaces listed
  below with your own before distributing or deploying it under a different
  name.

## Where the branding lives

| Surface | Branding element |
|---|---|
| Every service | `X-Powered-By: Arsi-India-Info` response header (`libs/common`'s `PoweredByInterceptor`) |
| Gateway | `GET /api/v1/about` — public endpoint returning project + author metadata |
| OpenAPI (`/api/docs`) | `info.contact` and `info.license` fields |
| Source files | Copyright header banner (see `docs/contributing.md`) |
| This repository | README, this file, and the original plan document |

## Honest limits

A footer string, a header, or a logo can be stripped by a determined fork —
none of this is a technical enforcement mechanism. Real proof of authorship
comes from Git history itself: commits under the Arsi India Info GitHub
organization and this repository's own commit log are the actual record of
who built what and when.

---

© 2026 Arsi India Info. All rights reserved for the name and logo.
