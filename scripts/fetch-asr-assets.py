#!/usr/bin/env python3
"""Materialize pinned public ASR assets, verifying hashes before any replacement.
Run from any directory; existing correct files are reused. No user audio is read.
"""
import hashlib, io, json, pathlib, tarfile, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1] / 'nine-line-system-test-assets/asr'
manifest = json.loads((ROOT / 'assets-manifest.json').read_text())
archives = {}
for item in manifest['files']:
    target = ROOT / item['path']
    if target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == item['sha256']:
        continue
    if 'archive_member' in item:
        if item['url'] not in archives:
            with urllib.request.urlopen(item['url'], timeout=180) as response:
                archive = response.read()
            if hashlib.sha256(archive).hexdigest() != manifest['runtime_archive_sha256']:
                raise RuntimeError('Runtime archive hash mismatch')
            archives[item['url']] = archive
        with tarfile.open(fileobj=io.BytesIO(archives[item['url']]), mode='r:gz') as package:
            payload = package.extractfile(item['archive_member']).read()
    else:
        with urllib.request.urlopen(item['url'], timeout=180) as response:
            payload = response.read()
    if len(payload) != item['bytes'] or hashlib.sha256(payload).hexdigest() != item['sha256']:
        raise RuntimeError('Asset integrity mismatch: ' + item['path'])
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(target.suffix + '.partial')
    temporary.write_bytes(payload)
    temporary.replace(target)
print('Verified', len(manifest['files']), 'assets;', manifest['total_bytes'], 'bytes')
