// ============================================================
// BloodRush.io — Asset Loader
// ============================================================
export class AssetLoader {
  constructor() {
    this.images = {};
    this.loaded = false;
    this.progress = 0;
  }

  async loadAll(configSkins) {
    const promises = [];
    let loadedCount = 0;
    
    // We only load images for skins that specify an img path.
    // The "default" skin (and any others without an img) will fallback to vector rendering.
    const skinsWithImages = configSkins.filter(skin => skin.img);
    const totalToLoad = skinsWithImages.length;

    if (totalToLoad === 0) {
      this.loaded = true;
      this.progress = 1;
      return;
    }

    for (const skin of skinsWithImages) {
      const p = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.images[skin.id] = img;
          loadedCount++;
          this.progress = loadedCount / totalToLoad;
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to load asset: ${skin.img}`);
          resolve(); // Resolve anyway so game doesn't hang, it will just fallback
        };
        img.src = skin.img;
      });
      promises.push(p);
    }

    await Promise.all(promises);
    this.loaded = true;
  }

  getImage(skinId) {
    return this.images[skinId] || null;
  }
}

export default AssetLoader;
