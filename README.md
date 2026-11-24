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
