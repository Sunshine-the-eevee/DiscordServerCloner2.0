const { Client } = require('eris-hummus');
const fs = require('fs');
const { execSync } = require('child_process');
const { prompt } = require('enquirer');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let client;

try {
    if (require('eris').version !== "v0.0.4") {
        console.log("Updating Eris...");
        execSync(`npm install`);
        console.log("Eris Updated Successfully!");
        console.log("Restarting...");
        process.exit();
    }
} catch (error) {
    console.log("Installing Requirements...");
    execSync(`npm install`);
    console.log("Requirements Installed Successfully!");
    console.log("Restarting...");
    process.exit();
}

const data = JSON.parse(fs.readFileSync('./utils/config.json', 'utf8'));

const clear = async (option = false) => {
    await sleep(1000);
    console.clear();
    if (option) {
        const user = client.user;
        const guild = client.guilds.get(INPUT_GUILD_ID);
        Panel_Run(guild, user);
    } else {
        Panel();
    }
};

const cloneServer = async () => {
    const startTime = Date.now();
    const guildFrom = client.guilds.get(INPUT_GUILD_ID);
    console.log(" ");
    const guildTo = client.guilds.get(GUILD);
    
    // Edit the server name and icon
    await Cloner.guildCreate(guildTo, guildFrom);
    
    await Cloner.channelsDelete(guildTo);
    if (data.copy_settings.roles) {
        await Cloner.rolesCreate(guildTo, guildFrom);
    }
    if (data.copy_settings.categories) {
        await Cloner.categoriesCreate(guildTo, guildFrom);
    }
    if (data.copy_settings.channels) {
        await Cloner.channelsCreate(guildTo, guildFrom);
    }
    if (data.copy_settings.emojis) {
        await Cloner.emojisCreate(guildTo, guildFrom);
    }
    console.log(`\n> Done Cloning Server in ${(Date.now() - startTime) / 1000} seconds`);
};

client = new Client(process.env.TOKEN);

client.on('ready', async () => {
    await clear(true);
    await cloneServer();
});

class ClonerBot {
    constructor() {
        this.INPUT_GUILD_ID = null;
        this.data = JSON.parse(fs.readFileSync('./utils/config.json', 'utf8'));
    }

    clear() {
        sleep(1000);
        console.clear();
        Panel();
    }

    editConfig(option, value, copySettings = false) {
        if (copySettings) {
            this.data.copy_settings[option] = value;
        } else {
            this.data[option] = value;
        }
        fs.writeFileSync('./utils/config.json', JSON.stringify(this.data, null, 4));
    }

    async editSettingsFunction() {
        console.log("\nDo you want to copy:");
        const categories = await prompt({ type: 'confirm', name: 'value', message: '> Categories?' });
        const channels = await prompt({ type: 'confirm', name: 'value', message: '> Channels?' });
        const roles = await prompt({ type: 'confirm', name: 'value', message: '> Roles?' });
        const emojis = await prompt({ type: 'confirm', name: 'value', message: '> Emojis?' });
        for (const option of ["categories", "channels", "roles", "emojis"]) {
            this.editConfig(option, eval(option), true);
        }
    }

    async main() {
        this.clear();
        if (!this.data.token) {
            this.TOKEN = await prompt({ type: 'input', name: 'value', message: '\n> Enter your Token' });
            await sleep(500);
        } else {
            console.log("> Token Found");
        }
        this.clear();
        const editSettings = await prompt({ type: 'confirm', name: 'value', message: '\n> Do you want to edit the settings?' });
        this.clear();
        if (editSettings) {
            await this.editSettingsFunction();
        }
        this.clear();

        this.GUILD = await prompt({ type: 'input', name: 'value', message: '\n> Enter the Server ID you want to edit (Create a Server Manually)' });
        await sleep(500);

        this.INPUT_GUILD_ID = await prompt({ type: 'input', name: 'value', message: '\n> Enter the Server ID you want to copy from' });
        await sleep(500);

        return { INPUT_GUILD_ID: this.INPUT_GUILD_ID, TOKEN: this.TOKEN, GUILD: this.GUILD };
    }
}

(async () => {
    const { INPUT_GUILD_ID, TOKEN, GUILD } = await new ClonerBot().main();
    try {
        client.connect();
        clear();
    } catch (error) {
        console.log(error);
        console.log("> Invalid Token");
        data.token = false;
    }
})();

