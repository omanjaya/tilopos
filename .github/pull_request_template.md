## Summary

<!-- What does this change and why? Link the issue / audit finding. -->

## Checklist

- [ ] Follows [Docs/ENGINEERING-RULES.md](../Docs/ENGINEERING-RULES.md)
- [ ] `npm run lint:check` passes
- [ ] Tests added/updated (tenant scoping, authorization, money, idempotency changes need a spec)
- [ ] Schema changes ship as a Prisma migration (no `db push`)
- [ ] New env variables added to the `.env.example` files, `k8s/base/configmap.yaml` / `secrets.yaml.example`
- [ ] CHANGELOG.md `Unreleased` updated for user-visible changes
