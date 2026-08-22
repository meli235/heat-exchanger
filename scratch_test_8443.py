import urllib.request
import ssl
import base64

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://192.168.101.39:8443/ISAPI/System/deviceInfo"
req = urllib.request.Request(url, headers={'Authorization': 'Basic ' + base64.b64encode(b'admin:Melchan5.').decode('ascii')})

try:
    with urllib.request.urlopen(req, context=ctx, timeout=3) as resp:
        print("Port 8443 Status:", resp.status)
        print("Body:", resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("Port 8443 HTTPError:", e.code, e.headers)
except Exception as e:
    print("Port 8443 Error:", type(e).__name__, str(e))
