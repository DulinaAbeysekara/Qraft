document.addEventListener('DOMContentLoaded', () => {
    let activeMode = 'url';
    let qrEngine = null;
    let localHistory = [];
    let refreshTimer;
    let rawLogoData = null; // Original uploaded image
    let processedLogo = null; // Image with alpha applied

    // UI Hooks
    const host = document.getElementById('canvas-host');
    const msg = document.getElementById('msg');
    const chars = document.getElementById('char-counter');
    const borderInfo = document.getElementById('border-label');
    const logoInput = document.getElementById('qr-logo-file');
    const clearLogoBtn = document.getElementById('btn-clear-logo');
    
    // Logo sliders
    const logoSizeInput = document.getElementById('logo-size');
    const logoAlphaInput = document.getElementById('logo-alpha');
    const logoSizeLabel = document.getElementById('logo-size-val');
    const logoAlphaLabel = document.getElementById('logo-alpha-val');

    // Export UI
    const exportToggle = document.getElementById('btn-export-toggle');
    const exportMenu = document.getElementById('export-menu');

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

    // Apply alpha to image via offscreen canvas
    async function applyAlpha(dataUrl, alpha) {
        if (!dataUrl) return null;
        if (alpha >= 1) return dataUrl;
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = alpha;
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL());
            };
            img.src = dataUrl;
        });
    }

    // Handle Logo File Upload
    logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            rawLogoData = event.target.result;
            processedLogo = await applyAlpha(rawLogoData, parseFloat(logoAlphaInput.value));
            requestRender();
        };
        reader.readAsDataURL(file);
    });

    clearLogoBtn.addEventListener('click', () => {
        logoInput.value = "";
        rawLogoData = null;
        processedLogo = null;
        requestRender();
    });

    async function render() {
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
        
        const thick = parseInt(document.getElementById('border-w').value);
        const gap = parseInt(document.getElementById('outline-w').value);
        
        // Logo settings
        const logoSize = parseInt(logoSizeInput.value) / 100;
        const logoAlpha = parseFloat(logoAlphaInput.value);

        // Update processed logo if alpha changed
        processedLogo = await applyAlpha(rawLogoData, logoAlpha);

        host.innerHTML = '';
        
        qrEngine = new QRCodeStyling({
            width: res,
            height: res,
            type: "canvas",
            data: data,
            image: processedLogo || null,
            dotsOptions: { color: fore, type: "square" },
            backgroundOptions: { color: "transparent" },
            imageOptions: { 
                crossOrigin: "anonymous", 
                margin: 6,
                imageSize: logoSize // Pass the size factor
            },
            qrOptions: { errorCorrectionLevel: level }
        });

        // Scaled preview for better UI fit
        const scale = 0.5;
        const thickPre = Math.max(1, thick * scale);
        const gapPre = Math.max(1, gap * scale);

        const frame = document.createElement('div');
        frame.style.cssText = `
            display: inline-block;
            background: ${back};
            padding: ${gapPre}px;
            border: ${thickPre}px solid ${fore};
            outline: ${thickPre}px solid ${fore};
            outline-offset: ${gapPre}px;
            margin: ${thickPre + gapPre}px;
            max-width: 100%;
        `;

        host.appendChild(frame);
        qrEngine.append(frame);

        borderInfo.textContent = `${thick}px + ${gap}px`;
        notify(`Generated ${res}px`);
        
        updateHistory(data);
    }

    function requestRender() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(render, 150);
    }

    // Bind all inputs
    document.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.id === 'qr-logo-file') return; // Handled separately
        el.addEventListener('input', (e) => {
            // Update labels for the new sliders
            if (e.target.id === 'logo-size') logoSizeLabel.textContent = `${e.target.value}%`;
            if (e.target.id === 'logo-alpha') logoAlphaLabel.textContent = e.target.value;
            
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

    // Export Dropdown Logic
    exportToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        exportMenu.classList.toggle('show');
    });

    async function downloadSVG() {
        if (!qrEngine) return;
        
        const res = parseInt(document.getElementById('qr-size').value);
        const fore = document.getElementById('qr-dark').value;
        const back = document.getElementById('qr-light').value;
        const thick = parseInt(document.getElementById('border-w').value);
        const gap = parseInt(document.getElementById('outline-w').value);
        
        const offset = thick + gap + thick;
        const full = res + (offset * 2);

        // Get raw SVG from engine
        const svgBlob = await qrEngine.getRawData('svg');
        const svgText = await svgBlob.text();
        
        // Parse the SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
        const originalSvg = svgDoc.documentElement;
        
        // Create new SVG with full dimensions
        const newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        newSvg.setAttribute("width", full);
        newSvg.setAttribute("height", full);
        newSvg.setAttribute("viewBox", `0 0 ${full} ${full}`);
        newSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

        // 1. Outer Frame (Fore color)
        const outer = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        outer.setAttribute("width", full);
        outer.setAttribute("height", full);
        outer.setAttribute("fill", fore);
        newSvg.appendChild(outer);

        // 2. Inner Padding (Back color)
        const middle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        middle.setAttribute("x", thick);
        middle.setAttribute("y", thick);
        middle.setAttribute("width", full - (thick * 2));
        middle.setAttribute("height", full - (thick * 2));
        middle.setAttribute("fill", back);
        newSvg.appendChild(middle);

        // 3. Inner Frame (Fore color)
        const inner = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        inner.setAttribute("x", thick + gap);
        inner.setAttribute("y", thick + gap);
        inner.setAttribute("width", full - ((thick + gap) * 2));
        inner.setAttribute("height", full - ((thick + gap) * 2));
        inner.setAttribute("fill", fore);
        newSvg.appendChild(inner);

        // 4. Background for QR area (Back color)
        const qrBack = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        qrBack.setAttribute("x", offset);
        qrBack.setAttribute("y", offset);
        qrBack.setAttribute("width", res);
        qrBack.setAttribute("height", res);
        qrBack.setAttribute("fill", back);
        newSvg.appendChild(qrBack);

        // 5. Inject QR content
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", `translate(${offset}, ${offset})`);
        
        // Move children from original SVG to group
        while (originalSvg.firstChild) {
            g.appendChild(originalSvg.firstChild);
        }
        newSvg.appendChild(g);

        // Trigger Download
        const finalSvgText = new XMLSerializer().serializeToString(newSvg);
        const blob = new Blob([finalSvgText], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qraft-${Date.now()}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    }

    async function downloadJPEG() {
        if (!qrEngine) return;
        
        // Get the raw canvas from the engine
        const sourceCanvas = host.querySelector('canvas');
        console.log('JPEG Export Debug:', {
            canvas: sourceCanvas,
            width: sourceCanvas?.width,
            height: sourceCanvas?.height,
            style: sourceCanvas?.getAttribute('style'),
            isVisible: !!(sourceCanvas?.offsetWidth || sourceCanvas?.offsetHeight || sourceCanvas?.getClientRects().length)
        });

        if (!sourceCanvas) return;

        const res = parseInt(document.getElementById('qr-size').value);
        const fore = document.getElementById('qr-dark').value;
        const back = document.getElementById('qr-light').value;
        const thick = parseInt(document.getElementById('border-w').value);
        const gap = parseInt(document.getElementById('outline-w').value);
        
        const offset = thick + gap + thick;
        const full = res + (offset * 2);

        // Instead of using the scaled-down preview canvas, we need the full-size QR code.
        // We'll temporarily update the engine to the target resolution (without scaling)
        // and background color to ensure dots are visible on white.
        
        // Save current state
        const originalWidth = qrEngine._options.width;
        const originalHeight = qrEngine._options.height;
        const originalBackground = qrEngine._options.backgroundOptions.color;

        // Update to full size for export
        qrEngine.update({
            width: res,
            height: res,
            backgroundOptions: { color: back } // Ensure background is NOT transparent for drawImage safety
        });

        // Wait a tiny bit for the engine to re-render the internal canvas
        await new Promise(r => setTimeout(r, 100));
        const fullCanvas = await qrEngine.getRawData('png').then(blob => {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => {
                    const c = document.createElement('canvas');
                    c.width = res;
                    c.height = res;
                    c.getContext('2d').drawImage(img, 0, 0);
                    resolve(c);
                };
                img.src = URL.createObjectURL(blob);
            });
        });

        // Create composite for JPEG
        const canvas = document.createElement('canvas');
        canvas.width = full;
        canvas.height = full;
        const ctx = canvas.getContext('2d');

        // JPEG needs a solid background (White as requested)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the double border layers (matching PNG/SVG logic)
        ctx.fillStyle = fore;
        ctx.fillRect(0, 0, full, full);
        ctx.fillStyle = back;
        ctx.fillRect(thick, thick, full - (thick * 2), full - (thick * 2));
        ctx.fillStyle = fore;
        ctx.fillRect(thick + gap, thick + gap, full - ((thick + gap) * 2), full - ((thick + gap) * 2));

        // Draw the QR area background first (as per instructions: draw white rect then QR)
        ctx.fillStyle = back;
        ctx.fillRect(offset, offset, res, res);

        // Draw the QR dots
        ctx.drawImage(fullCanvas, offset, offset, res, res);

        const link = document.createElement('a');
        link.download = `qraft-${Date.now()}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 1.0);
        link.click();

        // Restore engine state for preview
        qrEngine.update({
            width: originalWidth,
            height: originalHeight,
            backgroundOptions: { color: originalBackground }
        });
    }

    document.querySelectorAll('.dropdown-menu button').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!qrEngine) return;
            const format = btn.dataset.format;
            
            if (format === 'svg') {
                await downloadSVG();
            } else if (format === 'jpeg') {
                await downloadJPEG();
            } else {
                qrEngine.download({ 
                    name: `qraft-${Date.now()}`, 
                    extension: format 
                });
            }
            
            notify(`Saved ${format.toUpperCase()}`);
            exportMenu.classList.remove('show');
        });
    });

    // Close dropdown on click outside
    window.addEventListener('click', () => {
        exportMenu.classList.remove('show');
    });

    document.getElementById('btn-copy').addEventListener('click', async () => {
        if (!qrEngine) return;
        try {
            // Get the raw canvas from the engine
            const sourceCanvas = host.querySelector('canvas');
            if (!sourceCanvas) throw new Error("Canvas not ready");

            const res = parseInt(document.getElementById('qr-size').value);
            const fore = document.getElementById('qr-dark').value;
            const back = document.getElementById('qr-light').value;
            const thick = parseInt(document.getElementById('border-w').value);
            const gap = parseInt(document.getElementById('outline-w').value);
            
            const offset = thick + gap + thick;
            const full = res + (offset * 2);

            // Re-create composite for clipboard
            const canvas = document.createElement('canvas');
            canvas.width = full;
            canvas.height = full;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = fore;
            ctx.fillRect(0, 0, full, full);
            ctx.fillStyle = back;
            ctx.fillRect(thick, thick, full - (thick * 2), full - (thick * 2));
            ctx.fillStyle = fore;
            ctx.fillRect(thick + gap, thick + gap, full - ((thick + gap) * 2), full - ((thick + gap) * 2));

            ctx.drawImage(sourceCanvas, offset, offset, res, res);

            canvas.toBlob(blob => {
                const item = new ClipboardItem({ "image/png": blob });
                navigator.clipboard.write([item]);
                notify("Copied to clipboard");
            });
        } catch (e) {
            notify("Copy failed");
            console.error(e);
        }
    });

    // Start
    requestRender();
});
