# GymSynk menu

You are signed in as the gym owner. Some items only appear when that feature is switched on in **Settings**.

| Menu | What it is for |
|---|---|
| **Dashboard** | Today’s snapshot: members, bookings, and what needs attention. |
| **Members** | Add and edit members. See who is active. |
| **Staff team** | Add owners, admins, and trainers, and set their logins. |
| **Schedule** | Build the class timetable. Staff book and manage sessions here. |
| **Staff roster** | Who is working, and when. |
| **Door entry** | Reception scanner. Check a member in with their gym pass. Shows only if door entry is on. |
| **Group training** | Class types and session packs you sell (for example 10 classes). Shows only if session packs are on. |
| **Member packs** | Which member has credits left on a pack. Shows only if session packs are on. |
| **Member guides** | Workout and meal ideas the owner publishes for members. |
| **Settings** | Turn features on or off, set the website embed, and upload the logo and brand colour. |
| **Member app** | Opens the phone app a joined member sees. Not part of the office menu. |

A person who has joined does not see this menu. Their app has a bar along the bottom:

| Tab | What it is for |
|---|---|
| **Bookings** | Pick a class and book it. Shows only if class booking is on. |
| **Workouts** | Session ideas published by the gym. |
| **Nutrition** | Meal ideas published by the gym. |
| **Gym pass** | Their QR code and 8-digit member number for the door. Shows only if door entry is on. |
| **Activity** | Visit medals. One medal step per day they were granted entry. Shows only if door entry is on. |
| **Account** | Their plan and billing. Shows only if memberships are on. |

## Door entry demo

Two screens. One is the member. One is reception.

1. In **Settings → Features**, turn **Door entry** on. You already have it on if **Door entry** is in the office menu and **Gym pass** is in the member app.
2. On a phone, open **Member app**, then **Gym pass**. That QR is the door pass. Staff passes say **Staff access** and are allowed in without a membership. A joined member sees **Gym pass** in their own app, without the office menu.
3. On a laptop or second phone, open **Door entry**. Allow the camera and point it at the QR. The result is **Granted** or **Denied**, and the scan is added to **Recent check-ins**.
4. If the camera will not start, the page says so. Use a phone as the scanner. The camera needs HTTPS, which gymsynk.net already has.

What clients should see:

- Staff (you, as owner) scan as **Granted**.
- A member with an active or trial membership scans as **Granted**.
- A member with no membership, an overdue payment, or a paused account scans as **Denied**, with the reason on screen.

For the “denied” beat, sign in as `member@demo.gymsynk.net` (slug `demo-gym`, no password) and show **Gym pass**. That account has no membership, so reception should refuse entry.

The pass is tied to that gym only. A code from another gym will not open this door.

**Settings** is where you set the gym up:

- **Features** — memberships, class booking, session packs, door entry.
- **Website integration** — the timetable snippet for the gym’s own website.
- **Branding** — logo and colour on the member pages.
