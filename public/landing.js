import { elements, modelFaces, roomStyles } from './builder-engine.js';
import { company, estimateProject, formatMoney, formatNumber, systems } from './core.js';
import { makeTemplate, templates } from './templates.js';
import { compileScene, createModelRenderer } from './model-renderer.js';

const pt = {
  workflow: 'Como funciona',
  designs: 'Projetos',
  construction: 'Construção',
  guide: 'Guias',
  calculator: 'Calculadoras',
  planner: 'Abrir planeador',
  skip: 'Saltar para o conteúdo',
  language: 'Idioma e região',
  languageError: 'Não foi possível alterar o idioma.',
  menu: 'Menu',
  light: 'Ativar tema claro',
  dark: 'Ativar tema escuro',
  eyebrow: 'Planeador de casas',
  title: 'A sua casa,',
  titleAccent: 'do primeiro traço.',
  summary: 'Desenhe a planta, explore a casa em 3D e estime o custo de construir em Portugal.',
  start: 'Começar a desenhar',
  explore: 'Explorar projetos',
  heroAlt: 'Casa térrea de cal branca, telha de barro e pérgula de madeira entre oliveiras.',
  heroCaption: 'Casa no Alentejo · Estudo conceptual',
  workflowTitle: 'Da ideia ao projeto',
  steps: [
    ['Desenhe a planta', 'Distribua as divisões, ajuste as medidas e coloque portas, janelas e mobiliário.'],
    ['Explore em 3D', 'Veja os volumes da casa e descubra como os espaços se relacionam.'],
    ['Estime a construção', 'Compare sistemas construtivos e obtenha uma estimativa em euros à medida que desenha.'],
  ],
  projectsTitle: 'Uma planta para começar',
  libraryTitle: 'Biblioteca de projetos',
  openLibrary: 'Ver biblioteca',
  projectsDescription: 'Escolha um projeto de exemplo e altere a distribuição, as dimensões e o sistema construtivo no planeador.',
  projectPicker: 'Projetos de exemplo',
  plan: 'Planta',
  model: 'Vista 3D',
  costs: 'Estimativa',
  floor: 'Piso',
  options: 'Vistas do projeto',
  openTemplate: 'Adaptar este projeto',
  area: 'Área de planta',
  structure: 'Sistema construtivo',
  base: 'Valor de referência por m²',
  total: 'Estimativa de materiais',
  subtotal: {
    structure: 'Estrutura', envelope: 'Envolvente', interior: 'Interiores', installation: 'Instalações',
  },
  estimateNote: 'Valores indicativos com dados de demonstração.',
  planLabel: 'Planta esquemática do projeto',
  modelLabel: 'Maquete axonométrica do projeto',
  studio: 'Sistemas construtivos',
  systemsTitle: 'Da madeira ao betão',
  systemsDescription: 'Explore cinco formas de construir e experimente cada uma no planeador.',
  chooseSystem: 'Experimentar no planeador',
  toolsTitle: 'Prepare os próximos passos',
  tools: [
    ['Guias práticos', 'Da leitura de uma planta à comparação de sistemas construtivos.', '/guias', 'Ler guias'],
    ['Calculadoras de obra', 'Estime áreas e quantidades de materiais para comparar soluções.', '/calculadoras', 'Abrir calculadoras'],
  ],
  contact: 'Contacto',
  about: 'Sobre',
  privacy: 'Privacidade',
  terms: 'Termos',
  region: 'Portugal',
  privacySettings: 'Preferências de privacidade',
  preferencesTitle: 'Preferências de privacidade',
  preferencesDescription: 'O Casovara utiliza cookies para guardar o idioma e o tema. O planeador também utiliza um cookie para associar os projetos guardados à sua sessão.',
  resetPreferences: 'Usar tema automático',
  close: 'Fechar',
};

