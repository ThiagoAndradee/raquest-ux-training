// Mapa dos segmentos subidos no Bunny Stream — gerado por scripts/fetch-bunny.mjs.
// Chave = "{chapterIdx}-{segIdxOneBased}" (mesmo padrão dos nomes de arquivo em public/videos/segments).
// URL do player: https://player.mediadelivery.net/play/<LIB>/<videoId>
export const BUNNY_LIB = "715897";

export const BUNNY_SEGMENTS = {
  "0-1": "5c7f7600-9f06-4efd-af73-1e827185bd94",
  "1-1": "9cc72a11-e767-4b90-8e51-5f6b85ced9ac",
  "2-1": "6f849a21-c135-427c-b92f-6068a83dd034",
  "2-2": "a81e798c-f87b-4c12-a532-4133f2fe5090",
  "3-1": "53d7a67a-a18e-4fb8-8a60-07dc51813992",
  "4-1": "fe6c32a3-df92-4a84-825a-b5525b5ce98c",
  "4-2": "0be73297-7db5-4514-a1fd-79803fff7b09",
  "4-3": "bad86aa6-c8a3-49f5-a7d5-5528c2bd8737",
  "4-4": "8fc7ad9f-e26f-4039-9405-50ab5f6bc9a7",
  "4-5": "5cba7d40-ca5f-4150-bb91-cbbd931589f8",
  "5-1": "6f5ba065-d318-422c-af00-1cc2c4a2b520",
  "5-2": "96530620-6a64-4b33-b2ca-7838831eae00",
  "5-3": "90b6beb1-f20a-4c0e-a8c4-502a740b9896",
  "5-4": "00a54a15-0ace-4621-aecb-a5d6967f1493",
  "6-1": "e3a9e28a-5e83-4399-bcce-e93cef4ead10",
  "6-2": "6373dc12-56f9-4d67-87d4-64e0e0e625e7",
  "6-3": "cc5cebc3-7cb4-4d61-b22d-e1ee66f646b1",
  "7-1": "da2d64e4-6fd2-4747-8571-e5a5060e429e",
  "7-2": "7afd0fa3-bf15-47e8-9f26-0585be910bac",
  "8-1": "8979d831-e81b-4401-9a54-1032fa8334f7",
  "8-2": "a8c28ced-4a60-424c-b059-d1a6c7b97f2b",
  "8-3": "be5f5679-1c91-431f-b3b2-865e10f0f0dc",
  "8-4": "370c9710-fa4f-4545-890d-9dc465e87622",
  "8-5": "fb676a52-6e7e-43fd-9a94-ef3942d84716",
  "9-1": "1014e8c7-ac09-4412-ad93-f20e26db736c",
  "10-2": "30566596-aa6b-49ec-a0a2-849205b444ad",
  "11-1": "2b5ccc16-3b28-4496-95bf-527171dbb937",
};

export const bunnyIdFor = (chapterIdx, segIdxOneBased) =>
  BUNNY_SEGMENTS[`${chapterIdx}-${segIdxOneBased}`] || null;

// `captions=<code>-auto` auto-displays the caption track in the app's language
// (caption short-codes uploaded: "pt" and "en"). No `muted` param → audio stays on.
export const bunnyUrl = (videoId, lang) =>
  `https://player.mediadelivery.net/play/${BUNNY_LIB}/${videoId}?playerjs=true&captions=${lang}-auto`;
