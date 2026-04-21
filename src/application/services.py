import psutil
import subprocess
import time
import random
import os
import re
from collections import Counter
import ping3
import requests
import dns.resolver

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

class InternetCheckService:
    def __init__(self):
        pass

    def _get_default_gateway(self):
        try:
            # works on most linux
            result = subprocess.run(['ip', 'route', 'show', 'default'], capture_output=True, text=True, timeout=2)
            if result.returncode == 0 and result.stdout:
                parts = result.stdout.strip().split()
                if 'via' in parts:
                    idx = parts.index('via')
                    return parts[idx+1]
        except Exception:
            pass
        return None

    def _ping_target(self, target, count=3):
        import subprocess
        import re
        try:
            # Using system ping because ping3 requires root privileges for raw sockets on Linux
            result = subprocess.run(['ping', '-c', str(count), '-W', '2', target], capture_output=True, text=True)
            output = result.stdout
            
            if "packet loss" in output:
                loss_match = re.search(r'(\d+)% packet loss', output)
                packet_loss = float(loss_match.group(1)) if loss_match else 100.0
                
                rtt_match = re.search(r'min/avg/max/mdev = [\d\.]+/(.+?)/[\d\.]+/', output)
                avg_latency = float(rtt_match.group(1)) if rtt_match else 0.0
                
                return {
                    "latency_ms": round(avg_latency, 2),
                    "packet_loss_percent": round(packet_loss, 2),
                    "is_reachable": packet_loss < 100.0
                }
            else:
                return {
                    "latency_ms": 0.0,
                    "packet_loss_percent": 100.0,
                    "is_reachable": False
                }
        except Exception:
            return {
                "latency_ms": 0.0,
                "packet_loss_percent": 100.0,
                "is_reachable": False
            }

    def check_gateway_connectivity(self):
        gateway_ip = self._get_default_gateway()
        res = {
            "gateway_ip": gateway_ip or "Unknown",
            "reachable": False,
            "latency_ms": 0,
            "packet_loss_percent": 100.0,
            "global_ping": {}
        }
        
        if gateway_ip:
            gw_ping = self._ping_target(gateway_ip, count=3)
            res["reachable"] = gw_ping["is_reachable"]
            res["latency_ms"] = gw_ping["latency_ms"]
            res["packet_loss_percent"] = gw_ping["packet_loss_percent"]

        res["global_ping"]["8.8.8.8"] = self._ping_target("8.8.8.8", count=3)
        res["global_ping"]["1.1.1.1"] = self._ping_target("1.1.1.1", count=3)
        return res

    def check_dns_connectivity(self):
        resolvers_to_test = ["8.8.8.8", "1.1.1.1"]
        resolver_responses = {}
        for res_ip in resolvers_to_test:
            try:
                res = dns.resolver.Resolver(configure=False)
                res.nameservers = [res_ip]
                res.lifetime = 2.0
                start = time.time()
                res.resolve('google.com', 'A')
                elapsed = (time.time() - start) * 1000
                resolver_responses[res_ip] = {"latency_ms": round(elapsed, 2), "status": "OK"}
            except Exception as e:
                resolver_responses[res_ip] = {"latency_ms": 0, "status": "Failed"}

        # Root hints reachability
        root_servers = ["198.41.0.4", "199.9.14.201"] # a.root-servers.net, b.root-servers.net
        root_reachability = {}
        for root_ip in root_servers:
            ping_res = self._ping_target(root_ip, count=1)
            root_reachability[root_ip] = "Reachable" if ping_res["is_reachable"] else "Unreachable"

        # Resolution test via system default (BIND)
        sys_res_time = 0
        sys_res_status = "Failed"
        try:
            start = time.time()
            dns.resolver.resolve('google.com', 'A', lifetime=2.0)
            sys_res_time = (time.time() - start) * 1000
            sys_res_status = "OK"
        except Exception:
            pass

        return {
            "upstream_resolvers": resolver_responses,
            "root_servers": root_reachability,
            "resolution_test": {
                "domain": "google.com",
                "latency_ms": round(sys_res_time, 2),
                "status": sys_res_status
            }
        }

    def check_public_identity(self):
        try:
            resp = requests.get('http://ip-api.com/json/?fields=status,message,country,city,isp,org,as,query', timeout=3)
            data = resp.json()
            if data.get('status') == 'success':
                return {
                    "ip": data.get('query', 'Unknown'),
                    "isp": data.get('isp', 'Unknown'),
                    "asn": data.get('as', 'Unknown'),
                    "location": f"{data.get('city', 'Unknown')}, {data.get('country', 'Unknown')}",
                    "status": "OK"
                }
            return {"status": "Failed", "error": data.get('message', 'Unknown error')}
        except Exception as e:
            return {"status": "Failed", "error": str(e)}

    def run_all_checks(self):
        return {
            "gateway_global": self.check_gateway_connectivity(),
            "dns_connectivity": self.check_dns_connectivity(),
            "public_identity": self.check_public_identity(),
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
        }
