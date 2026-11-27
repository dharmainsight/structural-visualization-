# Structural Visualization

情報を問いに合う構造へ整理し、理解と判断に必要な文章・一覧・表・図・グラフを作るスキル。

## できること

- 対象・属性・関係・根拠を分け、分類、体系化、比較、工程、反復を整理する。
- 主構造と補助構造を選び、複数の関係や共有対象を保つ。
- 図の軸・矢印・色・面積を意味と対応させ、欠測や仮説を正確に表す。
- 直接答えられる問いには短く答え、必要なときに図表を使う。

## 使い方

スキルの実行に必要なファイルは `structural-visualization/` にまとまっている。

```text
$structural-visualization を使って、以下の情報を目的に合う構造と表現に整理してください。
```

入力に「誰が何を判断したいか」「対象の情報」「必須条件」があれば、それに合わせて整理する。足りない値や関係は不明のまま扱う。

- [スキル本体](structural-visualization/SKILL.md)
- [適用例](structural-visualization/references/examples.md)
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
