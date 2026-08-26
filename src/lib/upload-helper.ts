import { uploadToDrive } from './drive-upload';

export const uploadToCloud = async (
  blob: Blob,
  fileName: string,
  folder: 'telemetry-logs' | 'cctv-snapshots' | 'cctv-recordings' | 'daily-reports' | string
) => {
  // Map folder parameter to Google Drive folder name
  let driveFolder: 'Telemetry_Logs' | 'CCTV_Snapshots' | 'CCTV_Recordings' | 'Daily_Reports' = 'CCTV_Recordings';

  const folderLower = folder.toLowerCase();
  if (folderLower.includes('snapshot')) {
    driveFolder = 'CCTV_Snapshots';
  } else if (folderLower.includes('log')) {
    driveFolder = 'Telemetry_Logs';
  } else if (folderLower.includes('report')) {
    driveFolder = 'Daily_Reports';
  } else {
    driveFolder = 'CCTV_Recordings';
  }

  try {
    // Primary Upload target: Google Drive
    const driveResult = await uploadToDrive(blob, fileName, driveFolder);
    return {
      url: driveResult.viewUrl,
      path: driveResult.downloadUrl,
      fileName: driveResult.fileName,
    };
  } catch (driveErr) {
    console.warn('[uploadToCloud] Google Drive upload failed, trying Supabase fallback:', driveErr);

    // Fallback to Supabase Storage if configured
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
  }
};
