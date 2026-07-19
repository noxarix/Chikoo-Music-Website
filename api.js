class AirbeatsAPI {
    /**
     * Search for songs using Airbeats API with fallback data
     */
    static async searchSongs(query, limit = 20, page = 1) {
        try {
            const response = await fetch(`https://api.airbeats.xyz/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit}&page=${page}`);
            const json = await response.json();
            if (json.success && json.data && json.data.results) {
                return json.data.results;
            }
        } catch (error) {
            console.warn('API fetch failed or no more results.', error);
        }
        
        return [];
    }

    static async getTrendingSongs(lang = 'global', page = 1) {
        let query = 'trending';
        if (lang === 'english') query = 'english';
        else if (lang === 'punjabi') query = 'punjabi';
        else if (lang !== 'global') query = lang;
        
        const results = await this.searchSongs(query, 50, page);
        const unique = [];
        const seen = new Set();
        for (const song of results) {
            // Uniqueness based on song name AND primary artist to avoid duplicate thumbnails for remixes/versions
            const name = song.name.toLowerCase().trim();
            const artist = song.artists?.primary?.[0]?.name?.toLowerCase().trim() || '';
            const uniqueKey = `${name}-${artist}`;
            
            if (!seen.has(uniqueKey)) {
                seen.add(uniqueKey);
                unique.push(song);
            }
        }
        return unique.slice(0, 20);
    }

    static async getSongDetails(id) {
        try {
            const response = await fetch(`https://api.airbeats.xyz/api/songs/${id}`);
            const json = await response.json();
            if (json.success && json.data && json.data.length > 0) {
                return json.data;
            }
        } catch (error) {
            console.warn('API fetch failed for song details. Using fallback data.', error);
        }
        
        // Find in fallback data
        const fallbackData = await this.searchSongs('fallback');
        const song = fallbackData.find(s => s.id === id);
        return song ? [song] : null;
    }
}

window.AirbeatsAPI = AirbeatsAPI;
