# 施工事例ギャラリー

注文住宅の施工事例を管理・公開するギャラリーアプリです。

## デプロイ手順

### 1. GitHubにアップロード

1. [github.com](https://github.com) でアカウント作成（無料）
2. 「New repository」でリポジトリ作成（名前例: `madori-gallery`）
3. このフォルダをアップロード

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/あなたのID/madori-gallery.git
git push -u origin main
```

### 2. Vercelにデプロイ

1. [vercel.com](https://vercel.com) でアカウント作成（GitHubでログイン）
2. 「Add New Project」→ 作成したGitHubリポジトリを選択
3. 「Environment Variables」に以下を追加：

| 変数名 | 値 |
|--------|-----|
| `VITE_SUPABASE_URL` | `https://lmsmfuzndxaftwmwzqjl.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | SupabaseのLegacy anon key（eyJ...） |
| `VITE_ADMIN_PASSWORD` | 管理画面のパスワード（任意） |

4. 「Deploy」ボタンをクリック → 完了！

### 3. Supabase Storage の設定

1. Supabase → Storage → New bucket
2. 名前: `case-images`
3. Public bucket にチェック ✅
4. 作成後、Policies で「Allow public uploads」を設定

## ローカル開発

```bash
npm install
cp .env.example .env.local
# .env.local にSupabaseの情報を入力
npm run dev
```
