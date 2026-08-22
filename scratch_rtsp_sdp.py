import socket
import base64

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(3)
s.connect(('192.168.101.39', 554))

auth = base64.b64encode(b'admin:Melchan5.').decode('ascii')
req = (
    "DESCRIBE rtsp://192.168.101.39:554/live/main RTSP/1.0\r\n"
    "CSeq: 1\r\n"
    f"Authorization: Basic {auth}\r\n"
    "Accept: application/sdp\r\n"
    "\r\n"
)

s.send(req.encode('ascii'))
res = s.recv(4096).decode('utf-8', errors='ignore')
print("--- RTSP DESCRIBE Response ---")
print(res)
s.close()
