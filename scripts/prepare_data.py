"""Turn the ascend lookup results into the website dataset (private/founders.json).

Usage:  python3 scripts/prepare_data.py <lookup-data-dir>
The lookup-data dir holds people.json, pitchbook.json, website_founders.json, website_drawers.json and
final_classification.json (written by the Excel builder). Output is plaintext constituent data, so it goes to
private/ (git-ignored). Run `npm run encrypt` afterwards to produce the encrypted public/data/vault.json.
"""
import json, os, re, sys
FETCH = '--fetch-logos' in sys.argv
sys.argv = [a for a in sys.argv if a != '--fetch-logos']

D = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "private", "founders.json")
SF = "https://northeasternuniversity3.lightning.force.com"

people = {p["pid"]: p for p in json.load(open(os.path.join(D, "people.json")))}
pb_rows = {str(r["#"]): r for r in json.load(open(os.path.join(D, "pitchbook.json")))}
web_rows = {w["id"]: w for w in json.load(open(os.path.join(D, "website_founders.json")))}
drawers = {d["id"]: d for d in json.load(open(os.path.join(D, "website_drawers.json")))}
final = json.load(open(os.path.join(D, "final_classification.json")))

LABELS = ["Email", "Other emails", "Based in", "Current title", "Current company", "LinkedIn", "School", "Degree",
          "Field", "Years", "Confidence", "Company", "Tier", "Sector", "Industry", "Headquarters", "Employees",
          "Founded", "Type", "Total funding", "Last round", "Investors", "Revenue", "Status", "Website",
          "LinkedIn page", "Crunchbase"]

def parse_drawer(text):
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    out = {"headline": lines[1] if len(lines) > 1 else ""}
    i = lines.index("Person") + 1 if "Person" in lines else 0
    while i < len(lines):
        l = lines[i]
        if l in LABELS and i + 1 < len(lines):
            v = lines[i + 1]
            if l == "Company":
                out["Company"] = v
                if i + 2 < len(lines) and lines[i + 2] not in LABELS:
                    out["Company role"] = lines[i + 2]
                    i += 1
            elif l not in out:
                out[l] = v
            i += 2
        else:
            i += 1
    return out

def clean(v):
    v = (v or "").strip() if isinstance(v, str) else v
    return "" if v in (None, "None", "—", "-") else v

def pitchbook_block(rec):
    r = pb_rows.get(str(rec["row"]), {})
    addr = ", ".join(x for x in [clean(r.get("Address Line 1")), clean(r.get("Address Line 2")), clean(r.get("City")),
                                  clean(r.get("State/Province")), clean(r.get("Post Code")), clean(r.get("Country/Territory/Region"))] if x)
    return {"row": rec["row"], "name": clean(r.get("People")), "position": clean(r.get("Primary Position")),
            "company": clean(r.get("Primary Company")), "companyType": clean(r.get("Primary Company Type")),
            "companyWebsite": clean(r.get("Primary Company Website")), "email": clean(r.get("Email")), "phone": clean(r.get("Phone")),
            "linkedin": clean(r.get("LinkedIn URL")), "location": clean(r.get("Location")), "address": addr,
            "city": clean(r.get("City")), "state": clean(r.get("State/Province")), "country": clean(r.get("Country/Territory/Region")),
            "roles": clean(r.get("Roles")), "boardSeats": clean(r.get("Board Seats")), "dealRoles": clean(r.get("Deal Roles"))}

