import { elements, escapeHtml, wallLength } from './builder-engine.js';
import { formatDate, formatMoney, formatNumber, text } from './core.js';

export function openBuilderReport({ locale, project, system, area, estimate }) {
  const pt = locale === 'pt-PT';
  const t = (portuguese, english) => pt ? portuguese : english;
  const num = (num) => formatNumber(num, locale);
  const money = (amount) => formatMoney(amount, locale, 2);
  const categories = {
    structure: t('Estrutura', 'Structure'),
    envelope: t('Envolvente', 'Envelope'),
    interior: t('Acabamentos', 'Finishes'),
    installation: t('Instalações', 'Building services'),
  };
  const rows = estimate.quantities.map((item) => `
    <tr><td><strong>${text(item.label, locale)}</strong><br><small>${categories[item.kind]}</small></td>
    <td>${num(item.raw)} ${item.unit}</td><td>${num(item.waste * 100)}%</td>
    <td>${num(item.quantity)} ${item.unit}</td><td>${money(item.unitPrice)}</td><td>${money(item.amount)}</td></tr>`).join('');
  const openingCounts = Object.entries(project.levels.flatMap((level) => level.items).reduce((counts, item) => {
    if (Object.hasOwn(elements, item.type) && elements[item.type].opening) counts[item.type] = (counts[item.type] ?? 0) + 1;
    return counts;
  }, {}));
  const content = `
    <header class="report-head">
      <div class="report-brand"><img src="/brand.svg" alt=""> Casovara</div>
      <h2 id="casovara-report-title">${t('Mapa de quantidades', 'Quantity report')}</h2>
      <p>${escapeHtml(project.name)} · ${text(system.name, locale)} · ${formatDate(new Date(), locale)}</p>
    </header>
    <dl class="report-facts">
      <div><dt>${t('Área do projeto', 'Project area')}</dt><dd>${num(area)} m²</dd></div>
      <div><dt>${t('Pisos', 'Storeys')}</dt><dd>${num(project.levels.length)}</dd></div>
      <div><dt>${t('Materiais estimados', 'Estimated materials')}</dt><dd>${money(estimate.total)}</dd></div>
    </dl>
    <section class="report-section"><h3>${t('Pisos e paredes', 'Storeys and walls')}</h3>
      <table><thead><tr>
        <th scope="col">${t('Piso', 'Storey')}</th><th scope="col">${t('Pé-direito', 'Clear height')}</th>
        <th scope="col">${t('Paredes desenhadas', 'Drawn wall length')}</th>
      </tr></thead><tbody>${project.levels.map((level) => `<tr><td>${escapeHtml(level.name)}</td><td>${num(level.height)} m</td>
        <td>${num(level.walls.reduce((sum, wall) => sum + wallLength(wall), 0))} m</td></tr>`).join('')}</tbody></table>
    </section>
    ${openingCounts.length ? `<section class="report-section"><h3>${t('Vãos', 'Openings')}</h3>
      <table><thead><tr><th scope="col">${t('Elemento', 'Element')}</th><th scope="col">${t('Quantidade', 'Quantity')}</th></tr></thead>
      <tbody>${openingCounts.map(([type, quantity]) => `<tr><td>${elements[type][pt ? 'pt' : 'en']}</td><td>${num(quantity)}</td></tr>`).join('')}</tbody></table>
    </section>` : ''}
    <section class="report-section"><h3>${t('Estimativa de materiais', 'Material estimate')}</h3>
      <p>${t('Valores demonstrativos em euros, calculados a partir da área da planta. Pesquisa de preços e validação técnica são necessárias para a obra.',
        'Indicative euro amounts based on the floor-plan area. Construction requires current prices and professional technical review.')}</p>
      <div class="report-table"><table><thead><tr>
        <th scope="col">${t('Material', 'Material')}</th><th scope="col">${t('Base', 'Base')}</th><th scope="col">${t('Margem', 'Waste')}</th>
        <th scope="col">${t('Quantidade', 'Quantity')}</th><th scope="col">${t('Preço unitário', 'Unit price')}</th>
        <th scope="col">${t('Montante', 'Amount')}</th></tr></thead><tbody>${rows}</tbody></table></div>
    </section>`;

  const dialog = document.createElement('dialog');
  dialog.className = 'report-dialog';
  dialog.setAttribute('aria-labelledby', 'casovara-report-title');
  dialog.innerHTML = `
    <div class="report-document">${content}</div>
    <form method="dialog" class="report-actions">
      <button class="report-close">${t('Fechar', 'Close')}</button>
      <button class="site-cta" id="casovara-print-report" type="button">${t('Imprimir ou guardar PDF', 'Print or save PDF')}</button>
    </form>`;
  dialog.querySelector('#casovara-print-report').addEventListener('click', () => {
    const copy = document.createElement('div');
    copy.className = 'report-print report-document';
    copy.innerHTML = content.replace(' id="casovara-report-title"', '');
    document.body.append(copy);
    document.body.classList.add('casovara-print-report');
    window.addEventListener('afterprint', () => {
      copy.remove();
      document.body.classList.remove('casovara-print-report');
    }, { once: true });
    window.print();
  });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
}
