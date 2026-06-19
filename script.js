/* ═══════════════════════════════════════════════════════════════
   script.js  —  Lógica principal del portfolio
   ═══════════════════════════════════════════════════════════════
   1. Carga dinámica de secciones desde /secciones/*.html
   2. Switcher de idioma ES ↔ EN
   3. Scroll reveal (aparición animada)
   4. Efecto de escritura en terminal lines
   5. Highlight del link activo en el nav
   6. Filtros de Labs (categoría + dificultad + contadores)
   7. Carrusel de Certificaciones
   8. Widget de TryHackMe
   ═══════════════════════════════════════════════════════════════ */

// ── CONFIG ──────────────────────────────────────────────────────
// Orden en que se cargan las secciones — debe coincidir con los archivos en /secciones/
const SECCIONES = ['hero', 'sobre', 'experiencia', 'proyectos', 'labs', 'certificaciones', 'contacto'];
let currentLang = localStorage.getItem('lang') || 'es';



// ════════════════════════════════════════════════════════════════
// 1. CARGA DE SECCIONES
// Descarga cada HTML de /secciones/ e inyecta todo en #main-content
// ════════════════════════════════════════════════════════════════
async function cargarSecciones() {
  const main   = document.getElementById('main-content');
  const loader = document.getElementById('page-loader');

  const fetches = SECCIONES.map(s =>
    fetch(`secciones/${s}.html`).then(r => r.text())
  );

  try {
    const htmls = await Promise.all(fetches);
    main.innerHTML = htmls.join('\n');
  } catch (err) {
    // Aparece si abrís index.html directo sin servidor (file://)
    main.innerHTML = `
      <section style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem">
        <div>
          <p style="font-family:var(--font-mono);color:var(--green);font-size:0.9rem;margin-bottom:1rem">
            ⚠️  Para ver el portfolio necesitás un servidor local.
          </p>
          <p style="color:var(--muted2);font-size:0.85rem;margin-bottom:0.5rem">Correlo con cualquiera de estas opciones:</p>
          <code style="display:block;background:var(--card);border:1px solid var(--border2);border-radius:8px;padding:1rem;font-family:var(--font-mono);color:var(--green2);margin:1rem auto;max-width:400px;font-size:0.85rem">
            npx serve .<br>— ó —<br>python -m http.server 8000
          </code>
          <p style="color:var(--muted);font-size:0.8rem">Luego abrí http://localhost:8000</p>
        </div>
      </section>`;
  }

  // Ocultar loader
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 600);
  }

  // Inicializar funciones una sola vez, en orden
  aplicarIdioma(currentLang);
  initScrollReveal();
  initTypingEffect();
  initNavHighlight();
  initLabFilters();    // filtros + contadores + badges write-up
  initTHMWidget();     // widget de TryHackMe
  initCertsCarousel(); // carrusel de certificaciones
}


// ════════════════════════════════════════════════════════════════
// 2. IDIOMA
// Cambia todos los elementos con data-es / data-en
// ════════════════════════════════════════════════════════════════
function aplicarIdioma(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);

  // Marcar botón activo en el switcher del nav
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // Reemplazar el contenido de todos los elementos bilingües
  document.querySelectorAll('[data-es][data-en]').forEach(el => {
    const texto = el.dataset[lang];
    if (texto) el.innerHTML = texto; // innerHTML para soportar <strong>, etc.
  });

  document.documentElement.lang = lang;

  // Reiniciar el efecto de escritura por si la terminal line cambió de idioma
  initTypingEffect();
}


// ════════════════════════════════════════════════════════════════
// 3. SCROLL REVEAL
// Los elementos con clase .reveal aparecen al entrar en el viewport
// ════════════════════════════════════════════════════════════════
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        observer.unobserve(entry.target); // solo se anima una vez
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}


// ════════════════════════════════════════════════════════════════
// 4. EFECTO DE ESCRITURA EN TERMINAL
// Anima el texto de los elementos .terminal-line letra por letra
// ════════════════════════════════════════════════════════════════
function initTypingEffect() {
  document.querySelectorAll('.terminal-line').forEach(line => {
    line.dataset.typed = '';
    const texto = line.dataset[currentLang] || line.textContent.trim();

    line.innerHTML = '';
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    line.appendChild(cursor);

    let i = 0;
    const type = () => {
      if (i < texto.length) {
        line.insertBefore(document.createTextNode(texto[i]), cursor);
        i++;
        setTimeout(type, 28);
      }
    };

    // Solo arranca cuando la línea es visible en pantalla
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { type(); obs.disconnect(); }
    }, { threshold: 0.5 });
    obs.observe(line);
  });
}


