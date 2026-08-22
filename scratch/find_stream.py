"""
Try to get EZVIZ live stream URL via different methods:
1. EZVIZ Open Platform HLS
2. EZVIZ ezopen protocol
3. pyezviz internal APIs
"""
import json
import urllib.request
import urllib.parse
import ssl

# Disable SSL verification for testing
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

serial = 'BK8777283'
channel = 1

# Method 1: Try HLS manifest variations
hls_urls = [
    f'https://open.ys7.com/ezopen/hls/{serial}/{channel}/live.m3u8',
    f'https://open.ys7.com/api/lapp/v2/live/address/get',
    f'https://hls01open.ys7.com/{serial}/{channel}.m3u8',
    f'https://rtmp01open.ys7.com/openlive/{serial}_{channel}.m3u8',
]

for url in hls_urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req, context=ctx, timeout=5)
        data = res.read().decode('utf-8', errors='ignore')
        print(f"\n=== {url} ===")
        print(f"Status: {res.status}")
        print(f"Content-Type: {res.headers.get('Content-Type', 'unknown')}")
        print(f"Content (first 500 chars):\n{data[:500]}")
    except Exception as e:
        print(f"\n=== {url} ===")
        print(f"Error: {e}")

# Method 2: Try pyezviz to get internal streaming info
print("\n\n=== pyezviz internal API ===")
try:
    from pyezviz.client import EzvizClient
    client = EzvizClient('dwimeliantiistiqomah55@gmail.com', 'Melchan5.', url='apiisgp.ezvizlife.com')
    client.login()
    
    # Check session token
    token = client._session._token if hasattr(client, '_session') else None
    print(f"Session token available: {token is not None}")
    
    # Try to get device connection info
    device_info = client.get_device_infos()
    if device_info:
        for key in device_info:
            if serial.lower() in str(key).lower() or serial in str(device_info[key]):
                print(f"Device key: {key}")
                print(f"Device info: {json.dumps(device_info[key], indent=2)[:1000]}")
    
    # Get connection info  
    conn = client.get_connection(serial)
    print(f"\nConnection info: {conn}")
    
    client.close_session()
except Exception as e:
    print(f"pyezviz error: {e}")
    import traceback
    traceback.print_exc()

# Method 3: Try ISAPI on port 8443 via HTTPS
print("\n\n=== ISAPI on port 8443 (HTTPS) ===")
isapi_urls = [
    f'https://192.168.101.39:8443/',
    f'https://192.168.101.39:8443/ISAPI/System/deviceInfo',
    f'https://admin:TJPCYS@192.168.101.39:8443/ISAPI/Streaming/channels/101/picture',
]
for url in isapi_urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req, context=ctx, timeout=3)
        data = res.read()
        print(f"\n{url}")
        print(f"Status: {res.status}, Size: {len(data)}")
        print(f"Content-Type: {res.headers.get('Content-Type', 'unknown')}")
    except Exception as e:
        print(f"\n{url}")
        print(f"Error: {e}")
