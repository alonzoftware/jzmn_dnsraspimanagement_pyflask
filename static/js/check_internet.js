document.addEventListener('DOMContentLoaded', () => {
    const btnRunTest = document.getElementById('btnRunTest');
    const btnRunTestText = btnRunTest.querySelector('span');
    
    // UI Elements
    const valGwIp = document.getElementById('valGwIp');
    const valGwStatus = document.getElementById('valGwStatus');
    const valPing8888 = document.getElementById('valPing8888');
    const valPacketLoss = document.getElementById('valPacketLoss');
    
    const valUpstream8888 = document.getElementById('valUpstream8888');
    const valUpstream1111 = document.getElementById('valUpstream1111');
    const valRootHints = document.getElementById('valRootHints');
    const valResolutionTest = document.getElementById('valResolutionTest');
    
    const valPublicIp = document.getElementById('valPublicIp');
    const valIspAsn = document.getElementById('valIspAsn');
    const valLocation = document.getElementById('valLocation');
    
    const valLastUpdated = document.getElementById('valLastUpdated');

    const setStatusClass = (element, status) => {
        element.classList.remove('status-ok', 'status-warn', 'status-err');
        if (status === 'ok') element.classList.add('status-ok');
        else if (status === 'warn') element.classList.add('status-warn');
        else if (status === 'err') element.classList.add('status-err');
    };

    const runDiagnostics = async () => {
        btnRunTest.disabled = true;
        btnRunTest.classList.add('btn-loading');
        btnRunTestText.textContent = 'Running...';

        try {
            const response = await fetch('/api/internet-status');
            const data = await response.json();
            
            // 1. Gateway & Global
            const gw = data.gateway_global;
            valGwIp.textContent = gw.gateway_ip;
            
            if (gw.reachable) {
                valGwStatus.textContent = `${gw.latency_ms} ms`;
                setStatusClass(valGwStatus, 'ok');
            } else {
                valGwStatus.textContent = "Unreachable";
                setStatusClass(valGwStatus, 'err');
            }

            const ping8 = gw.global_ping["8.8.8.8"];
            if (ping8 && ping8.is_reachable) {
                valPing8888.textContent = `${ping8.latency_ms} ms`;
                setStatusClass(valPing8888, ping8.latency_ms > 100 ? 'warn' : 'ok');
            } else {
                valPing8888.textContent = "Failed";
                setStatusClass(valPing8888, 'err');
            }

            const loss = ping8 ? ping8.packet_loss_percent : 100.0;
            valPacketLoss.textContent = `${loss}%`;
            setStatusClass(valPacketLoss, loss === 0 ? 'ok' : (loss < 50 ? 'warn' : 'err'));

            // 2. DNS Connectivity
            const dns = data.dns_connectivity;
            
            const up8 = dns.upstream_resolvers["8.8.8.8"];
            if (up8 && up8.status === "OK") {
                valUpstream8888.textContent = `${up8.latency_ms} ms`;
                setStatusClass(valUpstream8888, up8.latency_ms > 50 ? 'warn' : 'ok');
            } else {
                valUpstream8888.textContent = "Failed";
                setStatusClass(valUpstream8888, 'err');
            }

            const up1 = dns.upstream_resolvers["1.1.1.1"];
            if (up1 && up1.status === "OK") {
                valUpstream1111.textContent = `${up1.latency_ms} ms`;
                setStatusClass(valUpstream1111, up1.latency_ms > 50 ? 'warn' : 'ok');
            } else {
                valUpstream1111.textContent = "Failed";
                setStatusClass(valUpstream1111, 'err');
            }

            const rootA = dns.root_servers["198.41.0.4"];
            const rootB = dns.root_servers["199.9.14.201"];
            if (rootA === "Reachable" || rootB === "Reachable") {
                valRootHints.textContent = "Reachable";
                setStatusClass(valRootHints, 'ok');
            } else {
                valRootHints.textContent = "Unreachable";
                setStatusClass(valRootHints, 'err');
            }

            const resTest = dns.resolution_test;
            if (resTest.status === "OK") {
                valResolutionTest.textContent = `${resTest.latency_ms} ms`;
                setStatusClass(valResolutionTest, 'ok');
            } else {
                valResolutionTest.textContent = "Failed";
                setStatusClass(valResolutionTest, 'err');
            }

            // 3. Public Identity
            const identity = data.public_identity;
            if (identity.status === "OK") {
                valPublicIp.textContent = identity.ip;
                valIspAsn.textContent = `${identity.isp} (${identity.asn})`;
                valLocation.textContent = identity.location;
                setStatusClass(valPublicIp, 'ok');
                setStatusClass(valIspAsn, 'ok');
                setStatusClass(valLocation, 'ok');
            } else {
                valPublicIp.textContent = "Error";
                valIspAsn.textContent = "Error";
                valLocation.textContent = "Error";
                setStatusClass(valPublicIp, 'err');
                setStatusClass(valIspAsn, 'err');
                setStatusClass(valLocation, 'err');
            }

            valLastUpdated.textContent = `Last check: ${data.timestamp}`;

        } catch (err) {
            console.error("Failed to run diagnostics", err);
            valLastUpdated.textContent = "Last check: Failed to retrieve data.";
        } finally {
            btnRunTest.disabled = false;
            btnRunTest.classList.remove('btn-loading');
            btnRunTestText.textContent = 'Run Full Test';
        }
    };

    btnRunTest.addEventListener('click', runDiagnostics);

    // Initial state logic or placeholder if needed can go here
});
