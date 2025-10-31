# Fix Git Email for Vercel Integration

Your commits are using: `agyemanjoseph21@gmail.com`

This email must be associated with your GitHub account for Vercel to link commits.

---

## Option 1: Add Email to GitHub Account (Easiest)

1. **Go to GitHub**: https://github.com/settings/emails
2. **Click "Add email address"**
3. **Enter**: `agyemanjoseph21@gmail.com`
4. **Verify** the email (check your inbox)
5. **Done!** Vercel will now recognize your commits

---

## Option 2: Change Git Config to Match GitHub Email

If you prefer to use a different email that's already on GitHub:

1. **Find your GitHub email**:
   - Go to: https://github.com/settings/emails
   - Copy your primary email (or any verified email)

2. **Update git config**:
   ```bash
   git config user.email "your-github-email@example.com"
   ```

3. **Update the last commit** (to fix existing commits):
   ```bash
   git commit --amend --author="Your Name <your-github-email@example.com>" --no-edit
   git push --force
   ```

⚠️ **Note**: Only use `--force` if you're the only one working on the repo!

---

## Option 3: Update Git Config Globally (For Future Commits)

To set the email for all future commits:

```bash
git config --global user.email "your-github-email@example.com"
git config --global user.name "Your Name"
```

---

## ✅ Already Done

Your git config has been updated to use: `agyemanjoseph12@gmail.com`

## Next Step Required

**Add `agyemanjoseph12@gmail.com` to your GitHub account** (per [GitHub's official documentation](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)):

1. Visit: https://github.com/settings/emails
2. Click **"Add email address"**
3. Enter: `agyemanjoseph12@gmail.com`
4. Verify the email (check your inbox for verification email)
5. **Important**: Make sure this email is verified so commits are attributed to you

This will:
- ✅ Make your commits appear in your contributions graph
- ✅ Allow Vercel to recognize your commits
- ✅ Associate all future commits with your GitHub account

**Reference**: [GitHub Docs - Setting your commit email address](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)

