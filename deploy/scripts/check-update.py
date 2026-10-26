#!/usr/bin/env python3
from __future__ import annotations
import json, re, subprocess, tempfile, urllib.request
from pathlib import Path
CONFIG=Path('/etc/synopsis-game/app.env'); CURRENT=Path('/opt/synopsis-game/current/VERSION')
def env_file(p):
    out={}
    if p.exists():
        for line in p.read_text().splitlines():
            if line and not line.startswith('#') and '=' in line:
                k,v=line.split('=',1); out[k]=v
    return out
def semver(s):
    m=re.match(r'^(\d+)\.(\d+)\.(\d+)',s); return tuple(map(int,m.groups())) if m else (0,0,0)
def request_json(url):
    req=urllib.request.Request(url,headers={'User-Agent':'synopsis-game-updater','Accept':'application/vnd.github+json'})
    with urllib.request.urlopen(req,timeout=15) as r:return json.load(r)
def download(url,p):
    req=urllib.request.Request(url,headers={'User-Agent':'synopsis-game-updater'})
    with urllib.request.urlopen(req,timeout=90) as r,p.open('wb') as f:
        while b:=r.read(1024*1024):f.write(b)
def install(archive,sha): subprocess.run(['/usr/bin/python3','/opt/synopsis-game/current/deploy/scripts/update.py',str(archive),'--sha256',sha],check=True)
def main():
    c=env_file(CONFIG); mode=c.get('UPDATE_MODE','manual'); source=c.get('UPDATE_SOURCE','github')
    if mode=='manual':return 0
    current=CURRENT.read_text().strip() if CURRENT.exists() else '0.0.0'
    if source=='directory':
        d=Path(c.get('UPDATE_DIRECTORY','/srv/synopsis-game/releases')); candidates=[]
        for p in d.glob('synopsis-game-*-linux-x64.tar.gz'):
            v=p.name.removeprefix('synopsis-game-').removesuffix('-linux-x64.tar.gz'); candidates.append((semver(v),v,p))
        if not candidates:return 0
        _,version,archive=max(candidates)
        if semver(version)<=semver(current):return 0
        if mode=='notify': print(f'Update available: {current} -> {version}');return 0
        sha_file=Path(str(archive)+'.sha256'); expected=sha_file.read_text().split()[0]; install(archive,expected);return 0
    repo=c.get('UPDATE_REPOSITORY','f2re/synopsis_game'); rel=request_json(f'https://api.github.com/repos/{repo}/releases/latest'); version=rel['tag_name'].lstrip('v')
    if semver(version)<=semver(current):return 0
    assets={a['name']:a['browser_download_url'] for a in rel.get('assets',[])}; name=f'synopsis-game-{version}-linux-x64.tar.gz'; sha_name=name+'.sha256'
    if name not in assets or sha_name not in assets:raise SystemExit(f'release {version} misses required assets')
    if mode=='notify':print(f'Update available: {current} -> {version}');return 0
    with tempfile.TemporaryDirectory(prefix='synopsis-update-') as td:
        td=Path(td); a=td/name; s=td/sha_name; download(assets[name],a);download(assets[sha_name],s);install(a,s.read_text().split()[0])
    return 0
if __name__=='__main__':raise SystemExit(main())
