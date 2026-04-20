document.addEventListener('DOMContentLoaded', () => {
    // Chart configurations
    const qpsCtx = document.getElementById('qpsChart').getContext('2d');
    const typesCtx = document.getElementById('typesChart').getContext('2d');

    // Gradient for QPS line
    let gradient = qpsCtx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

    const qpsChart = new Chart(qpsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'QPS',
                data: [],
                borderColor: '#8b5cf6',
                backgroundColor: gradient,
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    const typesChart = new Chart(typesCtx, {
        type: 'doughnut',
        data: {
            labels: ['A', 'AAAA', 'CNAME', 'MX', 'TXT'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    '#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'right', labels: { color: '#f8fafc', usePointStyle: true, boxWidth: 8 } }
            }
        }
    });

    // Update Functions
    const fetchHealth = async () => {
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            
            document.getElementById('valCpu').innerText = `${data.cpu_percent}%`;
            document.getElementById('valRam').innerText = `${data.ram_percent}%`;
            document.getElementById('valTemp').innerText = `${data.temperature_c}°C`;
            document.getElementById('valUptime').innerText = data.os_uptime;
            document.getElementById('valBindVersion').innerText = `Version: ${data.bind_version}`;

            const statusInd = document.getElementById('bindStatusIndicator');
            const statusText = statusInd.querySelector('.text');
            if (data.bind_status === 'active') {
                statusInd.className = 'live-indicator active';
                statusText.innerText = 'BIND Active';
            } else {
                statusInd.className = 'live-indicator error';
                statusText.innerText = 'BIND Offline';
            }

        } catch (e) {
            console.error("Failed to fetch health metrics", e);
        }
    };

    const fetchDnsStats = async () => {
        try {
            const source = document.getElementById('dataSourceSelect').value;
            const res = await fetch(`/api/dns-stats?source=${source}`);
            const data = await res.json();
            
            // Update Text Metrics
            document.getElementById('valSuccessRate').innerText = `${data.success_rate}%`;
            document.getElementById('valFailRate').innerText = `${data.fail_rate}%`;
            document.getElementById('valLatency').innerText = `${data.latency_ms} ms`;

            // Update QPS Chart
            const timeLabel = data.timestamp;
            qpsChart.data.labels.push(timeLabel);
            qpsChart.data.datasets[0].data.push(data.qps);
            
            if (qpsChart.data.labels.length > 20) {
                qpsChart.data.labels.shift();
                qpsChart.data.datasets[0].data.shift();
            }
            qpsChart.update();

            // Update Types Chart
            typesChart.data.datasets[0].data = [
                data.query_types.A,
                data.query_types.AAAA,
                data.query_types.CNAME,
                data.query_types.MX,
                data.query_types.TXT
            ];
            typesChart.update();

        } catch (e) {
            console.error("Failed to fetch DNS stats", e);
        }
    };

    // Control State
    let healthInterval;
    let dnsInterval;
    let isMonitoring = false;

    const startMonitoring = () => {
        fetchHealth();
        fetchDnsStats();
        healthInterval = setInterval(fetchHealth, 5000);
        dnsInterval = setInterval(fetchDnsStats, 2000);
    };

    const stopMonitoring = () => {
        clearInterval(healthInterval);
        clearInterval(dnsInterval);
    };

    // Initial Start (just fetch once to populate, do not start intervals)
    fetchHealth();
    fetchDnsStats();

    // Event Listeners
    const btnToggle = document.getElementById('btnToggleMonitoring');
    btnToggle.addEventListener('click', () => {
        isMonitoring = !isMonitoring;
        if (isMonitoring) {
            startMonitoring();
            btnToggle.classList.remove('paused');
            btnToggle.classList.add('playing');
            btnToggle.querySelector('span').innerText = 'Stop Monitoring';
            btnToggle.querySelector('.icon-pause').style.display = 'block';
            btnToggle.querySelector('.icon-play').style.display = 'none';
        } else {
            stopMonitoring();
            btnToggle.classList.remove('playing');
            btnToggle.classList.add('paused');
            btnToggle.querySelector('span').innerText = 'Start Monitoring';
            btnToggle.querySelector('.icon-pause').style.display = 'none';
            btnToggle.querySelector('.icon-play').style.display = 'block';
        }
    });

    document.getElementById('dataSourceSelect').addEventListener('change', () => {
        if (isMonitoring) {
            fetchDnsStats(); // fetch immediately on change if active
        }
    });
});
