import fs from "fs";
import path from 'path';
import connection from "./db.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

async function initDB(){
    try {
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')
        await connection.query(schema);
        console.log("Database initialized");
    } catch (error) {
        console.error("Failed ot initialize db schema: ", error)
    }
}

initDB()