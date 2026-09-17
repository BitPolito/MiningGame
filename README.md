# Bitcoin Block Mining Simulator

An interactive educational game by **BitPolito** that introduces the mechanics of Bitcoin mining through a simple, hands-on experience.

Players choose transactions from a mempool, build a block, and compete to find a valid proof of work. The game is designed for classrooms, workshops, events, and anyone who wants to understand the basic ideas behind Bitcoin by playing.

## Game modes

- **Easy** — select the best transactions and solve a manual nonce challenge.
- **Hard** — build a Bitcoin-style block header and find a valid nonce using double SHA-256.

Both modes follow the same core rules:

- select exactly three affordable transactions;
- maximise the total transaction fees;
- confirm blocks in sequence;
- build your own blockchain and race to the target number of blocks.

You can play solo or create a multiplayer room. Each player mines an independent chain, and the first player to reach the goal wins. Rooms support up to **30 active players**. The host occupies a player slot only when participating in the race.

> This is an educational simulator. It does not connect to the Bitcoin network or perform real bitcoin mining.

## Run locally

### Requirements

- Node.js 22.x
- npm
- A modern web browser

Install dependencies and start the game from the repository root:

    npm install
    npm start

Then open http://localhost:5173.

The start command launches both the game and its local multiplayer server. For solo play, you can also run only the frontend:

    npm run dev

For development with two terminals:

    npm run server
    npm run dev

Do not open dist/index.html directly; the project must be served through Vite.

## Development commands

| Command | Purpose |
| --- | --- |
| npm run dev | Start the Vite development server. |
| npm start | Start the frontend and local API together. |
| npm run build | Create a production build. |
| npm run lint | Run ESLint. |
| npm test | Run unit tests. |
| npm run test:e2e | Run browser tests with Playwright. |
| npm run check | Run the complete verification suite. |

## Project structure

- src/games/ — Easy and Hard game screens.
- src/components/ — Reusable game interface components.
- src/lib/ — Shared game rules, transactions, hashing, and persistence.
- src/guides/ — In-app English and Italian guides.
- api/ — Multiplayer server functions.
- tests/ — Unit, API, and browser tests.

## Contributing

Contributions are welcome.

1. Create a feature branch.
2. Install dependencies with npm install.
3. Keep game rules in the shared game engine.
4. Update the in-app guides when gameplay changes.
5. Test both desktop and mobile layouts.
6. Run npm run check before opening a pull request.

Please preserve the existing BitPolito visual identity, colours, typography, and accessible mobile-first experience.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file.