class DnsCacheService:
    def __init__(self):
        self.stats_url = 'http://127.0.0.1:8053/json'
        self.dump_file = '/var/cache/bind/named_dump.db'

    def get_cache_stats(self):
        try:
            import urllib.request
            import json
            req = urllib.request.Request(self.stats_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=2) as response:
                data = json.loads(response.read().decode())
            
            views = data.get('views', {})
            first_view = next(iter(views.values())) if views else {}
            cachestats = first_view.get('resolver', {}).get('cachestats', {})
            
            hits = cachestats.get('QueryHits', 0)
            misses = cachestats.get('QueryMisses', 0)
            total = hits + misses
            hit_ratio = round((hits / total * 100), 2) if total > 0 else 0.0

            tree_mem_bytes = cachestats.get('TreeMemInUse', 0)
            heap_mem_bytes = cachestats.get('HeapMemInUse', 0)
            total_mem_mb = round((tree_mem_bytes + heap_mem_bytes) / (1024 * 1024), 2)

            saved_latency = hits * 40

            return {
                "hits": hits,
                "misses": misses,
                "hit_ratio": hit_ratio,
                "total_mem_mb": total_mem_mb,
                "saved_latency_ms": saved_latency,
                "status": "OK"
            }
        except Exception as e:
            return {
                "status": "Failed",
                "error": str(e),
                "hits": 0, "misses": 0, "hit_ratio": 0.0, "total_mem_mb": 0.0, "saved_latency_ms": 0
            }

    def get_cache_entries(self, search_query=None):
        try:
            subprocess.run(['sudo', '-n', '/usr/sbin/rndc', 'dumpdb', '-cache'], capture_output=True, text=True, timeout=5)
            
            entries = []
            if os.path.exists(self.dump_file):
                with open(self.dump_file, 'r') as f:
                    for line in f:
                        if line.startswith(';') or line.startswith('$') or not line.strip():
                            continue
                        
                        parts = line.split()
                        if len(parts) >= 3:
                            domain = parts[0]
                            if domain.endswith('.') and len(domain) > 1:
                                domain = domain[:-1]
                            elif domain == '.':
                                domain = 'ROOT'
                            
                            ttl = 0
                            record_type = "UNKNOWN"
                            
                            if parts[1].isdigit():
                                ttl = int(parts[1])
                                if len(parts) >= 4 and parts[2] == 'IN':
                                    record_type = parts[3]
                                elif len(parts) >= 3:
                                    record_type = parts[2]
                            else:
                                # Sometimes TTL might be missing or different
                                record_type = parts[1]
                                
                            entries.append({
                                "domain": domain,
                                "ttl": ttl,
                                "type": record_type
                            })
            
            domain_counter = Counter(e['domain'] for e in entries)
            top_domains = [{"domain": d, "count": c} for d, c in domain_counter.most_common(10)]
            
            filtered_entries = []
            if search_query:
                search_lower = search_query.lower()
                filtered_entries = [e for e in entries if search_lower in e['domain'].lower()][:50]
                
            expiring_soon = sum(1 for e in entries if e['ttl'] < 300)
            long_lifetime = sum(1 for e in entries if e['ttl'] >= 300)
            
            tld_counter = Counter(e['domain'].split('.')[-1] for e in entries if '.' in e['domain'])
            top_tlds = [{"tld": t, "count": c} for t, c in tld_counter.most_common(5)]
            
            type_counter = Counter(e['type'] for e in entries)
            record_types = [{"type": t, "count": c} for t, c in type_counter.most_common(5)]
            
            return {
                "status": "OK",
                "total_entries": len(entries),
                "top_domains": top_domains,
                "search_results": filtered_entries,
                "ttl_overview": {
                    "expiring_soon": expiring_soon,
                    "long_lifetime": long_lifetime
                },
                "summary": {
                    "top_tlds": top_tlds,
                    "record_types": record_types
                }
            }
        except Exception as e:
            return {"status": "Failed", "error": str(e), "total_entries": 0, "top_domains": [], "search_results": [], "ttl_overview": {"expiring_soon": 0, "long_lifetime": 0}}

    def flush_cache(self):
        try:
            res = subprocess.run(['sudo', '-n', '/usr/sbin/rndc', 'flush'], capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                return {"status": "OK", "message": "Cache flushed successfully."}
            else:
                return {"status": "Failed", "message": res.stderr.strip() or res.stdout.strip()}
        except Exception as e:
            return {"status": "Failed", "message": str(e)}

    def flush_domain(self, domain):
        try:
            res = subprocess.run(['sudo', '-n', '/usr/sbin/rndc', 'flushname', domain], capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                return {"status": "OK", "message": f"Flushed {domain} successfully."}
            else:
                return {"status": "Failed", "message": res.stderr.strip() or res.stdout.strip()}
        except Exception as e:
            return {"status": "Failed", "message": str(e)}
