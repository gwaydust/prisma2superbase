#!/usr/bin/env python
"""
prisma-to-supabase — real-schema regression harness.

RULE: run this every time the parser or generator changes. Never trust a single
toy schema; these are real-world Prisma schemas pulled from public repos,
including large production schemas with hundreds of foreign keys.

Usage:
    python cli/verify_real_schemas.py            # run all
    python cli/verify_real_schemas.py shelf.nu   # run repos matching a substring

Auth:
    Uses the token stored in .git/config (remote URL) if present, else falls
    back to unauthenticated GitHub API (60 req/hr — enough for ~12 repos).
"""

import base64
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# The verification corpus. Deliberately includes:
#  - small starter templates (2-6 models)
#  - mid-size apps (8-16 models)
#  - a large production schema (Shelf: 66 models / 145 FKs)
REPOS = [
    "vercel/next-forge",
    "Shelf-nu/shelf.nu",
    "trycompai/comp",
    "rphlmr/supa-fly-stack",
    "uixmat/firestarta",
    "Jaaneek/t3-supabase-app-router",
    "michaelkremenetsky/Refeed",
    "anis-marrouchi/chatpdf-gpt",
    "encoredev/examples",
    "damms005/devdb-vscode",
    "noahflk/railtrack",
    "techblitzdev/TechBlitz",
]


def load_token():
    try:
        cfg = open(os.path.join(ROOT, '.git', 'config'), encoding='utf-8').read()
        m = re.search(r'url\s*=\s*https://([^@]+)@github\.com[/:]([^/\s]+)/([^\s]+?)(?:\.git)?\s*$', cfg, re.M)
        if m:
            creds = m.group(1)
            return creds.split(':', 1)[1] if ':' in creds else creds
    except OSError:
        pass
    return None


TOKEN = load_token()


def api(url):
    r = urllib.request.Request(url)
    if TOKEN:
        r.add_header('Authorization', 'Bearer ' + TOKEN)
    r.add_header('Accept', 'application/vnd.github+json')
    r.add_header('User-Agent', 'p2s-verify')
    try:
        with urllib.request.urlopen(r, timeout=60) as x:
            return x.status, json.loads(x.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception:
        return 0, None


def verify_repo(repo):
    st, info = api(f'https://api.github.com/repos/{repo}')
    if st != 200 or not info:
        return (repo, 'REPO_UNAVAILABLE', f'status={st}', '')

    branch = info.get('default_branch', 'main')
    st, tree = api(f'https://api.github.com/repos/{repo}/git/trees/{branch}?recursive=1')
    if st != 200 or not tree:
        return (repo, 'TREE_FAILED', f'status={st}', '')

    files = [t['path'] for t in tree.get('tree', [])
             if t['path'].endswith('.prisma') and t.get('type') == 'blob']
    if not files:
        return (repo, 'NO_PRISMA_SCHEMA', '', '')

    target = next((p for p in files if p.endswith('prisma/schema.prisma')), sorted(files, key=len)[0])
    st, content = api(f'https://api.github.com/repos/{repo}/contents/{target}')
    if st != 200 or not content:
        return (repo, 'FETCH_FAILED', target, '')

    raw = base64.b64decode(content['content']).decode('utf-8', 'replace')
    tmp = tempfile.mkdtemp(prefix='p2s_')
    sdir = os.path.join(tmp, 'prisma')
    os.makedirs(sdir, exist_ok=True)
    spath = os.path.join(sdir, 'schema.prisma')
    with open(spath, 'w', encoding='utf-8') as fh:
        fh.write(raw)

    proc = subprocess.run(
        ['node', os.path.join(HERE, 'dist', 'cli.js'), 'generate',
         '--schema', spath, '--output', os.path.join(tmp, 'out', 'migrations')],
        capture_output=True, text=True, timeout=180,
    )

    ok = proc.returncode == 0
    sql = ''
    if ok:
        mdir = os.path.join(tmp, 'out', 'migrations')
        if os.path.isdir(mdir):
            for name in os.listdir(mdir):
                if 'initial_schema' in name:
                    sql = open(os.path.join(mdir, name), encoding='utf-8').read()

    models = len(re.findall(r'^model\s+(\w+)', raw, re.M))
    detail = (f'models={models} tables={sql.count("CREATE TABLE")} '
              f'fks={sql.count("REFERENCES")} indexes={sql.count("CREATE INDEX")} file={target}')
    err = '' if ok else (proc.stderr.strip().splitlines()[-1] if proc.stderr.strip() else 'unknown')
    return (repo, 'OK' if ok else 'FAILED', detail, err)


def main():
    needle = sys.argv[1].lower() if len(sys.argv) > 1 else None
    repos = [r for r in REPOS if not needle or needle in r.lower()]

    print('=== prisma-to-supabase real-schema verification ===')
    print(f'repos: {len(repos)} | auth: {"token" if TOKEN else "unauthenticated"}\n')

    results = [verify_repo(r) for r in repos]
    for repo, status, detail, err in results:
        print(f'{status:<18} {repo}')
        if detail:
            print(f'                   {detail}')
        if err:
            print(f'                   error: {err}')

    ok = sum(1 for r in results if r[1] == 'OK')
    failed = [r for r in results if r[1] not in ('OK', 'NO_PRISMA_SCHEMA')]
    print(f'\nSUCCESS {ok}/{len(results)}')
    if failed:
        print('FAILURES:')
        for r in failed:
            print(f'  {r[0]}: {r[1]} {r[3]}')
        sys.exit(1)


if __name__ == '__main__':
    main()
