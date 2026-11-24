# CARERO
Autism Care Rota and Staff Allocation Web App

## Run it

```bash
npm install
cp .env.example .env.local   # connect to the Carero Supabase project
npm run dev                  # http://localhost:3000
```

Leave `.env.local` out (or empty) to run in **demo mode**: no login, data saved in your browser only.

## How data is stored

- **Supabase** (London region). Each centre is an *organisation*; managers sign up, create their centre, and only ever see their own centre's data. This is enforced in the database by row-level security, not just the app.
- Schema and security rules: `supabase/migrations/`.

## Sick cover

1. **Staff Called In Sick?** → pick the person, the dates (or **Rest of the week**), and the reason.
2. Affected service users turn red, with suggestions for who can cover.
3. Suggestions only include staff who are in that day, not already booked, at the right support level, and hold every skill listed under the service user's **Staff must have**.
4. **Quick Reassign** covers every gap in one click, highest support level first.

## Cover requests (online version)

1. On a shift that needs cover, click **Request cover**. Suitable staff are pre-ticked.
2. Click **Create links**, then send each person their link with **WhatsApp**, **Text** or **Copy message**. This uses your own phone, so there's no SMS cost.
3. Staff tap the link (no login) and choose **Yes, I'll cover** or **Can't do it**.
4. The first to accept gets the shift and the rota updates itself. Everyone else's link shows "Already covered".

Links carry a 256-bit random token. The message contains no service user details. The link page shows only first names, the date and the time.
Add staff mobile numbers on the Staff page so WhatsApp/Text open with the right person.

## Inviting another manager (e.g. your boss)

1. **Settings → Team → Create invite link** (add who it's for, if you like).
2. Send it with **WhatsApp**, **Email** or **Copy message**.
3. They open the link, create an account or sign in, and tap **Join**. You now share the same rota.

Links work once and expire after 7 days. Pending invites can be cancelled. Managers can remove people, but never the last manager.

## Weekly rota

**Weekly Rota** shows Monday to Sunday at a glance:
- **Blue** cells are covered shifts.
- **Red** cells mean the assigned person is off and the shift needs cover.
- **Dashed** cells mean nobody is assigned.
- The **Off this week** row lists absences.

Click any cell or day to open it on the dashboard. **Copy last week** fills only completely empty days, so it never overwrites anything. **Print week** saves a landscape PDF.
