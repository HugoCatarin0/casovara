import { projectArea } from './builder-engine.js';
import { validateConstructionSchedule } from './construction-schedule.js';

const phases = {
  design: ['Projeto e preparação', 'Design and preparation'],
  supply: ['Fornecimentos', 'Procurement'],
  ground: ['Estaleiro e fundações', 'Site and foundations'],
  structure: ['Estrutura', 'Structure'],
  envelope: ['Cobertura e envolvente', 'Roof and envelope'],
  services: ['Instalações', 'Building services'],
  finishes: ['Acabamentos', 'Finishes'],
  handover: ['Ensaios e entrega', 'Testing and handover'],
};

const crews = {
  design: ['Equipa de projeto', 'Design team'],
  management: ['Gestão de obra', 'Site management'],
  review: ['Fiscalização e ensaios', 'Inspection and testing'],
  site: ['Estaleiro e movimentação de terras', 'Site and earthworks crew'],
  concrete: ['Equipa de betão', 'Concrete crew'],
  structure: ['Equipa de estrutura', 'Structural crew'],
  roof: ['Equipa de cobertura', 'Roofing crew'],
  facade: ['Equipa de fachada', 'Façade crew'],
  windows: ['Equipa de caixilharia', 'Window and door crew'],
  partitions: ['Divisórias e tetos', 'Partitions and ceilings crew'],
  electrical: ['Equipa de eletricidade', 'Electrical crew'],
  plumbing: ['Equipa de águas e esgotos', 'Plumbing crew'],
  climate: ['Equipa de climatização', 'HVAC crew'],
  screed: ['Equipa de betonilhas', 'Screed crew'],
  finishes: ['Equipa de acabamentos', 'Finishes crew'],
  joinery: ['Equipa de carpintaria', 'Joinery crew'],
  exterior: ['Equipa de arranjos exteriores', 'External works crew'],
};

const structural = {
  edria: { days: 7, manufacture: 18, tags: ['Montar componentes do sistema Édria', 'Assemble Édria system components'] },
  lsf: { days: 6, manufacture: 15, tags: ['Montar estrutura LSF e contraventamento', 'Assemble LSF framing and bracing'] },
  clickhouse: { days: 6, manufacture: 20, tags: ['Montar módulos ClickHouse', 'Assemble ClickHouse modules'] },
  masonry: { days: 13, tags: ['Executar alvenaria e elementos de suporte', 'Build masonry and supporting elements'] },
  concrete: { days: 10, tags: ['Montar cofragem, armação e passagens', 'Set formwork, reinforcement and openings'] },
};

const windowTypes = new Set(['window', 'slidingWindow']);

function defaultStartDate() {
  const pieces = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts();
  const date = Object.fromEntries(pieces.map(({ type, value }) => [type, value]));
  return `${date.year}-${date.month}-${date.day}`;
}

function scaled(days, area) {
  return Math.max(1, Math.min(100, Math.ceil(days * Math.max(.55, area / 100) ** .72)));
}

function quantities(project) {
  return project.levels.map((level) => {
    const area = projectArea({ levels: [level] });
    return { level, area: area > 0 && Number.isFinite(area) ? area : 90, estimated: !(area > 0 && Number.isFinite(area)) };
  });
}

function selectedPackages(project, include) {
  const rooms = project.levels.flatMap(({ rooms }) => rooms);
  const items = project.levels.flatMap(({ items }) => items ?? []);
  const drawn = (id) => project.levels.some(({ services }) => (services?.[id]?.nodes?.length ?? 0) > 0);
  return {
    electrical: include.electrical ?? true,
    plumbing: include.plumbing ?? true,
    vmc: include.vmc ?? drawn('vmc'),
    airConditioning: include.airConditioning ?? (drawn('airConditioning') || items.some(({ type }) => type === 'acUnit')),
    radiantFloor: include.radiantFloor ?? (drawn('radiantFloor') || items.some(({ type }) => type === 'heatingManifold')),
    externalWorks: include.externalWorks ?? rooms.some(({ type }) => type === 'outdoor'),
  };
}

