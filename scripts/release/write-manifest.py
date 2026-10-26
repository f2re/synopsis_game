#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, sys
from pathlib import Path
root=Path(sys.argv[1]); version=sys.argv[2]; node=sys.argv[3]; commit=sys.argv[4] if len(sys.argv)>4 else 'unknown'
files={}
for p in sorted(root.rglob('*')):
    if p.is_file() and p.name!='manifest.json':
        files[str(p.relative_to(root))]=hashlib.sha256(p.read_bytes()).hexdigest()
(root/'manifest.json').write_text(json.dumps({'version':version,'commit':commit,'node':node,'config_schema':1,'files':files},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
