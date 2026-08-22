import urllib.request
import urllib.parse
import json

endpoints = [
    "https://open.ezvizlife.com/api/lss/token/get",
    "https://sgp-open.ezvizlife.com/api/lss/token/get",
    "https://open.ys7.com/api/lss/token/get",
    "https://service.ezvizlife.com/api/lss/token/get"
]

for ep in endpoints:
    try:
        data = urllib.parse.urlencode({'appKey': 'test', 'appSecret': 'test'}).encode('utf-8')
        req = urllib.request.Request(ep, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
        with urllib.request.urlopen(req, timeout=3) as resp:
            body = resp.read().decode('utf-8')
            print(ep, "-> HTTP", resp.status, "Body:", body[:80])
    except urllib.error.HTTPError as e:
        print(ep, "-> HTTP Error", e.code, e.read().decode('utf-8')[:80])
    except Exception as e:
        print(ep, "-> Error:", str(e))
