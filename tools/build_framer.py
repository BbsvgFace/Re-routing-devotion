"""Build RerouteDevotionCaseStudy.tsx (a Framer code component) from site/index.html, styles.css, script.js.

- CSS is scoped to .rrd-in (page content) and .rrd-ov (the map viewer, mounted on <body>).
- Width media queries become container queries on the component, vw becomes cqw.
- script.js runs inside init(root, ov, onCanvas) with shimmed globals so everything is cleaned up on unmount.
- Asset paths are swapped for framerusercontent URLs (assets.json).
"""
import json, re, sys
from pathlib import Path

SITE = Path("/home/claude/work/site")
ASSETS = json.loads(Path("/home/claude/work/tools/framer_assets.json").read_text())
URL = {k: "https://framerusercontent.com/images/" + v for k, v in ASSETS.items()}

def swap_assets(s):
    def rep(m):
        key = m.group(1)
        if key not in URL:
            raise SystemExit("missing asset " + key)
        return URL[key]
    return re.sub(r"assets/((?:img|maps)/[\w.-]+\.(?:webp|svg|png))", rep, s)

# ---------------- CSS ----------------
css = (SITE / "styles.css").read_text()
css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)

def parse(s):
    """Split into top-level items: ('rule', sel, body) or ('at', prelude, body|None)."""
    out, i, n = [], 0, len(s)
    while i < n:
        while i < n and s[i] in " \n\t\r":
            i += 1
        if i >= n:
            break
        j = i
        while j < n and s[j] not in "{;":
            j += 1
        head = s[i:j].strip()
        if j < n and s[j] == ";":
            out.append(("at", head, None)); i = j + 1; continue
        depth, k = 0, j
        while k < n:
            if s[k] == "{": depth += 1
            elif s[k] == "}":
                depth -= 1
                if depth == 0: break
            k += 1
        body = s[j + 1:k]
        out.append(("at" if head.startswith("@") else "rule", head, body))
        i = k + 1
    return out

def split_sel(sel):
    parts, depth, cur = [], 0, ""
    for ch in sel:
        if ch == "(": depth += 1
        if ch == ")": depth -= 1
        if ch == "," and depth == 0:
            parts.append(cur); cur = ""
        else:
            cur += ch
    parts.append(cur)
    return [p.strip() for p in parts if p.strip()]

def scope_one(sel, mode):
    """mode: 'both' -> :is(.rrd-in,.rrd-ov) ; 'in' -> .rrd-in ; 'ov' -> .rrd-ov"""
    P = {"both": ":is(.rrd-in,.rrd-ov)", "in": ".rrd-in", "ov": ".rrd-ov"}[mode]
    if sel in (":root", "html", "body"):
        return P
    if sel.startswith("body.v-open"):
        return sel  # global scroll lock while the viewer is open
    m = re.match(r"^(?:html)?\.js(\s.*)$", sel)
    if m:
        return (".rrd-in" if mode != "ov" else ".rrd-ov") + ".js" + m.group(1)
    m = re.match(r"^html:not\(\.js\)(\s.*)$", sel)
    if m:
        return ".rrd-in:not(.js)" + m.group(1)
    if sel.startswith("html ") or sel.startswith("body "):
        return P + " " + sel.split(" ", 1)[1]
    if sel.startswith("*"):
        return P + " " + sel
    return P + " " + sel

def scope(sel, mode):
    return ",".join(dict.fromkeys(scope_one(s, mode) for s in split_sel(sel)))

def vw(body):
    return re.sub(r"(\d*\.?\d+)vw", r"\1cqw", body)

out = []
for kind, head, body in parse(css):
    if kind == "rule":
        out.append(scope(head, "both") + "{" + vw(body) + "}")
    elif head.startswith("@media") and re.search(r"(min|max)-width", head):
        inner = parse(body)
        cond = head[len("@media"):].strip()
        a = "".join(scope(h, "in") + "{" + vw(b) + "}" for k, h, b in inner if k == "rule")
        o = "".join(scope(h, "ov") + "{" + b + "}" for k, h, b in inner if k == "rule")
        out.append("@container rrd " + cond + "{" + a + "}")
        out.append("@media " + cond + "{" + o + "}")
    elif head.startswith("@media"):
        inner = parse(body)
        out.append(head + "{" + "".join(scope(h, "both") + "{" + vw(b) + "}" for k, h, b in inner if k == "rule") + "}")
    else:
        out.append(head + ("{" + body + "}" if body is not None else ";"))

extra = (
    ".rrd-in .sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}"
    ".rrd-in{position:relative;width:100%;overflow-x:clip}"
    ".rrd-in .nav{display:none}"
)
CSS = swap_assets(extra + "".join(out))
CSS = re.sub(r"\s*\n\s*", "", CSS)

# ---------------- HTML ----------------
html = (SITE / "index.html").read_text()
body = html.split("<body>", 1)[1].split("<script", 1)[0]
body = re.sub(r'<nav id="nav".*?</nav>', "", body, flags=re.S)
vm = re.search(r'<div class="viewer" id="viewer".*?</div>\s*(?=$)', body, flags=re.S)
vstart = body.index('<div class="viewer" id="viewer"')
OV = body[vstart:].strip()
body = body[:vstart]
body = body.replace("<h1>Re-Routing Devotion</h1>", '<h1 class="sr-only">Re-Routing Devotion</h1>', 1)
body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
body = re.sub(r">\s+<", "> <", body).strip()
OV = re.sub(r">\s+<", "> <", OV)
HTML = swap_assets(body)
OV_HTML = swap_assets(OV)

