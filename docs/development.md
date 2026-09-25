### Development

The development branch is `main`. The StratoWeave platform and the Acton
language are in active development so we frequently make backwards incompatible
changes to the language that enable a new feature in the platform or address a
bug. The `main` branch in this repository is tested with the Acton *tip* release
in CI, and vice versa, CI in the Acton repository for development branches also
includes building sorespo & dependencies from the `main` branch.

We advise our end users to install the *stable* Acton release. The `stable`
branch in this repository is guaranteed to work with the *stable* Acton release.
In practice this means that `main` is fast-forward merged into `stable` as long
as the latest Acton *stable* and *tip* releases are compatible. On every push to
`main` the [Advance stable branch](../.github/workflows/advance-stable.yml)
workflow builds and tests `main` with *stable* Acton, and advances `stable` if
it passes. However once sorespo or its dependencies start relying on new
behavior in the Acton language, or the Acton *tip* makes backwards incompatible
changes, the `stable` branch starts lagging, until a new *stable* Acton release.

The default branch in this repository is set to `stable`, so anyone that clones
this repository gets this branch. This is a convenience for users looking to try
sorespo with *stable* Acton. Unfortunately GitHub also uses the repository
default branch as the base for pull requests.

A pull request that targets `stable` must not be merged, so the [Retarget stable
pull requests](../.github/workflows/retarget-stable-prs.yml) workflow changes
its base branch to `main` and comments in the PR with an explanation.

Note: Since these automated workflows run off the default (`stable`) branch, the
effects of changes to the workflows are not visible until merged to `stable`.
