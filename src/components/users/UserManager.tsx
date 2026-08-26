'use client';

import React from 'react';
import {
  Users,
  UserPlus,
  ShieldAlert,
  Clock,
  Calendar,
  Sparkles,
  Mail,
  Key,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Send,
  X
} from 'lucide-react';
import { UserItem, UserRole } from '@/types';

export interface UserManagerProps {
  usersList: UserItem[];
  setUsersList: (users: UserItem[]) => void;
  activeSession: any;
  setActiveSession: (sess: any) => void;
  operatorSessionLimit: number;
  setOperatorSessionLimit: (limit: number) => void;
  setOperatorSessionRemaining: (rem: number) => void;
  resendingEmailFor: string | null;
  handleResendUserCredentials: (u: UserItem) => void;
  onOpenResetPasswordModal: (email: string) => void;

  // Add User State
  showAddUserModal: boolean;
  setShowAddUserModal: (show: boolean) => void;
  newUserName: string;
  setNewUserName: (name: string) => void;
  newUserEmail: string;
  setNewUserEmail: (email: string) => void;
  newUserRole: UserRole;
  setNewUserRole: (role: UserRole) => void;
  isAddingUser: boolean;
  lastCreatedUserCredentials: any;
  setLastCreatedUserCredentials: (creds: any) => void;
  setAddUserSuccessMsg: (msg: string | null) => void;
  handleCreateUser: (e: React.FormEvent) => void;

  // Delete User State
  userToDelete: UserItem | null;
  setUserToDelete: (u: UserItem | null) => void;
}

