import re

def _is_rule_line(line):
    stripped = line.strip()
    if not stripped or stripped.startswith(';') or stripped.startswith('$') or stripped.startswith('@') or stripped.startswith('(') or stripped.startswith(')'):
        return False
    if 'SOA' in stripped or 'NS' in stripped:
        return False
    parts = stripped.split()
    if 'IN' in parts:
        in_idx = parts.index('IN')
        if in_idx + 1 < len(parts):
            action = parts[in_idx + 1]
            if action in ['CNAME', 'A', 'NODATA']:
                return True
    return False

# test
lines = [
    "www.lacnic.net  300     IN      CNAME   .",
    "gestiontickets.net.rpz.localhost.       300     IN      A       200.105.140.68",
    "*.gestiontickets.net.rpz.localhost.     300     IN      A       200.105.140.68",
    "www.lacnic.net IN CNAME . ; testing",
    "gestiontickets.net.rpz.localhost. IN A 200.105.140.68",
    "*.gestiontickets.net.rpz.localhost. IN A 200.105.140.68"
]
for l in lines:
    print(_is_rule_line(l))
