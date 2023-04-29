import got from "got";
import debug from "../../modules/logger.js";
import { parseStringPromise } from "xml2js";
import { CHANNEL_IDS } from "../../../config.js";
import database from "../database-manager/youtube.js";

const logger = debug("api:youtube:xml-crawler");

// Some scuffed caching xd
const CACHE = new Map();
const CACHE_TTL = 1000 * 60 * 10;

class XMLScraper {
	#channelId;
	#rawXmlData = null;
	#xmlOptions = { explicitArray: false };

	constructor (channelId) {
		this.#channelId = channelId;

		setInterval(() => CACHE.delete(this.cacheKey), CACHE_TTL);
	}

	async fetchXml () {
		const { body } = await got({
			url: "https://www.youtube.com/feeds/videos.xml",
			responseType: "text",
			searchParams: {
				channel_id: this.channelId,
				t: Date.now()
			}
		});

		this.#rawXmlData = body;

		return this.parseXml();
	}

	async parseXml () {
		const parsedString = await parseStringPromise(this.#rawXmlData, this.#xmlOptions);

		if (!parsedString || !parsedString.feed.entry?.map) {
			return;
		}

		return parsedString.feed.entry.map(this.#parseEntries.bind(this)).sort(this.#videoSorter);
	}

	#videoSorter (a, b) {
		return +b.crawledAt - +a.crawledAt;
	}

	#parseEntries (entry) {
		return {
			_id: entry["yt:videoId"],
			channelId: entry["yt:channelId"],
			author: {
				name: entry.author.name,
				uri: entry.author.uri
			},
			title: entry.title,
			thumbnail: entry["media:group"]["media:thumbnail"].$.url,
			status: "new",
			archived: false,
			crawledAt: new Date(entry.published)
		};
	}

	get cacheKey () {
		return `yt-${this.#channelId}`;
	}

	get channelId () {
		return this.#channelId;
	}
}

const init = async () => {
	if (CHANNEL_IDS.length === 0) {
		throw new Error("No channel IDs were provided.");
	}

	logger.info(`Now scraping ${CHANNEL_IDS.length} channels.`);

	for (const channelId of CHANNEL_IDS) {
		const xmlScraper = new XMLScraper(channelId);
		const latestTimestamp = CACHE.get(xmlScraper.cacheKey) ?? 0;

		logger.log(`Crawling ${channelId}...`);

		const videoList = await xmlScraper.fetchXml();
		if (!videoList) {
			logger.warn(`${channelId} didn't return anything?`);
			continue;
		}

		const newVideos = videoList.filter(i => i.crawledAt > latestTimestamp);
		if (newVideos.length === 0) {
			logger.log(`${channelId} didn't return any new videos.`);
			continue;
		}

		CACHE.set(xmlScraper.cacheKey, newVideos[0].crawledAt);
		logger.info(`Found ${videoList.length} videos for ${channelId}.`);

		database.emit("save-videos", newVideos);
	}
};

export default {
	init
};
