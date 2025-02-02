const fs = require('fs');
const Eris = require('eris-hummus');
const fetch = require('node-fetch');

// Read configuration from JSON file
const configData = JSON.parse(fs.readFileSync("./utils/config.json", "utf8"));
const logsEnabled = configData.logs;

// ANSI color codes similar to colorama
const Colors = {
  RESET: "\x1b[0m",
  GREEN: "\x1b[32m",
  RED: "\x1b[31m",
  YELLOW: "\x1b[33m",
};

// Clears the current line(s) in the terminal
function clearLine(n = 1) {
  const LINE_UP = '\x1b[1A';
  const LINE_CLEAR = '\x1b[2K';
  for (let i = 0; i < n; i++) {
    process.stdout.write(LINE_UP);
    process.stdout.write(LINE_CLEAR);
  }
}

// Logs a message with a colored prefix based on type
function logs(message, type, number = undefined) {
  if (logsEnabled) {
    const logTypes = {
      'add': { prefix: '[+]', color: Colors.GREEN },
      'delete': { prefix: '[-]', color: Colors.RED },
      'warning': { prefix: '[WARNING]', color: Colors.YELLOW },
      'error': { prefix: '[ERROR]', color: Colors.RED },
    };
    const { prefix, color } = logTypes[type] || { prefix: '[?]', color: Colors.RESET };
    console.log(`${color}${prefix}${Colors.RESET} ${message}`);
    if (number === undefined) {
      clearLine();
    }
  }
}

