import win32gui
import win32process

ezviz_hwnds = []

def enum_windows_cb(hwnd, extra):
    if win32gui.IsWindowVisible(hwnd):
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        title = win32gui.GetWindowText(hwnd)
        cls = win32gui.GetClassName(hwnd)
        if "Ezviz" in title or "EZVIZ" in title or "PTZ" in title or "HE" in title or "Qt" in cls:
            print(f"Top Window: HWND={hwnd}, Title='{title}', Class='{cls}', PID={pid}")
            ezviz_hwnds.append(hwnd)
    return True

win32gui.EnumWindows(enum_windows_cb, None)

print("\n--- Child Windows of Ezviz ---")
for parent_hwnd in ezviz_hwnds:
    def enum_child_cb(hwnd, extra):
        title = win32gui.GetWindowText(hwnd)
        cls = win32gui.GetClassName(hwnd)
        rect = win32gui.GetWindowRect(hwnd)
        print(f"  Child HWND={hwnd}, Title='{title}', Class='{cls}', Rect={rect}")
        return True
    win32gui.EnumChildWindows(parent_hwnd, enum_child_cb, None)
