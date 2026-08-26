import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { UserItem } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const todayStr = new Date().toISOString().slice(0, 10);

const DEFAULT_DATA: { users: UserItem[]; passwords: Record<string, string> } = {
  users: [
    {
      id: 'USR-01',
      name: 'Admin Lab (Anugrah)',
      email: 'anugrahtriplecycle@gmail.com',
      role: 'admin',
      status: 'Active',
      lastLogin: 'Belum Pernah',
      isScheduleRestricted: false
    }
  ],
  passwords: {
    'anugrahtriplecycle@gmail.com': 'admin123',
    'admin@uad.ac.id': 'admin123'
  }
};

function readDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
      return DEFAULT_DATA;
    }
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.users || !Array.isArray(parsed.users)) {
      parsed.users = DEFAULT_DATA.users;
    }
    if (!parsed.passwords) {
      parsed.passwords = DEFAULT_DATA.passwords;
    }

    // Auto-fix duplicate IDs
    const seenIds = new Set<string>();
    let counter = 1;
    parsed.users = parsed.users.map((u: UserItem) => {
      if (!u.id || seenIds.has(u.id)) {
        u.id = `USR-${String(counter).padStart(2, '0')}`;
      }
      seenIds.add(u.id);
      counter++;
      return u;
    });

    return parsed;
  } catch (err) {
    console.error('[Users API] Error reading database:', err);
    return DEFAULT_DATA;
  }
}

function writeDatabase(data: { users: UserItem[]; passwords: Record<string, string> }) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Users API] Error writing database:', err);
  }
}

// GET: Ambil daftar seluruh user & password publik sistem
export async function GET() {
  const db = readDatabase();
  return NextResponse.json({
    success: true,
    users: db.users,
    passwords: db.passwords
  });
}

// POST: Tambah User Baru
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, role, password, isScheduleRestricted, allowedStartDate, allowedEndDate, allowedStartTime, allowedEndTime } = body;

    if (!email || !name) {
      return NextResponse.json({ success: false, error: 'Nama dan Email wajib diisi' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = readDatabase();

    if (db.users.some((u: UserItem) => u.email.toLowerCase() === cleanEmail)) {
      return NextResponse.json({ success: false, error: `Email ${cleanEmail} sudah terdaftar!` }, { status: 400 });
    }

    // Generate guaranteed unique ID
    let maxNum = 0;
    db.users.forEach((u: UserItem) => {
      const match = u.id?.match(/\d+/);
      if (match) {
        const n = parseInt(match[0], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    const nextId = `USR-${String(maxNum + 1).padStart(2, '0')}`;

    const newUser: UserItem = {
      id: nextId,
      name: name.trim(),
      email: cleanEmail,
      role: role || 'operator',
      status: 'Active',
      lastLogin: 'Belum Pernah',
      isScheduleRestricted: role === 'operator' ? (isScheduleRestricted ?? true) : false,
      allowedStartDate: allowedStartDate || todayStr,
      allowedEndDate: allowedEndDate || todayStr,
      allowedDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
      allowedStartTime: allowedStartTime || '07:00',
      allowedEndTime: allowedEndTime || '18:00'
    };

    db.users.push(newUser);
    if (password) {
      db.passwords[cleanEmail] = password;
    }

    writeDatabase(db);

    return NextResponse.json({
      success: true,
      user: newUser,
      users: db.users,
      passwords: db.passwords
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

// PATCH: Update User (Ganti Password, Ubah Role, Jadwal Akses Tanggal/Hari/Jam, dll)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      id,
      name,
      newPassword,
      newRole,
      isScheduleRestricted,
      allowedStartDate,
      allowedEndDate,
      allowedStartTime,
      allowedEndTime,
      allowedDays,
      status,
      lastLogin
    } = body;

    const db = readDatabase();

    const targetUser = db.users.find((x: UserItem) => {
      if (id && x.id === id) return true;
      if (email && x.email.toLowerCase() === email.toLowerCase().trim()) return true;
      return false;
    });

    if (targetUser) {
      if (name) targetUser.name = name.trim();
      if (newRole) targetUser.role = newRole;
      if (typeof isScheduleRestricted === 'boolean') targetUser.isScheduleRestricted = isScheduleRestricted;
      if (allowedStartDate !== undefined) targetUser.allowedStartDate = allowedStartDate;
      if (allowedEndDate !== undefined) targetUser.allowedEndDate = allowedEndDate;
      if (allowedStartTime !== undefined) targetUser.allowedStartTime = allowedStartTime;
      if (allowedEndTime !== undefined) targetUser.allowedEndTime = allowedEndTime;
      if (Array.isArray(allowedDays)) targetUser.allowedDays = allowedDays;
      if (status) targetUser.status = status;
      if (lastLogin) targetUser.lastLogin = lastLogin;
    }

    if (email && newPassword) {
      const cleanEmail = email.toLowerCase().trim();
      db.passwords[cleanEmail] = newPassword;
    }

    writeDatabase(db);

    return NextResponse.json({
      success: true,
      users: db.users,
      passwords: db.passwords
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

// DELETE: Hapus User
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    const db = readDatabase();

    if (id || email) {
      const cleanEmail = email ? email.toLowerCase().trim() : null;
      db.users = db.users.filter((u: UserItem) => {
        if (id && u.id === id) return false;
        if (cleanEmail && u.email.toLowerCase() === cleanEmail) return false;
        return true;
      });

      if (cleanEmail && db.passwords[cleanEmail]) {
        delete db.passwords[cleanEmail];
      }
    }

    writeDatabase(db);

    return NextResponse.json({
      success: true,
      users: db.users,
      passwords: db.passwords
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
