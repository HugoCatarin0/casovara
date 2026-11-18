import { applyConstructionOperations, constructionLimits, scheduleConstruction, validateConstructionSchedule } from './construction-schedule.js';
import { generateConstructionPlan } from './construction-tasks.js';
import { escapeHtml as esc, uid } from './builder-engine.js';

const copy = {
  title: ['Plano de obra', 'Construction plan'], timeline: ['Cronograma', 'Schedule'], tasks: ['Tarefas', 'Tasks'],
  settings: ['Calendário e equipas', 'Calendar and crews'], calendar: ['Calendário', 'Calendar'], back: ['Voltar à planta', 'Back to floor plan'],
  add: ['Adicionar tarefa', 'Add task'], export: ['Exportar CSV', 'Export CSV'], generate: ['Gerar plano', 'Generate plan'],
  regenerate: ['Gerar de novo', 'Regenerate'], blank: ['Começar do zero', 'Start from scratch'],
  undo: ['Desfazer', 'Undo'], redo: ['Refazer', 'Redo'],
  empty: ['Planeia a construção da casa', 'Plan the construction of your home'],
  introduction: ['Gera tarefas a partir da planta e do sistema construtivo. Ajusta as durações e as equipas para veres quando cada etapa pode começar.', 'Generate tasks from the floor plan and the construction system. Adjust durations and crews to see when each stage can start.'],
  start: ['Início previsto', 'Planned start'], end: ['Fim previsto', 'Planned finish'], projectStart: ['Data de início da obra', 'Project start date'],
  duration: ['Prazo planeado', 'Planned duration'], saved: ['Ganho face à série', 'Time saved vs. serial'],
  critical: ['Caminho crítico', 'Critical path'], criticalExplain: ['Prazo mínimo sem limites de equipa', 'Minimum duration without crew limits'],
  days: ['dias úteis', 'workdays'], day: ['dia útil', 'workday'], milestone: ['Marco', 'Milestone'],
  filter: ['Pesquisar tarefas', 'Search tasks'], criticalOnly: ['Apenas críticas', 'Critical only'],
  criticalLabel: ['Crítica por dependências', 'Dependency-critical'], crewWait: ['Espera de equipa', 'Crew delay'],
  concurrent: ['Pico de tarefas em paralelo', 'Peak concurrent tasks'], concurrency: ['Em simultâneo no mesmo dia útil', 'On the same working day'],
  free: ['Folga por dependências', 'Dependency float'], serial: ['Prazo em série', 'Serial duration'],
  noMatches: ['Nenhuma tarefa corresponde ao filtro.', 'No tasks match the filter.'],
  auto: ['O cronograma sobrepõe tarefas compatíveis, respeitando as dependências, o calendário e a capacidade das equipas. As durações geradas são estimativas editáveis.', 'The schedule overlaps compatible tasks while respecting dependencies, calendar and crew capacity. Generated durations are editable estimates.'],
  edit: ['Editar tarefa', 'Edit task'], newTask: ['Nova tarefa', 'New task'], task: ['Tarefa', 'Task'],
  taskName: ['Nome da tarefa', 'Task name'], phase: ['Fase da obra', 'Construction phase'], taskDays: ['Duração em dias úteis', 'Duration in workdays'],
  team: ['Equipa', 'Crew'], noCrew: ['Sem equipa atribuída', 'Unassigned'], units: ['Unidades de equipa necessárias', 'Crew units required'],
  earliest: ['Começar a partir de', 'Start no earlier than'], notes: ['Notas', 'Notes'],
  predecessors: ['Tarefas que têm de terminar antes', 'Tasks that must finish first'],
  addDependency: ['Adicionar dependência', 'Add dependency'], lag: ['Espera adicional em dias úteis', 'Additional wait in workdays'],
  dependency: ['Tarefa precedente', 'Predecessor'], select: ['Escolher tarefa', 'Choose task'],
  save: ['Aplicar alterações', 'Apply changes'], cancel: ['Cancelar', 'Cancel'], remove: ['Eliminar', 'Delete'],
  deleting: ['Eliminar esta tarefa e as dependências que apontam para ela?', 'Delete this task and the dependencies pointing to it?'],
  updating: ['Substituir as tarefas e dependências do plano atual pelas da proposta?', 'Replace the current plan’s tasks and dependencies with the new proposal?'],
  resetWarnings: ['Revê as durações e a sequência com a equipa de obra.', 'Review durations and sequence with the construction team.'],
  invalid: ['Não foi possível calcular o plano. Revê as dependências, as datas e a capacidade das equipas.', 'The plan could not be calculated. Review dependencies, dates and crew capacities.'],
  cycle: ['A tarefa ficaria à espera de si mesma. Revê a cadeia de dependências.', 'The task would wait for itself. Review the chain of dependencies.'],
  capacity: ['A capacidade da equipa é inferior à exigida por uma tarefa. Ajusta a equipa ou a tarefa.', 'Crew capacity is lower than a task requires. Adjust the crew or the task.'],
  weekdays: ['Dias de trabalho', 'Working days'], exceptions: ['Dias sem trabalho', 'Non-working dates'],
  exceptionDate: ['Data sem trabalho', 'Non-working date'], addException: ['Adicionar data', 'Add date'],
  crews: ['Equipas', 'Crews'], newCrew: ['Adicionar equipa', 'Add crew'], crewName: ['Nome da equipa', 'Crew name'],
  crewCapacity: ['Unidades disponíveis em simultâneo', 'Units available at the same time'],
  crewHelp: ['Uma unidade corresponde a uma frente de trabalho. Tarefas com a mesma equipa partilham a sua capacidade.', 'One unit is a work gang. Tasks assigned to the same crew share its capacity.'],
  noCrews: ['Adiciona uma equipa para limitar as tarefas que podem decorrer em simultâneo.', 'Add a crew to limit how many tasks can run at the same time.'],
  crewUsed: ['Atribui outra equipa ou retira esta equipa das tarefas antes de a eliminar.', 'Reassign or unassign this crew’s tasks before deleting it.'],
  chooseTask: ['Seleciona uma tarefa para veres as datas e ajustares a duração, a equipa e as dependências.', 'Select a task to see its dates and edit its duration, crew and dependencies.'],
  horizon: ['O cronograma ultrapassa o horizonte de cálculo. Ajusta as durações, as dependências ou o calendário para voltares a ver as datas.', 'The schedule exceeds the supported planning horizon. Adjust task durations, dependencies or the calendar to see dates again.'],
  waitingFor: ['Trabalho que ocupou a equipa', 'Work that held the crew'],
  level: ['Piso', 'Storey'], allLevels: ['Geral', 'Whole project'],
  recentSave: ['Alteração aplicada ao projeto.', 'Change applied to the project.'],
  optional: ['Trabalhos a incluir', 'Work packages to include'],
  electrical: ['Eletricidade', 'Electrical'], plumbing: ['Águas e esgotos', 'Plumbing and drainage'],
  vmc: ['VMC', 'Mechanical ventilation'], airConditioning: ['Ar condicionado', 'Air conditioning'],
  radiantFloor: ['Piso radiante', 'Radiant floor'], externalWorks: ['Arranjos exteriores', 'External works'],
};

