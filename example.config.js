// LOG_LEVEL: Set log level. 0 = Error; 1 = Warn; 2 = Info; 3 = Verbose;
const LOG = 0;
const ARCHIVE_VIDEOS = false;
const DATABASE_URL = "mongodb://localhost:27017";
const DISCORD_WEBHOOK = null;
const GOOGLE_API_KEY = null;
const CHANNEL_IDS = [];

const CRON_TIMINGS = {
	VIDEO_UPDATER: "*/5 * * * *",
	VIDEO_ARCHIVER: "*/10 * * * *",
	XML_CRAWLER: "*/1 * * * *"
};

export {
	LOG,
	ARCHIVE_VIDEOS,
	DATABASE_URL,
	DISCORD_WEBHOOK,
	GOOGLE_API_KEY,
	CHANNEL_IDS
};
