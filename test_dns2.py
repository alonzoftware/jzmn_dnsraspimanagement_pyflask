import dns.resolver
import time
import subprocess

subprocess.run(['sudo', '-n', '/usr/sbin/rndc', 'flush'], capture_output=True)

for ip in ["127.0.0.1", "1.1.1.1", "8.8.8.8", "200.87.100.10", "200.105.128.40", "200.73.96.146"]:
    res = dns.resolver.Resolver(configure=False)
    res.nameservers = [ip]
    res.lifetime = 2.0
    start = time.time()
    try:
        res.resolve('google.com', 'A')
        print(f"{ip}: OK ({(time.time()-start)*1000:.2f} ms)")
    except Exception as e:
        print(f"{ip}: Failed: {type(e).__name__}")
