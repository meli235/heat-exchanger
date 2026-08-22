import socket

camera_ip = '192.168.101.39'
ports = [80, 443, 554, 8000, 8080, 8443, 8554, 9020, 1935, 8888, 8889]

print(f"=== Port scan on {camera_ip} ===")
for p in ports:
    s = socket.socket()
    s.settimeout(2)
    result = s.connect_ex((camera_ip, p))
    status = "OPEN" if result == 0 else "CLOSED"
    print(f"Port {p}: {status}")
    s.close()

# Also try RTSP DESCRIBE on port 8000 since that's open
print("\n=== Testing RTSP on port 8000 ===")
try:
    s = socket.socket()
    s.settimeout(3)
    s.connect((camera_ip, 8000))
    s.send(b'OPTIONS rtsp://192.168.101.39:8000/ RTSP/1.0\r\nCSeq: 1\r\n\r\n')
    resp = s.recv(2048).decode('utf-8', errors='ignore')
    print("Response:", resp[:500])
    s.close()
except Exception as e:
    print(f"Error: {e}")

# Try HTTP on port 8000
print("\n=== Testing HTTP on port 8000 ===")
try:
    s = socket.socket()
    s.settimeout(3)
    s.connect((camera_ip, 8000))
    s.send(b'GET / HTTP/1.1\r\nHost: 192.168.101.39:8000\r\n\r\n')
    resp = s.recv(2048).decode('utf-8', errors='ignore')
    print("Response:", resp[:500])
    s.close()
except Exception as e:
    print(f"Error: {e}")

# Try port 9020
print("\n=== Testing port 9020 ===")
try:
    s = socket.socket()
    s.settimeout(3)
    s.connect((camera_ip, 9020))
    s.send(b'GET / HTTP/1.1\r\nHost: 192.168.101.39:9020\r\n\r\n')
    resp = s.recv(2048).decode('utf-8', errors='ignore')
    print("Response (first 200 chars):", repr(resp[:200]))
    s.close()
except Exception as e:
    print(f"Error: {e}")
