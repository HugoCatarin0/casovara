import { formatMoney, formatNumber } from './core.js'

const copy = (pt, en) => ({ 'pt-PT': pt, 'en-PT': en, 'en-INT': en })
const field = (id, label, unit, initial, min, max, whole = false) => ({ id, label, unit, initial, min, max, whole })
const metric = (label, value, unit) => ({ label, value, unit })
const labels = {
  length: copy('Comprimento', 'Length'),
  width: copy('Largura', 'Width'),
  height: copy('Altura', 'Height'),
  waste: copy('Margem de desperdício', 'Waste allowance'),
  openings: copy('Área das aberturas', 'Opening area'),
  net: copy('Área líquida', 'Net area'),
  buy: copy('Quantidade a encomendar', 'Quantity to order'),
  packs: copy('Embalagens a encomendar', 'Packs to order'),
  layers: copy('Camadas', 'Layers'),
  packArea: copy('Área por embalagem', 'Coverage per pack'),
  limit: copy('A área a descontar não pode exceder a área bruta.', 'The deduction cannot exceed the gross area.'),
  coverage: copy('Área a cobrir com margem', 'Coverage including allowance'),
  estimatedPrice: copy('Custo indicativo de material', 'Indicative material cost'),
  none: copy('Nenhum resultado encontrado.', 'No results found.'),
}
const dimensions = [
  field('length', labels.length, 'm', 5, 0.1, 100),
  field('width', labels.width, 'm', 4, 0.1, 100)
]
const wallDimensions = [
  dimensions[0],
  field('height', labels.height, 'm', 2.6, 0.1, 30),
  field('openings', labels.openings, 'm²', 2, 0, 3000)
]
const waste = (initial = 10) => field('waste', labels.waste, '%', initial, 0, 100)
const price = (pt, en, initial = 0) => field('price', copy(pt, en), '€', initial, 0, 100000)
const pack = (initial) => field('pack', labels.packArea, 'm²', initial, 0.01, 100)
const layers = (initial) => field('layers', labels.layers, '', initial, 1, 12, true)
const area = ({ length, width }) => length * width
const margin = (value, rate) => value * (1 + rate / 100)
const roundUp = (value) => Math.ceil(value - 1e-9)
const priceMetric = (quantity, value) => value > 0 ? [metric(labels.estimatedPrice, value * quantity, 'EUR')] : []
const netWall = ({ length, height, openings }) => {
  const gross = length * height
  if (openings > gross) throw labels.limit
  return gross - openings
}

