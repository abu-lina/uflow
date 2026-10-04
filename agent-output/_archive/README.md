# Archive

Every subdirectory here was previously at `agent-output/<dir>/` and moved in issue #517, when the GitHub issue replaced local tracking files as the pipeline's request ID and state store.

Any reference of the form `agent-output/<dir>/...` resolves to `agent-output/_archive/<dir>/...`. References inside this directory were left as-is; they are history.

New durable artifacts (test logs, screenshots, research docs) go to `agent-output/artifacts/` instead.