// ════════════════════════════════════════════════════════════════
// 5. NAV HIGHLIGHT
// Marca en verde el link del nav que corresponde a la sección visible
// ════════════════════════════════════════════════════════════════
function initNavHighlight() {
  const navLinks = document.querySelectorAll('.nav-links a');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { threshold: 0.4 });

  document.querySelectorAll('section[id]').forEach(s => observer.observe(s));
}


// ════════════════════════════════════════════════════════════════
// 6. FILTROS DE LABS
// - Agrega el badge "Write-up ✓" a las cards con data-has-writeup="true"
// - Pone contadores en cada botón de filtro
// - Filtra por categoría (data-category) O dificultad (data-difficulty)
// - Actualiza los stats de Easy/Medium/Hard según las cards visibles
// - Muestra el empty state si no hay resultados
// ════════════════════════════════════════════════════════════════
function initLabFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const labCards   = document.querySelectorAll('.lab-card');
  const emptyEl    = document.getElementById('labsEmpty');
  const grid       = document.getElementById('labsGrid');

  // Contar cuántas cards hay por filtro
  function getCount(filter) {
    let count = 0;
    labCards.forEach(card => {
      const cat  = card.dataset.category  || '';
      const diff = card.dataset.difficulty || '';
      if (filter === 'all') count++;
      else if (['easy', 'medium', 'hard'].includes(filter) && diff === filter) count++;
      else if (cat === filter) count++;
    });
    return count;
  }

  // Poner el número entre paréntesis en cada botón
  filterBtns.forEach(btn => {
    const filter = btn.dataset.filter;
    let countEl = btn.querySelector('.filter-count');
    if (!countEl) {
      countEl = document.createElement('span');
      countEl.className = 'filter-count';
      btn.appendChild(countEl);
    }
    countEl.textContent = getCount(filter);
  });

  // Actualizar las píldoras Easy / Medium / Hard
  function updateStats(visibleCards) {
    const statEasy   = document.getElementById('statEasy');
    const statMedium = document.getElementById('statMedium');
    const statHard   = document.getElementById('statHard');

    let easy = 0, medium = 0, hard = 0;
    visibleCards.forEach(c => {
      const d = c.dataset.difficulty || '';
      if (d === 'easy')   easy++;
      if (d === 'medium') medium++;
      if (d === 'hard')   hard++;
    });

    if (statEasy)   statEasy.querySelector('span').innerHTML   = `Easy <strong>${easy}</strong>`;
    if (statMedium) statMedium.querySelector('span').innerHTML = `Medium <strong>${medium}</strong>`;
    if (statHard)   statHard.querySelector('span').innerHTML   = `Hard <strong>${hard}</strong>`;
  }

  // Aplicar un filtro y animar las cards
  function applyFilter(filter) {
    const visible = [];

    labCards.forEach((card, i) => {
      const cat  = card.dataset.category  || '';
      const diff = card.dataset.difficulty || '';

      const show =
        filter === 'all' ||
        (['easy', 'medium', 'hard'].includes(filter) && diff === filter) ||
        cat === filter;

      if (show) {
        card.classList.remove('hidden');
        card.style.opacity    = '0';
        card.style.transform  = 'translateY(14px)';
        card.style.transition = 'none';
        setTimeout(() => {
          card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          card.style.opacity    = '1';
          card.style.transform  = 'translateY(0)';
        }, i * 35 + 20);
        visible.push(card);
      } else {
        card.classList.add('hidden');
        card.style.opacity    = '';
        card.style.transform  = '';
        card.style.transition = '';
      }
    });

    // Empty state
    if (emptyEl) emptyEl.style.display = visible.length === 0 ? 'block' : 'none';
    if (grid)    grid.style.display    = visible.length === 0 ? 'none'  : 'grid';

    updateStats(visible);
  }

  // Eventos de los botones
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.filter);
    });
  });

  // Arrancar mostrando todo
  applyFilter('all');
}


