export class BaseProvider {
  constructor(name) {
    this.name = name;
  }

  async connect() {
    return {
      provider: this.name,
      status: "connected",
      mode: "sandbox"
    };
  }

  async importProducts() {
    return [];
  }

  async syncProducts() {
    return {
      provider: this.name,
      synced: 0
    };
  }
}

