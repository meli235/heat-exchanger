import json
import os
from pyezviz.client import EzvizClient

SESSION_FILE = os.path.join(os.path.dirname(__file__), 'ezviz_session.json')
REGION_URL = "apiisgp.ezvizlife.com"
SERIAL = "BK8777283"

client = EzvizClient(account="anugrahtriplecycle@gmail.com", password="Melchan5.", url=REGION_URL)
try:
    client.login()
    print("EZVIZ Login OK!")
    
    devices = client.get_device_infos()
    print("Devices found:", len(devices) if devices else 0)
    
    # Try fetching storage / recording info from PyEzviz
    if hasattr(client, 'get_storage_info'):
        storage = client.get_storage_info(SERIAL)
        print("Storage Info:", storage)
        
    # Inspect all methods on client related to storage or video or playback
    methods = [m for m in dir(client) if 'storage' in m or 'rec' in m or 'play' in m or 'video' in m or 'hls' in m]
    print("Available storage/recording methods on client:", methods)
    
except Exception as e:
    print("Error:", e)