def website_block(rec):
    w = web_rows.get(rec["row"], {})
    d = parse_drawer(drawers.get(rec["row"], {}).get("text", ""))
    emails = [e.strip() for e in ([d.get("Email", "")] + d.get("Other emails", "").split(";")) if e.strip() and "@" in e]
    return {"id": rec["row"], "name": w.get("name", ""), "title": w.get("title", ""), "headline": d.get("headline", ""),
            "currentTitle": d.get("Current title", ""), "currentCompany": d.get("Current company", ""),
            "basedIn": d.get("Based in", ""), "emails": emails, "linkedin": d.get("LinkedIn", ""),
            "degree": d.get("Degree", "") or w.get("degree", ""), "degreeShort": w.get("degree", ""), "classOf": w.get("cls", ""),
            "field": d.get("Field", ""), "years": d.get("Years", ""), "confidence": d.get("Confidence", ""),
            "company": d.get("Company", "") or w.get("company", ""), "companyRole": d.get("Company role", ""),
            "tier": d.get("Tier", "") or " ".join(w.get("tier", "").split()[:2]),
            "sector": d.get("Sector", "") or w.get("sector", ""), "industry": d.get("Industry", ""),
            "hq": d.get("Headquarters", "") or clean(w.get("hq")), "employees": d.get("Employees", "") or w.get("staff", ""),
            "founded": d.get("Founded", ""), "companyType": d.get("Type", ""), "funding": d.get("Total funding", "") or w.get("funding", ""),
            "stage": w.get("stage", ""), "lastRound": d.get("Last round", ""), "investors": d.get("Investors", ""),
            "revenue": d.get("Revenue", ""), "status": d.get("Status", ""), "website": d.get("Website", ""),
            "companyLinkedin": d.get("LinkedIn page", "")}

EV_LABEL = {"employer": "Employer", "email": "Email", "email_domain": "Company email", "job_history": "Job history",
            "address": "Office address", "business_address": "Business address", "year": "Degree year",
            "field": "Field of study", "location": "City", "state": "State", "title": "Job title", "middle": "Middle initial"}
EV_ORDER = list(EV_LABEL)

def ascend_block(b):
    if not b:
        return None
    det = b.get("details", {})
    hh_href = b.get("household_href", "")
    return {"name": b.get("name", ""), "constituentId": b.get("ascend_id", ""), "householdId": b.get("household_ascend_id", ""),
            "householdName": b.get("household_name") or b.get("household", ""),
            "contactUrl": f"{SF}/lightning/r/Contact/{b['contact_id']}/view" if b.get("contact_id") else "",
            "householdUrl": f"{SF}{hh_href}" if hh_href else "",
            "employer": b.get("employer", ""), "jobTitle": b.get("job_title", ""), "type": b.get("type", ""),
            "degree": b.get("degree", ""), "major": b.get("major", ""), "college": b.get("college", ""),
            "degreeYear": b.get("degree_year", ""), "primaryEmail": b.get("email", ""), "primaryAddress": b.get("address", ""),
            "jobHistory": det.get("affiliations", []), "emails": det.get("emails", []) or ([b["email"]] if b.get("email") else []),
            "addresses": det.get("addresses", []) or ([b["address"]] if b.get("address") else []),
            "otherNames": det.get("other_names", [])}


GENERIC_MAIL = re.compile(r"gmail|yahoo|hotmail|outlook|aol|icloud|me\.com|comcast|msn|live\.com|verizon|att\.net|protonmail|northeastern\.edu|neu\.edu|mac\.com|ymail")

def domain_of(u):
    u = (u or "").strip().lower()
    if not u:
        return ""
    u = re.sub(r"^[a-z]+://", "", u)
    u = re.sub(r"^www\.", "", u)
    u = u.split("/")[0].split("?")[0].split(":")[0]
    return u if "." in u and " " not in u else ""

def company_domain(pbs, webs, emails):
    for p in pbs:
        d = domain_of(p.get("companyWebsite"))
        if d:
            return d
    for w in webs:
        d = domain_of(w.get("website"))
        if d:
            return d
    for e in emails:
        d = e.split("@")[-1].lower()
        if d and not GENERIC_MAIL.search(d):
            return d
    return ""

def degree_label(ascend_degree):
    d = (ascend_degree or "").lower()
    if not d:
        return ""
    if "business admin" in d and ("master" in d or "mba" in d):
        return "MBA"
    if "philosophy" in d or d.startswith("ph"):
        return "PhD"
    if "juris" in d or d.startswith("jd"):
        return "JD"
    if d.startswith("b") or "bachelor" in d:
        return "Bachelor's"
    if d.startswith("m") or "master" in d:
        return "Master's"
    if "doctor" in d:
        return "Doctorate"
    if "certificate" in d:
        return "Certificate"
    return ascend_degree

# ---------- logos ----------
LOGO_CACHE = os.path.join(ROOT, "private", "logo_cache")
website_logos = {}
_wl = os.path.join(D, "website_logos.json")
if os.path.exists(_wl):
    website_logos = {x["id"]: x["logo"] for x in json.load(open(_wl)) if (x.get("logo") or "").startswith("data:image")}

