$sdkPath = "C:\Program Files (x86)\Ezviz Studio"
$env:PATH = "$sdkPath;" + $env:PATH

$csharpCode = @"
using System;
using System.Runtime.InteropServices;

public class HikSDK2 {
    [DllImport("HCNetSDK.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern bool NET_DVR_Init();

    [DllImport("HCNetSDK.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern bool NET_DVR_Cleanup();

    [DllImport("HCNetSDK.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int NET_DVR_GetLastError();

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct NET_DVR_USER_LOGIN_INFO {
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 129)]
        public string sDeviceAddress;
        public byte byUseTransport;
        public ushort wPort;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)]
        public string sUserName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)]
        public string sPassword;
        public IntPtr cbLoginResult;
        public IntPtr pUser;
        public bool bUseAsynLogin;
        public byte byProxyType;
        public byte byUseUTCTime;
        public byte byLoginMode;
        public byte byHttps;
        public int iProxyID;
        public byte byVerifyMode;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 119)]
        public byte[] byRes3;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct NET_DVR_DEVICEINFO_V40 {
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
        public byte byVoiceInChanNum;
        public byte byStartVoiceInChanNo;
        public byte bySupport5;
        public byte bySupport6;
        public byte byMirrorChanNum;
        public ushort wStartMirrorChanNo;
        public byte bySupport7;
        public byte byRes2;
    }

    [DllImport("HCNetSDK.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int NET_DVR_Login_V40(
        ref NET_DVR_USER_LOGIN_INFO pLoginInfo,
        ref NET_DVR_DEVICEINFO_V40 lpDeviceInfo
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

$init = [HikSDK2]::NET_DVR_Init()
Write-Output "NET_DVR_Init: $init"

$loginInfo = New-Object HikSDK2+NET_DVR_USER_LOGIN_INFO
$loginInfo.sDeviceAddress = "192.168.101.39"
$loginInfo.wPort = 8000
$loginInfo.sUserName = "admin"
$loginInfo.sPassword = "Melchan5."
$loginInfo.bUseAsynLogin = $false
$loginInfo.byUseTransport = 0
$loginInfo.byLoginMode = 0

$devInfo = New-Object HikSDK2+NET_DVR_DEVICEINFO_V40

$userId = [HikSDK2]::NET_DVR_Login_V40([ref]$loginInfo, [ref]$devInfo)
Write-Output "Login_V40 UserID: $userId"

if ($userId -ge 0) {
    Write-Output ">>> LOGIN SUCCESSFUL to Ezviz C6N!"
    Write-Output "Rotating Physical Camera Pan Left..."
    [HikSDK2]::NET_DVR_PTZControlWithSpeed_Other($userId, 1, 23, 0, 4)
    Start-Sleep -Milliseconds 700
    [HikSDK2]::NET_DVR_PTZControlWithSpeed_Other($userId, 1, 23, 1, 4)
    Write-Output "Stop command sent!"
    [HikSDK2]::NET_DVR_Logout($userId)
} else {
    $err = [HikSDK2]::NET_DVR_GetLastError()
    Write-Output "Login_V40 Error: $err"
}

[HikSDK2]::NET_DVR_Cleanup()
