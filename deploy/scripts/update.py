#!/usr/bin/env python3
import argparse, fcntl, hashlib, os, re, shutil, subprocess, tarfile, tempfile
from pathlib import Path

ROOT=Path('/opt/synopsis-game'); ETC=Path('/etc/synopsis-game'); STATE=Path('/var/lib/synopsis-game')
def run(*cmd, **kwargs):
    check=kwargs.pop('check',True); capture=kwargs.pop('capture',False); child_env=kwargs.pop('env',None)
    return subprocess.run(cmd, check=check, text=True, capture_output=capture, env=child_env)
def sha256(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()
def semver(value):
    match=re.match(r'^(\d+)\.(\d+)\.(\d+)', value or '')
    return tuple(map(int,match.groups())) if match else None
def is_within(base, path):
    try:
        path.relative_to(base); return True
    except ValueError:
        return False
def safe_extract(archive,target):
    with tarfile.open(str(archive),'r:*') as tf:
        base=target.resolve()
        for m in tf.getmembers():
            dest=(target/m.name).resolve()
            if dest!=base and not is_within(base,dest): raise RuntimeError('unsafe archive path: %s' % m.name)
            if m.issym():
                linked=(dest.parent/m.linkname).resolve()
                if linked!=base and not is_within(base,linked): raise RuntimeError('unsafe symlink: %s -> %s' % (m.name,m.linkname))
            if m.islnk():
                linked=(target/m.linkname).resolve()
                if linked!=base and not is_within(base,linked): raise RuntimeError('unsafe hardlink: %s -> %s' % (m.name,m.linkname))
        tf.extractall(str(target))
def env_file(path):
    out={}
    if path.exists():
        for line in path.read_text().splitlines():
            if line and not line.startswith('#') and '=' in line:
                k,v=line.split('=',1); out[k]=v
    return out
def unlink_if_present(path):
    if path.exists() or path.is_symlink(): path.unlink()
def switch_current(target):
    link=ROOT/'.current.new'; unlink_if_present(link); link.symlink_to(target); link.replace(ROOT/'current')
def install_units(release):
    for name in ('synopsis-game.service','synopsis-game-update.service','synopsis-game-update.timer'):
        shutil.copy2(str(release/'deploy/systemd'/name),str(Path('/etc/systemd/system')/name))
    run('systemctl','daemon-reload',check=False)
def restore_backup(backup_dir, app_env):
    if not backup_dir: return
    if (backup_dir/'etc/app.env').exists(): shutil.copy2(str(backup_dir/'etc/app.env'),str(app_env))
    cfg=env_file(app_env); kind=cfg.get('DATABASE_KIND','sqlite')
    if kind=='sqlite':
        data=STATE/'data'; shutil.rmtree(str(data),ignore_errors=True)
        if (backup_dir/'data').exists(): shutil.copytree(str(backup_dir/'data'),str(data))
        else: data.mkdir(parents=True,exist_ok=True)
    elif kind=='postgres' and (backup_dir/'postgres.dump').exists():
        url=cfg.get('DATABASE_URL','')
        if not url: raise RuntimeError('DATABASE_URL is required to restore PostgreSQL backup')
        run('pg_restore','--clean','--if-exists','--no-owner','--exit-on-error','--dbname',url,str(backup_dir/'postgres.dump'))
    migrations=STATE/'migrations'; shutil.rmtree(str(migrations),ignore_errors=True)
    if (backup_dir/'migrations').exists(): shutil.copytree(str(backup_dir/'migrations'),str(migrations))
    else: migrations.mkdir(parents=True,exist_ok=True)
def acquire_lock():
    lock_dir=Path('/run/lock'); lock_dir.mkdir(parents=True,exist_ok=True)
    handle=open(str(lock_dir/'synopsis-game-update.lock'),'w')
    try: fcntl.flock(handle.fileno(),fcntl.LOCK_EX|fcntl.LOCK_NB)
    except OSError: raise SystemExit('another Synopsis Game update is already running')
    return handle
def prune_releases(active, previous, keep):
    try: keep=max(2,int(keep))
    except (TypeError,ValueError): keep=3
    protected=set([str(active.resolve())])
    if previous and previous.exists(): protected.add(str(previous.resolve()))
    candidates=[]
    for path in (ROOT/'releases').iterdir():
        if path.is_dir() and str(path.resolve()) not in protected:
            candidates.append(path)
    candidates.sort(key=lambda p:p.stat().st_mtime,reverse=True)
    allowed=max(0,keep-len(protected))
    for path in candidates[allowed:]: shutil.rmtree(str(path),ignore_errors=True)

def main():
    lock=acquire_lock()
    ap=argparse.ArgumentParser(); ap.add_argument('archive'); ap.add_argument('--sha256'); ap.add_argument('--no-start',action='store_true'); ap.add_argument('--allow-downgrade',action='store_true'); a=ap.parse_args()
    archive=Path(a.archive).resolve()
    if a.sha256 and sha256(archive)!=a.sha256.lower(): raise SystemExit('SHA-256 mismatch')
    ROOT.mkdir(parents=True,exist_ok=True); (ROOT/'releases').mkdir(exist_ok=True); ETC.mkdir(parents=True,exist_ok=True); STATE.mkdir(parents=True,exist_ok=True)
    current=ROOT/'current'; old=current.resolve() if current.exists() else None
    with tempfile.TemporaryDirectory(prefix='synopsis-release-') as td:
        stage=Path(td); safe_extract(archive,stage); dirs=[p for p in stage.iterdir() if p.is_dir()]; src=dirs[0] if len(dirs)==1 else stage
        version=(src/'VERSION').read_text().strip(); dest=ROOT/'releases'/version
        if old and old.name==version:
            print('Synopsis Game %s is already active' % version); return 0
        old_version=semver(old.name) if old else None; new_version=semver(version)
        if old_version and new_version and new_version<old_version and not a.allow_downgrade:
            raise SystemExit('refusing downgrade %s -> %s without --allow-downgrade' % (old.name,version))
        if dest.exists(): shutil.rmtree(str(dest))
        shutil.copytree(str(src),str(dest),symlinks=True)
    app_env=ETC/'app.env'; old_cfg=env_file(app_env)
    dep_env=os.environ.copy(); dep_env['CONFIG_FILE']=str(app_env)
    run('/bin/bash',str(dest/'deploy/scripts/ensure-host-deps.sh'),env=dep_env)
    backup_env=os.environ.copy(); backup_env.update(old_cfg)
    run('systemctl','stop','synopsis-game.service',check=False)
    try:
        backup=run('/bin/bash',str(dest/'deploy/scripts/backup.sh'),capture=True,check=True,env=backup_env).stdout.strip().splitlines()
    except Exception:
        if old: run('systemctl','restart','synopsis-game.service',check=False)
        if not old or dest!=old: shutil.rmtree(str(dest),ignore_errors=True)
        raise
    backup_dir=Path(backup[-1]) if backup else None
    merged=ETC/'.app.env.new'
    try:
        run('/usr/bin/python3',str(dest/'deploy/scripts/config_merge.py'),'--defaults',str(dest/'deploy/config/defaults.env'),'--current',str(app_env),'--output',str(merged))
        os.chmod(str(merged),0o640); merged.replace(app_env)
        run('/usr/bin/python3',str(dest/'deploy/scripts/migrate.py'),'--release',str(dest),'--config',str(app_env))
        switch_current(dest)
        install_units(dest)
        run('/bin/bash',str(dest/'deploy/scripts/render-web-config.sh'))
        if a.no_start: return 0
        run('systemctl','restart','synopsis-game.service')
        run('/bin/bash',str(dest/'deploy/scripts/healthcheck.sh'))
        cfg=env_file(app_env); prune_releases(dest,old,cfg.get('RELEASE_KEEP','3'))
    except Exception:
        restore_backup(backup_dir,app_env)
        if old:
            switch_current(old)
            install_units(old)
            render=old/'deploy/scripts/render-web-config.sh'
            if render.exists(): run('/bin/bash',str(render),check=False)
            run('systemctl','restart','synopsis-game.service',check=False)
        if not old or dest!=old: shutil.rmtree(str(dest),ignore_errors=True)
        raise
    print('Updated Synopsis Game to %s' % version)
    lock.close()
    return 0
if __name__=='__main__': raise SystemExit(main())
