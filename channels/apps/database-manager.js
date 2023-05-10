import { EventEmitter } from "events";
import query from "../../src/modules/mongo.js";
import { debug } from "../../src/modules/index.js";

const logger = debug("channels:database-manager");

/* eslint-disable-next-line no-useless-constructor, max-statements-per-line */
class DatabaseManager extends EventEmitter { constructor () { super(); } }
const database = new DatabaseManager();
export default database;

database.on("save-videos", async newVideos => {
	logger.log(`Saving ${newVideos.length} videos...`);

	const result = await Promise.all(newVideos
		.map(video => query.collection("videos").updateOne(
			{ _id: video._id },
			{ $setOnInsert: video },
			{ upsert: true }
		))
	);

	if (result) {
		logger.log(`Saved ${result.length} videos.`);
	}
});

database.on("update-member", async channelData => {
	const { channelId } = channelData;

	logger.log(`Updating ${channelId}...`);

	await query.collection("channels").updateOne(
		{ channelId },
		{ $set: channelData }
	).then(res => logger.log(res.modifiedCount
		? `Updated ${channelId}.`
		: `No changes to ${channelId}.`
	// eslint-disable-next-line newline-per-chained-call
	)).catch(e => logger.error(e, `Failed to update ${channelId}.`));
});
