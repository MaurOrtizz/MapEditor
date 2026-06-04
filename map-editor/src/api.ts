const BASE_URL = import.meta.env.VITE_API_URL;

export interface WorldData {
  id?: number;
  name: string;
  edits: Record<string, { name: string; color: string }>;
}

export const api = {
  async getWorlds(): Promise<WorldData[]> {
    const res = await fetch(`${BASE_URL}/worlds`);
    return res.json();
  },

  async createWorld(data: WorldData): Promise<WorldData> {
    const res = await fetch(`${BASE_URL}/worlds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateWorld(id: number, data: WorldData): Promise<WorldData> {
    const res = await fetch(`${BASE_URL}/worlds/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteWorld(id: number): Promise<void> {
    await fetch(`${BASE_URL}/worlds/${id}`, { method: 'DELETE' });
  }
};