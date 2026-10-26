#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, os, shutil, subprocess, tarfile, tempfile
from pathlib import Path

ROOT=Path('/opt/synopsis-game'); ETC=Path('/etc/synopsis-game'); STATE=Path('/var/lib/synopsis-game')
def run(*cmd: str, check: bool=True, capture: bool=False):
    return subprocess.run(cmd, check=check, text=True, capture_output=capture)
def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()
def safe_extract(archive: Path,target: Path):
    with tarfile.open(archive,'r:*') as tf:
        base=target.resolve()
        for m in tf.getmembers():
            d=(target/m.name).resolve()
            if d!=base and base not in d.parents: raise RuntimeError(f'unsafe archive path: {m.name}')
        tf.extractall(target)
def env(path: Path):
    out={}
    if path.exists():
        for line in path.read_text().splitlines():
            if line and not line.startswith('#') and '=' in line:
                k,v=line.split('=',1); out[k]=v
    return out

def main()->int:
    ap=argparse.ArgumentParser(); ap.add_argument('archive'); ap.add_argument('--sha256'); ap.add_argument('--no-start',action='store_true'); a=ap.parse_args()
    archive=Path(a.archive).resolve()
    if a.sha256 and sha256(archive)!=a.sha256.lower(): raise SystemExit('SHA-256 mismatch')
    ROOT.mkdir(parents=True,exist_ok=True); (ROOT/'releases').mkdir(exist_ok=True); ETC.mkdir(parents=True,exist_ok=True); STATE.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='synopsis-release-') as td:
        stage=Path(td); safe_extract(archive,stage); dirs=[p for p in stage.iterdir() if p.is_dir()]; src=dirs[0] if len(dirs)==1 else stage
        version=(src/'VERSION').read_text().strip(); dest=ROOT/'releases'/version
        if dest.exists(): shutil.rmtree(dest)
        shutil.copytree(src,dest,symlinks=True)
    current=ROOT/'current'; old=current.resolve() if current.exists() else None
    run('systemctl','stop','synopsis-game.service',check=False)
    backup=run('/bin/bash',str(dest/'deploy/scripts/backup.sh'),capture=True,check=False).stdout.strip().splitlines()
    backup_dir=Path(backup[-1]) if backup else None
    app_env=ETC/'app.env'; merged=ETC/'.app.env.new'
    run('/usr/bin/python3',str(dest/'deploy/scripts/config_merge.py'),'--defaults',str(dest/'deploy/config/defaults.env'),'--current',str(app_env),'--output',str(merged))
    os.chmod(merged,0o640); merged.replace(app_env)
    run('/usr/bin/python3',str(dest/'deploy/scripts/migrate.py'),'--release',str(dest),'--config',str(app_env))
    link=ROOT/'.current.new'; link.unlink(missing_ok=True); link.symlink_to(dest); link.replace(current)
    run('systemctl','daemon-reload',check=False)
    if a.no_start: return 0
    try:
        run('systemctl','restart','synopsis-game.service')
        run('/bin/bash',str(dest/'deploy/scripts/healthcheck.sh'))
    except Exception:
        if old:
            rb=ROOT/'.current.rollback'; rb.unlink(missing_ok=True); rb.symlink_to(old); rb.replace(current)
            cfg=env(app_env)
            if backup_dir and cfg.get('DATABASE_KIND','sqlite')=='sqlite' and (backup_dir/'data').exists():
                data=STATE/'data'; shutil.rmtree(data,ignore_errors=True); shutil.copytree(backup_dir/'data',data)
            if backup_dir and (backup_dir/'etc').exists():
                shutil.copy2(backup_dir/'etc/app.env',app_env)
            run('systemctl','restart','synopsis-game.service',check=False)
        raise
    print(f'Updated Synopsis Game to {version}')
    return 0
if __name__=='__main__': raise SystemExit(main())
