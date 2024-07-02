const fs = require('fs');

async function writeOkMessage() {
    try {
        // Write "ok ankit" to anime_data.json
        fs.writeFileSync('anime_data.json', 'ok ankit');
        console.log('Successfully wrote "ok ankit" to anime_data.json');
    } catch (error) {
        console.error('Error writing "ok ankit" to anime_data.json:', error);
    }
}

writeOkMessage();

module.exports = writeOkMessage; // Export function if needed in another module
