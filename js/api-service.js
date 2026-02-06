/**
 * POKEMARKET API SERVICE
 * Integrates TCGdex and Pokemon TCG API (CardMarket)
 */

const POKE_TCG_API_KEY = '89739d4e-216e-4791-96c4-fcd9e039fefb';
const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2/en';
const POKETCG_BASE_URL = 'https://api.pokemontcg.io/v2';

const ApiService = {
    cache: {
        sets: null,
        cardsBySet: {},
        prices: {}
    },

    /**
     * Fetch ONLY the original Base Set (base1)
     */
    async fetchSets() {
        if (this.cache.sets) return this.cache.sets;

        try {
            const response = await fetch(`${TCGDEX_BASE_URL}/sets/base1`);
            const data = await response.json();
            // Wrap in array for album compatibility
            const sets = [{
                id: data.id,
                name: data.name,
                releaseDate: data.releaseDate,
                logo: data.logo,
                cardCount: data.cardCount.total
            }];
            this.cache.sets = sets;
            return sets;
        } catch (error) {
            console.error('Error fetching sets:', error);
            return [];
        }
    },

    /**
     * Fetch all cards for the Base Set
     */
    async fetchCardsBySet(setId) {
        // Force base1 set regardless of setId passed
        if (this.cache.cardsBySet['base1']) return this.cache.cardsBySet['base1'];

        try {
            const response = await fetch(`${TCGDEX_BASE_URL}/sets/base1`);
            const data = await response.json();
            const cards = (data.cards || []).map(card => ({
                ...card,
                image: card.image || ''
            }));
            this.cache.cardsBySet['base1'] = cards;
            return cards;
        } catch (error) {
            console.error(`Error fetching cards for base1:`, error);
            return [];
        }
    },

    /**
     * Fetch detailed card info including CardMarket pricing via Pokemon TCG API
     */
    async getCardDetails(setId, localId) {
        // Pokemon TCG API uses a format like "swsh1-1" for IDs
        // TCGdex IDs might need mapping. 
        // Let's search by name and number if exact ID fails.
        const query = `set.id:${setId} number:${localId}`;

        try {
            const response = await fetch(`${POKETCG_BASE_URL}/cards?q=${encodeURIComponent(query)}`, {
                headers: { 'X-Api-Key': POKE_TCG_API_KEY }
            });
            const data = await response.json();
            const card = data.data?.[0] || null;

            if (card) {
                return {
                    ...card,
                    description: card.flavorText || (card.rules ? card.rules.join(' ') : 'Sin descripción disponible.'),
                    types: card.types || ['Normal']
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching detailed card info:', error);
            return null;
        }
    },

    /**
     * Determines internal rarity based on CardMarket price
     */
    calculateRarityByPrice(price) {
        if (!price || price === 0) return 'common';
        if (price < 0.5) return 'common';
        if (price < 1.5) return 'uncommon';
        if (price < 5) return 'rare';
        if (price < 15) return 'superrare';
        if (price < 40) return 'elite';
        if (price < 100) return 'epic';
        if (price < 250) return 'mythic';
        return 'legendary';
    },

    /**
     * Get CardMarket average price (EUR)
     */
    getCardMarketPrice(cardData) {
        if (!cardData?.cardmarket?.prices?.avg1) return 0;
        return cardData.cardmarket.prices.avg1;
    }
};

window.ApiService = ApiService;
