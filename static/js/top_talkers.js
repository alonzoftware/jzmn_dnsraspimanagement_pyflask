document.addEventListener('DOMContentLoaded', () => {
    const fetchTopTalkers = async () => {
        const btn = document.getElementById('btnRefresh');
        btn.style.opacity = '0.5';
        btn.querySelector('svg').style.animation = 'spin 1s linear infinite';

        try {
            const source = document.getElementById('dataSourceSelect').value;
            const res = await fetch(`/api/top-talkers?source=${source}`);
            const data = await res.json();

            const errorMsg = document.getElementById('errorMessage');
            if (data.error) {
                errorMsg.innerText = data.error;
                errorMsg.style.display = 'block';
            } else {
                errorMsg.style.display = 'none';
            }

            // Update Total Blocked
            document.getElementById('valTotalBlocked').innerText = data.total_blocked?.toLocaleString() || '0';

            // Update Clients Table
            const clientsTbody = document.querySelector('#clientsTable tbody');
            clientsTbody.innerHTML = '';
            (data.top_clients || []).forEach(client => {
                clientsTbody.innerHTML += `
                    <tr>
                        <td class="code-font">${client.ip}</td>
                        <td style="text-align: right;">
                            <span class="badge badge-purple">${client.count.toLocaleString()}</span>
                        </td>
                    </tr>
                `;
            });

            // Update Domains Table
            const domainsTbody = document.querySelector('#domainsTable tbody');
            domainsTbody.innerHTML = '';
            (data.top_domains || []).forEach(dom => {
                domainsTbody.innerHTML += `
                    <tr>
                        <td class="truncate" title="${dom.domain}">${dom.domain}</td>
                        <td style="text-align: right;">
                            <span class="badge badge-blue">${dom.count.toLocaleString()}</span>
                        </td>
                    </tr>
                `;
            });

            // Update RPZ Table
            const rpzTbody = document.querySelector('#rpzTable tbody');
            rpzTbody.innerHTML = '';
            (data.rpz_blocks || []).forEach(rpz => {
                rpzTbody.innerHTML += `
                    <tr>
                        <td class="text-danger">${rpz.domain}</td>
                        <td class="code-font">${rpz.client}</td>
                        <td style="text-align: right;">
                            <span class="badge badge-red">${rpz.count.toLocaleString()}</span>
                        </td>
                    </tr>
                `;
            });

        } catch (e) {
            console.error("Failed to fetch top talkers", e);
        } finally {
            btn.style.opacity = '1';
            btn.querySelector('svg').style.animation = 'none';
        }
    };

    // Initial Fetch
    fetchTopTalkers();

    // Event Listeners
    document.getElementById('btnRefresh').addEventListener('click', fetchTopTalkers);
    document.getElementById('dataSourceSelect').addEventListener('change', fetchTopTalkers);
});

// Add a quick keyframe for the spinning refresh icon
const style = document.createElement('style');
style.innerHTML = `
    @keyframes spin { 100% { transform: rotate(360deg); } }
`;
document.head.appendChild(style);