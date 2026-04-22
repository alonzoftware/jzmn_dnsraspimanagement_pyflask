document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const valHitRatio = document.getElementById('valHitRatio');
    const valLatencySaved = document.getElementById('valLatencySaved');
    const valMemory = document.getElementById('valMemory');
    const valTotalEntries = document.getElementById('valTotalEntries');
    
    const valExpiringSoon = document.getElementById('valExpiringSoon');
    const valLongLifetime = document.getElementById('valLongLifetime');
    
    const tableTitle = document.getElementById('tableTitle');
    const countOrActionHeader = document.getElementById('countOrActionHeader');
    const cacheTableBody = document.querySelector('#cacheTable tbody');
    
    const tldTableBody = document.querySelector('#tldTable tbody');
    const typesTableBody = document.querySelector('#typesTable tbody');
    
    const btnRefresh = document.getElementById('btnRefresh');
    const btnFlushCache = document.getElementById('btnFlushCache');
    const btnSearch = document.getElementById('btnSearch');
    const btnFlushDomain = document.getElementById('btnFlushDomain');
    const inputDomainSearch = document.getElementById('inputDomainSearch');
    
    const flashMessage = document.getElementById('flashMessage');

    // Fetch Stats
    async function fetchStats() {
        try {
            const res = await fetch('/api/dns-cache/stats');
            const data = await res.json();
            
            if (data.status === 'OK') {
                valHitRatio.textContent = `${data.hit_ratio}%`;
                valLatencySaved.textContent = `${data.saved_latency_ms} ms`;
                valMemory.textContent = `${data.total_mem_mb} MB`;
            } else {
                console.error("Failed to fetch cache stats:", data.error);
            }
        } catch (err) {
            console.error("Error fetching stats:", err);
        }
    }

    // Fetch Entries
    async function fetchEntries(query = '') {
        try {
            const url = query ? `/api/dns-cache/entries?q=${encodeURIComponent(query)}` : '/api/dns-cache/entries';
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.status === 'OK') {
                valTotalEntries.textContent = data.total_entries;
                valExpiringSoon.textContent = data.ttl_overview.expiring_soon;
                valLongLifetime.textContent = data.ttl_overview.long_lifetime;
                
                cacheTableBody.innerHTML = '';
                
                if (query) {
                    tableTitle.textContent = `Search Results for "${query}"`;
                    countOrActionHeader.textContent = 'Action';
                    
                    if (data.search_results.length === 0) {
                        cacheTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No matching domains found in cache.</td></tr>`;
                    } else {
                        data.search_results.forEach(entry => {
                            const tr = document.createElement('tr');
                            // Truncate long values so they don't break the table UI
                            const displayValue = entry.value && entry.value.length > 50 ? entry.value.substring(0, 47) + '...' : (entry.value || '-');
                            tr.innerHTML = `
                                <td>${entry.domain}</td>
                                <td>${entry.type}</td>
                                <td style="word-break: break-all;">${displayValue}</td>
                                <td style="text-align: right;">${entry.ttl}</td>
                                <td style="text-align: right;">
                                    <button class="btn-control" style="padding: 4px 8px; font-size: 0.8rem; border-color: #ef4444; color: #ef4444;" onclick="flushSpecificDomain('${entry.domain}')">Flush</button>
                                </td>
                            `;
                            cacheTableBody.appendChild(tr);
                        });
                    }
                } else {
                    tableTitle.textContent = 'Top Cached Domains';
                    countOrActionHeader.textContent = 'Instances';
                    
                    if (data.top_domains.length === 0) {
                        cacheTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Cache is empty.</td></tr>`;
                    } else {
                        data.top_domains.forEach(item => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${item.domain}</td>
                                <td>Multiple</td>
                                <td>-</td>
                                <td style="text-align: right;">-</td>
                                <td style="text-align: right; color: var(--primary-color); font-weight: 600;">${item.count}</td>
                            `;
                            cacheTableBody.appendChild(tr);
                        });
                    }
                }
                
                if (data.summary) {
                    // Render TLDs
                    tldTableBody.innerHTML = '';
                    if (data.summary.top_tlds.length === 0) {
                        tldTableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted);">No data.</td></tr>`;
                    } else {
                        data.summary.top_tlds.forEach(item => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>.${item.tld}</td>
                                <td style="text-align: right; font-weight: 500;">${item.count}</td>
                            `;
                            tldTableBody.appendChild(tr);
                        });
                    }

                    // Render Types
                    typesTableBody.innerHTML = '';
                    if (data.summary.record_types.length === 0) {
                        typesTableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted);">No data.</td></tr>`;
                    } else {
                        data.summary.record_types.forEach(item => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${item.type}</td>
                                <td style="text-align: right; font-weight: 500;">${item.count}</td>
                            `;
                            typesTableBody.appendChild(tr);
                        });
                    }
                }
            } else {
                console.error("Failed to fetch cache entries:", data.error);
            }
        } catch (err) {
            console.error("Error fetching entries:", err);
        }
    }

    function showFlash(message, isError = false) {
        flashMessage.textContent = message;
        flashMessage.className = 'flash ' + (isError ? 'error' : 'success');
        flashMessage.style.display = 'block';
        setTimeout(() => {
            flashMessage.style.display = 'none';
        }, 5000);
    }

    // Flush Cache
    btnFlushCache.addEventListener('click', async () => {
        if (!confirm("Are you sure you want to flush the entire DNS cache? This may cause a temporary spike in upstream queries.")) {
            return;
        }
        
        btnFlushCache.disabled = true;
        btnFlushCache.innerHTML = '<span>Flushing...</span>';
        
        try {
            const res = await fetch('/api/dns-cache/flush', { method: 'POST' });
            const data = await res.json();
            
            if (data.status === 'OK') {
                showFlash("Cache flushed successfully.");
                fetchStats();
                fetchEntries();
            } else {
                showFlash("Failed to flush cache: " + data.message, true);
            }
        } catch (err) {
            showFlash("Error flushing cache.", true);
        } finally {
            btnFlushCache.disabled = false;
            btnFlushCache.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg><span>Flush Entire Cache</span>`;
        }
    });

    // Search and Flush Domain logic
    window.flushSpecificDomain = async function(domain) {
        if (!confirm(`Are you sure you want to flush ${domain} from the cache?`)) return;
        
        try {
            const res = await fetch('/api/dns-cache/flushname', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain })
            });
            const data = await res.json();
            if (data.status === 'OK') {
                showFlash(`Flushed ${domain} successfully.`);
                fetchEntries(inputDomainSearch.value.trim());
            } else {
                showFlash(`Failed to flush ${domain}: ` + data.message, true);
            }
        } catch (err) {
            showFlash(`Error flushing ${domain}.`, true);
        }
    };

    btnRefresh.addEventListener('click', () => {
        // Add a spinning class temporarily for feedback
        const svg = btnRefresh.querySelector('svg');
        if (svg) svg.style.animation = 'spin 1s linear infinite';
        
        const query = inputDomainSearch.value.trim();
        Promise.all([fetchStats(), fetchEntries(query)]).finally(() => {
            if (svg) svg.style.animation = 'none';
        });
    });

    btnSearch.addEventListener('click', () => {
        const query = inputDomainSearch.value.trim();
        fetchEntries(query);
    });

    btnFlushDomain.addEventListener('click', () => {
        const query = inputDomainSearch.value.trim();
        if (!query) {
            showFlash("Please enter a domain to flush.", true);
            return;
        }
        window.flushSpecificDomain(query);
    });

    inputDomainSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchEntries(inputDomainSearch.value.trim());
        }
    });

    // Initial fetch
    fetchStats();
    fetchEntries();
    
    // Auto refresh every 10 seconds
    setInterval(() => {
        fetchStats();
        // Only auto-refresh entries if not currently viewing search results
        if (!inputDomainSearch.value.trim()) {
            fetchEntries();
        }
    }, 10000);
});
