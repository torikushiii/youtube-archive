# Youtube Archiver
A simple NodeJS script to archive a youtube channel.

## Development
* Pre-requisites
  * Have `node` and `npm` installed.
  * Have [MongoDB](https://www.mongodb.com/docs/manual/installation/) installed locally.
    * Optional: Install [MongoDB Compass](https://www.mongodb.com/products/compass) to view the database.
  * Have a [Google Cloud Project](https://console.cloud.google.com/apis/credentials) API key with the [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) enabled.
  * Setup some channels in the `config.js` file.

## Installation
```
# Install dependencies and create your own config file.
$ npm i
$ cp example.config.js config.js
# Make sure to edit the config file with your own API key and channels.

# Create a directory called group inside channels, then add your own
# channels inside the group directory using template.json.

# After populating the channels, run:
$ npm run init

# If all goes well, you should be able to run the script.
$ npm start
# Please note that if you run the script using node directly, logger may not work properly.
```

## Limitations
* ~~The script only work for the first new 15 videos of a channel.~~