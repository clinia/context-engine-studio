# Contributing

The code is open. The project is not open to contributions.

That reads harshly, so this file explains what it actually means, what we do want from you, and why the distinction exists. The short version: **reports and ideas are welcome and read; pull requests cannot be merged here by anyone.** Everything below is best-effort — Studio is free and maintained alongside Clinia's product work, so nothing here is a commitment to respond, triage, or fix on any timeframe.

## Before anything else: never include patient data

Studio is used with health records. Do not put patient data, protected health information, credentials, tokens, workspace identifiers, or internal hostnames in an issue, a discussion, a screenshot, or a pasted log — not even redacted, not even your own test data if it originated from a real record. Reproduce with synthetic data instead; the README points at a fully synthetic patient built for exactly this.

If you've already posted something you shouldn't have, email <security@clinia.com> rather than deleting it quietly — deleted content can persist in caches, notification emails, and forks.

## Where to take things

| You have                                          | Go here                                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A bug in Studio itself                            | [Issues](../../issues) — pick the Studio bug template                                     |
| An idea for Studio                                | [Issues](../../issues) — pick the feature request template                                |
| A question, or something you're not sure is a bug | [Discussions](../../discussions)                                                          |
| A workspace, credential, ingest, or API error     | <support@clinia.com>. These are service-side and cannot be diagnosed from this repository |
| A security vulnerability                          | [`SECURITY.md`](SECURITY.md) — never a public issue                                       |

That fourth row catches most misfiled reports. "My ingest failed" or "I get a 401" is almost always the engine or your workspace, not this application. Studio holds no data and runs no engine; it only renders what the API returns.

## Why there are no pull requests

Not a judgement on the quality of contributions. It's mechanical:

This repository publishes each tagged release of Studio. The release job replaces `main` wholesale, and the branch rules admit no other writer — so a pull request opened here cannot be merged, by you or by us. Merging one would be undone by the next release even if it were possible. The git history is release-grained rather than commit-grained for the same reason.

A PR opened here will most likely just be closed with a pointer to this file. That isn't a rejection of the idea — describe the change in an issue instead, where it can at least be read. If it does get built and you'd like credit in the changelog, say so.

By submitting a patch or a code suggestion in an issue or discussion, you agree it is licensed under Apache-2.0 in accordance with Section 5 of [`LICENSE`](LICENSE). There is no CLA to sign.

## What a good report looks like

The templates ask for what we actually need. Beyond filling them in:

- **Say which release.** Studio is versioned in lockstep with the engine, so `v0.4.1` tells us which engine behaviour you saw. "Latest" doesn't.
- **Separate what you saw from what you concluded.** The conclusion is useful; we just need to be able to tell them apart.
- **Include the server-side log line if you have one.** Studio's failures are often the API's failures surfaced late.
- **One report per problem.** Two bugs in one issue means one of them gets forgotten.

## If a fix happens

Any fix is made upstream and appears here in a later release. Two honest consequences:

**You cannot watch a fix develop.** There's nothing public to follow — no branch, no commits, no review thread. That's worse than a normal open-source project, and it's the trade for the code being published at all.

**Nothing arrives at commit granularity.** An issue that does get resolved is resolved against a release: "fixed in vX.Y.Z", pointing at the tag and its entry in the [changelog](https://docs.clinia.com/changelog). There's no way to get a fix sooner than the release that carries it, and no schedule for when that is.

## Where the changelog is

There's deliberately no `CHANGELOG.md` in this repository. The changelog lives at **<https://docs.clinia.com/changelog>**, one entry per version, and it's what "fixed in vX.Y.Z" above refers to. Three things to know about it:

- **It covers Studio and the engine together.** They're versioned in lockstep and released as one, so a single entry describes both. That's also why a Studio release exists for versions where nothing in Studio itself changed.
- **It's written by hand, not generated.** It describes what you can now do, in prose. It is not a commit log — there are no SHAs to look up and no diffs to read, which is the same constraint as everything else on this page.
- **If the entry for a version doesn't mention your problem, the fix isn't in it.** Say so on the issue rather than assuming; a released version with no entry describing your bug means it wasn't fixed there.

## Working on the code locally

Fork it, run it, take it apart — that's what the licence is for. [`README.md`](README.md) has the prerequisites and quickstart; you'll need a Clinia workspace and credentials, or an unsecured Context Engine server you run yourself.

Before you judge whether a change of yours is sound:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

There is no test suite in this repository. That's a real gap, not an omission from these docs.

## Conduct

[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) applies to Issues, Discussions, and every other space attached to this repository.
