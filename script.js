// === COHERENCY — Aurora v2 script ===

// ── Aurora Canvas ──────────────────────────────────────────
(function initAurora() {
    const canvas = document.getElementById('auroraCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, dpr;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Randomized time offset — never same pattern on load
    const seed = Math.random() * 500;
    let t = seed;

    // Scroll parallax — use rAF-synced value to avoid layout thrash
    let scrollY = 0;
    window.addEventListener('scroll', () => {
        scrollY = window.scrollY;
    }, { passive: true });

    function resize() {
        dpr = window.devicePixelRatio || 1;
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    // ── Ribbons — each with a random phase offset ──
    const ribbons = [
        { baseY: 0.22, amplitude: 65, waveLen: 0.8,  speed: 0.15, hue: 205, sat: 65, light: 80, alpha: 0.32, thickness: 200, phase: Math.random() * 10 },
        { baseY: 0.19, amplitude: 48, waveLen: 1.2,  speed: 0.28, hue: 210, sat: 50, light: 92, alpha: 0.28, thickness: 110, phase: Math.random() * 10 },
        { baseY: 0.28, amplitude: 58, waveLen: 0.6,  speed: 0.20, hue: 215, sat: 60, light: 70, alpha: 0.20, thickness: 150, phase: Math.random() * 10 },
        { baseY: 0.13, amplitude: 38, waveLen: 1.0,  speed: 0.13, hue: 220, sat: 55, light: 68, alpha: 0.15, thickness: 130, phase: Math.random() * 10 },
        { baseY: 0.17, amplitude: 52, waveLen: 0.5,  speed: 0.09, hue: 200, sat: 45, light: 78, alpha: 0.12, thickness: 100, phase: Math.random() * 10 },
        { baseY: 0.24, amplitude: 42, waveLen: 1.5,  speed: 0.38, hue: 205, sat: 20, light: 97, alpha: 0.22, thickness: 50,  phase: Math.random() * 10 },
        { baseY: 0.33, amplitude: 75, waveLen: 0.4,  speed: 0.11, hue: 215, sat: 55, light: 58, alpha: 0.16, thickness: 175, phase: Math.random() * 10 },
        { baseY: 0.21, amplitude: 30, waveLen: 2.2,  speed: 0.50, hue: 200, sat: 12, light: 98, alpha: 0.15, thickness: 25,  phase: Math.random() * 10 },
    ];

    // ── Particles ──
    const particles = [];
    const PARTICLE_COUNT = 80;

    function spawnParticle(init) {
        return {
            x: init ? Math.random() * (w || 1600) : -10,
            y: Math.random() * (h ? h * 0.5 : 400),
            vx: 0.15 + Math.random() * 0.4,
            vy: (Math.random() - 0.5) * 0.15,
            size: 1 + Math.random() * 2,
            hue: 200 + Math.random() * 25,
            alpha: 0.2 + Math.random() * 0.5,
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: 0.01 + Math.random() * 0.02,
        };
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(spawnParticle(true));
    }

    function drawRibbon(r, time) {
        const parallax = scrollY * 0.08;
        const y0 = r.baseY * h - parallax;
        const stripW = 6;
        const steps = Math.ceil(w / stripW);

        for (let i = 0; i <= steps; i++) {
            const x = i * stripW;
            const nx = x / w;

            const p = r.phase;
            const wave =
                Math.sin(nx * Math.PI * 2 * r.waveLen + time * r.speed + p) * r.amplitude +
                Math.sin(nx * Math.PI * 4 * r.waveLen + time * r.speed * 1.4 + p + 1.7) * r.amplitude * 0.45 +
                Math.sin(nx * Math.PI * 7 * r.waveLen + time * r.speed * 0.6 + p + 4.2) * r.amplitude * 0.2 +
                Math.sin(nx * Math.PI * 11 * r.waveLen + time * r.speed * 2.1 + p + 2.3) * r.amplitude * 0.08;

            const cy = y0 + wave;
            const grad = ctx.createLinearGradient(x, cy - r.thickness / 2, x, cy + r.thickness / 2);

            const shimmer = 0.5 + 0.3 * Math.sin(nx * Math.PI * 3.5 + time * r.speed * 0.6 + p)
                              + 0.2 * Math.sin(nx * Math.PI * 7 + time * r.speed * 1.2 + p * 2);
            const a = r.alpha * shimmer;

            const hueShift = Math.sin(nx * Math.PI * 2.5 + time * 0.08 + p) * 15
                           + Math.sin(nx * Math.PI * 5 + time * 0.15) * 6;
            const hue = r.hue + hueShift;

            grad.addColorStop(0,    `hsla(${hue}, ${r.sat}%, ${r.light}%, 0)`);
            grad.addColorStop(0.15, `hsla(${hue}, ${r.sat}%, ${r.light}%, ${a * 0.3})`);
            grad.addColorStop(0.3,  `hsla(${hue}, ${r.sat}%, ${Math.min(r.light + 8, 100)}%, ${a * 0.7})`);
            grad.addColorStop(0.45, `hsla(${hue}, ${r.sat}%, ${Math.min(r.light + 12, 100)}%, ${a * 0.95})`);
            grad.addColorStop(0.5,  `hsla(${hue}, ${r.sat + 5}%, ${Math.min(r.light + 15, 100)}%, ${a})`);
            grad.addColorStop(0.55, `hsla(${hue}, ${r.sat}%, ${Math.min(r.light + 12, 100)}%, ${a * 0.95})`);
            grad.addColorStop(0.7,  `hsla(${hue}, ${r.sat}%, ${Math.min(r.light + 8, 100)}%, ${a * 0.7})`);
            grad.addColorStop(0.85, `hsla(${hue}, ${r.sat}%, ${r.light}%, ${a * 0.3})`);
            grad.addColorStop(1,    `hsla(${hue}, ${r.sat}%, ${r.light}%, 0)`);

            ctx.fillStyle = grad;
            ctx.fillRect(x, cy - r.thickness / 2, stripW + 1, r.thickness);
        }
    }

    function drawParticles(time) {
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy + Math.sin(time * 0.3 + p.pulse) * 0.1;
            p.pulse += p.pulseSpeed;

            if (p.x > w + 20) {
                particles[i] = spawnParticle(false);
                continue;
            }

            const glow = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));

            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
            grad.addColorStop(0, `hsla(${p.hue}, 70%, 90%, ${glow * 0.7})`);
            grad.addColorStop(0.3, `hsla(${p.hue}, 60%, 80%, ${glow * 0.25})`);
            grad.addColorStop(1, `hsla(${p.hue}, 50%, 70%, 0)`);
            ctx.fillStyle = grad;
            ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 80%, 96%, ${glow * 0.9})`;
            ctx.fill();
        }
    }

    function drawVignette() {
        const grad = ctx.createRadialGradient(w / 2, h * 0.35, w * 0.3, w / 2, h * 0.35, w * 0.85);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.6, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    function render() {
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'screen';
        for (const r of ribbons) { drawRibbon(r, t); }
        drawParticles(t);
        ctx.globalCompositeOperation = 'source-over';
        drawVignette();

        ctx.globalCompositeOperation = 'destination-out';
        const fadeGrad = ctx.createLinearGradient(0, h * 0.32, 0, h);
        fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
        fadeGrad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
        fadeGrad.addColorStop(0.8, 'rgba(0,0,0,0.8)');
        fadeGrad.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(0, h * 0.32, w, h * 0.68);
        ctx.globalCompositeOperation = 'source-over';

        t += 0.02;
        requestAnimationFrame(render);
    }

    if (prefersReduced) {
        t = seed;
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'screen';
        for (const r of ribbons) { drawRibbon(r, t); }
        ctx.globalCompositeOperation = 'source-over';
        drawVignette();
        ctx.globalCompositeOperation = 'destination-out';
        const fadeGrad = ctx.createLinearGradient(0, h * 0.32, 0, h);
        fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
        fadeGrad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
        fadeGrad.addColorStop(0.8, 'rgba(0,0,0,0.8)');
        fadeGrad.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(0, h * 0.32, w, h * 0.68);
        ctx.globalCompositeOperation = 'source-over';
    } else {
        render();
    }
})();

// ── Hero text glow ────────────────────────────────────────
(function initHeroGlow() {
    const heroName = document.querySelector('.hero-name');
    if (!heroName || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let gt = Math.random() * 100;
    function breathe() {
        const intensity = 0.15 + 0.1 * Math.sin(gt * 0.015);
        const hue = 210 + 20 * Math.sin(gt * 0.008);
        const spread = 40 + 15 * Math.sin(gt * 0.012);
        heroName.style.textShadow =
            `0 0 ${spread}px hsla(${hue}, 70%, 60%, ${intensity}), ` +
            `0 0 ${spread * 2.5}px hsla(${hue + 15}, 60%, 50%, ${intensity * 0.4})`;
        gt++;
        requestAnimationFrame(breathe);
    }
    breathe();
})();

// ── Nav scroll state ──────────────────────────────────────
const nav = document.getElementById('nav');
if (nav) {
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ── GitHub repos ──────────────────────────────────────────
async function loadRepos() {
    const grid = document.getElementById('repoGrid');
    if (!grid) return;

    try {
        const res = await fetch('https://api.github.com/users/coherency1/repos?sort=updated&per_page=6');
        const repos = await res.json();

        if (!Array.isArray(repos) || repos.length === 0) {
            grid.innerHTML = '<div class="repo-loading">no repos found.</div>';
            return;
        }

        grid.innerHTML = repos.map(repo => `
            <a href="${repo.html_url}" target="_blank" rel="noopener" class="repo-card">
                <span class="repo-name">${repo.name}</span>
                ${repo.description ? `<span class="repo-desc">${repo.description}</span>` : ''}
                <div class="repo-meta">
                    ${repo.language ? `<span class="repo-lang">${repo.language}</span>` : ''}
                    <span>${repo.stargazers_count} stars</span>
                </div>
            </a>
        `).join('');

        const cards = grid.querySelectorAll('.repo-card');
        cards.forEach((card, i) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(12px)';
            setTimeout(() => {
                card.style.transition = `opacity 0.5s cubic-bezier(0.25, 1, 0.5, 1), transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)`;
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100 + i * 60);
        });
    } catch {
        grid.innerHTML = '<div class="repo-loading">could not load repos.</div>';
    }
}

loadRepos();

// ── Intersection observer for about section ───────────────
document.addEventListener('DOMContentLoaded', () => {
    const aboutText = document.querySelector('.about-text');
    if (aboutText && 'IntersectionObserver' in window) {
        aboutText.style.opacity = '0';
        aboutText.style.transform = 'translateY(16px)';

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.transition = 'opacity 0.7s cubic-bezier(0.25, 1, 0.5, 1), transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        observer.observe(aboutText);
    }
});
