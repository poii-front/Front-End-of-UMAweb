# ite402umaweb

Project title: UmaWeb

Group Members:
Miranda, Marco M.
Navarro, Ethan Andrew S.
Paltz, Arnold James M.

Concept:

## Running the app

1. Install dependencies with `npm install`.
2. Set `MONGODB_URI` in `.env`.
3. For local development, run `npm run start:api` in one terminal and `npm run dev` in another. Open the Vite URL shown in the dev terminal; API requests are proxied to the Express server on port 3000.
4. For production, run `npm start` and open the server URL shown in the terminal. This builds the frontend and serves it from Express.

Saved builds are stored through the `/builds` API in MongoDB.
