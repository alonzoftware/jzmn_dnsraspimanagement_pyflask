(function () {
    'use strict';

    const input = document.getElementById('dnssecDomain');
    const btn = document.getElementById('btnValidate');
    const errorBox = document.getElementById('dnssecError');
    const overallPanel = document.getElementById('overallPanel');
    const chainContainer = document.getElementById('chainContainer');
    const rawRecords = document.getElementById('rawRecords');
    const rawTrace = document.getElementById('rawTrace');

    const BADGE = { SECURE: 'badge-green', INSECURE: 'badge-yellow', BOGUS: 'badge-red' };
    const ICON = { SECURE: '🟢', INSECURE: '🟡', BOGUS: '🔴' };

    function esc(s) {
        return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    function badge(status) {
        // Status word lives in its own span so the i18n layer can translate it.
        return `<span class="badge ${BADGE[status] || 'badge-blue'}">${ICON[status] || ''} ` +
            `<span class="dnssec-status">${esc(status)}</span></span>`;
    }

    function showError(msg) { errorBox.textContent = msg; errorBox.style.display = 'block'; }

    function clearResults() {
        overallPanel.style.display = 'none';
        chainContainer.innerHTML = '';
        rawRecords.innerHTML = '';
        rawTrace.textContent = 'Run a validation to see the trace.';
    }

    function renderRecs(type, arr) {
        if (!arr || !arr.length) return '';
        if (type === 'DNSKEY') {
            return arr.map(k =>
                `<div class="dnssec-rec"><span class="badge ${k.role === 'KSK' ? 'badge-purple' : 'badge-blue'}">` +
                `${esc(k.role)} (${esc(k.flags)})</span> ` +
                `<span class="code-font">alg ${esc(k.algorithm)} · ${esc(k.public_key)}</span></div>`).join('');
        }
        if (type === 'DS') {
            return arr.map(x =>
                `<div class="dnssec-rec"><span class="code-font">tag ${esc(x.key_tag)} · ` +
                `${esc(x.digest_type)} · ${esc(x.digest)}</span></div>`).join('');
        }
        if (type === 'RRSIG') {
            return arr.map(s =>
                `<div class="dnssec-rec"><span class="code-font">${esc(s.type_covered)} · ` +
                `tag ${esc(s.key_tag)} · exp ${esc(s.expiration)}</span></div>`).join('');
        }
        // Plain text records (A, NSEC / NSEC3)
        return arr.map(x => `<div class="dnssec-rec"><span class="code-font">${esc(x)}</span></div>`).join('');
    }

    function recCard(title, body) {
        return `<div class="chart-card"><h4>${esc(title)}</h4>${body || '<p class="dnssec-empty">None.</p>'}</div>`;
    }

    function render(d) {
        overallPanel.style.display = 'block';
        overallPanel.innerHTML =
            `<div class="dnssec-overall"><strong>${esc(d.domain)}</strong> ${badge(d.overall_status)}` +
            `<span class="dnssec-flags">AD flag: ${d.ad_flag ? 'set ✔' : 'not set'}` +
            `${d.servfail ? ' · SERVFAIL' : ''}</span></div>`;

        chainContainer.innerHTML = d.chain.map((lvl, i) => {
            let recs = '';
            Object.keys(lvl.records).forEach(k => {
                const arr = lvl.records[k];
                if (!arr || !arr.length) return;
                recs += `<div class="dnssec-reclist"><span class="dnssec-reclabel">${esc(k)}</span>` +
                    `${renderRecs(k, arr)}</div>`;
            });
            const connector = i < d.chain.length - 1 ? '<div class="dnssec-connector">↓</div>' : '';
            return `<div class="dnssec-level dnssec-${lvl.status.toLowerCase()}">` +
                `<div class="dnssec-level-head"><h4>${esc(lvl.level)}</h4>${badge(lvl.status)}</div>` +
                `<p class="dnssec-detail">${esc(lvl.detail)}</p>` +
                `${recs || '<p class="dnssec-empty">No records returned.</p>'}</div>${connector}`;
        }).join('');

        const rr = d.raw_records;
        rawRecords.innerHTML =
            recCard('DNSKEY (KSK / ZSK)', renderRecs('DNSKEY', rr.DNSKEY)) +
            recCard('DS (Delegation Signer)', renderRecs('DS', rr.DS)) +
            recCard('RRSIG (Signatures)', renderRecs('RRSIG', rr.RRSIG)) +
            recCard('A Records', renderRecs('A', rr.A)) +
            recCard('NSEC / NSEC3', renderRecs('NSEC', rr.NSEC));

        rawTrace.textContent = d.raw_trace || 'No trace available.';
    }

    async function validate() {
        const domain = (input.value || '').trim();
        if (!domain) { showError('Please enter a domain.'); return; }
        errorBox.style.display = 'none';
        btn.disabled = true;
        const span = btn.querySelector('span');
        const original = span ? span.textContent : '';
        if (span) span.textContent = 'Validating...';
        try {
            const res = await fetch('/api/dnssec/validate?domain=' + encodeURIComponent(domain));
            const data = await res.json();
            if (data.error) { showError(data.error); clearResults(); }
            else render(data);
        } catch (e) {
            showError('Network error. Please try again.');
        } finally {
            btn.disabled = false;
            if (span) span.textContent = original || 'Test Validation';
        }
    }

    btn.addEventListener('click', validate);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') validate(); });

    // Deep-link support: ?domain=example.com prefills, &run=1 auto-validates.
    try {
        const params = new URLSearchParams(location.search);
        const qd = params.get('domain');
        if (qd) input.value = qd.trim();
        if (params.get('run') === '1') validate();
    } catch (e) { /* ignore */ }
})();