const en = {
  workflow: 'How it works',
  designs: 'Projects',
  construction: 'Construction',
  guide: 'Guides',
  calculator: 'Calculators',
  planner: 'Open planner',
  skip: 'Skip to content',
  language: 'Language and region',
  languageError: 'Could not change language.',
  menu: 'Menu',
  light: 'Switch to light theme',
  dark: 'Switch to dark theme',
  eyebrow: 'Home design planner',
  title: 'Your home,',
  titleAccent: 'from the first sketch.',
  summary: 'Draw your floor plan, explore your home in 3D and estimate the cost of building in Portugal.',
  start: 'Start designing',
  explore: 'Explore projects',
  heroAlt: 'Single-storey limewashed house with a clay tile roof and timber pergola among olive trees.',
  heroCaption: 'House in Alentejo · Concept study',
  workflowTitle: 'From idea to plan',
  steps: [
    ['Draw the floor plan', 'Arrange rooms, adjust dimensions and add doors, windows and furniture.'],
    ['Explore in 3D', 'View the shape of your home and see how the spaces connect.'],
    ['Estimate your build', 'Compare construction systems and see an estimate in euros as you draw.'],
  ],
  projectsTitle: 'A plan to get you started',
  libraryTitle: 'Project library',
  openLibrary: 'Browse the library',
  projectsDescription: 'Pick an example and adjust its layout, dimensions and construction system in the planner.',
  projectPicker: 'Example projects',
  plan: 'Floor plan',
  model: '3D view',
  costs: 'Estimate',
  floor: 'Floor',
  options: 'Project views',
  openTemplate: 'Adapt this project',
  area: 'Floor area',
  structure: 'Construction system',
  base: 'Indicative rate per m²',
  total: 'Materials estimate',
  subtotal: {
    structure: 'Structure', envelope: 'Envelope', interior: 'Interiors', installation: 'Building services',
  },
  estimateNote: 'Indicative estimates based on demonstration data.',
  planLabel: 'Schematic floor plan of the project',
  modelLabel: 'Axonometric model of the project',
  studio: 'Construction systems',
  systemsTitle: 'From timber to concrete',
  systemsDescription: 'Explore five ways to build and try each one in the planner.',
  chooseSystem: 'Try in the planner',
  toolsTitle: 'Plan your next steps',
  tools: [
    ['Practical guides', 'From reading a floor plan to comparing construction systems.', '/guias', 'Read guides'],
    ['Construction calculators', 'Estimate areas and quantities of materials to compare options.', '/calculadoras', 'Open calculators'],
  ],
  contact: 'Contact',
  about: 'About',
  privacy: 'Privacy',
  terms: 'Terms',
  region: 'Portugal',
  privacySettings: 'Privacy preferences',
  preferencesTitle: 'Privacy preferences',
  preferencesDescription: 'Casovara uses cookies to remember your language and theme. The planner also uses a cookie to link saved projects to your session.',
  resetPreferences: 'Use automatic theme',
  close: 'Close',
};

const international = {
  ...en,
  summary: 'Draw a floor plan, explore your home in 3D, and estimate construction costs for your project in Portugal.',
  heroAlt: 'One-story limewashed home with a clay tile roof and wood pergola among olive trees.',
  systemsTitle: 'From wood to concrete',
};

const strings = { 'pt-PT': pt, 'en-PT': en, 'en-INT': international };
const themeKey = 'casovara_theme';

