"""Extract blog posts + listing into content/blog/*. Run: python3 scripts/extract-blog.py <old-repo>"""
import json, re, sys, glob, os
from bs4 import BeautifulSoup
SRC = sys.argv[1]
sq = lambda s: re.sub(r'\s+', ' ', s).strip()
T = lambda t, sel: sq(t.select_one(sel).get_text(' ', strip=True)) if t.select_one(sel) else None
def route(h):
    m = re.match(r'^(?:\.\./|\./|/)*((?:blog-posts/)?[\w-]+)\.html(.*)$', h or '')
    return ('/' + (m.group(1) if m.group(1) != 'index' else '') + m.group(2)) if m else h
def fix_html(html):
    html = re.sub(r'href="([^"]+\.html[^"]*)"', lambda m: f'href="{route(m.group(1)).replace("/building-coding-task-environments", "/blog-posts/coding-task-environments") if route(m.group(1)).startswith("/building") else route(m.group(1))}"', html)
    html = re.sub(r'(src|href)="(?:\.\./)+assets/', r'\1="/assets/', html)
    return html
def asset(p): return re.sub(r'^(\.\./)+', '/', p) if p and not p.startswith(('http', '/')) else p
def meta(t):
    g = lambda sel, at='content': t.select_one(sel).get(at) if t.select_one(sel) else None
    return {'title': t.title.get_text().strip(), 'description': g('meta[name=description]'), 'ogTitle': g('meta[property="og:title"]'), 'ogDescription': g('meta[property="og:description"]'), 'ogImage': g('meta[property="og:image"]'), 'ogUrl': g('meta[property="og:url"]'), 'canonical': g('link[rel=canonical]', 'href')}
def css_rules(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S); out = {}; depth = 0; cur = ''
    for ch in css:
        cur += ch
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: r = sq(cur); out[r.split('{')[0].strip()] = r; cur = ''
    return out

STANDARD = ['coding-task-environments', 'data-flywheel', 'great-preference-annotator', 'hidden-complexity-math-datasets', 'inter-annotator-agreement', 'red-teaming-at-scale']
FEATURED = 'agentic-evaluation-datasets'
posts = {}; related_blurb = {}
for slug in STANDARD:
    t = BeautifulSoup(open(f'{SRC}/blog-posts/{slug}.html', encoding='utf8').read(), 'html.parser')
    for c in t.select('.related-card'):
        s2 = re.sub(r'\.html$', '', c['href']).replace('building-coding-task-environments', 'coding-task-environments')
        related_blurb.setdefault(s2, {'category': T(c, '.related-cat'), 'title': T(c, 'h4'), 'blurb': T(c, 'p')})
    h = t.select_one('.post-hero')
    body = t.select_one('article.post-body')
    posts[slug] = {'slug': slug, 'meta': meta(t),
        'hero': {'image': h.img['src'], 'alt': h.img.get('alt', ''), 'category': T(h, '.post-hero-cat'), 'date': T(h, '.post-hero-date'), 'readTime': T(h, '.post-hero-read'), 'title': T(h, 'h1')},
        'author': {'name': T(t, '.author-name'), 'title': T(t, '.author-title'), 'avatar': asset(t.select_one('.post-author img')['src'])},
        'related': [re.sub(r'\.html$', '', c['href']).replace('building-coding-task-environments', 'coding-task-environments') for c in t.select('.related-card')],
        'rawCss': ''.join(x.get_text() for x in t.find_all('style'))}
    open(f'content/blog/{slug}.html', 'w', encoding='utf8').write(fix_html(body.decode_contents()).strip() + '\n')
# per-post CSS delta against data-flywheel (scoped by converter later)
import subprocess
json.dump(posts, open('/tmp/posts_raw.json', 'w'))
# listing
b = BeautifulSoup(open(f'{SRC}/blog.html', encoding='utf8').read(), 'html.parser')
cards = []
f = b.select_one('a.featured-post')
cards.append({'slug': re.sub(r'\.html$', '', f['href'].split('/')[-1]), 'featured': True, 'filter': f.get('data-cat'), 'image': {'src': f.img['src'], 'alt': f.img.get('alt', '')}, 'badge': T(f, '.post-cat-badge'), 'title': T(f, 'h2'), 'excerpt': T(f, '.featured-post-body > p'), 'author': {'name': T(f, '.author-name'), 'avatar': asset(f.select_one('.post-author-info img')['src'])}, 'date': T(f, '.post-date'), 'readTime': T(f, '.post-read-time')})
for a in b.select('a.post-card'):
    cards.append({'slug': re.sub(r'\.html$', '', a['href'].split('/')[-1]), 'featured': False, 'filter': a.get('data-cat'), 'image': {'src': a.img['src'], 'alt': a.img.get('alt', '')}, 'date': T(a, '.post-card-top .date'), 'category': T(a, '.post-card-top .cat'), 'title': T(a, 'h3'), 'excerpt': T(a, '.post-card-body > p'), 'author': {'name': T(a, '.author-mini span'), 'avatar': asset(a.select_one('.author-mini img')['src'])}, 'readTime': T(a, '.read-min')})
extra = [x for x in b.find_all('section')[1].find_all(recursive=False) if x.name and 'container' not in (x.get('class') or [])]
index = {'cards': cards, 'related': related_blurb, 'standard': STANDARD, 'featured': FEATURED, 'head': {'label': T(b, '.blog-head .section-label'), 'title': b.select_one('.blog-head h1').decode_contents().strip(), 'intro': T(b, '.blog-head p')}}
json.dump(index, open('content/blog/index.json', 'w', encoding='utf8'), ensure_ascii=False, indent=2)
meta_out = {s: {k: v for k, v in p.items() if k != 'rawCss'} for s, p in posts.items()}
json.dump(meta_out, open('content/blog/posts.json', 'w', encoding='utf8'), ensure_ascii=False, indent=2)
print('cards', [(c['slug'], c['filter'], c['featured']) for c in cards]); print('related blurbs', list(related_blurb))
print('after-grid siblings in listing section:', [(e.name, e.get('class')) for e in b.select_one('section[style] .container').find_all(recursive=False)])
