import fs from 'fs/promises';
import path from 'path';

export class JsonRepository<T extends { id: string }> {
  private filePath: string;

  constructor(filename: string) {
    this.filePath = path.join(__dirname, '../../data', filename);
  }

  private async readData(): Promise<T[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private async writeData(data: T[]): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async findAll(): Promise<T[]> {
    return await this.readData();
  }

  async findById(id: string): Promise<T | null> {
    const data = await this.readData();
    return data.find((item) => item.id === id) || null;
  }

  async find(predicate: (item: T) => boolean): Promise<T[]> {
    const data = await this.readData();
    return data.filter(predicate);
  }

  async findOne(predicate: (item: T) => boolean): Promise<T | null> {
    const data = await this.readData();
    return data.find(predicate) || null;
  }

  async create(item: T): Promise<T> {
    const data = await this.readData();
    data.push(item);
    await this.writeData(data);
    return item;
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const data = await this.readData();
    const index = data.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const updatedItem = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
    data[index] = updatedItem;
    await this.writeData(data);
    return updatedItem;
  }

  async delete(id: string): Promise<boolean> {
    const data = await this.readData();
    const index = data.findIndex((item) => item.id === id);
    if (index === -1) return false;

    data.splice(index, 1);
    await this.writeData(data);
    return true;
  }
}
