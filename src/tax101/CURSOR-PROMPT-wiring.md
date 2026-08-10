# Prompt pro Cursor — plugar o "Tax Withholding 101" no app

O módulo `src/tax101/` está pronto e é auto-contido: `<Tax101 onExit={fn} initialLang="pt|en" />`.
Falta só dar um jeito de abri-lo a partir da tela inicial do app.

Cole no Cursor:

---

No `aula-raquest-app`, adicione uma segunda trilha na tela inicial: além do curso "Erste Schritte",
oferecer o explainer animado "Tax Withholding — First Steps".

- Importar `Tax101` de `./tax101/Tax101`.
- Na start screen do `App.jsx`, adicionar um botão/card "Tax Withholding 101" ao lado do "Start training".
- Manter um estado tipo `mode` ("course" | "tax101"). Ao escolher o explainer, renderizar
  `<Tax101 initialLang={lang} onExit={() => setMode(null)} />` em tela cheia (ele já traz layout e navegação próprios).
- `onExit` volta pra tela inicial. Não mexer na lógica de XP/badges/certificado do curso — o Tax101 é
  independente.
- Passar o idioma atual (`lang`) como `initialLang` pra manter EN/PT consistente.

Não alterar arquivos de `src/tax101/` nem o conteúdo do curso; só a start screen + o switch de modo.

---

## Antes de rodar
1. `npm install` (adicionei `@lottiefiles/dotlottie-react` ao package.json).
2. Gerar a narração: `dubbing/gerar-narracao-tax.command` (duplo-clique) → cria `public/audio/tax-*.mp3`.
3. (Opcional, deixa lindo) baixar os personagens grátis do LottieFiles pra `public/lottie/` — ver `public/lottie/_README.md`. Sem eles, roda com emoji animado.
4. `npm run dev`.
