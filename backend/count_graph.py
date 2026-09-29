import json
with open('data/roadmaps/roadmap_graph.json', encoding='utf-8') as f:
    d = json.load(f)
    print('Branches:', len(d.get('branches', [])))
    print('Domains:', len(d.get('domains', [])))
    print('Sources:', len(d.get('sources', [])))
    roles = 0
    tech = 0
    for dmn in d.get('domains', []):
        roles += len(dmn.get('roles', []))
        for r in dmn.get('roles', []):
            tech += len(r.get('technologies', []))
    print('Roles:', roles)
    print('Tech:', tech)
