const axios = require('axios');
const fs = require('fs');
const he = require('he');

const MAL_API_URL = 'https://api.jikan.moe/v4';

async function fetchFolders(apiKey, platform) {
    let url;
    switch (platform) {
        case 'Filemoon':
            url = `https://filemoon-get.vercel.app/api/filemoon?key=${apiKey}&fld_id=0`;
            break;
        case 'MixDrop':
            url = `https://api.mixdrop.ag/folderlist?email=mohapatraankit22@gmail.com&key=${apiKey}&id=0`;
            break;
        case 'VidHide':
            url = `https://vidhideapi.com/api/folder/list?key=${apiKey}&fld_id=0`;
            break;
        case 'StreamWish':
            url = `https://api.streamwish.com/api/folder/list?key=${apiKey}&fld_id=0`;
            break;
        case 'DoodStream':
            url = `https://doodapi.com/api/folder/list?key=${apiKey}`;
            break;
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
    const response = await axios.get(url);
    return response.data.result.folders;
}

async function fetchAnimeDetailsFromJikan(animeName, maxRetries = 3) {
    return new Promise(async (resolve, reject) => {
        let retries = 0;
        while (retries < maxRetries) {
            try {
                const apiUrl = `${MAL_API_URL}/anime?q=${encodeURIComponent(animeName)}&limit=1`;
                const response = await axios.get(apiUrl, { timeout: 600000 });
                const { status, data } = response;
                if (status === 200 && data && data.data && data.data.length > 0) {
                    const animeData = data.data[0];
                    console.log(`Successfully fetched details for ${animeName} from Jikan API.`);
                    resolve({
                        genres: animeData.genres?.map((genre) => genre.name) || [],
                        type: animeData.type || '',
                        totalEpisodes: animeData.episodes || 0,
                        score: animeData.score || 0,
                        status: animeData.status || '',
                        pgRating: animeData.rating || ''
                    });
                    return;
                } else {
                    console.log(`No results found for ${animeName} from Jikan API.`);
                    resolve(null);
                    return;
                }
            } catch (error) {
                console.error(`Error fetching MAL data for ${animeName}:`, error.message);
                if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
                    console.error('Request timed out. Retrying...');
                } else if (error.response && error.response.status === 429) {
                    const retryAfter = parseInt(error.response.headers['retry-after']) || 1;
                    console.error(`Rate limit exceeded. Waiting for ${retryAfter} seconds before retrying.`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000 * Math.pow(2, retries)));
                    retries++;
                    continue;
                } else {
                    console.error('Other error occurred. Retrying...');
                }
                retries++;
            }
        }
        console.error(`Maximum retries (${maxRetries}) exceeded for anime ${animeName}`);
        reject(new Error(`Maximum retries (${maxRetries}) exceeded for anime ${animeName}`));
    });
}

async function fetchDataAndUpdateJson() {
    try {
        const filemoonApiKey = '42605q5ytvlhmu9eris67';
        const mixdropApiKey = 'gAR2UJ0JE2RKlhJJCqE';
        const vidhideApiKey = '27261mmymf1etcdwfdvr3';
        const streamWishApiKey = '10801lny3tlwanfupzu4m';
        const doodStreamApiKey = '355892lri7tbejk8bpq7vt';

        const filemoonFolders = await fetchFolders(filemoonApiKey, 'Filemoon');
        const mixdropFolders = await fetchFolders(mixdropApiKey, 'MixDrop');
        const vidhideFolders = await fetchFolders(vidhideApiKey, 'VidHide');
        const streamWishFolders = await fetchFolders(streamWishApiKey, 'StreamWish');
        const doodStreamFolders = await fetchFolders(doodStreamApiKey, 'DoodStream');

        const animeData = [];

        for (const folder of filemoonFolders) {
            const animeDetails = await fetchAnimeDetailsFromJikan(folder.name);
            if (animeDetails) {
                animeData.push({
                    id: folder.fld_id,
                    name: folder.name ? he.decode(folder.name) : '',
                    genres: animeDetails.genres,
                    type: animeDetails.type,
                    starting_letter: folder.name ? folder.name.charAt(0).toUpperCase() : '',
                    cloud: 'Filemoon', // or platform as needed
                    pg_rating: animeDetails.pgRating,
                    score: animeDetails.score,
                    status: animeDetails.status,
                    total_episodes: animeDetails.totalEpisodes
                });
            }
        }

        for (const folder of mixdropFolders) {
            const animeDetails = await fetchAnimeDetailsFromJikan(folder.title);
            if (animeDetails) {
                animeData.push({
                    id: folder.id,
                    name: folder.title ? he.decode(folder.title) : '',
                    genres: animeDetails.genres,
                    type: animeDetails.type,
                    starting_letter: folder.title ? folder.title.charAt(0).toUpperCase() : '',
                    cloud: 'MixDrop', // or platform as needed
                    pg_rating: animeDetails.pgRating,
                    score: animeDetails.score,
                    status: animeDetails.status,
                    total_episodes: animeDetails.totalEpisodes
                });
            }
        }

        // Add similar loops for other platforms (vidhide, streamWish, doodStream)...

        fs.writeFileSync('anime_data.json', JSON.stringify(animeData, null, 2));
        console.log('Anime data updated successfully');
        console.log('Updated Anime Data:', animeData);
    } catch (error) {
        console.error('Error fetching or updating data:', error);
    }
}

fetchDataAndUpdateJson();

module.exports = fetchDataAndUpdateJson; // Export function if needed in another module