const weekdays = [['Seg', 'Mon'], ['Ter', 'Tue'], ['Qua', 'Wed'], ['Qui', 'Thu'], ['Sex', 'Fri'], ['Sáb', 'Sat'], ['Dom', 'Sun']];
const workPackages = ['electrical', 'plumbing', 'vmc', 'airConditioning', 'radiantFloor', 'externalWorks'];
const phases = {
  preparation: ['Preparação', 'Preparation'], design: ['Projeto e preparação', 'Design and preparation'], procurement: ['Compras e fornecimentos', 'Procurement'],
  site: ['Estaleiro', 'Site setup'], foundations: ['Fundações', 'Foundations'], structure: ['Estrutura', 'Structure'],
  enclosure: ['Envolvente', 'Building envelope'], envelope: ['Envolvente', 'Building envelope'], roof: ['Cobertura', 'Roofing'],
  services: ['Instalações', 'Services'], finishes: ['Acabamentos', 'Finishes'], external: ['Exterior', 'External works'],
  handover: ['Entrega', 'Handover'], completion: ['Receção e entrega', 'Completion and handover'], custom: ['Trabalhos adicionais', 'Additional work'],
};
const icons = {
  back: '<path d="m14 7-5 5 5 5M9 12h11"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>',
  calendar: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 4v4m8-4v4M4 10h16m-11 4h5m-5 3h8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', export: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  timeline: '<path d="M5 5v15m3-13h9m-5 5h8m-7 5h5"/>', tasks: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.1M4 12h.1M4 18h.1"/>',
  repeat: '<path d="M19 10a7 7 0 1 0 0 4m0-9v5h-5"/>',
  undo: '<path d="M8 6 4 10l4 4m-4-4h10a5 5 0 0 1 5 5v3"/>', redo: '<path d="m16 6 4 4-4 4m4-4H10a5 5 0 0 0-5 5v3"/>',
};
const icon = (key) => icons[key] ? `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${icons[key]}</svg>` : '';
const basicSearch = (value) => String(value ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
const calendarToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${date.year}-${date.month}-${date.day}`;
};
const emptySchedule = (startDate = calendarToday()) => ({ startDate, weekdays: [1, 2, 3, 4, 5], exclusions: [], crews: [], tasks: [] });

export function mountConstructionSchedule(root, { locale, getProject, commit, undo, historyState = () => ({}) }) {
  const language = locale === 'pt-PT' ? 0 : 1;
  const t = (key) => copy[key]?.[language] ?? key;
  const phaseName = (phase) => phases[phase]?.[language] ?? phase;
  const dateLocale = locale === 'en-INT' ? 'en-GB' : 'pt-PT';
  const short = new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const full = new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const fmt = (iso, precise = false) => iso ? (precise ? full : short).format(new Date(`${iso}T00:00:00Z`)) : '—';
  const duration = (days) => `${days} ${t(days === 1 ? 'day' : 'days')}`;
  const modal = document.createElement('dialog');
  modal.className = 'cvt-dialog';
  modal.id = 'cv-construction-schedule';
  modal.setAttribute('aria-labelledby', 'cvt-heading');
  root.append(modal);

  let tab = 'timeline';
  let focusedTask = null;
  let taskDraft = null;
  let originalFocus = null;
  let query = '';
  let onlyCritical = false;
  let message = '';
  let warning = '';
  let confirming = null;
  let plan = null;
  let schedule = null;

  const button = (action, label, glyph, extra = '', className = '') => `<button type="button" class="cvt-button ${className}" data-cvt="${action}" ${extra}>${icon(glyph)}<span>${t(label)}</span></button>`;
  const option = (id, text, selected = '') => `<option value="${esc(id)}" ${id === selected ? 'selected' : ''}>${esc(text)}</option>`;
  const field = (label, input) => `<label class="cvt-field"><span>${t(label)}</span>${input}</label>`;
  const input = (name, type, value, extra = '') => `<input name="${name}" type="${type}" value="${esc(value ?? '')}" ${extra}>`;
  const named = (kind, value) => field(kind, input(kind, 'text', value, `required maxlength="${constructionLimits.label}"`));
  const taskTitle = (id) => plan.tasks.find((task) => task.id === id)?.label ?? id;
  const selectedTask = () => schedule?.tasks.find((task) => task.id === focusedTask);

  function generateSettings() {
    const project = getProject();
    return `<form data-cvt-form="generation" class="cvt-generation">
      ${field('projectStart', input('startDate', 'date', plan?.startDate ?? calendarToday(), 'required'))}
      <details class="cvt-packages"><summary>${t('optional')}</summary><div>${workPackages.map((id) => {
        const current = project.levels?.some((level) => id === 'externalWorks' ? level.rooms?.some((room) => room.type === 'outdoor') :
          !!level.services?.[id]?.nodes.length || level.items?.some(({ type }) => id === 'airConditioning' && type === 'acUnit' || id === 'radiantFloor' && type === 'heatingManifold'));
        const included = id === 'electrical' || id === 'plumbing' || current;
        return `<label><input type="checkbox" name="${id}" ${included ? 'checked' : ''}> ${t(id)}</label>`;
      }).join('')}</div></details>
      <div class="cvt-actions"><button type="submit" class="cvt-button cvt-primary">${icon('calendar')}${t('generate')}</button>
      ${!plan ? button('blank', 'blank') : button('cancel-confirm', 'cancel')}</div>
    </form>`;
  }

  function overview() {
    const { workingDays, savedDays, dependencyDays, sequentialDays, startDate, endDate, peakParallel } = schedule;
    return `<div class="cvt-metrics">
      <div class="cvt-metric"><span>${t('duration')}</span><strong>${duration(workingDays)}</strong><small>${fmt(startDate, true)}${endDate ? ` – ${fmt(endDate, true)}` : ''}</small></div>
      <div class="cvt-metric"><span>${t('saved')}</span><strong>${duration(savedDays)}</strong><small>${t('serial')} · ${duration(sequentialDays)}</small></div>
      <div class="cvt-metric"><span>${t('critical')}</span><strong>${duration(dependencyDays)}</strong><small>${t('criticalExplain')}</small></div>
      <div class="cvt-metric"><span>${t('concurrent')}</span><strong>${peakParallel}</strong><small>${t('concurrency')}</small></div>
    </div>`;
  }

  function visibleTasks() {
    const terms = basicSearch(query).split(/\s+/).filter(Boolean);
    return (schedule?.tasks ?? plan.tasks).filter((task) => (!onlyCritical || task.critical) && terms.every((term) => basicSearch(`${task.label} ${phaseName(task.phase)} ${task.crewId ? plan.crews.find(({ id }) => id === task.crewId)?.label ?? '' : ''}`).includes(term)));
  }

  function taskFlags(task) {
    return `${task.critical ? `<span class="cvt-critical-text">${t('criticalLabel')}</span>` : ''}${task.crewDelay > 0 ? `<span class="cvt-wait-text">${t('crewWait')} · ${duration(task.crewDelay)}</span>` : ''}`;
  }

  function taskTable(tasks) {
    return `<div class="cvt-table" role="region" aria-label="${t('tasks')}"><table><thead><tr><th scope="col">${t('task')}</th><th scope="col">${t('start')}</th><th scope="col">${t('end')}</th><th scope="col">${t('taskDays')}</th></tr></thead><tbody>
      ${tasks.map((task) => `<tr><th scope="row"><button type="button" data-cvt="task" data-id="${esc(task.id)}" aria-pressed="${task.id === focusedTask}"><strong>${esc(task.label)}</strong><small>${esc(phaseName(task.phase))}</small>${taskFlags(task)}</button></th><td>${fmt(task.startDate)}</td><td>${fmt(task.endDate)}</td><td>${task.days ? duration(task.days) : t('milestone')}</td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function gantt(tasks) {
    const columns = Math.max(1, schedule.workDates.length);
    const step = columns <= 40 ? 5 : columns <= 125 ? 10 : columns <= 290 ? 20 : Math.ceil(columns / 16);
    const width = Math.max(600, Math.min(6000, columns * (columns < 40 ? 28 : 7)));
    const pct = (value) => `${100 * value / columns}%`;
    const ticks = schedule.workDates.map((date, index) => index % step === 0 ? `<span class="cvt-time-label" style="--position:${pct(index)}">${fmt(date)}</span>` : '').join('');
    return `<div class="cvt-chart-scroll" role="region" aria-label="${t('timeline')}" tabindex="0"><div class="cvt-chart" style="--track-width:${width}px;--grid-gap:${pct(step)}">
      <div class="cvt-chart-header"><span>${t('tasks')}</span><div class="cvt-track">${ticks}</div></div>
      ${tasks.map((task) => {
        const isMilestone = task.days === 0;
        const startDay = task.startDay;
        const waitStart = Math.max(0, task.dependencyStartDay);
        const wait = task.crewDelay > 0 ? `<i class="cvt-bar-wait" style="--start:${pct(waitStart)};--length:${pct(startDay - waitStart)}" title="${t('crewWait')}"></i>` : '';
        const text = `${task.label} · ${fmt(task.startDate, true)} – ${fmt(task.endDate, true)}${task.critical ? ` · ${t('criticalLabel')}` : ''}`;
        return `<div class="cvt-chart-row" data-selected="${task.id === focusedTask}"><button type="button" class="cvt-task-label" data-cvt="task" data-id="${esc(task.id)}" aria-pressed="${task.id === focusedTask}"><strong>${esc(task.label)}</strong><small>${esc(phaseName(task.phase))} · ${isMilestone ? t('milestone') : duration(task.days)}</small></button>
          <div class="cvt-track">${wait}<button type="button" tabindex="-1" data-cvt="task" data-id="${esc(task.id)}" class="cvt-bar${task.critical ? ' cvt-bar-critical' : ''}${isMilestone ? ' cvt-milestone' : ''}" style="--start:${pct(startDay)};--length:${pct(task.endDay - startDay)}" title="${esc(text)}" aria-label="${esc(text)}">${!isMilestone && task.days > columns / 7 ? `<span>${esc(task.label)}</span>` : ''}</button></div></div>`;
      }).join('')}
    </div></div><div class="cvt-legend"><span><i></i>${t('tasks')}</span><span><i data-kind="critical"></i>${t('criticalLabel')}</span><span><i data-kind="wait"></i>${t('crewWait')}</span><span><i data-kind="point"></i>${t('milestone')}</span></div>`;
  }

  function renderContent() {
    const results = modal.querySelector('[data-cvt-results]');
    if (!results) return;
    const scroll = results.querySelector('.cvt-chart-scroll');
    const scrollLeft = scroll?.scrollLeft ?? 0;
    const scrollTop = scroll?.scrollTop ?? 0;
    const tasks = visibleTasks();
    results.innerHTML = tasks.length ? tab === 'timeline' && schedule ? gantt(tasks) : taskTable(tasks)
      : `<p class="cvt-note">${t(plan.tasks.length ? 'noMatches' : 'chooseTask')}</p>`;
    const updatedScroll = results.querySelector('.cvt-chart-scroll');
    if (updatedScroll) { updatedScroll.scrollLeft = scrollLeft; updatedScroll.scrollTop = scrollTop; }
  }

  function taskSidebar() {
    if (!taskDraft) return `<aside class="cvt-side cvt-side-empty" data-cvt-detail><p class="cvt-note">${t('chooseTask')}</p></aside>`;
    const task = taskDraft;
    const summary = selectedTask();
    const exists = plan.tasks.some(({ id }) => id === task.id);
    const available = plan.tasks.filter(({ id }) => id !== task.id);
    const levels = getProject().levels ?? [];
    const crewOptions = [option('', t('noCrew'), task.crewId ?? ''), ...plan.crews.map(({ id, label }) => option(id, label, task.crewId))].join('');
    const levelOptions = [option('', t('allLevels'), task.levelId ?? ''), ...levels.map(({ id, name }) => option(id, name, task.levelId))].join('');
    const phaseOptions = [...new Set([...plan.tasks.map(({ phase }) => phase), task.phase, 'custom'])].map((id) => option(id, phaseName(id), task.phase)).join('');
    const predecessors = task.dependencies.map(({ id, lag }) => `<div class="cvt-dependency"><label><span class="cvt-sr">${t('dependency')}</span><select name="before" required>${option('', t('select'), id)}${available.map((entry) => option(entry.id, entry.label, id)).join('')}</select></label>
      <label class="cvt-dependency-lag"><span class="cvt-sr">${t('lag')}</span>${input('lag', 'number', lag ?? 0, `min="0" max="${constructionLimits.lagDays}" required`)}</label>
      ${button('delete-dependency', 'remove', 'close', `aria-label="${t('remove')} · ${t('dependency')}"`, 'cvt-icon-button')}</div>`).join('');
    const blockers = Array.isArray(summary?.resourceBlockers) ? summary.resourceBlockers.map((value) => taskTitle(typeof value === 'string' ? value : value.taskId ?? value.id)).filter(Boolean) : [];
    return `<aside class="cvt-side" data-cvt-detail><form data-cvt-form="task" class="cvt-task-form">
      <div class="cvt-side-heading"><h2>${t(exists ? 'edit' : 'newTask')}</h2>${button('close-task', 'cancel', 'close', `aria-label="${t('cancel')}"`, 'cvt-icon-button')}</div>
      ${summary ? `<div class="cvt-task-summary"><b>${fmt(summary.startDate, true)} – ${fmt(summary.endDate, true)}</b><span>${taskFlags(summary) || `${t('free')} · ${duration(summary.totalFloat)}`}</span>${blockers.length ? `<small>${t('waitingFor')} · ${esc(blockers.join(', '))}</small>` : ''}</div>` : ''}
      ${named('taskName', task.label)}
      <div class="cvt-two">${field('taskDays', input('days', 'number', task.days, `min="0" max="${constructionLimits.taskDays}" required`))}${field('phase', `<select name="phase">${phaseOptions}</select>`)}</div>
      <div class="cvt-two">${field('team', `<select name="crewId">${crewOptions}</select>`)}${field('units', input('crewUnits', 'number', task.crewUnits ?? 1, `min="1" max="${constructionLimits.capacity}"`))}</div>
      <div class="cvt-two">${field('earliest', input('notBefore', 'date', task.notBefore))}${field('level', `<select name="levelId">${levelOptions}</select>`)}</div>
      <fieldset class="cvt-dependencies"><legend>${t('predecessors')}</legend>
        ${predecessors ? `<p>${t('lag')}</p>` : ''}<div data-cvt-dependencies>${predecessors}</div>
        ${button('add-dependency', 'addDependency', 'plus', available.length ? '' : 'disabled')}</fieldset>
      ${field('notes', `<textarea name="notes" rows="2" maxlength="1000">${esc(task.notes ?? '')}</textarea>`)}
      <div class="cvt-actions"><button type="submit" class="cvt-button cvt-primary">${t('save')}</button>${exists ? button('delete-task', 'remove') : ''}</div>
    </form></aside>`;
  }

  function settings() {
    return `<div class="cvt-settings">
      <form class="cvt-settings-card" data-cvt-form="calendar"><h2>${t('calendar')}</h2>
        ${field('projectStart', input('startDate', 'date', plan.startDate, 'required'))}
        <fieldset class="cvt-week"><legend>${t('weekdays')}</legend>${weekdays.map((pair, index) => {
          const id = index + 1;
          return `<label><input type="checkbox" name="weekday" value="${id}" ${plan.weekdays.includes(id) ? 'checked' : ''}><span>${pair[language]}</span></label>`;
        }).join('')}</fieldset>
        <div class="cvt-exceptions"><h3>${t('exceptions')}</h3><ul>${plan.exclusions.map((date) => `<li><time datetime="${esc(date)}">${fmt(date, true)}</time>${button('remove-exception', 'remove', 'close', `data-date="${esc(date)}" aria-label="${t('remove')} ${fmt(date, true)}"`, 'cvt-icon-button')}</li>`).join('')}</ul></div>
        <div class="cvt-actions cvt-exception-field">${field('exceptionDate', input('exception', 'date', ''))}${button('add-exception', 'addException', 'plus')}</div>
        <button type="submit" class="cvt-button cvt-primary">${t('save')}</button>
      </form>
      <section class="cvt-settings-card"><h2>${t('crews')}</h2><p class="cvt-note">${t('crewHelp')}</p>
        ${plan.crews.map((crew) => crewForm(crew)).join('') || `<p class="cvt-note">${t('noCrews')}</p>`}
        ${crewForm({ id: '', label: '', capacity: 1 })}
      </section></div>`;
  }

  function crewForm(crew) {
    return `<form data-cvt-form="crew" data-id="${esc(crew.id)}" class="cvt-crew-form">
      <div class="cvt-two">${named('crewName', crew.label)}${field('crewCapacity', input('capacity', 'number', crew.capacity, `min="1" max="${constructionLimits.capacity}" required`))}</div>
      <div class="cvt-actions"><button type="submit" class="cvt-button ${crew.id ? '' : 'cvt-primary'}">${t(crew.id ? 'save' : 'newCrew')}</button>${crew.id ? button('delete-crew', 'remove', '', `data-id="${esc(crew.id)}"`) : ''}</div>
    </form>`;
  }

  function announcement() {
    return `<div class="cvt-alerts" data-cvt-alerts><p class="cvt-error" role="alert" ${warning ? '' : 'hidden'}>${esc(warning)}</p><p class="cvt-sr" role="status">${esc(message)}</p></div>`;
  }

  function render(focus = '', prepared) {
    const oldScroll = modal.querySelector('.cvt-chart-scroll');
    const scrollOffsets = [oldScroll?.scrollLeft, oldScroll?.scrollTop];
    const nextPlan = getProject().constructionPlan ?? null;
    const cached = nextPlan === plan ? schedule : null;
    plan = nextPlan;
    schedule = null;
    if (plan) {
      try { schedule = prepared ?? cached ?? scheduleConstruction(plan); }
      catch (error) {
        warning = failureMessage(error);
        if (tab === 'timeline') tab = 'tasks';
        onlyCritical = false;
      }
    }
    const history = historyState();
    modal.innerHTML = `<header class="cvt-header"><div class="cvt-project-identity"><span class="cvt-brand">${icon('calendar')}</span><div><h1 id="cvt-heading">${t('title')}</h1><p>${esc(getProject().name)}</p></div></div>
      <div class="cvt-header-actions">${plan || history.canRedo ? `${button('undo', 'undo', 'undo', history.canUndo ? '' : 'disabled', 'cvt-history')}${button('redo', 'redo', 'redo', history.canRedo ? '' : 'disabled', 'cvt-history')}` : ''}${plan ? button('export', 'export', 'export', schedule?.tasks.length ? '' : 'disabled') : ''}
      ${button('close', 'back', 'back', `aria-label="${t('back')}"`, 'cvt-return')}</div></header>
      <main class="cvt-main">${announcement()}${!plan ? `<section class="cvt-empty"><div class="cvt-brand">${icon('calendar')}</div><h2>${t('empty')}</h2><p>${t('introduction')}</p>${generateSettings()}</section>` : `
      ${schedule ? overview() : ''}<div class="cvt-controls"><nav aria-label="${t('title')}">
        ${['timeline', 'tasks', 'settings'].map((id) => button(`tab-${id}`, id, id === 'settings' ? 'calendar' : id, `aria-pressed="${tab === id}" ${id === 'timeline' && !schedule ? 'disabled' : ''}`)).join('')}
      </nav><div class="cvt-actions">${button('regenerate', 'regenerate', 'repeat')}${button('add-task', 'add', 'plus', '', 'cvt-primary')}</div></div>
      ${confirming ? `<section class="cvt-confirm" aria-label="${t('title')}"><p>${t(confirming === 'regenerate' ? 'updating' : 'deleting')}</p>${confirming === 'regenerate' ? generateSettings() : `<div class="cvt-actions">${button('confirm-delete', 'remove', '', '', 'cvt-primary')}${button('cancel-confirm', 'cancel')}</div>`}</section>` : ''}
      ${tab === 'settings' ? settings() : `<div class="cvt-workarea"><section class="cvt-work"><div class="cvt-filters">
        <label class="cvt-filter"><span class="cvt-sr">${t('filter')}</span><input type="search" data-cvt-filter placeholder="${t('filter')}" value="${esc(query)}"></label>
        ${schedule ? `<label class="cvt-check"><input type="checkbox" data-cvt-critical ${onlyCritical ? 'checked' : ''}>${t('criticalOnly')}</label>` : ''}</div>
        <div data-cvt-results></div><p class="cvt-note">${t('auto')}</p><p class="cvt-note">${t('resetWarnings')}</p>
      </section>${taskSidebar()}</div>`}`}</main>`;
    renderContent();
    const newScroll = modal.querySelector('.cvt-chart-scroll');
    if (newScroll && scrollOffsets[0] !== undefined) [newScroll.scrollLeft, newScroll.scrollTop] = scrollOffsets;
    const target = focus ? modal.querySelector(focus) : null;
    if (target) {
      target.focus({ preventScroll: true });
      if (target.closest('.cvt-side') && matchMedia('(max-width: 790px)').matches) target.scrollIntoView({ block: 'nearest' });
    }
  }

  function failureMessage(error) {
    return t({ cyclic_dependencies: 'cycle', crew_capacity: 'capacity', schedule_too_long: 'horizon' }[error.code] ?? 'invalid');
  }

  function setAlert(error) {
    warning = error ? failureMessage(error) : '';
    const alert = modal.querySelector('[role=alert]');
    alert.hidden = !warning;
    alert.textContent = warning;
    if (warning) alert.scrollIntoView({ block: 'nearest' });
  }

  function update(next, focus = '') {
    const value = validateConstructionSchedule(next);
    const prepared = scheduleConstruction(value);
    commit(value);
    message = t('recentSave');
    warning = '';
    confirming = null;
    render(focus, prepared);
  }

  function apply(operations, focus = '') {
    update(applyConstructionOperations(plan, operations), focus);
  }

  function readTask(form) {
    const data = new FormData(form);
    const lags = data.getAll('lag');
    return { id: taskDraft.id, label: String(data.get('taskName')).trim(), days: Number(data.get('days')),
      phase: String(data.get('phase')).trim(), dependencies: data.getAll('before').map((id, index) => ({ id, lag: Number(lags[index] || 0) })),
      crewId: data.get('crewId') || null, crewUnits: data.get('crewId') ? Number(data.get('crewUnits') || 1) : null,
      levelId: data.get('levelId') || null, notBefore: data.get('notBefore') || null, notes: String(data.get('notes')).trim() };
  }

  function readCalendar(form, exclusions = plan.exclusions) {
    const data = new FormData(form);
    return { startDate: data.get('startDate'), weekdays: data.getAll('weekday').map(Number), exclusions: [...new Set(exclusions)].sort() };
  }

  function focusTask(id) {
    const source = plan.tasks.find((task) => task.id === id);
    if (!source) return;
    focusedTask = id;
    taskDraft = structuredClone(source);
    confirming = null;
    render('[name=taskName]');
  }

  function exportCsv() {
    const quote = (cell) => {
      let value = String(cell ?? '');
      if (/^[\s]*[=+\-@]/.test(value)) value = `'${value}`;
      return `"${value.replaceAll('"', '""')}"`;
    };
    const rows = [[t('task'), t('phase'), t('start'), t('end'), t('taskDays'), t('team'), t('predecessors'), t('critical'), t('crewWait')], ...schedule.tasks.map((task) => [task.label, phaseName(task.phase), task.startDate, task.endDate, task.days,
      plan.crews.find(({ id }) => id === task.crewId)?.label, task.dependencies.map(({ id, lag }) => `${taskTitle(id)}${lag ? ` +${lag}` : ''}`).join(' | '), task.critical ? t('criticalLabel') : '', task.crewDelay])];
    const csv = '\ufeff' + rows.map((row) => row.map(quote).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${basicSearch(getProject().name).replace(/[^a-z\d]+/g, '-').replace(/^-|-$/g, '') || 'casovara'}-cronograma.csv`;
    modal.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  modal.addEventListener('submit', (event) => {
    const form = event.target;
    if (!form.dataset.cvtForm) return;
    event.preventDefault();
    try {
      if (form.dataset.cvtForm === 'generation') {
        const data = new FormData(form);
        const proposed = generateConstructionPlan(getProject(), { startDate: data.get('startDate'), locale,
          include: Object.fromEntries(workPackages.map((id) => [id, data.has(id)])) });
        if (plan) {
          proposed.weekdays = plan.weekdays;
          proposed.exclusions = plan.exclusions;
          proposed.crews = proposed.crews.map((crew) => plan.crews.find(({ id }) => id === crew.id) ?? crew);
        }
        taskDraft = focusedTask = null;
        tab = 'timeline';
        update(proposed, '[data-cvt=add-task]');
      } else if (form.dataset.cvtForm === 'calendar') {
        apply([{ op: 'set_calendar', calendar: readCalendar(form) }], '[data-cvt=tab-settings]');
      } else if (form.dataset.cvtForm === 'crew') {
        const data = new FormData(form);
        apply([{ op: 'upsert_crew', crew: { id: form.dataset.id || uid(), label: String(data.get('crewName')).trim(), capacity: Number(data.get('capacity')) } }]);
      } else if (form.dataset.cvtForm === 'task') {
        const task = readTask(form);
        const next = applyConstructionOperations(plan, [{ op: 'upsert_task', task }]);
        focusedTask = task.id;
        taskDraft = structuredClone(next.tasks.find(({ id }) => id === task.id));
        update(next, '[name=taskName]');
      }
    } catch (error) { setAlert(error); }
  });

  modal.addEventListener('input', (event) => {
    if (!event.target.matches('[data-cvt-filter]')) return;
    query = event.target.value;
    renderContent();
  });
  modal.addEventListener('change', (event) => {
    if (!event.target.matches('[data-cvt-critical]')) return;
    onlyCritical = event.target.checked;
    renderContent();
  });

  modal.addEventListener('click', (event) => {
    const control = event.target.closest('[data-cvt]');
    if (!control) return;
    const action = control.dataset.cvt;
    if (action.startsWith('tab-')) {
      tab = action.slice(4);
      warning = '';
      confirming = null;
      render(`[data-cvt="${action}"]`);
      return;
    }
    try {
      switch (action) {
        case 'close': modal.close(); break;
        case 'undo': case 'redo': {
          undo(action === 'redo');
          taskDraft = focusedTask = null;
          render(`[data-cvt=${action}]`);
          break;
        }
        case 'blank': {
          const start = control.closest('form')?.elements.startDate;
          if (start && !start.reportValidity()) break;
          update(emptySchedule(start?.value));
          break;
        }
        case 'export': exportCsv(); break;
        case 'regenerate': confirming = 'regenerate'; render('[data-cvt-form=generation] [name=startDate]'); break;
        case 'cancel-confirm': confirming = null; render('[data-cvt=regenerate]'); break;
        case 'task': focusTask(control.dataset.id); break;
        case 'close-task': taskDraft = focusedTask = null; confirming = null; render('[data-cvt=add-task]'); break;
        case 'add-task':
          tab = tab === 'settings' ? 'tasks' : tab;
          focusedTask = null;
          taskDraft = { id: uid(), label: '', phase: 'custom', days: 1, dependencies: [] };
          render('[name=taskName]');
          break;
        case 'add-dependency': case 'delete-dependency': {
          const form = control.closest('form');
          taskDraft = readTask(form);
          if (action === 'add-dependency') taskDraft.dependencies.push({ id: '', lag: 0 });
          else taskDraft.dependencies.splice([...form.querySelectorAll('[data-cvt=delete-dependency]')].indexOf(control), 1);
          render(action === 'add-dependency' ? '.cvt-dependency:last-child select' : '[data-cvt=add-dependency]');
          break;
        }
        case 'delete-task': confirming = 'delete'; render('[data-cvt=confirm-delete]'); break;
        case 'confirm-delete': {
          const id = focusedTask;
          const changes = plan.tasks.filter((task) => task.dependencies.some((entry) => entry.id === id)).map((task) => ({
            op: 'upsert_task', task: { id: task.id, dependencies: task.dependencies.filter((entry) => entry.id !== id) },
          }));
          const next = applyConstructionOperations(plan, [...changes, { op: 'delete_task', id }]);
          taskDraft = focusedTask = null;
          update(next, '[data-cvt=add-task]');
          break;
        }
        case 'add-exception': case 'remove-exception': {
          const form = control.closest('form');
          const date = form.elements.exception.value;
          if (action === 'add-exception' && !date) { form.elements.exception.focus(); break; }
          const exclusions = action === 'add-exception' ? [...plan.exclusions, date] : plan.exclusions.filter((entry) => entry !== control.dataset.date);
          apply([{ op: 'set_calendar', calendar: readCalendar(form, exclusions) }], '[name=exception]');
          break;
        }
        case 'delete-crew':
          if (plan.tasks.some(({ crewId }) => crewId === control.dataset.id)) {
            const error = modal.querySelector('[role=alert]');
            warning = t('crewUsed'); error.hidden = false; error.textContent = warning;
          } else apply([{ op: 'delete_crew', id: control.dataset.id }]);
          break;
      }
    } catch (error) { setAlert(error); }
  });

  modal.addEventListener('keydown', (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.target.matches('input,textarea,select') || !['z', 'y'].includes(event.key.toLowerCase())) return;
    event.preventDefault();
    undo(event.shiftKey || event.key.toLowerCase() === 'y');
    taskDraft = focusedTask = null;
    render();
  });
  modal.addEventListener('close', () => {
    taskDraft = focusedTask = null;
    originalFocus?.focus();
  });
  return {
    open({ withFocus = document.activeElement } = {}) {
      if (modal.open || !root.isConnected) return;
      originalFocus = withFocus;
      tab = 'timeline'; query = ''; onlyCritical = false; message = ''; warning = ''; confirming = null;
      render();
      modal.showModal();
      modal.querySelector('[data-cvt=close]')?.focus();
    },
    dispose() { modal.remove(); },
  };
}
