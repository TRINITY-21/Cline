# Admin Authentication Setup

Your `/sakin` route is now password-protected! 🔒

---

## How It Works

- **Login Screen**: Visitors to `/sakin` see a password prompt
- **Password Verification**: Password is verified via API endpoint
- **Session Management**: Uses browser localStorage (stays logged in until logout)
- **Logout Button**: Available in the top-right corner when authenticated

---

## Setup Instructions

### Step 1: Set Admin Password in Environment Variables

**In Vercel:**
1. Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
2. Click **"Add New"**
3. **Key**: `ADMIN_PASSWORD` (or `NEXT_PUBLIC_ADMIN_PASSWORD`)
4. **Value**: Your secure password (choose a strong password!)
5. **Environment**: Select all (Production, Preview, Development)
6. Click **Save**

**Locally (.env.local):**
```bash
ADMIN_PASSWORD=your-secure-password-here
```

⚠️ **Important**: 
- Use a strong, unique password
- Don't commit the password to Git
- Keep it secure

---

## Security Notes

1. **Server-Side Verification**: Password is verified on the server (not just client-side)
2. **Environment Variable**: Password is stored in environment variables, not in code
3. **LocalStorage Session**: Login persists in browser until logout (or cleared)
4. **API Protection**: The `/api/admin/auth` endpoint validates the password

---

## Usage

1. Visit: https://threetwo.vercel.app/sakin
2. Enter your admin password
3. Click "Access Dashboard"
4. You'll stay logged in until you click "Logout"

---

## Changing the Password

1. Update `ADMIN_PASSWORD` in Vercel environment variables
2. Redeploy your app (or it will update automatically on next push)
3. All users will need to log in again with the new password

---

## Troubleshooting

**Password not working?**
- Check environment variable is set correctly in Vercel
- Verify variable name: `ADMIN_PASSWORD` or `NEXT_PUBLIC_ADMIN_PASSWORD`
- Make sure app is redeployed after adding the variable

**Can't log in?**
- Clear browser localStorage: Open DevTools → Application → Local Storage → Clear
- Try logging in again
- Check browser console for errors

**Want to disable auth temporarily?**
- Remove the `AdminLoginGuard` wrapper in `app/sakin/page.tsx`
- Or set a default password in the code (not recommended for production)

---

✅ **Your admin dashboard is now protected!**

