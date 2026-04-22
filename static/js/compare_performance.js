document.addEventListener('DOMContentLoaded', () => {
    const domainsEditor = document.getElementById('domainsEditor');
    const btnSaveDomains = document.getElementById('btnSaveDomains');
    const btnRunBenchmark = document.getElementById('btnRunBenchmark');
    const metricsTableBody = document.querySelector('#metricsTable tbody');
    const winnerBadge = document.getElementById('winnerBadge');
    const winnerText = document.getElementById('winnerText');
    const benchmarkInfo = document.getElementById('benchmarkInfo');

    let raceChart;

    function initChart() {
        const ctx = document.getElementById('raceChart').getContext('2d');
        raceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Cold Start (ms)',
                        data: [],
                        backgroundColor: 'rgba(239, 68, 68, 0.7)', // Red
                        borderColor: 'rgba(239, 68, 68, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Cached Response (ms)',
                        data: [],
                        backgroundColor: 'rgba(34, 197, 94, 0.7)', // Green
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Response Time (ms)',
                            color: '#94a3b8'
                        },
                        ticks: { color: '#94a3b8' },
                        grid: { color: '#334155' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#f8fafc' }
                    }
                }
            }
        });
    }

    async function loadDomains() {
        try {
            const res = await fetch('/api/compare-performance/domains');
            const data = await res.json();
            if (data.domains) {
                domainsEditor.value = data.domains.join('\n');
            }
        } catch (err) {
            console.error('Error loading domains:', err);
        }
    }

    async function saveDomains() {
        const text = domainsEditor.value;
        const domains = text.split('\n').map(d => d.trim()).filter(d => d.length > 0);
        
        btnSaveDomains.disabled = true;
        btnSaveDomains.textContent = 'Saving...';
        
        try {
            const res = await fetch('/api/compare-performance/domains', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domains })
            });
            const data = await res.json();
            if (data.status === 'OK') {
                btnSaveDomains.textContent = 'Saved!';
                setTimeout(() => { btnSaveDomains.textContent = 'Save Domains'; btnSaveDomains.disabled = false; }, 2000);
            }
        } catch (err) {
            console.error('Error saving domains:', err);
            btnSaveDomains.textContent = 'Error!';
            setTimeout(() => { btnSaveDomains.textContent = 'Save Domains'; btnSaveDomains.disabled = false; }, 2000);
        }
    }

    async function runBenchmark() {
        btnRunBenchmark.disabled = true;
        btnRunBenchmark.innerHTML = `
            <svg class="icon-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
            <span>Racing...</span>
        `;
        winnerBadge.style.display = 'none';
        benchmarkInfo.textContent = 'Running test against all resolvers. This may take a few seconds...';

        try {
            const res = await fetch('/api/compare-performance/benchmark');
            const data = await res.json();
            
            if (data.results) {
                updateUI(data);
            }
        } catch (err) {
            console.error('Benchmark failed:', err);
            benchmarkInfo.textContent = 'Benchmark failed to complete.';
        } finally {
            btnRunBenchmark.disabled = false;
            btnRunBenchmark.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Start Race</span>
            `;
        }
    }

    function updateUI(data) {
        const results = data.results;
        
        let winner = null;
        let minTime = Infinity;
        
        metricsTableBody.innerHTML = '';
        
        const labels = [];
        const coldData = [];
        const cachedData = [];
        
        results.forEach(r => {
            const isReachable = r.success_rate > 0 || r.cold_ms > 0;

            labels.push(isReachable ? r.resolver_name : `${r.resolver_name} (Offline)`);
            coldData.push(r.cold_ms);
            cachedData.push(r.cached_ms);
            
            if (isReachable && r.cached_ms < minTime) {
                minTime = r.cached_ms;
                winner = r.resolver_name;
            }
            
            const tr = document.createElement('tr');
            if (isReachable) {
                tr.innerHTML = `
                    <td><strong>${r.resolver_name}</strong> <span style="color:var(--text-muted); font-size:0.8rem;">(${r.ip})</span></td>
                    <td style="text-align: right;">${r.cold_ms.toFixed(2)}</td>
                    <td style="text-align: right; color: #22c55e; font-weight: bold;">${r.cached_ms.toFixed(2)}</td>
                    <td style="text-align: right;">${r.success_rate.toFixed(1)}%</td>
                `;
            } else {
                tr.innerHTML = `
                    <td><strong>${r.resolver_name}</strong> <span style="color:var(--text-muted); font-size:0.8rem;">(${r.ip})</span></td>
                    <td colspan="3" style="text-align: center; color: #ef4444; font-weight: bold;">Unreachable (ISP Blocked / Offline)</td>
                `;
            }
            metricsTableBody.appendChild(tr);
        });
        
        raceChart.data.labels = labels;
        raceChart.data.datasets[0].data = coldData;
        raceChart.data.datasets[1].data = cachedData;
        raceChart.update();
        
        if (winner) {
            winnerText.textContent = `${winner} Wins! (${minTime.toFixed(2)}ms)`;
            winnerBadge.style.display = 'inline-flex';
        } else {
            winnerBadge.style.display = 'none';
        }
        
        benchmarkInfo.textContent = `Tested Domains: ${data.test_domains.join(', ')}`;
    }

    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .icon-spin { animation: spin 1s linear infinite; }
    `;
    document.head.appendChild(style);

    initChart();
    loadDomains();
    
    btnSaveDomains.addEventListener('click', saveDomains);
    btnRunBenchmark.addEventListener('click', runBenchmark);
});
