import { EventEmitter } from "events";
import query from "../../modules/mongo.js";
import debug from "../../modules/logger.js";
import webhook from "../apis/youtube/webhook.js";

const logger = debug("api:youtube:database-manager");

/* eslint-disable-next-line no-useless-constructor, max-statements-per-line */
class DatabaseManager extends EventEmitter { constructor () { super(); } }
const database = new DatabaseManager();
export default database;

database.on("save-videos", async (videos) => {
	logger.log(`Saving ${videos.length} videos...`);
	let results = await Promise.all(videos
		.map(video => query.collection("videos").updateOne(
			{ _id: video._id },
			{ $setOnInsert: video },
			{ upsert: true }
		))
	);

	results = results.filter(result => result.upsertedCount > 0);
	if (results.length > 0) {
		/* eslint-disable-next-line max-nested-callbacks */
		const newVideos = videos.filter(video => results.some(result => result.upsertedId === video._id));
		await webhook.send(newVideos);
	}
    
	logger.log(`Saved ${results.length} videos.`);
});

database.on("update-videos", async (videos) => {
	logger.log(`Updating ${videos.length} videos...`);
	let results = await Promise.all(videos
		.map(video => query.collection("videos").updateOne(
			{ _id: video._id },
			{ $set: video }
		))
	);

	results = results.filter(result => result.modifiedCount > 0);
	logger.log(`Updated ${results.length} videos.`);
});

database.on("update-channels", async (channels) => {
	logger.log(`Updating ${channels.length} channels...`);
	let result = await Promise.all(channels
		.map(channel => query.collection("channels").updateOne(
			{ channelId: channel.channelId },
			{ $set: channel }
		))
	);

	result = result.filter(result => result.modifiedCount > 0);
	logger.log(`Updated ${result.length} channels.`);
});
