import urllib.request
import urllib.parse

eps = [
    ("https://open.ys7.com/api/lss/oauth/token", {'appKey': 'test', 'appSecret': 'test'}),
    ("https://open.ys7.com/api/lss/device/ptz/start", {'accessToken': 'test', 'deviceSerial': 'BK8777283', 'channelNo': 1, 'direction': 0, 'speed': 1}),
]

for url, params in eps:
    try:
        data = urllib.parse.urlencode(params).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
        with urllib.request.urlopen(req, timeout=4) as resp:
            print(url, "->", resp.status, resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(url, "-> HTTP Error", e.code, e.read().decode('utf-8'))
    except Exception as e:
        print(url, "->", str(e))
