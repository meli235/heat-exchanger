$ezvizProc = Get-Process -Name "EzvizStudio" -ErrorAction SilentlyContinue

if ($ezvizProc) {
    Write-Output "EzvizStudio Process ID: $($ezvizProc.Id)"
    Write-Output "Main Window Title: $($ezvizProc.MainWindowTitle)"
    Write-Output "Main Window Handle: $($ezvizProc.MainWindowHandle)"
} else {
    Write-Output "EzvizStudio process not found."
}
