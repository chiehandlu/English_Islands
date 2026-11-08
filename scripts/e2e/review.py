"""
端對端驗證：拼字練習 → 點亮三座課程島 → 複習島開放 → 文法複習三星。
用法（先 `npm run build:artifact`，把 out/ 放到任一靜態主機，或直接 `npx serve out`）：
  BASE=http://localhost:3000/ python3 scripts/e2e/review.py
需要 playwright 與 Chrome（headless，swiftshader）。swiftshader 下頁面很慢，所以一律用 dispatch_event 點擊。
"""
import asyncio, json, os, re
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
U = json.load(open(os.path.join(ROOT, "src/content/units/u03.json")))
Q = {q["id"]: q for isl in U["islands"] for b in isl["buildings"] for q in b["questions"]}
# 拼字練習的題庫：單字卡 zh -> en
VOCAB = {}
for isl in U["islands"]:
    if isl["kind"] != "vocab": continue
    for b in isl["buildings"]:
        for c in b.get("cards", []):
            if re.fullmatch(r"[a-z][a-z' ]*", c["en"], re.I) and len(c["en"].replace(" ", "")) <= 14:
                VOCAB[c["zh"]] = c["en"].lower()

BASE = os.environ.get("BASE", "http://localhost:4174/_f/v5/")
SHOTS = os.environ.get("SHOTS", "/tmp/shots")
os.makedirs(SHOTS, exist_ok=True)

async def answer_current(page, force_wrong=False):
    prompt = await page.locator("p.text-2xl").first.inner_text()
    if await page.locator(".tile").count():
        # 拼字（含拼字練習）
        ans = VOCAB.get(prompt)
        if ans is None:
            cands = [q for q in Q.values() if q["type"] == "spell" and q.get("prompt") == prompt]
            ans = cands[0]["answer"]
        letters = ans.replace(" ", "")
        if force_wrong:
            # 故意拼錯：把字母順序倒過來（若全部相同字母就改按其他 tile）
            tiles = await page.locator(".tile").all_inner_texts()
            letters = "".join(reversed(letters))
            if letters == ans.replace(" ", ""):
                letters = letters[1:] + (tiles[0] if tiles[0] != letters[0] else tiles[1])
        for ch in letters:
            await page.locator(".tile:not([disabled])", has_text=ch).first.dispatch_event("click")
        await page.locator("button:has-text('確定')").dispatch_event("click")
        return ("spell", prompt)
    cands = [q for q in Q.values() if q.get("prompt") == prompt]
    if not cands:
        raise RuntimeError("no question for prompt: " + prompt)
    q = cands[0]
    if q["type"] in ("choice", "listen"):
        for c in cands:
            if c["type"] not in ("choice", "listen"): continue
            opts = c["options"]
            good = opts[c["answer"]]
            target = good if not force_wrong else next(o for o in opts if o != good)
            btn = page.locator(".answer-button", has_text=target)
            if await btn.count() > 0:
                await btn.first.dispatch_event("click"); return (c["type"], c["id"])
    if q["type"] == "yesno":
        want = q["answer"] if not force_wrong else not q["answer"]
        await page.locator(".answer-button:has-text('Yes')" if want else ".answer-button:has-text('No')").dispatch_event("click"); return ("yesno", q["id"])
    if q["type"] == "order":
        texts = " | ".join(await page.locator(".word-chip").all_inner_texts())
        for c in cands:
            if c["type"] == "order" and all(t in texts for t in c["tokens"]):
                q = c; break
        toks = list(q["tokens"])
        if force_wrong: toks = toks[::-1]
        for tok in toks:
            await page.locator(".word-chip:not([disabled])", has_text=re.compile("^" + re.escape(tok) + "$")).first.dispatch_event("click")
        await page.locator("button:has-text('確定')").dispatch_event("click"); return ("order", q["id"])
    if q["type"] == "match":
        # 同 prompt 可能多題（連連看），挑左邊字都在畫面上的那一題
        texts = " | ".join(await page.locator(".match-button").all_inner_texts())
        for c in cands:
            if c["type"] == "match" and all(l in texts for l, _ in c["pairs"]):
                q = c; break
        pairs = list(q["pairs"])
        if force_wrong:
            rs = [r for _, r in pairs]; rs = rs[1:] + rs[:1]
            pairs = [(l, r) for (l, _), r in zip(pairs, rs)]
        for l, r in pairs:
            await page.locator(".match-button", has_text=re.compile("^\\s*" + re.escape(l) + "[\\s\\S]{0,4}$")).first.dispatch_event("click")
            await page.locator(".match-button", has_text=re.compile("^" + re.escape(r) + "$")).last.dispatch_event("click")
        await page.locator("button:has-text('確定')").dispatch_event("click"); return ("match", q["id"])
    raise RuntimeError("unhandled " + q["type"])

