export const uploadToDrive = async (
  blob: Blob,
  fileName: string,
  folder: 'Telemetry_Logs' | 'CCTV_Snapshots' | 'CCTV_Recordings' | 'Daily_Reports'
) => {
  const formData = new FormData();
  formData.append('file', new File([blob], fileName, { type: blob.type }));
  formData.append('folder', folder);

  const res = await fetch('/api/drive/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error || 'Upload failed');
  }

  return {
    viewUrl: data.viewUrl as string,
    downloadUrl: data.downloadUrl as string,
    fileName: data.fileName as string,
  };
};
