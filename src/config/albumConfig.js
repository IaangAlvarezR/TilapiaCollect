export const ALBUM_CONFIG = {
  title: "Álbum del Equipo",
  totalPages: 15,
  cardsPerPage: 9,
};

export const generateAlbumData = () => {
  const pages = [];

  for (let p = 1; p <= ALBUM_CONFIG.totalPages; p++) {
    const cards = [];
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
    pages.push({ pageNumber: p, cards });
  }

  return pages;
};