async def run_building(page, bid, wrong_first=0, shot=None, shot_first=None):
    await page.evaluate(f"location.hash = '#building={bid}'")
    await page.wait_for_timeout(1200)
    if shot: await page.screenshot(path=shot)
    await page.locator("button.btn-primary", has_text="挑戰").first.click()
    await page.wait_for_selector("p.text-2xl", timeout=10000)
    await page.wait_for_timeout(300)
    if shot_first: await page.screenshot(path=shot_first)
    for i in range(12):
        if await page.locator("text=回到島上").count(): break
        import time; t0=time.time()
        r = await answer_current(page, force_wrong=i < wrong_first)
        print("  answered", bid, i, r, round(time.time()-t0,1), flush=True)
        try:
            await page.wait_for_selector("text=下一題", timeout=5000)
        except Exception:
            await page.screenshot(path=SHOTS + "/fail.png")
            print(await page.locator("section").last.inner_text()); raise
        await page.locator("button", has_text="下一題").dispatch_event("click")
        await page.wait_for_timeout(250)
    text = await page.locator("section").last.inner_text()
    await page.locator("button", has_text="回到島上").dispatch_event("click")
    await page.wait_for_timeout(600)
    return text

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"), args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--no-sandbox"])
        page = await (await b.new_context(viewport={"width":1180,"height":820})).new_page()
        errs=[]; page.on("pageerror", lambda e: errs.append(str(e)))
        page.set_default_timeout(8000)
        await page.goto(BASE, wait_until="domcontentloaded"); await page.wait_for_timeout(2500)
        await page.fill("input[placeholder*='名字']", "小測")
        await page.wait_for_timeout(300)
        await page.click("text=出發"); await page.wait_for_timeout(2000)
        await page.screenshot(path=SHOTS + "/r0-overview.png")
        # 加速：測答題時把 3D canvas 藏起來（swiftshader 很慢）
        await page.add_style_tag(content="#hide-canvas canvas{display:none}")
        await page.evaluate("document.body.id='hide-canvas'")

        # 1) 複習島一開始是鎖的
        await page.evaluate("location.hash = '#island=u03-review'"); await page.wait_for_timeout(1500)
        await page.screenshot(path=SHOTS + "/r1-review-locked.png")
        locked_text = await page.locator("section").first.inner_text()
        print("review locked card:", "複習島就會開放" in locked_text)

        # 2) 拼字練習：先故意錯 3 題
        done = await run_building(page, "u03-spell", wrong_first=3, shot=SHOTS + "/r2-spell-card.png", shot_first=SHOTS + "/r3-dictation.png")
        print("spell run 1:", done.splitlines()[1:3])
        # 再進一次，建築卡應顯示常拼錯的字
        await page.evaluate("location.hash = '#building=u03-spell'"); await page.wait_for_timeout(1200)
        card = await page.locator("section").first.inner_text()
        print("dictation card mentions trouble:", "常拼錯的字會先出" in card)
        await page.screenshot(path=SHOTS + "/r4-spell-card-trouble.png")

        # 3) 把三座課程島全部點亮（文法島一棟故意錯 2 題，讓複習島有常錯題）
        for isl in U["islands"]:
            for bl in isl["buildings"]:
                wrong = 2 if bl["id"] == "u03-g1" else 0
                await run_building(page, bl["id"], wrong_first=wrong)
        # 拼字練習也要亮（已經亮了，第一次有 >=50%？ 3 錯/10 -> 70% 亮）
        await page.evaluate("document.body.id=''")
        await page.evaluate("location.hash = '#island=u03-review'"); await page.wait_for_timeout(2500)
        await page.screenshot(path=SHOTS + "/r5-review-open.png")
        await page.evaluate("document.body.id='hide-canvas'")
        open_text = await page.locator("section").first.inner_text()
        print("review open:", "常答錯" in open_text, "| lock gone:", "複習島就會開放" not in open_text)

        # 4) 文法複習：建築卡顯示常錯題；答完材料是木材／磚塊
        await page.evaluate("location.hash = '#building=u03-review-grammar'"); await page.wait_for_timeout(1200)
        card = await page.locator("section").first.inner_text()
        print("grammar review card:", [l for l in card.splitlines() if "常答錯" in l or "會掉" in l])
        await page.screenshot(path=SHOTS + "/r6-review-grammar-card.png")
        done = await run_building(page, "u03-review-grammar")
        print("grammar review done:", done.splitlines()[1:4])
        await page.evaluate("document.body.id=''"); await page.wait_for_timeout(2500)
        await page.screenshot(path=SHOTS + "/r7-after-review.png")

        st = await page.evaluate("""(() => { const s = JSON.parse(localStorage.getItem('english-island-save')).state;
           const stats = Object.entries(s.questionStats);
           return {version: JSON.parse(localStorage.getItem('english-island-save')).version, stats: stats.length,
                   wrong: stats.filter(([,v]) => v.wrong>0).length, mistakes: s.mistakes.length,
                   reviewStars: ['u03-review-vocab','u03-review-grammar','u03-review-reading'].map(id => s.progress[id]?.stars ?? 0),
                   inv: s.farm.inventory}; })()""")
        print(st); print("errors:", errs or "none")
        await b.close()
asyncio.run(main())
