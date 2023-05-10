import got from "got";
import { debug } from "../../../modules/index.js";
import { DISCORD_WEBHOOK } from "../../../../config.js";

const logger = debug("api:discord:webhook");

const send = async (videos) => {
	if (videos.length === 0) {
		return;
	}
	else if (!Array.isArray(videos)) {
		videos = [videos];
	}

	for (const video of videos) {
		const videoUrl = `https://www.youtube.com/watch?v=${video._id}`;
		try {
			await got.post(DISCORD_WEBHOOK, {
				json: {
					content: videoUrl
				}
			});
		}
		catch (e) {
			if (e instanceof got.HTTPError && e.response.statusCode === 429) {
				logger.warn("Discord webhook ratelimited. Waiting 5 seconds...");
				await new Promise(resolve => setTimeout(resolve, 5000));
				await send(video);
				return;
			}
			else if (e instanceof got.RequestError && e.code === "ETIMEDOUT") {
				logger.warn("Discord webhook timed out. Waiting 5 seconds...");
				await new Promise(resolve => setTimeout(resolve, 5000));
				await send(video);
				return;
			}

			logger.error(e);
		}
	}
};

export default {
	send
};
