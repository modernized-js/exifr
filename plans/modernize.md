# exifr モダン化計画 (v8.0)

## ゴール

`https://github.com/modernized-js/` の方針に倣って、本リポジトリ (`modernized-js/exifr` fork) を以下の観点でモダン化する。

- TypeScript 化 (`src/**/*.mjs` → `src/**/*.ts`)
- ESLint 9 (flat config) + Prettier 導入
- テストランナーを `mocha` + `chai` から **`node:test` + `node:assert`** へ移植
- CI を `.travis.yml` から **GitHub Actions** へ刷新 (Linux/macOS/Windows × Node 22)
- 依存パッケージ最新化 (rollup 2→4, c8 7→10, mocha 8→11, chai 4→5 ほか)
- IE/旧ブラウザ向け polyfill 廃止 → **v8.0 メジャーバンプ**

## 互換ポリシー (必須要件)

| 項目 | 方針 |
|---|---|
| **公開 API** | 完全互換。`parse() / gps() / orientation() / rotation() / thumbnail() / thumbnailUrl() / sidecar() / Exifr` クラス、全オプション、`tagKeys / tagValues / tagRevivers / createDictionary / extendDictionary` 等を含めて壊さない |
| **動作** | 既存テスト 30 本 (`test/**/*.spec.mjs`) が **全部緑のまま**をマージ条件にする |
| **ビルド成果物** | `dist/{mini,lite,full}.{umd.js,esm.mjs}` の 6 バリアント維持 |
| **Node サポート** | **Node 22+** (= 開発・CI・配布対象すべて) |
| **ブラウザサポート** | **ES2020+ をサポートするモダンブラウザ**。IE11 / 旧 Edge は v7 系で凍結 |

## 非互換 (= v7 → v8)

- IE11 / 旧 Edge (Chromium 化前) のサポート終了
- `src/polyfill/ie.mjs` および rollup の `replaceBuiltinsWithIePolyfills` 削除
- バンドルターゲットが ES5 → ES2020+
- Node 14/16/18/20 のサポート終了 (旧来の利用者向けには v7.x を案内)

## PR 分割 (細粒度)

ユーザー要望により細かく刻む。各 PR は単独でマージ可能・既存テスト緑を必須条件とする。
ベースブランチは `master`、各 PR は `modernize/<topic>` ブランチで切る。

### Phase 1: インフラ整備 (.mjs のまま挙動を変えない)

| # | PR タイトル | 内容 |
|---|---|---|
| 1 | `chore: add GitHub Actions CI` | `.github/workflows/ci.yml` 追加 (Linux/macOS/Windows × Node 22)。`.travis.yml` 削除。`yarn install` / `yarn build` / `yarn test` を実行 |
| 2 | `chore: switch to yarn` | `package.json` に `packageManager` 追加、`yarn.lock` 生成、README の npm コマンド表記を yarn 併記 |
| 3 | `chore: add ESLint 9 flat config + Prettier` | `eslint.config.js`、`.prettierrc`、`yarn lint` `yarn format` 追加。既存 `.mjs` を対象に最低限ルールで導入。auto-fix のみ適用、CI へ組み込み |
| 4 | `chore: add Dependabot config` | `.github/dependabot.yml` (npm + GitHub Actions weekly) |

### Phase 2: 依存最新化 (.mjs のまま、機能・出力 byte 互換に近づける)

| # | PR タイトル | 内容 |
|---|---|---|
| 5 | `chore(deps): rollup 2 → 4` | `rollup-plugin-babel` → `@rollup/plugin-babel`、`rollup-plugin-terser` → `@rollup/plugin-terser`、`rollup-plugin-notify` 廃止。バンドル diff を PR 本文に貼って人間レビュー |
| 6 | `chore(deps): mocha 8 → 11, chai 4 → 5` | ESM 対応版 chai 5 へ。テストの `import` 構文を必要に応じて調整 |
| 7 | `chore(deps): c8 7 → 10` | カバレッジ設定再確認 |
| 8 | `chore: replace coveralls with codecov action` | GitHub Actions ワークフロー上で coverage upload |

### Phase 3: IE サポート削除 (v8 への準備、ここから v8 系)

| # | PR タイトル | 内容 |
|---|---|---|
| 9 | `feat!: drop IE polyfills and Babel pipeline` | `src/polyfill/` 削除、rollup の polyfill 置換ロジック削除、`@babel/*` 16 パッケージ削除、ターゲット ES2020+。バンドル size 縮小を CHANGELOG に記録 |

### Phase 4: TypeScript 化 (機能変更ゼロのリファクタ)

