import { debug, youtube } from "../../../src/modules/index.js";
import database from "../../../src/server/database-manager/youtube.js";

const logger = debug("api:youtube");

export default async function (channelData) {
	const requests = [];
	while (channelData.length) {
		const channels = channelData.splice(0, 50);
		requests.push(fetchChannelData(channels));
	}

	const results = await Promise.all(requests);
	const channels = results.flat();

	database.emit("update-channels", channels);
}

const fetchChannelData = async (channels) => {
	logger.info(`Fetching ${channels.length} channels...`);
	
	const results = await youtube.channels({
		part: "snippet,statistics",
		fields: "items(id,snippet(title,publishedAt,description,thumbnails/high/url),statistics(subscriberCount,videoCount,viewCount))",
		id: channels.map((channel) => channel.channelId).join(",")
	}).then(data => data.items.map(item => {
		// eslint-disable-next-line max-nested-callbacks
		const channel = channels.find(channel => channel.channelId === item.id);
		return parseAndMergeChannelData(item, channel);
	})).catch(e => {
		logger.error(`Error fetching channel data`, e);
		return [];
	});

	logger.info(`Saving ${results.length} channels...`);

	return results;
};

const parseAndMergeChannelData = ({ snippet, statistics }, memberData) => ({
	name: memberData.name,
	group: memberData.group,
	platformId: "yt",
	channelName: snippet.title,
	channelId: memberData.channelId,
	channelStats: {
		publishedAt: new Date(snippet.publishedAt),
		subscribers: +statistics.subscriberCount || 0,
		videos: +statistics.videoCount,
		views: +statistics.viewCount
	},
	details: memberData.details,
	description: snippet.description,
	thumbnail: snippet.thumbnails.high.url
});
