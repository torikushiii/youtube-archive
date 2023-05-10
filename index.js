import { CronJob } from "cron";
import("./src/modules/mongo.js");
import { CRON_TIMINGS } from "./config.js";
import debug from "./src/modules/logger.js";

const youtube = async () => {
	const TIMINGS = {
		VIDEO_UPDATER: CRON_TIMINGS.VIDEO_UPDATER ?? "*/5 * * * *",
		VIDEO_ARCHIVER: CRON_TIMINGS.VIDEO_ARCHIVER ?? "*/10 * * * *",
		XML_CRAWLER: CRON_TIMINGS.XML_CRAWLER ?? "*/1 * * * *"
	};

	const [videoUpdater, xmlCrawler, videoArchiver] = await Promise.all([
		import("./src/server/apis/youtube/video-updater.js").then(api => api.default),
		import("./src/server/apis/youtube/xml-crawler.js").then(api => api.default),
		import("./src/server/apis/youtube/video-archiver.js").then(api => api.default)
	]);

	new CronJob(TIMINGS.VIDEO_UPDATER, () => videoUpdater.init()).start();
	new CronJob(TIMINGS.XML_CRAWLER, () => xmlCrawler.init()).start();
	new CronJob(TIMINGS.VIDEO_ARCHIVER, () => videoArchiver.init()).start();
};

const validateConfig = async () => {
	const logger = debug("config");

	const MONGODB_REGEX = /^mongodb:\/\/\d+\.\d+\.\d+\.\d+:\d+$/;
	const DISCORD_WEBHOOK_REGEX = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;
	const GOOGLE_API_KEY_REGEX = /^[a-zA-Z0-9_-]+$/;
	const CHANNEL_ID_REGEX = /^[a-zA-Z0-9_-]{24}$/;

	const {
		LOG,
		ARCHIVE_VIDEOS,
		DATABASE_URL,
		DISCORD_WEBHOOK,
		GOOGLE_API_KEY,
		CHANNEL_IDS
	} = await import("./config.js");

	if (typeof LOG !== "number" || LOG < 0 || LOG > 3) {
		logger.warn("Invalid log level specified. Expected a number between 0 and 3.", {
			log: LOG
		});

		process.exit(1);
	}

	if (typeof ARCHIVE_VIDEOS !== "boolean") {
		logger.warn("Invalid archive videos flag specified. Expected a boolean.", {
			archiveVideos: ARCHIVE_VIDEOS
		});

		process.exit(1);
	}

	if (typeof DATABASE_URL !== "string" || !MONGODB_REGEX.test(DATABASE_URL)) {
		logger.warn("Invalid database URL specified. Expected a MongoDB URL.", {
			databaseUrl: DATABASE_URL
		});

		process.exit(1);
	}

	if (DISCORD_WEBHOOK !== null && (typeof DISCORD_WEBHOOK !== "string" || !DISCORD_WEBHOOK_REGEX.test(DISCORD_WEBHOOK))) {
		logger.warn("Invalid Discord webhook URL specified.", {
			discordWebhook: DISCORD_WEBHOOK
		});

		process.exit(1);
	}

	if (typeof GOOGLE_API_KEY !== "string" || !GOOGLE_API_KEY_REGEX.test(GOOGLE_API_KEY)) {
		logger.warn("Invalid Google API key specified.", {
			googleApiKey: GOOGLE_API_KEY
		});

		process.exit(1);
	}

	if (!Array.isArray(CHANNEL_IDS) || !CHANNEL_IDS.every(id => typeof id === "string" && CHANNEL_ID_REGEX.test(id))) {
		logger.warn("Invalid channel IDs specified. Expected an array of channel IDs.", {
			channelIds: CHANNEL_IDS
		});

		process.exit(1);
	}

	if (CHANNEL_IDS.length === 0) {
		logger.warn("No channel IDs specified. You won't receive any updates.", {
			channelIds: CHANNEL_IDS
		});

		process.exit(1);
	}

	logger.info("Configuration validated successfully.");

	youtube();
};

validateConfig();
