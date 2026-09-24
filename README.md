# DYNASTY 8 — GUIA DO SITE

## Arquivos

- `index.html` — Home
- `catalogo.html` + `catalogo.js` — catálogo, ficha, salvos e vistos recentemente
- `sobre.html` + `sobre.js` — página Sobre
- `imoveis.json` — nome, localização, descrição e fotos
- `controle.json` — publicação, status, preço, seleção e novidade
- `config.js` — links e nomes das coleções
- `styles.css` — visual e interações
- `.vscode/settings.json` — Live Server na porta 5501

## Identidade

- Imobiliária: **DYNASTY 8**
- Mundo: **Los Santos / San Andreas**
- Assinatura do servidor: **VERTIGEM**

O site é imobiliário. A ambientação aparece de forma indireta nas imagens, nos textos curtos e na forma como as casas são apresentadas — sem repetir a lore geral.

## Cadastro

O site contém 31 propriedades:

- A: `a1` a `a12`
- B: `b1` a `b10`
- C: `c1` a `c9`

### Alterar texto ou fotos

Edite `imoveis.json`.

### Alterar o que aparece no site

Edite `controle.json`:

```json
"b8": {
  "published": true,
  "status": "Disponível",
  "price": 100,
  "showcase": false,
  "new": false,
  "development": false
}
```

- `published` — aparece ou não no site
- `status` — `Disponível` ou `Indisponível`
- `price` — valor
- `showcase` — entra na seleção da Home quando o imóvel estiver disponível
- `new` — selo `Novidade` quando o imóvel estiver disponível
- `development` — reservado para projetos futuros

### Disponibilidade pública

- `published: false` — o imóvel não aparece publicamente.
- `published: true` + `status: "Disponível"` — aparece normalmente e pode ser aberto/salvo.
- `published: true` + `status: "Indisponível"` — continua visível no catálogo, mas com a imagem fortemente ocultada em preto/vermelho/cinza e sem abertura da ficha.
- Não existe estado `Reservado` no fluxo atual.
- `development: true` continua reservado para projetos e não entra no catálogo residencial.

Na ficha de um imóvel disponível, o valor é apresentado como **valor de referência**. O catálogo registra interesse em um ambiente virtual do servidor; ele não representa compra ou transferência de propriedade de um imóvel real.

## Referências internas

A1, B8, C3 etc. continuam sendo usadas pela equipe, mas não aparecem visualmente.

- `Copiar para atendimento` copia a referência do imóvel.
- `Copiar seleção` copia as referências dos imóveis salvos na ordem da lista.

## Imagens

Preserve sua pasta `assets/`. O site espera:

- `assets/vertigem-logo.png`
- `assets/colecao-a.png`
- `assets/colecao-b.png`
- `assets/colecao-c.png`
- `assets/san-andreas.png` — única imagem ambiente fora das coleções e dos imóveis
- `assets/icons/discord.png`
- `assets/icons/instagram.png`
- `assets/casas/...`

Os ícones sociais usam **64 × 64 px**, PNG e fundo transparente.

## Visual das casas

Antes de abrir uma propriedade, as capas recebem a identidade do site: preto dominante, vinho profundo, vinheta, contraste e intervenções diferentes entre os cards.

- Exclusivas: tratamento mais denso e escuro
- Selecionadas: equilíbrio entre vermelho e fotografia
- Essenciais: imagem um pouco mais aberta
- os cards alternam faixa vertical, corte diagonal e marca de registro
- ao passar o mouse, o tratamento recua e a foto aparece quase original
- ao abrir a propriedade, galeria e lightbox ficam sem filtro

## Experiência em RP

O catálogo ajuda na escolha. Fotos e descrições não significam que o personagem conhece automaticamente acesso, interior, caminhos ou contexto espacial do imóvel.

O atendimento ocorre por ticket. O conhecimento de acessos, interiores e contexto espacial continua sendo construído em RP.

## Redes

Os links ficam em `config.js`. O site exibe apenas os ícones do Discord e Instagram.

## Go Live

A porta está configurada em `.vscode/settings.json`: **5501**.


## Ajustes visuais finais

- As imagens das três coleções ficam visíveis sem hover; o hover apenas revela mais a fotografia.
- Home e Showcase recebem mais granulação e intervenção editorial que o catálogo.
- O catálogo mantém as casas legíveis em repouso e reduz quase todo o tratamento no hover.
- A ficha aberta usa fotografia limpa.
- A página Sobre usa o mesmo fundo escuro do restante do site.
- Fora das coleções e das fotos dos imóveis, apenas `san-andreas.png` é usada como imagem ambiente. A área de Projetos é construída somente com CSS.
## Fluxo final de manutenção

Para o uso diário da equipe, quase tudo acontece em `controle.json`:

- `published: false` — remove o imóvel da parte pública.
- `published: true` + `status: "Disponível"` — card normal, ficha, salvos e atendimento.
- `published: true` + `status: "Indisponível"` — o card continua visível, recebe tratamento escuro/vermelho e não abre a ficha.
- `showcase: true` — só aparece como Destaque enquanto estiver disponível.
- `new: true` — só exibe Novidade enquanto estiver disponível.
- Imóveis já salvos ou vistos continuam aparecendo de forma apagada se ficarem indisponíveis, evitando que desapareçam sem explicação.
- Links compartilhados usam o ID interno (`a2`, `b1`, etc.) para continuarem funcionando mesmo se o nome público do imóvel mudar. O ID não é exibido no card.

### Atendimento e interesse

O site funciona como apoio à experiência do servidor. O valor mostrado é uma referência para o atendimento. O catálogo permite comparar, salvar, compartilhar e demonstrar interesse em ambientes virtuais; acesso, interior e contexto espacial continuam sendo conhecidos em RP.

### Mobile

No catálogo, as três coleções permanecem acessíveis em uma barra compacta quando o menu principal é ocultado em telas menores.


### Comportamento de um imóvel indisponível

Um imóvel com `published: true` e `status: "Indisponível"` continua no catálogo para preservar a leitura do mercado, mas não abre a ficha nem pode ser salvo. O card usa tratamento escuro e mantém apenas o selo de indisponibilidade. Ao clicar ou usar Enter/Espaço, o site informa que o ambiente não está disponível, em vez de deixar a interação sem resposta.

Os blocos `Novidade`, `Destaque` e `Disponível/Indisponível` usam uma pilha fixa no canto superior direito. As etiquetas têm largura controlada e `position: static` dentro da pilha para impedir sobreposição com o número editorial `01/02/03`.
