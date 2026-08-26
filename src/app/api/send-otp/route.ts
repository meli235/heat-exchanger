import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp, type = 'OTP', role = 'operator', initialPassword, name = 'Pengguna' } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Alamat email diperlukan.' },
        { status: 400 }
      );
    }

    const smtpUser = process.env.SMTP_USER || 'anugrahtriplecycle@gmail.com';
    const smtpPass = (process.env.SMTP_PASS || 'zbwoavpuyibkxbgn').replace(/\s+/g, '');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    let subject = '';
    let htmlContent = '';

    if (type === 'NEW_ACCOUNT') {
      subject = `[FluidHE] Akun Laboratorium Anda Telah Dibuat - Kredensial Masuk`;
      htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #0284c7; margin: 0; font-size: 22px;">FluidHE Control System</h2>
            <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Sistem Monitoring & Kontrol Alat Heat Exchanger Laboratorium</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #bbf7d0; margin-bottom: 20px;">
            <p style="font-size: 13px; color: #166534; font-weight: 700; margin: 0 0 8px 0;">AKUN BARU TELAH TERDAFTAR</p>
            <p style="font-size: 13px; color: #334155; margin: 0 0 12px 0;">Halo <strong>${name}</strong>, Anda telah didaftarkan ke sistem dengan peran <strong style="text-transform: uppercase;">${role}</strong>.</p>
            <div style="font-size: 22px; font-weight: 800; letter-spacing: 2px; color: #14532d; font-family: monospace; background: #ffffff; padding: 10px 20px; border-radius: 8px; display: inline-block; border: 2px dashed #22c55e;">
              ${initialPassword}
            </div>
            <p style="font-size: 11px; color: #64748b; margin: 8px 0 0 0;">Ini adalah kata sandi awal acak Anda.</p>
          </div>

          <div style="background-color: #f8fafc; border-radius: 10px; padding: 14px; margin-bottom: 16px; font-size: 12px; color: #334155; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 6px 0;"><strong>Detail Akun:</strong></p>
            <p style="margin: 2px 0;">• <strong>Email:</strong> ${email}</p>
            <p style="margin: 2px 0;">• <strong>Role:</strong> <span style="text-transform: uppercase;">${role}</span></p>
            <p style="margin: 2px 0;">• <strong>Kata Sandi Awal:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${initialPassword}</code></p>
          </div>

          <div style="padding: 12px; background-color: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 4px; font-size: 11px; color: #0369a1; line-height: 1.5;">
            <strong>Privasi & Keamanan:</strong> Admin sistem tidak mengetahui kata sandi Anda setelah diubah. Anda dapat mengganti kata sandi kapan saja secara mandiri melalui menu <em>"Lupa / Ganti Sandi"</em> di halaman login dengan verifikasi OTP ke email ini.
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 12px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            © 2026 FluidHE Laboratory System • Hak Akses Terenkripsi
          </p>
        </div>
      `;
    } else {
      subject = `[FluidHE] Kode Verifikasi Reset Kata Sandi: ${otp}`;
      htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #0284c7; margin: 0; font-size: 22px;">FluidHE Control System</h2>
            <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Sistem Monitoring & Kontrol Alat Heat Exchanger Laboratorium</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #bae6fd; margin-bottom: 20px;">
            <p style="font-size: 13px; color: #0369a1; font-weight: 600; margin: 0 0 8px 0;">KODE VERIFIKASI OTP RESMI</p>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0c4a6e; font-family: monospace; background: #ffffff; padding: 10px 20px; border-radius: 8px; display: inline-block; border: 2px dashed #0284c7;">
              ${otp}
            </div>
            <p style="font-size: 11px; color: #64748b; margin: 8px 0 0 0;">Kode ini berlaku selama <strong>5 menit</strong>.</p>
          </div>

          <p style="font-size: 13px; color: #334155; line-height: 1.6;">
            Halo <strong>${email}</strong>,<br>
            Permintaan verifikasi untuk mengganti kata sandi akun FluidHE Anda telah diterima. Masukkan kode OTP di atas pada halaman web untuk melanjutkan pembuatan kata sandi baru Anda secara pribadi.
          </p>

          <div style="margin-top: 20px; padding: 12px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; font-size: 11px; color: #991b1b;">
            <strong>Peringatan Keamanan:</strong> Jangan bagikan kode ini kepada siapapun (termasuk Admin atau asisten lab). Kata sandi baru Anda akan dienkripsi dan hanya Anda yang mengetahuinya.
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 12px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            © 2026 FluidHE Laboratory System • Keamanan & Akses Terenkripsi
          </p>
        </div>
      `;
    }

    const mailOptions = {
      from: `"FluidHE Lab Security" <${smtpUser}>`,
      to: email,
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[send-otp] SUCCESS sending to ${email} (type: ${type}), messageId: ${info.messageId}`);
    return NextResponse.json({
      success: true,
      method: 'SMTP',
      message: `Email berhasil dikirimkan ke ${email}`
    });
  } catch (error: any) {
    console.error('[send-otp] ERROR in send-otp API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengirim email.' },
      { status: 500 }
    );
  }
}