// Utility sleep function for async delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class Cloner {
  // Clones guild properties (name and icon) from guildFrom to guildTo.
  static async guild_create(guildTo, guildFrom) {
    let iconImage = null;
    try {
      if (guildFrom.iconURL) {
        try {
          // In Eris, guild.iconURL is a URL string. We append ?format=jpg to request a jpg.
          const response = await fetch(guildFrom.iconURL + "?format=jpg");
          if (response.ok) {
            iconImage = await response.buffer();
          } else {
            logs(`Can't read icon image from ${guildFrom.name}`, 'error');
          }
        } catch (error) {
          logs(`Can't read icon image from ${guildFrom.name}`, 'error');
          iconImage = null;
        }
      }
      // Edit the guild name
      await guildTo.edit({ name: guildFrom.name });
      if (iconImage !== null) {
        try {
          await guildTo.edit({ icon: iconImage });
          logs(`Guild Icon Changed: ${guildTo.name}`, 'add');
        } catch (error) {
          logs(`Error While Changing Guild Icon: ${guildTo.name}`, 'error');
        }
      }
    } catch (error) {
      // In case of a forbidden error or any other error
      logs(`Error While Changing Guild Icon: ${guildTo.name}`, 'error');
    }
    logs(`Cloned server: ${guildTo.name}`, 'add', true);
  }

  // Clones roles from guildFrom to guildTo.
  static async roles_create(guildTo, guildFrom) {
    // Filter out the @everyone role. Assumes guildFrom.roles is an array.
    const roles = guildFrom.roles.filter(role => role.name !== "@everyone");
    roles.reverse();
    const rolesCreated = roles.length;
    for (const role of roles) {
      try {
        const options = {
          name: role.name,
          permissions: role.permissions,
          color: role.color || role.colour, // depending on configuration, could be 'color' or 'colour'
          hoist: role.hoist,
          mentionable: role.mentionable,
        };
        await guildTo.createRole(options);
        logs(`Created Role ${role.name}`, 'add');
      } catch (e) {
        logs(`Error creating role ${role.name}: ${e}`, 'error');
      }
    }
    logs(`Created Roles: ${rolesCreated}`, 'add', true);
  }

  // Deletes all channels in guildTo.
  static async channels_delete(guildTo) {
    // Assuming guildTo.channels is an array of channel objects.
    const channels = guildTo.channels;
    const channelsDeleted = channels.length;
    for (const channel of channels) {
      try {
        await channel.delete();
        logs(`Deleted Channel: ${channel.name}`, 'delete');
      } catch (e) {
        logs(`Error deleting channel ${channel.name}: ${e}`, 'error');
      }
    }
    logs(`Deleted Channels: ${channelsDeleted}`, 'delete', true);
  }

  // Clones categories from guildFrom to guildTo.
  static async categories_create(guildTo, guildFrom) {
    // In Eris, categories are channels with type 4.
    const categories = guildFrom.categories || []; // Assume guildFrom.categories is provided
    for (const category of categories) {
      try {
        // Build overwrites mapping: in Eris, permission overwrites are typically arrays.
        // Here we assume channel.overwrites is an object mapping roles to overwrite data.
        const overwritesTo = [];
        for (const [key, value] of Object.entries(category.overwrites || {})) {
          // Find the corresponding role in guildTo by name
          const role = (guildTo.roles || []).find(r => r.name === key);
          if (role) {
            overwritesTo.push({
              id: role.id,
              type: 0, // 0 for role overwrite in Eris
              allow: value.allow,
              deny: value.deny,
            });
          }
        }
        // Create the category channel. In Eris, channel type for category is 4.
        const newCategory = await guildTo.createChannel(category.name, 4, { permissionOverwrites: overwritesTo });
        // Set the position of the new category.
        await newCategory.edit({ position: category.position });
        logs(`Created Category: ${category.name}`, 'add');
      } catch (error) {
        logs(`Error creating category ${category.name}: ${error}`, 'error');
      }
    }
    logs(`Created Categories: ${categories.length}`, 'add', true);
  }

  // Clones text and voice channels from guildFrom to guildTo.
  static async channels_create(guildTo, guildFrom) {
    // Assuming guildFrom has text_channels and voice_channels arrays.
    const channels = (guildFrom.text_channels || []).concat(guildFrom.voice_channels || []);
    const channelsCreated = channels.length;
    for (const channel of channels) {
      await sleep(200);
      // Determine the parent category in guildTo if applicable.
      let category = null;
      if (channel.category && guildTo.categories) {
        category = guildTo.categories.find(cat => cat.name === channel.category.name);
      }
      // Build permission overwrites array.
      const overwrites = [];
      for (const [key, value] of Object.entries(channel.overwrites || {})) {
        const role = (guildTo.roles || []).find(r => r.name === key);
        if (role) {
          overwrites.push({
            id: role.id,
            type: 0,
            allow: value.allow,
            deny: value.deny,
          });
        }
      }
      // Determine channel type: 0 for text, 2 for voice in Eris.
      let channelType = 0;
      if (channel.type === 'voice' || channel.type === 2) {
        channelType = 2;
      } else {
        channelType = 0;
      }
      try {
        // In Eris, createChannel takes the channel name, type, and options.
        const newChannel = await guildTo.createChannel(channel.name, channelType, {
          permissionOverwrites: overwrites,
          position: channel.position,
        });
        // If the channel belongs to a category, assign its parentID.
        if (category) {
          await newChannel.edit({ parentID: category.id });
        }
        // Log channel creation with appropriate type descriptor.
        const channelLabel = (channelType === 0) ? 'Text' : 'Voice';
        logs(`Created ${channelLabel} Channel: ${channel.name}`, 'add');
      } catch (error) {
        logs(`Error While Creating Channel ${channel.name}: ${error}`, 'error');
      }
    }
    logs(`Created Channels: ${channelsCreated}`, 'add', true);
  }

  // Clones custom emojis from guildFrom to guildTo.
  static async emojis_create(guildTo, guildFrom) {
    // Assuming guildFrom.emojis is an array of emoji objects.
    const emojis = guildFrom.emojis || [];
    const emojisCreated = emojis.length;
    for (const emoji of emojis) {
      try {
        await sleep(200);
        // Fetch the emoji image data.
        const response = await fetch(emoji.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch emoji ${emoji.name}`);
        }
        const emojiImage = await response.buffer();
        // In Eris, there is no direct guild method to create emojis.
        // Typically, you'd use the client method: client.createEmoji(guildID, { name, image });
        // Here, we assume guildTo has a method createEmoji for simplicity.
        await guildTo.createEmoji({ name: emoji.name, image: emojiImage });
        logs(`Created Emoji ${emoji.name}`, 'add');
      } catch (error) {
        logs(`Error While Creating Emoji ${emoji.name}: ${error}`, 'error');
      }
    }
    logs(`Created Emojis: ${emojisCreated}`, 'add', true);
  }
}

module.exports = { Cloner, logs, clearLine, sleep };
