import ytdl from "ytdl-core";
import fs from "fs";
import query from "../../modules/mongo.js";
import debug from "../../modules/logger.js";
import { ARCHIVE_VIDEOS } from "../../../config.js";

const db = debug("api:youtube:mongo");
const logger = debug("api:youtube:video-archiver");
const downloader = debug("downloader");

const init = async () => {
	if (!ARCHIVE_VIDEOS) {
		return;
	}

	const videoList = await query.collection("videos")
		.find({ $and: [
			{ archived: false },
			{ status: { $in: ["uploaded", "ended"]} }
		]})
		.sort({ crawledAt: 1 })
		.limit(5)
		.toArray();

	if (videoList.length === 0) {
		db.log("No videos to archive.");
		return;
	}

	db.info(`Found ${videoList.length} videos to archive.`);
	logger.log(`Archiving ${videoList.length} videos...`);

	for (const video of videoList) {
		const archiver = new VideoArchiver(video);
		await archiver.archive();
	}
};

class VideoArchiver {
	#video;

	constructor (video) {
		this.#video = video;
	}

	async archive () {
		const { _id: id } = this.#video;
		const url = `https://www.youtube.com/watch?v=${id}`;
		const info = await ytdl.getInfo(url);

		logger.info(`Archiving video ${id}...`);

		const getVideoStatus = ytdl.filterFormats(info.formats, "videoandaudio");
		const format = getVideoStatus.filter(i => i.container === "mp4").sort((a, b) => Number(b.bitrate) - Number(a.bitrate))[0];

		if (!format) {
			logger.error(`No video format found for video ${id}.`);
			return;
		}

		const downloader = await this.#downloadVideo(format);
		if (!downloader) {
			logger.error(`Error downloading video ${id}.`);
			return;
		}

		await this.#updateVideoStatus();

		logger.info(`Finished archiving video ${id}.`);

		return true;
	}

	async #updateVideoStatus () {
		const { _id } = this.#video;

		await query.collection("videos").updateOne(
			{ _id },
			{ $set: { archived: true } }
		);
	}

	async #downloadVideo (format) {
		const { _id: id } = this.#video;
		const url = `https://www.youtube.com/watch?v=${id}`;
		const video = ytdl(url, { format });

		video.on("progress", (chunk, downloaded, total) => {
			const percent = downloaded / total;
			const progress = Math.round(percent * 100);

			downloader.log(`Downloading video ${id}... ${progress}%`);
		});

		video.on("close", () => {
			logger.log(`Finished downloading video ${id}.`);
		});

		video.on("error", (error) => {
			logger.error(`Error downloading video ${id}.`, error);
		});

		const path = `./videos/${id}.mp4`;
		const file = fs.createWriteStream(path);
		
		video.pipe(file);

		return new Promise((resolve, reject) => {
			file.on("finish", () => {
				logger.log(`Finished saving video ${id} to file.`);
				resolve(true);
			});

			file.on("error", (error) => {
				logger.error(`Error saving video ${id} to file.`, error);
				reject(error);
			});
		});
	}
}

export default {
	init
};