function localized(value, locale) {
  return typeof value === 'string' ? value : value?.[locale] ?? value?.['pt-PT'] ?? '';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function hrefWith(base, name, value) {
  const url = new URL(base, window.location.origin);
  url.searchParams.set(name, value);
  return escapeHtml(url.pathname + url.search + url.hash);
}

function effectiveTheme() {
  const match = document.cookie.match(/(?:^|;\s*)casovara_theme=(light|dark)(?:;|$)/);
  return match?.[1] ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function setThemePreference(value) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${themeKey}=${value}; Path=/; SameSite=Lax; Max-Age=${value ? 31536000 : 0}${secure}`;
}

function glyph(name) {
  const paths = {
    arrow: '<path d="M3 8h10m-4-4 4 4-4 4"/>',
    diagonal: '<path d="M4 12 12 4m-6 0h6v6"/>',
    arrowdown: '<path d="M8 3v10m-4-4 4 4 4-4"/>',
    sun: '<circle cx="8" cy="8" r="3"/><path d="M8 1v2m0 10v2M1 8h2m10 0h2M3 3l1.4 1.4m7.2 7.2L13 13M13 3l-1.4 1.4m-7.2 7.2L3 13"/>',
    moon: '<path d="M13.8 9.4A5.9 5.9 0 0 1 6.6 2.2a6 6 0 1 0 7.2 7.2Z"/>',
    plan: '<path d="M2 2h12v12H2zm6 0v5m0 3v4M2 7h6m3 0h3"/>',
    model: '<path d="m8 1.6 6 3.4v6l-6 3.4L2 11V5l6-3.4ZM2 5l6 3.5L14 5M8 8.5v5.8"/>',
    costs: '<path d="M13 4a4.5 4.5 0 1 0 0 8M3.2 7h7m-7 2h6"/>',
    guide: '<path d="M8 4C6 2.5 4 2 1.5 2.5v10c2.5-.5 4.5 0 6.5 1.5 2-1.5 4-2 6.5-1.5v-10C12 2 10 2.5 8 4Zm0 0v9.8"/>',
    calc: '<rect x="3" y="1.5" width="10" height="13" rx="1"/><path d="M5.5 4h5m-5 3h1m3 0h1m-5 2.5h1m3 0h1m-5 2.5h1m3 0h1"/>',
    close: '<path d="m4 4 8 8m0-8-8 8"/>',
  };
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

function wordmark(homeUrl) {
  return `<a class="cv-wordmark" href="${escapeHtml(homeUrl)}" aria-label="Casovara"><img src="/brand.svg" alt="" width="29" height="29"><span>casovara</span></a>`;
}

function projectOptions(locale) {
  return templates.map((template, index) => `
    <button type="button" aria-pressed="${index === 0}" data-project="${escapeHtml(template.id)}" class="cv-project-option">
      <span>${escapeHtml(localized(template.name, locale))}</span>
      <small>${formatNumber(template.area, locale, 0)} m²</small>
    </button>`).join('');
}

function renderSystems(locale, appUrl, c) {
  return systems.map(system => `
    <article class="cv-system" style="--cv-swatch:${escapeHtml(system.accent)}">
      <div class="cv-system-swatch" data-system-pattern="${escapeHtml(system.id)}" aria-hidden="true"></div>
      <h3>${escapeHtml(localized(system.name, locale))}</h3>
      <p>${escapeHtml(localized(system.description, locale))}</p>
      <a href="${hrefWith(appUrl, 'system', system.id)}">${c.chooseSystem} ${glyph('diagonal')}</a>
    </article>`).join('');
}

export function renderLanding(root, { locale, homeUrl = '/', appUrl = '/app', setLocale, view: page }) {
  const c = strings[locale] ?? pt;
  const app = escapeHtml(appUrl);
  const library = page === 'library';
  const sectionHref = id => library ? escapeHtml(homeUrl) + '#' + id : '#' + id;
  root.innerHTML = `
    <div class="cv-landing">
      <a class="cv-skip" href="#cv-content">${c.skip}</a>
      <header class="cv-header">
        <div class="cv-shell cv-header-inner">
          ${wordmark(homeUrl)}
          <nav class="cv-nav" aria-label="${c.menu}">
            <a href="${sectionHref('como-funciona')}">${c.workflow}</a>
            <a href="/biblioteca"${library ? ' aria-current="page"' : ''}>${c.designs}</a>
            <a href="${sectionHref('construcao')}">${c.construction}</a>
            <a href="/guias">${c.guide}</a>
          </nav>
          <div class="cv-header-actions">
            <select class="cv-language" id="cv-language" aria-label="${c.language}">
              <option value="pt-PT"${locale === 'pt-PT' ? ' selected' : ''}>PT · PT</option>
              <option value="en-PT"${locale === 'en-PT' ? ' selected' : ''}>EN · PT</option>
              <option value="en-INT"${locale === 'en-INT' ? ' selected' : ''}>EN · INT</option>
            </select>
            <button type="button" class="cv-icon-button" id="cv-theme"></button>
            <a class="cv-button cv-primary cv-header-cta" href="${app}">${c.planner} ${glyph('diagonal')}</a>
            <details class="cv-mobile-menu">
              <summary>${c.menu}</summary>
              <nav aria-label="${c.menu}">
                <a href="${sectionHref('como-funciona')}">${c.workflow}</a>
                <a href="/biblioteca"${library ? ' aria-current="page"' : ''}>${c.designs}</a>
                <a href="${sectionHref('construcao')}">${c.construction}</a>
                <a href="/guias">${c.guide}</a>
                <a href="/calculadoras">${c.calculator}</a>
                <a href="${app}">${c.planner} ${glyph('diagonal')}</a>
              </nav>
            </details>
          </div>
        </div>
        <p class="cv-shell cv-language-status" role="status"></p>
      </header>
      <main id="cv-content" tabindex="-1">
        ${library ? '' : `<section class="cv-shell cv-hero" aria-labelledby="cv-hero-title">
          <div class="cv-hero-copy">
            <p class="cv-kicker">${c.eyebrow}</p>
            <h1 id="cv-hero-title">${c.title}<br><em>${c.titleAccent}</em></h1>
            <p class="cv-hero-summary">${c.summary}</p>
            <div class="cv-hero-actions">
              <a class="cv-button cv-primary" href="${app}">${c.start} ${glyph('arrow')}</a>
              <a class="cv-text-link" href="#projetos">${c.explore} ${glyph('arrowdown')}</a>
            </div>
          </div>
          <figure class="cv-hero-picture">
            <img src="/media/casa-alentejo.webp" srcset="/media/casa-alentejo-768.webp 768w, /media/casa-alentejo.webp 1536w"
                 sizes="(max-width: 820px) 100vw, (max-width: 1364px) 60vw, 803px"
                 alt="${c.heroAlt}" width="1536" height="1024" fetchpriority="high" decoding="async">
            <figcaption>${c.heroCaption}</figcaption>
          </figure>
        </section>
        <section class="cv-workflow" id="como-funciona">
          <div class="cv-shell">
            <h2>${c.workflowTitle}</h2>
            <div class="cv-step-grid">
              ${c.steps.map(([title, description], index) => `
                <article class="cv-step">
                  <span class="cv-step-icon">${glyph(['plan', 'model', 'costs'][index])}</span>
                  <div><h3>${title}</h3><p>${description}</p></div>
                </article>`).join('')}
            </div>
          </div>
        </section>`}
        <section class="cv-shell cv-projects" id="projetos">
          <div class="cv-section-heading">
            ${library ? `<h1>${c.libraryTitle}</h1>` : `<h2>${c.projectsTitle}</h2>`}
            <p>${c.projectsDescription}</p>
          </div>
          <div class="cv-project-box">
            <div class="cv-project-picker" aria-label="${c.projectPicker}">${projectOptions(locale)}</div>
            <div class="cv-project-main">
              <div class="cv-preview-toolbar">
              <div class="cv-preview-tabs" role="tablist" aria-label="${c.options}">
                ${[['plan', c.plan], ['model', c.model], ['costs', c.costs]].map(([id, label], index) => `
                  <button type="button" id="cv-tab-${id}" role="tab" aria-controls="cv-project-panel"
                          aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-view="${id}">${glyph(id)} ${label}</button>`).join('')}
              </div><select id="cv-project-floor" class="cv-floor" aria-label="${c.floor}" hidden></select></div>
              <div class="cv-project-panel" id="cv-project-panel" role="tabpanel" aria-labelledby="cv-tab-plan" tabindex="0"></div>
            </div>
            <div class="cv-project-detail" aria-live="polite">
              <div><h3 id="cv-project-name"></h3><p id="cv-project-description"></p></div>
              <a id="cv-copy-project" class="cv-button cv-primary" href="${app}">${c.openTemplate} ${glyph('diagonal')}</a>
            </div>
          </div>
          ${library ? '' : `<a class="cv-text-link cv-library-link" href="/biblioteca">${c.openLibrary} ${glyph('arrow')}</a>`}
        </section>
        ${library ? '' : `<section class="cv-construction" id="construcao">
          <div class="cv-shell">
            <div class="cv-section-heading">
              <div><p class="cv-kicker">${c.studio}</p><h2>${c.systemsTitle}</h2></div>
              <p>${c.systemsDescription}</p>
            </div>
            <div class="cv-system-grid">${renderSystems(locale, appUrl, c)}</div>
          </div>
        </section>`}
        <section class="cv-shell cv-tools" id="recursos">
          <h2>${c.toolsTitle}</h2>
          <div class="cv-resources">
            ${c.tools.map(([title, description, href, label], index) => `
              <article class="cv-resource">
                <span class="cv-step-icon">${glyph(index === 0 ? 'guide' : 'calc')}</span>
                <div><h3>${title}</h3><p>${description}</p><a href="${href}">${label} ${glyph('diagonal')}</a></div>
              </article>`).join('')}
          </div>
        </section>
      </main>
      <footer class="cv-footer">
        <div class="cv-shell cv-footer-inner">
          <div>
            ${wordmark(homeUrl)}
            <p>${escapeHtml(company.name)} · ${c.region}</p>
          </div>
          <nav aria-label="Casovara">
            <a href="/sobre">${c.about}</a>
            <a href="/contacto">${c.contact}</a>
            <a href="/privacidade">${c.privacy}</a>
            <a href="/termos">${c.terms}</a>
            <button type="button" id="cv-open-preferences">${c.privacySettings}</button>
          </nav>
        </div>
      </footer>
      <dialog class="cv-preferences" id="cv-preferences" aria-labelledby="cv-preferences-title">
        <form method="dialog">
          <h2 id="cv-preferences-title">${c.preferencesTitle}</h2>
          <button type="submit" class="cv-icon-button cv-close" aria-label="${c.close}">${glyph('close')}</button>
          <p>${c.preferencesDescription}</p>
          <button type="button" class="cv-button cv-primary" id="cv-reset-preferences">${c.resetPreferences}</button>
        </form>
      </dialog>
    </div>`;

  const find = selector => root.querySelector(selector);
  const landing = find('.cv-landing');
  const theme = find('#cv-theme');
  const applyTheme = value => {
    landing.dataset.theme = value;
    theme.innerHTML = glyph(value === 'dark' ? 'sun' : 'moon');
    theme.setAttribute('aria-label', value === 'dark' ? c.light : c.dark);
    theme.title = value === 'dark' ? c.light : c.dark;
  };

  applyTheme(effectiveTheme());
  theme.addEventListener('click', () => {
    const value = landing.dataset.theme === 'dark' ? 'light' : 'dark';
    setThemePreference(value);
    applyTheme(value);
  });
  find('#cv-language').addEventListener('change', async event => {
    const input = event.currentTarget;
    find('.cv-language-status').textContent = '';
    try {
      await setLocale(input.value);
    } catch {
      input.value = locale;
      find('.cv-language-status').textContent = c.languageError;
    }
  });
  find('.cv-mobile-menu nav').addEventListener('click', event => {
    if (event.target.closest('a')) find('.cv-mobile-menu').open = false;
  });

  const preferences = find('#cv-preferences');
  find('#cv-open-preferences').addEventListener('click', () => preferences.showModal());
  find('#cv-reset-preferences').addEventListener('click', () => {
    setThemePreference('');
    applyTheme(effectiveTheme());
    preferences.close();
  });

  const tabs = [...landing.querySelectorAll('[role=tab]')];
  const options = [...landing.querySelectorAll('[data-project]')];
  const panel = find('#cv-project-panel');
  const floorPicker = find('#cv-project-floor');
  let project = templates[0];
  let view = 'plan';
  let floor = 0;

  const showProject = () => {
    const system = systems.find(item => item.id === project.systemId) ?? systems[0];
    const model = makeTemplate(project.id, locale);
    options.forEach(option => option.setAttribute('aria-pressed', String(option.dataset.project === project.id)));
    tabs.forEach(tab => {
      tab.setAttribute('aria-selected', String(tab.dataset.view === view));
      tab.tabIndex = tab.dataset.view === view ? 0 : -1;
    });
    floorPicker.hidden = view === 'costs' || model.levels.length < 2;
    floorPicker.replaceChildren(...model.levels.map((level, index) => new Option(level.name, index, false, index === floor)));
    panel.setAttribute('aria-labelledby', `cv-tab-${view}`);
    find('#cv-project-name').textContent = localized(project.name, locale);
    find('#cv-project-description').textContent = localized(project.description, locale);
    const copyUrl = new URL(appUrl, window.location.origin);
    copyUrl.searchParams.set('template', project.id);
    find('#cv-copy-project').href = copyUrl;
    if (view === 'costs') {
      const { total, lines } = estimateProject(system.id, project.area);
      panel.innerHTML = `<div class="cv-estimate"><dl>
        <div><dt>${c.area}</dt><dd>${formatNumber(project.area, locale)} m²</dd></div>
        <div><dt>${c.structure}</dt><dd>${escapeHtml(localized(system.name, locale))}</dd></div>
        <div><dt>${c.base}</dt><dd>${formatMoney(total / project.area, locale)}</dd></div>
        ${lines.map(line => `<div><dt>${c.subtotal[line.kind]}</dt><dd>${formatMoney(line.amount, locale)}</dd></div>`).join('')}
        <div class="cv-total"><dt>${c.total}</dt><dd>${formatMoney(total, locale)}</dd></div>
      </dl><p>${c.estimateNote}</p></div>`;
      return;
    }
    const smallPanel = panel.clientWidth < 500;
    panel.innerHTML = `<canvas class="cv-model-canvas" data-preview="${view}" width="${smallPanel ? 730 : 1200}" height="660" role="img"
      aria-label="${view === 'plan' ? c.planLabel : c.modelLabel} · ${escapeHtml(localized(project.name, locale))}"></canvas>`;
    drawTemplate(panel.firstElementChild, model, floor, view, locale);
  };

  for (const option of options) {
    option.addEventListener('click', () => {
      project = templates.find(template => template.id === option.dataset.project);
      floor = 0;
      showProject();
    });
  }
  floorPicker.addEventListener('change', event => {
    floor = Number(event.currentTarget.value);
    showProject();
  });
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      view = tab.dataset.view;
      showProject();
    });
  }
  find('.cv-preview-tabs').addEventListener('keydown', event => {
    const index = tabs.indexOf(event.target);
    if (index < 0) return;
    const next = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  });
  showProject();
}

function drawTemplate(canvas, project, floor, view, locale) {
  const ctx = canvas.getContext('2d');
  const level = project.levels[floor];
  if (!ctx || !level?.rooms.length) return;

  const { width, height } = canvas;
  const { rooms, walls } = level;
  const bound = {
    left: Math.min(...rooms.map(room => room.x), ...walls.flatMap(wall => [wall.x1, wall.x2])),
    right: Math.max(...rooms.map(room => room.x + room.w), ...walls.flatMap(wall => [wall.x1, wall.x2])),
    top: Math.min(...rooms.map(room => room.y), ...walls.flatMap(wall => [wall.y1, wall.y2])),
    bottom: Math.max(...rooms.map(room => room.y + room.h), ...walls.flatMap(wall => [wall.y1, wall.y2])),
  };
  ctx.fillStyle = view === 'plan' ? '#f7f5eb' : '#e7e4d8';
  ctx.fillRect(0, 0, width, height);
  ctx.lineWidth = 1;
  ctx.strokeStyle = view === 'plan' ? '#e7e3d6' : '#d9d5c7';
  for (let x = 0; x < width; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  if (view === 'plan') {
    drawPlan(ctx, width, height, level, bound, locale);
  } else {
    drawModel(ctx, width, height, project, level.id);
  }
}

function drawPlan(ctx, width, height, { rooms, walls, items }, bound, locale) {
  const planWidth = bound.right - bound.left;
  const planHeight = bound.bottom - bound.top;
  const scale = Math.min((width - 160) / planWidth, (height - 148) / planHeight);
  const offsetX = (width - planWidth * scale) / 2;
  const offsetY = (height - planHeight * scale) / 2 + 12;
  const xAt = x => offsetX + (x - bound.left) * scale;
  const yAt = y => offsetY + (y - bound.top) * scale;

  rooms.forEach(room => {
    const x = xAt(room.x);
    const y = yAt(room.y);
    ctx.fillStyle = roomStyles[room.type].fill;
    ctx.fillRect(x, y, room.w * scale, room.h * scale);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#5b6255';
    ctx.strokeRect(x, y, room.w * scale, room.h * scale);
  });

  ctx.lineCap = 'square';
  ctx.strokeStyle = '#4e564b';
  for (const wall of walls) {
    ctx.lineWidth = Math.max(4, (wall.thickness ?? 0.15) * scale);
    ctx.beginPath();
    ctx.moveTo(xAt(wall.x1), yAt(wall.y1));
    ctx.lineTo(xAt(wall.x2), yAt(wall.y2));
    ctx.stroke();
  }
  for (const item of items) {
    ctx.save();
    ctx.translate(xAt(item.x), yAt(item.y));
    ctx.rotate((item.angle ?? 0) * Math.PI / 180);
    const w = item.width * scale;
    const h = item.depth * scale;
    ctx.lineWidth = 1.6;
    const part = elements[item.type];
    const opening = part.opening;
    ctx.strokeStyle = part.color;
    ctx.fillStyle = opening ? '#faf8ef' : '#f4eee2';
    ctx.beginPath();
    const depth = opening ? Math.max(h, 10) : h;
    ctx.roundRect(-w / 2, -depth / 2, w, depth, Math.min(w, depth) * 0.09);
    ctx.fill();
    ctx.stroke();
    if (!opening && w > 14 && h > 14) {
      ctx.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    }
    ctx.restore();
  }
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `600 ${width < 800 ? 28 : 22}px system-ui`;
  for (const room of rooms) {
    if (room.w * scale < 64 || room.h * scale < 38) continue;
    ctx.fillStyle = '#3d483e';
    const label = room.name || roomStyles[room.type][locale === 'pt-PT' ? 'pt' : 'en'];
    const x = xAt(room.x + room.w / 2);
    const y = yAt(room.y + room.h / 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f7f4e9';
    ctx.strokeText(label, x, y, room.w * scale - 12);
    ctx.fillText(label, x, y, room.w * scale - 12);
  }
  ctx.fillStyle = '#4e564b';
  ctx.font = '500 21px system-ui';
  ctx.fillText(formatNumber(planWidth, locale) + ' m', width / 2, offsetY - 26);
  dimensionLine(ctx, offsetX, offsetY - 26, offsetX + planWidth * scale, offsetY - 26, width / 2, 50);
  ctx.save();
  ctx.translate(offsetX - 29, height / 2 + 12);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(formatNumber(planHeight, locale) + ' m', 0, 0);
  dimensionLine(ctx, -planHeight * scale / 2, 0, planHeight * scale / 2, 0, 0, 45);
  ctx.restore();
}

function dimensionLine(ctx, x1, y1, x2, y2, breakAt, gap) {
  ctx.strokeStyle = '#838577';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(breakAt - gap, y1);
  ctx.moveTo(breakAt + gap, y2);
  ctx.lineTo(x2, y2);
  ctx.moveTo(x1, y1 - 6);
  ctx.lineTo(x1, y1 + 6);
  ctx.moveTo(x2, y2 - 6);
  ctx.lineTo(x2, y2 + 6);
  ctx.stroke();
}

function drawModel(ctx, width, height, project, levelId) {
  const image = document.createElement('canvas');
  const renderer = createModelRenderer(image, { preferSoftware: true });
  const scene = compileScene(modelFaces(project, levelId, true));
  renderer.paint(scene, { azimuth: 36, elevation: 35, zoom: 1.28, projection: 'orthographic' }, width, height);
  ctx.drawImage(image, 0, 0);
}
