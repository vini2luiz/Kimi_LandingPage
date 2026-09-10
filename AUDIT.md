# Auditoria de engenharia — lp-f1

**Escopo:** responsividade mobile, superfície de segurança web, velocidade de carga/runtime.
**Método:** leitura estática de todo `src/`, build de produção (`npm run build`) e inspeção dos bytes reais em `dist/assets`, `npm audit`. Sem Lighthouse em device real — os achados abaixo são determinísticos no código, não estimativas.
**Data original:** 2026-09-10. **Reauditoria:** 2026-09-10 (mesmo dia, após o commit de correção `f1a6e50`).

> Reauditoria: M-1, M-2, M-3, M-4, S-1, S-2, S-4, V-2, V-3, V-4 foram verificados como corrigidos lendo o código atual e o build real. Dois achados novos surgiram da correção em si — **M-5** (painéis do hero somem no mobile em vez de reorganizar) e **V-1** (véu de carregamento sem timeout, bloqueia a página inteira indefinidamente em conexão lenta) — e foram corrigidos nesta rodada. Detalhe completo no relatório publicado como artifact nesta sessão.

---

## 1. Mobile — responsividade

| ID | Severidade | Evidência | Impacto |
|----|-----------|-----------|---------|
| M-1 | **P0** | [timeline.css](src/styles/timeline.css#L59-L67) — `.timeline-plate` usa `width: max(49.3056cqw, 710px)` e só ganha layout mobile (`width: 82%`) em `max-width: 639px`. Entre **640px e ~900px** (tablets/foldables em paisagem, iPad mini, Pixel Fold) a placa fica fixa em 710px dentro de um container mais estreito. | Placa maior que a viewport → scroll horizontal / conteúdo cortado em tablets. |
| M-2 | **P0** | [paddock.css](src/styles/paddock.css#L64-L70) — `.paddock-intro-col` em `max-width: 639px` vira `left: 24px; width: 320px`, ou seja, borda direita em `344px`. | Em telas de **320px** (iPhone SE 1ª/2ª gen, Android de entrada) o bloco de texto do paddock estoura a viewport em 24px. |
| M-3 | **P1** | [paddock.css](src/styles/paddock.css#L150-L156) — `.calendar-strip-list` é `flex` com `justify-content: space-evenly` e 5 itens com fontes `min ~12–18px`, sem `overflow-x` nem `flex-wrap`. | Em 375px de largura os 5 rounds do calendário podem comprimir/colidir sem rota de escape (sem scroll, sem wrap). |
| M-4 | **P1** | [hero.css](src/styles/hero.css#L344-L346) e [index.html](index.html#L26-L44) — `.mobile-menu-close` é `1.5rem × 1.5rem` (24×24px), abaixo do alvo de toque mínimo recomendado (WCAG 2.5.5 / 44×44px). O overlay não implementa *focus trap* (só fecha no `Escape`, tab continua saindo do menu). | Falha de acessibilidade em touch e teclado; feels like protótipo, não produto. |
| M-5 | **P2** | [hero.css](src/styles/hero.css#L226-L227) — `.hero-panels-col { display: none }` abaixo de 640px remove completamente o painel "next race" / "season stats" no mobile (não reorganiza, esconde). | Perda de conteúdo/informação em telas pequenas, não é responsivo, é omissão. |
| M-6 | **P2** | [main.js](src/main.js#L20-L27) — `updateRootFont()` só reescala acima de 1920px; em `base.css` o `html { font-size }` usa `vw` até 1279px e volta a `16px` fixo abaixo disso — combinação correta, mas depende de dois mecanismos paralelos (JS + CSS) para a mesma responsabilidade, risco de dessincronia em manutenções futuras. | Risco de regressão silenciosa de tipografia fluida. |

**Verificado como correto (não é achado):** breakpoints de `hero-middle-row`, `hero-name-h1`, `stats-dl` e o uso de `cqw`/`clamp`-like (`max(x cqw, Ypx)`) em quase todo o resto do CSS é uma abordagem responsiva sólida — o problema é pontual (M-1, M-2, M-3), não sistêmico.

---

## 2. Segurança

| ID | Severidade | Evidência | Impacto |
|----|-----------|-----------|---------|
| S-1 | **P0** | Não existe `vite.config.js`/`vite.config.ts` no projeto — nenhum header de segurança é configurado (`Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). `index.html` também não tem `<meta http-equiv="Content-Security-Policy">`. | Sem CSP/`frame-ancestors`, o site pode ser embutido em `<iframe>` de terceiros (clickjacking). Sem defesa em profundidade caso um dos 3 domínios externos seja comprometido. |
| S-2 | **P0** | [HeroScene.js](src/scene/HeroScene.js#L16) — `DRACO_DECODER = "https://cdn.jsdelivr.net/npm/three@0.185.0/..."`: o decoder DRACO (**JS + WASM executável**) é buscado em runtime de um CDN público, **sem Subresource Integrity (`integrity=`)**. | Se o jsDelivr ou a conta do pacote for comprometida, código arbitrário (JS/WASM) executa no navegador do visitante. É o maior risco de supply-chain do projeto porque é código executável, não apenas mídia. |
| S-3 | **P1** | [data/assets.js](src/data/assets.js#L1) — todos os assets (GLB, HDR, texturas, imagens da timeline, máscaras do footer/veil) vêm de `storage.getlayers.ai`, um bucket de terceiros fora do controle do domínio do site, sem SRI (imagens/binários carregados via `<img>`/`TextureLoader`/`fetch` não suportam `integrity` de qualquer forma). | Dependência total de disponibilidade/integridade de terceiro para o LCP do site; sem fallback caso o bucket mude/caia (há um `onError` que mostra um banner, o que é positivo). |
| S-4 | **P1** | [index.html](index.html#L8-L10) — fontes carregadas de `fonts.googleapis.com` / `fonts.gstatic.com` via `<link rel="stylesheet">` renderblocking, sem `integrity`. | Requisição de bloqueio de render para 2 origens extras; ponto de rastreamento de terceiro (privacidade) e de falha (sem fallback de fonte local). |
| S-5 | **Positivo** | [index.html](index.html#L152-L154) — links externos (`instagram`, `x`, `youtube`) já usam `target="_blank" rel="noopener"`. | Mitigação correta de `window.opener` tabnabbing — manter esse padrão. |
| S-6 | **P2** | `npm audit` no momento da auditoria: **0 vulnerabilidades** (3 deps de produção: `three`, `lenis`; Vite como dev dependency). | Sem achados agora, mas superfície pequena o suficiente para manter assim — recomenda-se `npm audit` no CI a cada PR. |
| S-7 | **P2** | Sem `robots.txt`, `security.txt` ou cabeçalho `X-Content-Type-Options: nosniff` documentado para o servidor de produção. | Polimento de maturidade profissional, não uma vulnerabilidade crítica. |

---

## 3. Velocidade / performance

Build de produção medido (`npm run build`, bytes reais em `dist/assets`, sem compressão de transferência):

| Asset | Tamanho |
|---|---|
| `draco_decoder-*.js` (buscado do CDN, não do próprio bundle) | ~702 kB |
| `index-*.js` (bundle único da aplicação) | ~657 kB |
| `draco_decoder-*.wasm` | ~279 kB |
| `draco_decoder-*.wasm` (segunda variante) | ~188 kB |
| `draco_wasm_wrapper-*.js` (2 variantes) | ~57 kB cada |
| `index-*.css` | ~31 kB |

Mais os assets remotos que só chegam depois do JS: `helmet3.glb` (~801 kB), `studio-light.hdr` (~387 kB) e 4 texturas do "head" (diffuse/depth/alpha/normal, ~178 kB+ cada).

| ID | Severidade | Evidência | Impacto |
|----|-----------|-----------|---------|
| V-1 | **P0** | [hero.js](src/components/hero.js#L86-L100) + [HeroScene.js](src/scene/HeroScene.js#L232-L256) — `#loading-veil` só some no `onReady`, que só dispara depois de `Promise.all([HDR, 4 texturas, GLB])` **+** `renderer.compileAsync`. Caminho crítico ≈ 2,3 MB antes do primeiro conteúdo útil real. | Em 4G, tela branca/véu por vários segundos — o LCP efetivo do site é bloqueado por uma cena 3D inteira, não pelo conteúdo textual que já está no DOM. |
| V-2 | **P0** | `index-*.js` é um **bundle único de ~657 kB** — `three`, `GLTFLoader`, `DRACOLoader`, `RGBELoader` são importados estaticamente em [hero.js](src/components/hero.js#L6) → [main.js](src/main.js#L12), então o Vite não tem fronteira de `import()` dinâmico para separar a cena 3D do resto do site. | Todo visitante baixa/parseia o motor 3D completo mesmo que só role até o rodapé; não há code-splitting nem lazy-load condicionado a `IntersectionObserver`/tier de dispositivo. |
| V-3 | **P0** | [contours.js](src/lib/contours.js#L82-L96) e [season.js](src/components/season.js#L157-L206) — ambos chamam `requestAnimationFrame` recursivamente **para sempre**, mesmo fora de vista (`inView`/`done` só pulam o trabalho pesado, não cancelam o `rAF`). Três instâncias de contorno (hero, paddock, footer) rodam `marching squares` em grade 96×96 + o traçado do circuito em canvas, todas continuamente. | Consumo de bateria/CPU/GPU (thermal throttling em mobile) pelo tempo de vida inteiro da página, mesmo com as seções fora da tela. |
| V-4 | **P1** | [index.html](index.html#L8-L10) — Google Fonts no `<head>` sem `font-display` controlado localmente e sem self-host. | FOIT/FOUT + 2 round-trips extras (`fonts.googleapis.com` → `fonts.gstatic.com`) antes do texto renderizar com a fonte final. |
| V-5 | **P1** | `dist/assets` — dois pares de decoder DRACO (`draco_decoder-*.wasm` **e** `draco_wasm_wrapper-*.js`, cada um com 2 hashes/variantes) ficam no bundle mesmo o app usando só uma via de decodificação em runtime. | ~580 kB de saída de build potencialmente não utilizados (a diferença entre a variante JS-fallback e a WASM do three/examples). |
| V-6 | **P2** | Nenhum `<link rel="preload">`/`modulepreload` para o GLB/HDR/texturas críticas do hero; o carregamento só começa depois do JS parsear e `HeroScene` construir. | Perde-se paralelismo de rede possível entre parse do HTML e início do download dos assets 3D. |
| V-7 | **P2** | [scroll.js](src/lib/scroll.js#L33-L45) e [sticky-stack.js](src/lib/sticky-stack.js#L20-L24) já usam `passive: true` + coalescing em `rAF` — **positivo**, é o padrão certo para scroll listeners. | Sem impacto negativo; mencionado para não perder de vista ao refatorar V-3. |

---

## Notas / pontuação (leitura de engenheiro sênior)

- **Mobile:** achados pontuais mas de alto impacto (M-1/M-2 quebram layout em classes inteiras de dispositivo — tablets e telas de 320px). Corrigível em horas, não em dias: ajustar os breakpoints de `.timeline-plate` e `.paddock-intro-col` para escalar por `cqw`/`clamp` em vez de saltar de "desktop fixo" para "mobile" num único ponto de corte.
- **Segurança:** a superfície é pequena (site estático, sem input de usuário, sem backend próprio), o que limita o risco de XSS clássico — mas a ausência de CSP/SRI para código executável de terceiro (DRACO via jsDelivr) é o item que uma review sênior vai barrar primeiro. É uma correção de configuração (headers no host + `integrity` no `<script>`/loader), não uma reescrita.
- **Velocidade:** o problema não é "o site é lento para renderizar", é "o site força todo mundo a baixar uma cena 3D de ~2,3 MB antes de mostrar qualquer coisa". Separar o carregamento do Hero 3D do restante do bundle (dynamic `import()`, gate por tier/`prefers-reduced-motion`, remover o par de DRACO não utilizado) resolve a maior parte do V-1/V-2 sem tocar no visual.

## Prioridade de correção sugerida

1. V-1 + V-2 (code-splitting da cena 3D, véu não bloqueante) — maior ganho percebido.
2. S-1 + S-2 (headers de segurança no host/`vite.config.js` + `integrity` no loader DRACO ou self-host do decoder).
3. M-1 + M-2 (breakpoints de timeline e paddock).
4. V-3 (cancelar `rAF` fora de vista), M-3/M-4, S-3/S-4, V-5/V-6.
