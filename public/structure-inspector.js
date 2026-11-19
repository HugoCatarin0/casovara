import { escapeHtml as escape } from './builder-engine.js';
import { formatNumber } from './core.js';
import {
  gutterAxis, roofColors, roofFrame, roofSpecFor, roofWindowBounds, structureColors, structureLimits,
} from './structure-elements.js';

const labels = {
  roof: ['Cobertura', 'Roof'], roofWindow: ['Janela de telhado', 'Roof window'],
  chimney: ['Chaminé', 'Chimney'], vent: ['Tubo de ventilação', 'Vent stack'],
  gutter: ['Caleira', 'Gutter'], foundation: ['Sapata corrida', 'Strip foundation'],
  roofWindows: ['Janelas de telhado', 'Roof windows'], chimneys: ['Chaminés e ventilação', 'Chimneys and vents'],
  gutters: ['Caleiras', 'Gutters'],
};
const icons = { roof: 'roof', roofWindow: 'window', chimney: 'layers', gutter: 'angled', foundation: 'slab' };
const shapes = { none: ['Sem cobertura', 'No roof'], flat: ['Plana', 'Flat'], gable: ['Duas águas', 'Gable'], hipped: ['Quatro águas', 'Hip'] };
const coverings = {
  tile: ['Telha cerâmica', 'Clay tile'], metal: ['Chapa metálica', 'Metal sheets'], membrane: ['Membrana', 'Membrane'],
};
const edges = {
  front: ['Beiral A', 'Eaves A'], back: ['Beiral B', 'Eaves B'],
  left: ['Extremidade A', 'End A'], right: ['Extremidade B', 'End B'],
};
const roofAttachmentTypes = ['roofWindow', 'chimney', 'gutter'];
const roofSections = { roofWindow: 'roofWindows', chimney: 'chimneys', gutter: 'gutters' };
const slot = (locale) => locale === 'pt-PT' ? 0 : 1;
const typeOf = (kind, record) => kind === 'structure' ? record?.type : kind;

export function structureElementTitle(kind, record, locale) {
  const type = typeOf(kind, record);
  const name = type === 'chimney' && record?.kind === 'vent' ? 'vent' : type;
  return labels[name]?.[slot(locale)] ?? '';
}

