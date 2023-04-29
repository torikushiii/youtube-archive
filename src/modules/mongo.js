import { MongoClient } from "mongodb";
import { DATABASE_URL } from "../../config.js";
import debug from "./logger.js";

const db = debug("db:mongo");

const options = {
	useNewUrlParser: true,
	useUnifiedTopology: true
};

const client = new MongoClient(DATABASE_URL, options);
await client.connect()
	.then(() => db.log("Connected to MongoDB server."))
	.catch(e => console.error(e));

client.on("serverHeartbeatFailed", () => db.warn("Lost connection to MongoDB server."));

export default client.db("YouTube");
