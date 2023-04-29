/* eslint-disable no-fallthrough */
import pkg from "debug";
import { LOG } from "../../config.js";

const { debug: Debug } = pkg;

let LOG_LEVEL = +LOG || 0;
/* eslint-disable-next-line unicorn/no-nested-ternary */
LOG_LEVEL = !LOG_LEVEL ? 2 : (LOG_LEVEL < 0 ? 0 : LOG_LEVEL > 3 ? 3 : LOG_LEVEL);

export default function debug (namespace) {
	const logger = Debug(namespace);

	const log = logger.extend("[ LOG ]:");
	log.log = console.log.bind(console);

	const info = logger.extend("[ INFO ]:");
	info.log = console.info.bind(console);
	info.color = log.color;

	const warn = logger.extend("[ WARN ]:");
	warn.log = console.warn.bind(console);
	warn.color = "9";

	const error = logger.extend("[ ERROR ]:");
	error.log = console.error.bind(console);
	error.color = "196";

	switch (LOG_LEVEL) {
		case 0:
			warn.enabled = false;
		case 1:
			info.enabled = false;
		case 2:
			log.enabled = false;
	}

	return {
		extend: extend.bind(logger),
		log,
		info,
		warn,
		error
	};
}

const extend = function (namespace) {
	return debug(`${this.namespace}:${namespace}`);
};
