import { company, saveLocale } from './core.js';
import { detectLocale, languages } from './locales.js';

const root = document.querySelector('#app');
const html = document.documentElement;
const { view, locale: originalLocale, chosen, country } = document.body.dataset;
const portugueseZones = ['Europe/Lisbon', 'Atlantic/Madeira', 'Atlantic/Azores'];
const locale = chosen === 'true' ? originalLocale
  : detectLocale(navigator.languages, country || (portugueseZones.includes(Intl.DateTimeFormat().resolvedOptions().timeZone) ? 'PT' : ''));
const pt = locale === 'pt-PT';
const languagePrefix = /^\/(pt(?:-pt)?|en(?:-pt|-int)?)(?=\/|$)/i;
const homeUrl = '/';
const appUrl = '/app';
html.lang = pt ? 'pt-PT' : locale === 'en-PT' ? 'en-PT' : 'en';

async function setLocale(next) {
  await saveLocale(next);
  const path = location.pathname.replace(languagePrefix, '') || '/';
  if (path !== location.pathname) location.replace(path + location.search + location.hash);
  else location.reload();
}

function navLink(path, label, current) {
  return `<a href="${path}"${current ? ' aria-current="page"' : ''}>${label}</a>`;
}

function renderShell() {
  root.innerHTML = `
    <a class="skip-link" href="#conteudo">${pt ? 'Saltar para o conteúdo' : 'Skip to content'}</a>
    <header class="page-header"><div class="page-width page-header-inner">
      <a href="/" class="site-wordmark" aria-label="Casovara"><img src="/brand.svg" alt="">casovara</a>
      <nav aria-label="${pt ? 'Menu principal' : 'Main navigation'}">
        ${navLink('/biblioteca', pt ? 'Biblioteca' : 'Library', view === 'library')}
        ${navLink('/guias', pt ? 'Guias' : 'Guides', view === 'guides')}
        ${navLink('/calculadoras', pt ? 'Calculadoras' : 'Calculators', view === 'calculators')}
      </nav>
      <a class="site-cta" href="/app">${pt ? 'Abrir editor' : 'Open planner'}</a>
    </div></header>
    <main id="conteudo" class="page-width interior-page" tabindex="-1"></main>
    <footer class="page-footer"><div class="page-width page-footer-inner">
      <a href="/" class="site-wordmark" aria-label="Casovara"><img src="/brand.svg" alt="">casovara</a>
      <nav aria-label="${pt ? 'Informações' : 'Information'}">
        <a href="/sobre">${pt ? 'Sobre' : 'About'}</a><a href="/contacto">${pt ? 'Contacto' : 'Contact'}</a>
        <a href="/termos">${pt ? 'Termos' : 'Terms'}</a><a href="/privacidade">${pt ? 'Privacidade' : 'Privacy'}</a>
      </nav>
      <label class="language-picker"><span class="sr-only">${pt ? 'Idioma' : 'Language'}</span>
      <select id="shell-locale">${Object.entries(languages).map(([key, label]) => `<option value="${key}"${key === locale ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
      <small class="locale-status" role="status"></small>
    </div></footer>`;
  root.querySelector('#shell-locale').addEventListener('change', (event) => {
    setLocale(event.currentTarget.value).catch(() => {
      root.querySelector('.locale-status').textContent = pt ? 'Não foi possível alterar o idioma.' : 'Could not change language.';
    });
  });
  return root.querySelector('main');
}

function page(title, content) {
  return `<article class="info-page"><h1>${title}</h1>${content}</article>`;
}

function renderInfo(container) {
  const labels = {
    about: pt ? 'Sobre o Casovara' : 'About Casovara',
    contact: pt ? 'Contacto' : 'Contact',
    terms: pt ? 'Termos de utilização' : 'Terms of use',
    privacy: pt ? 'Privacidade' : 'Privacy',
    missing: pt ? 'Página indisponível' : 'Page unavailable',
  };
  const texts = {
    about: pt
      ? '<p>O Casovara reúne o desenho de plantas, a visualização em 3D e a estimativa de materiais. Foi pensado para explorar opções de construção desde os primeiros esboços.</p><p><a href="/app">Começar um projeto</a></p>'
      : '<p>Casovara brings floor planning, 3D views and material estimates together so you can explore building options from the first sketch.</p><p><a href="/app">Start a project</a></p>',
    contact: `<p>${pt ? 'Dados empresariais de demonstração.' : 'Demonstration company details.'}</p>
      <address><strong>${company.name}</strong><br>${company.address}<br>${company.email}<br>${company.phone}<br>${pt ? 'NIF' : 'Tax ID'} ${company.vat}</address>`,
    terms: pt
      ? '<p>Esta versão permite criar e exportar esboços e comparar estimativas indicativas em euros. Os preços e coeficientes de materiais são demonstrativos. A utilização dos desenhos para obra requer validação técnica do projeto.</p><p>Os projetos guardados podem ser exportados num ficheiro e importados de novo no editor.</p>'
      : '<p>This version lets you create and export sketches and compare indicative estimates in euros. Prices and material coefficients are demonstration data. Construction drawings require professional technical review.</p><p>You can export saved projects to a file and import them back into the editor.</p>',
    privacy: pt
      ? '<p>O editor usa um cookie para associar este navegador aos ficheiros dos seus projetos. O idioma e o tema escolhidos são guardados em cookies próprios. Pode eliminar ou exportar um projeto no editor.</p><p>Se criar uma ligação de partilha, quem tiver a ligação pode abrir uma cópia durante 30 dias. Pode desativar a ligação no editor.</p><p>Ao enviar um pedido ao assistente de IA, o Casovara envia o pedido, o contexto da conversa e um resumo da geometria à OpenAI. As notas e imagens de referência ficam no projeto. A demonstração T3 corre no Casovara.</p><p>A seleção automática usa os idiomas do navegador e o país indicado pela infraestrutura de alojamento, quando disponível. O fuso horário funciona como alternativa.</p>'
      : '<p>The planner uses a cookie to associate this browser with your project files. Your selected language and theme have separate cookies. You can delete or export a project in the planner.</p><p>If you create a share link, anyone with the link can open a copy for 30 days. You can deactivate the link in the planner.</p><p>When you submit to the AI assistant, Casovara sends the request, conversation context, and a geometry summary to OpenAI. Notes and reference images stay in the project. The three-bedroom demonstration runs in Casovara.</p><p>Automatic selection uses browser languages and the country supplied by the hosting platform when available. It uses the browser time zone as a fallback.</p>',
    missing: pt ? '<p><a href="/">Voltar à página inicial</a></p>' : '<p><a href="/">Back to the homepage</a></p>',
  };
  const controls = view === 'privacy' ? `
    <section id="preferencias"><h2>${pt ? 'Preferências de idioma' : 'Language preferences'}</h2>
    <button id="auto-locale" class="site-cta" type="button">${pt ? 'Usar deteção automática' : 'Use automatic detection'}</button>
    <p id="privacy-status" role="status"></p></section>` : '';
  container.innerHTML = page(labels[view], texts[view] + controls);
  container.querySelector('#auto-locale')?.addEventListener('click', () => {
    setLocale('auto').catch(() => {
      container.querySelector('#privacy-status').textContent = pt ? 'Não foi possível atualizar a preferência.' : 'Could not update the preference.';
    });
  });
}

async function mount() {
  const ctx = { locale, homeUrl, appUrl, setLocale, view };
  if (view === 'landing' || view === 'library') {
    const { renderLanding } = await import('./landing.js');
    await renderLanding(root, ctx);
  } else if (view === 'builder') {
    const { renderBuilder } = await import('./builder.js');
    await renderBuilder(root, ctx);
  } else {
    const body = renderShell();
    if (view === 'calculators' || view === 'guides') {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = '/calculators.css';
      document.head.append(style);
      const { renderResources } = await import('./calculators.js');
      const slug = location.pathname.replace(languagePrefix, '').split('/').filter(Boolean)[1]?.toLowerCase();
      await renderResources(body, { locale, view, slug });
    } else renderInfo(body);
  }
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

mount().catch((error) => {
  console.error(error);
  renderShell().innerHTML = page(pt ? 'O Casovara não carregou' : 'Casovara couldn’t load',
    pt ? '<p><a href="">Tentar novamente</a></p>' : '<p><a href="">Try again</a></p>');
});
