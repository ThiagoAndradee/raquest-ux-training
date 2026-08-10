# Personagens Lottie — Tax Withholding 101

O explainer (`src/tax101/`) toca uma animação por cena. **Funciona sem os assets** — se o arquivo não
existir, cai num emoji animado (fallback). Pra ficar dinâmico de verdade, baixe animações grátis do
**LottieFiles** (https://lottiefiles.com/featured — filtre por "Free") e salve aqui com o **nome exato**:

| Arquivo esperado | Cena | Busca sugerida no LottieFiles |
|---|---|---|
| `investor.lottie`     | 1 · Investidor com ações | "investor", "business person", "stocks" |
| `dividend.lottie`     | 2 · Recebe dividendo | "money coming", "cash reward", "coins" |
| `tax-cut.lottie`      | 3 · País retém imposto | "scissors money", "tax", "deduction" |
| `double.lottie`       | 4 · Bitributação (preocupado) | "worried", "stress money", "confused" |
| `handshake.lottie`    | 5 · Acordo/tratado | "handshake deal", "agreement", "contract" |
| `three-paths.lottie`  | 6 · 3 caminhos | "three paths", "choose road", "options" |
| `form-stamp.lottie`   | 7 · Abrir aplicação | "form", "approved stamp", "document sign" |
| `documents.lottie`    | 8 · Imprimir docs | "documents", "printing", "paperwork" |
| `waiting.lottie`      | 9 · Esperando | "waiting", "hourglass", "loading clock" |
| `money-back.lottie`   | 10 · Dinheiro volta | "money back", "success payment", "wallet" |
| `robot-help.lottie`   | 11 · Software/automação | "robot", "AI assistant", "automation" |
| `trophy.lottie`       | 12 · Conclusão | "trophy", "success", "celebration" |

## Como adicionar
1. No LottieFiles, abra a animação grátis → **Download** → escolha **dotLottie** (`.lottie`) — mais leve.
   (Se só tiver **Lottie JSON**, salve como `.json` e troque a extensão no `lottie:` do `tax-content.js`.)
2. Renomeie pro nome da tabela e jogue nesta pasta (`public/lottie/`).
3. `npm run dev` → a cena passa a mostrar o personagem no lugar do emoji.

Dica: dá pra trocar o personagem de qualquer cena só editando o campo `lottie` em `src/tax101/tax-content.js`.
Licença: use animações **Free** (checar atribuição de cada autor no LottieFiles).
