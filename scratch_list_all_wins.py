import ctypes
from ctypes import wintypes

user32 = ctypes.windll.user32
WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

def enum_windows_cb(hwnd, lparam):
    pid = wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    
    # We saw EzvizStudio PID earlier (or let's list all visible windows with PID)
    if user32.IsWindowVisible(hwnd):
        length = user32.GetWindowTextLengthW(hwnd)
        buff = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buff, length + 1)
        
        cls_buff = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(hwnd, cls_buff, 256)
        
        rect = wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        
        if (rect.right - rect.left) > 100 and (rect.bottom - rect.top) > 100:
            print(f"PID={pid.value:5d}, HWND={hwnd:8d}, Class='{cls_buff.value}', Title='{buff.value}', Rect=({rect.left},{rect.top},{rect.right},{rect.bottom})")
    return True

user32.EnumWindows(WNDENUMPROC(enum_windows_cb), 0)
