#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, sqlite3, subprocess
from pathlib import Path

STATE_DIR = Path('/var/lib/synopsis-game/migrations')
STATE_FILE = STATE_DIR / 'applied.json'

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def read_env(path: Path) -> dict[str,str]:
    out={}
    if path.exists():
        for line in path.read_text(encoding='utf-8').splitlines():
            if line and not line.startswith('#') and '=' in line:
                k,v=line.split('=',1); out[k]=v
    return out

def sqlite_path(url: str) -> Path:
    if not url.startswith('file:'): raise RuntimeError('SQLite DATABASE_URL must start with file:')
    return Path(url[5:])

def main() -> int:
    ap=argparse.ArgumentParser()
    ap.add_argument('--release', required=True)
    ap.add_argument('--config', default='/etc/synopsis-game/app.env')
    ap.add_argument('--dry-run', action='store_true')
    args=ap.parse_args()
    root=Path(args.release)/'deploy/migrations'
    cfg=read_env(Path(args.config)); kind=cfg.get('DATABASE_KIND','sqlite'); url=cfg.get('DATABASE_URL','')
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    applied=json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}
    migrations=[p for p in sorted(root.iterdir()) if p.is_file() and p.name[:4].isdigit()]
    for m in migrations:
        h=digest(m)
        if m.name in applied:
            if applied[m.name] != h: raise RuntimeError(f'applied migration changed: {m.name}')
            continue
        print(f'Applying migration {m.name}')
        if args.dry_run: continue
        env=os.environ.copy(); env.update(cfg); env['SYNOPSIS_MIGRATION']=m.name
        if m.suffix=='.sql':
            if kind=='sqlite':
                db=sqlite_path(url); db.parent.mkdir(parents=True, exist_ok=True)
                with sqlite3.connect(db) as con: con.executescript(m.read_text(encoding='utf-8'))
            elif kind=='postgres':
                subprocess.run(['psql', url, '-v', 'ON_ERROR_STOP=1', '-f', str(m)], env=env, check=True)
            else: raise RuntimeError(f'unsupported DB kind: {kind}')
        elif m.suffix=='.py': subprocess.run(['/usr/bin/python3', str(m)], env=env, check=True)
        elif m.suffix=='.sh': subprocess.run(['/bin/bash', str(m)], env=env, check=True)
        else: continue
        applied[m.name]=h
        tmp=STATE_FILE.with_suffix('.tmp'); tmp.write_text(json.dumps(applied,indent=2)+'\n'); tmp.replace(STATE_FILE)
    return 0
if __name__=='__main__': raise SystemExit(main())