export const resources = [
  {
    slug: 'suspenso',
    group: copy('Acabamentos', 'Finishes'),
    title: copy('Teto falso', 'Suspended ceiling'),
    description: copy('Calcule placas, perfis e suspensões para um teto retangular.', 'Estimate boards, channels and hangers for a rectangular ceiling.'),
    guide: [
      copy('Meça as duas direções do teto. Indique a dimensão da placa e quantas camadas serão montadas. Para cada camada, considere toda a área do teto, incluindo os recortes.', 'Measure the ceiling in both directions. Enter the board dimensions and the number of layers. Count the whole ceiling area, including cuts, for each layer.'),
      copy('O comprimento dos perfis resulta do número de linhas e da sua extensão. Ajuste o espaçamento das linhas e dos pontos de suspensão ao sistema escolhido. Meça o perfil periférico pelo perímetro.', 'Channel length is based on the number and length of rows. Set row and hanger spacing for your chosen system. Measure the perimeter trim around all four sides.')
    ],
    formula: copy('Placas = área do teto × camadas × (1 + margem ÷ 100) ÷ área de uma placa, arredondado para cima.', 'Boards = ceiling area × layers × (1 + allowance ÷ 100) ÷ board area, rounded up.'),
    fields: [...dimensions, field('boardLength', copy('Comprimento da placa', 'Board length'), 'm', 2.5, 0.1, 10),
      field('boardWidth', copy('Largura da placa', 'Board width'), 'm', 1.2, 0.1, 5), layers(1),
      field('channel', copy('Distância entre perfis', 'Channel spacing'), 'm', 0.5, 0.1, 3),
      field('hanger', copy('Distância entre suspensões', 'Hanger spacing'), 'm', 0.9, 0.1, 5), waste(),
      price('Preço por placa', 'Price per board')],
    calculate(values) {
      const totalArea = area(values)
      const boardCount = roundUp(margin(totalArea * values.layers, values.waste) / (values.boardLength * values.boardWidth))
      const runs = Math.max(1, roundUp(values.width / values.channel))
      return [
        metric(labels.buy, boardCount, copy('placas', 'boards')),
        metric(labels.net, totalArea, 'm²'),
        metric(copy('Perfis interiores', 'Interior channels'), margin(values.length * runs, values.waste), 'm'),
        metric(copy('Perfil periférico', 'Perimeter trim'), margin(2 * (values.width + values.length), values.waste), 'm'),
        metric(copy('Suspensões', 'Hangers'), roundUp(runs * Math.max(1, roundUp(values.length / values.hanger)) * (1 + values.waste / 100)), 'un.'),
        ...priceMetric(boardCount, values.price)
      ]
    }
  },
  {
    slug: 'divisoria',
    group: copy('Acabamentos', 'Finishes'),
    title: copy('Divisória em gesso cartonado', 'Plasterboard partition'),
    description: copy('Estime placas para as duas faces e o comprimento aproximado dos perfis.', 'Estimate boards for both faces and approximate framing lengths.'),
    guide: [
      copy('Meça a extensão e a altura da divisória. Some as áreas dos vãos nas duas faces apenas uma vez no campo de aberturas, porque a calculadora já aplica o mesmo desconto a cada face.', 'Measure the length and height of the partition. Enter the combined opening area as measured on one face, as the calculator already applies the deduction to each face.'),
      copy('Inclua no desperdício os cortes e as juntas desencontradas. O número de montantes usa o espaçamento indicado, mais o montante de fecho. Some os reforços e as peças adicionais de cada vão a partir do desenho.', 'Allow for cutting waste and staggered joints. The stud count uses the spacing you enter and includes the closing stud. Add opening reinforcement and additional framing from your drawing.')
    ],
    formula: copy('Área de placa = (comprimento × altura − aberturas) × 2 × camadas por face.', 'Board area = (length × height − openings) × 2 × layers per face.'),
    fields: [...wallDimensions, field('boardArea', copy('Área de uma placa', 'Board area'), 'm²', 3, 0.01, 30),
      field('layers', copy('Camadas por face', 'Layers per face'), '', 1, 1, 12, true),
      field('spacing', copy('Distância entre montantes', 'Stud spacing'), 'm', 0.6, 0.1, 3), waste(),
      price('Preço por placa', 'Price per board')],
    calculate(values) {
      const net = netWall(values)
      const boardCount = roundUp(margin(net * 2 * values.layers, values.waste) / values.boardArea)
      const studs = roundUp(values.length / values.spacing) + 1
      return [
        metric(labels.buy, boardCount, copy('placas', 'boards')),
        metric(copy('Área de placa sem margem', 'Board area before allowance'), net * 2 * values.layers, 'm²'),
        metric(copy('Montantes antes dos reforços', 'Studs before reinforcement'), studs, 'un.'),
        metric(copy('Guias de pavimento e teto', 'Floor and ceiling tracks'), margin(values.length * 2, values.waste), 'm'),
        ...priceMetric(boardCount, values.price)
      ]
    }
  },
  {
    slug: 'isolar-sotao',
    group: copy('Envolvente', 'Building envelope'),
    title: copy('Isolamento de sótão', 'Attic insulation'),
    description: copy('Converta a área das águas da cobertura em rolos ou embalagens de isolamento.', 'Convert roof slope area into rolls or packs of insulation.'),
    guide: [
      copy('Para uma cobertura simples com inclinação uniforme, parta da projeção horizontal da área a isolar. A inclinação aumenta a superfície real das águas. Para isolar o piso do sótão, indique 0°.', 'For a simple roof with a uniform pitch, start from the horizontal footprint of the area you will insulate. The pitch increases the area of the slopes. Enter 0° for insulation on the attic floor.'),
      copy('Use a cobertura efetiva indicada na embalagem e conte as camadas previstas. Faça um cálculo por tipo de isolamento quando as camadas usam espessuras, formatos ou produtos diferentes.', 'Use the effective coverage stated on the pack and count the specified layers. Run a separate calculation for each type when the layers use different thicknesses, sizes or products.')
    ],
    formula: copy('Área inclinada = área projetada ÷ cos(inclinação). Embalagens = área inclinada × camadas × (1 + margem ÷ 100) ÷ cobertura.', 'Slope area = plan area ÷ cos(pitch). Packs = slope area × layers × (1 + allowance ÷ 100) ÷ coverage.'),
    fields: [...dimensions, field('pitch', copy('Inclinação', 'Pitch'), '°', 35, 0, 75), layers(2), pack(6), waste(8),
      price('Preço por embalagem', 'Price per pack')],
    calculate(values) {
      const slope = area(values) / Math.cos(values.pitch * Math.PI / 180)
      const total = margin(slope * values.layers, values.waste)
      const quantity = roundUp(total / values.pack)
      return [
        metric(labels.packs, quantity, copy('embalagens', 'packs')),
        metric(copy('Área inclinada', 'Slope area'), slope, 'm²'),
        metric(labels.coverage, total, 'm²'),
        ...priceMetric(quantity, values.price)
      ]
    }
  },
  {
    slug: 'pavimento',
    group: copy('Acabamentos', 'Finishes'),
    title: copy('Pavimento flutuante', 'Laminate flooring'),
    description: copy('Calcule o número de caixas considerando os cortes na instalação.', 'Calculate the number of packs allowing for installation cuts.'),
    guide: [
      copy('Meça o interior da divisão e use a superfície que vai efetivamente revestir. Para uma planta irregular, divida-a em retângulos, some as áreas e calcule as embalagens no fim.', 'Measure the interior of the room and use the floor you will actually cover. For an irregular plan, break it into rectangles, add their areas and calculate packs at the end.'),
      copy('Confirme quantos metros quadrados cobre uma caixa. A margem de desperdício depende do padrão de montagem, do número de recortes e de como pode aproveitar as sobras.', 'Check the coverage in square metres per pack. Allowance depends on the laying pattern, the number of cuts and how much offcut material you can reuse.')
    ],
    formula: copy('Caixas = comprimento × largura × (1 + margem ÷ 100) ÷ área por caixa, arredondado para cima.', 'Packs = length × width × (1 + allowance ÷ 100) ÷ coverage per pack, rounded up.'),
    fields: [...dimensions, pack(2.2), waste(7), price('Preço por caixa', 'Price per pack')],
    calculate(values) {
      const net = area(values)
      const total = margin(net, values.waste)
      const quantity = roundUp(total / values.pack)
      return [
        metric(labels.packs, quantity, copy('caixas', 'packs')),
        metric(labels.net, net, 'm²'), metric(labels.coverage, total, 'm²'),
        metric(copy('Área efetiva das caixas', 'Actual coverage purchased'), quantity * values.pack, 'm²'),
        ...priceMetric(quantity, values.price)
      ]
    }
  },
  {
    slug: 'revestimento',
    group: copy('Acabamentos', 'Finishes'),
    title: copy('Cerâmica, cola e betume', 'Tiles, adhesive and grout'),
    description: copy('Passe das medidas do revestimento às caixas de cerâmica e aos quilogramas de produto.', 'Convert surface dimensions into tiles by the pack and kilograms of adhesive and grout.'),
    guide: [
      copy('Use as duas dimensões da superfície a revestir, em paredes ou pavimentos. A calculadora usa a cobertura por caixa e arredonda o número para cima.', 'Enter the two dimensions of the surface to tile, on walls or floors. The calculator uses the coverage per pack and rounds the pack count up.'),
      copy('Consulte os rendimentos dos produtos. O consumo médio de cola depende da base, da talocha e do verso da peça. O consumo da junta varia com a largura, a profundidade e o formato da cerâmica.', 'Check the product coverage rates. Adhesive use depends on the substrate, the trowel and the back of the tile. Grout use varies with joint width, depth and tile size.')
    ],
    formula: copy('Caixas = área com margem ÷ cobertura por caixa. Cola e betume = área com margem × consumo por m².', 'Packs = area with allowance ÷ coverage. Adhesive and grout = area with allowance × stated consumption per m².'),
    fields: [...dimensions, pack(1.4),
      field('adhesive', copy('Consumo de cola', 'Adhesive consumption'), 'kg/m²', 4, 0, 25),
      field('grout', copy('Consumo de betume', 'Grout consumption'), 'kg/m²', 0.35, 0, 10), waste(),
      price('Preço por caixa', 'Price per pack')],
    calculate(values) {
      const total = margin(area(values), values.waste)
      const quantity = roundUp(total / values.pack)
      return [
        metric(labels.packs, quantity, copy('caixas', 'packs')),
        metric(labels.coverage, total, 'm²'),
        metric(copy('Cola', 'Adhesive'), total * values.adhesive, 'kg'),
        metric(copy('Betume para juntas', 'Joint grout'), total * values.grout, 'kg'),
        ...priceMetric(quantity, values.price)
      ]
    }
  },
  {
    slug: 'pintura',
    group: copy('Acabamentos', 'Finishes'),
    title: copy('Tinta', 'Paint'),
    description: copy('Estime tinta para as paredes e o teto de uma divisão.', 'Estimate paint for a room’s walls and ceiling.'),
    guide: [
      copy('Meça o comprimento, a largura e a altura da divisão. Desconte as portas e janelas. Desative o teto no cálculo ao preencher 0 no campo correspondente.', 'Measure the room’s length, width and height. Deduct door and window areas. Enter 0 in the ceiling field to leave the ceiling out.'),
      copy('O rendimento em m² por litro deve ser o de uma demão. Some o número de demãos e escolha a capacidade de lata disponível para calcular a quantidade a comprar.', 'Enter coverage in m² per litre for one coat. Include the number of coats and select the tin capacity available to calculate the quantity to buy.')
    ],
    formula: copy('Litros = (perímetro × altura − aberturas + teto) × demãos × (1 + margem ÷ 100) ÷ rendimento.', 'Litres = (perimeter × height − openings + ceiling) × coats × (1 + allowance ÷ 100) ÷ coverage.'),
    fields: [...dimensions, field('height', labels.height, 'm', 2.6, 0.1, 30),
      field('openings', labels.openings, 'm²', 4, 0, 3000),
      field('ceiling', copy('Incluir teto (1 = sim, 0 = não)', 'Include ceiling (1 = yes, 0 = no)'), '', 1, 0, 1, true),
      field('coats', copy('Demãos', 'Coats'), '', 2, 1, 12, true),
      field('coverage', copy('Rendimento por demão', 'Coverage per coat'), 'm²/L', 10, 0.1, 100),
      field('size', copy('Capacidade da lata', 'Tin capacity'), 'L', 10, 0.1, 100), waste(5),
      price('Preço por lata', 'Price per tin')],
    calculate(values) {
      const walls = netWall({ length: 2 * (values.width + values.length), height: values.height, openings: values.openings })
      const surface = walls + values.ceiling * area(values)
      const litres = margin(surface * values.coats / values.coverage, values.waste)
      const quantity = roundUp(litres / values.size)
      return [
        metric(copy('Tinta necessária', 'Paint needed'), litres, 'L'),
        metric(copy('Área a pintar por demão', 'Surface area per coat'), surface, 'm²'),
        metric(labels.buy, quantity, copy('latas', 'tins')),
        ...priceMetric(quantity, values.price)
      ]
    }
  },
  {
    slug: 'betao',
    group: copy('Estrutura', 'Structure'),
    title: copy('Betão de fundação', 'Foundation concrete'),
    description: copy('Determine o volume de um conjunto de elementos prismáticos com as mesmas dimensões.', 'Calculate volume for a group of rectangular elements with the same dimensions.'),
    guide: [
      copy('Introduza as dimensões em metros e a quantidade de elementos iguais. Use as dimensões do projeto. Em peças de geometrias diferentes, calcule o volume de cada grupo em separado.', 'Enter the dimensions in metres and the count of identical elements. Use the design dimensions. Calculate separate volumes for groups with different shapes.'),
      copy('Some os volumes e confirme o arredondamento e a unidade de fornecimento. Este cálculo quantifica materiais. O projeto indica a geometria, o betão e a armadura a utilizar.', 'Add the volumes and check the supplier’s order increments and units. This calculation takes off material quantities. The design specifies the geometry, concrete and reinforcement.')
    ],
    formula: copy('Volume = comprimento × largura × espessura × quantidade. Encomenda = volume × (1 + margem ÷ 100).', 'Volume = length × width × thickness × count. Order volume = volume × (1 + allowance ÷ 100).'),
    fields: [...dimensions, field('thickness', copy('Espessura', 'Thickness'), 'm', 0.2, 0.01, 10),
      field('count', copy('Elementos iguais', 'Identical elements'), '', 1, 1, 1000, true), waste(5),
      price('Preço por metro cúbico', 'Price per cubic metre')],
    calculate(values) {
      const volume = area(values) * values.thickness * values.count
      const ordered = margin(volume, values.waste)
      return [
        metric(labels.buy, ordered, 'm³'),
        metric(copy('Volume geométrico', 'Geometric volume'), volume, 'm³'),
        metric(copy('Volume por elemento', 'Volume per element'), area(values) * values.thickness, 'm³'),
        ...priceMetric(ordered, values.price)
      ]
    }
  },
  {
    slug: 'alvenaria',
    group: copy('Estrutura', 'Structure'),
    title: copy('Blocos e tijolos', 'Blocks and bricks'),
    description: copy('Estime quantas peças são necessárias para uma parede de alvenaria.', 'Estimate the number of units for a masonry wall.'),
    guide: [
      copy('Meça a extensão e a altura da parede e desconte os vãos. Meça a face da peça, isto é, as duas dimensões visíveis no plano da parede. A espessura da peça não entra na área da face.', 'Measure wall length and height and deduct openings. Measure the face of the unit, meaning the two dimensions visible in the plane of the wall. Unit thickness is outside this face-area calculation.'),
      copy('Se as dimensões da ficha já incluem a junta modular, use 0 no campo da junta. A margem depende do aparelho, das peças cortadas e das perdas de manuseamento.', 'If the product data already gives dimensions including the modular joint, enter 0 for the joint. Allowance depends on the bond, cut units and handling losses.')
    ],
    formula: copy('Peças = área líquida × (1 + margem ÷ 100) ÷ [(comprimento da peça + junta) × (altura da peça + junta)].', 'Units = net area × (1 + allowance ÷ 100) ÷ [(unit length + joint) × (unit height + joint)].'),
    fields: [...wallDimensions, field('blockLength', copy('Comprimento da peça', 'Unit length'), 'cm', 29, 1, 250),
      field('blockHeight', copy('Altura da peça', 'Unit height'), 'cm', 19, 1, 250),
      field('joint', copy('Espessura da junta', 'Joint thickness'), 'cm', 1, 0, 5), waste(7),
      price('Preço por peça', 'Price per unit')],
    calculate(values) {
      const net = netWall(values)
      const unitArea = (values.blockLength + values.joint) * (values.blockHeight + values.joint) / 10000
      const quantity = roundUp(margin(net, values.waste) / unitArea)
      return [
        metric(labels.buy, quantity, copy('peças', 'units')),
        metric(labels.net, net, 'm²'),
        metric(copy('Peças por metro quadrado', 'Units per square metre'), 1 / unitArea, 'un./m²'),
        ...priceMetric(quantity, values.price)
      ]
    }
  },
  {
    slug: 'fachada',
    group: copy('Envolvente', 'Building envelope'),
    title: copy('Isolamento de fachada', 'Facade insulation'),
    description: copy('Calcule placas de isolamento e área de rede para uma fachada.', 'Estimate insulation boards and reinforcement mesh for a facade.'),
    guide: [
      copy('Comece pela área bruta do alçado. Some as aberturas que não levam isolamento e desconte-as. Os retornos em ombreiras e vergas podem ser medidos à parte e adicionados à encomenda.', 'Start with the gross elevation area. Add together the openings that will not receive insulation and deduct them. Measure window and door reveals separately and add them to the order.'),
      copy('Use a área de uma placa e uma margem para cortes. Para a rede, indique uma margem que cubra sobreposições e reforços locais previstos para o sistema.', 'Use the area of one board and an allowance for cuts. For mesh, use an allowance that covers overlaps and the local reinforcement specified for the system.')
    ],
    formula: copy('Placas = área líquida × (1 + margem ÷ 100) ÷ área por placa, arredondado para cima.', 'Boards = net area × (1 + allowance ÷ 100) ÷ coverage per board, rounded up.'),
    fields: [...wallDimensions, field('board', copy('Área por placa', 'Coverage per board'), 'm²', 0.5, 0.01, 30),
      field('mesh', copy('Sobreposições e reforços da rede', 'Mesh overlaps and reinforcement'), '%', 12, 0, 100),
      waste(), price('Preço por placa', 'Price per board')],
    calculate(values) {
      const net = netWall(values)
      const coverage = margin(net, values.waste)
      const quantity = roundUp(coverage / values.board)
      return [
        metric(labels.buy, quantity, copy('placas', 'boards')),
        metric(labels.net, net, 'm²'),
        metric(labels.coverage, coverage, 'm²'),
        metric(copy('Rede de reforço', 'Reinforcement mesh'), margin(net, values.mesh), 'm²'),
        ...priceMetric(quantity, values.price)
      ]
    }
  },
  {
    slug: 'cobertura',
    group: copy('Envolvente', 'Building envelope'),
    title: copy('Área de cobertura', 'Roof area'),
    description: copy('Converta a projeção horizontal em área inclinada, incluindo beirais.', 'Convert the horizontal footprint into a sloped area including overhangs.'),
    guide: [
      copy('Meça a projeção horizontal da cobertura. Se mediu apenas o edifício, indique um beiral uniforme e a calculadora acrescenta-o aos quatro lados. Se já mediu toda a projeção, preencha 0.', 'Measure the horizontal footprint of the roof. If you measured the building only, enter an even overhang and it will be added to all four sides. If your dimensions already include it, enter 0.'),
      copy('A fórmula aplica-se a coberturas com a mesma inclinação em todas as águas, incluindo coberturas de duas ou quatro águas. Separe a área em parcelas quando as inclinações forem diferentes.', 'The formula applies to roofs with the same pitch on all faces, including gable and hip roofs. Calculate sections separately when pitches vary.')
    ],
    formula: copy('Área inclinada = (comprimento + 2 × beiral) × (largura + 2 × beiral) ÷ cos(inclinação).', 'Slope area = (length + 2 × overhang) × (width + 2 × overhang) ÷ cos(pitch).'),
    fields: [...dimensions, field('pitch', copy('Inclinação', 'Pitch'), '°', 32, 0, 75),
      field('overhang', copy('Beiral uniforme', 'Even overhang'), 'm', 0.35, 0, 5),
      waste(8), price('Preço por metro quadrado', 'Price per square metre')],
    calculate(values) {
      const flat = (values.length + 2 * values.overhang) * (values.width + 2 * values.overhang)
      const slopes = flat / Math.cos(values.pitch * Math.PI / 180)
      const total = margin(slopes, values.waste)
      return [
        metric(copy('Área inclinada', 'Slope area'), slopes, 'm²'),
        metric(copy('Projeção com beirais', 'Footprint including overhangs'), flat, 'm²'),
        metric(labels.coverage, total, 'm²'),
        ...priceMetric(total, values.price)
      ]
    }
  },
  {
    slug: 'area-util',
    group: copy('Planeamento', 'Planning'),
    title: copy('Área útil', 'Usable floor area'),
    description: copy('Some compartimentos e compare a área medida com a área que pretende considerar.', 'Add room areas and compare the measured area with the portion you want to count.'),
    guide: [
      copy('Meça pelo interior de cada compartimento e registe as áreas em metros quadrados. Agrupe espaços com o mesmo peso. Deixe um grupo a zero quando não for necessário.', 'Measure inside each room and note its area in square metres. Group spaces with the same weighting. Leave a group at zero when it does not apply.'),
      copy('Escolha percentagens adequadas ao objetivo de estudo e introduza áreas de zonas distintas para evitar dupla contagem. Consulte o técnico responsável para obter as áreas a usar num licenciamento ou contrato.', 'Choose percentages suitable for your study and enter distinct parts of the floor to prevent double counting. Ask the responsible professional which areas to use on a permit or contract.')
    ],
    formula: copy('Área considerada = soma de cada grupo × a sua percentagem, dividida por 100.', 'Counted area = sum of each group multiplied by its percentage divided by 100.'),
    fields: [
      field('general', copy('Área de compartimentos principais', 'Main rooms'), 'm²', 85, 0, 10000),
      field('generalFactor', copy('Peso dos compartimentos principais', 'Main room weighting'), '%', 100, 0, 100),
      field('low', copy('Área de zonas de altura reduzida', 'Reduced-height areas'), 'm²', 16, 0, 10000),
      field('lowFactor', copy('Peso da área de altura reduzida', 'Reduced-height weighting'), '%', 50, 0, 100),
      field('other', copy('Área de zonas complementares', 'Ancillary areas'), 'm²', 10, 0, 10000),
      field('otherFactor', copy('Peso das zonas complementares', 'Ancillary area weighting'), '%', 0, 0, 100)
    ],
    calculate(values) {
      const measured = values.general + values.low + values.other
      const weighted = (values.general * values.generalFactor + values.low * values.lowFactor + values.other * values.otherFactor) / 100
      return [
        metric(copy('Área considerada', 'Counted area'), weighted, 'm²'),
        metric(copy('Área medida', 'Measured area'), measured, 'm²'),
        metric(copy('Área descontada', 'Excluded area'), measured - weighted, 'm²')
      ]
    }
  }
]

