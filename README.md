# Casovara

Planeador de casas para Portugal. Permite desenhar plantas, explorar um modelo 3D, comparar materiais em euros e começar a partir de seis projetos de exemplo. Inclui uma biblioteca, 11 calculadoras de obra e guias sobre os cálculos.

## Executar

Com Node.js 22 ou superior, execute `npm start` e abra [http://127.0.0.1:3000](http://127.0.0.1:3000). Use `npm run dev` para reiniciar o servidor quando muda um dos módulos que carrega. `npm test` verifica a localização, os módulos construtivos, as plantas e a API de projetos. A aplicação usa módulos JavaScript nativos e não requer instalação de dependências.

| Página | Rota |
| --- | --- |
| Página inicial | `/` |
| Planeador | `/app` |
| Biblioteca | `/biblioteca` |
| Calculadoras | `/calculadoras` |
| Guias | `/guias` |

A aplicação usa os idiomas do navegador e, quando disponível, o país enviado pelo alojamento. O fuso horário do navegador serve de alternativa para identificar Portugal. A preferência manual fica num cookie. As rotas com prefixos `/pt`, `/en-pt` e `/en` abrem explicitamente a interface em português de Portugal, inglês para Portugal e inglês internacional. A primeira e segunda opções usam a formatação numérica portuguesa. Todas usam unidades métricas e euros.

No editor 2D, clique ou arraste para traçar paredes e use `Enter` ou o botão de conclusão para terminar a cadeia. Pode ajustar a espessura antes de desenhar, mover os vértices e enquadrar a seleção. No 3D, arraste para rodar, use o botão direito ou `Shift` para deslocar e use a roda ou dois dedos para aproximar. Clique num elemento para o selecionar também na planta. Na vista dividida, arraste o separador para redimensionar os dois painéis. O renderizador usa profundidade por píxel com WebGL e uma alternativa por software.

Use `Ctrl/⌘ + K` para localizar ferramentas, compartimentos e vãos, ou `1`, `2` e `3` para alternar vistas. O desenho técnico mostra espessuras, hachuras e identificadores de vãos. O menu de visualização controla as cotas interiores e a referência ao piso inferior. Selecione uma parede para editar camadas, altura, cota de base e acabamento por face e consultar medidas descontadas dos vãos.

O painel **Ambiente 3D** controla a apresentação em Materiais, Maquete ou Técnico, a altura do corte, o terreno, o mobiliário e as sombras. As vistas guardadas incluem estes controlos. As predefinições de luz usam a direção e a altura solar escolhidas no painel para estudos visuais.

Em **Pavimentos → Laje**, escolha uma laje automática, desenhe um perímetro retangular ou deixe o piso sem laje. A laje automática segue o contorno interior das divisões. A espessura é editável e começa em 17 cm nos projetos novos e nos que ainda não têm configuração de laje. Cada piso guarda as suas próprias definições de laje. O teto e o acabamento do pavimento têm controlos próprios.

## Instalações da casa

Abra **Instalações** no editor e escolha uma especialidade. Pode partir de uma proposta automática baseada nas divisões e nos equipamentos da planta ou colocar os pontos e traçar as ligações manualmente. A vista em planta e a vista 3D mostram os pontos e traçados da camada selecionada. As mudanças entram no histórico e são guardadas com o projeto, incluindo nos ficheiros `.casovara`.

Para fixar um ponto à parede, escolha a face voltada para a divisão servida. A marca aponta para essa divisão e acompanha a parede quando esta é deslocada. Os pontos também admitem montagem no chão, no teto ou posição livre. Use a quantidade da tomada para representar várias no mesmo local, por exemplo `T 3×`.

| Especialidade | Redes e pontos representados |
| --- | --- |
| Eletricidade | Entrada do cabo principal monofásica ou trifásica, quadro, grupos de tomadas, iluminação, interruptores e ligações. |
| Águas e esgotos | Entrada de água fria, saída de esgotos, coletores, aparelhos sanitários e traçados independentes de água fria, água quente e esgotos. |
| VMC | Unidade, condutas, insuflação, extração, admissão e rejeição. |
| Ar condicionado | Unidades, ligações de refrigerante e drenagem de condensados. |
| Piso radiante | Coletor, zonas, ida, retorno e circuitos de piso. Gere esta especialidade quando a escolher. |

Os esquemas automáticos organizam a geometria por piso. A entrada elétrica, a entrada de água e a saída de esgotos são propostas no primeiro piso da lista. A entrada elétrica começa como monofásica e pode ser alterada. As ligações entre pisos, o dimensionamento e a conformidade técnica exigem um projeto de especialidades. [Instalações elétricas na DGEG](https://www.dgeg.gov.pt/pt/areas-setoriais/energia/energia-eletrica/instalacoes-eletricas-de-servico-particular/procedimentos-e-controlo-das-instalacoes/projeto/) · [Redes prediais de água e drenagem](https://diariodarepublica.pt/dr/detalhe/decreto-regulamentar/23-1995-431873) · [Sistema de Certificação Energética](https://www.dgeg.gov.pt/pt/areas-setoriais/energia/eficiencia-energetica/sistema-de-certificacao-energetica-dos-edificios/sce-sistema-de-certificacao-energetica-dos-edificios)

## Plano de obra

Abra **Plano de obra** no planeador e gere um programa inicial a partir da área, dos pisos, do sistema construtivo e das instalações da casa. Ajuste o calendário, os dias úteis e as datas de paragem, as durações, as equipas e a cadeia de precedências. Uma tarefa de zero dias representa um marco. Atrasos entre tarefas contam em dias úteis e a data «não iniciar antes de» é uma data civil.

O diagrama de Gantt mostra o calendário calculado, o caminho crítico das dependências e as esperas por equipa. O cálculo compara arranjos possíveis e procura executar em paralelo as tarefas autorizadas pelos seus predecessores e pela capacidade das equipas. A poupança em dias úteis é medida face a um calendário que executa uma tarefa de cada vez, sujeito às mesmas restrições. O programa é guardado com a casa, pode ser exportado em CSV e pode ser revisto pelo Assistente IA ou via MCP.

As durações, reservas para fornecimentos e marcos de libertação são hipóteses editáveis. Confirme os prazos e a compatibilidade das frentes de trabalho com a equipa de obra. [Guia de avaliação de cronogramas](https://www.gao.gov/products/gao-16-89g) · [Coordenação de segurança em estaleiro](https://diariodarepublica.pt/dr/detalhe/decreto-lei/273-2003-466181)

## Biblioteca de objetos

Abra **Elementos** na barra do editor para pesquisar objetos por nome, navegar por categoria ou mudar de catálogo. Escolha um objeto e coloque-o na planta. Para orientar um objeto já colocado, selecione-o e arraste a pega circular. O ângulo também pode ser editado no painel de propriedades ou com as setas quando a pega está focada. **Desfazer** repõe a orientação anterior.

O plugin IKEA Portugal tem uma seleção de referências com medidas e ligações às páginas dos artigos. A planta guarda o código, nome e dimensões do artigo e usa a geometria esquemática do Casovara. A fonte de cada catálogo é independente do formato dos projetos. [Catálogo IKEA Portugal](https://www.ikea.com/pt/pt/cat/moveis-fu001/)

Para disponibilizar um catálogo IKEA Portugal fornecido para este fim, guarde `ikea-pt.json` em `data/catalogs/` ou no diretório indicado por `CASOVARA_CATALOG_DIR`. O ficheiro substitui a seleção incluída. Declare `coverage` como `full` para um catálogo completo ou `selection` para uma parte dele. As dimensões estão em metros. O campo `type` corresponde a um modelo do Casovara. Use identificadores de artigo únicos e, se estiver disponível, o URL HTTPS da ficha IKEA em Portugal.

```json
{
  "version": 1,
  "coverage": "selection",
  "items": [
    {
      "productId": "80213074",
      "name": { "pt": "MICKE · Secretária", "en": "MICKE · Desk" },
      "type": "desk",
      "category": "office",
      "width": 1.05,
      "depth": 0.5,
      "height": 0.75,
      "url": "https://www.ikea.com/pt/pt/p/micke-secretaria-branco-80213074/"
    }
  ]
}
```

Para acrescentar outro fornecedor, registe as categorias em `public/catalog-plugins.js` e a fonte de dados em `catalog-service.js`. O serviço valida o catálogo, pesquisa em português e inglês e entrega os resultados em páginas ao editor.

## Assistente de projeto

Abra **Assistente IA** no editor e descreva uma casa ou uma alteração à planta aberta. Em **Rever proposta**, arraste o cursor **Antes/Depois** para comparar as duas plantas à mesma escala. Escolha o piso e a camada para rever a arquitetura, a laje ou a rede de instalações. Pode usar as setas do teclado com o cursor focado. **Aplicar à planta** guarda a alteração no histórico do editor, onde pode usar **Desfazer**. Com a opção **Experimentar um T3**, este fluxo funciona localmente com um exemplo predefinido.

Para pedidos em linguagem natural, configure `OPENAI_API_KEY` no ambiente do servidor. O modelo predefinido é `gpt-4.1-mini` e pode ser escolhido com `CASOVARA_OPENAI_MODEL`. Para carregar estas variáveis de um ficheiro `.env` local ignorado pelo Git, arranque com `node --env-file=.env server.js`. Por predefinição, o endpoint de IA paga só fica ativo em localhost. Num alojamento com acesso controlado, pode ativá-lo com `CASOVARA_AI_PUBLIC=1`. Só ao enviar um pedido é que o assistente partilha o texto, o contexto da conversa e o resumo da geometria com a OpenAI. [Documentação da API e das ferramentas](https://developers.openai.com/api/docs/guides/function-calling)

## MCP Apps e WebMCP

O servidor expõe MCP por Streamable HTTP em `http://127.0.0.1:3000/mcp`. Para clientes remotos, use o URL HTTPS da instância publicada. O recurso `casovara://skills/house-planning` e a ferramenta `casovara_get_planner_skill` ensinam as convenções de geometria e os exemplos de chamadas. O prompt `casovara_plan_house` junta o guia a um pedido do utilizador.

| Ferramenta | Ação |
| --- | --- |
| `casovara_create_plan` | Criar uma planta editável com pisos, divisões, paredes, vãos, lajes e cobertura. |
| `casovara_edit_plan` | Aplicar um lote de alterações à cópia de um projeto fornecido. |
| `casovara_inspect_plan` | Obter IDs, geometria, configuração da laje por piso, esquemas de instalações, estimativa indicativa e avisos. |
| `casovara_design_services` | Gerar e editar pontos e traçados de instalações por especialidade e piso. |
| `casovara_plan_construction` | Gerar ou ajustar tarefas, dependências, equipas e calendário do plano de obra. |

Os clientes externos fornecem o JSON do projeto nas ferramentas de edição e inspeção. O recurso MCP Apps permite rever a planta por piso e exportar `.casovara` para **Importar projeto** no planeador. Em navegadores com WebMCP, as ferramentas da página podem inspecionar a planta aberta e preparar propostas para revisão no editor. [Especificação MCP Apps](https://apps.extensions.modelcontextprotocol.io/api/documents/overview.html) · [WebMCP no Chromium](https://developer.chrome.com/docs/modern-web-guidance/guides/webmcp/webmcp)

Para alterar a espessura da laje pelo MCP, use `{ "op": "set_level", "levelId": "identificador-do-piso", "slab": { "thickness": 0.22 } }` em `casovara_edit_plan`. O modo e o perímetro existentes são preservados. A camada **Laje** da pré-visualização mostra a área ocupada pela laje e a espessura escolhida.

Para gerar eletricidade e águas por MCP, envie `operations: [{ "op": "generate", "systems": ["electrical", "plumbing"] }]` com o `project`. Use `levelIds` para limitar aos pisos pretendidos e `replace: true` para substituir esquemas existentes. Para alterações, inspecione os identificadores da rede e use a operação `edit` com a especialidade, `levelId` e `changes`. O Assistente IA usa as mesmas operações e permite comparar a proposta por camada antes de a aplicar.

Para gerar um plano de obra, envie `operations: [{ "op": "generate", "startDate": "2027-03-01" }]` à ferramenta `casovara_plan_construction` com o `project`. A operação `edit` aplica alterações numa só proposta. Para ajustar uma tarefa, envie `changes: [{ "op": "upsert_task", "task": { "id": "identificador-da-tarefa", "days": 5 } }]` na operação `edit`.

## Projetos, alojamento e domínios

O planeador guarda cada projeto num ficheiro JSON. Um cookie de sessão associa os ficheiros ao navegador. É possível transferir um projeto para outro navegador através da exportação e importação de ficheiros. O cookie de sessão e o de idioma expiram após um ano. O site público também pode guardar o tema selecionado num cookie.

Uma ligação de partilha concede acesso a uma cópia da versão guardada no momento em que foi criada. A ligação expira ao fim de 30 dias. O autor pode desativá-la ou eliminar o projeto para interromper o acesso à cópia partilhada. Os projetos e as partilhas usam o mesmo volume de ficheiros.

| Variável | Valor predefinido | Finalidade |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP |
| `HOST` | `127.0.0.1` | Endereço do servidor |
| `CASOVARA_DATA_DIR` | `<repositório>/data` | Diretório dos projetos |
| `CASOVARA_CATALOG_DIR` | `<CASOVARA_DATA_DIR>/catalogs` | Diretório dos catálogos fornecidos |
| `NODE_ENV` | Desenvolvimento | Define o cache de ficheiros estáticos em produção |

Para publicar, ligue o servidor Node.js a um volume persistente e a um proxy HTTPS. O proxy pode encaminhar o protocolo por `X-Forwarded-Proto` e o país por `CF-IPCountry`, `X-Vercel-IP-Country` ou `CloudFront-Viewer-Country`. Ambos os domínios podem apontar para a mesma instância. Para que os utilizadores abram os mesmos projetos de qualquer domínio, configure o domínio alternativo para redirecionar para o principal, preservando o caminho e os parâmetros. Um cookie de sessão fica limitado ao domínio em que foi emitido.

## Sistemas construtivos

Os perfis de Édria, LSF engenheirado, ClickHouse, alvenaria de tijolo e betão armado vivem em módulos independentes em `public/systems/`. Cada módulo declara o nome e descrição nos idiomas suportados, parâmetros de desenho, consumos, preços unitários e margens de desperdício. Para acrescentar um sistema, crie outro módulo e registe-o em `public/core.js`.

Os preços e coeficientes são demonstrativos. Os perfis Édria e ClickHouse são aproximações genéricas, à espera das fichas técnicas e das tabelas oficiais. Os dados da empresa também são fictícios.

## Referência e verificação

O levantamento público abrangeu a página inicial, o editor e os fluxos da biblioteca. O REA confirmou zero ferramentas WebMCP declaradas nas duas páginas. Foram observados os controlos em desktop e em viewport estreito, o menu de projeto, as ferramentas de desenho e o painel de quantidades. Casovara usa identidade visual, plantas, imagens e implementação próprias. [Baukit](https://baukit.app/en) · [Editor Baukit](https://baukit.app/en/app) · [REA](https://github.com/morluto/rea)

| Fluxo observado | Implementação Casovara |
| --- | --- |
| Biblioteca, planta, 3D e estimativa | Seis projetos originais. A biblioteca permite pré-visualizar os pisos e abrir uma cópia no planeador. |
| Desenho e revisão | Paredes, compartimentos, portas, janelas, mobiliário, cotas, pisos, cobertura, acabamentos, histórico e vistas 3D. |
| Quantidades, custos e exportação | Estimativa em euros com materiais discriminados, relatório imprimível e exportação JSON, SVG, PNG e CSV. |
| Guias e calculadoras | Onze calculadoras com resultados interativos e guias de utilização. |
| Gestão de projetos | Ficheiros por sessão, abertura, duplicação e partilha revogável de uma cópia. |

Foram testados os fluxos de desenho, pisos, edição de paredes e vãos, opções de visualização, exportação e reimportação, biblioteca, relatório e partilha no Chromium. Os testes de layout abrangeram larguras de 320 a 1440 píxeis. A cobertura ilustrativa, os consumos por área e os guias escritos são simplificações desta versão. Ficam por implementar ferramentas avançadas como mansardas, janelas de cobertura, painéis fotovoltaicos, composições detalhadas de lajes e coberturas e renderização fotorrealista.