export const UserManager: React.FC<UserManagerProps> = ({
  usersList,
  setUsersList,
  activeSession,
  setActiveSession,
  operatorSessionLimit,
  setOperatorSessionLimit,
  setOperatorSessionRemaining,
  resendingEmailFor,
  handleResendUserCredentials,
  onOpenResetPasswordModal,
  showAddUserModal,
  setShowAddUserModal,
  newUserName,
  setNewUserName,
  newUserEmail,
  setNewUserEmail,
  newUserRole,
  setNewUserRole,
  isAddingUser,
  lastCreatedUserCredentials,
  setLastCreatedUserCredentials,
  setAddUserSuccessMsg,
  handleCreateUser,
  userToDelete,
  setUserToDelete
}) => {
  // Edit User State
  const [userToEdit, setUserToEdit] = React.useState<UserItem | null>(null);
  const [editName, setEditName] = React.useState<string>('');
  const [editRole, setEditRole] = React.useState<UserRole>('operator');
  const [editRestricted, setEditRestricted] = React.useState<boolean>(true);
  const [editStartDate, setEditStartDate] = React.useState<string>('');
  const [editEndDate, setEditEndDate] = React.useState<string>('');
  const [editStartTime, setEditStartTime] = React.useState<string>('07:00');
  const [editEndTime, setEditEndTime] = React.useState<string>('18:00');
  const [editDays, setEditDays] = React.useState<string[]>(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
  const [isSavingEdit, setIsSavingEdit] = React.useState<boolean>(false);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" /> User Management & Hak Akses (Admin & Operator)
          </h2>
          <p className="text-xs text-slate-500">Kelola akun Admin (Dosen/KaLab) dan Operator (Mahasiswa)</p>
        </div>

        <button
          onClick={() => setShowAddUserModal(true)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition"
        >
          <UserPlus className="w-4 h-4" /> Tambah User Baru
        </button>
      </div>

      {/* Single Active Session Lock Panel */}
      <div className="p-4 bg-sky-50/90 rounded-2xl border border-sky-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-sky-600" />
            <h4 className="text-xs font-bold text-sky-900">
              Status Kunci Sesi Tunggal (Single Active Session Lock)
            </h4>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${activeSession ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-slate-100 text-slate-500'}`}>
              {activeSession ? '🟢 1 SESI AKTIF' : '⚪ BEBAS / SIAP'}
            </span>
          </div>
          <p className="text-[11.5px] text-sky-800 leading-relaxed">
            {activeSession ? (
              <>
                Sesi aktif oleh: <strong>{activeSession.name}</strong> (<code>{activeSession.email}</code>) — Terhubung sejak {activeSession.loginTime}. Pengguna lain diblokir dari login untuk mencegah konflik data kendali hardware.
              </>
            ) : (
              'Sistem dalam keadaan bebas. Belum ada pengguna lain yang mengunci sesi.'
            )}
          </p>
        </div>

        {activeSession && (
          <button
            onClick={() => {
              try {
                localStorage.removeItem('fluidhe_active_session');
              } catch (e) { }
              setActiveSession(null);
              alert('✅ Kunci sesi berhasil diakhiri! Pengguna lain sekarang dapat melakukan login.');
            }}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition whitespace-nowrap cursor-pointer"
          >
            ⚠️ Akhiri / Reset Sesi Aktif
          </button>
        )}
      </div>

      {/* Admin Setting: Session Limit for Operators */}
      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" /> Pengaturan Batas Durasi Sesi Praktikum Operator
          </h4>
          <p className="text-[11px] text-amber-800 mt-0.5">
            Tentukan durasi maksimum pengoperasian alat bagi mahasiswa sebelum sesi otomatis diakhiri.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-700">Durasi Sesi:</label>
          <select
            value={operatorSessionLimit}
            onChange={(e) => {
              const mins = Number(e.target.value);
              setOperatorSessionLimit(mins);
              setOperatorSessionRemaining(mins * 60);
            }}
            className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value={15}>15 Menit</option>
            <option value={30}>30 Menit (Default)</option>
            <option value={60}>60 Menit (1 Jam)</option>
            <option value={120}>120 Menit (2 Jam)</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3">ID User</th>
              <th className="p-3">Nama Pengguna</th>
              <th className="p-3">Email UAD</th>
              <th className="p-3">Role / Hak Akses</th>
              <th className="p-3">Jadwal & Tanggal Akses Login</th>
              <th className="p-3">Status</th>
              <th className="p-3">Login Terakhir</th>
              <th className="p-3">Aksi (Kontrol Admin)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usersList.map((u) => (
              <tr key={`${u.id}-${u.email}`} className="hover:bg-slate-50/80 transition">
                <td className="p-3 font-mono font-bold text-slate-600">{u.id}</td>
                <td className="p-3 font-bold text-slate-900">{u.name}</td>
                <td className="p-3 text-slate-600">{u.email}</td>
                <td className="p-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${u.role === 'admin'
                    ? 'bg-sky-100 text-sky-700 border border-sky-200'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3">
                  {u.isScheduleRestricted ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="px-2.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1 w-fit">
                        <Calendar className="w-3 h-3 text-amber-600 shrink-0" />
                        {u.allowedStartDate} s.d. {u.allowedEndDate}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 pl-0.5">
                        <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" /> Jam {u.allowedStartTime || '07:00'} - {u.allowedEndTime || '18:00'} WIB
                      </span>
                    </div>
                  ) : (
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-slate-500" />
                      24/7 Akses Bebas
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                    {u.status}
                  </span>
                </td>
                <td className="p-3 text-slate-500">{u.lastLogin}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => onOpenResetPasswordModal(u.email)}
                      className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 transition"
                      title="Reset / Ganti Kata Sandi (Verifikasi OTP)"
                    >
                      <Key className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        const today = new Date().toISOString().slice(0, 10);
                        setUserToEdit(u);
                        setEditName(u.name);
                        setEditRole(u.role);
                        setEditRestricted(u.isScheduleRestricted ?? (u.role === 'operator'));
                        setEditStartDate(u.allowedStartDate || today);
                        setEditEndDate(u.allowedEndDate || today);
                        setEditStartTime(u.allowedStartTime || '07:00');
                        setEditEndTime(u.allowedEndTime || '18:00');
                        setEditDays(u.allowedDays && u.allowedDays.length > 0 ? u.allowedDays : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
                      }}
                      className="p-1 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      title="Edit Pengguna & Jadwal Akses"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setUserToDelete(u)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition"
                      title="Hapus User"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL KONFIRMASI HAPUS USER */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 text-slate-800 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900">
                Hapus Akun Pengguna?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus akun <strong className="text-slate-800">{userToDelete.name}</strong> (<code>{userToDelete.email}</code>) dengan peran <span className="font-bold uppercase text-slate-700">[{userToDelete.role}]</span>?
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Akun yang dihapus tidak dapat login kembali.</span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/users?id=${encodeURIComponent(userToDelete.id)}&email=${encodeURIComponent(userToDelete.email)}`, {
                      method: 'DELETE'
                    });
                    const data = await res.json();
                    if (data.success && Array.isArray(data.users)) {
                      setUsersList(data.users);
                    } else {
                      setUsersList(usersList.filter((x) => x.id !== userToDelete.id));
                    }
                  } catch (e) {
                    setUsersList(usersList.filter((x) => x.id !== userToDelete.id));
                  }
                  setUserToDelete(null);
                }}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH USER BARU */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 text-slate-800 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Tambah User Baru
                  </h3>
                  <p className="text-[10.5px] text-slate-500">Kredensial otomatis dikirim ke email pengguna</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddUserModal(false);
                  setAddUserSuccessMsg(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {lastCreatedUserCredentials ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>User Berhasil Didaftarkan!</span>
                </div>
                <p className="text-emerald-700 leading-relaxed">
                  Kredensial login untuk <strong>{lastCreatedUserCredentials.name}</strong> (<code>{lastCreatedUserCredentials.email}</code>) telah disimpan & dikirim ke email.
                </p>
                <div className="p-3 bg-white border border-emerald-300 rounded-xl space-y-1.5 font-mono">
                  <div className="text-[11px] text-slate-500 font-sans">Kata Sandi Awal Pengguna:</div>
                  <div className="text-base font-black text-emerald-800 tracking-wider flex items-center justify-between">
                    <span className="bg-emerald-50 px-2 py-1 rounded border border-emerald-200">{lastCreatedUserCredentials.password}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(lastCreatedUserCredentials.password);
                        alert('Kata sandi berhasil disalin ke clipboard!');
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg font-sans transition"
                    >
                      Salin Sandi
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserModal(false);
                    setLastCreatedUserCredentials(null);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Selesai & Tutup
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Pengguna</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email Pengguna</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@uad.ac.id"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role / Hak Akses</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    <option value="operator">Operator (Mahasiswa Praktikum)</option>
                    <option value="admin">Admin (Dosen / KaLab)</option>
                  </select>
                </div>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-[11px] text-sky-800 flex items-start gap-2 leading-relaxed">
                  <Lock className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Keamanan Sandi Terenkripsi:</strong> Sistem akan otomatis men-generate kata sandi awal acak yang aman dan mengirimkannya ke email user. Admin tidak perlu mengatur kata sandi manual dan tidak mengetahui kata sandi pribadi pengguna.
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingUser}
                    className="w-2/3 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isAddingUser ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mendaftarkan & Mengirim Email...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" /> Daftarkan & Kirim Sandi
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* MODAL EDIT PENGGUNA & JADWAL AKSES */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 text-slate-800 animate-in zoom-in-95 duration-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Edit Pengguna & Jadwal Akses
                  </h3>
                  <p className="text-[10.5px] text-slate-500 font-mono">{userToEdit.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUserToEdit(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSavingEdit(true);
                try {
                  const res = await fetch('/api/users', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: userToEdit.id,
                      email: userToEdit.email,
                      name: editName.trim(),
                      newRole: editRole,
                      isScheduleRestricted: editRole === 'operator' ? editRestricted : false,
                      allowedStartDate: editStartDate,
                      allowedEndDate: editEndDate,
                      allowedStartTime: editStartTime,
                      allowedEndTime: editEndTime,
                      allowedDays: editDays
                    })
                  });
                  const data = await res.json();
                  if (data.success && Array.isArray(data.users)) {
                    setUsersList(data.users);
                  } else {
                    setUsersList(
                      usersList.map((x) =>
                        x.id === userToEdit.id
                          ? {
                              ...x,
                              name: editName.trim(),
                              role: editRole,
                              isScheduleRestricted: editRole === 'operator' ? editRestricted : false,
                              allowedStartDate: editStartDate,
                              allowedEndDate: editEndDate,
                              allowedStartTime: editStartTime,
                              allowedEndTime: editEndTime,
                              allowedDays: editDays
                            }
                          : x
                      )
                    );
                  }
                  setUserToEdit(null);
                } catch (err) {
                  console.error('Failed to update user', err);
                  alert('Gagal menyimpan perubahan');
                } finally {
                  setIsSavingEdit(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Pengguna</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role / Hak Akses</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
                >
                  <option value="operator">Operator (Mahasiswa Praktikum)</option>
                  <option value="admin">Admin (Dosen / KaLab)</option>
                </select>
              </div>

              {/* Toggle Pembatasan Jadwal */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Batasi Jadwal Akses Lab</span>
                    <span className="text-[10.5px] text-slate-500">
                      {editRestricted ? 'Akses dibatasi sesuai tanggal, hari, dan jam tertentu' : 'Pengguna memiliki akses bebas 24/7 tanpa batas waktu'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editRestricted}
                    onChange={(e) => setEditRestricted(e.target.checked)}
                    className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                  />
                </div>

                {editRestricted && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 animate-in fade-in duration-150">
                    {/* Range Tanggal */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-sky-600" /> Tanggal Mulai
                        </label>
                        <input
                          type="date"
                          value={editStartDate}
                          onChange={(e) => setEditStartDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-sky-600" /> Tanggal Berakhir
                        </label>
                        <input
                          type="date"
                          value={editEndDate}
                          onChange={(e) => setEditEndDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-medium"
                        />
                      </div>
                    </div>

                    {/* Hari yang Diizinkan */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Hari Akses yang Diizinkan:</label>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => {
                          const isSelected = editDays.includes(day);
                          return (
                            <button
                              type="button"
                              key={day}
                              onClick={() => {
                                if (isSelected) {
                                  setEditDays(editDays.filter((d) => d !== day));
                                } else {
                                  setEditDays([...editDays, day]);
                                }
                              }}
                              className={`py-1.5 px-1 text-[10.5px] font-bold rounded-lg border transition cursor-pointer ${
                                isSelected
                                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {day.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Jam Mulai & Selesai */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-sky-600" /> Jam Mulai Akses
                        </label>
                        <input
                          type="time"
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-sky-600" /> Jam Selesai Akses
                        </label>
                        <input
                          type="time"
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToEdit(null)}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="w-2/3 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    'Simpan Perubahan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default UserManager;
