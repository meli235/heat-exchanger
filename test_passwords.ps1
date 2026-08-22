$sdkPath = "C:\Program Files (x86)\Ezviz Studio"
$env:PATH = "$sdkPath;" + $env:PATH

$csharpCode = @"
using System;
using System.Runtime.InteropServices;

public class HikSDK3 {
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

$init = [HikSDK3]::NET_DVR_Init()
Write-Output "NET_DVR_Init: $init"

$passwords = @("TJPCYS", "Melchan5.", "admin")

foreach ($p in $passwords) {
    $devInfo = New-Object HikSDK3+NET_DVR_DEVICEINFO_V30
    $userId = [HikSDK3]::NET_DVR_Login_V30("192.168.101.39", [uint16]8000, "admin", $p, [ref]$devInfo)
    Write-Output "Testing password '$p' -> UserID: $userId"
    if ($userId -ge 0) {
        Write-Output ">>> SUCCESS WITH PASSWORD: $p"
        # Rotate Right
        [HikSDK3]::NET_DVR_PTZControlWithSpeed_Other($userId, 1, 24, 0, 4)
        Start-Sleep -Milliseconds 600
        [HikSDK3]::NET_DVR_PTZControlWithSpeed_Other($userId, 1, 24, 1, 4)
        [HikSDK3]::NET_DVR_Logout($userId)
        break
    } else {
        $err = [HikSDK3]::NET_DVR_GetLastError()
        Write-Output "Failed ($p), error: $err"
    }
}

[HikSDK3]::NET_DVR_Cleanup()
