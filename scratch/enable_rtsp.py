"""
Try to enable RTSP on camera via pyezviz API, then monitor port 554
"""
import json
import time
import socket

from pyezviz.client import EzvizClient

serial = 'BK8777283'

client = EzvizClient('dwimeliantiistiqomah55@gmail.com', 'Melchan5.', url='apiisgp.ezvizlife.com')
client.login()
session = client._session
base_url = 'https://apiisgp.ezvizlife.com'

print("=== Trying to enable RTSP via EZVIZ API ===\n")

# Try various API calls to enable RTSP local service
api_calls = [
    # Set RTSP config
    {
        'method': 'POST',
        'url': f'{base_url}/v3/devconfig/localService',
        'data': {'deviceSerial': serial, 'enable': 1, 'type': 'rtsp'}
    },
    # Switch status (RTSP might be switch 700 based on switch list)
    {
        'method': 'POST', 
        'url': f'{base_url}/api/device/switchStatus',
        'data': {'deviceSerial': serial, 'channelNo': 1, 'type': 700, 'enable': 1}
    },
    # Try switch 301 (local service)
    {
        'method': 'POST',
        'url': f'{base_url}/api/device/switchStatus', 
        'data': {'deviceSerial': serial, 'channelNo': 1, 'type': 301, 'enable': 1}
    },
    # Try device config by key
    {
        'method': 'POST',
        'url': f'{base_url}/v3/devconfig/v1/device/config',
        'data': {'deviceSerial': serial, 'key': 'rtsp_local', 'value': '1'}
    },
    # Try to set through deviceBind
    {
        'method': 'POST',
        'url': f'{base_url}/api/device/configByKey',
        'data': {'deviceSerial': serial, 'key': 'localService', 'value': json.dumps({'rtsp': True})}
    },
    # V3 switch
    {
        'method': 'PUT',
        'url': f'{base_url}/v3/devices/{serial}/1/switch/700',
        'data': {'enable': True}
    },
]

for call in api_calls:
    try:
        if call['method'] == 'POST':
            resp = session.post(call['url'], data=call.get('data', {}), timeout=5)
        else:
            resp = session.put(call['url'], json=call.get('data', {}), timeout=5)
        
        status = resp.status_code
        try:
            body = resp.json()
            result = json.dumps(body, default=str)[:300]
        except:
            result = resp.text[:300]
        
        print(f"[{status}] {call['url'].split('/')[-1]}")
        print(f"  -> {result}\n")
    except Exception as e:
        print(f"[ERR] {call['url'].split('/')[-1]} -> {e}\n")

# Now check if port 554 opened
print("\n=== Checking port 554 status ===")
for attempt in range(3):
    s = socket.socket()
    s.settimeout(2)
    result = s.connect_ex(('192.168.101.39', 554))
    status = "OPEN!" if result == 0 else "CLOSED"
    print(f"  Attempt {attempt+1}: Port 554 is {status}")
    s.close()
    if result == 0:
        print("\n  PORT 554 IS OPEN! RTSP should be available now!")
        break
    if attempt < 2:
        time.sleep(3)

# Also try pyezviz switch_status method properly
print("\n=== Trying pyezviz switch_status method ===")
try:
    # Check the method signature
    import inspect
    sig = inspect.signature(client.switch_status)
    print(f"switch_status signature: {sig}")
    
    # Try with different argument patterns
    for switch_type in [700, 301, 21]:
        try:
            result = client.switch_status(serial, switch_type, 1)
            print(f"  switch_status({serial}, {switch_type}, 1) = {result}")
        except TypeError as e:
            # Try with keyword args
            try:
                result = client.switch_status(serial_no=serial, switch_type=switch_type, enable=1)
                print(f"  switch_status(kw: {switch_type}) = {result}")
            except Exception as e2:
                print(f"  switch_status({switch_type}) failed: {e2}")
        except Exception as e:
            print(f"  switch_status({switch_type}) error: {e}")
except Exception as e:
    print(f"Error: {e}")

client.close_session()
