export const uploadToCloud = async (
  blob: Blob,
  fileName: string,
  folder: 'telemetry-logs' | 'cctv-snapshots' | 'cctv-recordings' | 'daily-reports'
) => {
  const formData = new FormData();
  formData.append('file', new File([blob], fileName, { type: blob.type }));
  formData.append('folder', folder);

  const res = await fetch('/api/storage/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error || 'Upload failed');
  }

  return {
    url: data.url as string,
    path: data.path as string,
    fileName: data.fileName as string,
  };
};
