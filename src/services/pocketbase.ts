import PocketBase from 'pocketbase';

// This is the public API base URL, not a secret - PocketBase's security lives
// in its collection API rules, the same way the old Firebase config being
// public was fine because security lived in firestore.rules.
export const POCKETBASE_URL = 'https://tune-frog.pockethost.io';

export const pb = new PocketBase(POCKETBASE_URL);

export type Role = 'admin' | 'teacher' | 'pca' | 'pending';

// The two accounts allowed to self-elevate to admin on registration - mirrors
// the bootstrap-admin allowance that used to live in firestore.rules, now
// enforced the same way server-side in the `users` collection's createRule.
const BOOTSTRAP_ADMIN_EMAILS = ['renegml@nv.ccsd.net', 'mrenegar@gmail.com'];

export async function loginWithPassword(email: string, password: string) {
  return pb.collection('users').authWithPassword(email, password);
}

export async function registerAccount(email: string, password: string, name: string) {
  const role: Role = BOOTSTRAP_ADMIN_EMAILS.includes(email) ? 'admin' : 'pending';
  await pb.collection('users').create({
    email,
    password,
    passwordConfirm: password,
    name,
    role,
  });
  return loginWithPassword(email, password);
}

export function logout() {
  pb.authStore.clear();
}
