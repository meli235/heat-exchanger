'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { UserItem, UserRole } from '@/types';
import { UserManager } from './UserManager';

export interface UsersTabProps {
  currentUser: { name: string; role: UserRole; email: string };
  usersList: UserItem[];
  setUsersList: (users: UserItem[]) => void;
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

export const UsersTab: React.FC<UsersTabProps> = ({
  currentUser,
  usersList,
  setUsersList,
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
  return (
    <div className="space-y-6">
      {currentUser.role !== 'admin' ? (
        <div className="asklepios-card p-8 bg-white text-center space-y-3">
          <div className="inline-flex p-4 bg-red-50 text-red-600 rounded-full mb-2">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Akses Dibatasi (Admin Only)</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Halaman Manajemen User hanya dapat diakses oleh akun dengan Role <strong>ADMIN</strong>.
          </p>
        </div>
      ) : (
        <div className="asklepios-card p-6 bg-white space-y-6">
          <UserManager
            usersList={usersList}
            setUsersList={setUsersList}
            operatorSessionLimit={operatorSessionLimit}
            setOperatorSessionLimit={setOperatorSessionLimit}
            setOperatorSessionRemaining={setOperatorSessionRemaining}
            resendingEmailFor={resendingEmailFor}
            handleResendUserCredentials={handleResendUserCredentials}
            onOpenResetPasswordModal={onOpenResetPasswordModal}
            showAddUserModal={showAddUserModal}
            setShowAddUserModal={setShowAddUserModal}
            newUserName={newUserName}
            setNewUserName={setNewUserName}
            newUserEmail={newUserEmail}
            setNewUserEmail={setNewUserEmail}
            newUserRole={newUserRole}
            setNewUserRole={setNewUserRole}
            isAddingUser={isAddingUser}
            lastCreatedUserCredentials={lastCreatedUserCredentials}
            setLastCreatedUserCredentials={setLastCreatedUserCredentials}
            setAddUserSuccessMsg={setAddUserSuccessMsg}
            handleCreateUser={handleCreateUser}
            userToDelete={userToDelete}
            setUserToDelete={setUserToDelete}
          />
        </div>
      )}
    </div>
  );
};
export default UsersTab;
