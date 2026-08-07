# Security Policy

## Reporting a vulnerability

Email **<security@clinia.com>**. Do not open a public issue, discussion, or pull request for a suspected vulnerability.

Include what you need to make the problem understandable: affected version or tag, the component, what an attacker can do, and the steps to reproduce it. A proof of concept helps; so does telling us what you're unsure about.

**Do not include patient data or protected health information in a report** — not real data, and not data derived from a real record. If reproducing the issue seems to require it, say so and describe it instead; the README points at a fully synthetic patient to reproduce against. The same goes for credentials and tokens: if you found a live one, tell us where it is rather than pasting it.

You can write in English or French.

## What to expect

Reports are read and handled on a best-effort basis. Studio is a free reference application maintained alongside Clinia's product work, so this policy carries no response-time commitment, no service level, and no undertaking that any particular report is investigated, prioritised, or fixed. Nothing here creates an obligation or a warranty — the disclaimer in [`LICENSE`](LICENSE) applies to this policy too.

Setting expectations honestly rather than generously: you may not hear back quickly, and a report that we agree is real may still wait on a release. If a report gets a fix and you'd like credit, say so and we'll try to include it.

We'd appreciate a chance to release a fix before you publish details, though that is a request rather than a condition. There is no bug bounty programme.

## Scope

**In scope** — this repository: the Studio application, its server-side routes, its handling of credentials and tokens, its local chat database, and its dependency surface as declared here.

**Out of scope for this repository** — the hosted Clinia Context Engine, the workspace API, the Clinia Console, and the authorization server. Vulnerabilities in those are not Studio issues and no fix for them can come from this repository. The same address reaches us, and they're handled under Clinia's product security process rather than through this repository's advisories, so please say which you believe you've found.

Also out of scope: behaviour you get by deliberately altering Studio's configuration contract or its source to weaken it. Studio is a reference application you are expected to modify; a finding has to hold for Studio as shipped and configured as documented.

## Versions

Only the most recent release is looked at. Any fix lands in a new release rather than as a patch to an older tag, and nothing is backported — Studio is versioned in lockstep with the engine and its client, so upgrading is the only path forward.

## Running Studio safely

Studio is a reference application, not a hardened deployment target. If you run it somewhere real:

- It is a **server-side** trust boundary. Every variable in `.env.local` — the OAuth client secret and the Anthropic API key especially — is read server-side and must never reach a browser bundle.
- It has **no authentication of its own**. Anyone who can reach your Studio instance can act with the workspace credentials it holds. Put it behind your own access control, or keep it on localhost.
- The **local chat database** (`STUDIO_CHAT_DB_PATH`, SQLite) accumulates conversation history about whichever patients you loaded, in plaintext on disk. Treat that file as clinical data: it is not encrypted, and it is not covered by your workspace's retention policy.
- **Chat content goes to Anthropic.** The assistant sends patient context to the Anthropic API to answer questions. Make sure that's consistent with your agreements before pointing Studio at real records.
