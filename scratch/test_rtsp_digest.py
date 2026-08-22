import socket
import hashlib
import re

def test_rtsp_auth(username, password, ip='192.168.101.39', path='/h264/ch1/main/av_stream'):
    try:
        s = socket.socket()
        s.settimeout(3)
        s.connect((ip, 554))
        s.send(f'DESCRIBE rtsp://{ip}:554{path} RTSP/1.0\r\nCSeq: 1\r\n\r\n'.encode())
        resp = s.recv(2048).decode('utf-8', errors='ignore')
        if '401 Unauthorized' not in resp:
            return 'Initial: ' + resp.splitlines()[0] if resp else 'No initial resp'
        
        m_realm = re.search(r'realm="([^"]+)"', resp)
        m_nonce = re.search(r'nonce="([^"]+)"', resp)
        if not m_realm or not m_nonce:
            return 'No Digest header'
        realm = m_realm.group(1)
        nonce = m_nonce.group(1)
        
        # Digest calculation
        ha1 = hashlib.md5(f'{username}:{realm}:{password}'.encode()).hexdigest()
        ha2 = hashlib.md5(f'DESCRIBE:rtsp://{ip}:554{path}'.encode()).hexdigest()
        response = hashlib.md5(f'{ha1}:{nonce}:{ha2}'.encode()).hexdigest()
        
        auth_header = f'Digest username="{username}", realm="{realm}", nonce="{nonce}", uri="rtsp://{ip}:554{path}", response="{response}"'
        s.send(f'DESCRIBE rtsp://{ip}:554{path} RTSP/1.0\r\nCSeq: 2\r\nAuthorization: {auth_header}\r\n\r\n'.encode())
        resp2 = s.recv(2048).decode('utf-8', errors='ignore')
        return resp2.splitlines()[0] if resp2 else 'No response'
    except Exception as e:
        return f'Error: {e}'

paths = ['/h264/ch1/main/av_stream', '/live/main', '/Streaming/Channels/101', '/mpeg4/ch1/main/av_stream']
passwords = ['TJPCYS', 'Melchan5.', 'BK8777283']

for path in paths:
    for p in passwords:
        res = test_rtsp_auth('admin', p, path=path)
        print(f'Path "{path}" | Pass "{p}" -> {res}')
