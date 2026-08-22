import socket

ips = ['192.168.101.39', '192.168.101.1']
ports = [554, 8000, 80, 8554, 443, 8443, 8001, 5540, 10554]

for ip in ips:
    print(f"Scanning {ip}...")
    for port in ports:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        res = s.connect_ex((ip, port))
        if res == 0:
            print(f"  --> {ip}:{port} OPEN!")
        s.close()
