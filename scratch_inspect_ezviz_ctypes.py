import ctypes
from ctypes import wintypes

user32 = ctypes.windll.user32

WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

ezviz_hwnds = []

def enum_windows_cb(hwnd, lparam):
    if user32.IsWindowVisible(hwnd):
        length = user32.GetWindowTextLengthW(hwnd)
        buff = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buff, length + 1)
        title = buff.value

        cls_buff = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(hwnd, cls_buff, 256)
        cls_name = cls_buff.value

        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))

        if "Ezviz" in title or "EZVIZ" in title or "PTZ" in title or "HE" in title or "Qt" in cls_name:
            print(f"Top Window: HWND={hwnd}, Title='{title}', Class='{cls_name}', PID={pid.value}")
            ezviz_hwnds.append(hwnd)
    return True

user32.EnumWindows(WNDENUMPROC(enum_windows_cb), 0)

print("\n--- Child Windows of Ezviz ---")
for parent_hwnd in ezviz_hwnds:
    def enum_child_cb(hwnd, lparam):
        length = user32.GetWindowTextLengthW(hwnd)
        buff = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buff, length + 1)
        title = buff.value

        cls_buff = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(hwnd, cls_buff, 256)
        cls_name = cls_buff.value

        rect = wintypes.RECT()
        user32.GetWindowRect(hwnd, ctypes.byref(rect))
        print(f"  Child HWND={hwnd}, Title='{title}', Class='{cls_name}', Rect=({rect.left},{rect.top},{rect.right},{rect.bottom})")
        return True
    user32.EnumChildWindows(parent_hwnd, WNDENUMPROC(enum_child_cb), 0)
