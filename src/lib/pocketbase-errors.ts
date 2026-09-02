export function handlePocketbaseError(error: any, operationType: string, path: string | null, user: any) {
  // PocketBase returns 404 for both "not found" and "rule denied" (it never
  // reveals which, to avoid leaking record existence to unauthorized callers).
  const info = {
    status: error?.status,
    operationType,
    path,
    message: error?.response?.message || error?.message,
    user: user ? { id: user.id, email: user.email, role: user.role } : 'unauthenticated',
  };
  console.error('PocketBase error:', JSON.stringify(info, null, 2));
}