const ui = {
  calculators: copy('Calculadoras de construção', 'Construction calculators'),
  calculatorsIntro: copy('Estime quantidades ou áreas a partir das suas medidas, com unidades e preços em euros.', 'Estimate quantities or areas from your own measurements, with metric units and prices in euros.'),
  guides: copy('Guias de construção', 'Construction guides'),
  guidesIntro: copy('Consulte as fórmulas e veja o que precisa de medir antes de calcular os materiais.', 'Find the formulas and see what to measure before estimating your materials.'),
  search: copy('Pesquisar por nome ou tema', 'Search by name or topic'),
  list: copy('Voltar à lista', 'Back to the list'),
  guidesLink: copy('Ler o guia', 'Read the guide'),
  calculatorLink: copy('Abrir a calculadora', 'Open the calculator'),
  calculation: copy('Medidas e consumos', 'Dimensions and consumption'),
  result: copy('Estimativa', 'Estimate'),
  update: copy('Calcular', 'Calculate'),
  reset: copy('Repor exemplo', 'Reset example'),
  assumptions: copy('Como é calculado', 'How it is calculated'),
  invalid: copy('Introduza um número no intervalo indicado.', 'Enter a number in the indicated range.'),
  example: copy('Os valores iniciais são um exemplo editável. Use as medidas, rendimentos e preços do seu projeto.', 'The starting values are an editable example. Enter the dimensions, coverage and prices for your own project.'),
  guideNote: copy('Experimente estas medidas na calculadora e ajuste os valores ao seu projeto.', 'Try these measurements in the calculator and adjust the values for your project.'),
}

