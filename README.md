# KIMI ANTONELLI — GRIDO1 Racing Systems

Landing page cinematográfica para o piloto Kimi Antonelli / GRIDO1 Racing Systems (Mercedes-AMG F1, temporada de estreia 2026). Scroll storytelling em três atos — **Hero** (retrato 3D em WebGL), **Season** (traçado de circuito animado em canvas) e **Timeline** (linha do tempo "from karts to F1") — seguidos por **Paddock** e **Footer**.

> Projeto vitrine/portfólio. Ver [`AUDIT.md`](AUDIT.md) para o checklist de engenharia (mobile, segurança, performance) antes de usar como peça de entrega profissional.

## Stack

- **Build**: [Vite 8](https://vitejs.dev/)
- **3D**: [three.js](https://threejs.org/) (`WebGLRenderer`, `GLTFLoader` + `DRACOLoader`, `RGBELoader`, `PMREMGenerator`)
- **Scroll suave**: [Lenis](https://github.com/darkroomengineering/lenis)
- **Vanilla JS** (ES modules, sem framework de UI) + **CSS** com custom properties e container queries
- Sem backend — site 100% estático, assets remotos servidos por um CDN de terceiros (`storage.getlayers.ai`)

## Estrutura

```
index.html                 # marcação única (SPA de uma página, sem rotas)
src/
  main.js                  # bootstrap: estilos, Lenis, sticky-stack, init de cada seção
  components/               # um init*(root) por seção (hero, season, timeline, paddock, footer)
  scene/                    # cena WebGL do hero
    HeroScene.js             # classe principal: câmera, luzes, shaders, loop de update
    tier.js                  # detecção de "tier" de dispositivo (mobile/tablet/desktop)
    params.js, fit.js         # parâmetros de animação e ajuste de enquadramento
  lib/                      # utilitários compartilhados (scroll, reveal de texto, ticker de rAF, contornos em canvas, dissolve quadriculado, sticky-stack, lenis, spring)
  data/                     # conteúdo estático (calendário, timeline, circuito, assets base URL)
  styles/                   # um .css por seção + tokens.css (design tokens) + base.css
```

### Conceitos-chave

- **`sticky-stack.js`**: empilha as seções Hero/Season como camadas `position: sticky` que encolhem e escurecem conforme a próxima seção cobre a anterior.
- **`ticker.js`**: um único loop `requestAnimationFrame` compartilhado; cada assinante define seu próprio orçamento de frame (`getFramerate`) — usado pela cena 3D do hero.
- **`tier.js`**: decide a cada resize se o dispositivo é mobile/tablet/desktop (via `matchMedia` de ponteiro e largura) e ajusta DPR, antialiasing, cap de FPS e se o parallax do ponteiro fica ativo.
- **`text-reveal.js`** / **`scroll.js`**: sistema de reveal de texto por palavra/letra e helpers de progresso de scroll via `IntersectionObserver`.

## Como rodar

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # gera dist/
npm run preview   # serve o build de produção localmente
```

Não há variáveis de ambiente — os assets 3D/imagens são carregados diretamente de `ASSET_BASE_URL` (`src/data/assets.js`), hoje apontando para um bucket de terceiros.

## Status conhecido

O craft visual está adiantado, mas o projeto **não está pronto para entrega profissional** sem antes tratar os achados P0 de mobile e performance listados em [`AUDIT.md`](AUDIT.md) (bundle único de ~660 kB, véu de carregamento bloqueado por ~2,3 MB de cena 3D, overflow de layout em tablets/foldables, ausência de headers de segurança).

## Licença

Projeto privado / não licenciado para redistribuição.
