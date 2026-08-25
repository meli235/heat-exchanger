const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'records', 'temp');
const HE_CCTV_DIR = path.join(__dirname, '..', 'records', 'he_cctv');
const API_URL = 'http://127.0.0.1:3000/api/drive';

async function uploadFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const isVideo = ext === '.mp4';
    const isImage = ext === '.jpg' || ext === '.jpeg' || ext === '.png';

    if (!isVideo && !isImage) return;

    const stat = fs.statSync(filePath);
    if (stat.size < 10000) return; // Skip tiny / incomplete files (< 10KB)

    // Skip if file was modified less than 10 seconds ago (FFmpeg still actively writing)
    if (Date.now() - stat.mtimeMs < 10000) return;

    // Check if file is locked by another process (FFmpeg)
    try {
      const fd = fs.openSync(filePath, 'r+');
      fs.closeSync(fd);
    } catch (lockErr) {
      // File is still locked by FFmpeg, skip for now
      return;
    }

    const mimeType = isVideo ? 'video/mp4' : (ext === '.png' ? 'image/png' : 'image/jpeg');
    const targetFolder = isVideo ? 'cctv-recordings' : 'cctv-snapshots';

    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    const form = new FormData();
    form.append('file', new File([blob], path.basename(filePath), { type: mimeType }));
    form.append('folder', targetFolder);

    const res = await fetch(API_URL, { method: 'POST', body: form });
    const data = await res.json();

    if (data.success) {
      fs.unlinkSync(filePath); // hapus file lokal setelah berhasil upload
      console.log(`✅ Uploaded (${targetFolder}):`, path.basename(filePath));
    } else {
      console.log('❌ Failed:', data.error);
    }
  } catch (err) {
    console.log('❌ Error uploading file:', path.basename(filePath), err.message);
  }
}

function processQueue() {
  [TEMP_DIR, HE_CCTV_DIR].forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(f => uploadFile(path.join(dir, f)));
    }
  });
}

console.log('🚀 Upload queue worker started. Monitoring folders:', TEMP_DIR, HE_CCTV_DIR);
processQueue();

// Scan tiap 30 detik
setInterval(processQueue, 30 * 1000);
