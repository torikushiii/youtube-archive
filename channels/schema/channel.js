export default class Channel {
	constructor (data) {
		/**
         * Channel name
         * @type {string}
         * @returns {string}
         */
		this.name = data.name;

		/**
         * Channel group
         * @type {string}
         * @returns {string}
         */
		this.group = data.group;

		/**
         * Channel platform ID
         * @param {(yt|tw)} platformId
         * @type {string}
         * @returns {string}
         */
		this.platformId = data.platformId;

		/**
         * Channel ID
         * @type {string}
         * @returns {string}
         */
		this.channelId = data.channelId;

		/**
         * Contains the channel's details such as their Twitter handle or Website
         * @type {object}
         * @returns {object}
         */
		this.details = data.details;

		/**
         * When the channel was crawled
         * @type {Date}
         * @returns {Date}
         */
		this.crawledAt = data.crawledAt;

		/**
         * When the channel was last updated
         * @type {Date}
         * @returns {Date}
         */
		this.updatedAt = data.updatedAt;
	}

	validate () {
		if (typeof this.name !== "string") {
			throw new Error("Invalid name specified. Expected a string.");
		}

		if (typeof this.group !== "string") {
			throw new Error("Invalid group specified. Expected a string.");
		}

		if (typeof this.platformId !== "string" || !["yt", "tw"].includes(this.platformId)) {
			throw new Error("Invalid platformId specified. Expected either yt or tw.");
		}

		if (typeof this.channelId !== "string") {
			throw new Error("Invalid channelId specified. Expected a string.");
		}

		if (typeof this.details !== "object") {
			throw new Error("Invalid details specified. Expected an object.");
		}

		if (this.crawledAt && !(this.crawledAt instanceof Date)) {
			throw new Error("Invalid crawledAt specified. Expected a Date.");
		}

		if (this.updatedAt && !(this.updatedAt instanceof Date)) {
			throw new Error("Invalid updatedAt specified. Expected a Date.");
		}

		return true;
	}
}
