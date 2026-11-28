# Wakarimi

ユーザーの使者として、託された情報と意図を読み手に正確に届けるスキル。情報を問いに合う構造へ整理し、理解・判断・実行に必要な文章・一覧・表・図・グラフを作る。

## できること

- 受容・伝達・習得・保持・理解・理解支援・弁別・和合の八資質で、発信者と読み手を区別した成果物を作る。
- 対象・属性・関係・根拠を分け、分類、体系化、比較、工程、反復を整理する。
- 主構造と補助構造を選び、複数の関係や共有対象を保つ。
- 図の軸・矢印・色・面積を意味と対応させ、欠測や仮説を正確に表す。
- 直接答えられる問いには短く答え、必要なときに図表を使う。

## 使い方

旧称 Structural Visualization の機能を継承したスキル。旧 Wakarimi とは別の実装であり、個人スキルを入れ替える際は旧版と重複して登録しない。

スキルの実行に必要なファイルは `wakarimi/` にまとまっている。

```text
$wakarimi を使って、以下の情報を目的に合う構造と表現に整理してください。
```

入力に「発信者が何を伝えたいか」「誰が何を判断したいか」「対象の情報」「必須条件」があれば、それに合わせて整理する。読み手がユーザーと異なる場合は、会話を知らなくても理解できる成果物にする。足りない値や関係は不明のまま扱う。

- [スキル本体](wakarimi/SKILL.md)
- [適用例](wakarimi/references/examples.md)
- [評価ケース](evals/CASES.md)・[検証結果](evals/RESULTS.md)

## 検証

```sh
node scripts/check-skill.mjs --self-test
node scripts/check-skill.mjs
node scripts/check-source-requests.mjs
```

静的なファイル検査と、実際のスキル適用結果は区別する。人間の理解度が向上するという効果の実証は別の検証課題として扱う。

## 新規チャットから再開

```text
@GitHub https://github.com/dharmainsight/structural-visualization- の開発を再開してください。mainと未マージのPRを確認し、最新のdocs/RESUME.mdおよびdocs/PLAN.mdに従って作業を継続してください。
```

[再開手順](docs/RESUME.md) と [計画・現在地](docs/PLAN.md) を確認する。未マージPRがある場合は、その実際の差分と進捗をmainと照合する。
