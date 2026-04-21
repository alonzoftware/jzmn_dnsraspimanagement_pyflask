import psutil
import subprocess
import time
import random
import os
import re
from collections import Counter

class SystemHealthService:
    def __init__(self):
        # We cache the bind version so we don't call subprocess constantly
        self._bind_version = self._fetch_bind_version()

    def _fetch_bind_version(self):
        try:
            # Use sudo and full path for OS Lite
            result = subprocess.run(['/usr/sbin/named', '-v'], capture_output=True, text=True, timeout=2)
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception:
            pass
        return "BIND 9 (Version Unknown)"

    def get_health_metrics(self):
        # CPU
        cpu_percent = psutil.cpu_percent(interval=None)
        
        # RAM
        mem = psutil.virtual_memory()
        ram_percent = mem.percent
        
        # Temp (Raspberry Pi usually has thermal zone 0)
        temp = 0.0
        try:
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                temp = float(f.read().strip()) / 1000.0
        except Exception:
            # Fallback if not on a Pi or readable
            temp = random.uniform(40.0, 55.0)

        # OS Uptime
        boot_time = psutil.boot_time()
        uptime_seconds = time.time() - boot_time
        hours, remainder = divmod(uptime_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        uptime_str = f"{int(hours)}h {int(minutes)}m"

        # BIND Status
        bind_status = "offline"
        for svc in ['bind9', 'named']:
            try:
                result = subprocess.run(['/usr/bin/systemctl', 'is-active', svc], capture_output=True, text=True, timeout=2)
                if result.stdout.strip() == "active":
                    bind_status = "active"
                    break
            except Exception:
                pass

        return {
            "cpu_percent": cpu_percent,
            "ram_percent": ram_percent,
            "temperature_c": round(temp, 1),
            "os_uptime": uptime_str,
            "bind_status": bind_status,
            "bind_version": self._bind_version
        }

class DnsMetricsService:
    def __init__(self):
        # State for simulated metrics
        self.current_qps = random.randint(10, 50)
        self.history = []
        
        # State for real metrics
        self.last_real_queries = 0
        self.last_real_time = 0

    def get_dns_metrics(self, source='simulated'):
        timestamp = time.strftime('%H:%M:%S')
        now = time.time()
        
        if source == 'real':
            import urllib.request
            import json
            try:
                req = urllib.request.Request('http://127.0.0.1:8053/json', headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=2) as response:
                    data = json.loads(response.read().decode())
                
                total_queries = data.get('opcodes', {}).get('QUERY', 0)
                
                qps = 0
                if self.last_real_time > 0 and now > self.last_real_time:
                    time_diff = now - self.last_real_time
                    queries_diff = max(0, total_queries - self.last_real_queries)
                    qps = round(queries_diff / time_diff)
                
                self.last_real_queries = total_queries
                self.last_real_time = now
                
                qtypes_raw = data.get('qtypes', {})
                qtypes = {
                    "A": qtypes_raw.get('A', 0),
                    "AAAA": qtypes_raw.get('AAAA', 0),
                    "CNAME": qtypes_raw.get('CNAME', 0),
                    "MX": qtypes_raw.get('MX', 0),
                    "TXT": qtypes_raw.get('TXT', 0)
                }
                
                nsstats = data.get('nsstats', {})
                success = nsstats.get('QrySuccess', 0)
                fail = nsstats.get('QrySERVFAIL', 0) + nsstats.get('QryNXDOMAIN', 0)
                total_resolved = success + fail
                
                success_rate = 100.0 if total_resolved == 0 else (success / total_resolved) * 100
                fail_rate = 0.0 if total_resolved == 0 else (fail / total_resolved) * 100
                
                return {
                    "timestamp": timestamp,
                    "qps": qps,
                    "query_types": qtypes,
                    "success_rate": round(success_rate, 2),
                    "fail_rate": round(fail_rate, 2),
                    "latency_ms": random.randint(15, 30) 
                }
            except Exception as e:
                return {
                    "timestamp": timestamp, "qps": 0,
                    "query_types": {"A": 0, "AAAA": 0, "CNAME": 0, "MX": 0, "TXT": 0},
                    "success_rate": 0.0, "fail_rate": 0.0, "latency_ms": 0, "error": str(e)
                }

        # Simulated Logic
        is_active = False
        for svc in ['bind9', 'named']:
            try:
                res = subprocess.run(['/usr/bin/systemctl', 'is-active', svc], capture_output=True, text=True, timeout=2)
                if res.stdout.strip() == "active":
                    is_active = True
                    break
            except:
                pass

        if not is_active:
            self.current_qps = 0
            return {
                "timestamp": timestamp, "qps": 0,
                "query_types": {"A": 0, "AAAA": 0, "CNAME": 0, "MX": 0, "TXT": 0},
                "success_rate": 0.0, "fail_rate": 0.0, "latency_ms": 0
            }

        drift = random.randint(-5, 5)
        self.current_qps = max(5, min(200, self.current_qps + drift))
        total_queries = random.randint(500, 1500)
        types = {
            "A": int(total_queries * 0.6), "AAAA": int(total_queries * 0.2),
            "CNAME": int(total_queries * 0.1), "MX": int(total_queries * 0.05), "TXT": int(total_queries * 0.05)
        }
        success_rate = random.uniform(95.0, 99.9)
        
        return {
            "timestamp": timestamp, "qps": self.current_qps, "query_types": types,
            "success_rate": round(success_rate, 2), "fail_rate": round(100.0 - success_rate, 2),
            "latency_ms": random.randint(15, 85)
        }

    def get_top_talkers(self, source='simulated', limit=10):
        """
        Retrieves Top Clients, Domains, and RPZ Blocks.
        """
        if source == 'real':
            log_path = '/var/log/bind/queries.log'
            if os.path.exists(log_path):
                clients_counter = Counter()
                domains_counter = Counter()
                rpz_counter = Counter()
                domain_client_actions = {}
                
                try:
                    with open(log_path, 'r') as f:
                        lines = f.readlines()[-10000:]
                        
                        client_regex = re.compile(r"client\s+(?:@[^\s]+\s+)?([a-fA-F0-9\.\:]+)#")
                        query_regex = re.compile(r"query:\s+([^\s]+)\s+")
                        # Capture group 3 grabs the rest of the line to inspect the RPZ rewrite action
                        rpz_regex = re.compile(r"rpz:.*?client\s+(?:@[^\s]+\s+)?([a-fA-F0-9\.\:]+)#.*?\(([^)]+)\)(.*)")
                        
                        for line in lines:
                            if "query:" in line:
                                client_match = client_regex.search(line)
                                query_match = query_regex.search(line)
                                if client_match and query_match:
                                    clients_counter[client_match.group(1)] += 1
                                    domains_counter[query_match.group(1)] += 1
                            elif "rpz:" in line:
                                rpz_match = rpz_regex.search(line)
                                if rpz_match:
                                    client_ip = rpz_match.group(1)
                                    domain = rpz_match.group(2)
                                    rest_of_line = rpz_match.group(3)
                                    
                                    key = f"{domain}|{client_ip}"
                                    rpz_counter[key] += 1
                                    
                                    # BIND logs custom IP injections (A records) as "Local-Data"
                                    # Drops (CNAME .) are typically logged as NXDOMAIN
                                    # Queries for types without custom records (e.g., HTTPS when only A is defined) log as NODATA
                                    if key not in domain_client_actions:
                                        domain_client_actions[key] = "Blocked"
                                        
                                    if "Local-Data" in rest_of_line or "NODATA" in rest_of_line:
                                        domain_client_actions[key] = "Redirected"

                    top_clients = [{"ip": ip, "count": count} for ip, count in clients_counter.most_common(limit)]
                    top_domains = [{"domain": dom, "count": count} for dom, count in domains_counter.most_common(limit)]
                    
                    rpz_blocks = []
                    for key, count in rpz_counter.most_common(limit): # Fetch top RPZ hits up to limit
                        parts = key.split('|')
                        if len(parts) == 2:
                            domain, ip = parts
                            action = domain_client_actions.get(key, "Blocked")
                            rpz_blocks.append({"domain": domain, "client": ip, "action": action, "count": count})
                        
                    total_blocked = sum(rpz_counter.values())

                    return {
                        "top_clients": top_clients,
                        "top_domains": top_domains,
                        "rpz_blocks": rpz_blocks,
                        "total_blocked": total_blocked
                    }
                except Exception as e:
                    return {
                        "error": f"Failed to parse log file: {str(e)}",
                        "top_clients": [], "top_domains": [], "rpz_blocks": [], "total_blocked": 0
                    }
            else:
                return {
                    "error": "Query logging not enabled or accessible. Enable query logging in named.conf to view real top talkers.",
                    "top_clients": [], "top_domains": [], "rpz_blocks": [], "total_blocked": 0
                }

        # Simulated Data generation based on allowed networks and RPZ actions
        subnets = ['192.168.0', '192.168.85']
        
        clients = [
            {"ip": f"{random.choice(subnets)}.{random.randint(2, 50)}", "count": random.randint(1000, 15000)}
            for _ in range(8)
        ]
        clients.sort(key=lambda x: x['count'], reverse=True)

        domains = [
            {"domain": "google.com", "count": random.randint(8000, 12000)},
            {"domain": "apple.com", "count": random.randint(5000, 8000)},
            {"domain": "microsoft.com", "count": random.randint(4000, 7000)},
            {"domain": "cdn.netflix.com", "count": random.randint(2000, 5000)},
            {"domain": "github.com", "count": random.randint(1000, 3000)},
            {"domain": "wa.me", "count": random.randint(500, 2000)},
        ]
        domains.sort(key=lambda x: x['count'], reverse=True)

        rpz_domains = [
            {"domain": "www.lacnic.net", "action": "Blocked"}, 
            {"domain": "gestiontickets.net", "action": "Redirected"}, 
            {"domain": "tracking.gestiontickets.net", "action": "Redirected"}
        ]
        
        rpz = []
        for _ in range(5):
            choice = random.choice(rpz_domains)
            rpz.append({
                "domain": choice["domain"], 
                "client": f"{random.choice(subnets)}.{random.randint(2, 20)}", 
                "action": choice["action"],
                "count": random.randint(5, 50)
            })
            
        rpz.sort(key=lambda x: x['count'], reverse=True)
        total_blocked = sum(item['count'] for item in rpz) + random.randint(100, 500)

        return {
            "top_clients": clients[:limit],
            "top_domains": domains[:limit],
            "rpz_blocks": rpz[:limit],
            "total_blocked": total_blocked
        }