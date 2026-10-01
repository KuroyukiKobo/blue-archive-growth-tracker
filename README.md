# 生徒育成ノート

ブルーアーカイブの所持生徒と現在の育成状況を、ブラウザー内に保存する静的Webアプリです。GitHub Pagesでの公開を想定しています。

## 開発環境

- Node.js 22 LTS
- npm

```powershell
npm install
npm run dev
```

本番ビルドとローカル確認:

```powershell
npm run build
npm run preview
```

## マスターデータ

- `data/master/characters.json`: 生徒、スキル、応用WB属性、装備枠、固有武器・愛用品の定義
- `data/master/equipment-types.json`: 9種の装備カテゴリ
- `data/master/settings.json`: 先生Lv上限、絆上限、解放条件
- `schemas/character-master.schema.json`: 生徒マスターのJSON Schema

マスターは読み取り専用でアプリへ同梱します。プロトタイプはアル1衣装分のみです。公開版の前に日本版の全生徒・衣装違いを登録し、確認日と参照元を更新してください。

マスターの参照整合性を検証するにはPowerShellで実行します。

```powershell
./scripts/validate-master.ps1
```

Windowsの実行ポリシーでブロックされる場合、現在のPowerShellセッション内で本文を読み込んで実行できます。

```powershell
& ([ScriptBlock]::Create([System.IO.File]::ReadAllText((Resolve-Path 'scripts/validate-master.ps1'), [System.Text.Encoding]::UTF8)))
```

## 保存と公開

利用者の所持・育成データは `localStorage` に保存されます。同じブラウザー内でのみ共有され、サイトデータ消去により失われる可能性があります。現時点ではCSVバックアップ機能は未実装です。

GitHub ActionsのPagesワークフローは`main`へのpushでビルド・デプロイします。リポジトリ設定の **Settings > Pages > Build and deployment > Source** を **GitHub Actions** にしてください。
