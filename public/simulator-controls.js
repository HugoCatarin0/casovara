import { lightPresets, materialModes, simulatorDefaults, simulatorLimits } from './simulator.js';

export { simulatorDefaults };

const copy = {
  pt: {
    panel: 'Ambiente 3D', close: 'Fechar ambiente 3D', light: 'Luz solar', preset: 'Predefinição',
    custom: 'Personalizada', morning: 'Manhã', noon: 'Meio-dia', evening: 'Fim de tarde', default: 'Luz de estudo',
    azimuth: 'Direção solar', elevation: 'Altura solar', layers: 'Elementos visíveis', appearance: 'Modo de apresentação',
    natural: 'Materiais', clay: 'Maquete', technical: 'Técnico', site: 'Terreno', furniture: 'Mobiliário', shadows: 'Sombras projetadas',
    groundGrid: 'Grelha do terreno', sectionHeight: 'Altura de corte', sectionNote: 'Aplica-se quando o corte está ativo.',
    sunDegrees: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
  },
  en: {
    panel: '3D environment', close: 'Close 3D environment', light: 'Sunlight', preset: 'Preset',
    custom: 'Custom', morning: 'Morning', noon: 'Noon', evening: 'Late afternoon', default: 'Study light',
    azimuth: 'Sun direction', elevation: 'Sun elevation', layers: 'Visible elements', appearance: 'Display mode',
    natural: 'Materials', clay: 'Clay', technical: 'Technical', site: 'Site', furniture: 'Furniture', shadows: 'Cast shadows',
    groundGrid: 'Site grid', sectionHeight: 'Cut height', sectionNote: 'Applies when cutaway is on.',
    sunDegrees: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
  },
};

const labels = (locale) => locale === 'pt-PT' ? copy.pt : copy.en;
const booleanOptions = new Set(['site', 'furniture', 'shadows', 'groundGrid']);

function lightPreset(options) {
  return Object.keys(lightPresets).find(key => lightPresets[key][0] === options.sunAzimuth && lightPresets[key][1] === options.sunElevation) || 'custom';
}

function optionOutput(locale, key, value) {
  if (key === 'sunAzimuth') return `${value}° · ${labels(locale).sunDegrees[Math.round(value / 45) % 8]}`;
  if (key === 'sunElevation') return `${value}°`;
  return `${new Intl.NumberFormat(locale === 'en-INT' ? 'en-GB' : 'pt-PT', { maximumFractionDigits: 2 }).format(value)} m`;
}

export function renderSimulatorControls(locale, options = simulatorDefaults) {
  const c = labels(locale);
  function range(key, label, step = 1) {
    const [min, max] = simulatorLimits[key];
    const current = optionOutput(locale, key, options[key]);
    return `<label class="cv-sim-range"><span>${label}<output data-simulator-output="${key}">${current}</output></span><input data-simulator="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${options[key]}" aria-valuetext="${current}"></label>`;
  }
  function toggle(key) {
    return `<label class="cv-sim-toggle"><input data-simulator="${key}" type="checkbox"${options[key] ? ' checked' : ''}${key === 'groundGrid' && !options.site ? ' disabled' : ''}><span>${c[key]}</span></label>`;
  }
  const preset = lightPreset(options);
  return `<section class="cv-simulator-panel" id="cv-simulator-panel" data-role="simulator-panel" aria-labelledby="cv-simulator-title" hidden>
    <header class="cv-sim-head"><h2 id="cv-simulator-title">${c.panel}</h2><button type="button" data-action="simulator" class="cv-sim-close" aria-label="${c.close}"><svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path d="m4 4 10 10m0-10L4 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button></header>
    <div class="cv-sim-content">
      <fieldset class="cv-sim-set">
        <legend>${c.appearance}</legend>
        <div class="cv-sim-modes">${materialModes.map(mode => `<label><input type="radio" name="cv-model-material" data-simulator="materials" value="${mode}"${mode === options.materials ? ' checked' : ''}><span>${c[mode]}</span></label>`).join('')}</div>
      </fieldset>
      <fieldset class="cv-sim-set">
        <legend>${c.light}</legend>
        <label class="cv-sim-preset">${c.preset}<select data-simulator="lightPreset">
          ${['custom', ...Object.keys(lightPresets)].map(key => `<option value="${key}"${key === preset ? ' selected' : ''}${key === 'custom' ? ' disabled' : ''}>${c[key]}</option>`).join('')}
        </select></label>
        ${range('sunAzimuth', c.azimuth)}
        ${range('sunElevation', c.elevation)}
        ${toggle('shadows')}
      </fieldset>
      <fieldset class="cv-sim-set">
        <legend>${c.layers}</legend>
        <div class="cv-sim-toggles">${toggle('site')}${toggle('furniture')}${toggle('groundGrid')}</div>
        ${range('sectionHeight', c.sectionHeight, .02)}
        <p class="cv-sim-note">${c.sectionNote}</p>
      </fieldset>
    </div>
  </section>`;
}

export function readSimulatorOption(options, input) {
  const key = input.dataset.simulator;
  if (key === 'lightPreset') {
    if (!Object.hasOwn(lightPresets, input.value)) return options;
    const [sunAzimuth, sunElevation] = lightPresets[input.value];
    return sunAzimuth === options.sunAzimuth && sunElevation === options.sunElevation ? options : { ...options, sunAzimuth, sunElevation };
  }
  let value;
  if (key === 'materials' && materialModes.includes(input.value) && input.checked) value = input.value;
  if (booleanOptions.has(key)) value = input.checked;
  if (Object.hasOwn(simulatorLimits, key) && input.value !== '') {
    const [min, max] = simulatorLimits[key];
    value = Math.max(min, Math.min(max, Number(input.value)));
  }
  return value === undefined || Number.isNaN(value) || value === options[key] ? options : { ...options, [key]: value };
}

export function syncSimulatorControls(panel, locale, options) {
  for (const input of panel.querySelectorAll('[data-simulator]')) {
    const key = input.dataset.simulator;
    if (key === 'materials') input.checked = input.value === options[key];
    else if (key === 'lightPreset') input.value = lightPreset(options);
    else if (booleanOptions.has(key)) {
      input.checked = options[key];
      if (key === 'groundGrid') input.disabled = !options.site;
    }
    else {
      const text = optionOutput(locale, key, options[key]);
      input.value = options[key];
      input.setAttribute('aria-valuetext', text);
      panel.querySelector(`[data-simulator-output="${key}"]`).textContent = text;
    }
  }
}
