from pyezviz.client import EzvizClient
import json

with open("scripts/ezviz_session.json", "r") as f:
    token = json.load(f)

client = EzvizClient(token=token, url="apiisgp.ezvizlife.com")

print("Checking camera switches & audio settings...")
cams = client.load_cameras()
cam = cams['BK8777283']

print("Switches:", cam.get('switches'))
print("Optionals video_para:", cam.get('optionals', {}).get('video_para'))
print("Talk mode:", cam.get('optionals', {}).get('talkMode'))
print("Audio recording switch (1):", cam.get('switches', {}).get(1))
