import urllib.request

urls = [
    "https://open.ys7.com",
    "https://service.ezvizlife.com",
    "https://open.ezvizlife.com",
    "https://www.ezviz.com/id",
    "https://developer.ezviz.com"
]

for u in urls:
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            print(u, "->", resp.status)
    except Exception as e:
        print(u, "-> Error:", str(e))