export function renderStructureInspector(kind, record, level, { locale = 'pt-PT', icon = () => '' } = {}) {
  const language = slot(locale);
  const t = (pt, en) => language ? en : pt;
  const title = structureElementTitle(kind, record, locale);
  const type = typeOf(kind, record);
  if (!title || !level || (type !== 'roof' && !record)) return '';
  const measure = (value, unit = 'm') => `${formatNumber(value, locale, 2)} ${unit}`;
  const field = (label, key, value, [min, max], unit = 'm', step = 'any', scale = 1) =>
    `<label class="cv-field"><span>${label}</span><span class="cv-input-wrap"><input type="number" inputmode="decimal"
      data-field="structure:${key}" value="${Number((value * scale).toFixed(6))}" min="${Number((min * scale).toFixed(6))}" max="${Number((max * scale).toFixed(6))}"
      step="${step}"${scale === 1 ? '' : ` data-structure-scale="${scale}"`}><small>${unit}</small></span></label>`;
  const percent = (label, key, value, limits = structureLimits.uv) => field(label, key, value, limits, '%', 'any', 100);
  const select = (label, key, value, options) =>
    `<label class="cv-field"><span>${label}</span><select data-field="structure:${key}">${Object.entries(options).map(([id, names]) =>
      `<option value="${id}"${id === value ? ' selected' : ''}>${names[language]}</option>`).join('')}</select></label>`;
  const group = (id, heading, content, open = false) => `<details class="cv-structure-group" data-structure-section="${id}"${open ? ' open' : ''}>
    <summary>${icon('chevron', 15)}${heading}</summary><div class="cv-structure-fields">${content}</div></details>`;
  const grid = (...fields) => `<div class="cv-structure-grid">${fields.join('')}</div>`;
  const metrics = (rows) => `<dl class="cv-structure-metrics">${rows.map(([name, value]) =>
    `<div><dt>${name}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
  const navigate = (target, id, label, glyph = 'external') =>
    `<button class="cv-structure-link" type="button" data-action="structure-select:${target}"${id ? ` data-id="${escape(id)}"` : ''}><span>${escape(label)}</span>${icon(glyph, 14)}</button>`;
  const color = (name, spec, fallback) => {
    const custom = /^#[\da-f]{6}$/i.test(spec.color ?? '');
    return `<div class="cv-structure-colour"><label class="cv-field"><span>${name}</span><input type="color" data-field="structure:color" value="${custom ? spec.color : fallback}"></label>
      ${custom ? `<button class="cv-structure-link cv-structure-reset" type="button" data-action="structure-reset-color">${t('Repor cor padrão', 'Reset to default colour')}</button>` : ''}</div>`;
  };
  const roofType = shapes[level.roof] ? level.roof : 'none';
  const frame = roofFrame(level, level.height);
  const roofLink = frame ? navigate('roof', null, t('Selecionar cobertura', 'Select roof')) : '';
  const positionFields = (item) => grid(
    percent(t('Posição longitudinal', 'Position along roof'), 'u', item.u),
    percent(t('Posição transversal', 'Position across roof'), 'v', item.v),
  );
  let headData = '';
  let content = '';

  if (type === 'roof') {
    const spec = roofSpecFor(level);
    const pitched = roofType === 'gable' || roofType === 'hipped';
    const slope = pitched ? field(t('Inclinação', 'Pitch'), 'pitch', level.pitch ?? 30, [5, 65], '°') : '';
    const dim = roofType === 'none' ? '' : grid(
      field(t('Balanço do beiral', 'Eaves overhang'), 'eavesOverhang', spec.eavesOverhang, structureLimits.overhang),
      field(pitched ? t('Balanço na extremidade', 'End overhang') : t('Balanço longitudinal', 'End overhang'), 'gableOverhang', spec.gableOverhang, structureLimits.overhang),
    ) + field(t('Desnível da cobertura', 'Roof offset'), 'offset', spec.offset, structureLimits.offset);
    if (frame) {
      headData = metrics([
        [t('Vão transversal', 'Cross span'), measure(frame.span)],
        [pitched ? t('Cumeeira acima do piso', 'Ridge above storey') : t('Beiral acima do piso', 'Eaves above storey'), measure(frame.eaves + frame.ridgeHeight)],
      ]);
    }
    content = group('geometry', t('Geometria', 'Geometry'), select(t('Forma', 'Shape'), 'type', roofType, shapes) + slope + dim, true);
    if (roofType !== 'none') {
      content += group('appearance', t('Aspeto', 'Appearance'),
        select(t('Revestimento', 'Roof covering'), 'covering', spec.covering, coverings) + color(t('Cor da cobertura', 'Roof colour'), spec, roofColors[spec.covering]), true);
    }
    if (frame) {
      const attachments = roofAttachmentTypes.map((target) => {
        const items = (level.structure ?? []).filter((item) => item.type === target);
        const name = t(`Adicionar ${labels[target][0].toLocaleLowerCase('pt-PT')}`, `Add ${labels[target][1].toLowerCase()}`);
        return `<div class="cv-structure-attachments"><div class="cv-structure-attachment-head"><span>${labels[roofSections[target]][language]}</span><button class="cv-structure-add" type="button" data-action="structure-add:${target}" aria-label="${name}" title="${name}">${icon('plus', 16)}</button></div>
          ${items.map((item, index) => navigate('structure', item.id, `${structureElementTitle('structure', item, locale)} · ${index + 1}`)).join('')}</div>`;
      }).join('');
      content += group('attachments', t('Elementos na cobertura', 'Roof elements'), attachments, true);
    }
  }

  if (type === 'roofWindow') {
    const { width, height } = structureLimits.roofWindow;
    const opening = frame && roofWindowBounds(frame, record);
    if (opening) {
      const area = opening.width * opening.depth / Math.cos(frame.pitch * Math.PI / 180);
      headData = metrics([[t('Área do vão', 'Opening area'), measure(area, 'm²')]]);
    }
    content = group('dimensions', t('Dimensões e posição', 'Size and position'), grid(
      field(t('Largura', 'Width'), 'width', record.width, width),
      field(t('Altura na vertente', 'Length along slope'), 'height', record.height, height),
    ) + positionFields(record) + roofLink, true);
    content += group('appearance', t('Aspeto', 'Appearance'), color(t('Cor do caixilho', 'Frame colour'), record, structureColors.roofWindow), true);
  }

  if (type === 'chimney') {
    const { width, height } = structureLimits.chimney;
    content = group('geometry', t('Geometria e posição', 'Geometry and position'),
      select(t('Tipo', 'Type'), 'kind', record.kind, { chimney: labels.chimney, vent: labels.vent }) +
      select(t('Secção', 'Cross-section'), 'shape', record.shape, { square: ['Quadrada', 'Square'], round: ['Circular', 'Round'] }) +
      grid(
        field(record.shape === 'round' ? t('Diâmetro', 'Diameter') : t('Largura', 'Width'), 'width', record.width, width),
        field(t('Altura acima da referência', 'Height above reference'), 'height', record.height, height),
      ) + select(t('Referência da altura', 'Height reference'), 'reference', record.reference, { surface: ['Superfície da cobertura', 'Roof surface'], ridge: ['Cumeeira', 'Ridge'] }) +
      positionFields(record) + roofLink, true);
    content += group('appearance', t('Aspeto', 'Appearance'), color(t('Cor exterior', 'Exterior colour'), record, structureColors.chimney), true);
  }

  if (type === 'gutter') {
    const { width, depth } = structureLimits.gutter;
    if (frame) {
      const { from, to } = gutterAxis(frame, record);
      headData = metrics([[t('Comprimento da caleira', 'Gutter length'), measure(to - from)]]);
    }
    content = group('geometry', t('Geometria e posição', 'Geometry and position'),
      select(t('Bordo da cobertura', 'Roof edge'), 'edge', record.edge, edges) +
      grid(percent(t('Início no bordo', 'Start along edge'), 'from', record.from, [0, record.to - .02]),
        percent(t('Fim no bordo', 'End along edge'), 'to', record.to, [record.from + .02, 1])) +
      grid(field(t('Largura', 'Width'), 'width', record.width, width),
        field(t('Profundidade', 'Depth'), 'depth', record.depth, depth)) +
      `<label class="cv-structure-toggle"><span>${t('Tubo de queda no fim da caleira', 'Downpipe at end of gutter')}</span><input type="checkbox" data-field="structure:downspout"${record.downspout ? ' checked' : ''}></label>` + roofLink, true);
    content += group('appearance', t('Aspeto', 'Appearance'), color(t('Cor da caleira', 'Gutter colour'), record, structureColors.gutter), true);
  }

  if (type === 'foundation') {
    const { width, footingHeight, bottom, wallThickness, top } = structureLimits.foundation;
    const wall = (level.walls ?? []).find(({ id }) => id === record.wallId);
    if (wall) {
      headData = metrics([[t('Comprimento', 'Length'), measure(Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1))]]);
    }
    content = group('footing', t('Sapata', 'Footing'), grid(
      field(t('Largura', 'Width'), 'width', record.width, width),
      field(t('Altura', 'Height'), 'footingHeight', record.footingHeight, [Math.min(footingHeight[0], record.top - record.bottom), Math.min(footingHeight[1], record.top - record.bottom)]),
    ) + field(t('Cota inferior', 'Bottom level'), 'bottom', record.bottom, bottom), true);
    content += group('wall', t('Parede de fundação', 'Foundation wall'), grid(
      field(t('Espessura', 'Thickness'), 'wallThickness', record.wallThickness, [wallThickness[0], Math.min(wallThickness[1], record.width)]),
      field(t('Cota superior', 'Top level'), 'top', record.top, top),
    ) + (wall ? navigate('walls', wall.id, t('Selecionar parede de referência', 'Select host wall')) : ''), true);
    content += group('appearance', t('Aspeto', 'Appearance'), color(t('Cor da fundação', 'Foundation colour'), record, structureColors.foundation));
  }

  const remove = type === 'roof' ? roofType !== 'none' : true;
  return `<section class="cv-panel-section cv-structure-inspector" data-structure-key="${type}:${escape(record?.id ?? level.id)}">
    <header class="cv-structure-heading"><span class="cv-structure-icon">${icon(icons[type], 19)}</span><div><h2 tabindex="-1">${title}</h2><span>${escape(level.name ?? '')}</span></div></header>
    ${headData}${content}
    ${remove ? `<div class="cv-structure-footer"><button class="cv-structure-remove" type="button" data-action="structure-remove">${icon('trash', 16)}${type === 'roof' ? t('Eliminar cobertura', 'Delete roof') : t('Eliminar elemento', 'Delete element')}</button></div>` : ''}
  </section>`;
}

export function syncStructureInspector(inspector, markup) {
  const mounted = inspector.querySelector('.cv-structure-inspector');
  if (!mounted) return false;
  const document = mounted.ownerDocument;
  const template = document.createElement('template');
  template.innerHTML = markup;
  const next = template.content.firstElementChild;
  if (next?.dataset.structureKey !== mounted.dataset.structureKey) return false;
  const sections = new Map([...mounted.querySelectorAll('details')].map((detail) => [detail.dataset.structureSection, detail.open]));
  for (const detail of next.querySelectorAll('details')) {
    if (sections.has(detail.dataset.structureSection)) detail.open = sections.get(detail.dataset.structureSection);
  }
  const active = document.activeElement;
  const focused = active && mounted.contains(active);
  const field = focused && active.dataset.field;
  const action = focused && active.dataset.action;
  const id = focused && active.dataset.id;
  mounted.replaceWith(next);
  const control = field ? [...next.querySelectorAll('[data-field]')].find((node) => node.dataset.field === field)
    : action && [...next.querySelectorAll('[data-action]')].find((node) => node.dataset.action === action && node.dataset.id === id);
  if (focused) (control || next.querySelector('h2'))?.focus({ preventScroll: true });
  return true;
}
