# Group7-Project

## Welcome

This is the Group 7 project for Intro to Software Engineering. Currently, this repository is a work in progress. As the semester continues, this README will be updated with setup instructions, working files, and proper documentation.

## How to Contribute

Firstly, clone the repository. Grab the repo link (SSH or HTTPS), navigate to your terminal, and run: 
`git clone <link>`

Navigate into the project folder, then create and switch to your own branch so that you can make Pull Requests (PRs): 
`git checkout -b <branch name>`

Ensure your branch is up to date with the main branch: 
`git pull origin main`

Once you have made your changes, stage them: 
`git add .` 
*(Note: Use `git add <file name>` if you only want to stage specific files)*

Commit those changes with a descriptive message: 
`git commit -m "<commit message>"`

Push the changes up to your remote branch: 
`git push -u origin <branch name>`

Finally, navigate to GitHub and open a Pull Request against the `main` branch. Make sure to add proper documentation and details about your changes as requested.

## How to run Frontend

Firstly, change your main directory to frontend:
`cd frontend`

Then, install all dependencies:
`npm i`

Finally, run this and navigate to the localhost link it provides:
`npm run dev`

Ensure that if you push changes to the repository to run eslint beforehand:
`npm run lint`

## How to run Backend

Firstly, change your main directory to backend:
`cd backend`

Then, install all dependencies:
`npm i`

### Backend database and Prisma setup

The backend uses Prisma 7 with PostgreSQL. Before starting the server, make sure PostgreSQL is running and create a local database for the project. Configure its connection string in `backend/.env` (this file is ignored by Git and must not be committed):

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME?schema=public"
```

Run the following commands from the `backend` directory after installing dependencies:

```bash
npx prisma generate --config prisma7.config.ts
npx prisma migrate dev --config prisma7.config.ts
```

The Prisma config is named `prisma7.config.ts` rather than Prisma's default `prisma.config.ts`, so pass `--config prisma7.config.ts` to Prisma CLI commands. `prisma generate` creates the Prisma Client in `backend/generated/prisma`. That generated folder is intentionally ignored by Git, so run generate after cloning, installing dependencies, or changing the Prisma schema. `migrate dev` applies the checked-in migrations to your development database. When you change `prisma/schema.prisma`, create and apply a named migration, then regenerate the client:

```bash
npx prisma migrate dev --name describe_your_change --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
```

Commit the updated `prisma/schema.prisma` and the new migration under `prisma/migrations/`; do not commit generated Prisma Client files or `.env`. For production, apply committed migrations with `npx prisma migrate deploy --config prisma7.config.ts` rather than `migrate dev`.

The PostgreSQL connection is passed to Prisma through the `PrismaPg` adapter in `utils/prisma.ts`. Reuse the shared `prisma` instance in backend code rather than creating a new `PrismaClient` for each request. For example, backend modules can import it with `import { prisma } from "../utils/prisma.ts"` and query a model with `await prisma.user.findMany()`.

### Troubleshooting `.ts` extension errors

Prisma 7 generates TypeScript files, and this project imports the generated client using `.ts` extensions (for example, `../generated/prisma/client.ts`). Those extensions are intentional; do not remove them or change them to `.js`.

- If the editor reports that import paths ending in `.ts` are not allowed, use the workspace TypeScript version (run `npm i` in `backend`, then in VS Code choose **TypeScript: Select TypeScript Version** → **Use Workspace Version**) and set these options in `backend/tsconfig.json` under `compilerOptions`:

	```json
	{
		"compilerOptions": {
			"allowImportingTsExtensions": true,
			"noEmit": true
		}
	}
	```

	Keep the existing compiler options as well. `noEmit` is needed because TypeScript is being used for checking these imports, while the backend is run as JavaScript.
- If Node reports `ERR_UNKNOWN_FILE_EXTENSION` for a `.ts` import when starting the server, run the entry point through the already-installed TypeScript runner: `npx tsx ./server.js`. This can happen when plain Node is used to load the Prisma-generated TypeScript modules.
- If the error says the generated client cannot be found, run `npx prisma generate --config prisma7.config.ts` from `backend` and confirm `DATABASE_URL` is set in `backend/.env`.

Finally, run the backend and navigate to the localhost link it provides:
`npm run dev`