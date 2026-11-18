import { extendedObjectGroups } from './object-catalog-extended.js';

const baseGroups = [
  ['openings', 'Vãos', 'Openings', [
    ['door', 'Porta', 'Door', .90, .12, 2.10, '#a76c4b'],
    ['doubleDoor', 'Porta dupla', 'Double door', 1.60, .12, 2.10, '#a76c4b'],
    ['window', 'Janela', 'Window', 1.20, .14, 1.20, '#508d89'],
    ['slidingWindow', 'Janela de correr', 'Sliding window', 2.20, .14, 2.05, '#508d89'],
  ]],
  ['living', 'Sala de estar', 'Living room', [
    ['sofa', 'Sofá de três lugares', 'Three-seat sofa', 2.30, .89, .78, '#879879'],
    ['loveseat', 'Sofá de dois lugares', 'Two-seat sofa', 1.65, .89, .80, '#8295a7', 'sofa'],
    ['sectionalLeft', 'Sofá de canto esquerdo', 'Left corner sofa', 2.82, 1.92, .82, '#8c9ca7', 'sectionalLeft'],
    ['sectionalRight', 'Sofá de canto direito', 'Right corner sofa', 2.82, 1.92, .82, '#8c9ca7', 'sectionalRight'],
    ['sofaBed', 'Sofá-cama', 'Sofa bed', 2.18, 1.02, .85, '#8a8b93', 'sofa'],
    ['daybed', 'Divã', 'Daybed', 1.95, .83, .64, '#ad9d84', 'chaise'],
    ['armchair', 'Poltrona', 'Armchair', .88, .88, .92, '#b49079', 'chair'],
    ['recliner', 'Poltrona reclinável', 'Reclining armchair', .92, 1.44, 1.02, '#7d8182', 'recliner'],
    ['rockingChair', 'Cadeira de baloiço', 'Rocking chair', .65, .90, .96, '#a88664', 'chair'],
    ['ottoman', 'Pufe', 'Ottoman', .62, .62, .43, '#a299a7', 'ottoman'],
    ['coffeeTable', 'Mesa de centro', 'Coffee table', 1.10, .60, .42, '#aa8967', 'table'],
    ['ovalCoffeeTable', 'Mesa de centro oval', 'Oval coffee table', 1.18, .58, .42, '#a58665', 'roundTable'],
    ['sideTable', 'Mesa de apoio', 'Side table', .49, .49, .53, '#af9776', 'roundTable'],
    ['consoleTable', 'Consola', 'Console table', 1.20, .38, .83, '#a68e72', 'table'],
    ['tvStand', 'Móvel de televisão', 'TV unit', 1.65, .43, .53, '#a08463', 'kitchenCabinet'],
    ['television', 'Televisão', 'Television', 1.18, .26, .73, '#46515a', 'screen'],
  ]],
  ['dining', 'Sala de jantar', 'Dining room', [
    ['table', 'Mesa de jantar', 'Dining table', 1.55, .88, .76, '#a98a64'],
    ['roundTable', 'Mesa de jantar redonda', 'Round dining table', 1.12, 1.12, .75, '#ac8971', 'roundTable'],
    ['extendableTable', 'Mesa extensível', 'Extendable table', 1.90, .90, .76, '#a18464', 'extendTable'],
    ['highTable', 'Mesa alta', 'High table', 1.35, .55, 1.05, '#947d62', 'table'],
    ['diningChair', 'Cadeira de jantar', 'Dining chair', .46, .52, .86, '#ad947b', 'chair'],
    ['diningBench', 'Banco de jantar', 'Dining bench', 1.38, .42, .47, '#af916e', 'bench'],
    ['barStool', 'Banco alto', 'Bar stool', .44, .47, .99, '#bd966d', 'stool'],
    ['highChair', 'Cadeira de refeição infantil', 'High chair', .58, .62, .94, '#cab9a4', 'highChair'],
    ['servingTrolley', 'Carrinho de serviço', 'Serving trolley', .60, .41, .82, '#958d81', 'trolley'],
  ]],
  ['bedroom', 'Quarto', 'Bedroom', [
    ['bed', 'Cama de casal', 'Double bed', 1.65, 2.00, .53, '#b88979'],
    ['singleBed', 'Cama individual', 'Single bed', .95, 2.00, .53, '#b88979'],
    ['queenBed', 'Cama queen size', 'Queen-size bed', 1.70, 2.10, .59, '#a99a9a', 'bed'],
    ['kingBed', 'Cama king size', 'King-size bed', 1.95, 2.15, .61, '#a89ca5', 'bed'],
    ['bunkBed', 'Beliche', 'Bunk bed', 1.05, 2.07, 1.65, '#ab9273', 'bunk'],
    ['loftBed', 'Cama alta', 'Loft bed', 1.11, 2.10, 1.92, '#a59886', 'bunk'],
    ['crib', 'Berço', 'Cot', .68, 1.26, .97, '#c9ae8b', 'crib'],
    ['toddlerBed', 'Cama de criança', 'Toddler bed', .82, 1.67, .45, '#b49b9d', 'bed'],
    ['bedsideTable', 'Mesa de cabeceira', 'Bedside table', .45, .40, .54, '#af9477', 'dresser'],
    ['dressingTable', 'Toucador', 'Dressing table', .95, .48, .82, '#b2917b', 'desk'],
    ['changingTable', 'Muda-fraldas', 'Changing table', .77, .69, .92, '#c1a48a', 'dresser'],
    ['dressingScreen', 'Biombo', 'Room divider', 1.55, .29, 1.68, '#bca782', 'divider'],
  ]],
  ['storage', 'Arrumação', 'Storage', [
    ['cupboard', 'Armário', 'Cupboard', 1.50, .56, 1.82, '#9b7a58'],
    ['wardrobe', 'Roupeiro de abrir', 'Hinged wardrobe', 1.80, .61, 2.14, '#aa8e73', 'wardrobe'],
    ['slidingWardrobe', 'Roupeiro de correr', 'Sliding-door wardrobe', 1.95, .66, 2.10, '#9c917f', 'wardrobe'],
    ['dresser', 'Cómoda', 'Chest of drawers', 1.10, .49, .93, '#b19a7d', 'dresser'],
    ['tallDresser', 'Camiseiro', 'Tall chest of drawers', .62, .46, 1.24, '#b49b7b', 'dresser'],
    ['shoeCabinet', 'Sapateira', 'Shoe cabinet', .83, .26, 1.08, '#ad9e86', 'dresser'],
    ['bookcase', 'Estante', 'Bookcase', .94, .34, 1.92, '#a59377', 'shelf'],
    ['cubeStorage', 'Estante de cubos', 'Cube shelving', 1.47, .39, 1.47, '#aa987a', 'cubes'],
    ['shelf', 'Prateleira de parede', 'Wall shelf', .92, .29, .18, '#b8a383', 'wallShelf'],
    ['displayCabinet', 'Vitrine', 'Display cabinet', .83, .41, 1.82, '#9caeb2', 'displayCabinet'],
    ['sideboard', 'Aparador', 'Sideboard', 1.65, .44, .83, '#aa896c', 'kitchenCabinet'],
    ['blanketChest', 'Arca', 'Storage chest', .92, .46, .50, '#a38466', 'bench'],
    ['coatStand', 'Cabide de pé', 'Coat stand', .49, .49, 1.72, '#a18d79', 'stand'],
    ['clothesRail', 'Charriot', 'Clothes rack', .99, .49, 1.61, '#89919a', 'garmentRack'],
  ]],
  ['office', 'Escritório', 'Home office', [
    ['desk', 'Secretária', 'Desk', 1.30, .64, .75, '#baa183', 'desk'],
    ['angularDesk', 'Secretária de canto', 'Corner desk', 1.60, 1.25, .75, '#b29778', 'cornerDesk'],
    ['standingDesk', 'Secretária elevatória', 'Sit/stand desk', 1.40, .70, 1.04, '#998e81', 'desk'],
    ['officeChair', 'Cadeira de escritório', 'Office chair', .69, .71, 1.12, '#647b8e', 'officeChair'],
    ['drawerUnit', 'Bloco de gavetas', 'Pedestal drawers', .44, .55, .68, '#9c9f9e', 'dresser'],
    ['meetingTable', 'Mesa de reuniões', 'Meeting table', 2.10, 1.05, .75, '#9f836b', 'roundTable'],
    ['monitor', 'Monitor', 'Monitor', .61, .23, .45, '#50616c', 'screen'],
    ['laptop', 'Computador portátil', 'Laptop', .36, .28, .24, '#78858c', 'laptop'],
    ['printer', 'Impressora', 'Printer', .42, .36, .22, '#9ca7ac', 'appliance'],
    ['whiteboard', 'Quadro branco', 'Whiteboard', 1.18, .36, 1.57, '#c8ceca', 'divider'],
  ]],
  ['kitchen', 'Cozinha e lavandaria', 'Kitchen and laundry', [
    ['kitchen', 'Bancada de cozinha', 'Kitchen unit', 2.35, .64, .90, '#a78c6f'],
    ['kitchenIsland', 'Ilha de cozinha', 'Kitchen island', 1.77, .88, .93, '#a39481', 'kitchenCabinet'],
    ['baseCabinet', 'Armário baixo de cozinha', 'Kitchen base cabinet', .60, .60, .88, '#bca790', 'kitchenCabinet'],
    ['tallCabinet', 'Coluna de cozinha', 'Tall kitchen cabinet', .60, .63, 2.16, '#afa591', 'wardrobe'],
    ['wallCabinet', 'Armário de parede', 'Kitchen wall cabinet', .80, .35, .69, '#bcb19c', 'wallCabinet'],
    ['fridge', 'Frigorífico combinado', 'Fridge freezer', .61, .69, 1.86, '#afb9bd', 'fridge'],
    ['americanFridge', 'Frigorífico de duas portas', 'Side-by-side refrigerator', .91, .74, 1.82, '#9fa9af', 'fridge'],
    ['dishwasher', 'Máquina de lavar loiça', 'Dishwasher', .60, .61, .85, '#a7afb1', 'appliance'],
    ['washingMachine', 'Máquina de lavar roupa', 'Washing machine', .60, .60, .85, '#b8bfc0', 'washer'],
    ['dryer', 'Máquina de secar roupa', 'Tumble dryer', .60, .63, .85, '#c3c9c9', 'washer'],
    ['oven', 'Forno', 'Oven', .60, .56, .60, '#839299', 'oven'],
    ['cooktop', 'Placa de cozinha', 'Cooktop', .60, .52, .08, '#667583', 'cooktop'],
    ['rangeCooker', 'Fogão com forno', 'Range cooker', .62, .62, .88, '#919ea5', 'cooker'],
    ['extractor', 'Exaustor', 'Extractor hood', .88, .50, .42, '#9ca9ab', 'hood'],
    ['microwave', 'Micro-ondas', 'Microwave', .48, .40, .30, '#8a9ba3', 'oven'],
    ['sink', 'Lava-loiça', 'Kitchen sink', .78, .54, .31, '#b1c5ca', 'sink'],
    ['laundryBasket', 'Cesto da roupa', 'Laundry hamper', .48, .48, .64, '#ae9b7a', 'basket'],
  ]],
  ['bathroom', 'Casa de banho', 'Bathroom', [
    ['bath', 'Banheira', 'Bathtub', 1.65, .75, .58, '#91aaa6'],
    ['freestandingBath', 'Banheira independente', 'Freestanding bathtub', 1.69, .79, .62, '#d6e2dd', 'ovalBath'],
    ['shower', 'Base de duche', 'Shower tray', .90, .90, .15, '#91aaa6'],
    ['walkInShower', 'Duche aberto', 'Walk-in shower', 1.24, .88, 1.91, '#a7c5cd', 'walkInShower'],
    ['toilet', 'Sanita', 'Toilet', .39, .68, .46, '#91aaa6'],
    ['bidet', 'Bidé', 'Bidet', .40, .57, .43, '#cbdedc', 'basin'],
    ['basin', 'Lavatório', 'Washbasin', .59, .47, .79, '#c3d8d6', 'basin'],
    ['vanity', 'Móvel de lavatório', 'Washbasin cabinet', .81, .49, .86, '#9eafa6', 'vanity'],
    ['doubleVanity', 'Móvel de lavatório duplo', 'Double washbasin cabinet', 1.39, .53, .86, '#aaaea1', 'vanity'],
    ['towelRail', 'Toalheiro', 'Towel rail', .54, .15, .82, '#929fa6', 'towelRail'],
    ['bathroomCabinet', 'Armário de casa de banho', 'Bathroom cabinet', .44, .34, 1.65, '#bec3b5', 'wardrobe'],
  ]],
  ['outdoor', 'Jardim e terraço', 'Garden and terrace', [
    ['tree', 'Árvore', 'Tree', 1.40, 1.40, 2.10, '#78906c'],
    ['shrub', 'Arbusto', 'Shrub', 1.00, .86, .76, '#78986e', 'shrub'],
    ['hedge', 'Sebe', 'Hedge', 2.20, .66, 1.22, '#658566', 'shrub'],
    ['planter', 'Floreira', 'Planter', .86, .35, .48, '#9d8d78', 'planter'],
    ['outdoorSofa', 'Sofá de exterior', 'Outdoor sofa', 1.82, .76, .74, '#8f9c83', 'sofa'],
    ['outdoorChair', 'Cadeira de jardim', 'Garden chair', .59, .67, .86, '#93a085', 'chair'],
    ['outdoorTable', 'Mesa de jardim', 'Outdoor table', 1.64, .84, .74, '#a49077', 'slatTable'],
    ['outdoorBench', 'Banco de jardim', 'Garden bench', 1.48, .54, .82, '#a28b72', 'chair'],
    ['lounger', 'Espreguiçadeira', 'Sun lounger', .66, 1.94, .60, '#aea489', 'lounger'],
    ['parasol', 'Guarda-sol', 'Parasol', 2.45, 2.45, 2.34, '#c0a483', 'parasol'],
    ['barbecue', 'Churrasqueira', 'Barbecue', 1.12, .60, 1.08, '#7f887f', 'bbq'],
    ['raisedBed', 'Horta elevada', 'Raised garden bed', 1.20, .86, .50, '#ad9376', 'planter'],
    ['pool', 'Piscina', 'Swimming pool', 6.00, 3.00, .18, '#76aebd', 'pool'],
    ['pergola', 'Pérgola', 'Pergola', 3.12, 3.10, 2.42, '#af967c', 'pergola'],
    ['bicycle', 'Bicicleta', 'Bicycle', .58, 1.76, 1.05, '#7b8584', 'bicycle'],
    ['car', 'Automóvel', 'Car', 1.84, 4.38, 1.48, '#8294a2', 'car'],
  ]],
  ['decor', 'Iluminação e decoração', 'Lighting and decoration', [
    ['rug', 'Tapete retangular', 'Rectangular rug', 1.70, 2.40, .018, '#ae9d89', 'rug'],
    ['roundRug', 'Tapete redondo', 'Round rug', 1.55, 1.55, .018, '#ad9f92', 'roundRug'],
    ['floorLamp', 'Candeeiro de pé', 'Floor lamp', .43, .43, 1.59, '#c6ad87', 'lamp'],
    ['tableLamp', 'Candeeiro de mesa', 'Table lamp', .32, .32, .54, '#b99d86', 'lamp'],
    ['pendant', 'Candeeiro suspenso', 'Pendant light', .47, .47, .54, '#c7ab85', 'pendant'],
    ['plant', 'Planta em vaso', 'Potted plant', .40, .40, .62, '#859954', 'plant'],
    ['largePlant', 'Planta de interior alta', 'Tall indoor plant', .61, .61, 1.38, '#6a8d53', 'plant'],
    ['mirror', 'Espelho de parede', 'Wall mirror', .76, .09, 1.02, '#a8c0cc', 'mirror'],
    ['curtain', 'Cortina', 'Curtain', 1.85, .18, 2.30, '#c7b7a7', 'divider'],
    ['painting', 'Quadro de parede', 'Wall picture', .70, .08, .55, '#ac9886', 'painting'],
    ['radiator', 'Radiador', 'Radiator', .92, .16, .62, '#b8c0bf', 'towelRail'],
    ['acUnit', 'Ar condicionado mural', 'Wall-mounted air conditioner', .90, .24, .29, '#bbc5c5', 'hood'],
  ]],
  ['building', 'Elementos construtivos', 'Building components', [
    ['stair', 'Escadas direitas', 'Straight stairs', 1.00, 3.50, 2.70, '#c1a37d'],
    ['turningStair', 'Escadas em L', 'Quarter-turn stairs', 2.13, 2.83, 2.70, '#b99e80', 'turningStair'],
    ['spiralStair', 'Escada em caracol', 'Spiral staircase', 1.58, 1.58, 2.70, '#aa9076', 'spiralStair'],
    ['rail', 'Guarda', 'Railing', 2.40, .12, 1.05, '#8c7d6d'],
    ['glassRail', 'Guarda envidraçada', 'Glass railing', 2.40, .12, 1.08, '#9bb9bd', 'glassRail'],
    ['column', 'Pilar circular', 'Round column', .34, .34, 2.70, '#c4bdad', 'roundColumn'],
    ['squareColumn', 'Pilar quadrado', 'Square column', .32, .32, 2.70, '#c4bdad', 'column'],
    ['outdoorStep', 'Degrau exterior', 'Exterior step', 1.25, .44, .18, '#b6aa98', 'column'],
    ['fireplace', 'Lareira', 'Fireplace', 1.34, .56, 1.44, '#a79585', 'fireplace'],
  ]],
  ['accessibility', 'Acessibilidade', 'Accessibility', [
    ['ramp', 'Rampa', 'Ramp', 1.15, 2.90, .32, '#a0a8a3', 'ramp'],
    ['grabBar', 'Barra de apoio', 'Grab rail', .69, .16, .15, '#8c9fa9', 'grabBar'],
    ['showerSeat', 'Assento de duche', 'Shower seat', .44, .47, .47, '#a7bebf', 'bench'],
    ['wheelchair', 'Cadeira de rodas', 'Wheelchair', .68, 1.01, .89, '#778d98', 'wheelchair'],
    ['wheelchairTurning', 'Área de manobra', 'Wheelchair turning area', 1.50, 1.50, .01, '#909dad', 'turningCircle'],
  ]],
];

