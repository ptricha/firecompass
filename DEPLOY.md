# Deploy FireCompass on Vercel (about 5 minutes)

The app builds and runs with **no environment variables**. The Anthropic key only adds AI-written answers to `/ask`.

## Option A: from the browser (recommended, no CLI)

1. Go to https://vercel.com/new and sign in with GitHub.
2. Import **`ptricha/firecompass`**.
3. Set **Production Branch** to `improve/data` (Settings > Git), or merge `improve/data` into `master` first.
4. (Optional) Settings > Environment Variables: add `ANTHROPIC_API_KEY`, then redeploy.
5. Deploy. Copy the public URL into the Space Apps submission form.

## Option B: CLI (already installed on this machine)

```powershell
vercel login            # opens the browser, one time
vercel --prod           # first run asks to link the project; accept the defaults
vercel env add ANTHROPIC_API_KEY production   # optional
vercel --prod           # redeploy after adding the key
```

## Before submitting (Sunday 15 Nov, 23:59 local time)

- [ ] Public URL opens `/`, `/explorer`, `/simulator`, `/dashboard`, `/ask`, `/references`.
- [ ] `/ask` answers a question with citations.
- [ ] The References field of the submission form lists everything on the in-app `/references` page.
- [ ] Demo uploaded: max 7 slides OR a video of max 30 seconds, in English (or English subtitles).
- [ ] All team members are registered for the same local event (max 6).
