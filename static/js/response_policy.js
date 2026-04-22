document.addEventListener('DOMContentLoaded', () => {
    const rulesTableBody = document.querySelector('#rulesTable tbody');
    const flashMessage = document.getElementById('flashMessage');
    const valRuleCount = document.getElementById('valRuleCount');
    
    const btnReload = document.getElementById('btnReload');
    const btnSaveRules = document.getElementById('btnSaveRules');
    const btnAddRuleRow = document.getElementById('btnAddRuleRow');
    
    const btnOpenTextImport = document.getElementById('btnOpenTextImport');
    const modalTextImport = document.getElementById('modalTextImport');
    const btnCloseTextImport = document.getElementById('btnCloseTextImport');
    const btnProcessTextImport = document.getElementById('btnProcessTextImport');
    const inputTextImport = document.getElementById('inputTextImport');
    
    const inputFeedUrl = document.getElementById('inputFeedUrl');
    const btnImportFeed = document.getElementById('btnImportFeed');

    let rules = [];

    // --- Core Logic ---
    function fetchRules() {
        fetch('/api/rpz/rules')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'OK') {
                    rules = data.rules || [];
                    renderRules();
                } else {
                    showFlash('Error loading rules: ' + data.message, 'error');
                }
            })
            .catch(err => {
                showFlash('Failed to load rules: ' + err, 'error');
            });
    }

    function renderRules() {
        rulesTableBody.innerHTML = '';
        rules.forEach((rule, index) => {
            const tr = document.createElement('tr');
            
            // Domain
            const tdDomain = document.createElement('td');
            const inputDomain = document.createElement('input');
            inputDomain.type = 'text';
            inputDomain.className = 'control-input';
            inputDomain.value = rule.domain;
            inputDomain.addEventListener('input', (e) => rule.domain = e.target.value);
            tdDomain.appendChild(inputDomain);
            
            // Action Type
            const tdAction = document.createElement('td');
            const selectAction = document.createElement('select');
            selectAction.className = 'control-input';
            ['NXDOMAIN', 'NODATA', 'CNAME', 'PASSTHRU', 'A', 'AAAA'].forEach(act => {
                const opt = document.createElement('option');
                opt.value = act;
                opt.textContent = act;
                if (act === rule.action) opt.selected = true;
                selectAction.appendChild(opt);
            });
            selectAction.addEventListener('change', (e) => {
                rule.action = e.target.value;
                inputTarget.disabled = !['CNAME', 'A', 'AAAA'].includes(rule.action);
                if (inputTarget.disabled) inputTarget.value = '';
                else inputTarget.value = rule.target || '';
            });
            tdAction.appendChild(selectAction);
            
            // Target
            const tdTarget = document.createElement('td');
            const inputTarget = document.createElement('input');
            inputTarget.type = 'text';
            inputTarget.className = 'control-input';
            inputTarget.value = rule.target || '';
            inputTarget.disabled = !['CNAME', 'A', 'AAAA'].includes(rule.action);
            inputTarget.addEventListener('input', (e) => rule.target = e.target.value);
            tdTarget.appendChild(inputTarget);
            
            // Comment
            const tdComment = document.createElement('td');
            const inputComment = document.createElement('input');
            inputComment.type = 'text';
            inputComment.className = 'control-input';
            inputComment.value = rule.comment || '';
            inputComment.addEventListener('input', (e) => rule.comment = e.target.value);
            tdComment.appendChild(inputComment);
            
            // Actions
            const tdActions = document.createElement('td');
            tdActions.style.textAlign = 'right';
            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn-control btn-sm';
            btnDelete.style.borderColor = '#ef4444';
            btnDelete.style.color = '#ef4444';
            btnDelete.textContent = 'Delete';
            btnDelete.onclick = () => {
                rules.splice(index, 1);
                renderRules();
            };
            tdActions.appendChild(btnDelete);
            
            tr.appendChild(tdDomain);
            tr.appendChild(tdAction);
            tr.appendChild(tdTarget);
            tr.appendChild(tdComment);
            tr.appendChild(tdActions);
            
            rulesTableBody.appendChild(tr);
        });
        
        valRuleCount.textContent = rules.length;
    }

    function addEmptyRule() {
        rules.unshift({
            domain: '',
            action: 'NXDOMAIN',
            target: '',
            comment: ''
        });
        renderRules();
    }

    function saveRules() {
        const btn = btnSaveRules;
        const ogText = btn.innerHTML;
        btn.innerHTML = 'Saving...';
        btn.disabled = true;
        
        // Filter out empty domains
        const validRules = rules.filter(r => r.domain.trim() !== '');
        
        fetch('/api/rpz/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rules: validRules })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'OK') {
                showFlash(data.message, 'success');
                // Reload rules to reflect saved state
                fetchRules();
            } else {
                showFlash('Save failed: ' + data.message, 'error');
            }
        })
        .catch(err => showFlash('Save failed: ' + err, 'error'))
        .finally(() => {
            btn.innerHTML = ogText;
            btn.disabled = false;
        });
    }

    function reloadZone() {
        const btn = btnReload;
        const ogText = btn.innerHTML;
        btn.innerHTML = 'Reloading...';
        btn.disabled = true;
        
        fetch('/api/rpz/reload', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'OK') showFlash(data.message, 'success');
                else showFlash('Reload failed: ' + data.message, 'error');
            })
            .catch(err => showFlash('Reload failed: ' + err, 'error'))
            .finally(() => {
                btn.innerHTML = ogText;
                btn.disabled = false;
            });
    }

    function importFeed() {
        const url = inputFeedUrl.value.trim();
        if (!url) return showFlash('Please enter a feed URL', 'error');
        
        const btn = btnImportFeed;
        btn.textContent = 'Syncing...';
        btn.disabled = true;
        
        fetch('/api/rpz/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'OK') {
                const domains = data.domains || [];
                let added = 0;
                domains.forEach(d => {
                    if (!rules.some(r => r.domain === d)) {
                        rules.push({ domain: d, action: 'NXDOMAIN', target: '', comment: 'Imported from feed' });
                        added++;
                    }
                });
                renderRules();
                showFlash(`Imported ${added} new domains. Don't forget to save.`, 'success');
                inputFeedUrl.value = '';
            } else {
                showFlash('Import failed: ' + data.message, 'error');
            }
        })
        .catch(err => showFlash('Import failed: ' + err, 'error'))
        .finally(() => {
            btn.textContent = 'Sync Feed';
            btn.disabled = false;
        });
    }

    function processTextImport() {
        const text = inputTextImport.value;
        const lines = text.split('\n');
        let count = 0;
        lines.forEach(line => {
            const domain = line.trim();
            if (domain && !domain.startsWith('#')) {
                if (!rules.some(r => r.domain === domain)) {
                    rules.push({ domain: domain, action: 'NXDOMAIN', target: '', comment: 'Manual import' });
                    count++;
                }
            }
        });
        
        renderRules();
        modalTextImport.style.display = 'none';
        inputTextImport.value = '';
        showFlash(`Imported ${count} new domains. Don't forget to save.`, 'success');
    }

    // --- UI Helpers ---
    function showFlash(message, type = 'success') {
        flashMessage.textContent = message;
        flashMessage.className = 'flash ' + type;
        flashMessage.style.display = 'block';
        setTimeout(() => flashMessage.style.display = 'none', 5000);
    }

    // --- Event Listeners ---
    btnAddRuleRow.addEventListener('click', addEmptyRule);
    btnSaveRules.addEventListener('click', saveRules);
    btnReload.addEventListener('click', reloadZone);
    btnImportFeed.addEventListener('click', importFeed);
    
    btnOpenTextImport.addEventListener('click', () => modalTextImport.style.display = 'block');
    btnCloseTextImport.addEventListener('click', () => modalTextImport.style.display = 'none');
    btnProcessTextImport.addEventListener('click', processTextImport);
    window.addEventListener('click', (e) => {
        if (e.target == modalTextImport) modalTextImport.style.display = 'none';
    });

    // --- Init ---
    fetchRules();
});
