class AirbeatsAPI {
    /**
     * Search for songs using Airbeats API with fallback data
     */
    static async searchSongs(query, limit = 20) {
        try {
            const response = await fetch(`https://api.airbeats.xyz/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`);
            const json = await response.json();
            if (json.success && json.data && json.data.results && json.data.results.length > 0) {
                return json.data.results;
            }
        } catch (error) {
            console.warn('API fetch failed (likely running offline or locally). Using fallback data.', error);
        }
        
        // Fallback dummy data if API fails or blocks us
        return [
            {
                id: 'dummy1', name: 'Chaleya', artists: { primary: [{ name: 'Arijit Singh' }] },
                image: [{ quality: '500x500', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80' }],
                downloadUrl: [{ quality: '320kbps', url: '' }]
            },
            {
                id: 'dummy2', name: 'Heeriye', artists: { primary: [{ name: 'Arijit Singh, Jasleen Royal' }] },
                image: [{ quality: '500x500', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80' }],
                downloadUrl: [{ quality: '320kbps', url: '' }]
            },
            {
                id: 'dummy3', name: 'O Maahi', artists: { primary: [{ name: 'Arijit Singh' }] },
                image: [{ quality: '500x500', url: 'https://images.unsplash.com/photo-1493225457124-a1a2a5956093?auto=format&fit=crop&w=500&q=80' }],
                downloadUrl: [{ quality: '320kbps', url: '' }]
            },
            {
                id: 'dummy4', name: 'Tum Se', artists: { primary: [{ name: 'Sachin-Jigar' }] },
                image: [{ quality: '500x500', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80' }],
                downloadUrl: [{ quality: '320kbps', url: '' }]
            }
        ];
    }

    static async getTrendingSongs() {
        const results = await this.searchSongs('latest trending hindi bollywood', 50);
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