const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const local = (value, locale) => typeof value === 'string' ? value : value[locale] ?? value['en-INT']
const slugRoute = (mode, slug = '') => {
  const explicitLocale = location.pathname.match(/^\/(pt(?:-pt)?|en(?:-pt|-int)?)(?=\/|$)/i)?.[0] ?? ''
  const route = mode === 'guides' ? 'guias' : 'calculadoras'
  return explicitLocale + '/' + route + (slug ? '/' + slug : '')
}

function directory(root, locale, view) {
  const other = view === 'guides' ? 'calculators' : 'guides'
  const phrase = (value) => escapeHtml(local(value, locale))
  root.innerHTML = `
    <section class="resource-page" aria-labelledby="resource-title">
      <header class="resource-hero">
        <div>
          <h1 id="resource-title">${phrase(ui[view])}</h1>
          <p>${phrase(ui[view + 'Intro'])}</p>
        </div>
        <a class="resource-crosslink" href="${slugRoute(other)}">${phrase(ui[other])} <span aria-hidden="true">↗</span></a>
      </header>
      <label class="resource-search">
        <span>${phrase(ui.search)}</span>
        <input type="search" autocomplete="off" name="search">
      </label>
      <div class="resource-grid">
        ${resources.map((resource) => `<a class="resource-card" href="${slugRoute(view, resource.slug)}" data-resource="${resource.slug}">
          <span class="resource-card-group">${phrase(resource.group)}</span>
          <h2>${phrase(resource.title)}</h2>
          <p>${phrase(resource.description)}</p>
          <span class="resource-card-arrow" aria-hidden="true">↗</span>
        </a>`).join('')}
      </div>
      <p class="resource-empty" role="status" hidden>${phrase(labels.none)}</p>
    </section>`
  const normalize = (value) => value.toLocaleLowerCase(locale === 'pt-PT' ? 'pt-PT' : 'en').normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const query = root.querySelector('input[type="search"]')
  query.addEventListener('input', () => {
    const words = normalize(query.value.trim()).split(/\s+/)
    let found = 0
    for (const card of root.querySelectorAll('[data-resource]')) {
      const title = normalize(card.textContent)
      card.hidden = !words.every((word) => title.includes(word))
      if (!card.hidden) found++
    }
    root.querySelector('.resource-empty').hidden = found > 0
  })
}