// ════════════════════════════════════════════════════════════════
// 7. CARRUSEL DE CERTIFICACIONES
// Muestra 4 cards a la vez (3 en tablet, 1 en mobile)
// Flechas prev/next y dots de navegación
// ════════════════════════════════════════════════════════════════
function initCertsCarousel() {
  const track   = document.getElementById('certsTrack');
  const dotsEl  = document.getElementById('certsDots');
  const btnPrev = document.getElementById('certPrev');
  const btnNext = document.getElementById('certNext');

  if (!track) return;

  const cards = Array.from(track.querySelectorAll('.cert-badge-card'));
  let current = 0;

  function visibleCount() {
    if (window.innerWidth >= 1100) return 4;
    if (window.innerWidth >= 680)  return 3;
    return 1;
  }

  function totalPages() {
    return Math.ceil(cards.length / visibleCount());
  }

  function buildDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    for (let i = 0; i < totalPages(); i++) {
      const dot = document.createElement('button');
      dot.className = 'cert-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Ir al grupo ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(dot);
    }
  }

  function goTo(page) {
    current = Math.max(0, Math.min(page, totalPages() - 1));

    const cardWidth = cards[0] ? cards[0].offsetWidth : 0;
    const gap = 20; // 1.25rem
    track.style.transform  = `translateX(-${current * visibleCount() * (cardWidth + gap)}px)`;
    track.style.transition = 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    if (dotsEl) {
      dotsEl.querySelectorAll('.cert-dot').forEach((d, i) => {
        d.classList.toggle('active', i === current);
      });
    }

    if (btnPrev) btnPrev.disabled = current === 0;
    if (btnNext) btnNext.disabled = current >= totalPages() - 1;
  }

  if (btnPrev) btnPrev.addEventListener('click', () => goTo(current - 1));
  if (btnNext) btnNext.addEventListener('click', () => goTo(current + 1));

  // Swipe táctil en mobile
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goTo(diff > 0 ? current + 1 : current - 1);
  });

  // Recalcular al cambiar tamaño de ventana
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { buildDots(); goTo(0); }, 200);
  });

  buildDots();
  goTo(0);
}


// ════════════════════════════════════════════════════════════════
// 8. WIDGET TRYHACKME
// Intenta traer datos de la API pública.
// Si falla por CORS, muestra stats hardcodeadas.
// ════════════════════════════════════════════════════════════════
async function initTHMWidget() {
  const body = document.getElementById('thmBody');
  if (!body) return;

  const USERNAME = 'guadalupesavall'; 

  try {
    // allorigins actúa como proxy CORS para evitar el bloqueo del browser
    const url = `https://api.allorigins.win/get?url=${encodeURIComponent(
      `https://tryhackme.com/p/guadalupesavall`
    )}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error('proxy error');

    const wrapper = await res.json();
    const data    = JSON.parse(wrapper.contents);

    const rooms  = data.completedRooms ?? '25+';
    const points = data.points         ?? '—';
    const rank   = data.userRank       ?? '—';

    body.innerHTML = `
      <div class="thm-stats-row">
        <div class="thm-stat">
          <div class="thm-stat-num">${rooms}</div>
          <div class="thm-stat-label">Rooms</div>
        </div>
        <div class="thm-stat">
          <div class="thm-stat-num">${typeof points === 'number' ? points.toLocaleString() : points}</div>
          <div class="thm-stat-label">Points</div>
        </div>
        <div class="thm-stat">
          <div class="thm-stat-num">${rank}</div>
          <div class="thm-stat-label">Global rank</div>
        </div>
      </div>
      <a href="https://tryhackme.com/p/guadalupesavall" class="thm-profile-link" target="_blank" rel="noopener">
        Ver perfil completo →
      </a>`;

  } catch (err) {
    // Fallback con tus stats reales — actualizalas cuando quieras
    body.innerHTML = `
      <div class="thm-stats-row">
        <div class="thm-stat">
          <div class="thm-stat-num">Top 20%</div>
          <div class="thm-stat-label">Global rank</div>
        </div>
        <div class="thm-stat">
          <div class="thm-stat-num">4</div>
          <div class="thm-stat-label">Badges</div>
        </div>
        <div class="thm-stat">
          <div class="thm-stat-num">38</div>
          <div class="thm-stat-label">Completed rooms</div>
        </div>
      </div>
      <a href="https://tryhackme.com/p/guadalupesavall" class="thm-profile-link" target="_blank" rel="noopener">
        Ver perfil completo →
      </a>`;

    // Animar la barra (ajustá el % según tu percentil real)
    
  }
}


// ════════════════════════════════════════════════════════════════
// INICIAR — espera a que el DOM esté listo
// ════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Conectar botones del switcher de idioma (están en el nav, fuera de #main-content)
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => aplicarIdioma(btn.dataset.lang));
  });

  cargarSecciones();
});