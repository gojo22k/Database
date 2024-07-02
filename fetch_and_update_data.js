const axios = require('axios');
const fs = require('fs');
const he = require('he');

const MAL_API_URL = 'https://api.jikan.moe/v4';

const filemoonApiKey = '42605q5ytvlhmu9eris67';
const mixdropApiKey = 'gAR2UJ0JE2RKlhJJCqE';
const vidhideApiKey = '27261mmymf1etcdwfdvr3';
const streamWishApiKey = '10801lny3tlwanfupzu4m';
const doodStreamApiKey = '355892lri7tbejk8bpq7vt';

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
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const apiUrl = `${MAL_API_URL}/anime?q=${encodeURIComponent(animeName)}&limit=1`;
      const response = await axios.get(apiUrl, { timeout: 60000 });
      const { status, data } = response;
      if (status === 200 && data && data.data && data.data.length > 0) {
        const animeData = data.data[0];
        return {
          genres: animeData.genres?.map((genre) => genre.name) || [],
          type: animeData.type || '',
          totalEpisodes: animeData.episodes || 0,
          score: animeData.score || 0,
          status: animeData.status || '',
          pgRating: animeData.rating || ''
        };
      } else {
        console.log(`No results found for ${animeName}`);
        return null;
      }
    } catch (error) {
      console.error('Error fetching MAL data:', error.message);
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        console.error('Request timed out. Retrying...');
        retries++;
      } else if (error.response && error.response.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after']) || 1;
        console.error(`Rate limit exceeded. Waiting for ${retryAfter} seconds before retrying.`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        retries++;
      } else {
        retries++;
      }
    }
  }
  console.error(`Maximum retries (${maxRetries}) exceeded for anime ${animeName}`);
  return null;
}

async function fetchDataAndUpdateJson() {
  try {
    const filemoonFolders = await fetchFolders(filemoonApiKey, 'Filemoon');
    const mixdropFolders = await fetchFolders(mixdropApiKey, 'MixDrop');
    const vidhideFolders = await fetchFolders(vidhideApiKey, 'VidHide');
    const streamWishFolders = await fetchFolders(streamWishApiKey, 'StreamWish');
    const doodStreamFolders = await fetchFolders(doodStreamApiKey, 'DoodStream');

    const allFolders = [
      ...filemoonFolders.map(folder => ({ platform: 'Filemoon', folder })),
      ...mixdropFolders.map(folder => ({ platform: 'MixDrop', folder })),
      ...vidhideFolders.map(folder => ({ platform: 'VidHide', folder })),
      ...streamWishFolders.map(folder => ({ platform: 'StreamWish', folder })),
      ...doodStreamFolders.map(folder => ({ platform: 'DoodStream', folder }))
    ];

    const animeData = [];

    for (const { platform, folder } of allFolders) {
      const animeDetails = await fetchAnimeDetailsFromJikan(folder.name);
      if (animeDetails) {
        animeData.push({
          id: folder.fld_id,
          name: he.decode(folder.name),
          genres: animeDetails.genres,
          type: animeDetails.type,
          starting_letter: folder.name.charAt(0).toUpperCase(),
          cloud: platform,
          pg_rating: animeDetails.pgRating,
          score: animeDetails.score,
          status: animeDetails.status,
          total_episodes: animeDetails.totalEpisodes
        });
      }
    }

    fs.writeFileSync('anime_data.json', JSON.stringify(animeData, null, 2));
    console.log('Anime data updated successfully');
  } catch (error) {
    console.error('Error fetching or updating data:', error);
  }
}

fetchDataAndUpdateJson();
