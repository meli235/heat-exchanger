from pyezviz.client import EzvizClient

# Try Southeast Asia (sgp) and Global
urls = ["apisgp.ezvizlife.com", "apiieu.ezvizlife.com", "api.ezvizlife.com"]

account = "dwimeliantiistiqomah55@gmail.com"
password = "Melchan5."

for u in urls:
    print(f"Trying url={u}...")
    try:
        client = EzvizClient(account=account, password=password, url=u)
        res = client.login()
        print(f">>> LOGIN SUCCESSFUL on {u}!")
        print("Session details:", res)
        cams = client.load_cameras()
        print("Cameras found:", cams)
        
        # Test PTZ move (e.g. UP)
        print("Testing PTZ move UP on BK8777283...")
        client.ptz_control("UP", "BK8777283", "START")
        import time
        time.sleep(0.5)
        client.ptz_control("UP", "BK8777283", "STOP")
        print(">>> PTZ MOVE COMMAND SENT SUCCESSFULLY VIA MOBILE CLOUD!")
        break
    except Exception as e:
        print(f"Failed on {u}:", type(e).__name__, str(e))
