import Channel from "./schema/channel.js";
import query from "../src/modules/mongo.js";
import { readdirSync, readFileSync } from "fs";
import { debug } from "../src/modules/index.js";
import youtubeUpdaters from "./apps/updaters/youtube-updaters.js";
import youtubeChannelScraper from "./apps/scrapers/youtube-scraper.js";

const logger = debug("channels");
const DIR = "../channels/defaults";

const saveChannel = async (filename, dry = false, save = true, async = false) => {
	const groupName = filename.replace(".json", "");
	const channelList = JSON.parse(readFileSync(`${DIR}/${filename}`, "utf8"));

	const parseChannel = (channel) => {
		channel.group = groupName;

		return channel;
	};

	const parsedChannels = channelList.map(parseChannel);

	if (dry) {
		return parsedChannels;
	}

	if (save) {
		const res = await Promise.all(parsedChannels
			.map(channel => query.collection("channels").updateOne(
				{ channelId: channel.channelId },
				{ $setOnInsert: channel },
				{ upsert: true }
			))
		);

		if (async) {
			return res;
		}
	}

	return channelList.map((channel) => [channel.channelId, groupName, channel.platformId]);
};

const checkChannels = (channelList) => {
	if (channelList.length === 0) {
		throw new Error("No channels found.");
	}

	return channelList;
};

const saveChannels = async (options = { dry: false, save: true }, async = false) => {
	const check = checkChannels(readdirSync(DIR).filter((filename) => filename.endsWith(".json")));
	
	const channels = [];
	for (const group of check) {
		const channel = await saveChannel(group, options.dry, options.save, async);
		channels.push(...channel);
	}

	return channels;
};

const validateChannel = async () => {
	try {
		const channels = await saveChannels({ dry: true });
		if (channels.length === 0) {
			logger.error("No channels found.");
			return;
		}

		logger.info(`Found ${channels.length} channels.`);

		let errors = 0;
		for (const channel of channels) {
			const ops = new Channel(channel).validate();
			if (ops) {
				continue;
			}

			logger.error({ error: ops.message, channel });
			errors++;
		}

		if (errors !== 0) {
			logger.info(`Found ${errors} errors.`);
			return false;
		}
		else {
			logger.info("All channels validated successfully.");
			return true;
		}
	}
	catch (e) {
		logger.error(e);
		return false;
	}
};

const scrapeChannels = async () => {
	const channelList = await query.collection("channels").find({ crawledAt: { $exists: false } }).toArray();
	const groupedChannels = groupMemberObject(channelList);

	if (!Object.values(channelList).flat().length) {
		logger.error("No channels found.");
		return;
	}

	const scraper = {
		RESULTS: { OK: [], FAIL: [], videoCount: 0 },
		async youtube (channels) {
			for (const channel of channels) {
				const [STATUS, VIDEO_COUNT] = await youtubeChannelScraper(channel);
				this.RESULTS[STATUS].push(channel.channelId);
				this.RESULTS.videoCount += VIDEO_COUNT;
			}
		}
	};

	await Promise.all([
		scraper.youtube(groupedChannels.yt)
	]);

	logger.info(scraper.RESULTS);
};

const updateChannels = async () => {
	const channels = await query.collection("channels").find({}).toArray();
	const groupedChannels = groupMemberObject(channels);

	await Promise.all([
		youtubeUpdaters(groupedChannels.yt)
		// twitchUpdaters(groupedChannels.tw)
	]);
};

// eslint-disable-next-line arrow-body-style
const groupMemberObject = (channels) => {
	return channels.reduce(
		(platforms, channel) => {
			platforms[channel.platformId].push(channel);
			return platforms;
		// eslint-disable-next-line object-curly-spacing
		}, { yt: [], tw: [] }
	);
};

const init = async () => {
	const validate = await validateChannel();
	if (!validate) {
		logger.error("Channel validation failed.");
		return;
	}

	await saveChannels({ dry: false, save: true }, true);
	await updateChannels();
	await scrapeChannels();
};

init();