website_photos = {}
_wp = os.path.join(D, "website_photos.json")
if os.path.exists(_wp):
    website_photos = {x["id"]: x["photo"] for x in json.load(open(_wp)) if (x.get("photo") or "").startswith("data:image")}

def fetch_favicon(domain):
    """Free Google favicon service; cached on disk; resized to 64px PNG. Returns data URI or ''."""
    import base64, subprocess, urllib.request
    os.makedirs(LOGO_CACHE, exist_ok=True)
    path = os.path.join(LOGO_CACHE, re.sub(r"[^a-z0-9.-]", "_", domain) + ".png")
    miss = path + ".miss"
    if not os.path.exists(path) and not os.path.exists(miss):
        try:
            req = urllib.request.Request(f"https://www.google.com/s2/favicons?domain={domain}&sz=128", headers={"User-Agent": "Mozilla/5.0 (logo prefetch)"})
            with urllib.request.urlopen(req, timeout=15) as r:
                body = r.read()
            open(path, "wb").write(body)
            # small icons (<32px) are generic or too blurry to use
            w = subprocess.run(["sips", "-g", "pixelWidth", path], capture_output=True, text=True).stdout
            if int((re.findall(r"pixelWidth: (\d+)", w) or ["0"])[0]) < 32:
                os.remove(path); open(miss, "w").close()
            else:
                subprocess.run(["sips", "-Z", "64", path], capture_output=True)
        except Exception:
            open(miss, "w").close()
    if os.path.exists(path):
        return "data:image/png;base64," + base64.b64encode(open(path, "rb").read()).decode()
    return ""

CATEGORY = {"CONFIRMED": "in_ascend", "NOT FOUND": "not_found"}
logos, domain_logo = {}, {}
if FETCH:  # parallel prefetch of favicons for companies without a founders-site logo
    from concurrent.futures import ThreadPoolExecutor
    want = set()
    for e in final:
        recs = [r for pid in [e["pid"]] + e.get("alias_pids", []) for r in people[pid]["records"]]
        pbs_ = [pitchbook_block(r) for r in recs if r["src"] == "PitchBook"]
        webs_ = [website_block(r) for r in recs if r["src"] == "Website"]
        if any(w["id"] in website_logos for w in webs_):
            continue
        em = [x for p_ in pbs_ for x in [p_["email"]] if x] + [x for w in webs_ for x in w["emails"]]
        d = company_domain(pbs_, webs_, em)
        if d:
            want.add(d)
    print(f"prefetching {len(want)} favicons…", flush=True)
    with ThreadPoolExecutor(12) as ex:
        got = sum(1 for uri in ex.map(fetch_favicon, sorted(want)) if uri)
    print(f"  {got} usable logos", flush=True)
