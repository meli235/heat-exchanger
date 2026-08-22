from pyezviz.client import EzvizClient
import sys

# Test accounts
users = [
    ("dwimeliantiistiqomah55@gmail.com", "Melchan5."),
    ("0cfyyi", "Melchan5."),
]

for u, p in users:
    print(f"Testing login with {u}...")
    try:
        client = EzvizClient(token=None, url="https://isgp.ezvizlife.com")
        client._username = u
        client._password = p
        login_res = client.login()
        print(f">>> LOGIN SUCCESSFUL for {u}!")
        print("Session token obtained!")
        cameras = client.load_cameras()
        print("Cameras found:", cameras)
        break
    except Exception as e:
        print(f"Failed for {u}:", type(e).__name__, str(e))
