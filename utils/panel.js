import fs from 'fs';
import { Table } from 'console-table-printer';

function Panel() {
    const data = JSON.parse(fs.readFileSync("./utils/config.json", "utf8"));
    console.log(" ");
    
    // Define custom styles for ON and OFF
    const onStyle = { color: "green", bold: true };
    const offStyle = { color: "red", bold: true };

    // Create a table with 2 columns
    const table = new Table({
        title: "Discord Server Cloner",
        columns: [
            { name: "Setting", alignment: "left", width: 30 },
            { name: "Status", alignment: "center", width: 10 }
        ]
    });

    for (const [setting, status] of Object.entries(data.copy_settings)) {
        table.addRow({
            Setting: setting.charAt(0).toUpperCase() + setting.slice(1),
            Status: status ? "ON" : "OFF",
            style: status ? onStyle : offStyle
        });
    }

    console.log(table.toString());

    // Paragraph with change logs
    const paragraph = "Discord has removed the functionality for bots to create a server automatically. You will have to create a server manually and provide the server ID and the server you want to clone.";
    console.log(`\n\033[1;34m${paragraph}\033[0m`);
    
    // Version information
    const version = "2.0.1";
    console.log(`\n\033[1;35mVersion: ${version}\033[0m`);
}

function Panel_Run(guild, user) {
    const data = JSON.parse(fs.readFileSync("./utils/config.json", "utf8"));
    console.log(" ");
    
    // Define custom styles for ON and OFF
    const onStyle = { color: "green", bold: true };
    const offStyle = { color: "red", bold: true };

    // Create a table with 2 columns
    const table = new Table({
        title: "Discord Server Cloner",
        columns: [
            { name: "Cloner is Running...", alignment: "left", width: 30 },
            { name: "Status", alignment: "center", width: 10 }
        ]
    });

    for (const [setting, status] of Object.entries(data.copy_settings)) {
        table.addRow({
            Setting: setting.charAt(0).toUpperCase() + setting.slice(1),
            Status: status ? "ON" : "OFF",
            style: status ? onStyle : offStyle
        });
    }

    // Stick a new table in the footer
    const footer = new Table({
        title: "",
        columns: [{ name: "Info", alignment: "center" }]
    });
    footer.addRow(`Server ID: ${guild}`);
    footer.addRow(`Logged in as: ${user}`);

    console.log(table.toString());
    console.log(footer.toString());

    // Paragraph with change logs
    const paragraph = "Discord has removed the functionality for bots to create a server automatically. You will have to create a server manually and provide the server ID and the server you want to clone.";
    console.log(`\n\033[1;34m${paragraph}\033[0m`);
    
    // Version information
    const version = "2.0.1";
    console.log(`\n\033[1;35mVersion: ${version}\033[0m`);
}

