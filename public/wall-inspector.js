import { formatNumber } from './core.js';
import {
  getWallSpec, openingVertical, wallAppearance, wallAssemblies, wallBaseOffset, wallFinishes, wallLayers, wallMeasurements,
} from './wall-spec.js';

function toggle(label, key, active) {
  return `<label class="cv-wall-toggle"><span>${label}</span><input type="checkbox" data-field="wall:${key}" ${active ? 'checked' : ''}></label>`;
}

function numberField(label, field, value, unit, min, max, step, disabled = false) {
  return `<label class="cv-field"><span>${label}</span><span class="cv-input-wrap"><input type="number" inputmode="decimal" data-field="${field}" value="${Number(value.toFixed(3))}" min="${min}" max="${max}" step="${step}" ${disabled ? 'disabled' : ''}><small>${unit}</small></span></label>`;
}

function option(value, selected, label) {
  return `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`;
}

function sectionPreview(wall, label) {
  const pieces = wallLayers(wall);
  const thickness = pieces.reduce((total, piece) => total + piece.thickness, 0);
  const bars = pieces.map(({ thickness: width, color, key }) => `<span data-material="${key}" style="--coat-color:${color};flex:${width / thickness}"></span>`).join('');
  return `<div class="cv-wall-section" role="img" aria-label="${label}">
    <div class="cv-wall-section-track">${bars}</div>
  </div>`;
}

export function renderWallInspector(wall, level, { locale, systemId, findWall }) {
  const pt = locale === 'pt-PT';
  const t = (pt, en) => locale === 'pt-PT' ? pt : en;
  const format = (value, digits = 2) => formatNumber(value, locale, digits);
  const stats = wallMeasurements(wall, level, findWall);
  const spec = getWallSpec(wall, level.height);
  const appearance = wallAppearance(wall);
  const metrics = [
    [t('Espessura', 'Thickness'), `${format(wall.thickness * 1000, 0)} mm`],
    [t('Área líquida', 'Net area'), `${format(stats.net)} m²`],
    [t('Volume líquido', 'Net volume'), `${format(stats.volume, 3)} m³`],
  ];
  const labels = {
    core: t('Núcleo', 'Core'), insulation: t('Isolamento', 'Insulation'),
    outside: t('Revest. exterior', 'Outer cladding'), inside: t('Revest. interior', 'Inner lining'),
  };
  const limits = { core: [50, 1500], insulation: [0, 450], outside: [0, 100], inside: [0, 100] };
  const ids = ['custom', ...(Object.hasOwn(wallAssemblies, systemId) ? [systemId] : []),
    ...Object.keys(wallAssemblies).filter((id) => id !== 'custom' && id !== systemId)];
  const finishField = (key, label, color) => `<label class="cv-field cv-wall-finish"><span>${label}</span><span class="cv-wall-finish-input"><i style="--coat-color:${color}"></i><select data-field="wall:${key}">${Object.entries(wallFinishes).map(([id, finish]) => option(id, spec[key], finish.label[pt ? 0 : 1])).join('')}</select></span></label>`;
  return `<div class="cv-wall-inspector">
    <dl class="cv-wall-totals" data-wall-sync>${metrics.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>
    <div class="cv-wall-group">
      <h3>${t('Geometria', 'Geometry')}</h3>
      <div class="cv-wall-grid">
        ${numberField(t('Comprimento', 'Length'), 'shape:length', stats.length, 'm', .1, 100, .01)}
        ${numberField(t('Cota de base', 'Base offset'), 'wall:baseOffset', wallBaseOffset(wall), 'm', -1, spec.heightMode === 'floor' ? Math.min(5, level.height - .05) : 5, .01)}
      </div>
      <label class="cv-field"><span>${t('Referência de altura', 'Height reference')}</span><select data-field="wall:heightMode">${option('floor', spec.heightMode, t('Até à cota do piso', 'Up to storey height'))}${option('fixed', spec.heightMode, t('Altura fixa', 'Fixed height'))}</select></label>
      ${numberField(t('Altura', 'Height'), 'wall:height', stats.height, 'm', .05, 12, .01, spec.heightMode === 'floor')}
    </div>
    <div class="cv-wall-group">
      <h3>${t('Composição', 'Assembly')}</h3>
      <label class="cv-field"><span>${t('Modelo indicativo', 'Illustrative assembly')}</span><select data-field="wall:assembly">${ids.map(id => option(id, spec.assembly, wallAssemblies[id].label[pt ? 0 : 1])).join('')}</select></label>
      <div data-wall-sync>
        ${sectionPreview(wall, t('Secção à escala das camadas, do exterior para o interior', 'Layer section to scale, from outside to inside'))}
        <div class="cv-wall-section-labels"><span>${t('Exterior', 'Outside')}</span><span>${t('Interior', 'Inside')}</span></div>
      </div>
      <div class="cv-wall-grid">${Object.entries(labels).map(([key, label]) => numberField(label, 'wall:' + key, spec[key] * 1000, 'mm', ...limits[key], 1)).join('')}</div>
    </div>
    <div class="cv-wall-group">
      <h3>${t('Acabamentos', 'Finishes')}</h3>
      ${finishField('exteriorFinish', t('Face exterior', 'Outside face'), appearance.exterior)}
      ${finishField('interiorFinish', t('Face interior', 'Inside face'), appearance.interior)}
      ${toggle(t('Inverter face exterior', 'Flip outside face'), 'exteriorSide', appearance.side === -1)}
    </div>
    <div class="cv-wall-group" data-wall-sync>
      <h3>${t('Medição da face', 'Face measurement')}</h3>
      <dl class="cv-wall-net">
        <div><dt>${t('Área bruta', 'Gross area')}</dt><dd>${format(stats.gross)} m²</dd></div>
        <div><dt>${t('Vãos', 'Openings')} (${stats.openings.length})</dt><dd>−${format(stats.voids)} m²</dd></div>
        <div><dt>${t('Área líquida', 'Net area')}</dt><dd>${format(stats.net)} m²</dd></div>
      </dl>
      ${stats.openings.length ? `<ul class="cv-wall-apertures">${stats.openings.map(({ item, left, right, sill, top }) => `<li><span>${item.type === 'window' || item.type === 'slidingWindow' ? t('Janela', 'Window') : t('Porta', 'Door')}</span><strong>${format(right - left)} × ${format(top - sill)} m</strong></li>`).join('')}</ul>` : ''}
    </div>
  </div>`;
}