const groupsById = new Map(baseGroups.map(([id, pt, en, entries]) => [id, [id, pt, en, [...entries]]]));
for (const [id, pt, en, entries] of extendedObjectGroups) {
  const group = groupsById.get(id);
  if (group) group[3].push(...entries);
  else groupsById.set(id, [id, pt, en, entries]);
}
const groups = [...groupsById.values()];

export const objectGroups = groups.map(([id, pt, en, entries]) => ({ id, pt, en, types: entries.map(([type]) => type) }));
export const elements = Object.fromEntries(groups.flatMap(([group, , , entries]) => entries.map(
  ([type, pt, en, width, depth, height, color, model]) => [type, {
    pt, en, width, depth, height, color, model, group, opening: group === 'openings',
    structural: group === 'building' || ['tree', 'ramp'].includes(type),
  }],
)));

export function normalizeObjectCatalogRef(value) {
  if (!value || typeof value !== 'object' ||
      typeof value.providerId !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(value.providerId) ||
      typeof value.productId !== 'string' || !/^[a-zA-Z0-9_.-]{1,85}$/.test(value.productId)) return undefined;
  const name = typeof value.name === 'string' ? value.name.trim().slice(0, 150) : '';
  if (!name) return undefined;
  const reference = { providerId: value.providerId, productId: value.productId, name };
  if (typeof value.url === 'string' && value.url.length <= 800) {
    try {
      const address = new URL(value.url);
      if (['https:', 'http:'].includes(address.protocol) && !address.username && !address.password) reference.url = address.href;
    } catch {
      // The stable product identity and display name can survive a malformed optional URL.
    }
  }
  return reference;
}
