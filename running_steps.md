SkillSwap — Running Steps

How to set up and run SkillSwap on your machine (tested on Ubuntu). Run every command from the project folder:

bash
cd ~/Downloads/skillswap
Step 1 — Install dependencies (first time only)
bash
npm run install:all

This installs the packages for both server/ and client/. A "1 high severity vulnerability" notice may appear; it doesn't stop the app from running. Run npm audit later for details.

Step 2 — Start MongoDB

Choose one option.

Option A — Docker (recommended)

bash
# first time: create and start the container
docker run -d --name skillswap-mongo -p 27017:27017 mongo:7

# later sessions: just start it again
docker start skillswap-mongo

Option B — Local MongoDB install

bash
sudo systemctl start mongod

Option C — MongoDB Atlas (cloud)

Create a free cluster, add a database user, allow your IP under Network Access, and copy the mongodb+srv://… connection string. Add /skillswap before the ?.

Step 3 — Create the server config (first time only)
bash
cp server/.env.example server/.env

Set a strong random JWT secret:

bash
sed -i "s#^JWT_SECRET=.*#JWT_SECRET=$(openssl rand -hex 32)#" server/.env

Open the file to check or edit the other values:

bash
nano server/.env
Setting	Value
MONGODB_URI	mongodb://127.0.0.1:27017/skillswap (Docker or local), or your Atlas string
JWT_SECRET	the 64-character random string generated above
ADMIN_EMAIL	your admin login email
ADMIN_PASSWORD	a strong password (8+ characters, letters and numbers)

In nano: Ctrl+O, Enter to save, Ctrl+X to exit.

Verify:

bash
grep -E "MONGODB_URI|JWT_SECRET|ADMIN" server/.env
Step 4 — (Optional) Silence Mongoose deprecation warnings

Mongoose 9 renamed the new: true option. The old name still works, but prints warnings. Run once to update the server code:

bash
grep -rl "new: true" server --include=*.js --exclude-dir=node_modules | xargs sed -i "s/new: true/returnDocument: 'after'/g"
Step 5 — Load the demo data
bash
npm run seed

Expected output ends with:

✔ Seed complete
  Admin: <ADMIN_EMAIL> / <ADMIN_PASSWORD>
  Demo users (password Demo@1234): raju@skillswap.dev, rahul@skillswap.dev, …

transactions unavailable — using atomic single-document updates is normal with a single local MongoDB. Atlas enables transactions automatically.

⚠️ Running npm run seed again wipes and recreates all data.

Step 6 — Start the API server (Terminal 1)
bash
npm run dev:server

Wait for:

✔ MongoDB connected (skillswap)
🚀 GraphQL HTTP  → http://localhost:4000/graphql
⚡ GraphQL WS    → ws://localhost:4000/graphql

Keep this terminal open. The server restarts automatically when you edit server files.

Step 7 — Start the website (Terminal 2)

Open a second terminal in the same folder:

bash
npm run dev:client

It prints Local: http://localhost:5173/. Keep this terminal open too.

Step 8 — Use the app

Open http://localhost:5173.

Account	Email	Password
Admin	your ADMIN_EMAIL	your ADMIN_PASSWORD
Demo user	raju@skillswap.dev	Demo@1234
Demo user	rahul@skillswap.dev	Demo@1234
Other demo users	ananya, meera, carlos, priya, arjun, sara, vikram, fatima @skillswap.dev	Demo@1234

To see the real-time features:

Sign in as Raju in a normal browser window.
Sign in as Rahul in a private/incognito window.
Open Messages in both and chat: messages, "typing…" and online status update instantly.
As Raju, open Swap requests and accept Priya's request to see notifications and credits update.
Sign in with the admin account and open Admin console.

GraphQL Sandbox: visit http://localhost:4000/graphql to run queries directly. For authenticated operations, add the header Authorization: Bearer <token>; you get the token from the login mutation.

Step 9 — Stop the app
Press Ctrl+C in both terminals.
Stop MongoDB (Docker): docker stop skillswap-mongo
Daily routine (after the first setup)
bash
cd ~/Downloads/skillswap
docker start skillswap-mongo     # or: sudo systemctl start mongod
npm run dev:server               # Terminal 1
npm run dev:client               # Terminal 2