export function renderOpeningFields(item, locale) {
  const { sill, top } = openingVertical(item);
  const pt = locale === 'pt-PT';
  return `<div class="cv-wall-grid">${numberField(pt ? 'Altura do vão' : 'Opening height', 'shape:openingHeight', top - sill, 'm', .1, 5, .01)}${numberField(pt ? 'Cota inferior' : 'Sill level', 'shape:openingSill', sill, 'm', -.5, 4, .01)}</div>`;
}

// Keep focused fields and the inspector scroll position while updating derived measurements.
export function syncWallInspector(inspector, markup) {
  const mounted = inspector.querySelector('.cv-wall-inspector');
  if (!mounted) return;
  const template = document.createElement('template');
  template.innerHTML = markup;
  const rendered = template.content;
  const sourceSync = rendered.querySelectorAll('[data-wall-sync]');
  mounted.querySelectorAll('[data-wall-sync]').forEach((target, index) => { target.innerHTML = sourceSync[index].innerHTML; });
  const controls = new Map([...rendered.querySelectorAll('[data-field]')].map((control) => [control.dataset.field, control]));
  for (const target of mounted.querySelectorAll('[data-field]')) {
    const source = controls.get(target.dataset.field);
    if (!source) continue;
    target.value = source.value;
    target.disabled = source.disabled;
    if (target.type === 'checkbox') target.checked = source.checked;
    if (target.type === 'number') {
      target.min = source.min;
      target.max = source.max;
    }
    const chip = target.closest('.cv-wall-finish-input')?.querySelector('i');
    if (chip) chip.style.cssText = source.closest('.cv-wall-finish-input').querySelector('i').style.cssText;
  }
}