out = []
for e in final:
    pids = [e["pid"]] + e.get("alias_pids", [])
    recs = [r for pid in pids for r in people[pid]["records"]]
    p0 = people[e["pid"]]
    pbs = [pitchbook_block(r) for r in recs if r["src"] == "PitchBook"]
    webs = [website_block(r) for r in recs if r["src"] == "Website"]
    srcs = sorted({r["src"] for r in recs}, key=lambda s: s != "PitchBook")
    pb, wb = (pbs[0] if pbs else None), (webs[0] if webs else None)
    emails = []
    for x in ([pb["email"]] if pb and pb["email"] else []) + (wb["emails"] if wb else []):
        if x.lower() not in [y.lower() for y in emails]:
            emails.append(x)
    b = e.get("best")
    ev = (b or {}).get("evidence", {})
    dom = company_domain(pbs, webs, emails)
    logo_key = ""
    for w in webs:
        if w["id"] in website_logos:
            logo_key = f"w{w['id']}"
            logos[logo_key] = website_logos[w["id"]]
            break
    if not logo_key and dom:
        if dom in domain_logo:
            logo_key = domain_logo[dom]
        elif FETCH or os.path.exists(os.path.join(LOGO_CACHE, re.sub(r"[^a-z0-9.-]", "_", dom) + ".png")):
            uri = fetch_favicon(dom)
            if uri:
                logo_key = f"d:{dom}"
                logos[logo_key] = uri
                domain_logo[dom] = logo_key
    photo_key = ""
    for w in webs:
        if w["id"] in website_photos:
            photo_key = f"p{w['id']}"
            logos[photo_key] = website_photos[w["id"]]
            break
    ne_degree, ne_class, ne_src = (wb or {}).get("degreeShort", ""), (wb or {}).get("classOf", ""), "website" if wb else ""
    if not ne_degree and b:
        ne_degree = degree_label(b.get("degree", ""))
        ne_class = f"Class of {b['degree_year']}" if b.get("degree_year") else ""
        ne_src = "ascend" if ne_degree or ne_class else ""
    status = e["status"]
    out.append({
        "id": f"F{e['pid']:04d}",
        "name": p0["full"], "first": p0["first"], "last": p0["last"],
        "aliases": sorted({people[pid]["full"] for pid in e.get("alias_pids", [])} - {p0["full"]}),
        "sources": srcs, "status": status, "category": CATEGORY.get(status, "review"),
        "title": (pb or {}).get("position") or (wb or {}).get("title", ""),
        "company": (pb or {}).get("company") or (wb or {}).get("company", ""),
        "emails": emails,
        "linkedin": (pb or {}).get("linkedin") or (wb or {}).get("linkedin", ""),
        "city": (pb or {}).get("city") or ((wb or {}).get("basedIn", "").split(",")[0] if wb else ""),
        "state": (pb or {}).get("state") or ((wb or {}).get("basedIn", "").split(",")[1].strip() if wb and wb.get("basedIn", "").count(",") >= 1 else ""),
        "location": (pb or {}).get("location") or (wb or {}).get("basedIn", ""),
        "degree": (wb or {}).get("degreeShort", ""), "classOf": (wb or {}).get("classOf", ""), "field": (wb or {}).get("field", ""),
        "tier": (wb or {}).get("tier", ""), "sector": (wb or {}).get("sector", ""), "funding": (wb or {}).get("funding", ""),
        "stage": (wb or {}).get("stage", "") or (pb or {}).get("companyType", ""), "hq": (wb or {}).get("hq", ""),
        "staff": (wb or {}).get("employees", ""), "domain": dom, "logo": logo_key, "photo": photo_key,
        "neDegree": ne_degree, "neClass": ne_class, "neSource": ne_src,
        "pitchbook": pbs, "website": webs,
        "ascend": ascend_block(b),
        "evidence": [{"kind": k, "label": EV_LABEL.get(k, k), "text": ev[k]} for k in EV_ORDER if k in ev],
        "others": [{"name": c.get("name", ""), "constituentId": c.get("ascend_id", ""), "employer": c.get("employer", ""),
                    "jobTitle": c.get("job_title", ""), "type": c.get("type", ""), "degreeYear": c.get("degree_year", ""),
                    "verdict": c.get("verdict", ""),
                    "contactUrl": f"{SF}/lightning/r/Contact/{c['contact_id']}/view" if c.get("contact_id") else ""}
                   for c in e.get("others", [])],
        "note": e.get("note", ""), "searches": e.get("searches", []),
    })

NOT_ON_RECORD = {"not on record", "—", "-", "n/a", "none", "unknown"}
for r in out:
    for k in ("funding", "staff", "hq", "stage", "sector"):
        if str(r.get(k, "")).strip().lower() in NOT_ON_RECORD:
            r[k] = ""
out.sort(key=lambda r: ({"in_ascend": 0, "review": 1, "not_found": 2}[r["category"]], r["last"].lower(), r["first"].lower()))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({"generated": __import__("datetime").date.today().isoformat(), "founders": out}, open(OUT, "w"))
json.dump(logos, open(os.path.join(ROOT, "private", "logos.json"), "w"))
print(f"photos: {sum(1 for r in out if r['photo'])} founders")
print(f"logos: {len(logos)} images for {sum(1 for r in out if r['logo'])} founders "
      f"({sum(1 for k in logos if k.startswith('w'))} from the founders site, {sum(1 for k in logos if k.startswith('d:'))} favicons)")
from collections import Counter
print(len(out), "founders ->", OUT, dict(Counter(r["category"] for r in out)), f"{os.path.getsize(OUT)/1e6:.1f} MB")
