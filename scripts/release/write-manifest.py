#!/usr/bin/env python3
import hashlib, json, sys
from pathlib import Path

root=Path(sys.argv[1]); version=sys.argv[2]; node=sys.argv[3]; commit=sys.argv[4] if len(sys.argv)>4 else 'unknown'
config_schema=0
defaults=root/'deploy/config/defaults.env'
if defaults.exists():
    for line in defaults.read_text(encoding='utf-8').splitlines():
        if line.startswith('CONFIG_SCHEMA_VERSION='):
            config_schema=int(line.split('=',1)[1]); break
files={}
for p in sorted(root.rglob('*')):
    if p.is_file() and p.name!='manifest.json':
        files[str(p.relative_to(root))]=hashlib.sha256(p.read_bytes()).hexdigest()
manifest={'version':version,'commit':commit,'node':node,'config_schema':config_schema,'files':files}
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
