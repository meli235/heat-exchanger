import urllib.request
import json

try:
    resp = urllib.request.urlopen("http://localhost:8889/api/streams", timeout=3)
    data = json.loads(resp.read().decode())
    print("go2rtc Streams API Response OK:")
    print(json.dumps(data, indent=2))
except Exception as e:
    print("go2rtc API Error:", e)
