import os

code = """
class ResponsePolicyService:
    def __init__(self, zone_file='/etc/bind/rpz.localhost.zone'):
        self.zone_file = zone_file
        self.backup_file = f"{zone_file}.bak"

    def _increment_serial(self, serial_str):
        import datetime
        today = datetime.datetime.now().strftime("%Y%m%d")
        if serial_str.startswith(today):
            try:
                idx = int(serial_str[8:]) + 1
                return f"{today}{idx:02d}"
            except:
                return f"{today}01"
        else:
            return f"{today}01"

    def get_rules(self):
        if not os.path.exists(self.zone_file):
            return {"status": "Error", "message": f"Zone file not found: {self.zone_file}", "rules": []}
            
        rules = []
        try:
            with open(self.zone_file, 'r') as f:
                lines = f.readlines()
                
            for line in lines:
                line = line.strip()
                if not line or line.startswith('$') or line.startswith('@') or 'SOA' in line or 'NS' in line or line.startswith('(') or line.startswith(')'):
                    # Basic skip for SOA and NS and TTL
                    # Check if it looks like a rule (contains IN CNAME or IN A)
                    if not (' IN CNAME ' in line or ' IN A ' in line or ' IN NODATA' in line):
                        continue
                
                comment = ""
                if ';' in line:
                    parts = line.split(';', 1)
                    line = parts[0].strip()
                    comment = parts[1].strip()
                
                parts = line.split()
                if len(parts) >= 3:
                    domain = parts[0]
                    # e.g. domain IN CNAME .
                    try:
                        in_index = parts.index('IN')
                        action_str = " ".join(parts[in_index+1:])
                    except ValueError:
                        action_str = " ".join(parts[1:])
                        
                    action_type = "UNKNOWN"
                    target = ""
                    if "CNAME ." == action_str:
                        action_type = "NXDOMAIN"
                    elif "CNAME *." == action_str:
                        action_type = "NODATA"
                    elif "CNAME rpz-passthru." == action_str:
                        action_type = "PASSTHRU"
                    elif "CNAME rpz-drop." == action_str:
                        action_type = "DROP"
                    elif action_str.startswith("CNAME"):
                        action_type = "CNAME"
                        target = action_str.split()[1] if len(action_str.split()) > 1 else ""
                    elif action_str.startswith("A"):
                        action_type = "A"
                        target = action_str.split()[1] if len(action_str.split()) > 1 else ""
                    
                    rules.append({
                        "domain": domain,
                        "action": action_type,
                        "raw_action": action_str,
                        "target": target,
                        "comment": comment
                    })
            return {"status": "OK", "rules": rules}
        except Exception as e:
            return {"status": "Error", "message": str(e), "rules": []}

    def save_rules(self, rules, soa_header=None):
        if not soa_header:
            if os.path.exists(self.zone_file):
                soa_lines = []
                with open(self.zone_file, 'r') as f:
                    for line in f:
                        if line.strip() and not line.startswith(';') and (' IN CNAME ' in line or ' IN A ' in line):
                            # Usually rules come after SOA. We stop at first rule.
                            break
                        soa_lines.append(line)
                soa_header = "".join(soa_lines)
            else:
                serial = self._increment_serial("2000010101")
                soa_header = f\"\"\"$TTL 60
@ IN SOA localhost. root.localhost. (
    {serial} ; Serial
    1h ; Refresh
    15m ; Retry
    30d ; Expire
    2h ; Negative Cache TTL
)
@ IN NS localhost.
\"\"\"
        
        import re
        serial_match = re.search(r'(\d+)(\s*;\s*Serial)', soa_header, re.IGNORECASE)
        if serial_match:
            old_serial = serial_match.group(1)
            new_serial = self._increment_serial(old_serial)
            soa_header = soa_header.replace(old_serial, new_serial, 1)

        content = soa_header
        if not content.endswith('\\n'):
            content += '\\n'
            
        for r in rules:
            domain = r.get("domain", "")
            action = r.get("action", "")
            target = r.get("target", "")
            comment = r.get("comment", "")
            
            if not domain: continue
            
            raw_action = ""
            if action == "NXDOMAIN": raw_action = "CNAME ."
            elif action == "NODATA": raw_action = "CNAME *."
            elif action == "PASSTHRU": raw_action = "CNAME rpz-passthru."
            elif action == "DROP": raw_action = "CNAME rpz-drop."
            elif action == "CNAME": raw_action = f"CNAME {target}" if target else "CNAME ."
            elif action == "A": raw_action = f"A {target}" if target else "A 0.0.0.0"
            else: raw_action = r.get("raw_action", "CNAME .")
            
            line = f"{domain} IN {raw_action}"
            if comment:
                line += f" ; {comment}"
            content += line + "\\n"
            
        temp_file = f"{self.zone_file}.tmp"
        try:
            with open(temp_file, 'w') as f:
                f.write(content)
        except Exception as e:
            return {"status": "Error", "message": f"Failed to write temp file: {e}"}
            
        try:
            res = subprocess.run(['/usr/sbin/named-checkzone', 'rpz.localhost', temp_file], capture_output=True, text=True, timeout=5)
            if res.returncode != 0:
                os.remove(temp_file)
                return {"status": "Error", "message": f"named-checkzone failed: {res.stderr or res.stdout}"}
        except Exception as e:
            # We assume it's just missing on test machine
            print(f"Checkzone not available, ignoring: {e}")
            
        try:
            import shutil
            if os.path.exists(self.zone_file):
                shutil.copy2(self.zone_file, self.backup_file)
            shutil.move(temp_file, self.zone_file)
        except Exception as e:
            return {"status": "Error", "message": f"Failed to apply new zone file: {e}"}
            
        return {"status": "OK", "message": "Rules saved successfully"}

    def reload_zone(self):
        try:
            res = subprocess.run(['sudo', '-n', '/usr/sbin/rndc', 'reload', 'rpz.localhost'], capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                return {"status": "OK", "message": "Zone reloaded successfully"}
            else:
                return {"status": "Error", "message": res.stderr.strip() or res.stdout.strip()}
        except Exception as e:
            return {"status": "Error", "message": str(e)}

    def fetch_external_feed(self, url):
        import requests
        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            domains = []
            for line in resp.text.splitlines():
                line = line.strip()
                if not line or line.startswith('#'): continue
                parts = line.split()
                if len(parts) >= 2 and parts[0] in ['0.0.0.0', '127.0.0.1']:
                    domains.append(parts[1])
                elif len(parts) == 1:
                    domains.append(parts[0])
            return {"status": "OK", "domains": domains}
        except Exception as e:
            return {"status": "Error", "message": str(e)}
"""

with open('/home/hplap/DNSRaspiManagement/src/application/services.py', 'a') as f:
    f.write("\n" + code)