function guide(root, locale, resource) {
  const phrase = (value) => escapeHtml(local(value, locale))
  root.innerHTML = `
    <section class="resource-page resource-guide" aria-labelledby="resource-title">
      <a class="resource-back" href="${slugRoute('guides')}"><span aria-hidden="true">←</span> ${phrase(ui.list)}</a>
      <header class="resource-hero">
        <div>
          <p class="resource-card-group">${phrase(resource.group)}</p>
          <h1 id="resource-title">${phrase(resource.title)}</h1>
          <p>${phrase(resource.description)}</p>
        </div>
      </header>
      <article class="resource-guide-story">
        ${resource.guide.map((paragraph) => `<p>${phrase(paragraph)}</p>`).join('')}
        <aside class="resource-formula">
          <h2>${phrase(ui.assumptions)}</h2>
          <p>${phrase(resource.formula)}</p>
        </aside>
        <p>${phrase(ui.guideNote)}</p>
        <a class="resource-button" href="${slugRoute('calculators', resource.slug)}">${phrase(ui.calculatorLink)} <span aria-hidden="true">↗</span></a>
      </article>
    </section>`
}

function calculator(root, locale, resource) {
  const phrase = (value) => escapeHtml(local(value, locale))
  const number = (value) => formatNumber(value, locale)
  const inputNumber = (value) => String(value).replace('.', locale === 'en-INT' ? '.' : ',')
  const unitText = (unit) => unit === 'un.' ? local(copy('un.', 'units'), locale) :
    unit === 'un./m²' ? local(copy('un./m²', 'units/m²'), locale) : local(unit, locale)
  root.innerHTML = `
    <section class="resource-page resource-detail" aria-labelledby="resource-title">
      <a class="resource-back" href="${slugRoute('calculators')}"><span aria-hidden="true">←</span> ${phrase(ui.list)}</a>
      <header class="resource-hero">
        <div>
          <p class="resource-card-group">${phrase(resource.group)}</p>
          <h1 id="resource-title">${phrase(resource.title)}</h1>
          <p>${phrase(resource.description)}</p>
        </div>
        <a class="resource-crosslink" href="${slugRoute('guides', resource.slug)}">${phrase(ui.guidesLink)} <span aria-hidden="true">↗</span></a>
      </header>
      <div class="resource-calculator">
        <form class="resource-fields">
          <h2>${phrase(ui.calculation)}</h2>
          <p>${phrase(ui.example)}</p>
          <div class="resource-input-grid">${resource.fields.map((model) => `
            <label>
              <span id="label-${model.id}">${phrase(model.label)}</span>
              <span class="resource-input-wrap">
                <input name="${model.id}" inputmode="${model.whole ? 'numeric' : 'decimal'}" type="text" autocomplete="off"
                  value="${inputNumber(model.initial)}" aria-labelledby="label-${model.id}" aria-describedby="range-${model.id}" required>
                ${model.unit ? `<span aria-hidden="true">${escapeHtml(unitText(model.unit))}</span>` : ''}
              </span>
              <span class="resource-range" id="range-${model.id}">${escapeHtml(number(model.min))}–${escapeHtml(number(model.max))}${model.unit ? ' ' + escapeHtml(unitText(model.unit)) : ''}</span>
            </label>`).join('')}
          </div>
          <div class="resource-actions">
            <button class="resource-button" type="submit">${phrase(ui.update)}</button>
            <button class="resource-reset" type="reset">${phrase(ui.reset)}</button>
          </div>
        </form>
        <section class="resource-result">
          <h2>${phrase(ui.result)}</h2>
          <div class="resource-result-content" aria-live="polite" aria-atomic="true"></div>
          <div class="resource-formula">
            <h3>${phrase(ui.assumptions)}</h3>
            <p>${phrase(resource.formula)}</p>
          </div>
        </section>
      </div>
    </section>`

  const form = root.querySelector('form')
  const output = root.querySelector('.resource-result-content')
  const readValues = () => Object.fromEntries(resource.fields.map((model) => {
    const input = form.elements.namedItem(model.id)
    const value = input.value.trim().replace(',', '.')
    const parsed = /^(?:\d+\.?\d*|\.\d+)$/.test(value) ? Number(value) : Number.NaN
    const valid = Number.isFinite(parsed) && parsed >= model.min && parsed <= model.max && (!model.whole || Number.isInteger(parsed))
    input.setCustomValidity(valid ? '' : local(ui.invalid, locale))
    if (!valid) input.setAttribute('aria-invalid', 'true')
    else input.removeAttribute('aria-invalid')
    return [model.id, valid ? parsed : null]
  }))
  const recalculate = () => {
    const values = readValues()
    if (Object.values(values).includes(null)) {
      output.innerHTML = `<p class="resource-error">${phrase(ui.invalid)}</p>`
      return
    }
    try {
      const renderValue = ({ value, unit }) => unit === 'EUR'
        ? escapeHtml(formatMoney(value, locale, 2))
        : `${escapeHtml(number(value))}${unit ? ` <span>${escapeHtml(unitText(unit))}</span>` : ''}`
      const [primary, ...details] = resource.calculate(values)
      output.innerHTML = `
        <div class="resource-result-primary"><span>${phrase(primary.label)}</span><strong>${renderValue(primary)}</strong></div>
        <dl>${details.map((item) => `<div><dt>${phrase(item.label)}</dt><dd>${renderValue(item)}</dd></div>`).join('')}</dl>`
    } catch (error) {
      if (error !== labels.limit) throw error
      output.innerHTML = `<p class="resource-error">${phrase(error)}</p>`
    }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    recalculate()
  })
  form.addEventListener('input', recalculate)
  form.addEventListener('reset', (event) => {
    event.preventDefault()
    for (const model of resource.fields) {
      form.elements.namedItem(model.id).value = inputNumber(model.initial)
    }
    recalculate()
  })
  recalculate()
}

export function renderResources(root, { locale, view, slug }) {
  const resource = resources.find((item) => item.slug === slug)
  if (!resource) directory(root, locale, view)
  else if (view === 'guides') guide(root, locale, resource)
  else calculator(root, locale, resource)
}
