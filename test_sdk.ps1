$sdkPath = "C:\Program Files (x86)\Ezviz Studio"
$env:PATH = "$sdkPath;" + $env:PATH

$csharpCode = @"
using System;
using System.Runtime.InteropServices;

public class HikSDK {
    [DllImport("HCNetSDK.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern bool NET_DVR_Init();

    [DllImport("HCNetSDK.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern bool NET_DVR_Cleanup();

    [DllImport("HCNetSDK.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int NET_DVR_GetLastError();

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct NET_DVR_DEVICEINFO_V30 {
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 48)]
        public byte[] sSerialNumber;
        public byte byAlarmInPortNum;
        public byte byAlarmOutPortNum;
        public byte byDiskNum;
        public byte byDVRType;
        public byte byChanNum;
        public byte byStartChan;
        public byte byAudioChanNum;
        public byte byIPChanNum;
        public byte byZeroChanNum;
        public byte byMainProto;
        public byte bySubProto;
        public byte bySupport;
        public byte bySupport1;
        public byte bySupport2;
        public byte bySupport3;
        public byte byMultiStreamProto;
        public byte byStartDChan;
        public byte byStartDTalkChan;
        public byte byHighDChanNum;
        public byte bySupport4;
        public byte byLanguageType;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 9)]
        public byte[] byRes2;
    }

    [DllImport("HCNetSDK.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int NET_DVR_Login_V30(
        string sDVRIP,
        ushort wDVRPort,
        string sUserName,
        string sPassword,
        ref NET_DVR_DEVICEINFO_V30 lpDeviceInfo
    );

    [DllImport("HCNetSDK.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern bool NET_DVR_Logout(int lUserID);

    // dwPTZCommand: 21=TILT_UP, 22=TILT_DOWN, 23=PAN_LEFT, 24=PAN_RIGHT, 11=ZOOM_IN, 12=ZOOM_OUT, 29=PAN_AUTO
    // dwStop: 0=start, 1=stop
    // dwSpeed: 1 to 7
    [DllImport("HCNetSDK.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern bool NET_DVR_PTZControlWithSpeed_Other(
        int lUserID,
        int lChannel,
        uint dwPTZCommand,
        uint dwStop,
        uint dwSpeed
    );
}
"@

Add-Type -TypeDefinition $csharpCode

$init = [HikSDK]::NET_DVR_Init()
Write-Output "NET_DVR_Init: $init"

$devInfo = New-Object HikSDK+NET_DVR_DEVICEINFO_V30
$userId = [HikSDK]::NET_DVR_Login_V30("192.168.101.39", 8000, "admin", "Melchan5.", [ref]$devInfo)

Write-Output "Login UserID: $userId"
if ($userId -ge 0) {
    Write-Output "LOGIN SUCCESSFUL to Ezviz C6N via HCNetSDK!"
    
    # Test PAN LEFT for 500ms
    Write-Output "Sending PAN_LEFT (23)..."
    $resStart = [HikSDK]::NET_DVR_PTZControlWithSpeed_Other($userId, 1, 23, 0, 4)
    Write-Output "PTZ Start Result: $resStart"
    
    Start-Sleep -Milliseconds 600
    
    $resStop = [HikSDK]::NET_DVR_PTZControlWithSpeed_Other($userId, 1, 23, 1, 4)
    Write-Output "PTZ Stop Result: $resStop"
    
    [HikSDK]::NET_DVR_Logout($userId)
} else {
    $err = [HikSDK]::NET_DVR_GetLastError()
    Write-Output "Login Failed, Error Code: $err"
}

[HikSDK]::NET_DVR_Cleanup()
