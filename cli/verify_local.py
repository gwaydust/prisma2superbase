#!/usr/bin/env python
"""
Offline regression test for prisma-to-supabase.

Runs the CLI against the bundled sample schema (test-project/prisma/schema.prisma)
and asserts the generated artefacts contain the right structure. No network.

Run directly:      python cli/verify_local.py
Or via npm:        npm run verify:local
"""

import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SCHEMA = os.path.join(ROOT, 'test-project', 'prisma', 'schema.prisma')

CHECKS = []


def check(label, condition, detail=''):
    CHECKS.append((label, bool(condition), detail))
    print(f'{"PASS" if condition else "FAIL"}  {label}' + (f'  [{detail}]' if detail and not condition else ''))


def main():
    if not os.path.exists(SCHEMA):
        print(f'sample schema missing: {SCHEMA}')
        sys.exit(1)

    tmp = tempfile.mkdtemp(prefix='p2s_local_')
    proc = subprocess.run(
        ['node', os.path.join(HERE, 'dist', 'cli.js'), 'generate',
         '--schema', SCHEMA, '--output', os.path.join(tmp, 'migrations')],
        capture_output=True, text=True, timeout=120,
    )

    check('CLI exits 0', proc.returncode == 0, proc.stderr[-300:])
    if proc.returncode != 0:
        return finish()

    mdir = os.path.join(tmp, 'migrations')
    files = os.listdir(mdir) if os.path.isdir(mdir) else []
    sql = read([f for f in files if 'initial_schema' in f], mdir)
    rls = read([f for f in files if 'rls_policies' in f], mdir)
    rt = read([f for f in files if 'realtime_setup' in f], mdir)
    auth = read([f for f in files if 'auth_helpers' in f], mdir)
    tsf = os.path.join(tmp, 'types', 'database.ts')
    ts = open(tsf, encoding='utf-8').read() if os.path.exists(tsf) else ''

    # --- schema SQL ---
    check('5 tables created', sql.count('CREATE TABLE') == 5, f'got {sql.count("CREATE TABLE")}')
    check('4 foreign keys emitted', sql.count('REFERENCES') == 4, f'got {sql.count("REFERENCES")}')
    check('4 FK indexes emitted', sql.count('CREATE INDEX') == 4, f'got {sql.count("CREATE INDEX")}')

    check('UUID id with gen_random_uuid()',
          '"id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()' in sql)
    check('createdAt uses now()', '"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()' in sql)
    check('boolean default false', '"published" BOOLEAN NOT NULL DEFAULT false' in sql)

    check('FK: profile.userId -> user.id', 'REFERENCES "user"("id")' in sql)
    check('FK: comment.postId -> post.id', 'REFERENCES "post"("id")' in sql)

    # The bug this guards against: relation fields leaking in as text columns.
    check('no junk column "profile" TEXT', '"profile" TEXT' not in sql)
    check('no junk column "author" TEXT', '"author" TEXT' not in sql)
    check('no junk column "posts"', not re.search(r'"posts"\s', sql))

    # --- RLS ---
    check('RLS enabled on tables', sql.count('CREATE TABLE') == rls.count('ENABLE ROW LEVEL SECURITY'))
    check('RLS policies use auth.uid()', 'auth.uid()' in rls)
    # Quoted, case-sensitive owner columns — unquoted camelCase folds to lowercase
    # and the policy would reference a column that does not exist.
    check('RLS owner column quoted', '"userId"' in rls and '"authorId"' in rls)
    check('RLS casts uuid to text for TEXT owner columns',
          'auth.uid()::text = "userId"' in rls and 'auth.uid()::text = "authorId"' in rls)
    check('no unquoted owner column in policy',
          not re.search(r'auth\.uid\(\)(?:::text)? = (?!")', rls))

    # --- Realtime / Auth ---
    check('Realtime publication updated', 'ALTER PUBLICATION supabase_realtime ADD TABLE' in rt)
    check('Auth helper current_user_id()', 'current_user_id()' in auth)

    # --- TypeScript ---
    check('TS interface User present', 'export interface User {' in ts)
    check('TS maps relation posts: Post[]', 'posts: Post[];' in ts)
    check('TS maps relation author: User', 'author: User;' in ts)
    check('TS Database type present', 'export interface Database {' in ts)

    return finish()


def read(names, mdir):
    for n in names:
        p = os.path.join(mdir, n)
        if os.path.exists(p):
            return open(p, encoding='utf-8').read()
    return ''


def finish():
    passed = sum(1 for _, ok, _ in CHECKS if ok)
    total = len(CHECKS)
    print(f'\n{passed}/{total} checks passed')
    sys.exit(0 if passed == total else 1)


if __name__ == '__main__':
    main()