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

## Projetos, alojamento e domínios

O planeador guarda cada projeto num ficheiro JSON. Um cookie de sessão associa os ficheiros ao navegador. É possível transferir um projeto para outro navegador através da exportação e importação de ficheiros. O cookie de sessão e o de idioma expiram após um ano. O site público também pode guardar o tema selecionado num cookie.

Uma ligação de partilha concede acesso a uma cópia da versão guardada no momento em que foi criada. A ligação expira ao fim de 30 dias. O autor pode desativá-la ou eliminar o projeto para interromper o acesso à cópia partilhada. Os projetos e as partilhas usam o mesmo volume de ficheiros.

| Variável | Valor predefinido | Finalidade |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP |
| `HOST` | `127.0.0.1` | Endereço do servidor |
| `CASOVARA_DATA_DIR` | `<repositório>/data` | Diretório dos projetos |
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

Foram testados os fluxos de desenho, pisos, exportação e reimportação, biblioteca, relatório e partilha no Chromium. Os testes de layout abrangeram larguras de 320 a 1440 píxeis. A cobertura ilustrativa, os consumos por área e os guias escritos são simplificações desta versão. Ficam por implementar ferramentas avançadas como mansardas, janelas de cobertura, painéis fotovoltaicos, composições multicamada e renderização fotorrealista.
