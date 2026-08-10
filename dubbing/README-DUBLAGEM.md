# Dublagem / narração da aula RAQUEST

Cada capítulo do app pode tocar uma **narração** com **vozes diferentes por pessoa**
(narrador, trainer, operador), gerada por **edge-tts** (vozes naturais da Microsoft, grátis).

## Como gerar (no Mac)

Jeito fácil — **duplo clique** em:

```
gerar-dublagem.command
```

Ou pelo terminal:

```bash
cd ~/Desktop/Cursor/raquest/aula-raquest-app/dubbing
pip3 install edge-tts      # só na 1ª vez
brew install ffmpeg        # só na 1ª vez (junta os trechos)
python3 generate_audio.py            # EN + PT
python3 generate_audio.py --lang pt  # só PT
python3 generate_audio.py --rate +8% # um pouco mais rápido
```

Os MP3s saem em `../public/audio/ch{N}-{lang}.mp3` — exatamente onde o app procura.
Recarregue `http://localhost:3000` e clique em **▶ Narração** em qualquer capítulo.

## As vozes (editáveis)

Definidas no topo de `narration.json`, em `voices`. Uma voz por papel:

| Papel | EN | PT-BR |
|---|---|---|
| NARRATOR (guia o aluno) | en-US-GuyNeural | pt-BR-AntonioNeural |
| TRAINER (o Business Analyst dos vídeos) | en-GB-RyanNeural | pt-BR-FabioNeural |
| OPERATOR (visão do operador/SV) | en-US-JennyNeural | pt-BR-FranciscaNeural |

Trocar é só mudar o nome da voz. Pra ver todas as vozes disponíveis:

```bash
edge-tts --list-voices | grep -E "pt-BR|en-US|en-GB"
```

## Editar o roteiro

Tudo em `narration.json` → `chapters[]`. Cada linha tem:

- `s` — o locutor (NARRATOR / TRAINER / OPERATOR) → define a voz
- `t` — o texto que vira fala

Editou o texto? Rode o script de novo — ele regenera só a partir do JSON.

## Ligação com os vídeos

Cada capítulo em `src/content.js` tem um campo `video` com os trechos exatos
(`v`, `ss`, `ee`, `label`) dos 2 vídeos oficiais de treino da Halvotec —
casados a partir de `raquest/legendas/chapters.json`. O app mostra esses
timestamps no bloco **🎬 In the training video**, então dá pra abrir o vídeo
no ponto certo enquanto ouve a narração.