function zoneName(entries, first, locale) {
  const pt = locale === 'pt-PT';
  if (entries.length > 1) return `${pt ? 'Pisos' : 'Storeys'} ${first + 1}–${first + entries.length}`;
  const name = entries[0].level.name;
  return typeof name === 'string' && name.trim() ? name.trim().slice(0, 34) : `${pt ? 'Piso' : 'Storey'} ${first + 1}`;
}

/** Creates an editable concept programme from the current Casovara project. */
export function generateConstructionPlan(project, { startDate = defaultStartDate(), locale = 'pt-PT', include = {} } = {}) {
  if (!Array.isArray(project?.levels) || !project.levels.length) throw new Error('A house with at least one storey is required.');
  const language = locale === 'pt-PT' ? 0 : 1;
  const local = (pair) => pair[language];
  const floors = quantities(project);
  const area = floors.reduce((sum, floor) => sum + floor.area, 0);
  const groundArea = floors[0].area;
  const structure = Object.hasOwn(structural, project.systemId) ? structural[project.systemId] : structural.masonry;
  const packages = selectedPackages(project, include);
  const tasks = [];
  const crewIds = new Set();

  function add(id, name, phase, days, after = [], crewId, { notes, levelId, zone } = {}) {
    if (crewId) crewIds.add(crewId);
    tasks.push({ id, label: zone ? `${local(name)} · ${zone}` : local(name), phase: local(phases[phase]), days,
      dependencies: [...new Set(after)].map((id) => ({ id })),
      ...(crewId ? { crewId } : {}), ...(notes ? { notes: local(notes) } : {}), ...(levelId ? { levelId } : {}),
    });
    return id;
  }

  const missingArea = floors.some(({ estimated }) => estimated);
  const brief = add('brief', ['Validar âmbito, prazos e equipas', 'Confirm scope, lead times and crews'], 'design', 2, [], 'management', { notes: missingArea
    ? ['Hipótese de 90 m² em cada piso ainda sem compartimentos. Ajustar durações, feriados e disponibilidade com a equipa.', 'Assumes 90 m² for each storey without rooms. Confirm durations, holidays and crew availability with the team.']
    : ['As durações são estimativas em dias úteis. Confirmar prazos, feriados, frentes de trabalho e a disponibilidade das equipas.', 'Durations are working-day estimates. Confirm lead times, holidays, work areas and crew availability.'],
  });
  const survey = add('survey', ['Levantamento do terreno e condicionantes', 'Survey site and constraints'], 'design', 4, [brief], 'design');
  const design = add('design', ['Coordenar arquitetura, estrutura e especialidades', 'Coordinate architecture, structure and services'], 'design', scaled(13, area), [survey], 'design');
  const approval = add('approvals', ['Prazo previsto para verificações administrativas', 'Allowance for administrative checks'], 'design', 15, [design], undefined, {
    notes: ['Prazo de planeamento editável. Confirmar as condições administrativas aplicáveis à obra.', 'Editable planning allowance. Confirm the administrative requirements that apply to this project.'],
  });
  const siteRelease = add('start-release', ['Validar condições para iniciar a obra', 'Release site to begin works'], 'design', 0, [approval, design, add('site-safety',
    ['Preparar segurança, acessos e logística', 'Prepare safety arrangements, access and logistics'], 'design', 5, [design], 'management')]);

  const ordering = add('reserve-openings', ['Reservar fornecimento de caixilharias', 'Reserve windows and doors supplier'], 'supply', 4, [design], 'management', {
    notes: ['Confirmar a encomenda final após a medição em obra.', 'Confirm the final order after measuring the site openings.'],
  });
  const prefabrication = structure.manufacture && add('structure-fabrication', ['Produção em oficina e entrega de componentes', 'Off-site fabrication and delivery of components'], 'supply',
    scaled(structure.manufacture, area), [design], undefined, {
      notes: ['Prazo indicativo sujeito à validação dos desenhos de produção e confirmação do fornecedor.', 'Indicative allowance subject to shop drawing approval and supplier confirmation.'],
    });
  const equipment = Object.entries(packages).some(([id, active]) => id !== 'externalWorks' && active)
    ? add('order-equipment', ['Encomendar equipamentos das instalações', 'Order building service equipment'], 'supply', scaled(10, area), [design]) : null;

  const site = add('site-setup', ['Montar estaleiro e marcar implantação', 'Set up site and mark out building'], 'ground', 3, [siteRelease], 'site');
  const excavation = add('earthworks', ['Escavar e preparar plataforma', 'Excavate and prepare building platform'], 'ground', scaled(5, groundArea), [site], 'site');
  const belowSlab = packages.plumbing ? add('under-slab-services', ['Preparar coletor e passagens sob a laje', 'Prepare below-slab drainage and sleeves'],
    'ground', scaled(3, groundArea), [excavation], 'plumbing') : excavation;
  const foundations = add('foundation-prep', ['Preparar fundações, armação e cofragem', 'Prepare foundations, reinforcement and formwork'], 'ground', scaled(6, groundArea), [belowSlab], 'concrete');
  const foundationCheck = add('foundation-check', ['Verificar fundações e passagens antes da betonagem', 'Check foundations and openings before the pour'], 'ground', 1, [foundations], 'review');
  const foundationPour = add('foundation-pour', ['Betonar fundações e base', 'Pour foundations and base'], 'ground', scaled(2, groundArea), [foundationCheck], 'concrete');
  const foundationHold = add('foundation-hold', ['Reserva para cura e verificações de resistência', 'Allowance for curing and strength checks'], 'ground', 7, [foundationPour], undefined, {
    notes: ['Confirmar duração e critérios no projeto de estrutura. A passagem à fase seguinte depende da libertação técnica.', 'Confirm duration and criteria with the structural design. Technical release governs the next phase.'],
  });
  let structuralRelease = add('foundation-release', ['Libertar fundações para a estrutura', 'Release foundations to support structure'], 'ground', 0, [foundationHold]);

  for (const [index, floor] of floors.entries()) {
    const prefix = `structure-${index + 1}`;
    const scope = { levelId: floor.level.id, zone: zoneName([floor], index, locale) };
    const build = add(`${prefix}-build`, structure.tags, 'structure', scaled(structure.days, floor.area),
      prefabrication ? [structuralRelease, prefabrication] : [structuralRelease], project.systemId === 'concrete' ? 'concrete' : 'structure', scope);
    let finish = build;
    if (project.systemId === 'concrete' || structure === structural.masonry) {
      const prepare = project.systemId === 'concrete' ? build : add(`${prefix}-deck`, ['Preparar laje ou cinta estrutural', 'Prepare slab or ring beam'],
        'structure', scaled(4, floor.area), [build], 'concrete', scope);
      const check = add(`${prefix}-pour-check`, ['Verificar armação e passagens', 'Check reinforcement and sleeves'], 'structure', 1, [prepare], 'review', scope);
      const pour = add(`${prefix}-pour`, ['Betonar estrutura do piso', 'Pour storey structure'], 'structure', scaled(2, floor.area), [check], 'concrete', scope);
      finish = add(`${prefix}-hold`, ['Reserva para cura e libertação estrutural', 'Allowance for curing and structural release'], 'structure', 7, [pour], undefined, {
        ...scope, notes: ['A libertação depende da verificação prevista no projeto de estrutura.', 'Release depends on the checks specified by the structural design.'],
      });
    } else if (index < floors.length - 1) {
      finish = add(`${prefix}-deck`, ['Montar e verificar a plataforma do piso seguinte', 'Install and check the next storey deck'],
        'structure', scaled(4, floor.area), [build], 'structure', scope);
    }
    structuralRelease = add(`${prefix}-release`, ['Libertar estrutura do piso', 'Release storey structure'], 'structure', 0, [finish], undefined, scope);
  }

  const top = floors.at(-1);
  const pitched = top.level.roof === 'gable' || top.level.roof === 'hipped';
  const measures = add('measure-openings', ['Verificar medidas dos vãos em obra', 'Verify frame openings on site'], 'envelope', 2, [ordering, structuralRelease], 'windows');
  const roof = add('roof-build', pitched ? ['Montar estrutura e camadas da cobertura inclinada', 'Install pitched roof structure and layers']
    : ['Executar suporte e camadas da cobertura', 'Build roof substrate and layers'], 'envelope', scaled(pitched ? 9 : 7, top.area), [measures], 'roof');
  const dryRoof = add('roof-release', ['Verificar estanquidade da cobertura', 'Check roof waterproofing'], 'envelope', 1, [roof], 'review');
  const openings = project.levels.reduce((sum, { items = [] }) => sum + items.filter(({ type }) => windowTypes.has(type)).length, 0);
  const manufacture = add('fabricate-openings', ['Fabricar e entregar caixilharias', 'Fabricate and deliver windows and doors'], 'supply',
    Math.min(120, 13 + Math.ceil(openings * .55)), [measures]);
  const glazing = add('fit-openings', ['Montar e selar caixilharias exteriores', 'Fit and seal exterior windows and doors'], 'envelope',
    scaled(4, area), [manufacture, dryRoof], 'windows');
  const enclosure = add('enclosure-release', ['Confirmar casa fechada e frentes segregadas', 'Confirm enclosure and segregated work areas'], 'envelope', 0, [glazing, dryRoof], undefined, {
    notes: ['A execução em paralelo depende de confirmar acessos separados e trabalhos compatíveis nas frentes libertadas.', 'Overlapping works depend on confirming separate access and compatible work in the areas released.'],
  });
  const facade = add('facade', ['Aplicar isolamento e acabamento da fachada', 'Install façade insulation and finish'], 'envelope', scaled(9, area), [enclosure], 'facade');
  const coordination = add('coordinate-services', ['Marcar percursos e coordenar prumadas e divisórias', 'Set out routes and coordinate risers and partitions'],
    'services', 2, [enclosure], 'design');
  const commonRoutes = floors.length > 1 && equipment ? add('shared-services-readiness', ['Preparar prumadas, passagens e acessos comuns', 'Prepare risers, penetrations and shared access'],
    'services', scaled(3, area), [coordination], 'management', {
      notes: ['Validar a libertação de cada frente para que equipas em pisos distintos possam trabalhar em segurança.', 'Confirm release of each area before crews work concurrently on separate storeys.'],
    }) : coordination;

  const handover = [];
  const zoneSize = Math.ceil(floors.length / 4);
  for (let index = 0; index < floors.length; index += zoneSize) {
    const entries = floors.slice(index, index + zoneSize);
    const zone = zoneName(entries, index, locale);
    const scope = { zone, ...(entries.length === 1 ? { levelId: entries[0].level.id } : {}) };
    const zoneArea = entries.reduce((sum, entry) => sum + entry.area, 0);
    const prefix = `fitout-${index + 1}`;
    const step = (id, name, phase, days, needs, crew, details) => add(`${prefix}-${id}`, name, phase, days, needs, crew, { ...scope, ...details });
    const partitions = step('partitions', ['Preparar divisórias e passagens técnicas', 'Prepare partitions and service openings'],
      'services', scaled(6, zoneArea), [commonRoutes], 'partitions');
    const ventilation = packages.vmc ? step('vmc', ['Instalar condutas e passagens da VMC', 'Install ventilation ducts and routes'],
      'services', scaled(4, zoneArea), [partitions], 'climate') : partitions;
    const plumbing = packages.plumbing ? step('plumbing', ['Instalar redes de água e esgotos', 'Install water and wastewater runs'],
      'services', scaled(5, zoneArea), [ventilation], 'plumbing') : ventilation;
    const climate = packages.airConditioning ? step('air-conditioning', ['Instalar linhas e drenagem de climatização', 'Install HVAC lines and condensate drainage'],
      'services', scaled(4, zoneArea), [plumbing], 'climate') : plumbing;
    const electrical = packages.electrical ? step('electrical', ['Instalar cablagem, caixas e circuitos', 'Install electrical runs, boxes and circuits'],
      'services', scaled(5, zoneArea), [climate], 'electrical') : climate;
    const tests = electrical === partitions ? partitions : step('rough-in-check', ['Verificar e ensaiar redes antes do fecho', 'Check and test concealed services before closing'],
      'services', 2, [electrical], 'review');
    const close = step('close', ['Fechar divisórias e tetos', 'Close partitions and ceilings'], 'finishes', scaled(5, zoneArea), [tests], 'partitions');
    let floorReady = close;
    if (packages.radiantFloor) {
      const loops = step('radiant-floor', ['Montar circuitos e coletor de piso radiante', 'Install radiant-floor loops and manifold'],
        'services', scaled(4, zoneArea), [close], 'climate');
      floorReady = step('radiant-check', ['Ensaiar o piso radiante antes de o cobrir', 'Test radiant-floor loops before covering'],
        'services', 1, [loops], 'review');
    }
    const screed = step('screed', ['Aplicar betonilha ou base do pavimento', 'Apply screed or floor substrate'], 'finishes', scaled(3, zoneArea), [floorReady], 'screed');
    const substrate = step('floor-release', ['Reserva até à aceitação da base do piso', 'Allowance for accepting the floor substrate'], 'finishes', 8, [screed], undefined, {
      notes: ['Confirmar estado da base e condições de aplicação dos revestimentos antes de prosseguir.', 'Check the substrate and floor finish requirements before proceeding.'],
    });
    const wetAreas = entries.some(({ level }) => level.rooms.some(({ type }) => type === 'bath'))
      ? step('wet-area', ['Impermeabilizar zonas húmidas', 'Waterproof wet areas'], 'finishes', scaled(3, zoneArea), [substrate], 'finishes') : substrate;
    const finish = step('surfaces', ['Aplicar revestimentos e pintar', 'Install finishes and paint'], 'finishes', scaled(10, zoneArea), [wetAreas], 'finishes');
    const joinery = step('joinery', ['Montar carpintaria e equipamento fixo', 'Fit joinery and built-in equipment'], 'finishes', scaled(4, zoneArea), [finish], 'joinery');
    let commissioning = joinery;
    if (equipment) commissioning = step('fit-off', ['Montar terminais e verificar funcionamento', 'Fit terminals and check operation'],
      'services', scaled(5, zoneArea), [joinery, equipment], 'review');
    handover.push(commissioning);
  }

  handover.push(facade);
  if (packages.externalWorks) handover.push(add('external-works', ['Executar ligações e arranjos exteriores', 'Complete connections and external works'],
    'envelope', scaled(6, groundArea), [facade], 'exterior'));
  const tests = add('final-inspection', ['Ensaios finais e verificações aplicáveis', 'Final tests and applicable checks'], 'handover', 3, handover, 'review');
  const close = add('snagging', ['Resolver pendências, limpar e reunir documentação', 'Resolve defects, clean and assemble documentation'], 'handover', 4, [tests], 'management');
  add('handover', ['Entregar a obra', 'Hand over the project'], 'handover', 0, [close]);

  return validateConstructionSchedule({ startDate, weekdays: [1, 2, 3, 4, 5], exclusions: [],
    crews: Object.entries(crews).filter(([id]) => crewIds.has(id)).map(([id, label]) => ({ id, label: local(label), capacity: 1 })), tasks,
  });
}
