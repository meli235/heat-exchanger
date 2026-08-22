from pyezviz.client import EzvizClient
import json

client = EzvizClient(account="dwimeliantiistiqomah55@gmail.com", password="Melchan5.", url="apiisgp.ezvizlife.com")

try:
    res = client.login(sms_code="2487")
    print("Login result type:", type(res))
    print("Login result content:", res)
    print("Session token:", client._token)
    
    # Save token directly
    with open("scripts/ezviz_session.json", "w") as f:
        json.dump(client._token, f)
    print("Session saved successfully to scripts/ezviz_session.json!")
    
    # Test loading cameras
    cams = client.load_cameras()
    print("Cameras:", cams)
    
    # Test rotating left
    print("Testing PTZ Move LEFT...")
    client.ptz_control("LEFT", "BK8777283", "START")
    import time
    time.sleep(0.7)
    client.ptz_control("LEFT", "BK8777283", "STOP")
    print(">>> SUCCESS! Physical Camera rotated LEFT!")
except Exception as e:
    import traceback
    traceback.print_exc()
