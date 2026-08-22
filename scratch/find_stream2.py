"""
Approach 1: Use pyezviz to get session token, then call EZVIZ API for live stream
Approach 2: Try to enable RTSP via pyezviz switch_status
Approach 3: Get HLS content from hls01open.ys7.com
"""
import json
import urllib.request
import urllib.parse
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

serial = 'BK8777283'

# ======= Approach 1: Get pyezviz session token and try EZVIZ API =======
print("=" * 60)
print("APPROACH 1: pyezviz session + EZVIZ API")
print("=" * 60)

from pyezviz.client import EzvizClient
client = EzvizClient('dwimeliantiistiqomah55@gmail.com', 'Melchan5.', url='apiisgp.ezvizlife.com')
client.login()

# Inspect session object to find token
session = client._session
print("Session type:", type(session))
print("Session attrs:", [a for a in dir(session) if not a.startswith('__')])

# Try common token attribute names
for attr in ['token', '_token', 'session_id', '_session_id', 'access_token', '_access_token', 'sessionId']:
    if hasattr(session, attr):
        val = getattr(session, attr)
        print(f"  session.{attr} = {str(val)[:100]}")

# Try to find token in session dict
if hasattr(session, '__dict__'):
    for k, v in session.__dict__.items():
        if 'token' in k.lower() or 'session' in k.lower():
            print(f"  session.__dict__['{k}'] = {str(v)[:200]}")

# Also check the client object itself
print("\nClient attrs with token/session:")
for attr in dir(client):
    if ('token' in attr.lower() or 'session' in attr.lower()) and not attr.startswith('__'):
        try:
            val = getattr(client, attr)
            if not callable(val):
                print(f"  client.{attr} = {str(val)[:200]}")
        except:
            pass

# ======= Approach 2: Try to toggle RTSP switch =======
print("\n" + "=" * 60)
print("APPROACH 2: Toggle RTSP switch via pyezviz")
print("=" * 60)

# Get current switch states
try:
    cams = client.load_cameras()
    if isinstance(cams, dict):
        switches = cams.get('switches', {})
    elif isinstance(cams, list):
        for cam in cams:
            if isinstance(cam, dict):
                switches = cam.get('switches', {})
                if switches:
                    print("Current switches:", json.dumps(switches, indent=2))
                    break
    else:
        print("Cameras data type:", type(cams))
        print("Data:", str(cams)[:500])
except Exception as e:
    print(f"Error getting switches: {e}")

# Try enabling switch 3 (sometimes RTSP) 
# EZVIZ switch types vary, but let's try common ones
print("\nTrying to enable various switches that might be RTSP:")
for switch_type in [3, 21, 22, 301, 302]:
    try:
        result = client.get_switch(serial, switch_type)
        print(f"  Switch {switch_type} current state: {result}")
    except Exception as e:
        print(f"  Switch {switch_type} error: {e}")

# ======= Approach 3: Read hls01open content =======
print("\n" + "=" * 60)
print("APPROACH 3: hls01open.ys7.com content")
print("=" * 60)

try:
    req = urllib.request.Request(
        f'https://hls01open.ys7.com/{serial}/1.m3u8',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    res = urllib.request.urlopen(req, context=ctx, timeout=10)
    raw = res.read()
    # Try to decode as utf-8
    try:
        data = raw.decode('utf-8')
    except:
        data = raw.decode('latin-1')
    print(f"Status: {res.status}")
    print(f"Content-Type: {res.headers.get('Content-Type')}")
    print(f"Content:\n{data[:1000]}")
except Exception as e:
    print(f"Error: {e}")

# ======= Approach 4: Use pyezviz internal API to get stream URL =======
print("\n" + "=" * 60)
print("APPROACH 4: pyezviz API call for live address")
print("=" * 60)

# Try calling the EZVIZ API directly using pyezviz session
try:
    # Get the base URL and session headers
    api_url = getattr(session, '_api_url', None) or getattr(session, 'api_url', None)
    print(f"API URL: {api_url}")
    
    # Try to find headers/cookies
    if hasattr(session, '_session') and hasattr(session._session, 'headers'):
        print(f"Session headers: {dict(session._session.headers)}")
    if hasattr(session, 'headers'):
        print(f"Headers: {session.headers}")
    
except Exception as e:
    print(f"Error: {e}")

client.close_session()
