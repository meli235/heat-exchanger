import json
from pyezviz.client import EzvizClient

try:
    client = EzvizClient('dwimeliantiistiqomah55@gmail.com', 'Melchan5.', url='apiisgp.ezvizlife.com')
    client.login()
    cams = client.load_cameras()
    print("Cameras loaded successfully!")
    print("Device Encryption Key:", client.get_cam_key("BK8777283"))
    print("Service URLs:", client.get_service_urls())
except Exception as e:
    print("Error:", e)
