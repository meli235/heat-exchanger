from pyezviz.client import EzvizClient

print("EzvizClient methods:")
for m in dir(EzvizClient):
    if not m.startswith('_'):
        print(" -", m)