| # | PR タイトル | 内容 |
|---|---|---|
| 10 | `feat: setup TypeScript toolchain` | `tsconfig.json`、`typescript`、`@rollup/plugin-typescript`、`yarn typecheck` 追加。`.mjs` と `.ts` 同居可能に。`allowJs` で段階移行 |
| 11 | `refactor: TS化 src/util/` (8 ファイル) | `BufferView`, `DynamicBufferView`, `helpers`, `import`, `platform`, `debug`, `BufferView-get64` |
| 12 | `refactor: TS化 src/dicts/` (15 ファイル) | データ辞書のみ。機械的 |
| 13 | `refactor: TS化 src/file-readers/` | `UrlFetcher`, `BlobReader`, `FsReader` 等 |
| 14 | `refactor: TS化 src/file-parsers/` | `jpeg`, `png`, `heif`, `tiff`, `isobmff` |
| 15 | `refactor: TS化 src/segment-parsers/` | exif/icc/iptc/xmp/jfif など |
| 16 | `refactor: TS化 src/highlevel/` | `gps`, `orientation`, `thumb`, `sidecar`, `disableAllOptions` |
| 17 | `refactor: TS化 src/options.mjs と src/tags.mjs` | |
| 18 | `refactor: TS化 src/parser.mjs / reader.mjs / plugins.mjs` | |
| 19 | `refactor: TS化 src/Exifr.mjs / core.mjs / bundles/` | エントリポイント。`allowJs` 解除可能になる |
| 20 | `feat: emit .d.ts from TS source` | 手書き `index.d.ts` を削除、TS emit を `package.json#types` に切り替え。**`@arethetypeswrong/cli` で旧 d.ts と新 d.ts の API 互換性を確認**(壊れていればその PR で修正) |

### Phase 5: テスト移植 (mocha → node:test)

mocha と node:test 並走期間を設けて段階移行する。

| # | PR タイトル | 内容 |
|---|---|---|
| 21 | `test: setup node:test runner alongside mocha` | `yarn test:node` 追加、最小の spec (例: `BufferView.spec.mjs`) を `node:test` で書き直してパイロット |
| 22 | `test: migrate util/buffer-related specs` | 5 本程度 |
| 23 | `test: migrate format-related specs` (icc/iptc/jfif/xmp) | 5–6 本 |
| 24 | `test: migrate tiff/reader/options specs` | 5 本程度 |
| 25 | `test: migrate highlevel/fixtures/issues specs` | 5–6 本 |
| 26 | `test: migrate bundle specs` | mini/lite/full + webpack |
| 27 | `chore: remove mocha and chai` | `yarn test` を `node --test` に切替、devDeps から mocha/chai 削除 |

### Phase 6: リリース

| # | PR タイトル | 内容 |
|---|---|---|
| 28 | `docs: update README and CHANGELOG for v8` | 非互換変更を明示、Node 22+ 要件、IE 廃止アナウンス、移行ガイド (v7 系を使う案内) |
| 29 | `release: 8.0.0` | tag + npm publish (手動でユーザー承認後) |

合計 **29 本**。Phase 4 の TS 化 (#11–#20) と Phase 5 のテスト移植 (#21–#27) はファイル数によりさらに分割される可能性あり。

## 動作互換の検証方法

各 Phase 完了時に以下を確認:

1. `yarn build` が成功し `dist/{mini,lite,full}.{umd.js,esm.mjs}` 6 ファイルが生成される
2. 既存テスト 30 本が全部緑
3. Phase 4 完了時、emit された `.d.ts` を旧 `index.d.ts` と diff し、API 表面の差分を全件レビュー
4. Phase 3 / Phase 4 完了時、`dist/full.umd.js` のバンドルサイズを記録 (期待: 削減)

## リスクと対策

| リスク | 対策 |
|---|---|
| TS 化で公開 API の型が微妙に変わる (`parsers = {}` 等) | `@arethetypeswrong/cli` + 旧 d.ts との目視 diff で検出 |
| rollup 4 でバンドル出力差分 | バイトレベル一致は不要、サイズ ±5% を warn 閾値とする |
| chai → assert で式の表現力ロス (`to.deep.equal`, `to.have.property`) | `node:assert/strict` の `deepStrictEqual` で大半カバー、足りない箇所は helper 関数を作る |
| Phase 5 中に mocha と node:test の二重メンテになる | Phase 5 は短期決戦で進める (#21–#27 連続マージ) |
| マージ順序の依存 | Phase 単位で順序固定。同 Phase 内は並列可 |

## ブランチ・PR 運用

- ベース: `master`
- 各 PR は `modernize/<topic>` ブランチ (例: `modernize/ci`, `modernize/eslint`, `modernize/ts-util`)
- マージ方式: **merge commit** (squash 不可、リポジトリ既定ルールに従う)
- 各 PR の本文には:
  - **Summary** (AI 生成のため最上部)
  - **Items to Confirm / Review** (人間レビュアー向け注目点)
  - **User Prompt** (元の依頼の要約)
  - 変更内容、確認手順

## 決定済み / 保留事項

- **保留**: Phase 1–2 までを v7.2.x として一度リリースするか — リリースタイミングは後で判断する。当面は v8.0 に向けて順次マージしていき、必要になった時点で再検討
- **決定 (対象外)**: `homepage/` 配下のデモページは **動作している限り現状維持**。モダン化スコープに含めない。Phase 4 の TS 化が `homepage/` を壊した場合のみ最低限の追従修正を行う
- **決定 (後回し)**: `examples/` `benchmark/` `debug/` のメンテ方針 — 計画本体には含めない。Phase 6 (リリース) まで終わって余裕があれば追加 PR で対応する。Phase 4 の TS 化が動作を壊さない限り放置
