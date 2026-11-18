import { formatDate, projectApi } from './core.js';

export function openBuilderShare({ locale, projectId, appUrl }) {
  const t = (portuguese, english) => locale === 'pt-PT' ? portuguese : english;
  const dialog = document.createElement('dialog');
  dialog.className = 'report-dialog share-dialog';
  dialog.setAttribute('aria-labelledby', 'casovara-share-title');
  dialog.innerHTML = `
    <div class="report-document">
      <header class="report-head"><h2 id="casovara-share-title">${t('Partilhar por ligação', 'Share a link')}</h2></header>
      <p>${t('Quem tiver a ligação pode abrir e editar uma cópia da versão guardada no momento da partilha.',
        'Anyone with the link can open and edit a copy of the version saved at the time of sharing.')}</p>
      <label class="share-label" hidden>${t('Ligação de acesso', 'Access link')}<input type="url" readonly></label>
      <p class="share-expiry" hidden></p>
      <p class="share-status" role="status"></p>
      <div class="share-actions">
        <button class="site-cta" id="share-create" type="button" hidden>${t('Criar ligação', 'Create link')}</button>
        <button class="site-cta" id="share-copy" type="button" hidden>${t('Copiar ligação', 'Copy link')}</button>
        <button class="report-close" id="share-revoke" type="button" hidden>${t('Desativar ligação', 'Deactivate link')}</button>
        <form method="dialog"><button class="report-close" autofocus>${t('Fechar', 'Close')}</button></form>
      </div>
    </div>`;
  const label = dialog.querySelector('.share-label');
  const input = label.querySelector('input');
  const expiry = dialog.querySelector('.share-expiry');
  const status = dialog.querySelector('.share-status');
  const create = dialog.querySelector('#share-create');
  const copy = dialog.querySelector('#share-copy');
  const revoke = dialog.querySelector('#share-revoke');

  function show(share) {
    label.hidden = expiry.hidden = copy.hidden = revoke.hidden = !share;
    create.hidden = Boolean(share);
    if (share) {
      const url = new URL(appUrl, location.origin);
      url.searchParams.set('share', share.token);
      input.value = url.href;
      expiry.textContent = t('Disponível até ', 'Available until ') + formatDate(share.expiresAt, locale);
    } else input.value = '';
  }

  async function run(action) {
    create.disabled = revoke.disabled = true;
    status.textContent = t('A carregar…', 'Loading…');
    try {
      show(await action());
      status.textContent = '';
    } catch {
      status.textContent = t('Ocorreu um erro. Tente novamente.', 'Something went wrong. Try again.');
    } finally {
      create.disabled = revoke.disabled = false;
    }
  }

  create.addEventListener('click', () => run(() => projectApi.createShare(projectId)));
  revoke.addEventListener('click', () => run(() => projectApi.revokeShare(projectId)));
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(input.value);
      status.textContent = t('Ligação copiada.', 'Link copied.');
    } catch {
      input.focus();
      input.select();
      status.textContent = t('Selecione e copie a ligação acima.', 'Select and copy the link above.');
    }
  });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
  run(() => projectApi.share(projectId));
}
