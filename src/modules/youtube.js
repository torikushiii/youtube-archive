import got from "got";
import { GOOGLE_API_KEY } from "../../config.js";

const URL = "https://www.googleapis.com/youtube/v3/";
const SETTINGS = `key=${GOOGLE_API_KEY}&accept=application/json&`;

const parseParams = (params) => SETTINGS + Object.entries(params).map(([key, value]) => `${key}=${value}`).join("&");

const youtubeFetch = async (type, params) => {
	const { body } = await got(`${URL}${type}?${parseParams(params)}`, {
		responseType: "json",
		throwHttpErrors: false
	});

	return body;
};

export const videos = (params) => youtubeFetch("videos", params);
export const channels = (params) => youtubeFetch("channels", params);
export const playlistItems = (params) => youtubeFetch("playlistItems", params);
