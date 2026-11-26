# PUCKILLION ONLINE · v2
A two-player NHL rare-answer trivia web app. Both players open the same hosted URL, enter names, and join a private six-character room. The host starts; both answer on the same server deadline. Answers stay private until both lock in or time expires. The host advances each round and can start a rematch.

## Publish on Render (no coding required)
1. Extract this ZIP on a computer. Create a new repository on https://github.com/new (public or private). In the repo choose Add file → Upload files, upload the files INSIDE the extracted `puckillion-online` folder, and commit them. `package.json` and `server.mjs` must be in the repository root.
2. Go to https://dashboard.render.com/ and sign in. Choose New → Web Service, connect your GitHub repository, select Node as runtime, choose the Free instance if available, enter `npm install` as Build Command and `npm start` as Start Command. Deploy. Alternatively, the included render.yaml defines a free service for Render Blueprint deployment.
3. Open the generated HTTPS `onrender.com` address. Create a private room, copy the invite link and send it to your friend. They open the link on their own device, enter a name, and join. Start the game. Both players must use the same hosted service.

Render free services can sleep, and the first visit may be slow. Rooms are stored in memory; a server restart loses matches. No account is needed to play. Hosting account requirements, availability and charges depend on Render; verify the selected plan before deployment.

## Run locally (for testing)
Install Node.js 20+ from https://nodejs.org/. Open a terminal in this folder, run `npm start`, then visit http://localhost:3000. To test two players, use a private/incognito window for the second player. On the same Wi-Fi a friend can open the host computer's local IP address on port 3000 if the firewall permits it. For different networks, deploy to a host as above.

## Historical data and scoring
The server queries the NHL Stats REST API (`https://api.nhle.com/stats/rest/en`) for skater and goalie regular-season summary records, with season filters and pagination. It generates all answers for the selected criteria from the returned data rather than a fixed list. All-era mode samples across six time bands beginning in 1917–18, excluding the cancelled 2004–05 season; classic and modern modes are optional. Team prompts use the abbreviations and memberships reported in those records, not inferred team names. Questions cover scoring milestones, goalie wins, team membership and games played. A single match uses selected seasons, not every player or every season at once. Historical completeness depends on upstream records, and the game will not silently substitute invented data if the API fails.

Rarity is a custom heuristic, not surveyed answer frequency. Players are ranked using seasonal points/games or goalie wins/games plus a small hand-selected list of familiar stars that receive common-answer priority. Each answer receives 10, 30, 60, 85 or 100 points by rank percentile. Exact names, accent-insensitive spelling, some aliases and unique last names are accepted. Ambiguous or misspelled names may be rejected. One submitted answer per round. Highest total wins; ties are possible.

## Testing and limitations
`npm test` runs an automated two-client integration test with synthetic NHL-shaped fixtures (not real player data), including authentication, private answers, synchronized deadlines, scoring and rematch. The live NHL endpoint could not be tested in the authoring environment because outbound network access was unavailable. The live game has not been deployed or tested on a public host. Once deployed, verify that both browsers load historical questions and complete a match. Source for endpoint behavior: https://github.com/pseudo-r/Public-NHL-API/blob/main/docs/stats-rest/skaters.md . This is an independent game, not affiliated with the NHL or Krillion.
