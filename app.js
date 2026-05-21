document.addEventListener('DOMContentLoaded', () => {
    let activeMode = 'url';
    let qrEngine = null;
    let localHistory = [];
    let refreshTimer;

    // UI Hooks
    const host = document.getElementById('canvas-host');
    const msg = document.getElementById('msg');
    const chars = document.getElementById('char-counter');
    const borderInfo = document.getElementById('border-label');

    function notify(text) {
        msg.textContent = text;
    }

    // Tab Switching
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            activeMode = btn.dataset.type;
            document.getElementById(`panel-${activeMode}`).classList.add('active');
            
            requestRender();
        });
    });

    function getPayload() {
        if (activeMode === 'url') return document.getElementById('inp-url').value.trim();
        if (activeMode === 'text') return document.getElementById('inp-text').value.trim();
        
        if (activeMode === 'wifi') {
            const s = document.getElementById('wifi-ssid').value.trim();
            const p = document.getElementById('wifi-pass').value.trim();
            const t = document.getElementById('wifi-sec').value;
            return s ? `WIFI:T:${t};S:${s};P:${p};;` : "";
        }
        
        if (activeMode === 'vcard') {
            const n = document.getElementById('vc-name').value.trim();
            const ph = document.getElementById('vc-phone').value.trim();
            const em = document.getElementById('vc-email').value.trim();
            const ur = document.getElementById('vc-url').value.trim();
            return n ? `BEGIN:VCARD\nVERSION:3.0\nFN:${n}\nTEL:${ph}\nEMAIL:${em}\nURL:${ur}\nEND:VCARD` : "";
        }
        return "";
    }

    function render() {
        const data = getPayload();
        if (!data) {
            notify("Awaiting input...");
            return;
        }

        chars.textContent = `${data.length} chars`;

        const res = parseInt(document.getElementById('qr-size').value);
        const fore = document.getElementById('qr-dark').value;
        const back = document.getElementById('qr-light').value;
        const level = document.getElementById('qr-ec').value;
        const icon = document.getElementById('qr-logo').value.trim();
        
        const thick = parseInt(document.getElementById('border-w').value);
        const gap = parseInt(document.getElementById('outline-w').value);

        host.innerHTML = '';
        
        qrEngine = new QRCodeStyling({
            width: res,
            height: res,
            type: "canvas",
            data: data,
            image: icon || null,
            dotsOptions: { color: fore, type: "square" },
            backgroundOptions: { color: "transparent" },
            imageOptions: { crossOrigin: "anonymous", margin: 6 },
            qrOptions: { errorCorrectionLevel: level }
        });

        const frame = document.createElement('div');
        frame.style.cssText = `
            display: inline-block;
            background: ${back};
            padding: ${gap}px;
            border: ${thick}px solid ${fore};
            outline: ${thick}px solid ${fore};
            outline-offset: ${gap}px;
            margin: ${thick + gap}px;
        `;

        host.appendChild(frame);
        qrEngine.append(frame);

        borderInfo.textContent = `${thick}px + ${gap}px`;
        notify(`Generated ${res}px`);
        
        updateHistory(data);
    }

    function requestRender() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(render, 100);
    }

    // Bind all inputs
    document.querySelectorAll('input, textarea, select').forEach(el => {
        el.addEventListener('input', (e) => {
            if (e.target.id === 'border-w') document.getElementById('bw-val').textContent = `${e.target.value}px`;
            if (e.target.id === 'outline-w') document.getElementById('ow-val').textContent = `${e.target.value}px`;
            requestRender();
        });
    });

    function updateHistory(str) {
        if (!str || localHistory[0] === str) return;
        localHistory = [str, ...localHistory.filter(s => s !== str)].slice(0, 5);
        
        const hSection = document.getElementById('history');
        const hList = document.getElementById('history-list');
        
        hSection.style.display = 'block';
        hList.innerHTML = localHistory.map(item => `
            <div class="history-item" title="${item}">${item}</div>
        `).join('');

        document.querySelectorAll('.history-item').forEach((node, i) => {
            node.onclick = () => {
                const val = localHistory[i];
                if (val.includes('WIFI:')) {
                    document.querySelector('[data-type="wifi"]').click();
                } else if (val.includes('VCARD')) {
                    document.querySelector('[data-type="vcard"]').click();
                } else if (val.startsWith('http')) {
                    document.getElementById('inp-url').value = val;
                    document.querySelector('[data-type="url"]').click();
                } else {
                    document.getElementById('inp-text').value = val;
                    document.querySelector('[data-type="text"]').click();
                }
            };
        });
    }

    async function buildComposite() {
        const res = parseInt(document.getElementById('qr-size').value);
        const fore = document.getElementById('qr-dark').value;
        const back = document.getElementById('qr-light').value;
        const thick = parseInt(document.getElementById('border-w').value);
        const gap = parseInt(document.getElementById('outline-w').value);
        
        const offset = thick + gap + thick;
        const full = res + (offset * 2);

        const canvas = document.createElement('canvas');
        canvas.width = full;
        canvas.height = full;
        const ctx = canvas.getContext('2d');

        // Layers
        ctx.fillStyle = fore;
        ctx.fillRect(0, 0, full, full);

        ctx.fillStyle = back;
        ctx.fillRect(thick, thick, full - (thick * 2), full - (thick * 2));

        ctx.fillStyle = fore;
        ctx.fillRect(thick + gap, thick + gap, full - ((thick + gap) * 2), full - ((thick + gap) * 2));

        const qrCanvas = await qrEngine.getRawData('canvas');
        ctx.drawImage(qrCanvas, offset, offset, res, res);

        return canvas;
    }

    document.getElementById('btn-save').addEventListener('click', async () => {
        const c = await buildComposite();
        const link = document.createElement('a');
        link.download = `qraft-${Date.now()}.png`;
        link.href = c.toDataURL();
        link.click();
        notify("Saved PNG");
    });

    document.getElementById('btn-copy').addEventListener('click', async () => {
        const c = await buildComposite();
        c.toBlob(blob => {
            try {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                notify("Copied to clipboard");
            } catch (e) {
                notify("Copy failed");
            }
        });
    });

    // Start
    requestRender();
});
