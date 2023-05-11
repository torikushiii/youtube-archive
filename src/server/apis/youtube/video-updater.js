import query from "../../../modules/mongo.js";
import database from "../../database-manager/youtube.js";
import { debug, youtube } from "../../../modules/index.js";

const ONE_HOUR = 36e5;
const db = debug("api:youtube:mongo");
const logger = debug("api:youtube:video-updater");

const init = async () => {
	db.log("Looking for videos to update...");

	const videosToUpdate = await fetchVideosToUpdate();
	if (videosToUpdate.length === 0) {
		db.log("No videos to update.");
		return;
	}

	db.info(`Found ${videosToUpdate.length} videos to update.`);
	logger.log(`Updating ${videosToUpdate.length} videos...`);

	const updatedVideos = await fetchYouTubeVideoData(videosToUpdate);

	logger.info(`Updated ${updatedVideos.length} videos.`);

	database.emit("update-videos", updatedVideos);
};

const fetchVideosToUpdate = () => query.collection("videos")
	.find({ $or: [
		{ status: { $in: ["new", "live"]} },
		{ status: "upcoming", "time.scheduled": { $lte: Date.now() + ONE_HOUR } }
	]})
	.sort({ crawledAt: 1 })
	.limit(50)
	.toArray()
	.then(res => res.map(i => i._id));

const fetchYouTubeVideoData = async (ids) => {
	logger.log(`Fetching data for ${ids.length} videos...`);
	const result = await youtube.videos({
		part: "snippet,liveStreamingDetails",
		fields: "items(id,snippet,liveStreamingDetails)",
		id: ids.join(",")
	}).then(res => res.items.map(parseVideo));

	logger.log(`Fetched data for ${result?.length ?? 0} videos. Status: ${result ? "OK" : "ERROR"}`);

	if (result.length !== ids.length) {
		result.push(...parseMissingVideo(ids, result));
	}

	return result;
};

const parseVideo = (video) => {
	const { id, snippet, liveStreamingDetails } = video;
	const { channelId, title, publishedAt } = snippet ?? {};
	const { scheduledStartTime, actualStartTime, actualEndTime, concurrentViewers } = liveStreamingDetails ?? {};

	return {
		_id: id,
		channelId,
		title,
		time: {
			published: new Date(publishedAt),
			scheduled: scheduledStartTime ? new Date(scheduledStartTime) : undefined,
			start: actualStartTime ? new Date(actualStartTime) : undefined,
			end: actualEndTime ? new Date(actualEndTime) : undefined
		},
		status: getVideoStatus(liveStreamingDetails),
		viewers: +concurrentViewers || null
	};
};

const parseMissingVideo = (ids, videoList) => {
	const missingIds = ids.filter(i => !videoList.some(v => v._id === i));
	return missingIds.map(id => ({
		_id: id,
		status: "missing"
	}));
};

const getVideoStatus = (liveStreamingDetails) => {
	if (!liveStreamingDetails) {
		return "uploaded";
	}

	const { actualStartTime, actualEndTime } = liveStreamingDetails;
	return actualEndTime
		? "ended"
		: (actualStartTime
			? "live"
			: "upcoming");
};

export default {
	init
};
