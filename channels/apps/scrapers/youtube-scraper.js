import database from "../database-manager.js";
import { debug, youtube } from "../../../src/modules/index.js";

const logger = debug("api:youtube");
const playlistList = logger.extend("playlistList");
const videoList = logger.extend("videoList");

export default async function (channelData) {
	const { channelId, group } = channelData;
    
	logger.info(`Scraping ${channelId}...`);

	const channelVideoList = await scrapeChannel(channelId, group);
	if (!channelVideoList || channelVideoList.length === 0) {
		logger.error(`Failed to scrape ${channelId}! Skipping...`);
		return ["FAIL", 0];
	}

	logger.info(`Got ${channelVideoList.length} videos from ${channelId}!`);

	database.emit("save-videos", channelVideoList);
	database.emit("update-member", channelData);

	return ["OK", channelVideoList.length];
}

const listPlaylistItems = async (playlistId, pageToken = "") => {
	playlistList.info(`Fetching playlist ${playlistId}...`);
    
	const response = await youtube.playlistItems({
		part: "snippet",
		fields: "nextPageToken,items(snippet(channelId,title,resourceId/videoId))",
		playlistId,
		pageToken,
		maxResults: 50
	}).then(data => [
		data.items,
		data.nextPageToken,
		"OK"
	]).catch(e => {
		playlistList.error(e);
		return [[]];
	});

	playlistList.info(`Fetched ${response[0].length} videos from playlist ${playlistId}`);

	return response;
};

const listVideos = async (items, group) => {
	videoList.info(`Fetching ${items.length} videos...`);

	const result = youtube.videos({
		part: "snippet,liveStreamingDetails",
		fields: "items(id,snippet(channelId,title,publishedAt),liveStreamingDetails(scheduledStartTime,actualStartTime,actualEndTime,concurrentViewers))",
		id: items.map(item => item.snippet.resourceId.videoId).join(",")
	}).then(data => data.items.map(item => parseVideos(item, group)))
		.catch(e => { throw e; });

	videoList.info(`Fetched ${result.length} videos`);

	return result;
};

const parseVideos = ({ id, snippet, liveStreamingDetails }, group) => {
	const { channelId, title, publishedAt } = snippet;
	const { scheduledStartTime, actualStartTime, actualEndTime, concurrentViewers } = liveStreamingDetails ?? {};
    
	return {
		_id: id,
		platformId: "yt",
		channelId,
		group,
		title,
		time: {
			published: new Date(publishedAt),
			scheduled: scheduledStartTime ? new Date(scheduledStartTime) : undefined,
			start: actualStartTime ? new Date(actualStartTime) : undefined,
			end: actualEndTime ? new Date(actualEndTime) : undefined
		},
		archived: false,
		status: getVideoStatus(liveStreamingDetails),
		viewers: +concurrentViewers || null,
		updatedAt: new Date()
	};
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


const scrapeChannel = async (channelId, group) => {
	let status;
	let nextPageToken;
	let playlistVideoList = [];
    
	const youtubeVideos = [];
	const playlistId = `UU${channelId.slice(2)}`;

	const requestPlaylist = listPlaylistItems.bind(null, playlistId);
	const fetchVideos = async (videos) => youtubeVideos.push(listVideos(videos, group));

	do {
		[playlistVideoList = [], nextPageToken, status] = await requestPlaylist(nextPageToken);
		fetchVideos(playlistVideoList);
		logger.log(`Current video count: ${youtubeVideos.length}`);
	} while (nextPageToken && status === "OK");

	if (status !== "OK") {
		logger.error(`Error fetching playlist ${playlistId}`);
	}
	else {
		const promise = await Promise.all(youtubeVideos);
		return promise.flat();
	}
};
