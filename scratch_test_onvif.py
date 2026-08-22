import urllib.request
import urllib.error

url = "http://192.168.101.39:8000/onvif/device_service"
body = """<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <GetDeviceInformation xmlns="http://www.onvif.org/ver10/device/wsdl"/>
  </s:Body>
</s:Envelope>"""

req = urllib.request.Request(url, data=body.encode('utf-8'), headers={'Content-Type': 'application/soap+xml; charset=utf-8'})

try:
    with urllib.request.urlopen(req, timeout=3) as resp:
        print("Status:", resp.status)
        print("Response:", resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.headers)
except Exception as e:
    print("Error:", type(e).__name__, str(e))
