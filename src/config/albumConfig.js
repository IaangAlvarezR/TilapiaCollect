export const ALBUM_CONFIG = {
  title: "Tilapia Tools",
  totalPages: 15, // There are 15 sets
  cardsPerPage: 9,
};

export const SET_NAMES = [
  "Caparacin", "Mecerino", "Barrigodo", "Chsparin", "Aletin", 
  "Chisplet", "Llamallama", "Gigi", "Azugeco", "Rocuga", 
  "Camarion", "Toperin", "Brotibu", "Cangris", "Fungin"
];

export const generateAlbumData = () => {
  const pages = [];

  for (let p = 1; p <= ALBUM_CONFIG.totalPages; p++) {
    const cards = [];
    const setName = SET_NAMES[p - 1] || `Set ${p}`;
    
    for (let c = 1; c <= ALBUM_CONFIG.cardsPerPage; c++) {
      cards.push({
        id: `p${p}_c${c}`,
        page: p,
        slot: c,
        name: `Foto ${c}`,
        stars: ((c - 1) % 5) + 1,
        defaultFrame: 'basic', // 'basic' (Azul) o 'gold' (Dorado)
      });
    }
    pages.push({ pageNumber: p, setName, cards });
  }

  return pages;
};