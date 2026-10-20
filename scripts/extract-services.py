"""Extract the four identical annotation pages into content/services.json (data-driven ServicePage)."""
import json, re, sys
from bs4 import BeautifulSoup
SRC = sys.argv[1]
PAGES = ['3d-lidar', 'audio-annotation', 'nlp-annotation', 'video-annotation']
fix = lambda p: ('/' + re.sub(r'^(\.\./)+', '', p)) if p and not re.match(r'^(/|https?:|data:)', p) else p
inner = lambda el: re.sub(r'\s+', ' ', el.decode_contents()).strip()
txt = lambda el: re.sub(r'\s+', ' ', el.get_text(' ')).strip().replace(' ,', ',').replace(' .', '.')
out = []
for slug in PAGES:
    s = BeautifulSoup(open(f'{SRC}/{slug}.html', encoding='utf8').read(), 'html.parser')
    g = lambda sel, at='content': (s.select_one(sel) or {}).get(at) if s.select_one(sel) else None
    meta = {'title': s.title.get_text().strip(), 'description': g('meta[name=description]'),
            'ogTitle': g('meta[property="og:title"]'), 'ogDescription': g('meta[property="og:description"]'),
            'ogType': g('meta[property="og:type"]'), 'ogUrl': g('meta[property="og:url"]'), 'ogImage': g('meta[property="og:image"]'),
            'canonical': g('link[rel=canonical]', 'href')}
    ph = s.select_one('section.page-head')
    head = {'label': txt(ph.select_one('.section-label')), 'title': inner(ph.h1), 'intro': txt(ph.p)}
    back = s.find('a', string=re.compile('Back to'))
    ss = s.select_one('section.services-section'); sh = ss.select_one('.services-section-head')
    rows = ss.select_one('div[style*="max-width:1000px"]').find_all('div', recursive=False)
    items = []
    for i, row in enumerate(rows):
        kids = row.find_all('div', recursive=False)
        media = next(k for k in kids if k.img); body = next(k for k in kids if k.h3)
        reverse = 'order:2' in (media.get('style') or '')
        ps = body.find_all('p')
        items.append({'reverse': reverse, 'title': txt(body.h3), 'image': {'src': fix(media.img['src']), 'alt': media.img.get('alt', '')},
                      'description': txt(ps[0]), 'useCases': inner(ps[1]) if len(ps) > 1 else ''})
    q = s.select_one('section.quality-section')
    def side(cls):
        c = q.select_one(f'.compare-header.{cls}').parent
        return {'label': txt(c.select_one('.label')), 'heading': txt(c.h3), 'items': [re.sub(r'^[✗✓]\s*', '', txt(li)) for li in c.select('li')]}
    cta = s.select_one('section.cta-form-section'); left = cta.select_one('.cta-form-grid > div'); card = cta.select_one('.form-card'); form = card.form
    sel = form.select_one('select'); ta = form.select_one('textarea')
    bullets = []
    for b in left.select('.cta-bullet'):
        sp = b.find('span'); bullets.append({'icon': txt(sp), 'text': txt(b.find_all(['a', 'span'])[1]), 'href': (b.a or {}).get('href') if b.a else None})
    out.append({'slug': slug, 'meta': meta, 'head': head,
        'back': {'href': '/solutions', 'label': txt(back)},
        'types': {'label': txt(sh.select_one('.section-label')), 'heading': inner(sh.h2), 'intro': txt(sh.p), 'items': items},
        'quality': {'label': txt(q.select_one('.section-label')), 'heading': inner(q.h2), 'intro': txt(q.select_one('.section-intro')), 'bad': side('bad'), 'good': side('good')},
        'cta': {'id': cta.get('id'), 'label': txt(left.select_one('.section-label')), 'heading': inner(left.h2), 'text': txt(left.find('p', recursive=False)), 'bullets': bullets,
                'form': {'title': txt(card.h3), 'intro': txt(card.p), 'action': form['action'], 'subject': form.select_one('input[name=_subject]')['value'],
                         'selectLabel': txt(sel.parent.label), 'selectPlaceholder': txt(sel.find('option', disabled=True)),
                         'options': [txt(o) for o in sel.find_all('option') if not o.has_attr('disabled')],
                         'briefPlaceholder': ta['placeholder'], 'submit': txt(form.button)}}})
json.dump(out, open('content/services.json', 'w', encoding='utf8'), ensure_ascii=False, indent=2)
for o in out: print(o['slug'], len(o['types']['items']), 'items;', len(o['quality']['bad']['items']), 'bad;', len(o['cta']['form']['options']), 'options;', o['cta']['bullets'][0])
