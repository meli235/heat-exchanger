import socket
import urllib.request
import base64

cam_ip = "192.168.101.7"
cam_pass = "TJPCYS"

# Test RTSP port 554 connection for playback track
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(3)
res = s.connect_ex((cam_ip, 554))
print(f"RTSP Port 554 open: {res == 0}")

# Test ISAPI playback search if available on port 80/8000
try:
    auth_str = base64.b64encode(f"admin:{cam_pass}".encode()).decode()
    req = urllib.request.Request(f"http://{cam_ip}/ISAPI/ContentMgmt/search", headers={"Authorization": f"Basic {auth_str}"})
    resp = urllib.request.urlopen(req, timeout=3)
    print("ISAPI Search Status:", resp.status)
except Exception as e:
    print("ISAPI Search result:", e)
