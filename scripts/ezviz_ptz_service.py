import sys
import json
import os
import time
from pyezviz.client import EzvizClient
from pyezviz.exceptions import EzvizAuthVerificationCode, PyEzvizError

SESSION_FILE = os.path.join(os.path.dirname(__file__), 'ezviz_session.json')
REGION_URL = "apiisgp.ezvizlife.com"
SERIAL = "BK8777283"

def get_client(account, password, mfa_code=None):
    token = None
    if os.path.exists(SESSION_FILE):
        try:
            with open(SESSION_FILE, 'r') as f:
                token = json.load(f)
        except Exception:
            token = None

    client = EzvizClient(account=account, password=password, url=REGION_URL, token=token)
    return client

def do_login(account="dwimeliantiistiqomah55@gmail.com", password="Melchan5.", mfa_code=None):
    try:
        client = EzvizClient(account=account, password=password, url=REGION_URL)
        if mfa_code:
            res = client.login(sms_code=mfa_code)
        else:
            res = client.login()
        
        # Save token/session dict
        session_data = res if isinstance(res, dict) else client.get_connection()
        with open(SESSION_FILE, 'w') as f:
            json.dump(session_data, f)
        
        print(json.dumps({"success": True, "message": "Login successful, session saved!"}))
        return True
    except EzvizAuthVerificationCode as e:
        print(json.dumps({"success": False, "mfa_required": True, "message": "Kode verifikasi (MFA/OTP) telah dikirim ke HP/Email akun EZVIZ Anda. Masukkan kode tersebut untuk menyelesaikan sambungan."}))
        return False
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        return False

def do_move(direction, duration=0.6):
    token = None
    if os.path.exists(SESSION_FILE):
        try:
            with open(SESSION_FILE, 'r') as f:
                token = json.load(f)
        except Exception:
            token = None

    client = None
    if token:
        try:
            client = EzvizClient(token=token, url=REGION_URL)
        except Exception:
            client = None

    if not client:
        # Fallback to auto-login using default credentials
        client = EzvizClient(account="dwimeliantiistiqomah55@gmail.com", password="Melchan5.", url=REGION_URL)
        try:
            res = client.login()
            with open(SESSION_FILE, 'w') as f:
                json.dump(res, f)
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Login gagal: {str(e)}"}))
            return False

    dir_upper = direction.upper()
    valid_dirs = {
        "UP": "UP",
        "DOWN": "DOWN",
        "LEFT": "LEFT",
        "RIGHT": "RIGHT",
        "UPLEFT": "UP",
        "UPRIGHT": "UP",
        "DOWNLEFT": "DOWN",
        "DOWNRIGHT": "DOWN",
        "ZOOMIN": "ZOOMIN",
        "ZOOMOUT": "ZOOMOUT"
    }
    
    ez_dir = valid_dirs.get(dir_upper, "UP")
    
    try:
        # Start Move
        client.ptz_control(ez_dir, SERIAL, "START")
        time.sleep(duration)
        # Stop Move
        client.ptz_control(ez_dir, SERIAL, "STOP")
        print(json.dumps({"success": True, "direction": ez_dir, "message": f"Kamera berhasil diputar ke {ez_dir}"}))
        return True
    except Exception as e:
        # If token expired during ptz_control, attempt 1 auto-login retry
        try:
            c_retry = EzvizClient(account="dwimeliantiistiqomah55@gmail.com", password="Melchan5.", url=REGION_URL)
            res_retry = c_retry.login()
            with open(SESSION_FILE, 'w') as f:
                json.dump(res_retry, f)
            c_retry.ptz_control(ez_dir, SERIAL, "START")
            time.sleep(duration)
            c_retry.ptz_control(ez_dir, SERIAL, "STOP")
            print(json.dumps({"success": True, "direction": ez_dir, "message": f"Kamera berhasil diputar ke {ez_dir} (Session Refreshed)"}))
            return True
        except Exception as retry_err:
            print(json.dumps({"success": False, "error": str(retry_err)}))
            return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ezviz_ptz_service.py [login|move|mfa] ...")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "login":
        acc = sys.argv[2] if len(sys.argv) > 2 else "dwimeliantiistiqomah55@gmail.com"
        pwd = sys.argv[3] if len(sys.argv) > 3 else "Melchan5."
        mfa = sys.argv[4] if len(sys.argv) > 4 else None
        do_login(acc, pwd, mfa)
    elif cmd == "mfa":
        acc = sys.argv[2] if len(sys.argv) > 2 else "dwimeliantiistiqomah55@gmail.com"
        pwd = sys.argv[3] if len(sys.argv) > 3 else "Melchan5."
        mfa = sys.argv[4] if len(sys.argv) > 4 else None
        do_login(acc, pwd, mfa)
    elif cmd == "move":
        direction = sys.argv[2] if len(sys.argv) > 2 else "UP"
        dur = float(sys.argv[3]) if len(sys.argv) > 3 else 0.6
        do_move(direction, dur)