# ---------------- JS ----------------
js = (SITE / "script.js").read_text()
js = js.strip()
assert js.startswith("(() => {") and js.endswith("})();"), "unexpected script wrapper"
js = js[len("(() => {"):-len("})();")]
js = js.replace("'use strict';", "", 1)
js = js.replace("document.documentElement.classList.add('js');", "if (!onCanvas) root.classList.add('js');", 1)
js = re.sub(r"const \$ = \(s, r = document\) => r\.querySelector\(s\);\n", "", js, count=1)
js = re.sub(r"const \$\$ = \(s, r = document\) => \[\.\.\.r\.querySelectorAll\(s\)\];\n", "", js, count=1)
assert "const $ =" not in js and "const $$ =" not in js, "selector helpers not replaced"
js = js.replace("const M = 'assets/maps/';", "", 1)
js = js.replace(
    "MAPS.forEach(m => { m.src = M + (m.id === 'giga' ? 'giga-map' : m.id) + '.webp'; m.thumb = M + (m.id === 'giga' ? 'giga-map' : m.id) + '-thumb.webp'; });",
    "MAPS.forEach(m => { const n = m.id === 'giga' ? 'giga-map' : m.id; m.src = AS['maps/' + n + '.webp']; m.thumb = AS['maps/' + n + '-thumb.webp']; });",
    1,
)
assert "AS['maps/'" in js, "map src line not replaced"
js = swap_assets(js)

AS = {k: v for k, v in URL.items() if k.startswith("maps/")}

PRE = r"""
    const ac = new AbortController()
    const dead = { v: false }
    const obs: any[] = []
    const W: any = window
    const D: any = window.document
    const sig = (o?: any) => (typeof o === "object" && o ? { ...o, signal: ac.signal } : { capture: !!o, signal: ac.signal })
    const addEventListener = (t: string, f: any, o?: any) => W.addEventListener(t, f, sig(o))
    const requestAnimationFrame = (f: any) => (dead.v ? 0 : W.requestAnimationFrame((t: number) => { if (!dead.v) f(t) }))
    const setTimeout = (f: any, ms?: number) => W.setTimeout(() => { if (!dead.v) f() }, ms)
    const clearTimeout = (id: any) => W.clearTimeout(id)
    class IntersectionObserver extends W.IntersectionObserver { constructor(cb: any, o?: any) { super(cb, o); obs.push(this) } }
    class ResizeObserver extends W.ResizeObserver { constructor(cb: any) { super(cb); obs.push(this) } }
    const document: any = {
        documentElement: root,
        body: D.body,
        readyState: "complete",
        createElement: (t: string) => D.createElement(t),
        addEventListener: (t: string, f: any, o?: any) => D.addEventListener(t, f, sig(o)),
        get activeElement() { return D.activeElement },
    }
    const $ = (s: string, r?: any): any => (r ? r.querySelector(s) : root.querySelector(s) || ov.querySelector(s))
    const $$ = (s: string, r?: any): any[] => (r ? [...r.querySelectorAll(s)] : [...root.querySelectorAll(s), ...ov.querySelectorAll(s)])
"""

POST = r"""
    return () => {
        dead.v = true
        ac.abort()
        obs.forEach((o) => o.disconnect())
        D.body.classList.remove("v-open")
    }
"""

FONT_URL = "https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wdth,wght@6..144,25..151,1..1000&family=Noto+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap"

tsx = f"""// @ts-nocheck
// Re-Routing Devotion case study (IIT Kanpur, RSD15).
// Generated by tools/build_framer.py from the standalone site (index.html, styles.css, script.js).
// Edit the site and rebuild, or edit the strings below directly in Framer.
import {{ useEffect, useRef }} from "react"
import {{ RenderTarget }} from "framer"

const FONT_URL: string = {json.dumps(FONT_URL)}
const CSS: string = {json.dumps(CSS, ensure_ascii=False)}
const HTML: string = {json.dumps(HTML, ensure_ascii=False)}
const OV_HTML: string = {json.dumps(OV_HTML, ensure_ascii=False)}
const AS: Record<string, string> = {json.dumps(AS)}

function init(root: HTMLElement, ov: HTMLElement, onCanvas: boolean): () => void {{
{PRE}
    try {{
{js}
    }} catch (err) {{
        console.error("[RerouteDevotion]", err)
    }}
{POST}
}}

/**
 * @framerIntrinsicWidth 1200
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function RerouteDevotionCaseStudy(props: {{ style?: React.CSSProperties }}) {{
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {{
        const root = ref.current
        if (!root) return
        const ov = document.createElement("div")
        ov.className = "rrd-ov"
        ov.innerHTML = OV_HTML
        document.body.appendChild(ov)
        const dispose = init(root, ov, RenderTarget.current() === RenderTarget.canvas)
        return () => {{ dispose(); ov.remove() }}
    }}, [])

    return (
        <div style={{{{ ...props.style, width: "100%", containerType: "inline-size", containerName: "rrd" }} as React.CSSProperties}}>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={{FONT_URL}} />
            <style dangerouslySetInnerHTML={{{{ __html: CSS }}}} />
            <div ref={{ref}} className="rrd-in" dangerouslySetInnerHTML={{{{ __html: HTML }}}} />
        </div>
    )
}}
"""
Path("/home/claude/work/framer/RerouteDevotionCaseStudy.tsx").parent.mkdir(exist_ok=True)
Path("/home/claude/work/framer/RerouteDevotionCaseStudy.tsx").write_text(tsx)
# also a plain test harness to check the transformed output in a browser
Path("/home/claude/work/framer/parts.json").write_text(json.dumps({"CSS": CSS, "HTML": HTML, "OV": OV_HTML, "JS": js, "PRE": PRE, "POST": POST, "FONT": FONT_URL}))
print("tsx bytes", len(tsx), "css", len(CSS), "html", len(HTML), "ov", len(OV_HTML), "js", len(js))
