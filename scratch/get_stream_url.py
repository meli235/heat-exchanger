"""
Use EZVIZ session token to get live stream HLS URL via API
"""
import json
import requests
import ssl

serial = 'BK8777283'

# Login via pyezviz
from pyezviz.client import EzvizClient
client = EzvizClient('dwimeliantiistiqomah55@gmail.com', 'Melchan5.', url='apiisgp.ezvizlife.com')
client.login()

# Get session
session = client._session
token_data = client._token
print("Token data keys:", list(token_data.keys()) if isinstance(token_data, dict) else type(token_data))
print("Token data:", json.dumps(token_data, indent=2, default=str)[:1000])

session_id = session.headers.get('sessionId', '')
print(f"\nSession ID (first 50): {session_id[:50]}...")

base_url = 'https://apiisgp.ezvizlife.com'

# Try various API endpoints for live streaming
endpoints = [
    # HLS live stream
    {
        'name': 'HLS Live',
        'url': f'{base_url}/v3/videocenter/play/live/getHls',
        'data': {'deviceSerial': serial, 'channelNo': 1, 'quality': 1}
    },
    # Live address
    {
        'name': 'Live Address v1',
        'url': f'{base_url}/api/lapp/live/video/list',
        'data': {'deviceSerial': serial, 'channelNo': 1}
    },
    # Live token
    {
        'name': 'Live Token',
        'url': f'{base_url}/v3/devices/{serial}/1/live',
        'data': {}
    },
    # Camera live stream
    {
        'name': 'Camera Live',
        'url': f'{base_url}/v3/videocenter/video/live',
        'data': {'deviceSerial': serial, 'channelNo': 1, 'streamType': 1}
    },
    # Get stream URL
    {
        'name': 'Stream URL',
        'url': f'{base_url}/api/lapp/v2/live/address/get', 
        'data': {'deviceSerial': serial, 'channelNo': 1, 'protocol': 3, 'code': 'TJPCYS'}
    },
    # ezopen HLS 
    {
        'name': 'EZOpen HLS',
        'url': f'{base_url}/v3/videocenter/play/getHlsAddr',
        'data': {'deviceSerial': serial, 'channelNo': 1, 'type': 1, 'quality': 1, 'validCode': 'TJPCYS'}
    },
]

for ep in endpoints:
    print(f"\n{'='*50}")
    print(f"Trying: {ep['name']} -> {ep['url']}")
    try:
        resp = session.post(ep['url'], data=ep['data'], timeout=10)
        print(f"Status: {resp.status_code}")
        try:
            data = resp.json()
            print(f"Response: {json.dumps(data, indent=2, default=str)[:800]}")
        except:
            print(f"Response text: {resp.text[:500]}")
    except Exception as e:
        print(f"Error: {e}")

# Also try GET requests
get_endpoints = [
    f'{base_url}/v3/devices/{serial}/1/live/address',
    f'{base_url}/v3/devices/{serial}/cameras/live',
]
for url in get_endpoints:
    print(f"\n{'='*50}")
    print(f"GET: {url}")
    try:
        resp = session.get(url, timeout=10)
        print(f"Status: {resp.status_code}")
        try:
            data = resp.json()
            print(f"Response: {json.dumps(data, indent=2, default=str)[:800]}")
        except:
            print(f"Response text: {resp.text[:500]}")
    except Exception as e:
        print(f"Error: {e}")

client.close_session()
